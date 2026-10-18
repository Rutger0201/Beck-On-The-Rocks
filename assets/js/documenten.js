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
  let ins = { ...STANDAARD, ...opslag.lees('beck-instellingen', {}) };
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
    'f-datum', 'f-soort', 'f-van', 'f-tot', 'f-gasten', 'f-locatie', 'f-cocktails', 'f-km', 'f-glazen', 'opmerking'];
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
    return d;
  }
  function vulForm(d) {
    zetType(d.type, false);
    VELDEN.forEach(id => { if (d[id] !== undefined) $('#' + id).value = d[id]; });
    $('#spoed-auto').checked = d.spoedAuto !== false;
    $('#spoed-hand').checked = !!d.spoedHand;
    $('#f-fruitpers').checked = !!d.fruitpers;
    if (!d['f-cocktails']) $('#f-cocktails').value = '3';
    extra = (d.extra || []).map(r => ({ ...r }));
    tekenExtra(); teken();
  }
  function nieuw(t = type) {
    VELDEN.forEach(id => { $('#' + id).value = ''; });
    $('#f-van').value = '20:00'; $('#f-tot').value = '00:00'; $('#f-soort').selectedIndex = 0;
    $('#spoed-auto').checked = true; $('#spoed-hand').checked = false;
    $('#f-fruitpers').checked = false; $('#f-cocktails').value = '3';
    extra = []; tekenExtra();
    zetType(t, true);
    $('#opgeslagen').value = '';
    teken();
  }

  function zetType(t, nieuwNummer) {
    type = t;
    $$('.seg button').forEach(b => b.classList.toggle('is-on', b.dataset.type === t));
    $('#lbl-termijn').firstChild.textContent = t === 'offerte' ? 'Geldig (dagen)' : 'Betaaltermijn (dagen)';
    $('#lbl-ref').hidden = t === 'offerte';
    if (nieuwNummer) {
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
          <li>Je zorgt voor een werkplek: een stevige tafel of bar, bij voorkeur in de buurt van water.</li>
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
    const docs = alleDocs(); docs[d.nummer] = d; opslag.schrijf('beck-documenten', docs);
    tekenLijst(); $('#opgeslagen').value = d.nummer;
  }

  $('#opgeslagen').addEventListener('change', e => {
    const d = alleDocs()[e.target.value];
    if (d) vulForm(d); else nieuw();
  });
  $$('.seg button').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.type === type) return;
    // Van type wisselen: gegevens blijven staan, nummer/datum worden nieuw
    const ref = $('#nummer').value;
    zetType(b.dataset.type, true);
    if (b.dataset.type !== 'offerte' && ref && !$('#referentie').value) $('#referentie').value = ref;
    $('#opgeslagen').value = '';
    teken();
  }));
  $('#naar-factuur').addEventListener('click', () => {
    bewaar();
    const ref = $('#nummer').value;
    zetType('factuur', true);
    $('#referentie').value = ref;
    $('#opgeslagen').value = '';
    teken();
  });
  $('#print').addEventListener('click', () => { bewaar(); teken(); window.print(); });
  $('#nieuw').addEventListener('click', () => nieuw());
  $('#wis').addEventListener('click', () => {
    const n = $('#nummer').value;
    if (!confirm(`Document ${n} verwijderen?`)) return;
    const docs = alleDocs(); delete docs[n]; opslag.schrijf('beck-documenten', docs);
    tekenLijst(); nieuw();
  });
  $('.editor').addEventListener('input', e => { if (!e.target.closest('#extra') && !e.target.dataset.set) teken(); });
  $('.editor').addEventListener('change', e => { if (e.target.type === 'checkbox') teken(); });

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
  const startType = new URLSearchParams(location.search).get('type');
  nieuw(['offerte', 'factuur', 'annulering'].includes(startType) ? startType : 'offerte');
})();
