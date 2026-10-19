// Beck on the Rocks: offertes & facturen
// Alles wordt opgeslagen in localStorage van deze browser.
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const opslag = {
    lees: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    schrijf: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privémodus */ } }
  };

  /* ================= Instellingen ================= */
  const STANDAARD = {
    naam: 'Beck on the Rocks', contact: 'Rutger', adres: '', plaats: '', tel: '06 39 65 86 62', email: 'rutger@beck.nl', web: 'beckontherocks.nl',
    kvk: '', iban: '', btw: 'kor', btwnr: '', review: '',
    uur: 45, prep: 1, menu: 75, fruitpers: 20, menuFp: 99, km: 0.25, glas: 0.5, spoed: 25, annul: 20, betaal: 14
  };
  // Tarieven van de website (tarieven.json → assets/js/tarieven.js) gaan voor
  const SITE = window.BECK_TARIEVEN;
  const SITE_TARIEF = SITE ? {
    uur: SITE.uur, prep: SITE.voorbereidingUren, menu: SITE.menu, fruitpers: SITE.fruitpersProcent, menuFp: SITE.menuFruitpers,
    km: SITE.km, glas: SITE.glas, spoed: SITE.spoedProcent, annul: SITE.annulerenProcent, betaal: SITE.betaalDagen
  } : {};
  Object.assign(STANDAARD, SITE_TARIEF);
  let ins = { ...STANDAARD, ...opslag.lees('beck-instellingen', {}) };
  // Zijn de tarieven op de website veranderd sinds je laatste bezoek? Dan neemt de generator ze over.
  const siteBron = JSON.stringify(SITE_TARIEF);
  if (SITE && ins.tarievenBron && ins.tarievenBron !== siteBron) {
    Object.assign(ins, SITE_TARIEF);
    setTimeout(() => alert('De tarieven op je website zijn veranderd. De generator gebruikt nu ook de nieuwe tarieven.'), 300);
  }
  if (SITE && ins.tarievenBron !== siteBron) { ins.tarievenBron = siteBron; opslag.schrijf('beck-instellingen', ins); }
  // Oude standaardwaarden uit een eerdere versie bijwerken
  if (ins.email === 'info@beckontherocks.nl') ins.email = STANDAARD.email;
  if (!ins.web) ins.web = STANDAARD.web;
  if (!ins.tel) ins.tel = STANDAARD.tel;
  $$('[data-set]').forEach(el => {
    el.value = ins[el.dataset.set];
    el.addEventListener('input', () => {
      ins[el.dataset.set] = el.type === 'number' ? +el.value : el.value;
      opslag.schrijf('beck-instellingen', ins);
      teken();
    });
  });

  /* ================= Hulpjes ================= */
  const euro = n => '€ ' + (Math.round(n * 100) / 100).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const isoVan = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const vandaag = () => isoVan(new Date());
  const plusDagen = (iso, n) => { const d = new Date(iso + 'T00:00'); d.setDate(d.getDate() + n); return isoVan(d); };
  const lang = iso => iso ? new Date(iso + 'T00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const getal = n => n.toLocaleString('nl-NL', { maximumFractionDigits: 2 });

  function uren(van, tot) {
    if (!van || !tot) return 0;
    const [a, b] = van.split(':').map(Number), [c, d] = tot.split(':').map(Number);
    let m = (c * 60 + d) - (a * 60 + b);
    if (m <= 0) m += 24 * 60; // over middernacht
    return Math.round(m / 15) / 4;
  }
  function isSpoed(docDatum, feestDatum) {
    if (!docDatum || !feestDatum) return false;
    const grens = new Date(docDatum + 'T00:00'); grens.setMonth(grens.getMonth() + 1);
    return new Date(feestDatum + 'T00:00') < grens;
  }

  /* ================= Documentstatus ================= */
  const VELDEN = ['nummer', 'datum', 'termijn', 'referentie', 'k-naam', 'k-bedrijf', 'k-adres', 'k-plaats', 'k-email', 'k-tel',
    'f-datum', 'f-soort', 'f-van', 'f-tot', 'f-gasten', 'f-locatie', 'f-cocktails', 'f-km', 'f-glazen', 'opmerking', 'status'];
  let type = 'offerte', extra = [];

  const alleDocs = () => opslag.lees('beck-documenten', {});
  const prefix = t => (t === 'offerte' ? 'O' : 'F') + '-' + new Date().getFullYear() + '-';
  function volgendNummer(t) {
    const p = prefix(t);
    const max = Object.keys(alleDocs()).filter(n => n.startsWith(p)).map(n => +n.slice(p.length) || 0).reduce((a, b) => Math.max(a, b), 0);
    return p + String(max + 1).padStart(3, '0');
  }

  function leesForm() {
    const d = { type, extra: extra.map(r => ({ ...r })), spoedAuto: $('#spoed-auto').checked, spoedHand: $('#spoed-hand').checked, fruitpers: $('#f-fruitpers').checked };
    VELDEN.forEach(id => { d[id] = $('#' + id).value; });
    d.bl = blLees();
    return d;
  }
  function vulForm(d) {
    zetType(d.type, false);
    VELDEN.forEach(id => { if (d[id] !== undefined) $('#' + id).value = d[id]; });
    $('#spoed-auto').checked = d.spoedAuto !== false;
    $('#spoed-hand').checked = !!d.spoedHand;
    $('#f-fruitpers').checked = !!d.fruitpers;
    if (!d['f-cocktails']) $('#f-cocktails').value = '3';
    if (!d.status) $('#status').value = 'concept';
    blZet(d.bl);
    extra = (d.extra || []).map(r => ({ ...r }));
    tekenExtra(); teken();
  }
  function nieuw(t = type) {
    VELDEN.forEach(id => { $('#' + id).value = ''; });
    $('#f-van').value = '20:00'; $('#f-tot').value = '00:00'; $('#f-soort').selectedIndex = 0;
    $('#spoed-auto').checked = true; $('#spoed-hand').checked = false;
    $('#f-fruitpers').checked = false; $('#f-cocktails').value = '3';
    blZet(null); toonLijst(false);
    extra = []; tekenExtra();
    zetType(t, true);
    if (t !== 'offerte') $('#spoed-auto').checked = false; // spoed hoort bij het boekmoment (offerte), niet bij de factuurdatum
    $('#opgeslagen').value = '';
    teken();
  }
  // Van offerte naar factuur: spoed overnemen zoals die op de offerte stond
  function spoedVastzetten() {
    const d = leesForm();
    const sp = d.spoedAuto ? isSpoed(d.datum, d['f-datum']) : d.spoedHand;
    return () => { $('#spoed-auto').checked = false; $('#spoed-hand').checked = sp; };
  }

  const STATUS = {
    offerte: { concept: 'Concept', verstuurd: 'Verstuurd', akkoord: 'Akkoord', afgewezen: 'Afgewezen' },
    factuur: { concept: 'Concept', verstuurd: 'Verstuurd', betaald: 'Betaald' }
  };
  function zetType(t, nieuwNummer) {
    type = t;
    $$('.seg button').forEach(b => { b.classList.toggle('is-on', b.dataset.type === t); b.setAttribute('aria-pressed', b.dataset.type === t); });
    $('#lbl-termijn').firstChild.textContent = t === 'offerte' ? 'Geldig (dagen)' : 'Betaaltermijn (dagen)';
    $('#lbl-ref').hidden = t === 'offerte';
    $('#kopieer-akkoord').hidden = t !== 'offerte';
    $('#herinner').hidden = t === 'offerte';
    const huidig = $('#status').value;
    $('#status').innerHTML = Object.entries(STATUS[t === 'offerte' ? 'offerte' : 'factuur']).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    $('#status').value = STATUS[t === 'offerte' ? 'offerte' : 'factuur'][huidig] ? huidig : 'concept';
    if (nieuwNummer) {
      $('#status').value = 'concept';
      $('#nummer').value = volgendNummer(t);
      $('#datum').value = vandaag();
      $('#termijn').value = t === 'offerte' ? 14 : ins.betaal;
    }
  }

  /* ================= Extra regels ================= */
  function tekenExtra() {
    $('#extra').innerHTML = extra.map((r, i) => `
      <div class="extra-row" data-i="${i}">
        <input data-k="oms" placeholder="Omschrijving" value="${esc(r.oms)}">
        <input data-k="aantal" type="number" step="0.5" placeholder="1" value="${esc(r.aantal)}">
        <input data-k="prijs" type="number" step="0.01" placeholder="€" value="${esc(r.prijs)}">
        <button type="button" aria-label="Regel verwijderen">×</button>
      </div>`).join('');
  }
  $('#extra').addEventListener('input', e => {
    const rij = e.target.closest('.extra-row'); if (!rij) return;
    extra[+rij.dataset.i][e.target.dataset.k] = e.target.value; teken();
  });
  $('#extra').addEventListener('click', e => {
    if (e.target.tagName !== 'BUTTON') return;
    extra.splice(+e.target.closest('.extra-row').dataset.i, 1); tekenExtra(); teken();
  });
  $('#extra-plus').addEventListener('click', () => { extra.push({ oms: 'Reiskosten', aantal: '1', prijs: '' }); tekenExtra(); teken(); });

  /* ================= Berekening ================= */
  function bereken(d) {
    const u = uren(d['f-van'], d['f-tot']);
    const fp = d.fruitpers;
    const uurprijs = Math.round(ins.uur * (fp ? 1 + ins.fruitpers / 100 : 1) * 100) / 100;
    const n = +d['f-cocktails'] || 3;
    const regels = [
      { oms: 'Bartender', sub: `${d['f-van'] || '?'} – ${d['f-tot'] || '?'}${fp ? ' · incl. fruitpers en vers geperste sappen' : ''}`, aantal: u, eenheid: 'uur', prijs: uurprijs },
      { oms: 'Voorbereiding', sub: 'Afstemmen inkopen, siropen en garnituren, opbouwen', aantal: ins.prep, eenheid: 'uur', prijs: uurprijs },
      { oms: 'Cocktailmenu & gebruik materialen', sub: `Kaart met ${n} ${n === 1 ? 'cocktail' : 'cocktails'}, boodschappenlijst en bartools${fp ? ', fruitpers' : ''}`, aantal: 1, eenheid: '', prijs: fp ? ins.menuFp : ins.menu }
    ];
    if (+d['f-km'] > 0) regels.push({ oms: 'Reiskosten', sub: 'Heen en terug', aantal: +d['f-km'], eenheid: 'km', prijs: ins.km });
    if (+d['f-glazen'] > 0) regels.push({ oms: 'Glazen', sub: 'Geregeld via Beck on the Rocks', aantal: +d['f-glazen'], eenheid: 'st.', prijs: ins.glas });
    d.extra.filter(r => r.oms || +r.prijs).forEach(r => regels.push({ oms: r.oms || 'Overig', aantal: +r.aantal || 1, eenheid: '', prijs: +r.prijs || 0 }));
    regels.forEach(r => { r.bedrag = r.aantal * r.prijs; });
    const spoed = d.spoedAuto ? isSpoed(d.datum, d['f-datum']) : d.spoedHand;
    let sub = regels.reduce((t, r) => t + r.bedrag, 0);
    if (spoed) {
      const s = sub * ins.spoed / 100;
      regels.push({ oms: `Spoedtoeslag ${ins.spoed}%`, sub: 'Geboekt binnen 1 maand voor het feest', aantal: 1, eenheid: '', prijs: s, bedrag: s });
      sub += s;
    }
    if (d.type === 'annulering') {
      const a = sub * ins.annul / 100;
      return {
        u, spoed, afgesproken: sub,
        regels: [{ oms: `Annuleringskosten ${ins.annul}%`, sub: `Annulering binnen 14 dagen voor het feest van ${lang(d['f-datum']) || '…'}. Afgesproken bedrag: ${euro(sub)}`, aantal: 1, eenheid: '', prijs: a, bedrag: a }],
        sub: a
      };
    }
    return { u, spoed, regels, sub };
  }

  /* ================= Tekenen ================= */
  function teken() {
    const d = leesForm();
    const b = bereken(d);
    const btw = ins.btw === '21';
    const btwBedrag = btw ? b.sub * .21 : 0;
    const totaal = b.sub + btwBedrag;
    const factuur = type !== 'offerte';
    const termijn = +d.termijn || (factuur ? ins.betaal : 14);
    const tot = d.datum ? plusDagen(d.datum, termijn) : '';
    $('#lbl-spoed-hand').hidden = d.spoedAuto;
    $('#naar-factuur').hidden = type !== 'offerte';
    $('[data-show=btw21]').hidden = !btw;

    // Afzender
    $('#d-me').innerHTML = [ins.naam, ins.contact, ins.adres, ins.plaats, ins.tel, ins.email, ins.web].filter(Boolean).map(esc).join('<br>');

    // Titel + meta
    $('#d-titel').textContent = type === 'offerte' ? 'Offerte' : type === 'annulering' ? 'Factuur · annulering' : 'Factuur';
    const meta = [
      [type === 'offerte' ? 'Offertenummer' : 'Factuurnummer', d.nummer],
      [type === 'offerte' ? 'Offertedatum' : 'Factuurdatum', lang(d.datum)],
      [type === 'offerte' ? 'Geldig tot' : 'Vervaldatum', lang(tot)]
    ];
    if (factuur && d.referentie) meta.push(['Referentie', d.referentie]);
    $('#d-meta').innerHTML = meta.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v) || '<span class="leeg">…</span>'}</dd>`).join('');

    // Klant + feest
    const klant = [d['k-bedrijf'], d['k-bedrijf'] && d['k-naam'] ? 't.a.v. ' + d['k-naam'] : d['k-naam'], d['k-adres'], d['k-plaats'], d['k-email'], d['k-tel']].filter(Boolean);
    $('#d-klant').innerHTML = klant.length ? klant.map(esc).join('<br>') : '<span class="leeg">Gegevens klant</span>';
    $('#d-aan-label').textContent = factuur ? 'Factuur aan' : 'Voor';
    const feest = [
      d['f-soort'] + (d['f-datum'] ? ' op ' + lang(d['f-datum']) : ''),
      d['f-van'] && d['f-tot'] ? `${d['f-van']} – ${d['f-tot']} (${getal(b.u)} uur)` : '',
      +d['f-gasten'] > 0 ? `${d['f-gasten']} gasten` : '',
      d['f-locatie']
    ].filter(Boolean);
    $('#d-feest').innerHTML = feest.map(esc).join('<br>');

    // Regels
    $('#d-regels').innerHTML = b.regels.map(r => `
      <tr>
        <td>${esc(r.oms)}${r.sub ? `<small>${esc(r.sub)}</small>` : ''}</td>
        <td class="num">${getal(r.aantal)}${r.eenheid ? ' ' + r.eenheid : ''}</td>
        <td class="num">${euro(r.prijs)}</td>
        <td class="num">${euro(r.bedrag)}</td>
      </tr>`).join('');

    // Totalen
    $('#d-totaal').innerHTML = btw
      ? `<div><span>Subtotaal</span><span>${euro(b.sub)}</span></div>
         <div><span>Btw 21%</span><span>${euro(btwBedrag)}</span></div>
         <div class="tot"><span>Totaal</span><span>${euro(totaal)}</span></div>`
      : `<div class="tot"><span>Totaal</span><span>${euro(totaal)}</span></div>
         <div class="muted"><span>Geen btw: kleineondernemersregeling (KOR)</span></div>`;

    // Opmerking
    $('#d-opmerking').hidden = !d.opmerking;
    $('#d-opmerking').textContent = d.opmerking;

    // Voorwaarden / betaling
    const iban = ins.iban || '…';
    if (type === 'offerte') {
      $('#d-voorwaarden').innerHTML = `
        <h3>Afspraken</h3>
        <ul>
          <li>Je huurt mij in als bartender. Drank, ijs en verse ingrediënten regel je zelf; je ontvangt van mij een boodschappenlijst.</li>
          <li>Je zorgt voor een werkplek: een stevige tafel of bar, met een gootsteen met stromend water in de buurt.</li>
          <li>Geen aanbetaling. Na het feest ontvang je een factuur met een betaaltermijn van ${ins.betaal} dagen.</li>
          <li>Boeken binnen 1 maand voor het feest geldt als spoedboeking: +${ins.spoed}% over alle kosten.</li>
          <li>Annuleren kan kosteloos tot 14 dagen voor het feest. Daarna reken ik ${ins.annul}% van het afgesproken bedrag.</li>
          <li>Deze offerte is geldig tot ${lang(tot) || '…'}. Akkoord? Stuur hem getekend terug of laat het me weten per mail of WhatsApp, dan staat je datum vast.</li>
        </ul>
        <div class="akkoord">
          <h3>Voor akkoord</h3>
          <div class="akkoord__lijnen"><span>Naam</span><span>Datum</span><span>Handtekening</span></div>
        </div>`;
    } else {
      $('#d-voorwaarden').innerHTML = `
        <p class="pay">Graag het totaalbedrag van <strong>${euro(totaal)}</strong> vóór <strong>${lang(tot) || '…'}</strong> overmaken op
        <strong>${esc(iban)}</strong> t.n.v. ${esc(ins.naam)}, onder vermelding van factuurnummer <strong>${esc(d.nummer)}</strong>.</p>
        <h3>Bedankt!</h3>
        <ul><li>${type === 'annulering' ? 'Jammer dat het feest niet doorgaat. Hopelijk tot een volgende keer!' : 'Bedankt voor de fijne samenwerking. Een review stel ik enorm op prijs' + (ins.review ? ': ' + esc(ins.review) : '!')}</li></ul>`;
    }

    // Voet
    $('#d-foot').innerHTML = [
      ins.kvk && 'KvK ' + esc(ins.kvk),
      btw ? (ins.btwnr && 'Btw ' + esc(ins.btwnr)) : 'KOR: vrijgesteld van btw',
      ins.iban && 'IBAN ' + esc(ins.iban)
    ].filter(Boolean).map(s => `<span>${s}</span>`).join('');

    // Ontbrekende gegevens: alleen als melding in het bewerkpaneel, niet op het document
    const mist = [
      !ins.kvk && 'KvK-nummer',
      factuur && !ins.iban && 'IBAN',
      factuur && (!ins.adres || !ins.plaats) && 'je adres',
      btw && !ins.btwnr && 'btw-nummer'
    ].filter(Boolean);
    $('#ontbreekt').hidden = !mist.length;
    $('#ontbreekt').innerHTML = mist.length
      ? `Nog niet ingevuld: <strong>${mist.join(', ')}</strong>. ${factuur ? 'Dit is verplicht op een factuur. ' : ''}Vul het in onder "Mijn gegevens & tarieven".`
      : '';

    // Past het niet op één A4? Dan compacter zetten (verhouding is onafhankelijk van zoom)
    const paper = $('#paper');
    paper.classList.remove('is-compact');
    if (paper.offsetHeight / paper.offsetWidth > 297 / 210 + 0.002) paper.classList.add('is-compact');

    blTeken(d, b);

    // Knoppen
    const bestaat = !!alleDocs()[d.nummer];
    $('#wis').hidden = !bestaat;
  }

  /* ================= Opslaan / openen ================= */
  function tekenLijst() {
    const docs = alleDocs();
    const nrs = Object.keys(docs).sort().reverse();
    $('#opgeslagen').innerHTML = '<option value="">Nieuw document</option>' + nrs.map(n => {
      const d = docs[n];
      return `<option value="${esc(n)}">${esc(n)} · ${esc(d['k-naam'] || d['k-bedrijf'] || 'zonder naam')}${d['f-datum'] ? ' · ' + esc(d['f-datum']) : ''}</option>`;
    }).join('');
  }
  function bewaar() {
    const d = leesForm();
    if (!d.nummer) return;
    d.bijgewerkt = new Date().toISOString();
    const docs = alleDocs();
    if (docs[d.nummer]?.herinnerd) d.herinnerd = docs[d.nummer].herinnerd;
    docs[d.nummer] = d; opslag.schrijf('beck-documenten', docs);
    tekenLijst(); $('#opgeslagen').value = d.nummer;
    toonBackupInfo();
  }

  $('#opgeslagen').addEventListener('change', e => {
    const d = alleDocs()[e.target.value];
    if (d) vulForm(d); else nieuw();
  });
  $$('.seg button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.type === type) return;
    // Van type wisselen: gegevens blijven staan, nummer/datum worden nieuw
    const ref = $('#nummer').value;
    const vanOfferte = type === 'offerte' && b.dataset.type !== 'offerte';
    const zetSpoed = spoedVastzetten();
    zetType(b.dataset.type, true);
    if (vanOfferte) zetSpoed();
    if (b.dataset.type !== 'offerte' && ref && !$('#referentie').value) $('#referentie').value = ref;
    $('#opgeslagen').value = '';
    teken();
  }));
  $('#naar-factuur').addEventListener('click', () => {
    bewaar();
    const ref = $('#nummer').value;
    const zetSpoed = spoedVastzetten();
    zetType('factuur', true);
    zetSpoed();
    $('#referentie').value = ref;
    $('#opgeslagen').value = '';
    teken();
  });
  // Bestandsnaam van de PDF = paginatitel tijdens het printen, bijv. "Offerte O-2026-001 Jarno Klein"
  function pdfNaam() {
    const d = leesForm();
    const soort = lijstZichtbaar ? 'Boodschappenlijst' : type === 'offerte' ? 'Offerte' : type === 'annulering' ? 'Factuur annulering' : 'Factuur';
    const klant = (d['k-bedrijf'] || d['k-naam'] || '').trim();
    return [soort, d.nummer, klant].filter(Boolean).join(' ').replace(/[\\/:*?"<>|#%&]+/g, '').replace(/\s+/g, ' ').slice(0, 80);
  }
  const titelOrigineel = document.title;
  addEventListener('beforeprint', () => { document.title = pdfNaam(); });
  addEventListener('afterprint', () => { document.title = titelOrigineel; });
  $('#print').addEventListener('click', () => {
    bewaar(); teken();
    document.title = pdfNaam();
    window.print(); // titel gaat terug via 'afterprint'
  });
  $('#nieuw').addEventListener('click', () => nieuw());
  $('#status').addEventListener('change', () => { if (alleDocs()[$('#nummer').value]) bewaar(); });
  $('#wis').addEventListener('click', () => {
    const n = $('#nummer').value;
    if (!confirm(`Document ${n} verwijderen?`)) return;
    const docs = alleDocs(); delete docs[n]; opslag.schrijf('beck-documenten', docs);
    tekenLijst(); nieuw();
  });
  $('.editor').addEventListener('input', e => { if (!e.target.closest('#extra') && !e.target.dataset.set) teken(); });
  $('.editor').addEventListener('change', e => { if (e.target.type === 'checkbox') teken(); });

  /* ================= Bedragen, versturen en online akkoord ================= */
  function cijfers(d) {
    const b = bereken(d);
    const btw = ins.btw === '21' ? b.sub * .21 : 0;
    const termijn = +d.termijn || (d.type !== 'offerte' ? ins.betaal : 14);
    return { b, btw, totaal: b.sub + btw, verval: d.datum ? plusDagen(d.datum, termijn) : '' };
  }
  const voornaam = d => (d['k-naam'] || '').trim().split(/\s+/)[0] || '';

  // Offerte als compacte link: alles wat de klant moet zien zit in de link zelf
  const b64 = str => btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  // Controlecode: HMAC-SHA256 met een geheime sleutel die alleen in jouw generator (en back-up) staat.
  // Past een klant iets aan in de link, dan klopt de code niet meer; de controleerlink in de akkoordmail laat dat zien.
  function akkoordSleutel() {
    if (!ins.akkoordSleutel) {
      ins.akkoordSleutel = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, '0')).join('');
      opslag.schrijf('beck-instellingen', ins);
    }
    return ins.akkoordSleutel;
  }
  async function onderteken(tekst) {
    const sleutel = await crypto.subtle.importKey('raw', new TextEncoder().encode(akkoordSleutel()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', sleutel, new TextEncoder().encode(tekst)));
    return [...sig.slice(0, 8)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  async function akkoordLink(d) {
    const c = cijfers(d);
    const data = {
      v: 1, n: d.nummer, dt: d.datum, gt: c.verval, k: d['k-naam'], bd: d['k-bedrijf'], s: d['f-soort'], fd: d['f-datum'],
      t: d['f-van'] && d['f-tot'] ? `${d['f-van']} – ${d['f-tot']}` : '', u: c.b.u, g: d['f-gasten'], l: d['f-locatie'],
      r: c.b.regels.map(r => [r.oms, r.sub || '', `${getal(r.aantal)}${r.eenheid ? ' ' + r.eenheid : ''}`, Math.round(r.bedrag * 100) / 100]),
      sub: Math.round(c.b.sub * 100) / 100, btw: Math.round(c.btw * 100) / 100, tot: Math.round(c.totaal * 100) / 100,
      kor: ins.btw !== '21', sp: ins.spoed, an: ins.annul, bt: ins.betaal, o: d.opmerking || ''
    };
    const basis = location.href.replace(/[?#].*$/, '').replace(/documenten\.html$/, '');
    const o = b64(JSON.stringify(data));
    return `${basis}akkoord.html?o=${o}&s=${await onderteken(o)}`;
  }

  // Geopend via de controleerlink uit een akkoordmail: klopt de offerte nog met wat jij hebt verstuurd?
  async function controleerAkkoord(o, s) {
    let data;
    try {
      const b = atob(o.replace(/-/g, '+').replace(/_/g, '/'));
      data = JSON.parse(new TextDecoder().decode(Uint8Array.from(b, c => c.charCodeAt(0))));
    } catch { alert('Deze controlelink is beschadigd of niet volledig gekopieerd.'); return; }
    const doc = alleDocs()[data.n];
    const nu = doc ? cijfers(doc).totaal : null;
    const verschilt = nu != null && Math.abs(nu - data.tot) > 0.01;
    if (!s) {
      alert(`Deze akkoordlink heeft nog geen controlecode (verstuurd vóór de update).\n\nBedrag in de link: ${euro(data.tot)}`
        + (nu != null ? `\nJouw offerte ${data.n}: ${euro(nu)}${verschilt ? '  ← VERSCHILT' : ' (gelijk)'}` : '\nDeze offerte staat niet in deze generator.'));
    } else if (s !== await onderteken(o)) {
      alert(`✗ LET OP: deze akkoordlink is aangepast, of niet met jouw generator gemaakt.\n\nBedrag in de link: ${euro(data.tot)}`
        + (nu != null ? `\nJouw offerte ${data.n}: ${euro(nu)}` : '') + '\n\nNeem contact op met de klant voordat je de datum bevestigt.');
    } else {
      const tekst = `✓ Offerte ${data.n} is ongewijzigd: ${euro(data.tot)} voor ${data.k || 'de klant'}.`
        + (verschilt ? `\n\nLet op: je hebt de offerte daarna nog aangepast (nu ${euro(nu)}). De klant gaf akkoord op ${euro(data.tot)}.` : '');
      if (doc && doc.status !== 'akkoord' && confirm(tekst + '\n\nStatus van deze offerte op Akkoord zetten?')) {
        const docs = alleDocs(); docs[data.n].status = 'akkoord'; opslag.schrijf('beck-documenten', docs);
      } else if (!doc || doc.status === 'akkoord') alert(tekst);
    }
    const bijgewerkt = alleDocs()[data.n];
    if (bijgewerkt) { vulForm(bijgewerkt); $('#opgeslagen').value = data.n; }
  }

  async function bericht(d) {
    const c = cijfers(d), vn = voornaam(d);
    const feest = `${(d['f-soort'] || 'feest').toLowerCase()}${d['f-datum'] ? ' op ' + lang(d['f-datum']) : ''}`;
    const groet = `\n\nGroet,\n${ins.contact || ''}\n${ins.naam}${ins.web ? '\n' + ins.web : ''}`;
    if (d.type === 'offerte') {
      return {
        onderwerp: `Offerte ${d.nummer} · ${ins.naam}`,
        tekst: `Hoi${vn ? ' ' + vn : ''},\n\nBedankt voor je aanvraag! Hierbij mijn offerte ${d.nummer} voor je ${feest}: ${euro(c.totaal)}. De offerte stuur ik als PDF mee.`
          + `\n\nAkkoord? Dat kun je hier direct online aangeven (ook als je nog iets wilt toevoegen):\n${await akkoordLink(d)}`
          + `\n\nDe offerte is geldig tot ${lang(c.verval)}. Heb je vragen, laat het gerust weten.` + groet
      };
    }
    const annul = d.type === 'annulering';
    return {
      onderwerp: `Factuur ${d.nummer} · ${ins.naam}`,
      tekst: `Hoi${vn ? ' ' + vn : ''},\n\n${annul ? 'Hierbij de factuur voor de annuleringskosten van je ' + feest : 'Bedankt voor het fijne feest! Hierbij de factuur voor je ' + feest}: ${euro(c.totaal)}. De factuur stuur ik als PDF mee.`
        + `\n\nGraag overmaken vóór ${lang(c.verval)}${ins.iban ? ' op ' + ins.iban + ' t.n.v. ' + ins.naam : ''}, onder vermelding van ${d.nummer}.`
        + (!annul && ins.review ? `\n\nWas je tevreden? Een review stel ik enorm op prijs: ${ins.review}` : '') + groet
    };
  }
  // Betaalherinnering: klaar vanaf de vervaldatum (factuurdatum + betaaltermijn, standaard 14 dagen)
  function herinnering(d) {
    const c = cijfers(d), vn = voornaam(d);
    const feest = `${(d['f-soort'] || 'feest').toLowerCase()}${d['f-datum'] ? ' op ' + lang(d['f-datum']) : ''}`;
    return {
      onderwerp: `Herinnering factuur ${d.nummer} · ${ins.naam}`,
      tekst: `Hoi${vn ? ' ' + vn : ''},\n\nEven een vriendelijke herinnering: de betaaltermijn van factuur ${d.nummer} (${euro(c.totaal)}) voor je ${feest} liep tot ${lang(c.verval)}. Waarschijnlijk is het je even ontschoten.`
        + `\n\nWil je het bedrag binnen 7 dagen overmaken${ins.iban ? ' op ' + ins.iban + ' t.n.v. ' + ins.naam : ''}, onder vermelding van ${d.nummer}? Heb je al betaald, dan kun je dit bericht negeren.`
        + `\n\nDank je wel!\n\nGroet,\n${ins.contact || ''}\n${ins.naam}${ins.web ? '\n' + ins.web : ''}`
    };
  }
  const herinnerNodig = (d, c) => d.type !== 'offerte' && d.status === 'verstuurd' && c.verval && c.verval <= vandaag();
  function stuurHerinnering(d, via) {
    const m = herinnering(d);
    if (via === 'wa') open(`https://wa.me/${telIntl(d['k-tel'])}?text=${encodeURIComponent(m.tekst)}`, '_blank', 'noopener');
    else location.href = `mailto:${encodeURIComponent(d['k-email'] || '')}?subject=${encodeURIComponent(m.onderwerp)}&body=${encodeURIComponent(m.tekst)}`;
    const docs = alleDocs();
    if (docs[d.nummer]) { docs[d.nummer].herinnerd = vandaag(); opslag.schrijf('beck-documenten', docs); }
  }
  // Afspraak in Google Agenda op de vervaldatum, met een link die deze factuur in de generator opent
  function agendaLink(d) {
    const c = cijfers(d);
    const dag = (c.verval || vandaag()).replace(/-/g, '');
    const basis = location.href.replace(/[?#].*$/, '');
    const details = `Is factuur ${d.nummer} (${euro(c.totaal)}) van ${d['k-bedrijf'] || d['k-naam'] || 'de klant'} nog niet betaald? Stuur de herinnering met één klik:\n${basis}?herinner=${encodeURIComponent(d.nummer)}`;
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + `&text=${encodeURIComponent(`Betaling checken: ${d.nummer} ${d['k-naam'] || ''}`.trim())}`
      + `&dates=${dag}T090000/${dag}T091500&details=${encodeURIComponent(details)}`;
  }
  function markeerVerstuurd() {
    if ($('#status').value === 'concept') $('#status').value = 'verstuurd';
    bewaar(); teken();
    if (type !== 'offerte') $('#verstuur-tip').textContent = `Verstuurd ✓ Zet hieronder meteen de betaalherinnering voor ${lang(cijfers(leesForm()).verval)} in je agenda.`;
  }
  const telIntl = t => { let n = String(t || '').replace(/[^\d+]/g, ''); if (n.startsWith('+')) n = n.slice(1); else if (n.startsWith('00')) n = n.slice(2); else if (n.startsWith('0')) n = '31' + n.slice(1); return n.length >= 10 ? n : ''; };
  $('#stuur-wa').addEventListener('click', async () => {
    const d = leesForm(), m = await bericht(d), nr = telIntl(d['k-tel']);
    open(`https://wa.me/${nr}?text=${encodeURIComponent(m.tekst)}`, '_blank', 'noopener');
    markeerVerstuurd();
  });
  $('#stuur-mail').addEventListener('click', async () => {
    const d = leesForm(), m = await bericht(d);
    location.href = `mailto:${encodeURIComponent(d['k-email'] || '')}?subject=${encodeURIComponent(m.onderwerp)}&body=${encodeURIComponent(m.tekst)}`;
    markeerVerstuurd();
  });
  $('#herinner-agenda').addEventListener('click', () => {
    const d = leesForm();
    if (!d.datum) { alert('Vul eerst de factuurdatum in.'); return; }
    open(agendaLink(d), '_blank', 'noopener');
  });
  $('#herinner-wa').addEventListener('click', () => { bewaar(); stuurHerinnering(leesForm(), 'wa'); });
  $('#herinner-mail').addEventListener('click', () => { bewaar(); stuurHerinnering(leesForm(), 'mail'); });
  $('#kopieer-akkoord').addEventListener('click', async () => {
    const link = await akkoordLink(leesForm());
    try { await navigator.clipboard.writeText(link); $('#verstuur-tip').textContent = 'Akkoordlink gekopieerd ✓ Plak hem in je bericht aan de klant.'; }
    catch { prompt('Kopieer deze link:', link); }
  });

  /* ================= Boodschappenlijst ================= */
  const R = window.BeckRecepten;
  let lijstZichtbaar = false;
  $('#bl-cocktails').innerHTML = R.namen.map(n => `<label class="bl__c"><input type="checkbox" value="${esc(n)}"> ${esc(n)}${R.RECEPTEN[n].bron === 'eigen' ? ' <small>mocktail</small>' : ''}</label>`).join('');
  function blLees() {
    return {
      cocktails: $$('#bl-cocktails input:checked').map(i => i.value),
      aandeel: +$('#bl-aandeel').value || 0, perUur: +$('#bl-peruur').value || 0,
      marge: +$('#bl-marge').value || 0, totaal: $('#bl-totaal').value
    };
  }
  function blZet(bl) {
    bl = bl || {};
    $$('#bl-cocktails input').forEach(i => { i.checked = (bl.cocktails || []).includes(i.value); });
    $('#bl-aandeel').value = bl.aandeel ?? 75; $('#bl-peruur').value = bl.perUur ?? 1;
    $('#bl-marge').value = bl.marge ?? 10; $('#bl-totaal').value = bl.totaal ?? '';
  }
  function blUitkomst(d, u) {
    const bl = d.bl;
    const auto = R.aantalCocktails({ gasten: d['f-gasten'], uren: u, aandeel: bl.aandeel, perUur: bl.perUur });
    const totaal = bl.totaal !== '' && bl.totaal != null ? Math.max(0, +bl.totaal) : auto;
    return { auto, totaal, ...R.bereken({ cocktails: bl.cocktails, totaal, marge: bl.marge }) };
  }
  function blTeken(d, b) {
    const bl = d.bl, x = blUitkomst(d, b.u);
    $('#bl-totaal').placeholder = x.auto ? `automatisch: ${x.auto}` : 'automatisch';
    $('#bl-som').innerHTML = !bl.cocktails.length ? 'Kies hierboven één of meer cocktails.'
      : !x.totaal ? 'Vul bij <em>Feest</em> het aantal gasten en de tijden in.'
      : `${d['f-gasten'] || 0} gasten × ${bl.aandeel}% × ${getal(b.u)} uur × ${getal(bl.perUur)} = <strong>${x.auto} cocktails</strong>${x.totaal !== x.auto ? ` (aangepast naar ${x.totaal})` : ''}, ${x.perCocktail.map(c => `${c.aantal} ${c.naam}`).join(', ')}.`;
    // A4
    $('#l-me').innerHTML = $('#d-me').innerHTML;
    const klant = d['k-bedrijf'] || d['k-naam'];
    const meta = [
      ['Voor', klant], ['Feest', [d['f-soort'], d['f-datum'] && lang(d['f-datum'])].filter(Boolean).join(' op ')],
      ['Gasten', d['f-gasten'] ? `${d['f-gasten']} · ${getal(b.u)} uur` : ''], ['Bij offerte', d.nummer]
    ].filter(([, v]) => v);
    $('#l-meta').innerHTML = meta.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
    $('#l-cocktails').innerHTML = x.perCocktail.length
      ? `<p>${x.perCocktail.map(c => `<span class="l-c"><strong>${c.aantal}×</strong> ${esc(c.naam)}</span>`).join('')}</p>`
      : '<p class="leeg">Nog geen cocktails gekozen.</p>';
    $('#l-groepen').innerHTML = x.groepen.map(g => `
      <div class="l-groep"><h3>${esc(g.groep)}</h3><ul>${g.regels.map(r => `
        <li><span class="l-vak"></span><span class="l-naam">${esc(r.naam)}<small>${esc(R.nodigTekst(r))}${r.noot ? ' · ' + esc(r.noot) : ''}</small></span><b>${r.stuks} ${esc(r.koop)}</b></li>`).join('')}</ul></div>`).join('');
    $('#l-noot').textContent = x.totaal
      ? `Berekend voor ${x.totaal} cocktails, inclusief ${bl.marge}% marge, op basis van de officiële IBA-recepten (mocktails: eigen recepten). Sterke drank is in hele flessen afgerond, dus er blijft meestal wat over.`
      : '';
    $('#l-foot').innerHTML = $('#d-foot').innerHTML;
  }
  function toonLijst(aan) {
    lijstZichtbaar = aan;
    $('#paper').hidden = aan; $('#lijst-paper').hidden = !aan;
    $('#bl-toon').textContent = aan ? 'Toon offerte/factuur' : 'Toon lijst op A4';
    $('#print').textContent = aan ? 'Opslaan & lijst printen / PDF' : 'Opslaan & printen / PDF';
  }
  $('#bl-toon').addEventListener('click', () => { toonLijst(!lijstZichtbaar); teken(); });
  $('#bl-cocktails').addEventListener('change', () => teken());
  $('#bl-wa').addEventListener('click', () => {
    const d = leesForm(), x = blUitkomst(d, uren(d['f-van'], d['f-tot']));
    if (!x.groepen.length) { alert('Kies eerst cocktails en vul gasten en tijden in.'); return; }
    const tekst = `Boodschappenlijst voor ${(d['f-soort'] || 'je feest').toLowerCase()}${d['f-datum'] ? ' op ' + lang(d['f-datum']) : ''}`
      + `\n(${x.totaal} cocktails: ${x.perCocktail.map(c => `${c.aantal}× ${c.naam}`).join(', ')})\n`
      + x.groepen.map(g => `\n*${g.groep}*\n` + g.regels.map(r => `☐ ${r.stuks} ${r.koop}: ${r.naam}`).join('\n')).join('\n')
      + `\n\nInclusief ${d.bl.marge}% marge. Groet, ${ins.contact || ins.naam}`;
    open(`https://wa.me/${telIntl(d['k-tel'])}?text=${encodeURIComponent(tekst)}`, '_blank', 'noopener');
  });
  $('#bl-opm').addEventListener('click', () => {
    const c = blLees().cocktails; if (!c.length) return;
    const regel = 'Cocktails: ' + c.join(', ');
    const o = $('#opmerking');
    o.value = /^Cocktails?:.*$/m.test(o.value) || /^Gewenste cocktails:.*$/m.test(o.value)
      ? o.value.replace(/^(Gewenste )?[Cc]ocktails?:.*$/m, regel) : (o.value ? o.value + '\n' : '') + regel;
    $('#f-cocktails').value = String(Math.min(5, Math.max(1, c.length)));
    teken();
  });

  /* ================= Overzicht ================= */
  let ovFilter = 'alle';
  function overzichtRijen() {
    const nu = vandaag();
    return Object.values(alleDocs()).map(d => {
      const c = cijfers(d);
      const st = d.status || 'concept';
      const isFactuur = d.type !== 'offerte';
      const teLaat = isFactuur && st !== 'betaald' && st !== 'concept' && c.verval && c.verval < nu;
      return { d, c, st, isFactuur, teLaat, herinner: herinnerNodig(d, c) };
    }).sort((a, b) => String(b.d.datum).localeCompare(String(a.d.datum)) || String(b.d.nummer).localeCompare(String(a.d.nummer)));
  }
  function tekenOverzicht() {
    const rijen = overzichtRijen(), jaar = String(new Date().getFullYear());
    const som = f => rijen.filter(f).reduce((t, r) => t + r.c.totaal, 0);
    const open_ = som(r => r.isFactuur && r.st !== 'betaald');
    const laat = som(r => r.teLaat);
    const betaald = som(r => r.isFactuur && r.st === 'betaald' && String(r.d.datum).startsWith(jaar));
    const wachtend = rijen.filter(r => !r.isFactuur && r.st === 'verstuurd').length;
    const teHerinneren = rijen.filter(r => r.herinner && !r.d.herinnerd).length;
    $('#ov-cijfers').innerHTML = `
      <div><span>Openstaand</span><strong>${euro(open_)}</strong></div>
      <div class="${laat ? 'is-laat' : ''}"><span>Te laat</span><strong>${euro(laat)}</strong></div>
      <div><span>Betaald ${jaar}</span><strong>${euro(betaald)}</strong></div>
      <div><span>Offertes wachten</span><strong>${wachtend}</strong></div>`
      + (teHerinneren ? `<p class="ov-melding">${teHerinneren === 1 ? '1 factuur is' : teHerinneren + ' facturen zijn'} over de betaaltermijn. Stuur een herinnering met de knoppen hieronder.</p>` : '');
    const zicht = rijen.filter(r => ovFilter === 'alle' || (ovFilter === 'offerte' && !r.isFactuur)
      || (ovFilter === 'open' && r.isFactuur && r.st !== 'betaald') || (ovFilter === 'telaat' && r.teLaat)
      || (ovFilter === 'betaald' && r.st === 'betaald'));
    $('#ov-lijst').innerHTML = zicht.length ? zicht.map(r => {
      const opties = STATUS[r.isFactuur ? 'factuur' : 'offerte'];
      return `<div class="ov-rij${r.teLaat ? ' is-laat' : ''}">
        <button type="button" class="ov-open" data-open="${esc(r.d.nummer)}">
          <strong>${esc(r.d.nummer)}</strong>
          <span>${esc(r.d['k-bedrijf'] || r.d['k-naam'] || 'zonder naam')}</span>
          <small>${r.d['f-datum'] ? 'Feest ' + esc(lang(r.d['f-datum'])) : ''}${r.isFactuur && r.c.verval ? ' · vervalt ' + esc(lang(r.c.verval)) : ''}</small>
        </button>
        <b>${euro(r.c.totaal)}</b>
        <span class="ov-status">${r.teLaat ? '<em>Te laat</em>' : ''}
          <select data-status="${esc(r.d.nummer)}" aria-label="Status ${esc(r.d.nummer)}">${Object.entries(opties).map(([k, v]) => `<option value="${k}"${k === r.st ? ' selected' : ''}>${v}</option>`).join('')}</select>
        </span>
        ${r.herinner ? `<span class="ov-herinner">${r.d.herinnerd ? `<small>Herinnerd op ${esc(lang(r.d.herinnerd))}</small>` : '<small>Herinnering sturen:</small>'}
          <button type="button" data-herinner="${esc(r.d.nummer)}" data-via="wa">WhatsApp</button>
          <button type="button" data-herinner="${esc(r.d.nummer)}" data-via="mail">Mail</button></span>` : ''}
      </div>`;
    }).join('') : '<p class="ov-leeg">Nog geen documenten in deze lijst.</p>';
  }
  $('#open-overzicht').addEventListener('click', () => { tekenOverzicht(); $('#overzicht').showModal(); });
  $('#sluit-overzicht').addEventListener('click', () => $('#overzicht').close());
  $('#overzicht').addEventListener('click', e => { if (e.target.id === 'overzicht') $('#overzicht').close(); });
  $('#ov-filters').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    ovFilter = b.dataset.f; $$('#ov-filters button').forEach(x => x.classList.toggle('is-on', x === b)); tekenOverzicht();
  });
  $('#ov-lijst').addEventListener('change', e => {
    const n = e.target.dataset.status; if (!n) return;
    const docs = alleDocs(); if (!docs[n]) return;
    docs[n].status = e.target.value; opslag.schrijf('beck-documenten', docs);
    if ($('#nummer').value === n) $('#status').value = e.target.value;
    tekenOverzicht();
  });
  $('#ov-lijst').addEventListener('click', e => {
    const h = e.target.closest('[data-herinner]');
    if (h) { const d = alleDocs()[h.dataset.herinner]; if (d) { stuurHerinnering(d, h.dataset.via); tekenOverzicht(); } return; }
    const b = e.target.closest('[data-open]'); if (!b) return;
    const d = alleDocs()[b.dataset.open]; if (!d) return;
    vulForm(d); $('#opgeslagen').value = d.nummer; $('#overzicht').close();
  });

  /* ================= Back-up ================= */
  function toonBackupInfo() {
    const laatste = opslag.lees('beck-laatste-backup', null);
    const n = Object.keys(alleDocs()).length;
    const dagen = laatste ? Math.floor((Date.now() - new Date(laatste)) / 864e5) : null;
    const oud = n && (dagen === null || dagen > 30);
    $('#backup-info').innerHTML = `${n} ${n === 1 ? 'document' : 'documenten'} opgeslagen. Laatste back-up: <strong>${laatste ? lang(isoVan(new Date(laatste))) : 'nog nooit'}</strong>.`
      + (oud ? ' <span class="backup__let">Tijd voor een nieuwe back-up!</span>' : '');
    $('.backup').classList.toggle('is-oud', !!oud);
  }
  $('#backup-download').addEventListener('click', () => {
    const data = { app: 'beck-documenten', versie: 1, gemaakt: new Date().toISOString(), instellingen: ins, documenten: alleDocs() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `beck-on-the-rocks-backup-${vandaag()}.json` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
    opslag.schrijf('beck-laatste-backup', new Date().toISOString());
    toonBackupInfo();
  });
  $('#backup-terug').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (data.app !== 'beck-documenten' || typeof data.documenten !== 'object') throw new Error('Dit is geen back-up van de generator.');
      const nieuw_ = Object.keys(data.documenten), bestaand = alleDocs();
      const dubbel = nieuw_.filter(n => bestaand[n]).length;
      if (!confirm(`Back-up van ${lang(isoVan(new Date(data.gemaakt)))} met ${nieuw_.length} documenten terugzetten?`
        + (dubbel ? `\n${dubbel} daarvan bestaan al en worden vervangen door de versie uit de back-up.` : '')
        + '\nJe gegevens & tarieven worden ook teruggezet.')) return;
      opslag.schrijf('beck-documenten', { ...bestaand, ...data.documenten });
      if (data.instellingen) {
        ins = { ...STANDAARD, ...data.instellingen }; opslag.schrijf('beck-instellingen', ins);
        $$('[data-set]').forEach(el => { el.value = ins[el.dataset.set] ?? ''; });
      }
      tekenLijst(); toonBackupInfo(); teken();
      alert(`Klaar: ${nieuw_.length} documenten teruggezet.`);
    } catch (err) { alert('Terugzetten mislukt: ' + (err.message || err)); }
  });

  /* ================= Slim invullen ================= */
  const LABELS = {
    'k-naam': 'Naam klant', 'k-bedrijf': 'Bedrijf', 'k-email': 'E-mail', 'k-tel': 'Telefoon', 'k-adres': 'Adres klant',
    'k-plaats': 'Postcode & plaats', 'f-datum': 'Datum feest', 'f-van': 'Begintijd', 'f-tot': 'Eindtijd',
    'f-soort': 'Soort feest', 'f-gasten': 'Aantal gasten', 'f-locatie': 'Locatie', 'f-cocktails': 'Cocktails op de kaart', 'f-fruitpers': 'Fruitpers', 'opmerking': 'Opmerking'
  };
  const status = (tekst, fout) => { const el = $('#slim-status'); el.textContent = tekst; el.classList.toggle('is-fout', !!fout); };

  function toonResultaat(velden) {
    const keys = Object.keys(LABELS).filter(k => velden[k]);
    if (!keys.length) { status('Ik kon geen bruikbare gegevens vinden. Probeer de tekst te plakken of vul het zelf in.', true); $('#slim-result').hidden = true; return; }
    status(`${keys.length} ${keys.length === 1 ? 'gegeven' : 'gegevens'} gevonden. Controleer en neem over.`);
    $('#slim-velden').innerHTML = keys.map(k => {
      const { waarde, bron } = velden[k];
      const type = k === 'f-datum' ? 'date' : (k === 'f-van' || k === 'f-tot') ? 'time' : k === 'f-gasten' ? 'number' : 'text';
      const huidig = $('#' + k).value;
      const invoer = k === 'opmerking'
        ? `<textarea data-k="${k}" rows="2">${esc(waarde)}</textarea>`
        : `<input data-k="${k}" type="${type}" value="${esc(waarde)}">`;
      return `<label class="slim__veld"><input type="checkbox" data-v="${k}" checked>
        <span>${LABELS[k]}${huidig && huidig !== waarde && !['f-van', 'f-tot', 'f-soort', 'f-fruitpers', 'f-cocktails'].includes(k) ? ' (vervangt "' + esc(huidig) + '")' : ''}</span>
        ${invoer}${bron && bron !== waarde ? `<small>uit: "${esc(bron)}"</small>` : ''}</label>`;
    }).join('');
    $('#slim-result').hidden = false;
  }

  async function analyseerBron(leesTekst) {
    $('#slim-result').hidden = true;
    try {
      const tekst = await leesTekst();
      if (!tekst || !tekst.trim()) throw new Error('Er stond geen leesbare tekst in.');
      status('Analyseren…');
      toonResultaat(BeckAnalyse.analyseer(tekst, { eigen: [ins.email, ins.naam] }));
    } catch (e) { status(e.message || 'Analyseren is mislukt.', true); }
  }
  const verwerkBestand = file => file && analyseerBron(() => BeckAnalyse.leesBestand(file, status));

  $('#bestand').addEventListener('change', e => { verwerkBestand(e.target.files[0]); e.target.value = ''; });
  const drop = $('#drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', e => { e.preventDefault(); verwerkBestand(e.dataTransfer.files[0]); });
  // Ook ergens in het paneel loslaten of een screenshot plakken (Ctrl/Cmd+V)
  $('.editor').addEventListener('dragover', e => e.preventDefault());
  $('.editor').addEventListener('drop', e => { if (!e.target.closest('#drop')) { e.preventDefault(); verwerkBestand(e.dataTransfer.files[0]); } });
  document.addEventListener('paste', e => {
    const f = [...(e.clipboardData?.files || [])][0];
    if (f) { e.preventDefault(); verwerkBestand(f); }
  });
  $('#plak-go').addEventListener('click', () => analyseerBron(async () => $('#plak').value));

  $('#slim-ok').addEventListener('click', () => {
    $$('#slim-velden [data-v]').forEach(cb => {
      if (!cb.checked) return;
      const k = cb.dataset.v, w = $(`#slim-velden [data-k="${k}"]`).value;
      if (k === 'opmerking' && $('#opmerking').value && !$('#opmerking').value.includes(w)) $('#opmerking').value += '\n' + w;
      else if (k === 'f-fruitpers') $('#f-fruitpers').checked = /^ja/i.test(w);
      else if (k === 'f-soort') { const o = [...$('#f-soort').options].find(o => o.text === w); if (o) $('#f-soort').value = o.value; }
      else $('#' + k).value = w;
    });
    $('#slim-result').hidden = true; $('#plak').value = '';
    status('Overgenomen ✓');
    teken();
  });
  $('#slim-weg').addEventListener('click', () => { $('#slim-result').hidden = true; status(''); });

  /* ================= App / snelkoppeling ================= */
  const losseApp = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $('#app-al').hidden = !losseApp;
  let installPrompt = null;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; $('#installeer').hidden = false; });
  $('#installeer').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null; $('#installeer').hidden = true;
  });
  addEventListener('appinstalled', () => { $('#installeer').hidden = true; $('#app-al').hidden = false; });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  /* ================= Start ================= */
  tekenLijst();
  toonBackupInfo();
  const startParams = new URLSearchParams(location.search);
  const startType = startParams.get('type');
  const herinnerDoc = alleDocs()[startParams.get('herinner')];
  if (startParams.get('controleer')) {
    nieuw('offerte');
    controleerAkkoord(startParams.get('controleer'), startParams.get('s'));
  } else if (herinnerDoc) {
    // Geopend vanuit de agenda-afspraak: meteen de factuur met de herinnerknoppen
    vulForm(herinnerDoc); $('#opgeslagen').value = herinnerDoc.nummer;
    $('#verstuur-tip').textContent = herinnerDoc.status === 'betaald'
      ? `Factuur ${herinnerDoc.nummer} staat al op betaald. Er hoeft geen herinnering meer uit.`
      : `Is factuur ${herinnerDoc.nummer} nog niet betaald? Stuur hieronder de herinnering. Wel betaald? Zet de status op Betaald.`;
    $('#herinner').scrollIntoView({ block: 'center' });
  } else nieuw(['offerte', 'factuur', 'annulering'].includes(startType) ? startType : 'offerte');
})();
