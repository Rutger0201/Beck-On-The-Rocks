// Beck on the Rocks: online akkoord op een offerte.
// De offertegegevens zitten in de link (?o=...), gemaakt door de generator.
(() => {
  const $ = s => document.querySelector(s);
  const CONFIG = window.BECK_CONFIG || {};
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const euro = n => '€ ' + (+n || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const lang = iso => iso ? new Date(iso + 'T00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const vandaag = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const geladen = Date.now();
  let o;
  try {
    const raw = new URLSearchParams(location.search).get('o') || '';
    const bin = atob(raw.replace(/-/g, '+').replace(/_/g, '/'));
    o = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, c => c.charCodeAt(0))));
    if (!o || !o.n || !Array.isArray(o.r)) throw new Error();
  } catch {
    $('#fout').hidden = false;
    if (CONFIG.mail) { $('#fout-mail').href = 'mailto:' + CONFIG.mail; $('#fout-mail').textContent = CONFIG.mail; }
    return;
  }

  // Link waarmee Rutger in zijn generator controleert of de offerte in deze link niet is aangepast
  const zoek = new URLSearchParams(location.search);
  const controleLink = `${location.origin}${location.pathname.replace(/akkoord\.html$/, '')}documenten.html?controleer=${zoek.get('o')}`
    + (zoek.get('s') ? `&s=${zoek.get('s')}` : '');

  // ---- Offerte tonen ----
  document.title = `Offerte ${o.n} · Beck on the Rocks`;
  $('#o-nummer').textContent = o.n;
  $('#o-naam').textContent = (o.k || '').split(/\s+/)[0] || 'daar';
  $('#o-intro').textContent = `Hier is je offerte voor ${o.s ? 'je ' + o.s.toLowerCase() : 'je feest'}${o.fd ? ' op ' + lang(o.fd) : ''}. Bekijk hem rustig en geef onderaan aan of je akkoord bent.`;
  const feest = [
    ['Feest', [o.s, o.fd && lang(o.fd)].filter(Boolean).join(' op ')],
    ['Tijd', o.t ? `${o.t}${o.u ? ` (${String(o.u).replace('.', ',')} uur)` : ''}` : ''],
    ['Gasten', o.g],
    ['Locatie', o.l],
    ['Voor', [o.bd, o.k].filter(Boolean).join(', t.a.v. ')]
  ].filter(([, v]) => v);
  $('#o-feest').innerHTML = feest.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
  $('#o-regels').innerHTML = o.r.map(([oms, sub, aantal, bedrag]) =>
    `<tr><td>${esc(oms)}${sub ? `<small>${esc(sub)}</small>` : ''}</td><td>${esc(aantal)}</td><td>${euro(bedrag)}</td></tr>`).join('');
  $('#o-totaal').innerHTML = (o.btw ? `<div><span>Subtotaal</span><span>${euro(o.sub)}</span></div><div><span>Btw 21%</span><span>${euro(o.btw)}</span></div>` : '')
    + `<div class="tot"><span>Totaal</span><span>${euro(o.tot)}</span></div>`
    + (o.kor ? '<small>Geen btw: kleineondernemersregeling (KOR)</small>' : '')
    + (o.gt ? `<small>Geldig tot ${lang(o.gt)}</small>` : '');
  if (o.o) { $('#o-opm').hidden = false; $('#o-opm').textContent = o.o; }
  $('#o-afspraken').innerHTML = [
    'Je huurt mij in als bartender. Drank, ijs en verse ingrediënten regel je zelf; je ontvangt van mij een boodschappenlijst.',
    'Je zorgt voor een werkplek: een stevige tafel of bar, met een gootsteen met stromend water in de buurt.',
    `Geen aanbetaling. Na het feest ontvang je een factuur met een betaaltermijn van ${o.bt || 14} dagen.`,
    `Boeken binnen 1 maand voor het feest geldt als spoedboeking: +${o.sp ?? 25}% over alle kosten.`,
    `Annuleren kan kosteloos tot 14 dagen voor het feest. Daarna reken ik ${o.an ?? 20}% van het afgesproken bedrag.`
  ].map(t => `<li>${esc(t)}</li>`).join('');
  $('#offerte').hidden = false;
  $('#antwoord').hidden = false;
  const form = $('#akk-form');
  form.naam.value = o.k || '';

  const verlopen = o.gt && o.gt < vandaag;
  if (verlopen) {
    $('#verlopen').hidden = false;
    $('#lbl-akkoord').hidden = true; $('#knop-akkoord').hidden = true;
  }

  // ---- Antwoord versturen ----
  let keuze = 'akkoord';
  form.addEventListener('click', e => { const k = e.target.closest('[data-keuze]'); if (k) keuze = k.dataset.keuze; });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const note = $('#akk-note'); note.classList.remove('is-fout');
    const d = Object.fromEntries(new FormData(form));
    if (d.botcheck) return;
    const fout = t => { note.textContent = t; note.classList.add('is-fout'); };
    if (Date.now() - geladen < 3000) return; // binnen 3 seconden verstuurd: spambot, niets versturen
    if ((d.opmerking.match(/https?:\/\/|www\./gi) || []).length > 2) return fout('Je bericht bevat te veel links. Haal ze weg, of mail me je bericht.');
    if (!d.naam.trim()) return fout('Vul je naam in.');
    if (keuze === 'akkoord' && !d.akkoord) return fout('Vink aan dat je akkoord gaat met de offerte en de afspraken.');
    if (keuze === 'vraag' && !d.opmerking.trim()) return fout('Schrijf je vraag of wijziging in het tekstvak.');

    const opm = d.opmerking.trim();
    const titel = keuze === 'akkoord' ? (opm ? 'AKKOORD (met opmerking)' : 'AKKOORD') : 'VRAAG / WIJZIGING';
    const velden = {
      'Antwoord': titel, 'Offerte': o.n, 'Klant': d.naam.trim(), 'E-mail klant': d.email || '-',
      'Bedrag': euro(o.tot), 'Feest': [o.s, o.fd && lang(o.fd), o.t, o.l].filter(Boolean).join(' · '),
      'Opmerking': opm || '-', 'Geldig tot': o.gt ? lang(o.gt) : '-',
      'Controleren (voor Rutger)': controleLink
    };
    const onderwerp = `${keuze === 'akkoord' ? '✅ Akkoord' : '❓ Vraag'} op offerte ${o.n} van ${d.naam.trim()}`;
    const knoppen = form.querySelectorAll('button');
    knoppen.forEach(b => { b.disabled = true; });
    try {
      if (!CONFIG.web3forms) throw new Error('geen sleutel');
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: CONFIG.web3forms, subject: onderwerp, from_name: 'Beck on the Rocks · akkoord', ...(d.email ? { replyto: d.email } : {}), botcheck: false, ...velden })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'mislukt');
      form.hidden = true; $('#verlopen').hidden = true;
      if (keuze === 'vraag') {
        $('#klaar-titel').textContent = 'Bedankt voor je bericht!';
        $('#klaar-tekst').textContent = 'Ik kom zo snel mogelijk bij je terug, meestal binnen een dag.';
      } else if (opm) {
        $('#klaar-tekst').textContent = 'Bedankt voor je akkoord. Ik neem je opmerking mee en kom snel bij je terug met de boodschappenlijst en de laatste details.';
      }
      const klaar = $('#akk-klaar'); klaar.hidden = false; klaar.focus();
    } catch {
      const mail = CONFIG.mail || 'rutger@beck.nl';
      note.innerHTML = `Versturen is niet gelukt. Probeer het nog eens, of <a href="mailto:${esc(mail)}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(Object.entries(velden).map(([k, v]) => k + ': ' + v).join('\n'))}">stuur je antwoord per mail</a>.`;
      note.classList.add('is-fout');
    } finally {
      knoppen.forEach(b => { b.disabled = false; });
    }
  });
})();
