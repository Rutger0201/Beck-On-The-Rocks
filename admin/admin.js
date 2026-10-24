// Adminpagina: inloggen, mogelijke klussen tonen. Het marketingcentrum zit in marketing.js.
(() => {
  const OPSLAG = 'beck-admin-ww', WEG = 'beck-admin-weg', TAB = 'beck-admin-tab';
  const $ = id => document.getElementById(id);
  const lees = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const schrijf = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} };
  const weg = new Set(JSON.parse(lees(WEG) || '[]'));
  let gegevens = null, eventsStaat = 'geen';

  const bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function ontsleutel(bestand, ww) {
    const basis = await crypto.subtle.importKey('raw', new TextEncoder().encode(ww), 'PBKDF2', false, ['deriveKey']);
    const sleutel = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: bytes(bestand.zout), iterations: bestand.iteraties },
      basis, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const platte = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(bestand.iv) }, sleutel, bytes(bestand.data));
    return JSON.parse(new TextDecoder().decode(platte));
  }

  function meld(t) { $('melding').textContent = t; $('melding').hidden = !t; }

  // Opent beide onderdelen; het wachtwoord klopt als minstens één ervan open gaat.
  // Zonder wachtwoord (ww leeg) wordt de onthouden sleutel gebruikt.
  async function open(ww) {
    meld('');
    const BM = window.BeckMarketing;
    const marketing = await BM.ontgrendel(ww, $('onthoud').checked);
    let bestand = null, events = 'geen';
    gegevens = null;
    try {
      const r = await fetch('/assets/data/events.enc.json?' + Date.now(), { cache: 'no-store' });
      if (r.ok) bestand = await r.json();
    } catch (e) {}
    if (bestand) {
      try {
        // Nieuw formaat: met het sleutelpaar; oud formaat: direct met het wachtwoord
        if (bestand.epk) { if (marketing !== 'ok') throw new Error(); gegevens = await BM.ontsleutel(bestand); }
        else { if (!ww) throw new Error(); gegevens = await ontsleutel(bestand, ww); }
        events = 'ok';
      } catch (e) { events = bestand.epk || ww ? 'fout' : 'oud'; }
    }
    eventsStaat = events;
    if (events !== 'ok' && marketing !== 'ok') {
      if (!ww) { $('onthoud').checked = false; return meld('Log opnieuw in met je wachtwoord.'); }
      if (events === 'geen' && marketing === 'geen') return meld('Er is nog niets. Draai op GitHub eerst "Events zoeken" of "Marketing bijwerken".');
      return meld('Wachtwoord klopt niet.');
    }
    await BM.open(gegevens ? gegevens.events : []);
    $('slot').hidden = true; $('tabs').hidden = false;
    kiesTab(location.hash === '#marketing' ? 'marketing' : location.hash === '#klussen' ? 'klussen' : lees(TAB) || 'klussen');
  }

  function kiesTab(tab) {
    schrijf(TAB, tab);
    document.querySelectorAll('.a-tab').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
    $('lijst').hidden = tab !== 'klussen'; $('marketing').hidden = tab !== 'marketing';
    $('titel').textContent = tab === 'marketing' ? 'Marketing' : 'Mogelijke klussen';
    $('sub').textContent = tab === 'marketing' ? 'Je beste marketingkansen voor de komende 30 dagen. Niets wordt gepubliceerd zonder jouw akkoord.'
      : 'De beste events en oproepen voor de komende maand.';
    if (tab === 'klussen') toon();
  }

  const veiligeLink = u => /^https?:\/\//i.test(u || '') ? u : '';
  const dag = s => {
    const d = new Date(s.length <= 10 ? s + 'T12:00' : s);
    if (isNaN(d)) return s;
    const tekst = d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' });
    return s.length > 10 ? tekst + ', ' + d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }) : tekst;
  };
  function knop(tekst, href, ghost) {
    const a = document.createElement('a');
    a.className = 'btn btn--small' + (ghost ? ' btn--ghost' : '');
    a.textContent = tekst; a.href = href;
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    return a;
  }
  function offerte(e) {
    const tekst = `Hallo${e.organisator ? ' ' + e.organisator : ''},\n\nIk zag "${e.naam}" op ${dag(e.start)}. ` +
      `Ik ben Rutger van Beck on the Rocks, freelance cocktailbartender. Ik kom met mijn eigen cocktailgereedschap ` +
      `en zorg voor een mooie bar en blije gasten. Zal ik een vrijblijvende offerte sturen?\n\n` +
      `Groet,\nRutger\nhttps://beckontherocks.nl`;
    if (e.mail && /^[^\s@]+@[^\s@]+$/.test(e.mail))
      return 'mailto:' + e.mail + '?subject=' + encodeURIComponent('Bartender voor ' + e.naam) + '&body=' + encodeURIComponent(tekst);
    return '';
  }

  function toon() {
    const doos = $('events'); doos.textContent = '';
    if (!gegevens) {
      $('info').textContent = '';
      doos.textContent = eventsStaat === 'oud' ? 'Deze lijst staat nog in het oude formaat. Hij verschijnt weer na de volgende run van "Events zoeken", of vergrendel en log in met je wachtwoord.'
        : eventsStaat === 'fout' ? 'Deze lijst is met een ander wachtwoord versleuteld. Draai "Events zoeken" op GitHub opnieuw.'
        : 'Er is nog geen lijst. Die verschijnt na de eerste run van "Events zoeken" op GitHub.';
      return;
    }
    const alle = gegevens.events || [];
    const zicht = alle.filter(e => $('toonweg').checked || !weg.has(e.id));
    $('info').textContent = `${zicht.length} van ${alle.length} · bijgewerkt ${new Date(gegevens.bijgewerkt).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' })}`;
    if (!zicht.length) { doos.textContent = 'Geen events om te tonen.'; return; }
    for (const e of zicht) {
      const kaart = document.createElement('article');
      kaart.className = 'event' + (weg.has(e.id) ? ' event--weg' : '');
      const s = document.createElement('div'); s.className = 'punten'; s.textContent = e.score; s.title = 'Score van 0 tot 100';
      const h = document.createElement('h2'); h.textContent = e.naam;
      if (e.soort === 'oproep') { const l = document.createElement('span'); l.className = 'label'; l.textContent = 'Oproep'; h.append(l); }
      const meta = document.createElement('div'); meta.className = 'event__meta';
      meta.textContent = [dag(e.start), e.plaats, e.organisator].filter(Boolean).join(' · ');
      const waarom = document.createElement('p'); waarom.className = 'event__waarom'; waarom.textContent = e.waarom || '';
      const knoppen = document.createElement('div'); knoppen.className = 'event__knoppen';
      const mail = offerte(e);
      if (mail) knoppen.append(knop('Offerte sturen', mail));
      if (veiligeLink(e.url)) knoppen.append(knop(mail ? 'Bekijk' : 'Bekijk en reageer', veiligeLink(e.url), !!mail));
      if (e.telefoon) knoppen.append(knop('Bellen', 'tel:' + e.telefoon.replace(/[^\d+]/g, ''), true));
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn--small btn--ghost';
      b.textContent = weg.has(e.id) ? 'Toch interessant' : 'Niet interessant';
      b.onclick = () => { weg.has(e.id) ? weg.delete(e.id) : weg.add(e.id); schrijf(WEG, JSON.stringify([...weg])); toon(); };
      knoppen.append(b);
      kaart.append(s, h, meta, waarom, knoppen);
      doos.append(kaart);
    }
  }

  $('slot').addEventListener('submit', ev => { ev.preventDefault(); open($('ww').value); });
  $('toonweg').addEventListener('change', toon);
  document.querySelectorAll('.a-tab').forEach(b => b.addEventListener('click', () => kiesTab(b.dataset.tab)));
  $('uit').addEventListener('click', async ev => { ev.preventDefault(); schrijf(OPSLAG, null); await window.BeckMarketing.vergeet(); location.reload(); });
  // Vroeger stond het wachtwoord hier leesbaar opgeslagen: één keer gebruiken om de sleutel te onthouden, dan weg
  const oud = lees(OPSLAG);
  if (oud) { schrijf(OPSLAG, null); $('onthoud').checked = true; open(oud); }
  else window.BeckMarketing.onthouden().then(ja => { if (ja) { $('onthoud').checked = true; open(''); } });
})();
