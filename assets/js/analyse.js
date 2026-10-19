// Beck on the Rocks: bestanden analyseren voor de offerte- en factuurmaker.
// Alles gebeurt lokaal in de browser; er gaat niets naar een server.
window.BeckAnalyse = (() => {
  const basis = new URL('assets/vendor/', document.baseURI).href;

  /* ================= Bibliotheken pas laden als ze nodig zijn ================= */
  const geladen = {};
  function laadScript(pad) {
    return geladen[pad] ??= new Promise((ok, fout) => {
      const s = document.createElement('script');
      s.src = basis + pad; s.onload = ok; s.onerror = () => fout(new Error('Kon ' + pad + ' niet laden'));
      document.head.append(s);
    });
  }

  /* ================= Tekst uit een bestand halen ================= */
  async function leesBestand(file, voortgang = () => {}) {
    const naam = file.name.toLowerCase();
    const type = file.type;

    if (type === 'application/pdf' || naam.endsWith('.pdf')) {
      voortgang('PDF lezen…');
      await laadScript('pdfjs/pdf.min.js');
      pdfjsLib.GlobalWorkerOptions.workerSrc = basis + 'pdfjs/pdf.worker.min.js';
      // isEvalSupported: false dicht lek CVE-2024-4367 (code uitvoeren via een kwaadaardig lettertype in een PDF)
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
      let tekst = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const inhoud = await (await pdf.getPage(i)).getTextContent();
        tekst += inhoud.items.map(it => it.str + (it.hasEOL ? '\n' : ' ')).join('') + '\n';
      }
      if (tekst.trim().length > 20) return tekst;
      // Gescande PDF zonder tekst: eerste pagina als afbeelding door de OCR
      voortgang('Gescande PDF, tekst herkennen…');
      const pagina = await pdf.getPage(1);
      const vp = pagina.getViewport({ scale: 2 });
      const canvas = Object.assign(document.createElement('canvas'), { width: vp.width, height: vp.height });
      await pagina.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      return ocr(canvas, voortgang);
    }

    if (naam.endsWith('.docx') || type.includes('wordprocessingml')) {
      voortgang('Word-document lezen…');
      await laadScript('mammoth/mammoth.browser.min.js');
      return (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    }

    if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|heic)$/.test(naam)) {
      return ocr(file, voortgang);
    }

    if (naam.endsWith('.eml') || type === 'message/rfc822') return leesMail(await file.text());
    if (naam.endsWith('.html') || naam.endsWith('.htm') || type === 'text/html') return htmlNaarTekst(await file.text());
    if (naam.endsWith('.doc') || naam.endsWith('.msg') || naam.endsWith('.pages')) {
      throw new Error('Dit bestandstype kan ik niet lezen. Sla het op als PDF of .docx, of kopieer de tekst in het tekstvak.');
    }
    return file.text(); // .txt, WhatsApp-export, .csv, enz.
  }

  async function ocr(bron, voortgang) {
    voortgang('Tekstherkenning laden (eerste keer kan even duren)…');
    await laadScript('tesseract/tesseract.min.js');
    const worker = await Tesseract.createWorker('nld', 1, {
      workerPath: basis + 'tesseract/worker.min.js',
      corePath: basis + 'tesseract/core',
      langPath: basis + 'tesseract/lang',
      logger: m => { if (m.status === 'recognizing text') voortgang(`Tekst herkennen… ${Math.round(m.progress * 100)}%`); }
    });
    try { return (await worker.recognize(await voorbewerk(bron))).data.text; }
    finally { await worker.terminate(); }
  }

  // Beeld klaarmaken voor tekstherkenning: vergroten, grijs, donkere modus omdraaien, contrast oprekken
  async function voorbewerk(bron) {
    try {
      const img = bron instanceof HTMLCanvasElement ? bron : await createImageBitmap(bron);
      const schaal = Math.min(3, Math.max(1, 1800 / img.width));
      const c = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * schaal), height: Math.round(img.height * schaal) });
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const data = ctx.getImageData(0, 0, c.width, c.height), px = data.data;
      let som = 0;
      const grijs = new Uint8ClampedArray(px.length / 4);
      for (let i = 0, j = 0; i < px.length; i += 4, j++) {
        // max-kanaal houdt gekleurde tekst (bijv. paarse labels) goed zichtbaar
        const g = Math.max(px[i], px[i + 1], px[i + 2]) * 0.6 + (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) * 0.4;
        grijs[j] = g; som += g;
      }
      const donker = som / grijs.length < 110;
      let lo = 255, hi = 0;
      for (const g of grijs) { const v = donker ? 255 - g : g; if (v < lo) lo = v; if (v > hi) hi = v; }
      const bereik = Math.max(1, hi - lo);
      for (let i = 0, j = 0; i < px.length; i += 4, j++) {
        const v = ((donker ? 255 - grijs[j] : grijs[j]) - lo) * 255 / bereik;
        px[i] = px[i + 1] = px[i + 2] = v;
      }
      ctx.putImageData(data, 0, 0);
      return c;
    } catch { return bron; }
  }

  const htmlNaarTekst = html => {
    const d = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|tr|h\d)>/gi, '\n'), 'text/html');
    return d.body.textContent || '';
  };

  // Eenvoudige .eml-lezer: afzender + eerste tekstdeel (quoted-printable/base64)
  function leesMail(bron) {
    const [kop, ...rest] = bron.split(/\r?\n\r?\n/);
    const kopregels = kop.replace(/\r?\n[ \t]+/g, ' ');
    const van = (kopregels.match(/^From:\s*(.+)$/im) || [])[1] || '';
    const onderwerp = (kopregels.match(/^Subject:\s*(.+)$/im) || [])[1] || '';
    let lijf = rest.join('\n\n');
    const grens = (kopregels.match(/boundary="?([^";\r\n]+)"?/i) || [])[1];
    if (grens) {
      const delen = lijf.split('--' + grens).map(d => d.trim()).filter(d => d && d !== '--');
      const deel = delen.find(d => /content-type:\s*text\/plain/i.test(d)) || delen.find(d => /content-type:\s*text\/html/i.test(d)) || delen[0] || '';
      const [dkop, ...dlijf] = deel.split(/\r?\n\r?\n/);
      lijf = decodeer(dlijf.join('\n\n'), dkop);
      if (/text\/html/i.test(dkop)) lijf = htmlNaarTekst(lijf);
    } else {
      lijf = decodeer(lijf, kopregels);
      if (/content-type:\s*text\/html/i.test(kopregels)) lijf = htmlNaarTekst(lijf);
    }
    return `Van: ${decodeerKop(van)}\nOnderwerp: ${decodeerKop(onderwerp)}\n\n${lijf}`;
  }
  function decodeer(tekst, kop) {
    const utf8 = bytes => new TextDecoder(/charset="?iso-8859-1|windows-1252/i.test(kop) ? 'windows-1252' : 'utf-8').decode(bytes);
    if (/transfer-encoding:\s*base64/i.test(kop)) {
      try { return utf8(Uint8Array.from(atob(tekst.replace(/\s/g, '')), c => c.charCodeAt(0))); } catch { return tekst; }
    }
    if (/transfer-encoding:\s*quoted-printable/i.test(kop)) {
      const zacht = tekst.replace(/=\r?\n/g, '');
      const bytes = [];
      for (let i = 0; i < zacht.length; i++) {
        if (zacht[i] === '=' && /^[0-9A-F]{2}$/i.test(zacht.substr(i + 1, 2))) { bytes.push(parseInt(zacht.substr(i + 1, 2), 16)); i += 2; }
        else bytes.push(zacht.charCodeAt(i) & 0xff);
      }
      return utf8(new Uint8Array(bytes));
    }
    return tekst;
  }
  const decodeerKop = s => s.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, cs, enc, t) => {
    try {
      let bytes;
      if (enc.toUpperCase() === 'B') bytes = Uint8Array.from(atob(t), c => c.charCodeAt(0));
      else {
        const b = [], q = t.replace(/_/g, ' ');
        for (let i = 0; i < q.length; i++) {
          if (q[i] === '=' && /^[0-9A-F]{2}$/i.test(q.substr(i + 1, 2))) { b.push(parseInt(q.substr(i + 1, 2), 16)); i += 2; }
          else b.push(q.charCodeAt(i) & 0xff);
        }
        bytes = new Uint8Array(b);
      }
      return new TextDecoder(cs).decode(bytes);
    } catch { return t; }
  });

  /* ================= Informatie uit tekst halen ================= */
  const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
  const MAAND_RE = '(jan(?:uari)?|feb(?:ruari)?|mrt|maart|apr(?:il)?|mei|jun[i]?|jul[i]?|aug(?:ustus)?|sep(?:t(?:ember)?)?|okt(?:ober)?|oct|nov(?:ember)?|dec(?:ember)?)';
  const maandNr = m => {
    m = m.toLowerCase().slice(0, 3);
    if (m === 'mrt') return 3;
    if (m === 'oct') return 10;
    return MAANDEN.findIndex(x => x.startsWith(m)) + 1;
  };
  const SOORTEN = [
    ['Bruiloft', /\b(bruiloft|trouw(?:en|dag|feest)?|huwelijk|bruids?paar|getrouwd)\b/i],
    ['Horeca-inval', /\b(inval(?:len|ler)?|invalkracht|personeel(?:s)?tekort|onderbezetting)\b/i],
    ['Bedrijfsfeest', /\b(bedrijfs\w*|personeels\w*|borrel|kerstborrel|nieuwjaarsborrel|zakelijk|collega'?s|team(?:uitje|event)?|netwerk\w*|receptie|relatie-?evenement)\b/i],
    ['Verjaardag', /(?:\b(?:verjaardag|abraham|sarah)\b|(?<!-)\bjarig\b|\bik word \d{2}\b|\b\d{2} (?:jaar )?(?:worden|wordt)\b|\b\d{2}(?:e|ste)? verjaardag)/i],
    ['Diner', /\b(diner|etentje|dinner)\b/i],
    ['Privéfeest', /\b(feest(?:je)?|party|tuinfeest|housewarming|vrijgezellen\w*|jubileum)\b/i]
  ];
  const COCKTAILS = ['Smoked Old Fashioned', 'Old Fashioned', 'Espresso Martini', 'Pornstar Martini', 'Negroni', 'Whiskey Sour', 'Whisky Sour',
    'Basil Smash', 'Paloma', 'Mojito', 'Margarita', 'Aperol Spritz', 'Spritz', 'Gin Tonic', 'Gin-tonic', 'Daiquiri', 'Cosmopolitan', 'Moscow Mule',
    'Caipirinha', 'Piña Colada', 'Pina Colada', 'Mai Tai', 'Amaretto Sour', 'French 75', 'Hugo', 'Tom Collins', 'Dark \'n Stormy', 'Long Island',
    'Sex on the Beach', 'Tequila Sunrise', 'Bloody Mary', 'Manhattan', 'Martini', 'Mocktail', 'Virgin Mojito', 'Rocks & Roses', 'Golden Hour',
    'Virgin Garden', 'Berry Nojito', 'Spiced Apple Sour'];

  const pad = n => String(n).padStart(2, '0');
  const iso = (j, m, d) => `${j}-${pad(m)}-${pad(d)}`;
  const tijd = (u, m) => (u >= 0 && u <= 24 && m >= 0 && m < 60) ? `${pad(u % 24)}:${pad(m)}` : null;
  const geldigeDatum = (j, m, d) => { const x = new Date(j, m - 1, d); return x.getFullYear() === j && x.getMonth() === m - 1 && x.getDate() === d; };

  function vindDatums(t, vandaag) {
    const res = [];
    const jaarBij = (m, d) => { // geen jaar genoemd: eerstvolgende keer
      let j = vandaag.getFullYear();
      if (new Date(j, m - 1, d) < new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate())) j++;
      return j;
    };
    const add = (j, m, d, idx, len) => {
      if (j < 100) j += 2000;
      if (geldigeDatum(j, m, d)) res.push({ waarde: iso(j, m, d), idx, len, datum: new Date(j, m - 1, d) });
    };
    let m;
    const reNum = /\b(\d{1,2})[-/.](\d{1,2})(?:[-/.](\d{2,4}))?\b/g;
    while ((m = reNum.exec(t))) {
      if (/\d[:.]$/.test(t.slice(Math.max(0, m.index - 2), m.index))) continue; // onderdeel van een tijd
      if (/\d[-/.]$/.test(t.slice(Math.max(0, m.index - 2), m.index))) continue; // midden in bijv. 2027-06-12
      if (!m[3] && /^[-/.]\d/.test(t.slice(m.index + m[0].length))) continue;
      if (!m[3] && +m[1] > 31) continue;
      const d = +m[1], mm = +m[2];
      if (mm < 1 || mm > 12) continue;
      if (!m[3] && /^\d{1,2}[.]\d{2}$/.test(m[0]) && +m[2] >= 13) continue;
      if (!m[3] && /[:.]/.test(m[0]) && !/[-/]/.test(m[0])) continue; // "20.00" is een tijd
      add(m[3] ? +m[3] : jaarBij(mm, d), mm, d, m.index, m[0].length);
    }
    const reIso = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;
    while ((m = reIso.exec(t))) add(+m[1], +m[2], +m[3], m.index, m[0].length);
    const reTekst = new RegExp(`\\b(\\d{1,2})(?:e|ste|de)?\\s+${MAAND_RE}\\.?(?:\\s+(\\d{4}))?\\b`, 'gi');
    while ((m = reTekst.exec(t))) { const mm = maandNr(m[2]); add(m[3] ? +m[3] : jaarBij(mm, +m[1]), mm, +m[1], m.index, m[0].length); }
    return res;
  }

  function kiesFeestDatum(t, datums, vandaag) {
    if (!datums.length) return null;
    const nu = new Date(vandaag.getFullYear(), vandaag.getMonth(), vandaag.getDate());
    const ctx = /(feest|bruiloft|trouw|event|borrel|verjaardag|diner|datum|op|plaatsvinden|gepland|vieren|zaterdag|zondag|vrijdag)/i;
    let beste = null, score = -1;
    for (const d of datums) {
      const omgeving = t.slice(Math.max(0, d.idx - 60), d.idx);
      let s = 0;
      if (d.datum >= nu) s += 3;
      if (ctx.test(omgeving)) s += 2;
      if (/^(datum|date)\b/im.test(t.slice(t.lastIndexOf('\n', d.idx) + 1, d.idx))) s += 4;
      if (/(verzonden|sent|geschreven|gestuurd|op .* schreef|wrote)/i.test(omgeving)) s -= 3;
      if (s > score) { score = s; beste = d; }
    }
    return beste;
  }

  function vindTijden(t) {
    const T = '(\\d{1,2})(?:[:.](\\d{2})|\\s?(?:u|uur)\\b(?:\\s?(\\d{2}))?)';
    let m = new RegExp(`(?:van(?:af)?\\s+)?${T}\\s*(?:-|–|—|tot(?:\\s+(?:en\\s+met|ongeveer|circa|ca\\.?))?|t\\/m)\\s*${T}`, 'i').exec(t);
    if (m) {
      const van = tijd(+m[1], +(m[2] || m[3] || 0)), tot = tijd(+m[4], +(m[5] || m[6] || 0));
      if (van && tot) return { van, tot, snippet: m[0] };
    }
    const res = {};
    m = new RegExp(`(?:begin(?:t|tijd)?|aanvang|start(?:tijd)?|vanaf|om)\\s*:?\\s*${T}`, 'i').exec(t);
    if (m) { res.van = tijd(+m[1], +(m[2] || m[3] || 0)); res.snippet = m[0]; }
    m = new RegExp(`(?:eind(?:igt|tijd)?|tot|afsluiten om)\\s*:?\\s*${T}`, 'i').exec(t);
    if (m) res.tot = tijd(+m[1], +(m[2] || m[3] || 0));
    return res.van || res.tot ? res : null;
  }

  const plusUren = (van, u) => {
    const [h, mm] = van.split(':').map(Number);
    const tot = (h * 60 + mm + Math.round(u * 60)) % (24 * 60);
    return `${pad(Math.floor(tot / 60))}:${pad(tot % 60)}`;
  };

  // Labels zoals ze in de aanvraagmail staan: waarde mag op dezelfde regel of op de regel eronder
  const LABELS_MAIL = /^(naam|e-?mail|telefoon(?: klant)?|datum|aantal uur|gasten|soort feest|locatie|cocktails op de kaart|fruitpers|glazen via \w+|spoedboeking|bericht)$/i;
  function label(t, namen) {
    const re = new RegExp(`^[ \\t>*-]*(?:${namen})[ \\t]*(?:[:=]|\\t)[ \\t]*(\\S.*)$`, 'im'); // ook tabel-kopie (tab)
    let m = re.exec(t);
    if (m) return m[1].trim().replace(/\s{2,}/g, ' ');
    // Label alleen op een regel, waarde op de eerstvolgende niet-lege regel (mail als screenshot)
    const re2 = new RegExp(`^[ \\t>*-]*(?:${namen})[ \\t]*:?[ \\t]*\\n(?:[ \\t]*\\n)*[ \\t]*(\\S.*)$`, 'im');
    m = re2.exec(t);
    if (!m) return null;
    const w = m[1].trim();
    if (LABELS_MAIL.test(w) || /^[-–—]$/.test(w)) return null; // lege waarde: volgende regel is al een ander label
    return w.replace(/\s{2,}/g, ' ');
  }

  // WhatsApp-export: "12-06-2026 14:03 - Naam: bericht" of "[12-06-2026, 14:03:22] Naam: bericht"
  function whatsapp(t, eigenNamen) {
    const re = /^\[?\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\]?\s*(?:-\s*)?([^:\n]{2,40}):\s?(.*)$/gm;
    const tel = {}; let m, gevonden = false; const berichten = [];
    while ((m = re.exec(t))) {
      gevonden = true;
      const naam = m[1].trim();
      if (!eigenNamen.some(e => naam.toLowerCase().includes(e))) tel[naam] = (tel[naam] || 0) + 1;
      berichten.push(m[2]);
    }
    if (!gevonden) return null;
    const afzender = Object.entries(tel).sort((a, b) => b[1] - a[1])[0];
    return { afzender: afzender && !/^\+?\d[\d\s-]+$/.test(afzender[0]) ? afzender[0] : null, tekst: berichten.join('\n') };
  }

  function analyseer(ruw, opties = {}) {
    const vandaag = opties.vandaag || new Date();
    const eigen = (opties.eigen || []).map(s => s.toLowerCase()).filter(Boolean);
    const eigenNamen = ['beck', 'rutger', ...eigen];
    const v = {}; // veld -> { waarde, bron }
    const zet = (k, waarde, bron) => { if (waarde && !v[k]) v[k] = { waarde: String(waarde).trim(), bron: (bron || '').trim().slice(0, 80) }; };

    let t = ruw.replace(/\r/g, '').replace(/\u00a0/g, ' ')
      .replace(/[®©]\s*@/g, '@').replace(/\s+@\s+/g, '@'); // OCR-ruis rond @
    const wa = whatsapp(t, eigenNamen);
    if (wa) { zet('k-naam', wa.afzender, 'Afzender WhatsApp'); t = wa.tekst; }

    // Velden met een label (zoals het boekingsformulier op de website)
    zet('k-naam', label(t, 'naam|name|contactpersoon'), 'Naam:');
    zet('k-bedrijf', label(t, 'bedrijf|bedrijfsnaam|organisatie|company'), 'Bedrijf:');
    zet('k-email', label(t, 'e-?mail|email'), 'E-mail:');
    zet('k-tel', label(t, 'telefoon(?:nummer)?(?: klant)?|tel\\.?|mobiel|gsm|phone'), 'Telefoon:');
    zet('f-locatie', label(t, 'locatie|location|feestlocatie|adres feest|waar'), 'Locatie:');
    const lSoort = label(t, 'soort (?:feest|event)|type (?:feest|event)|gelegenheid');
    const lGasten = label(t, '(?:aantal )?gasten|(?:aantal )?personen');
    const lUren = label(t, 'aantal uur|uren|duur');
    const lDatum = label(t, 'datum(?: feest| event)?|date');

    // Afzender van een mail: "Van: Naam <adres>"
    const van = /^(?:van|from):\s*"?([^"<\n]+?)"?\s*<([^>\s]+@[^>\s]+)>/im.exec(t);
    if (van && !eigen.includes(van[2].toLowerCase())) { zet('k-naam', van[1], 'Afzender mail'); zet('k-email', van[2], 'Afzender mail'); }

    // E-mail
    for (const m of t.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) {
      if (!eigen.includes(m[0].toLowerCase()) && !/beckontherocks/i.test(m[0])) { zet('k-email', m[0], m[0]); break; }
    }

    // Telefoon
    const tel = /(?:\+31|0031|\b0)[\s-]?(?:6[\s-]?(?:\d[\s-]?){8}|[1-9]\d{1,2}[\s-]?(?:\d[\s-]?){6,7})\b/.exec(t);
    if (tel) zet('k-tel', tel[0].replace(/[\s-]+/g, ' ').trim(), tel[0]);

    // Naam uit de tekst
    const aanloop = /(?:mijn naam is|ik ben|ik heet|met vriendelijke groet(?:en)?|vriendelijke groet(?:en)?|hartelijke groet(?:en)?|groet(?:en|jes)?(?: van)?|liefs|mvg|kind regards|cheers|\bgr\.?)[,.!]?[ \t]*\n?[ \t]*/gi;
    const naamDeel = /^([A-ZÀ-Ý][a-zà-ÿ'-]+(?:[ \t]+(?:van|de|der|den|het|ter|ten|v\.d\.|[A-ZÀ-Ý][a-zà-ÿ'-]+)){0,4})/;
    for (const a of t.matchAll(aanloop)) {
      const nm = naamDeel.exec(t.slice(a.index + a[0].length));
      if (nm && !eigenNamen.some(e => nm[1].toLowerCase().startsWith(e))) { zet('k-naam', nm[1].replace(/\s+(en|of|ik|wij|we)$/i, ''), a[0] + nm[1]); break; }
    }

    // Bedrijf: "namens X" of "X B.V."
    const bv = /\b([A-Z][\w&'.-]*(?:\s+[A-Z&][\w&'.-]*){0,4}\s+(?:B\.?V\.?|V\.?O\.?F\.?|N\.?V\.?))(?=[\s,.;]|$)/.exec(t) || /\bnamens\s+([A-Z][\w&'.-]*(?:\s+[A-Z&][\w&'.-]*){0,3})/.exec(t);
    if (bv) zet('k-bedrijf', bv[1], bv[0]);

    // Adressen
    const postcode = /\b(\d{4})\s?([A-Z]{2})\b,?\s+([A-Z][a-zA-Z'’-]+(?:[ -][A-Za-z'’-]+){0,2})/.exec(t);
    const straat = /\b([A-Z][a-zA-Zà-ÿ'’.-]*(?:\s[a-zA-Zà-ÿ'’.-]+){0,3}(?:straat|laan|weg|plein|gracht|kade|singel|dijk|pad|steeg|hof|park|dreef|baan|markt|erf|veld|plantsoen|boulevard|allee))\s+(\d{1,4}\s?[a-zA-Z]?(?:-\d+)?)\b/.exec(t);
    if (straat || postcode) {
      const idx = Math.min(straat ? straat.index : Infinity, postcode ? postcode.index : Infinity);
      const ervoor = t.slice(Math.max(0, idx - 80), idx);
      const isFeest = /(locatie|feest|plaatsvinden|vieren|event|bruiloft|bij ons|adres van het|is in|vindt plaats)/i.test(ervoor) && !/factuur|factuuradres|ons adres|mijn adres|woonadres/i.test(ervoor);
      const pc = postcode ? `${postcode[1]} ${postcode[2]} ${postcode[3]}` : '';
      if (isFeest) zet('f-locatie', [straat && `${straat[1]} ${straat[2]}`, pc].filter(Boolean).join(', '), (straat || postcode)[0]);
      else {
        if (straat) zet('k-adres', `${straat[1]} ${straat[2]}`, straat[0]);
        if (postcode) zet('k-plaats', pc, postcode[0]);
      }
    }
    // Locatie in woorden: "op/in/bij Landgoed X"
    const loc = /\b(?:op|in|bij|locatie)\s+((?:landgoed|kasteel|restaurant|café|cafe|hotel|boerderij|zaal|club|strandpaviljoen|paviljoen|buitenplaats|kantoor|de tuin)[^\n,.!?]{0,40})/i.exec(t);
    if (loc) {
      const naam = loc[1].trim().replace(/^\w/, c => c.toUpperCase());
      if (v['f-locatie'] && !v['f-locatie'].waarde.includes(naam)) v['f-locatie'].waarde = naam + ', ' + v['f-locatie'].waarde;
      else zet('f-locatie', naam, loc[0]);
    }

    // Datum
    const datums = vindDatums(lDatum ? lDatum + '\n' + t : t, vandaag);
    const fd = kiesFeestDatum(lDatum ? lDatum + '\n' + t : t, datums, vandaag);
    if (fd) zet('f-datum', fd.waarde, (lDatum ? lDatum + '\n' + t : t).substr(fd.idx, fd.len));

    // Tijden en uren
    const tijden = vindTijden(t);
    if (tijden) { zet('f-van', tijden.van, tijden.snippet); zet('f-tot', tijden.tot, tijden.snippet); }
    const uren = lUren ? parseFloat(lUren.replace(',', '.')) : ((/\b(\d{1,2}(?:[.,]5)?)[ \t]*uur\b(?!\s*(?:[:.]\d|tot|-))/i.exec(t) || [])[1] || '').replace(',', '.');
    if (+uren > 0 && +uren <= 16) {
      if (v['f-van'] && !v['f-tot']) zet('f-tot', plusUren(v['f-van'].waarde, +uren), `${uren} uur`);
      else if (!v['f-van']) {
        // Alleen een aantal uur bekend: starttijd 20:00 aannemen (in het overzicht aan te passen)
        zet('f-van', '20:00', `aanname: ${uren} uur, begintijd niet genoemd`);
        zet('f-tot', plusUren('20:00', +uren), `aanname: 20:00 + ${uren} uur`);
      }
    }

    // Gasten
    const gasten = lGasten ? parseInt(lGasten, 10) : +((/\b(\d{1,4})[ \t]*(?:gasten|personen|mensen|pers\.?|man|genodigden|collega'?s|vrienden)\b/i.exec(t) || [])[1] || 0);
    if (gasten > 0) zet('f-gasten', String(gasten), `${gasten} gasten`);

    // Soort feest
    const soortBron = lSoort || t;
    for (const [naam, re] of SOORTEN) { const m = re.exec(soortBron); if (m) { zet('f-soort', naam, m[0]); break; } }

    // Aantal cocktails, fruitpers en glazen (o.a. uit het boekingsformulier van de website)
    const lCocktails = label(t, 'cocktails op de kaart|aantal cocktails');
    const nC = lCocktails ? parseInt(lCocktails, 10) : +((/\b([1-5])\s*(?:verschillende\s+)?cocktails\b/i.exec(t) || [])[1] || 0);
    if (nC >= 1 && nC <= 5) zet('f-cocktails', String(nC), `${nC} cocktails`);
    const lFruit = label(t, 'fruitpers');
    if (lFruit ? /^ja/i.test(lFruit) : /\b(fruitpers|vers geperst\w*|verse sappen)\b/i.test(t)) zet('f-fruitpers', 'ja', lFruit ? 'Fruitpers: ja' : 'vers geperst');
    const lGlas = label(t, 'glazen via \\w+|glazen');
    const glazenGewenst = lGlas ? /^ja/i.test(lGlas) : /\bglazen\b[^.\n]{0,40}\b(regelen|meenemen|nodig|huren)\b/i.test(t);

    // Gewenste cocktails
    const gezien = new Set();
    for (const c of COCKTAILS) {
      const re = new RegExp('\\b' + c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[\\s-]?') + 's?\\b', 'i');
      if (re.test(t) && ![...gezien].some(g => g.toLowerCase().includes(c.toLowerCase()))) gezien.add(c);
    }
    const opm = [];
    if (gezien.size) opm.push('Gewenste cocktails: ' + [...gezien].join(', '));
    if (v._uren) opm.push('Gewenst aantal uur: ' + v._uren.waarde);
    if (glazenGewenst) opm.push('Glazen via Beck on the Rocks gewenst');
    if (opm.length) zet('opmerking', opm.join('\n'), [...gezien].join(', ') || 'gasten/uren');

    if (v['k-email']) {
      const e = (v['k-email'].waarde.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/) || [])[0];
      if (e) v['k-email'].waarde = e.toLowerCase(); else delete v['k-email'];
    }
    delete v._uren;
    return v;
  }

  return { leesBestand, analyseer };
})();
