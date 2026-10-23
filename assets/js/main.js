// Beck on the Rocks: interactie voor de homepage, de Engelse versie, de landingspagina's en het visitekaartje.
// Elk onderdeel draait alleen als de bijbehorende HTML op de pagina staat.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Taal: en/index.html heeft lang="en", de rest van de site is Nederlands
  const EN = document.documentElement.lang === 'en';
  const t = (nl, en) => EN ? en : nl;
  const LOCALE = t('nl-NL', 'en-GB');

  /* ================= Gegevens (hier pas je de inhoud aan) ================= */

  // c1 = kleur van de stip op de menukaart
  // De klassiekers uit de EBS-opleiding (European Bartender School), mocktails en cocktail op maat.
  const COCKTAILS = [
    { naam: 'Old Fashioned', cat: 'klassiek', c1: '#c77a2a',
      tekst: 'Bourbon, suiker en bitters, langzaam geroerd en afgemaakt met een sinaasappelzeste.',
      ing: ['Bourbon', 'Suiker', 'Angostura', 'Sinaasappel'] },
    { naam: 'Negroni', cat: 'klassiek', c1: '#c4362e',
      tekst: 'Gin, Campari en zoete vermout in perfecte balans. Bitter, krachtig en tijdloos.',
      ing: ['Gin', 'Campari', 'Vermout'] },
    { naam: 'Espresso Martini', cat: 'klassiek', c1: '#6b4126',
      tekst: 'Vodka, vers gezette espresso en koffielikeur met een romige kraag.',
      ing: ['Vodka', 'Espresso', 'Koffielikeur'] },
    { naam: 'Whiskey Sour', cat: 'klassiek', c1: '#e3b25c',
      tekst: 'Bourbon, citroen en suiker, opgeschud tot een zijdezachte schuimkraag.',
      ing: ['Bourbon', 'Citroen', 'Suiker'] },
    { naam: 'Daiquiri', cat: 'klassiek', c1: '#e8e2a0',
      tekst: 'Witte rum, limoen en suiker. Simpel, fris en precies in balans.',
      ing: ['Witte rum', 'Limoen', 'Suiker'] },
    { naam: 'Cosmopolitan', cat: 'klassiek', c1: '#d0587a',
      tekst: 'Citroenvodka, triple sec, cranberry en limoen. Een stijlvolle klassieker.',
      ing: ['Vodka', 'Triple sec', 'Cranberry', 'Limoen'] },
    { naam: 'Mojito', cat: 'fris', c1: '#8cc06b',
      tekst: 'Witte rum, verse munt, limoen en suiker, aangevuld met soda.',
      ing: ['Witte rum', 'Munt', 'Limoen', 'Soda'] },
    { naam: 'Caipirinha', cat: 'fris', c1: '#b9d36a',
      tekst: 'Cachaça met gekneusde limoen en rietsuiker. Braziliaanse zomer.',
      ing: ['Cachaça', 'Limoen', 'Rietsuiker'] },
    { naam: 'Margarita', cat: 'fris', c1: '#e6d77a',
      tekst: 'Tequila, triple sec en limoen met een zoutrandje.',
      ing: ['Tequila', 'Triple sec', 'Limoen', 'Zout'] },
    { naam: 'Pornstar Martini', cat: 'fris', c1: '#f2a33a',
      tekst: 'Vanillevodka en passievrucht met een shot bubbels ernaast. Altijd een hit.',
      ing: ['Vanillevodka', 'Passievrucht', 'Prosecco'] },
    { naam: 'Moscow Mule', cat: 'fris', c1: '#d9c08a',
      tekst: 'Vodka, limoen en pittige ginger beer. Fris met een kick.',
      ing: ['Vodka', 'Limoen', 'Ginger beer'] },
    { naam: 'Piña Colada', cat: 'fris', c1: '#f3e2b0',
      tekst: 'Rum, ananas en kokos, romig opgeschud. Vakantie in een glas.',
      ing: ['Rum', 'Ananas', 'Kokos'] },
    { naam: 'Virgin Mojito', cat: 'mocktail', c1: '#9ccf8a',
      tekst: 'Verse munt, limoen en suiker met soda. Alle frisheid, zonder alcohol.',
      ing: ['Munt', 'Limoen', 'Soda'] },
    { naam: 'Virgin Colada', cat: 'mocktail', c1: '#f0dca8',
      tekst: 'Ananas en kokos, romig en tropisch, zonder alcohol.',
      ing: ['Ananas', 'Kokos', 'Limoen'] },
    { naam: 'Virgin Mule', cat: 'mocktail', c1: '#d6b77a',
      tekst: 'Ginger beer, limoen en een vleugje bitter. Kruidig en verfrissend.',
      ing: ['Ginger beer', 'Limoen', 'Munt'] },
    { naam: 'Jouw cocktail', cat: 'creatie', c1: '#c9a45c',
      tekst: 'Een eigen cocktail voor jullie feest, met een naam en smaak die bij jullie past. Ook alcoholvrij. Prijs in overleg.',
      ing: ['Op maat', 'Eigen naam', 'Getest'] }
  ];

  // Engelse teksten voor de Engelse site (en/index.html), op naam van de cocktail
  const COCKTAILS_EN = {
    'Old Fashioned': ['Bourbon, sugar and bitters, stirred slowly and finished with an orange zest.', ['Bourbon', 'Sugar', 'Angostura', 'Orange']],
    'Negroni': ['Gin, Campari and sweet vermouth in perfect balance. Bitter, bold and timeless.', ['Gin', 'Campari', 'Vermouth']],
    'Espresso Martini': ['Vodka, freshly brewed espresso and coffee liqueur with a creamy crema.', ['Vodka', 'Espresso', 'Coffee liqueur']],
    'Whiskey Sour': ['Bourbon, lemon and sugar, shaken to a silky foam.', ['Bourbon', 'Lemon', 'Sugar']],
    'Daiquiri': ['White rum, lime and sugar. Simple, fresh and perfectly balanced.', ['White rum', 'Lime', 'Sugar']],
    'Cosmopolitan': ['Citrus vodka, triple sec, cranberry and lime. A stylish classic.', ['Vodka', 'Triple sec', 'Cranberry', 'Lime']],
    'Mojito': ['White rum, fresh mint, lime and sugar, topped with soda.', ['White rum', 'Mint', 'Lime', 'Soda']],
    'Caipirinha': ['Cachaça with muddled lime and cane sugar. A Brazilian summer.', ['Cachaça', 'Lime', 'Cane sugar']],
    'Margarita': ['Tequila, triple sec and lime with a salt rim.', ['Tequila', 'Triple sec', 'Lime', 'Salt']],
    'Pornstar Martini': ['Vanilla vodka and passion fruit with a shot of bubbles on the side. Always a hit.', ['Vanilla vodka', 'Passion fruit', 'Prosecco']],
    'Moscow Mule': ['Vodka, lime and spicy ginger beer. Fresh with a kick.', ['Vodka', 'Lime', 'Ginger beer']],
    'Piña Colada': ['Rum, pineapple and coconut, shaken until creamy. A holiday in a glass.', ['Rum', 'Pineapple', 'Coconut']],
    'Virgin Mojito': ['Fresh mint, lime and sugar with soda. All the freshness, no alcohol.', ['Mint', 'Lime', 'Soda']],
    'Virgin Colada': ['Pineapple and coconut, creamy and tropical, without alcohol.', ['Pineapple', 'Coconut', 'Lime']],
    'Virgin Mule': ['Ginger beer, lime and a dash of bitters. Spicy and refreshing.', ['Ginger beer', 'Lime', 'Mint']],
    'Jouw cocktail': ['A signature cocktail for your party, with a name and taste that suit you. Alcohol-free is possible too. Price on request.', ['Bespoke', 'Your own name', 'Tested'], 'Your cocktail']
  };
  if (EN) COCKTAILS.forEach(c => { const e = COCKTAILS_EN[c.naam]; if (e) { c.tekst = e[0]; c.ing = e[1]; c.titel = e[2]; } });

  const LABELS = EN
    ? { klassiek: 'Classic', fris: 'Fresh & fruity', mocktail: 'Alcohol-free', creatie: 'Bespoke' }
    : { klassiek: 'Klassieker', fris: 'Fris & fruitig', mocktail: 'Alcoholvrij', creatie: 'Op maat' };
  // Soort feest blijft in het Nederlands opgeslagen (mail, generator, reviews); dit is alleen de weergave
  const SOORT_EN = {
    Verjaardag: 'Birthday', Tuinfeest: 'Garden party', Bruiloft: 'Wedding', Jubileum: 'Anniversary', 'Privéfeest': 'Private party', Diner: 'Dinner',
    Bedrijfsborrel: 'Company drinks', Personeelsfeest: 'Staff party', 'Netwerkevenement of receptie': 'Networking event or reception',
    Bedrijfsfeest: 'Corporate event', 'Horeca-inval': 'Bar cover', Anders: 'Other'
  };
  const soortTekst = s => EN ? (SOORT_EN[s] || s) : s;

  // Tarieven komen uit tarieven.json (via assets/js/tarieven.js); de getallen hier zijn alleen een terugval
  const T = window.BECK_TARIEVEN || {};
  const TARIEF = {
    uur: T.uur ?? 45,                                   // per uur achter de bar
    voorbereiding: T.voorbereidingUren ?? 1,            // altijd voorbereiding
    menu: T.menu ?? 75,                                 // cocktailmenu & gebruik materialen (vanaf)
    fruitpers: (T.fruitpersProcent ?? 20) / 100,        // uurtarief + dit percentage met fruitpers
    menuFruitpers: T.menuFruitpers ?? 99,               // cocktailmenu met fruitpers (vanaf)
    spoed: (T.spoedProcent ?? 25) / 100                 // toeslag bij boeken binnen 1 maand
  };

  // Web3Forms (web3forms.com): boekingen en reviews gaan direct naar je mail.
  // Zonder sleutel opent het formulier het mailprogramma van de bezoeker.
  const CONFIG = window.BECK_CONFIG || {};
  const WEB3FORMS_SLEUTEL = CONFIG.web3forms || '';  // staat in assets/js/config.js

  // Goedgekeurde reviews staan als losse .json-bestanden in deze map van de repository
  const REVIEWS_REPO = 'Rutger0201/Beck-On-The-Rocks';
  const REVIEWS_MAP = 'reviews';

  // Google reviews: plak hier je links zodra je Google Bedrijfsprofiel er is
  const GOOGLE_REVIEW_SCHRIJVEN = (CONFIG.google || {}).review || '';  // in config.js
  const GOOGLE_REVIEWS_BEKIJKEN = (CONFIG.google || {}).profiel || '';

  const MAIL = CONFIG.mail || 'rutger@beck.nl';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vandaagIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const euro = n => '€ ' + n.toLocaleString(LOCALE, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  // Spoed = binnen een maand vanaf vandaag. Een datum in het verleden telt niet mee.
  const isSpoed = datum => {
    if (!datum || datum < vandaagIso()) return false;
    const grens = new Date(); grens.setHours(0, 0, 0, 0); grens.setMonth(grens.getMonth() + 1);
    return new Date(datum + 'T00:00') < grens;
  };
  const params = new URLSearchParams(location.search);

  /* ================= Statistieken (GoatCounter, zonder cookies) ================= */
  // Zet je GoatCounter-code in assets/js/config.js (goatcounter: 'beckontherocks'). Leeg = uit.
  // ?ref=nfc of ?ref=qr in een link telt als bron, zo zie je hoeveel mensen via je NFC-tag of QR-code komen.
  const gcCode = (CONFIG.goatcounter || '').trim();
  const gcWacht = [];
  let bron = params.get('ref') || '';
  // De campagnecode (bijv. ?ref=li-kerstborrel-26) blijft dit bezoek bewaard, zodat een aanvraag aan de post gekoppeld wordt.
  const campagne = (() => {
    const r = /^[a-z0-9-]{1,40}$/i.test(bron) ? bron.toLowerCase() : '';
    try { if (r) sessionStorage.setItem('beck-bron', r); return r || sessionStorage.getItem('beck-bron') || ''; }
    catch (e) { return r; }
  })();
  function telBezoek(pad, titel, event = false) {
    if (!gcCode || location.hostname === 'localhost') return;
    const data = { path: pad, title: titel, event };
    if (bron && !event) { data.referrer = bron; bron = ''; }
    const stuur = () => window.goatcounter.count(data);
    if (window.goatcounter && window.goatcounter.count) stuur(); else gcWacht.push(stuur);
  }
  if (gcCode && location.hostname !== 'localhost') {
    window.goatcounter = { no_onload: true };
    const sc = document.createElement('script');
    sc.async = true; sc.src = 'https://gc.zgo.at/count.js';
    sc.dataset.goatcounter = `https://${encodeURIComponent(gcCode)}.goatcounter.com/count`;
    sc.onload = () => gcWacht.splice(0).forEach(f => f());
    document.head.append(sc);
  }

  /* ================= Menu ================= */
  const nav = $('.nav'), toggle = $('.nav__toggle'), menu = $('#menu'), fab = $('.fab');
  function sluitMenu() {
    if (!toggle) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', t('Menu openen', 'Open menu'));
    menu.classList.remove('is-open');
    document.documentElement.classList.remove('menu-open');
  }
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', open);
      toggle.setAttribute('aria-label', open ? t('Menu sluiten', 'Close menu') : t('Menu openen', 'Open menu'));
      menu.classList.toggle('is-open', open);
      document.documentElement.classList.toggle('menu-open', open);
      if (open) $('a', menu).focus();
    });
    $$('a', menu).forEach(a => a.addEventListener('click', sluitMenu));
    addEventListener('keydown', e => {
      if (!menu.classList.contains('is-open')) return;
      if (e.key === 'Escape') { sluitMenu(); toggle.focus(); return; }
      // Tab blijft binnen het open menu en de sluitknop
      if (e.key !== 'Tab') return;
      const focusbaar = [...$$('a, button', menu), toggle];
      const eerste = focusbaar[0], laatste = focusbaar[focusbaar.length - 1];
      if (e.shiftKey && document.activeElement === eerste) { e.preventDefault(); laatste.focus(); }
      else if (!e.shiftKey && document.activeElement === laatste) { e.preventDefault(); eerste.focus(); }
    });
  }
  // Thema: donker is de standaard, de keuze bewaren we in localStorage 'thema'.
  // Het script bovenin de <head> zet data-thema al voordat de pagina getekend wordt.
  const themaKleur = { donker: '#1a1714', licht: '#f1ebe1' };
  function zetThemaKnoppen() {
    const donker = document.documentElement.dataset.thema !== 'licht';
    $$('.thema-knop').forEach(k => {
      k.setAttribute('aria-label', donker ? t('Wissel naar licht thema', 'Switch to light theme') : t('Wissel naar donker thema', 'Switch to dark theme'));
      const tekst = $('.thema-knop__tekst', k);
      if (tekst) tekst.textContent = donker ? t('Licht', 'Light') : t('Donker', 'Dark');
    });
  }
  $$('.thema-knop').forEach(k => k.addEventListener('click', () => {
    const nieuw = document.documentElement.dataset.thema === 'licht' ? 'donker' : 'licht';
    document.documentElement.dataset.thema = nieuw;
    try { localStorage.setItem('thema', nieuw); } catch { /* privémodus */ }
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.content = themaKleur[nieuw];
    zetThemaKnoppen();
  }));
  zetThemaKnoppen();
  // "Naar de inhoud": focus op de inhoud zonder de #pagina te wisselen
  $$('.skiplink').forEach(a => a.addEventListener('click', e => {
    const doel = $('main'); if (!doel) return;
    e.preventDefault(); doel.tabIndex = -1; doel.focus();
  }));
  // Zwevende offerteknop (mobiel): alleen als er geen andere offerteknop of het formulier in beeld is
  const fabRedenen = new Set();
  const zetFab = () => { if (fab) fab.classList.toggle('is-hidden', fabRedenen.size > 0); };
  if (fab && 'IntersectionObserver' in window) {
    const fabIo = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) fabRedenen.add(e.target); else fabRedenen.delete(e.target); });
      zetFab();
    });
    $$('.hero__cta, .cta-band, #boek-form, .footer').forEach(el => fabIo.observe(el));
  }
  if (nav) addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 40), { passive: true });
  // Bovenaan een pagina staat de kop: daar geen zwevende knop overheen
  const fabBoven = () => { if (scrollY < 480) fabRedenen.add('boven'); else fabRedenen.delete('boven'); zetFab(); };
  addEventListener('scroll', fabBoven, { passive: true });
  fabBoven();

  /* ================= Homepage: één pagina tegelijk (via #hash) ================= */
  const pages = $$('.page');
  const basisTitel = document.title;
  if (pages.length) {
    let huidige = null;
    // Tarieven en FAQ hebben in het Nederlands eigen pagina's; oude links (/#prijzen, /#faq) sturen door
    const VERHUISD = { prijzen: 'tarieven/', calculator: 'tarieven/#calculator', faq: 'faq/' };
    const route = () => {
      const id = decodeURIComponent(location.hash.slice(1)) || 'home';
      if (!EN && VERHUISD[id]) { location.replace(VERHUISD[id]); return; }
      const doel = document.getElementById(id);
      const page = (doel && doel.closest('.page')) || $('#home');
      if (page !== huidige) {
        pages.forEach(p => { p.hidden = p !== page; });
        page.classList.remove('page--in'); void page.offsetWidth; page.classList.add('page--in');
        huidige = page;
        document.title = page.id === 'home' ? basisTitel : `${page.dataset.titel || page.id} · Beck on the Rocks`;
        telBezoek(t('/', '/en/') + (page.id === 'home' ? '' : '#' + page.id), document.title);
      }
      // Taalknop: blijf op dezelfde pagina in de andere taal
      $$('.taal').forEach(a => { a.href = a.dataset.basis + (page.id === 'home' ? '' : '#' + page.id); });
      $$('#menu a').forEach(a => {
        if (a.getAttribute('href') === '#' + page.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
      if (nav) nav.classList.toggle('is-solid', page.id !== 'home');
      if (page.id === 'boeken') fabRedenen.add('boeken'); else fabRedenen.delete('boeken');
      zetFab();
      document.dispatchEvent(new CustomEvent('beck:pagina', { detail: page.id }));
      if (doel && doel !== page) doel.scrollIntoView();
      else scrollTo(0, 0);
    };
    addEventListener('hashchange', route);
    route();
  } else {
    // Losse pagina (landingspagina, visitekaartje): menu-item van deze pagina markeren
    $$('#menu a').forEach(a => { const u = new URL(a.href); if (!u.hash && u.pathname === location.pathname) a.setAttribute('aria-current', 'page'); });
    telBezoek(location.pathname, document.title);
  }

  /* ================= Scroll-animaties ================= */
  // Zonder JavaScript of met "minder beweging" is alles meteen zichtbaar (zie .js .reveal in site.css)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
    }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 80}ms`; io.observe(el); });
  } else $$('.reveal').forEach(el => el.classList.add('is-visible'));

  /* ================= Cocktailkaart (menukaart per categorie) ================= */
  const grid = $('#cocktail-grid');
  if (grid) {
    const GROEP = {
      klassiek: t('Klassiekers', 'Classics'), fris: t('Fris & fruitig', 'Fresh & fruity'),
      mocktail: t('Alcoholvrij', 'Alcohol-free'), creatie: t('Op maat', 'Bespoke')
    };
    grid.innerHTML = Object.keys(GROEP).map(cat => `
      <section class="menu-groep menu-groep--${cat}" data-cat="${cat}" aria-labelledby="groep-${cat}">
        <h3 class="menu-groep__titel" id="groep-${cat}">${GROEP[cat]}</h3>
        <ul class="menu-lijst">${COCKTAILS.filter(c => c.cat === cat).map(c => `
          <li class="menu-item" style="--c:${c.c1}">
            <h4>${c.titel || c.naam}</h4>
            <p>${c.tekst}</p>
            <p class="menu-item__ing">${c.ing.join(' · ')}</p>
          </li>`).join('')}
        </ul>
      </section>`).join('');
    $$('.filter').forEach(btn => btn.addEventListener('click', () => {
      $$('.filter').forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', b === btn); });
      const f = btn.dataset.filter;
      $$('.menu-groep', grid).forEach(g => { g.hidden = f !== 'alle' && g.dataset.cat !== f; });
    }));
  }

  /* ================= Formulieren: controle met duidelijke meldingen ================= */
  // Elk verplicht veld krijgt bij een fout een melding eronder (data-fout bepaalt de tekst).
  // Ingevulde gegevens blijven altijd staan.
  function zetFout(el, tekst) {
    if (!el.id) el.id = `${el.form ? el.form.id : 'veld'}-${el.name}`;
    let melding = document.getElementById(el.id + '-fout');
    if (tekst && !melding) {
      melding = document.createElement('span');
      melding.className = 'veldfout'; melding.id = el.id + '-fout';
      (el.type === 'checkbox' ? el.closest('label') : el).insertAdjacentElement(el.type === 'checkbox' ? 'beforeend' : 'afterend', melding);
      el.setAttribute('aria-describedby', melding.id);
    }
    if (melding) melding.textContent = tekst;
    el.classList.toggle('is-invalid', !!tekst);
    if (tekst) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }
  const isGeldig = el => el.type === 'checkbox' ? el.checked : el.checkValidity() && el.value.trim() !== '';
  const foutTekst = el => el.dataset.fout || t('Dit veld is verplicht.', 'This field is required.');
  function valideer(form) {
    let eerste = null;
    $$('[required]', form).forEach(el => {
      const ok = isGeldig(el);
      zetFout(el, ok ? '' : foutTekst(el));
      if (!ok && !eerste) eerste = el;
    });
    if (eerste) eerste.focus();
    return !eerste;
  }
  function liveControle(form) {
    const check = e => { const el = e.target; if (el.classList && el.classList.contains('is-invalid')) zetFout(el, isGeldig(el) ? '' : foutTekst(el)); };
    form.addEventListener('input', check);
    form.addEventListener('change', check);
  }
  // Spambescherming naast de honeypot (botcheck). Let op: wie de Web3Forms-sleutel direct misbruikt,
  // houd je alleen tegen via de instellingen van Web3Forms zelf.
  const paginaGeladen = Date.now();
  const LOG = 'beck-verzonden';
  function spamCheck(tekst) {
    if (Date.now() - paginaGeladen < 3000) return 'bot'; // binnen 3 seconden ingevuld en verstuurd: geen mens
    if ((String(tekst || '').match(/https?:\/\/|www\./gi) || []).length > 2)
      return t('Je bericht bevat te veel links. Haal ze weg, of mail me je bericht.', 'Your message contains too many links. Please remove them, or email me instead.');
    try {
      const log = JSON.parse(localStorage.getItem(LOG) || '[]').filter(x => Date.now() - x < 10 * 60e3);
      if (log.length >= 3) return t('Je hebt net al een paar berichten verstuurd. Probeer het over tien minuten nog eens, of mail me.', 'You have just sent a few messages. Please try again in ten minutes, or email me.');
    } catch { /* geen opslag: geen limiet */ }
    return '';
  }
  function telVerzonden() {
    try {
      const log = JSON.parse(localStorage.getItem(LOG) || '[]').filter(x => Date.now() - x < 10 * 60e3);
      localStorage.setItem(LOG, JSON.stringify([...log, Date.now()]));
    } catch { /* geen opslag */ }
  }
  // Bevestigingsmail aan de klant via EmailJS (alleen als config.js is ingevuld).
  // De tekst staat vast in de template bij EmailJS; we sturen alleen deze velden mee, nooit het vrije bericht.
  const EJS = CONFIG.emailjs || {};
  const bevestigingAan = !!(EJS.service && EJS.template && EJS.publicKey);
  function stuurBevestiging(d) {
    if (!bevestigingAan) return Promise.resolve(false);
    const datum = new Date(d.datum + 'T00:00').toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: EJS.service, template_id: (EN && EJS.templateEn) || EJS.template, user_id: EJS.publicKey,
        template_params: {
          to_email: d.email.trim(), naam: d.naam.trim().split(/\s+/)[0], datum,
          soort: soortTekst(d.soort), locatie: d.locatie || '-', gasten: d.gasten || '-'
        }
      })
    }).then(r => r.ok).catch(() => false);
  }
  async function verstuur(json) {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: WEB3FORMS_SLEUTEL, botcheck: false, ...json })
    });
    const antwoord = await res.json().catch(() => ({}));
    if (!res.ok || antwoord.success === false) throw new Error(antwoord.message || 'Versturen mislukt');
  }

  /* ================= Prijscalculator ================= */
  const boekForm = $('#boek-form');
  const cU = $('#c-uren');
  if (cU) {
    const cD = $('#c-datum'), cC = $('#c-cocktails'), cF = $('#c-fruitpers');
    cD.min = vandaagIso();
    const bereken = () => {
      const uren = +cU.value, spoed = isSpoed(cD.value), fp = cF.checked;
      const uurprijs = TARIEF.uur * (fp ? 1 + TARIEF.fruitpers : 1);
      $('#c-uren-out').textContent = uren;
      const regels = [
        [t(`${uren} uur achter de bar × ${euro(uurprijs)}`, `${uren} ${uren === 1 ? 'hour' : 'hours'} behind the bar × ${euro(uurprijs)}`), uren * uurprijs],
        [t(`Voorbereiding (${TARIEF.voorbereiding} uur, altijd)`, `Preparation (${TARIEF.voorbereiding} hour, always)`), TARIEF.voorbereiding * uurprijs],
        [t(`Cocktailmenu (${cC.value} ${+cC.value === 1 ? 'cocktail' : 'cocktails'}) & materialen, vanaf`,
          `Cocktail menu (${cC.value} ${+cC.value === 1 ? 'cocktail' : 'cocktails'}) & equipment, from`), fp ? TARIEF.menuFruitpers : TARIEF.menu]
      ];
      const basis = regels.reduce((s, r) => s + r[1], 0);
      if (spoed) regels.push([t(`Spoedtoeslag (+${TARIEF.spoed * 100}%)`, `Short-notice surcharge (+${TARIEF.spoed * 100}%)`), basis * TARIEF.spoed, true]);
      const totaal = regels.reduce((s, r) => s + r[1], 0);
      $('#c-lines').innerHTML = regels.map(([l, b, isSpoedRegel]) => `<li${isSpoedRegel ? ' class="is-spoed"' : ''}><span>${l}</span><b>${euro(b)}</b></li>`).join('');
      $('#c-totaal').textContent = euro(totaal);
      const verleden = cD.value && cD.value < vandaagIso();
      $('#c-detail').textContent = (spoed
        ? t('Spoedboeking: je feest is binnen een maand.', 'Short-notice booking: your party is within a month.')
        : verleden ? t('Deze datum ligt in het verleden.', 'This date is in the past.')
        : cD.value ? t('Normaal tarief: meer dan een maand vooruit geboekt.', 'Standard rate: booked more than a month ahead.')
          : t('Vul een datum in om te zien of er spoedtoeslag geldt.', 'Enter a date to see whether a short-notice surcharge applies.'))
        + t(' Reiskosten komen er nog bij.', ' Travel costs are added on top.');
    };
    [cU, cD, cC, cF].forEach(el => { el.addEventListener('input', bereken); el.addEventListener('change', bereken); });
    bereken();

    // "Vraag een offerte aan": neem de berekening mee naar het aanvraagformulier
    $('#c-cta').addEventListener('click', e => {
      if (!boekForm) {
        // Formulier staat op de homepage: gegevens via de link meegeven
        e.preventDefault();
        const q = new URLSearchParams({ via: 'calculator', uren: cU.value, cocktails: cC.value });
        if (cF.checked) q.set('fruitpers', 'ja');
        if (cD.value) q.set('datum', cD.value);
        location.href = `/?${q}#boeken`;
        return;
      }
      const f = boekForm.elements;
      f.uren.value = cU.value;
      f.cocktails.value = cC.value;
      f.fruitpers.checked = cF.checked;
      if (cD.value) f.datum.value = cD.value;
      f.datum.dispatchEvent(new Event('input'));
      const meer = $('.form__meer', boekForm); if (meer) meer.open = true;
    });
  }

  /* ================= Reviews ================= */
  // Volledige lijst op de reviewpagina; op home en de landingspagina's één uitgelichte review (#review-teaser)
  const reviewLijst = $('#reviews-lijst'), teaser = $('#review-teaser'), zegel = $('#review-zegel');
  if (reviewLijst || teaser || zegel) {
    const zetLink = (id, url) => { const a = $(id); if (a && url) { a.href = url; a.hidden = false; } };
    zetLink('#google-review', GOOGLE_REVIEW_SCHRIJVEN);
    zetLink('#google-profiel', GOOGLE_REVIEWS_BEKIJKEN);
    const sterren = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    const maandJaar = d => { const x = new Date(d + 'T00:00'); return isNaN(x) ? '' : x.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' }); };

    // Lijst met goedgekeurde reviews ophalen: 1 verzoek voor de map, daarna de bestanden zelf
    const laadEigen = async () => {
      try { const c = JSON.parse(localStorage.getItem('beck-reviews')); if (c && Date.now() - c.t < 6 * 3600e3) return c.r; } catch { /* geen cache */ }
      const res = await fetch(`https://api.github.com/repos/${REVIEWS_REPO}/contents/${REVIEWS_MAP}?ref=main`, { headers: { Accept: 'application/vnd.github+json' } });
      if (!res.ok) return [];
      const bestanden = (await res.json()).filter(f => f.type === 'file' && f.name.endsWith('.json'));
      const reviews = (await Promise.all(bestanden.map(f => fetch(f.download_url).then(r => r.ok ? r.json() : null).catch(() => null))))
        .filter(r => r && r.tekst && r.naam);
      try { localStorage.setItem('beck-reviews', JSON.stringify({ t: Date.now(), r: reviews })); } catch { /* privémodus */ }
      return reviews;
    };
    // Google-reviews: elke ochtend opgehaald door tools/google_reviews.py, staan op onze eigen site
    const laadGoogle = () => fetch('/assets/data/google-reviews.json').then(r => r.ok ? r.json() : null).catch(() => null);
    const laadReviews = async () => {
      const [eigen, google] = await Promise.all([laadEigen().catch(() => []), laadGoogle()]);
      toonReviews(eigen, google || {});
    };
    const veilig = u => /^https:\/\//.test(u || '') ? u : '';
    const toonReviews = (eigen, google) => {
      // Staat dezelfde review op beide plekken, dan tonen en tellen we hem één keer
      const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
      const eigenTekst = new Set(eigen.map(r => norm(r.tekst)));
      const gAlle = (google.reviews || []).filter(r => r && r.tekst);
      const dubbel = gAlle.filter(r => eigenTekst.has(norm(r.tekst)));
      const gReviews = gAlle.filter(r => !eigenTekst.has(norm(r.tekst))).map(r => ({ ...r, bron: 'google' }));
      const gAantal = Math.max(0, (+google.aantal || 0) - dubbel.length);
      const gSom = Math.max(0, (+google.score || 0) * (+google.aantal || 0) - dubbel.reduce((s, r) => s + (+r.sterren || 5), 0));
      const reviews = [...eigen, ...gReviews];
      const aantal = eigen.length + gAantal;
      if (!aantal && !reviews.length) return;
      reviews.sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
      const bronTekst = r => r.bron === 'google' ? 'Google' : soortTekst(r.soort || '');
      if (teaser && reviews.length) {
        const r = reviews.slice().sort((a, b) => (+b.sterren || 0) - (+a.sterren || 0))[0];
        const bron = bronTekst(r);
        teaser.innerHTML = `<p>“${esc(r.tekst)}”</p><footer>${esc(r.naam)}${bron ? ' · ' + esc(bron) : ''} · <a href="${location.pathname.startsWith('/cocktail-') ? '/' : ''}#reviews" class="tekstlink">${t('Alle reviews', 'All reviews')}</a></footer>`;
        teaser.hidden = false;
      }
      const gem = (eigen.reduce((s, r) => s + (Math.min(5, Math.max(1, +r.sterren || 5))), 0) + gSom) / aantal;
      const gemTekst = gem.toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      // Vertrouwenszegel onder de offerteknop bovenaan de homepage
      if (zegel) {
        zegel.innerHTML = `<span class="stars" aria-hidden="true">${sterren(Math.round(gem))}</span><strong>${gemTekst}</strong><span>${aantal} ${aantal === 1 ? 'review' : 'reviews'}</span>`;
        zegel.setAttribute('aria-label', t(`Beoordeling ${gemTekst} van 5 uit ${aantal} reviews`, `Rated ${gemTekst} out of 5 from ${aantal} reviews`));
        zegel.hidden = false;
      }
      if (!reviewLijst) return;
      const gLogo = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';
      // Eén review tegelijk, groot; bladeren met pijltjes of vegen, schuift vanzelf door
      reviewLijst.innerHTML = `<div class="reviews-lijst__baan" aria-live="polite">${reviews.map((r, i) => {
        const n = Math.min(5, Math.max(1, Math.round(+r.sterren) || 5));
        const datum = r.datum ? ' · ' + esc(maandJaar(r.datum)) : '';
        const bron = r.bron === 'google'
          ? (veilig(r.link) ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${gLogo.replace('<svg', '<svg class="review__g"')}Google</a>` : 'Google')
          : esc(soortTekst(r.soort || ''));
        return `<blockquote class="review${r.tekst.length > 220 ? ' review--lang' : ''}${i ? '' : ' is-actief'}" aria-roledescription="${t('review', 'review')}" aria-label="${i + 1} / ${reviews.length}"${i ? ' aria-hidden="true"' : ''}>
          <p>${esc(r.tekst)}</p>
          <footer><strong>${esc(r.naam)}</strong><div class="stars" role="img" aria-label="${t(`${n} van 5 sterren`, `${n} out of 5 stars`)}">${sterren(n)}</div><span>${bron}${datum}</span></footer>
        </blockquote>`;
      }).join('')}</div>${reviews.length > 1 ? `<div class="reviews-lijst__nav">
        <button type="button" data-stap="-1" aria-label="${t('Vorige review', 'Previous review')}">←</button>
        <button type="button" data-stap="1" aria-label="${t('Volgende review', 'Next review')}">→</button>
        <span class="reviews-lijst__teller">01 / ${String(reviews.length).padStart(2, '0')}</span>
        <span class="reviews-lijst__balk" aria-hidden="true"><i></i></span>
      </div>` : ''}`;
      reviewLijst.setAttribute('role', 'region');
      reviewLijst.setAttribute('aria-roledescription', t('carrousel', 'carousel'));
      reviewLijst.setAttribute('aria-label', t('Reviews van gasten', 'Guest reviews'));
      reviewLijst.hidden = !reviews.length;
      const slides = [...reviewLijst.querySelectorAll('.review')];
      let huidig = 0, timer = null;
      const toon = i => {
        huidig = (i + slides.length) % slides.length;
        slides.forEach((el, j) => { el.classList.toggle('is-actief', j === huidig); el.toggleAttribute('aria-hidden', j !== huidig); });
        const teller = reviewLijst.querySelector('.reviews-lijst__teller');
        if (teller) teller.textContent = `${String(huidig + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
        const balk = reviewLijst.querySelector('.reviews-lijst__balk i');
        if (balk) balk.style.width = `${(huidig + 1) / slides.length * 100}%`;
      };
      const stop = () => { clearInterval(timer); timer = null; };
      const auto = () => { stop(); if (slides.length > 1 && !matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => toon(huidig + 1), 8000); };
      reviewLijst.querySelectorAll('[data-stap]').forEach(k => k.addEventListener('click', () => { toon(huidig + +k.dataset.stap); auto(); }));
      reviewLijst.addEventListener('mouseenter', stop);
      reviewLijst.addEventListener('mouseleave', auto);
      reviewLijst.addEventListener('focusin', stop);
      let x0 = null;
      reviewLijst.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
      reviewLijst.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - (x0 ?? 0);
        if (x0 !== null && Math.abs(dx) > 40) toon(huidig + (dx < 0 ? 1 : -1));
        x0 = null; auto();
      });
      toon(0); auto();
      const gLink = veilig(google.url)
        ? `<a href="${esc(google.url)}" target="_blank" rel="noopener">${t('Bekijk op Google', 'See on Google')}</a>` : 'Google';
      const score = $('#review-score');
      score.innerHTML = `<span class="review-score__label">${t('Beoordeling', 'Rating')}</span>
        <strong>${gemTekst}</strong>
        <div class="stars" aria-hidden="true">${sterren(Math.round(gem))}</div>
        <span>${t('Gebaseerd op', 'Based on')} ${aantal} ${aantal === 1 ? 'review' : 'reviews'}</span>
        ${gAantal ? `<span class="review-score__g">${gLogo}${gAantal} ${t('op', 'on')} Google · ${gLink}</span>` : ''}`;
      score.hidden = false;
      $('#review-intro').textContent = t('Ik hoor graag hoe jij het vond. Je review helpt anderen kiezen.', 'I would love to hear what you thought. Your review helps others choose.');
    };
    // Pas laden als iemand de reviews opent: scheelt verzoeken aan GitHub (max. 60 per uur per IP-adres)
    let geladen = false;
    const start = () => { if (geladen) return; geladen = true; laadReviews().catch(() => { /* geen verbinding met GitHub: alleen de oproep tonen */ }); };
    const pagina = reviewLijst && reviewLijst.closest('.page');
    if (reviewLijst && (!pagina || !pagina.hidden)) start();
    document.addEventListener('beck:pagina', e => { if (e.detail === 'reviews') start(); });
    // Het zegel staat bovenaan: laden zodra de browser even niets te doen heeft
    if (zegel) (window.requestIdleCallback || (f => setTimeout(f, 1500)))(start);
    // De uitgelichte review laadt pas als het blok eromheen in beeld komt
    if (teaser && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(e => { if (e.some(x => x.isIntersecting)) { start(); io.disconnect(); } }, { rootMargin: '300px' });
      io.observe(teaser.parentElement);
    }
  }

  // Review schrijven
  const reviewForm = $('#review-form');
  if (reviewForm) {
    liveControle(reviewForm);
    $('#review-schrijf').addEventListener('click', () => {
      reviewForm.hidden = false; $('#review-knoppen').hidden = true;
      $('[name=naam]', reviewForm).focus();
    });
    const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'review';
    reviewForm.addEventListener('submit', async e => {
      e.preventDefault();
      const note = $('#review-note');
      note.classList.remove('is-fout');
      if (!valideer(reviewForm)) { note.textContent = t('Controleer de gemarkeerde velden.', 'Please check the highlighted fields.'); note.classList.add('is-fout'); return; }
      const d = Object.fromEntries(new FormData(reviewForm));
      if (d.botcheck) return;

      const datum = vandaagIso();
      const review = { naam: d.naam.trim(), sterren: +d.sterren, soort: d.soort, tekst: d.tekst.trim(), datum };
      const pad = `${REVIEWS_MAP}/${datum}-${slug(review.naam)}-${Math.random().toString(36).slice(2, 6)}.json`;
      const goedkeuren = `https://github.com/${REVIEWS_REPO}/new/main?filename=${encodeURIComponent(pad)}`
        + `&value=${encodeURIComponent(JSON.stringify(review, null, 2) + '\n')}`
        + `&message=${encodeURIComponent('Review van ' + review.naam + ' goedgekeurd')}`;
      const velden = {
        'Naam': review.naam, 'Sterren': `${'★'.repeat(review.sterren)} (${review.sterren}/5)`, 'Soort feest': review.soort,
        'Review': review.tekst, 'E-mail reviewer': d.email || '-', ...(EN ? { 'Taal': 'Engels' } : {}),
        'GOEDKEUREN (publiceren op de site)': goedkeuren,
        'Afwijzen': 'Doe niets: de review verschijnt dan niet.'
      };
      const onderwerp = `Nieuwe review van ${review.naam} (${review.sterren}/5)`;
      const spam = spamCheck(review.tekst);
      if (spam === 'bot') { reviewForm.hidden = true; $('#review-klaar').hidden = false; return; } // doen alsof, niets versturen
      if (spam) { note.textContent = spam; note.classList.add('is-fout'); return; }
      if (!WEB3FORMS_SLEUTEL) {
        location.href = `mailto:${MAIL}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(Object.entries(velden).map(([k, v]) => `${k}: ${v}`).join('\n'))}`;
        return;
      }
      const knop = $('#review-knop');
      knop.disabled = true; knop.textContent = t('Versturen…', 'Sending…');
      try {
        await verstuur({ subject: onderwerp, from_name: 'Beck on the Rocks · reviews', ...(d.email ? { replyto: d.email } : {}), ...velden });
        reviewForm.hidden = true; reviewForm.reset();
        telVerzonden();
        telBezoek('review-verstuurd', 'Review verstuurd', true);
        const klaar = $('#review-klaar'); klaar.hidden = false; klaar.focus();
      } catch {
        note.textContent = t(`Het versturen is niet gelukt. Probeer het later nog eens, of mail je review naar ${MAIL}.`, `Sending failed. Please try again later, or email your review to ${MAIL}.`);
        note.classList.add('is-fout');
      } finally {
        knop.disabled = false; knop.textContent = t('Verstuur review', 'Send review');
      }
    });
  }

  /* ================= Quiz ================= */
  const quiz = $('#quiz-form');
  if (quiz) {
    const UITSLAG = {
      'zoet-ja': 'Pornstar Martini', 'zuur-ja': 'Daiquiri', 'bitter-ja': 'Negroni',
      'zoet-nee': 'Virgin Colada', 'zuur-nee': 'Virgin Mojito', 'bitter-nee': 'Virgin Mule'
    };
    const SFEER = EN
      ? { strand: 'With your toes in the sand:', lounge: 'Sunk deep into a jazz lounge:', feest: 'Between two dances:' }
      : { strand: 'Met je tenen in het zand,', lounge: 'Lekker weggezakt bij de jazz,', feest: 'Tussen twee dansjes door,' };
    quiz.addEventListener('submit', e => {
      e.preventDefault();
      const f = new FormData(quiz);
      const res = $('#quiz-result');
      if (!f.get('q1') || !f.get('q2') || !f.get('q3')) {
        res.innerHTML = `<p>${t('Beantwoord eerst alle drie de vragen.', 'Please answer all three questions first.')}</p>`;
        res.hidden = false; return;
      }
      let naam = UITSLAG[`${f.get('q1')}-${f.get('q3')}`];
      if (f.get('q2') === 'lounge' && f.get('q3') === 'ja' && f.get('q1') !== 'zuur') naam = 'Old Fashioned';
      if (f.get('q2') === 'strand' && f.get('q3') === 'ja' && f.get('q1') === 'zoet') naam = 'Piña Colada';
      const c = COCKTAILS.find(x => x.naam === naam);
      res.innerHTML = `<p class="eyebrow">${t('Jouw match', 'Your match')}</p><h3>${c.titel || c.naam}</h3><p>${SFEER[f.get('q2')]} ${c.tekst.charAt(0).toLowerCase() + c.tekst.slice(1)}</p>`
        + `<a class="btn btn--small" href="#boeken">${t('Zet hem op jouw kaart', 'Put it on your menu')}</a>`;
      res.hidden = false;
    });
  }

  /* ================= Aanvraagformulier ================= */
  // Aanvragen gaan via Web3Forms (sleutel in assets/js/config.js) direct naar je mail.
  // De veldnamen in de mail blijven Nederlands: zo leest de generator ze in.
  if (boekForm) {
    liveControle(boekForm);
    const fDatum = boekForm.elements.datum;
    fDatum.min = vandaagIso();
    fDatum.addEventListener('input', () => { $('#form-spoed').hidden = !isSpoed(fDatum.value); });
    // Vanaf een landingspagina: /?soort=Bedrijfsborrel#boeken vult het type feest alvast in
    const soort = params.get('soort');
    if (soort && [...boekForm.elements.soort.options].some(o => o.value === soort)) boekForm.elements.soort.value = soort;
    // Vanuit de calculator op /tarieven/: uren, cocktails, fruitpers en datum alvast invullen
    if (params.get('via') === 'calculator') {
      const f = boekForm.elements;
      if (/^\d{1,2}$/.test(params.get('uren') || '')) f.uren.value = params.get('uren');
      if (/^[1-5]$/.test(params.get('cocktails') || '')) f.cocktails.value = params.get('cocktails');
      f.fruitpers.checked = params.get('fruitpers') === 'ja';
      if (/^\d{4}-\d{2}-\d{2}$/.test(params.get('datum') || '')) { f.datum.value = params.get('datum'); f.datum.dispatchEvent(new Event('input')); }
      const meer = $('.form__meer', boekForm); if (meer) meer.open = true;
    }

    const note = $('#form-note'), noteTekst = note.textContent;
    boekForm.addEventListener('submit', async e => {
      e.preventDefault();
      note.classList.remove('is-fout');
      if (!valideer(boekForm)) {
        note.textContent = t('Controleer de gemarkeerde velden. Wat je al hebt ingevuld blijft staan.', 'Please check the highlighted fields. Everything you entered is kept.');
        note.classList.add('is-fout');
        return;
      }
      const d = Object.fromEntries(new FormData(boekForm));
      if (d.botcheck) return; // spambot

      const velden = {
        'Naam': d.naam.trim(), 'E-mail': d.email.trim(), 'Telefoon klant': d.telefoon || '-', 'Datum': d.datum, 'Aantal uur': d.uren || '-',
        'Gasten': d.gasten || '-', 'Soort feest': d.soort, 'Locatie': d.locatie || '-',
        'Cocktails op de kaart': d.cocktails, 'Fruitpers': d.fruitpers ? 'ja' : 'nee', 'Glazen via Rutger': d.glazen ? 'ja' : 'nee',
        'Spoedboeking': isSpoed(d.datum) ? 'ja (binnen 1 maand)' : 'nee', 'Bericht': d.bericht || '-',
        ...(params.get('via') ? { 'Via pagina': params.get('via') } : {}),
        ...(campagne ? { 'Via campagne': campagne } : {}),
        ...(EN ? { 'Taal': 'Engels (antwoord in het Engels)' } : {})
      };
      const onderwerp = `Aanvraag ${d.soort} op ${d.datum}`;
      const naarMail = () => {
        const body = Object.entries(velden).map(([k, v]) => `${k}: ${v}`).join('\n');
        location.href = `mailto:${MAIL}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(body)}`;
      };
      const spam = spamCheck(d.bericht);
      if (spam === 'bot') { toonBedankt(velden); return; } // doen alsof, niets versturen
      if (spam) { note.textContent = spam; note.classList.add('is-fout'); return; }
      if (!WEB3FORMS_SLEUTEL) { naarMail(); note.textContent = t('Dank je! Je mailprogramma opent nu met je aanvraag.', 'Thank you! Your email app will now open with your request.'); return; }

      const knop = $('#form-knop'), knopTekst = knop.textContent;
      knop.disabled = true; knop.textContent = t('Versturen…', 'Sending…');
      try {
        await verstuur({ subject: onderwerp, from_name: 'Beck on the Rocks · website', replyto: d.email, ...velden });
        toonBedankt(velden);
        // Bevestiging naar de klant; mislukt dat, dan merkt de klant niets (jouw mail is al binnen)
        if (bevestigingAan) {
          const gelukt = await stuurBevestiging(d);
          if (gelukt) $('#form-klaar-mail').hidden = false;
        }
        telVerzonden();
        telBezoek('aanvraag-verstuurd', 'Aanvraag verstuurd', true);
        if (campagne) telBezoek('aanvraag-via/' + campagne, 'Aanvraag via ' + campagne, true);
        boekForm.reset();
        $('#form-spoed').hidden = true;
        note.textContent = noteTekst;
      } catch {
        note.innerHTML = t('Het versturen is niet gelukt. Je gegevens staan er nog. Probeer het opnieuw, of <a href="#" id="form-mail">verstuur je aanvraag via je mail</a>.',
          'Sending failed. Your details are still there. Please try again, or <a href="#" id="form-mail">send your request by email</a>.');
        note.classList.add('is-fout');
        $('#form-mail').addEventListener('click', ev => { ev.preventDefault(); naarMail(); });
      } finally {
        knop.disabled = false; knop.textContent = knopTekst;
      }
    });

    const toonBedankt = velden => {
      const toon = ['Datum', 'Soort feest', 'Gasten', 'Locatie', 'Aantal uur', 'Cocktails op de kaart'];
      const KOP_EN = { Datum: 'Date', 'Soort feest': 'Type of event', 'Aantal uur': 'Hours', Gasten: 'Guests', Locatie: 'Location', 'Cocktails op de kaart': 'Cocktails on the menu' };
      const KOP_NL = { 'Soort feest': 'Type feest' };
      const waarde = k => k === 'Datum' ? new Date(velden[k] + 'T00:00').toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })
        : k === 'Soort feest' ? soortTekst(velden[k]) : velden[k];
      $('#form-samenvatting').innerHTML = toon.filter(k => velden[k] && velden[k] !== '-')
        .map(k => `<li><span>${EN ? KOP_EN[k] : KOP_NL[k] || k}</span><b>${esc(waarde(k))}</b></li>`).join('');
      boekForm.hidden = true;
      const klaar = $('#form-klaar');
      klaar.hidden = false; klaar.focus();
      klaar.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    };
    $('#form-opnieuw').addEventListener('click', () => {
      $('#form-klaar').hidden = true; boekForm.hidden = false;
      boekForm.elements.naam.focus();
    });
  }

  $$('[data-jaar]').forEach(el => { el.textContent = new Date().getFullYear(); });

  // KvK-nummer en btw-regel: invullen in assets/js/config.js, dan verschijnen ze vanzelf
  if (CONFIG.kvk) $$('[data-kvk]').forEach(el => { el.querySelector('span').textContent = CONFIG.kvk; el.hidden = false; });
  const BTW = {
    kor: t('Ik val onder de kleineondernemersregeling (KOR): je betaalt geen btw.', 'I use the Dutch small business scheme (KOR): no VAT is charged.'),
    incl: t('Alle prijzen zijn inclusief btw.', 'All prices include VAT.')
  };
  if (BTW[CONFIG.btw]) $$('[data-btw]').forEach(el => { el.textContent = BTW[CONFIG.btw]; el.hidden = false; });
})();
