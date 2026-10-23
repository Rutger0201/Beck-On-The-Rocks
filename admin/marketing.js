// Marketingcentrum op /admin/: kansen, kalender, trends en synchronisatie.
// De gegevens zijn versleuteld met het sleutelpaar uit assets/data/marketing-sleutel.json (zie tools/marketing/sleutels.py).
(() => {
  const REPO = 'Rutger0201/Beck-On-The-Rocks';
  const STATUSPAD = 'assets/data/marketing-status.enc.json';
  const LOKAAL = 'beck-marketing-status', TOKEN = 'beck-marketing-token', WEERGAVE = 'beck-marketing-weergave';
  const INFO = new TextEncoder().encode('beck-marketing-v1');
  const ITERATIES = 310000;
  const FOTO = {
    'beck-portret': ['/assets/img/w/beck-portret-480.webp', '/assets/img/beck-portret.jpg'],
    'galerij-gin-tonic': ['/assets/img/w/galerij-gin-tonic-480.webp', '/assets/img/galerij-gin-tonic.jpg'],
    'galerij-garneren': ['/assets/img/w/galerij-garneren-480.webp', '/assets/img/galerij-garneren.jpg'],
    'galerij-lachen': ['/assets/img/w/galerij-lachen-480.webp', '/assets/img/galerij-lachen.jpg'],
    'logo-mark': ['/assets/img/w/logo-mark-160.png', '/assets/img/logo-mark.png']
  };
  const SOORT = { snel: 'Snelle actie', structureel: 'Structurele groei', betaald: 'Betaalde campagne' };
  const STATUS = { nieuw: 'Voorstel', goedgekeurd: 'Goedgekeurd', ingepland: 'Ingepland', gepubliceerd: 'Gepubliceerd', afgewezen: 'Afgewezen' };
  const CRITERIA = { relevantie: 'Relevantie', impact: 'Verwachte impact', haalbaarheid: 'Uitvoerbaarheid', tijd: 'Benodigde tijd', budget: 'Budget' };

  const $ = id => document.getElementById(id);
  const lees = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const schrijf = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  function el(tag, cls, tekst) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (tekst != null) e.textContent = tekst;
    return e;
  }
  function knop(tekst, actie, ghost, extra) {
    const b = el('button', 'btn btn--small' + (ghost ? ' btn--ghost' : '') + (extra ? ' ' + extra : ''), tekst);
    b.type = 'button'; b.onclick = actie;
    return b;
  }
  const veiligeLink = u => /^https?:\/\//i.test(u || '') ? u : '';

  // ---------- versleuteling ----------
  const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64 = buf => { let s = ''; new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
  const KROMME = { name: 'ECDH', namedCurve: 'P-256' };
  async function wachtwoordsleutel(ww, zout, iteraties) {
    const basis = await crypto.subtle.importKey('raw', new TextEncoder().encode(ww), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: zout, iterations: iteraties },
      basis, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function openGeheim(bestand, ww) {
    const g = bestand.geheim;
    const pkcs8 = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(g.iv) },
      await wachtwoordsleutel(ww, bytes(g.zout), g.iteraties), bytes(g.data));
    return crypto.subtle.importKey('pkcs8', pkcs8, KROMME, false, ['deriveBits']);
  }
  async function aesSleutel(eigen, ander, epk) {
    const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: ander }, eigen, 256);
    const hk = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: epk, info: INFO }, hk,
      { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function ontsleutel(bestand) {
    const epk = bytes(bestand.epk);
    const ander = await crypto.subtle.importKey('raw', epk, KROMME, false, []);
    const sleutel = await aesSleutel(m.geheim, ander, epk);
    const platte = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(bestand.iv) }, sleutel, bytes(bestand.data));
    return JSON.parse(new TextDecoder().decode(platte));
  }
  async function versleutel(gegevens) {
    const tijdelijk = await crypto.subtle.generateKey(KROMME, true, ['deriveBits']);
    const epk = new Uint8Array(await crypto.subtle.exportKey('raw', tijdelijk.publicKey));
    const publiek = await crypto.subtle.importKey('raw', bytes(m.publiek), KROMME, false, []);
    const sleutel = await aesSleutel(tijdelijk.privateKey, publiek, epk);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sleutel, new TextEncoder().encode(JSON.stringify(gegevens)));
    return { versie: 1, epk: b64(epk), iv: b64(iv), data: b64(data) };
  }
  // Het GitHub-token staat versleuteld met je wachtwoord in deze browser.
  async function bewaarToken(token) {
    if (!token) return schrijf(TOKEN, null);
    const zout = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await wachtwoordsleutel(m.ww, zout, ITERATIES), new TextEncoder().encode(token));
    schrijf(TOKEN, JSON.stringify({ zout: b64(zout), iv: b64(iv), data: b64(data) }));
  }
  async function leesToken() {
    try {
      const t = JSON.parse(lees(TOKEN) || 'null');
      if (!t) return '';
      return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(t.iv) },
        await wachtwoordsleutel(m.ww, bytes(t.zout), ITERATIES), bytes(t.data)));
    } catch (e) { return ''; }
  }

  // ---------- toestand ----------
  const m = {
    ww: '', geheim: null, publiek: '', data: null, regels: null, events: [], token: '', sha: null,
    status: { versie: 1, items: {}, eigen: {} }, sync: '', open: new Set(), bewerk: null,
    ai: { open: null, nieuw: false, wacht: {}, perKans: {}, nieuwAntwoord: null, geladen: false },
    weergave: Object.assign({ tab: 'kansen', soort: 'alle', filter: 'open', sorteer: 'score', kal: 'maand' }, JSON.parse(lees(WEERGAVE) || '{}')),
    dag: new Date()
  };
  const bewaarWeergave = () => schrijf(WEERGAVE, JSON.stringify(m.weergave));

  function samenvoegen(a, b) {
    const uit = { versie: 1, items: Object.assign({}, a.items), eigen: Object.assign({}, a.eigen, b.eigen) };
    for (const [id, s] of Object.entries(b.items || {}))
      if (!uit.items[id] || (s.gewijzigd || '') > (uit.items[id].gewijzigd || '')) uit.items[id] = s;
    return uit;
  }
  const api = (pad, opties = {}) => fetch('https://api.github.com/repos/' + REPO + '/' + pad, Object.assign({}, opties, {
    headers: Object.assign({ Authorization: 'Bearer ' + m.token, Accept: 'application/vnd.github+json' }, opties.headers || {})
  }));
  async function haalStatus() {
    if (m.token) {
      const r = await api('contents/' + STATUSPAD + '?ref=main', { cache: 'no-store' });
      if (r.status === 404) { m.sha = null; return { items: {} }; }
      if (!r.ok) throw new Error('GitHub ' + r.status);
      const j = await r.json();
      m.sha = j.sha;
      return ontsleutel(JSON.parse(atob(j.content.replace(/\s/g, ''))));
    }
    const r = await fetch('/' + STATUSPAD + '?' + Date.now(), { cache: 'no-store' });
    return r.ok ? ontsleutel(await r.json()) : { items: {} };
  }
  async function laadStatus() {
    let lokaal = { items: {} };
    try { lokaal = JSON.parse(lees(LOKAAL) || '{"items":{}}'); } catch (e) {}
    m.status = samenvoegen({ items: {} }, lokaal);
    try {
      m.status = samenvoegen(m.status, await haalStatus());
      m.sync = m.token ? 'Gesynchroniseerd met GitHub' : 'Alleen op dit apparaat (stel synchroniseren in bij Instellingen)';
    } catch (e) { m.sync = 'Synchroniseren mislukt: ' + e.message + '. Je wijzigingen staan wel op dit apparaat.'; }
  }
  let wachtrij = null;
  function bewaarStatus() {
    schrijf(LOKAAL, JSON.stringify(m.status));
    if (!m.token) return;
    m.sync = 'Opslaan…'; toonSync();
    clearTimeout(wachtrij);
    wachtrij = setTimeout(stuurStatus, 1200);
  }
  async function stuurStatus(opnieuw) {
    try {
      const body = { message: 'Marketing: status bijgewerkt', branch: 'main',
        content: btoa(JSON.stringify(await versleutel(m.status)) + '\n') };
      if (m.sha) body.sha = m.sha;
      const r = await api('contents/' + STATUSPAD, { method: 'PUT', body: JSON.stringify(body) });
      if ((r.status === 409 || r.status === 422) && !opnieuw) {
        m.status = samenvoegen(m.status, await haalStatus());
        return stuurStatus(true);
      }
      if (!r.ok) throw new Error('GitHub ' + r.status);
      m.sha = (await r.json()).content.sha;
      m.sync = 'Opgeslagen op GitHub ' + new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
    } catch (e) { m.sync = 'Opslaan op GitHub mislukt (' + e.message + '). Je wijzigingen staan wel op dit apparaat.'; }
    toonSync();
  }
  function zet(id, wijziging) {
    const nu = Object.assign({}, m.status.items[id] || { status: 'nieuw' }, wijziging, { gewijzigd: new Date().toISOString() });
    m.status.items[id] = nu;
    bewaarStatus();
    toon();
  }

  // ---------- kansen ----------
  function kans(k) {
    const s = m.status.items[k.id] || {};
    const uit = Object.assign({}, k);
    for (const v of ['tekst', 'hashtags', 'cta', 'datum', 'tijd']) if (s[v] != null) uit[v] = s[v];
    uit.status = s.status || 'nieuw';
    uit.bewerkt = ['tekst', 'hashtags', 'cta'].some(v => s[v] != null);
    uit.controle = s.tekst != null || s.hashtags != null || s.cta != null ? controleer(uit) : (k.controle || []);
    return uit;
  }
  const KANAALCODE = { instagram: 'ig', facebook: 'fb', linkedin: 'li', tiktok: 'tt', google: 'gg', website: 'web', mail: 'mail', whatsapp: 'wa' };
  const linkVoor = k => 'https://beckontherocks.nl' + (k.pagina || '/') + '?ref=' + k.ref;
  // Zelf toegevoegde kansen ("Nieuw idee") staan in de status tot de nachtelijke run ze in de planning zet.
  function alleKansen() {
    const ids = new Set((m.data.kansen || []).map(k => k.id));
    const eigen = Object.entries(m.status.eigen || {}).filter(([id]) => !ids.has(id))
      .map(([id, k]) => Object.assign({ bronnen: [], herkomst: 'eigen', bonus: 0 }, k, { id }));
    return (m.data.kansen || []).concat(eigen).map(kans);
  }

  function controleer(k) {
    const r = m.regels;
    if (!r) return k.controle || [];
    const tekst = [k.titel, k.tekst, k.cta, (k.hashtags || []).map(h => '#' + h).join(' ')].join(' ');
    const uit = [];
    for (const niveau of ['rood', 'oranje'])
      for (const regel of r[niveau]) {
        const hit = tekst.match(new RegExp(regel.patroon, 'i'));
        if (hit) uit.push({ niveau, tekst: `"${hit[0]}": ${regel.uitleg}` });
      }
    if (r.slogan_kanalen.includes((k.kanaal || '').toLowerCase()) && !r.slogan_niet_bij.includes(k.formaat)
        && new RegExp(r.alcohol, 'i').test(tekst) && !new RegExp(r.geen_alcohol, 'i').test(tekst)
        && !tekst.toLowerCase().includes(r.slogan.toLowerCase()))
      uit.push({ niveau: 'oranje', tekst: `Er komt alcohol in voor: zet "${r.slogan}" onder de tekst.` });
    if (k.soort === 'betaald' && !/18|25/.test(k.doelgroep || ''))
      uit.push({ niveau: 'oranje', tekst: 'Betaalde campagne: stel de leeftijd in op 18+ (liefst 25+).' });
    return uit;
  }

  const datumTekst = (s, lang) => {
    const d = new Date(s + 'T12:00');
    return isNaN(d) ? s : d.toLocaleDateString('nl-NL', lang ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const kopieertekst = k => [k.tekst, k.cta, (k.hashtags || []).map(h => '#' + h).join(' ')].filter(Boolean).join('\n\n');
  async function kopieer(tekst, b) {
    try { await navigator.clipboard.writeText(tekst); }
    catch (e) {
      const t = el('textarea'); t.value = tekst; document.body.append(t); t.select(); document.execCommand('copy'); t.remove();
    }
    const oud = b.textContent; b.textContent = 'Gekopieerd'; setTimeout(() => { b.textContent = oud; }, 1500);
  }

  // ---------- agenda (.ics) ----------
  function ics(lijst) {
    const esc = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const vouw = r => r.match(/.{1,70}/g).join('\r\n ');
    const nu = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const regels = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Beck on the Rocks//Marketing//NL', 'CALSCALE:GREGORIAN'];
    for (const k of lijst) {
      const start = k.datum.replace(/-/g, '') + 'T' + (k.tijd || '19:30').replace(':', '') + '00';
      regels.push('BEGIN:VEVENT', 'UID:' + k.id + '@beckontherocks.nl', 'DTSTAMP:' + nu, 'DTSTART:' + start, 'DURATION:PT30M',
        vouw('SUMMARY:' + esc(`${k.kanaal}: ${k.titel}`)), vouw('DESCRIPTION:' + esc(kopieertekst(k))),
        'BEGIN:VALARM', 'TRIGGER:-PT0M', 'ACTION:DISPLAY', vouw('DESCRIPTION:' + esc('Tijd om te posten: ' + k.titel)), 'END:VALARM', 'END:VEVENT');
    }
    regels.push('END:VCALENDAR');
    const a = el('a');
    a.href = URL.createObjectURL(new Blob([regels.join('\r\n') + '\r\n'], { type: 'text/calendar' }));
    a.download = lijst.length === 1 ? 'post-' + lijst[0].datum + '.ics' : 'marketingplanning.ics';
    document.body.append(a); a.click(); a.remove();
  }

  // ---------- weergave ----------
  function toonSync() { const s = $('m-sync'); if (s) s.textContent = m.sync; }

  function toon() {
    const doos = $('marketing'); doos.textContent = '';
    if (!m.data) {
      doos.append(el('p', 'm-leeg', 'Er is nog geen marketingplanning. Die verschijnt na de eerste run van "Marketing bijwerken" op GitHub.'));
      return;
    }
    const lijst = alleKansen();
    const kop = el('div', 'm-kop');
    const telling = s => lijst.filter(k => k.soort === s && k.status !== 'afgewezen').length;
    kop.append(el('span', '', `${lijst.filter(k => k.status !== 'afgewezen').length} kansen · ${telling('snel')} snel · ${telling('structureel')} structureel · ${telling('betaald')} betaald`));
    kop.append(el('span', '', 'Bijgewerkt ' + new Date(m.data.bijgewerkt).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })
      + (m.data.onderzoek && m.data.onderzoek.gemaakt ? ' · onderzoek van ' + datumTekst(m.data.onderzoek.gemaakt) : ' · nog geen onderzoek van Claude')));
    doos.append(kop);

    const tabs = el('div', 'm-tabs'); tabs.setAttribute('role', 'tablist');
    for (const [t, naam] of [['kansen', 'Kansen'], ['kalender', 'Kalender'], ['resultaten', 'Resultaten'], ['trends', 'Onderzoek'], ['instellingen', 'Instellingen']]) {
      const b = knop(naam, () => { m.weergave.tab = t; bewaarWeergave(); toon(); }, m.weergave.tab !== t);
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', m.weergave.tab === t);
      tabs.append(b);
    }
    doos.append(tabs);
    ({ kansen: toonKansen, kalender: toonKalender, resultaten: toonResultaten, trends: toonTrends, instellingen: toonInstellingen })[m.weergave.tab](doos, lijst);
    const s = el('p', 'm-sync'); s.id = 'm-sync'; s.textContent = m.sync; doos.append(s);
  }

  function chips(opties, huidig, zetten) {
    const rij = el('div', 'm-chips');
    for (const [waarde, naam] of opties) {
      const b = el('button', 'm-chip' + (huidig === waarde ? ' is-aan' : ''), naam);
      b.type = 'button'; b.setAttribute('aria-pressed', huidig === waarde);
      b.onclick = () => { zetten(waarde); bewaarWeergave(); toon(); };
      rij.append(b);
    }
    return rij;
  }

  function toonKansen(doos, lijst) {
    const w = m.weergave;
    const balk = el('div', 'm-filters');
    balk.append(chips([['alle', 'Alle soorten'], ['snel', 'Snel'], ['structureel', 'Structureel'], ['betaald', 'Betaald']], w.soort, v => { w.soort = v; }));
    balk.append(chips([['open', 'Voorstellen'], ['goedgekeurd', 'Goedgekeurd'], ['ingepland', 'Ingepland'], ['gepubliceerd', 'Gepubliceerd'], ['afgewezen', 'Afgewezen'], ['alles', 'Alles']], w.filter, v => { w.filter = v; }));
    balk.append(chips([['score', 'Beste eerst'], ['datum', 'Op datum']], w.sorteer, v => { w.sorteer = v; }));
    doos.append(balk);
    if (m.ai.nieuw) doos.append(nieuwPaneel());
    else doos.append(knop('Nieuw idee met AI', () => { m.ai.nieuw = true; toon(); }, true, 'm-nieuwknop'));
    const pastStatus = k => w.filter === 'alles' || (w.filter === 'open' ? k.status === 'nieuw' : k.status === w.filter);
    const zicht = lijst.filter(k => (w.soort === 'alle' || k.soort === w.soort) && pastStatus(k))
      .sort(w.sorteer === 'datum' ? (a, b) => (a.datum + a.tijd).localeCompare(b.datum + b.tijd) : (a, b) => b.score - a.score);
    if (!zicht.length) { doos.append(el('p', 'm-leeg', 'Niets om te tonen met deze filters.')); return; }
    for (const k of zicht) doos.append(kaart(k));
  }

  function kaart(k) {
    const a = el('article', 'm-kans m-kans--' + k.soort + ' is-' + k.status); a.id = 'kans-' + k.id;
    const p = el('div', 'punten', String(k.score)); p.title = 'Prioriteitsscore van 1 tot 100';
    const h = el('h2', '', k.titel);
    const labels = el('div', 'm-labels');
    labels.append(el('span', 'm-label m-label--' + k.soort, SOORT[k.soort] || k.soort));
    if (k.status !== 'nieuw') labels.append(el('span', 'm-label m-label--status', STATUS[k.status]));
    if (k.bewerkt) labels.append(el('span', 'm-label m-label--stil', 'Aangepast'));
    if (k.herkomst === 'onderzoek') labels.append(el('span', 'm-label m-label--stil', 'Uit onderzoek'));
    if (k.herkomst === 'eigen') labels.append(el('span', 'm-label m-label--stil', 'Eigen idee'));
    const meta = el('div', 'event__meta', [k.kanaal, k.formaat, datumTekst(k.datum) + ' ' + (k.tijd || '')].filter(Boolean).join(' · '));
    const doel = el('p', 'm-doel'); doel.append(el('strong', '', 'Doelgroep: '), document.createTextNode(k.doelgroep || '-'));
    const waarom = el('p', 'event__waarom', k.waarom);
    const romp = el('div', 'm-romp');
    romp.append(h, labels, meta, doel, waarom);
    const rood = k.controle.filter(c => c.niveau === 'rood');
    if (k.controle.length) {
      const c = el('ul', 'm-controle');
      for (const melding of k.controle) c.append(el('li', 'm-controle--' + melding.niveau, melding.tekst));
      romp.append(c);
    }
    if (m.bewerk === k.id) romp.append(bewerkForm(k));
    else romp.append(details(k));
    if (m.ai.open === k.id) romp.append(aiPaneel(k));
    romp.append(knoppen(k, rood.length > 0));
    a.append(p, romp);
    return a;
  }

  function details(k) {
    const d = el('details', 'm-details');
    if (m.open.has(k.id)) d.open = true;
    d.ontoggle = () => { d.open ? m.open.add(k.id) : m.open.delete(k.id); };
    d.append(el('summary', '', 'Tekst, beeld en onderbouwing'));
    const tekst = el('div', 'm-tekst', k.tekst);
    d.append(tekst);
    if (k.cta) { const c = el('p', 'm-cta'); c.append(el('strong', '', 'Call-to-action: '), document.createTextNode(k.cta)); d.append(c); }
    if (k.hashtags && k.hashtags.length) d.append(el('p', 'm-tags', k.hashtags.map(h => '#' + h).join(' ')));
    const raster = el('div', 'm-raster');
    const blok = (titel, ...inhoud) => { const b = el('div', 'm-blok'); b.append(el('h3', '', titel), ...inhoud); raster.append(b); return b; };
    const beeld = blok('Beeld');
    const foto = FOTO[k.beeld && k.beeld.foto];
    if (foto) {
      const img = el('img'); img.src = foto[0]; img.alt = ''; img.loading = 'lazy'; img.className = 'm-foto';
      const dl = el('a', 'm-link', 'Foto downloaden'); dl.href = foto[1]; dl.download = '';
      beeld.append(img, dl);
    }
    beeld.append(el('p', '', (k.beeld && k.beeld.idee) || 'Geen suggestie.'));
    blok('Kosten en tijd', el('p', '', `€ ${Math.round(k.kosten.euro)} · ${String(k.kosten.uren).replace('.', ',')} uur`), el('p', 'm-stil', k.kosten.toelichting || ''));
    blok('Mogelijke impact', el('p', '', k.impact.niveau.charAt(0).toUpperCase() + k.impact.niveau.slice(1)), el('p', 'm-stil', k.impact.toelichting || ''));
    const opbouw = blok('Score-opbouw');
    for (const [c, naam] of Object.entries(CRITERIA)) {
      const r = el('div', 'm-balk'); r.append(el('span', '', naam));
      const v = el('span', 'm-balk__vol'); v.style.setProperty('--w', (k.criteria[c] / 5 * 100) + '%'); v.title = k.criteria[c] + ' van 5';
      r.append(v); opbouw.append(r);
    }
    if (k.bonus) opbouw.append(el('p', 'm-stil', `${k.bonus > 0 ? '+' : ''}${k.bonus} punten: ${k.kanaal} levert je ${k.bonus > 0 ? 'meer' : 'minder'} bezoekers per post op dan gemiddeld.`));
    if (k.moment) blok('Moment', el('p', '', `${k.moment.naam}, ${datumTekst(k.moment.datum, true)}`));
    if (k.bronnen && k.bronnen.length) {
      const b = blok('Bronnen'); const ul = el('ul', 'm-bronnen');
      for (const bron of k.bronnen) {
        const li = el('li'); const l = el('a', '', bron.titel || bron.url); l.href = veiligeLink(bron.url); l.target = '_blank'; l.rel = 'noopener noreferrer';
        li.append(l, document.createTextNode(bron.datum ? ' · ' + datumTekst(bron.datum) : '')); ul.append(li);
      }
      b.append(ul);
    } else blok('Bron', el('p', 'm-stil', { kalender: 'Vaste seizoenskalender', idee: 'Vaste ideeënlijst', eigen: 'Je eigen idee (AI)' }[k.herkomst] || 'Onderzoek'));
    d.append(raster);
    if (k.link) { const l = el('p', 'm-stil'); l.append(document.createTextNode('Link met meetcode: ' + k.link)); d.append(l); }
    return d;
  }

  function bewerkForm(k) {
    const f = el('form', 'm-bewerk');
    const veld = (label, input) => { const l = el('label', '', label); l.append(input); f.append(l); return input; };
    const tekst = veld('Tekst', el('textarea')); tekst.value = k.tekst; tekst.rows = Math.min(16, k.tekst.split('\n').length + 3);
    const cta = veld('Call-to-action', el('input')); cta.value = k.cta || '';
    const tags = veld('Hashtags (met spaties)', el('input')); tags.value = (k.hashtags || []).map(h => '#' + h).join(' ');
    const rij = el('div', 'm-rij');
    const datum = el('input'); datum.type = 'date'; datum.value = k.datum; datum.required = true;
    const tijd = el('input'); tijd.type = 'time'; tijd.value = k.tijd || '19:30';
    const ld = el('label', '', 'Datum'); ld.append(datum); const lt = el('label', '', 'Tijd'); lt.append(tijd);
    rij.append(ld, lt); f.append(rij);
    const kn = el('div', 'event__knoppen');
    const opslaan = el('button', 'btn btn--small', 'Opslaan'); opslaan.type = 'submit';
    kn.append(opslaan, knop('Annuleren', () => { m.bewerk = null; toon(); }, true));
    if (k.bewerkt) kn.append(knop('Origineel terugzetten', () => {
      const s = Object.assign({}, m.status.items[k.id]); delete s.tekst; delete s.cta; delete s.hashtags;
      m.status.items[k.id] = s; m.bewerk = null; zet(k.id, {});
    }, true));
    f.append(kn);
    f.onsubmit = ev => {
      ev.preventDefault();
      m.bewerk = null; m.open.add(k.id);
      zet(k.id, { tekst: tekst.value.trim(), cta: cta.value.trim(), datum: datum.value, tijd: tijd.value,
        hashtags: tags.value.split(/[\s,]+/).map(h => h.replace(/^#/, '').toLowerCase()).filter(Boolean) });
    };
    return f;
  }

  function knoppen(k, rood) {
    const rij = el('div', 'event__knoppen');
    const kop = knop('Kopieer tekst', ev => kopieer(kopieertekst(k), ev.currentTarget), true);
    const bewerk = knop('Bewerken', () => { m.bewerk = k.id; toon(); }, true);
    const aiKnop = k.status !== 'afgewezen' && k.status !== 'gepubliceerd' && m.ai.open !== k.id
      ? knop('Verbeter met AI', () => { m.ai.open = k.id; toon(); }, true) : null;
    if (k.status === 'nieuw') {
      const ja = knop('Goedkeuren', () => zet(k.id, { status: 'goedgekeurd' }));
      if (rood) { ja.disabled = true; ja.title = 'Pas eerst de rode punten aan'; }
      rij.append(ja, bewerk, kop, knop('Afwijzen', () => zet(k.id, { status: 'afgewezen' }), true));
    } else if (k.status === 'goedgekeurd') {
      rij.append(knop('Inplannen op ' + datumTekst(k.datum) + ' ' + (k.tijd || ''), () => zet(k.id, { status: 'ingepland', datum: k.datum, tijd: k.tijd })),
        bewerk, kop, knop('Terug naar voorstel', () => zet(k.id, { status: 'nieuw' }), true));
    } else if (k.status === 'ingepland') {
      rij.append(knop('Gepubliceerd', () => zet(k.id, { status: 'gepubliceerd' })), knop('In mijn agenda', () => ics([k]), true),
        kop, bewerk, knop('Niet meer inplannen', () => zet(k.id, { status: 'goedgekeurd' }), true));
    } else if (k.status === 'gepubliceerd') {
      rij.append(kop, knop('Toch niet gepubliceerd', () => zet(k.id, { status: 'ingepland' }), true));
    } else {
      rij.append(knop('Toch bewaren', () => zet(k.id, { status: 'nieuw' }), true));
    }
    if (aiKnop) rij.append(aiKnop);
    if (rood && k.status !== 'nieuw' && k.status !== 'afgewezen') rij.prepend(el('span', 'm-waarschuwing', 'Let op de rode punten vóór je publiceert.'));
    return rij;
  }

  // ---------- AI (GitHub Models via de Action "Marketing AI") ----------
  const OPDRACHT = [['korter', 'Korter'], ['zakelijker', 'Zakelijker'], ['speelser', 'Speelser'], ['persoonlijker', 'Persoonlijker'],
    ['instagram', 'Voor Instagram'], ['facebook', 'Voor Facebook'], ['linkedin', 'Voor LinkedIn'], ['tiktok', 'TikTok-script'],
    ['google', 'Google-profiel'], ['engels', 'Engels']];
  const willekeurig = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');

  async function stuurAi(verzoek, waarvoor) {
    if (!m.token) throw new Error('Hiervoor is een GitHub-token nodig (tabblad Instellingen).');
    const r = await api('actions/workflows/marketing-ai.yml/dispatches', { method: 'POST',
      body: JSON.stringify({ ref: 'main', inputs: { verzoek: JSON.stringify(await versleutel(verzoek)) } }) });
    if (r.status !== 204) throw new Error(r.status === 403 || r.status === 404 ? 'Het token mist Actions-rechten (zie Instellingen).' : 'GitHub ' + r.status);
    m.ai.wacht[verzoek.id] = { waarvoor, start: Date.now() };
    peilAi();
  }
  async function haalAiAntwoorden() {
    const r = await api('contents/assets/data/marketing-ai.enc.json?ref=main', { cache: 'no-store' });
    if (!r.ok) return [];
    const j = await r.json();
    return (await ontsleutel(JSON.parse(atob(j.content.replace(/\s/g, ''))))).antwoorden || [];
  }
  function bewaarAntwoord(a) {
    if (a.soort === 'nieuw') m.ai.nieuwAntwoord = a;
    else if (a.kans_id) m.ai.perKans[a.kans_id] = a;
  }
  let peilen = null;
  function peilAi() {
    clearTimeout(peilen);
    if (!Object.keys(m.ai.wacht).length) return;
    peilen = setTimeout(async () => {
      try {
        const antwoorden = await haalAiAntwoorden();
        for (const a of antwoorden) if (m.ai.wacht[a.id]) { delete m.ai.wacht[a.id]; bewaarAntwoord(a); }
      } catch (e) {}
      for (const [id, w] of Object.entries(m.ai.wacht))
        if (Date.now() - w.start > 6 * 60000) {
          delete m.ai.wacht[id];
          bewaarAntwoord({ id, soort: w.waarvoor === 'nieuw' ? 'nieuw' : 'verbeter', kans_id: w.waarvoor, fout: 'Geen antwoord binnen 6 minuten. Kijk bij Actions → Marketing AI op GitHub.' });
        }
      toon();
      peilAi();
    }, 10000);
  }
  async function laadEerdereAntwoorden() {
    if (m.ai.geladen || !m.token) return;
    m.ai.geladen = true;
    try { (await haalAiAntwoorden()).slice().reverse().forEach(bewaarAntwoord); toon(); } catch (e) {}
  }
  const bezig = waarvoor => Object.values(m.ai.wacht).some(w => w.waarvoor === waarvoor);

  function aiPaneel(k) {
    laadEerdereAntwoorden();
    const p = el('div', 'm-ai');
    p.append(el('h3', '', 'Verbeter met AI'));
    if (!m.token) {
      p.append(el('p', 'm-stil', 'Hiervoor is een GitHub-token met Actions-rechten nodig. Stel het in bij Instellingen; het is gratis.'));
      p.append(knop('Sluiten', () => { m.ai.open = null; toon(); }, true));
      return p;
    }
    let keuze = 'korter';
    const rij = el('div', 'm-chips');
    for (const [waarde, naam] of OPDRACHT) {
      const b = el('button', 'm-chip' + (waarde === keuze ? ' is-aan' : ''), naam); b.type = 'button';
      b.onclick = () => { keuze = waarde; rij.querySelectorAll('.m-chip').forEach(c => c.classList.toggle('is-aan', c === b)); };
      rij.append(b);
    }
    const vrij = el('input', 'm-invoer'); vrij.placeholder = 'Extra wens (optioneel), bijv. "noem de kerstmarkt in Almere"';
    const kn = el('div', 'event__knoppen');
    const ga = knop(bezig(k.id) ? 'Bezig…' : 'Genereer twee versies', async () => {
      ga.disabled = true; ga.textContent = 'Versturen…';
      try {
        await stuurAi({ id: willekeurig(), soort: 'verbeter', opdracht: keuze, vrij: vrij.value.trim(),
          kans: { id: k.id, titel: k.titel, kanaal: k.kanaal, formaat: k.formaat, doelgroep: k.doelgroep, tekst: k.tekst, cta: k.cta, hashtags: k.hashtags } }, k.id);
        delete m.ai.perKans[k.id];
      } catch (e) { m.ai.perKans[k.id] = { fout: e.message }; }
      toon();
    });
    ga.disabled = bezig(k.id);
    kn.append(ga, knop('Sluiten', () => { m.ai.open = null; toon(); }, true));
    p.append(rij, vrij, kn);
    if (bezig(k.id)) p.append(el('p', 'm-stil', 'De AI is bezig. Dit duurt meestal één tot twee minuten; je kunt intussen verder werken.'));
    const a = m.ai.perKans[k.id];
    if (a && a.fout) p.append(el('p', 'm-controle--rood m-melding', a.fout));
    if (a && a.varianten) {
      if (!a.varianten.length) p.append(el('p', 'm-stil', 'De AI gaf geen bruikbare versie. Probeer een andere opdracht.'));
      a.varianten.forEach((v, i) => {
        const vak = el('div', 'm-variant');
        vak.append(el('h4', '', `Versie ${i + 1}` + (v.toelichting ? ': ' + v.toelichting : '')), el('div', 'm-tekst', v.tekst));
        if (v.cta) vak.append(el('p', 'm-cta', 'Call-to-action: ' + v.cta));
        if (v.hashtags && v.hashtags.length) vak.append(el('p', 'm-tags', v.hashtags.map(h => '#' + h).join(' ')));
        if (v.controle && v.controle.length) {
          const c = el('ul', 'm-controle'); v.controle.forEach(x => c.append(el('li', 'm-controle--' + x.niveau, x.tekst))); vak.append(c);
        }
        const link = k.link || linkVoor(k);
        vak.append(knop('Gebruik deze versie', () => {
          m.ai.open = null; m.open.add(k.id);
          zet(k.id, { tekst: v.tekst.split('{link}').join(link), cta: (v.cta || '').split('{link}').join(link), hashtags: v.hashtags || [] });
        }));
        p.append(vak);
      });
    }
    return p;
  }

  function nieuwPaneel() {
    laadEerdereAntwoorden();
    const p = el('div', 'm-ai m-ai--nieuw');
    p.append(el('h3', '', 'Nieuw idee met AI'));
    if (!m.token) {
      p.append(el('p', 'm-stil', 'Hiervoor is een GitHub-token met Actions-rechten nodig. Stel het in bij Instellingen; het is gratis.'));
      p.append(knop('Sluiten', () => { m.ai.nieuw = false; toon(); }, true));
      return p;
    }
    const wens = el('textarea', 'm-invoer'); wens.rows = 3;
    wens.placeholder = 'Waar wil je een post of actie over? Bijv. "een reel over mijn nieuwe kerstcocktail" of "samenwerking met een trouwlocatie in Zeewolde"';
    const kanaal = el('select', 'm-invoer');
    for (const n of ['', 'Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'Google', 'Website', 'Mail']) {
      const o = el('option', '', n || 'Kanaal: laat de AI kiezen'); o.value = n; kanaal.append(o);
    }
    const kn = el('div', 'event__knoppen');
    const ga = knop(bezig('nieuw') ? 'Bezig…' : 'Bedenk het', async () => {
      if (!wens.value.trim()) { wens.focus(); return; }
      ga.disabled = true; ga.textContent = 'Versturen…';
      try { await stuurAi({ id: willekeurig(), soort: 'nieuw', vrij: wens.value.trim(), kanaal: kanaal.value }, 'nieuw'); m.ai.nieuwAntwoord = null; }
      catch (e) { m.ai.nieuwAntwoord = { fout: e.message }; }
      toon();
    });
    ga.disabled = bezig('nieuw');
    kn.append(ga, knop('Sluiten', () => { m.ai.nieuw = false; toon(); }, true));
    p.append(wens, kanaal, kn);
    if (bezig('nieuw')) p.append(el('p', 'm-stil', 'De AI is bezig. Dit duurt meestal één tot twee minuten.'));
    const a = m.ai.nieuwAntwoord;
    if (a && a.fout) p.append(el('p', 'm-controle--rood m-melding', a.fout));
    if (a && a.kans) {
      const k = Object.assign({}, a.kans);
      const vak = el('div', 'm-variant');
      vak.append(el('h4', '', `${k.titel} · ${k.kanaal} · score ${k.score}`), el('p', 'm-stil', k.waarom || ''), el('div', 'm-tekst', k.tekst));
      if (k.cta) vak.append(el('p', 'm-cta', 'Call-to-action: ' + k.cta));
      if (k.controle && k.controle.length) {
        const c = el('ul', 'm-controle'); k.controle.forEach(x => c.append(el('li', 'm-controle--' + x.niveau, x.tekst))); vak.append(c);
      }
      const datum = el('input', 'm-invoer'); datum.type = 'date';
      const morgen = new Date(); morgen.setDate(morgen.getDate() + 1); datum.value = iso(morgen);
      const l = el('label', 'm-datumlabel', 'Datum '); l.append(datum);
      vak.append(l, knop('Toevoegen aan planning', () => {
        const id = 'e' + (a.id || willekeurig()).slice(0, 9);
        k.ref = `${KANAALCODE[(k.kanaal || '').toLowerCase()] || 'x'}-eigen-${id.slice(0, 6)}`;
        k.link = k.pagina ? linkVoor(k) : '';
        for (const v of ['tekst', 'cta']) k[v] = (k[v] || '').split('{link}').join(linkVoor(k));
        k.datum = datum.value;
        m.status.eigen = Object.assign({}, m.status.eigen, { [id]: k });
        m.ai.nieuw = false; m.ai.nieuwAntwoord = null; m.open.add(id);
        zet(id, { status: 'nieuw' });
        naarKans(id);
      }));
      p.append(vak);
    }
    return p;
  }

  // ---------- resultaten ----------
  function tegel(waarde, naam, uitleg) {
    const t = el('div', 'm-tegel');
    t.append(el('div', 'm-tegel__waarde', waarde), el('div', 'm-tegel__naam', naam));
    if (uitleg) t.append(el('div', 'm-stil', uitleg));
    return t;
  }
  function tabel(koppen, rijen) {
    const t = el('table', 'm-tabel'); const kop = el('tr');
    koppen.forEach((k, i) => { const th = el('th', i ? 'm-getal' : '', k); kop.append(th); });
    const thead = el('thead'); thead.append(kop); t.append(thead);
    const tb = el('tbody');
    for (const r of rijen) { const tr = el('tr'); r.forEach((c, i) => tr.append(el('td', i ? 'm-getal' : '', String(c)))); tb.append(tr); }
    t.append(tb);
    const w = el('div', 'm-tabelwrap'); w.append(t);
    return w;
  }
  function dagGrafiek(perDag) {
    const ns = 'http://www.w3.org/2000/svg', W = 640, H = 160, onder = 22, boven = 8;
    const max = Math.max(1, ...perDag.map(d => d.n));
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'm-grafiek'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Bezoekers per dag, hoogste ${max}`);
    const maak = (tag, attrs) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
    for (const f of [0, .5, 1]) {
      const y = boven + (H - onder - boven) * (1 - f);
      svg.append(maak('line', { x1: 0, x2: W, y1: y, y2: y, class: 'm-grafiek__lijn' }));
      const t = maak('text', { x: W, y: y - 3, 'text-anchor': 'end', class: 'm-grafiek__as' }); t.textContent = Math.round(max * f); svg.append(t);
    }
    const stap = W / perDag.length, breed = Math.max(2, stap - 2);
    const tip = el('div', 'm-tip'); tip.hidden = true;
    perDag.forEach((d, i) => {
      const h = (H - onder - boven) * d.n / max, x = i * stap + 1, y = H - onder - h;
      const r = Math.min(4, breed / 2, h);
      const pad = h ? `M${x},${H - onder} V${y + r} Q${x},${y} ${x + r},${y} H${x + breed - r} Q${x + breed},${y} ${x + breed},${y + r} V${H - onder} Z` : '';
      if (pad) svg.append(maak('path', { d: pad, class: 'm-grafiek__staaf' }));
      const vak = maak('rect', { x: i * stap, y: 0, width: stap, height: H - onder, fill: 'transparent' });
      vak.addEventListener('mouseenter', () => { tip.hidden = false; tip.textContent = `${datumTekst(d.dag)}: ${d.n} bezoekers`; tip.style.left = (i * stap / W * 100) + '%'; });
      vak.addEventListener('mouseleave', () => { tip.hidden = true; });
      svg.append(vak);
      if (i === 0 || i === perDag.length - 1 || i % 7 === 0) {
        const t = maak('text', { x: x + breed / 2, y: H - 6, 'text-anchor': 'middle', class: 'm-grafiek__as' }); t.textContent = datumTekst(d.dag).replace(/^\w+\.? /, ''); svg.append(t);
      }
    });
    const w = el('div', 'm-grafiekwrap'); w.append(svg, tip);
    return w;
  }
  function toonResultaten(doos) {
    const r = m.data.resultaten || {};
    const gc = r.goatcounter;
    const sectie = titel => { const h = el('h2', 'm-kopje', titel); doos.append(h); };
    if (r.advies && (r.advies.samenvatting || (r.advies.aanbevelingen || []).length)) {
      const a = el('section', 'm-advies');
      a.append(el('h2', 'm-kopje', 'Advies voor de komende weken'));
      if (r.advies.samenvatting) a.append(el('p', '', r.advies.samenvatting));
      const ol = el('ol');
      for (const t of r.advies.aanbevelingen || []) { const li = el('li'); li.append(el('strong', '', t.titel), document.createTextNode(' ' + t.uitleg)); ol.append(li); }
      a.append(ol, el('p', 'm-stil', (r.advies.bron === 'ai' ? 'Gemaakt door AI op basis van je cijfers, ' : 'Vaste regels (AI was niet beschikbaar), ') + datumTekst(r.advies.datum, true) + '. Wordt wekelijks vernieuwd.'));
      doos.append(a);
    }
    if (gc) {
      sectie('Afgelopen 30 dagen');
      const viaPosts = (r.posts || []).reduce((s, p) => s + p.bezoeken, 0);
      const tegels = el('div', 'm-tegels');
      tegels.append(tegel(String(gc.bezoekers ?? '-'), 'Bezoekers'), tegel(String(gc.aanvragen ?? '-'), 'Aanvragen'),
        tegel(gc.bezoekers ? (100 * (gc.aanvragen || 0) / gc.bezoekers).toFixed(1).replace('.', ',') + '%' : '-', 'Conversie', 'aanvragen per bezoeker'),
        tegel(String(viaPosts), 'Via je posts', 'bezoeken met een ?ref-link'));
      doos.append(tegels);
      if ((gc.per_dag || []).length) doos.append(dagGrafiek(gc.per_dag));
      if ((gc.fouten || []).length) doos.append(el('p', 'm-stil', 'Niet alles kon worden opgehaald: ' + gc.fouten.join('; ')));
      if ((gc.bronnen || []).length) { sectie('Waar bezoekers vandaan komen'); doos.append(tabel(['Bron', 'Bezoeken'], gc.bronnen.slice(0, 12).map(b => [b.naam, b.n]))); }
      if ((gc.paginas || []).length) { sectie('Meest bekeken'); doos.append(tabel(['Pagina', 'Bezoeken'], gc.paginas.map(b => [b.pad, b.n]))); }
    } else {
      sectie('Statistieken koppelen');
      const ol = el('ol', 'm-stappen');
      for (const t of ['Log in op botr.goatcounter.com → Settings (rechtsboven) → API → New API token.', 'Vink "Read statistics" aan en maak het token.',
        'GitHub → Settings → Secrets and variables → Actions → New repository secret, naam GOATCOUNTER_TOKEN, plak het token.',
        'De volgende nacht (of via Instellingen → Nu bijwerken) verschijnen hier je bezoekers, bronnen en aanvragen per post.']) ol.append(el('li', '', t));
      doos.append(ol);
    }
    sectie('Je gepubliceerde posts');
    if ((r.posts || []).length) {
      doos.append(tabel(['Post', 'Kanaal', 'Datum', 'Bezoeken', 'Aanvragen'], r.posts.map(p => [p.titel, p.kanaal, datumTekst(p.datum), p.bezoeken, p.aanvragen])));
      if ((r.kanalen || []).length) { sectie('Per kanaal'); doos.append(tabel(['Kanaal', 'Posts', 'Bezoeken', 'Aanvragen'], r.kanalen.map(k => [k.kanaal, k.posts, k.bezoeken, k.aanvragen]))); }
    } else doos.append(el('p', 'm-stil', 'Nog niets. Klik bij een post op "Gepubliceerd" zodra hij online staat; dan zie je hier hoeveel bezoekers en aanvragen hij oplevert.'));
    const gsc = r.search_console;
    sectie('Vindbaarheid in Google');
    if (gsc && gsc.fout) doos.append(el('p', 'm-controle--oranje m-melding', gsc.fout));
    if (gsc && (gsc.bijna || []).length) {
      doos.append(el('p', '', 'Bijna op de eerste pagina: met een betere tekst of een eigen pagina kun je hier snel stijgen.'));
      doos.append(tabel(['Zoekterm', 'Positie', 'Vertoningen', 'Kliks'], gsc.bijna.map(z => [z.zoekterm, String(z.positie).replace('.', ','), z.vertoningen, z.kliks])));
    } else if (gsc && (gsc.zoektermen || []).length) {
      doos.append(tabel(['Zoekterm', 'Positie', 'Vertoningen', 'Kliks'], gsc.zoektermen.slice(0, 10).map(z => [z.zoekterm, String(z.positie).replace('.', ','), z.vertoningen, z.kliks])));
    } else if (!gsc) {
      const d = el('details', 'm-details'); d.append(el('summary', '', 'Google Search Console koppelen (optioneel)'));
      const ol = el('ol', 'm-stappen');
      for (const t of ['Voeg beckontherocks.nl toe in Google Search Console (search.google.com/search-console) en verifieer het domein.',
        'Google Cloud Console (hetzelfde project als je Google-reviews) → APIs → zet "Google Search Console API" aan.',
        'IAM → Service accounts → Create → geen rollen nodig → Keys → Add key → JSON. Het bestand wordt gedownload.',
        'Search Console → Instellingen → Gebruikers → Gebruiker toevoegen: het e-mailadres van het serviceaccount, recht "Beperkt".',
        'GitHub → Secrets → New repository secret GSC_SERVICE_ACCOUNT met de hele inhoud van het JSON-bestand.']) ol.append(el('li', '', t));
      d.append(ol); doos.append(d);
    }
    if ((r.seo || []).length) {
      const ul = el('ul', 'm-seo');
      const volgorde = { hoog: 0, middel: 1, laag: 2 };
      for (const b of r.seo.slice().sort((x, y) => volgorde[x.ernst] - volgorde[y.ernst])) {
        const li = el('li', 'm-seo--' + b.ernst); li.append(el('strong', '', b.pagina + ' '), document.createTextNode(b.tekst)); ul.append(li);
      }
      doos.append(el('h3', 'm-subkop', 'Controle van je eigen pagina\'s'), ul);
    }
  }

  function naarKans(id) {
    m.weergave.tab = 'kansen'; m.weergave.filter = 'alles'; m.weergave.soort = 'alle'; m.open.add(id);
    bewaarWeergave(); toon();
    const doel = $('kans-' + id);
    if (doel) { doel.scrollIntoView({ behavior: 'smooth', block: 'start' }); doel.classList.add('is-gekozen'); }
  }

  // ---------- kalender ----------
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function kalenderItems(lijst) {
    const per = {};
    const voeg = (dag, item) => { (per[dag] = per[dag] || []).push(item); };
    for (const k of lijst) if (k.status !== 'afgewezen') voeg(k.datum, { soort: k.soort, status: k.status, titel: k.titel, kanaal: k.kanaal, tijd: k.tijd, id: k.id });
    for (const e of m.events || []) voeg(String(e.start).slice(0, 10), { soort: 'event', titel: e.naam, kanaal: 'Klus', tijd: String(e.start).slice(11, 16), url: e.url });
    for (const dag of Object.keys(per)) per[dag].sort((a, b) => (a.tijd || '').localeCompare(b.tijd || ''));
    return per;
  }
  function item(i, kort) {
    const b = el('button', 'm-item m-item--' + i.soort + (i.status && i.status !== 'nieuw' ? ' is-' + i.status : ''));
    b.type = 'button';
    b.textContent = kort ? i.titel : `${i.tijd ? i.tijd + ' · ' : ''}${i.kanaal}: ${i.titel}`;
    b.title = `${i.kanaal}: ${i.titel}`;
    b.onclick = () => { if (i.id) naarKans(i.id); else if (veiligeLink(i.url)) window.open(i.url, '_blank', 'noopener'); };
    return b;
  }
  function toonKalender(doos, lijst) {
    const w = m.weergave, d = m.dag;
    const per = kalenderItems(lijst);
    const balk = el('div', 'm-kalbalk');
    const stap = n => () => {
      if (w.kal === 'maand') m.dag = new Date(d.getFullYear(), d.getMonth() + n, 1);
      else m.dag = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * (w.kal === 'week' ? 7 : 1));
      toon();
    };
    const nav = el('div', 'm-kalnav');
    const vorige = knop('‹', stap(-1), true); vorige.setAttribute('aria-label', 'Vorige');
    const volgende = knop('›', stap(1), true); volgende.setAttribute('aria-label', 'Volgende');
    nav.append(vorige, knop('Vandaag', () => { m.dag = new Date(); toon(); }, true), volgende);
    const maandag = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (d.getDay() + 6) % 7);
    const titel = w.kal === 'maand' ? d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
      : w.kal === 'week' ? 'Week van ' + maandag.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
      : d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
    balk.append(nav, el('h2', 'm-kaltitel', titel), chips([['dag', 'Dag'], ['week', 'Week'], ['maand', 'Maand']], w.kal, v => { w.kal = v; }));
    doos.append(balk);
    const vandaag = iso(new Date());

    if (w.kal === 'maand') {
      const raster = el('div', 'm-maand');
      for (const n of ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']) raster.append(el('div', 'm-maand__kop', n));
      const eerste = new Date(d.getFullYear(), d.getMonth(), 1);
      const start = new Date(eerste); start.setDate(1 - (eerste.getDay() + 6) % 7);
      for (let i = 0; i < 42; i++) {
        const dag = new Date(start); dag.setDate(start.getDate() + i);
        if (i >= 35 && dag.getMonth() !== d.getMonth()) break;
        const vak = el('div', 'm-vak' + (dag.getMonth() !== d.getMonth() ? ' is-buiten' : '') + (iso(dag) === vandaag ? ' is-vandaag' : ''));
        const nr = el('button', 'm-vak__nr', String(dag.getDate())); nr.type = 'button';
        nr.setAttribute('aria-label', dag.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }));
        nr.onclick = () => { m.dag = dag; w.kal = 'dag'; bewaarWeergave(); toon(); };
        vak.append(nr);
        const items = per[iso(dag)] || [];
        items.slice(0, 3).forEach(it => vak.append(item(it, true)));
        if (items.length > 3) { const meer = el('button', 'm-meer', '+' + (items.length - 3)); meer.type = 'button'; meer.onclick = nr.onclick; vak.append(meer); }
        const stip = el('div', 'm-stippen'); items.forEach(it => stip.append(el('span', 'm-stip m-stip--' + it.soort))); vak.append(stip);
        raster.append(vak);
      }
      doos.append(raster);
    } else {
      const dagen = w.kal === 'week' ? Array.from({ length: 7 }, (_, i) => new Date(maandag.getFullYear(), maandag.getMonth(), maandag.getDate() + i)) : [d];
      const lijstje = el('div', 'm-week');
      for (const dag of dagen) {
        const rij = el('div', 'm-weekdag' + (iso(dag) === vandaag ? ' is-vandaag' : ''));
        rij.append(el('h3', '', dag.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' })));
        const items = per[iso(dag)] || [];
        if (!items.length) rij.append(el('p', 'm-stil', 'Niets gepland'));
        items.forEach(it => rij.append(item(it, false)));
        lijstje.append(rij);
      }
      doos.append(lijstje);
    }
    const legenda = el('div', 'm-legenda');
    for (const [s, n] of [['snel', 'Snel'], ['structureel', 'Structureel'], ['betaald', 'Betaald'], ['event', 'Mogelijke klus']]) {
      const l = el('span'); l.append(el('span', 'm-stip m-stip--' + s), document.createTextNode(' ' + n)); legenda.append(l);
    }
    doos.append(legenda);
    const gepland = lijst.filter(k => k.status === 'ingepland' || k.status === 'goedgekeurd');
    if (gepland.length) doos.append(knop(`Alle ${gepland.length} goedgekeurde posts in mijn agenda`, () => ics(gepland), true));
  }

  // ---------- onderzoek ----------
  function toonTrends(doos) {
    const o = m.data.onderzoek || {};
    if (o.gemaakt) {
      doos.append(el('p', 'm-stil', 'Onderzoek van ' + datumTekst(o.gemaakt, true)));
      if (o.samenvatting) doos.append(el('div', 'm-tekst', o.samenvatting));
    }
    const trends = m.data.trends || [];
    if (!trends.length) {
      doos.append(el('p', 'm-leeg', 'Nog geen onderzoek. Elke maandag zoekt Claude naar trends, zoekwoorden, concurrenten en kansen in de regio; de resultaten met bronnen verschijnen hier.'));
      return;
    }
    const groep = { trend: 'Trends', seo: 'Zoekwoorden en SEO', concurrent: 'Wat anderen doen', doelgroep: 'Doelgroepen en regio', kans: 'Kansen' };
    for (const [soort, naam] of Object.entries(groep)) {
      const deze = trends.filter(t => (groep[t.soort] ? t.soort : 'trend') === soort);
      if (!deze.length) continue;
      doos.append(el('h2', 'm-kopje', naam));
      for (const t of deze) {
        const a = el('article', 'm-trend');
        a.append(el('h3', '', t.titel), el('p', '', t.samenvatting || ''));
        const b = t.bron || {};
        if (veiligeLink(b.url)) {
          const p = el('p', 'm-stil'); const l = el('a', '', b.titel || b.url); l.href = b.url; l.target = '_blank'; l.rel = 'noopener noreferrer';
          p.append('Bron: ', l, b.datum ? ' · ' + datumTekst(b.datum) : ''); a.append(p);
        }
        doos.append(a);
      }
    }
  }

  // ---------- instellingen ----------
  function toonInstellingen(doos) {
    const s = el('section', 'm-instellingen');
    s.append(el('h2', 'm-kopje', 'Synchroniseren tussen apparaten'));
    s.append(el('p', '', 'Zonder token blijven je goedkeuringen en aanpassingen op dit apparaat. Met een GitHub-token worden ze versleuteld in je repository bewaard, zodat je laptop en telefoon hetzelfde zien en de planning er rekening mee houdt.'));
    const stappen = el('ol', 'm-stappen');
    for (const t of ['Ga op GitHub naar Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.',
      'Naam: "Beck admin". Kies een lange looptijd.',
      'Repository access: Only select repositories → Beck-On-The-Rocks.',
      'Permissions → Repository permissions: Contents → Read and write, en Actions → Read and write (voor de knop "Nu bijwerken").',
      'Klik Generate token, kopieer hem en plak hem hieronder. Hij wordt versleuteld met je wachtwoord in deze browser bewaard; doe dit op elk apparaat één keer.'])
      stappen.append(el('li', '', t));
    s.append(stappen);
    const f = el('form', 'slot');
    const inp = el('input'); inp.type = 'password'; inp.placeholder = m.token ? 'Token is ingesteld' : 'github_pat_…'; inp.autocomplete = 'off';
    const ok = el('button', 'btn', 'Opslaan'); ok.type = 'submit';
    f.append(inp, ok);
    f.onsubmit = async ev => {
      ev.preventDefault();
      const token = inp.value.trim(); if (!token) return;
      m.token = token; m.sync = 'Token controleren…'; toonSync();
      try {
        await laadStatus();
        if (/mislukt/.test(m.sync)) throw new Error(m.sync);
        await bewaarToken(token); schrijf(LOKAAL, JSON.stringify(m.status));
        if (Object.keys(m.status.items).length) await stuurStatus();
      } catch (e) { m.token = ''; m.sync = 'Dit token werkt niet: ' + e.message; }
      toon();
    };
    s.append(f);
    if (m.token) {
      const rij = el('div', 'event__knoppen');
      rij.append(knop('Nu bijwerken', async ev => {
        const b = ev.currentTarget; b.disabled = true;
        const r = await api('actions/workflows/marketing.yml/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main' }) }).catch(() => null);
        b.textContent = r && r.status === 204 ? 'Gestart: ververs over een paar minuten' : 'Starten lukte niet (heeft het token Actions-rechten?)';
      }, true), knop('Token verwijderen', async () => { await bewaarToken(''); m.token = ''; m.sync = 'Alleen op dit apparaat'; toon(); }, true));
      s.append(rij);
    }
    doos.append(s);
  }

  // ---------- openen ----------
  async function haal(pad) {
    const r = await fetch(pad + '?' + Date.now(), { cache: 'no-store' });
    return r.ok ? r.json() : null;
  }
  // Geeft 'ok', 'geen' (nog geen sleutel) of 'fout' (wachtwoord past niet).
  async function open(ww, events) {
    m.ww = ww; m.events = events || [];
    const sleutel = await haal('/assets/data/marketing-sleutel.json').catch(() => null);
    if (!sleutel) { toon(); return 'geen'; }
    try { m.geheim = await openGeheim(sleutel, ww); } catch (e) { return 'fout'; }
    m.publiek = sleutel.publiek;
    const [data, regels] = await Promise.all([haal('/assets/data/marketing.enc.json').catch(() => null), haal('/assets/data/marketing-regels.json').catch(() => null)]);
    m.regels = regels;
    try { m.data = data ? await ontsleutel(data) : null; } catch (e) { m.data = null; }
    m.token = await leesToken();
    await laadStatus();
    toon();
    return 'ok';
  }
  window.BeckMarketing = { open, zetEvents: ev => { m.events = ev || []; } };
})();
