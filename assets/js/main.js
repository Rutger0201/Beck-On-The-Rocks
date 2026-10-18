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

  // glas: 'tumbler' | 'coupe' | 'highball' | 'martini'
  // De klassiekers uit de EBS-opleiding (European Bartender School), mocktails en cocktail op maat.
  const COCKTAILS = [
    { naam: 'Old Fashioned', cat: 'klassiek', glas: 'tumbler', c1: '#c77a2a', c2: '#2b1a0b',
      tekst: 'Bourbon, suiker en bitters, langzaam geroerd en afgemaakt met een sinaasappelzeste.',
      ing: ['Bourbon', 'Suiker', 'Angostura', 'Sinaasappel'] },
    { naam: 'Negroni', cat: 'klassiek', glas: 'tumbler', c1: '#c4362e', c2: '#2a0b08',
      tekst: 'Gin, Campari en zoete vermout in perfecte balans. Bitter, krachtig en tijdloos.',
      ing: ['Gin', 'Campari', 'Vermout'] },
    { naam: 'Espresso Martini', cat: 'klassiek', glas: 'martini', c1: '#6b4126', c2: '#140c07',
      tekst: 'Vodka, vers gezette espresso en koffielikeur met een romige kraag.',
      ing: ['Vodka', 'Espresso', 'Koffielikeur'] },
    { naam: 'Whiskey Sour', cat: 'klassiek', glas: 'coupe', c1: '#e3b25c', c2: '#2e200b',
      tekst: 'Bourbon, citroen en suiker, opgeschud tot een zijdezachte schuimkraag.',
      ing: ['Bourbon', 'Citroen', 'Suiker'] },
    { naam: 'Daiquiri', cat: 'klassiek', glas: 'coupe', c1: '#e8e2a0', c2: '#24260f',
      tekst: 'Witte rum, limoen en suiker. Simpel, fris en precies in balans.',
      ing: ['Witte rum', 'Limoen', 'Suiker'] },
    { naam: 'Cosmopolitan', cat: 'klassiek', glas: 'martini', c1: '#d0587a', c2: '#2a0d18',
      tekst: 'Citroenvodka, triple sec, cranberry en limoen. Een stijlvolle klassieker.',
      ing: ['Vodka', 'Triple sec', 'Cranberry', 'Limoen'] },
    { naam: 'Mojito', cat: 'fris', glas: 'highball', c1: '#8cc06b', c2: '#14261f',
      tekst: 'Witte rum, verse munt, limoen en suiker, aangevuld met soda.',
      ing: ['Witte rum', 'Munt', 'Limoen', 'Soda'] },
    { naam: 'Caipirinha', cat: 'fris', glas: 'tumbler', c1: '#b9d36a', c2: '#1f2a0d',
      tekst: 'Cachaça met gekneusde limoen en rietsuiker. Braziliaanse zomer.',
      ing: ['Cachaça', 'Limoen', 'Rietsuiker'] },
    { naam: 'Margarita', cat: 'fris', glas: 'coupe', c1: '#e6d77a', c2: '#2a2509',
      tekst: 'Tequila, triple sec en limoen met een zoutrandje.',
      ing: ['Tequila', 'Triple sec', 'Limoen', 'Zout'] },
    { naam: 'Pornstar Martini', cat: 'fris', glas: 'coupe', c1: '#f2a33a', c2: '#3a1f08',
      tekst: 'Vanillevodka en passievrucht met een shot bubbels ernaast. Altijd een hit.',
      ing: ['Vanillevodka', 'Passievrucht', 'Prosecco'] },
    { naam: 'Moscow Mule', cat: 'fris', glas: 'highball', c1: '#d9c08a', c2: '#2a200d',
      tekst: 'Vodka, limoen en pittige ginger beer. Fris met een kick.',
      ing: ['Vodka', 'Limoen', 'Ginger beer'] },
    { naam: 'Piña Colada', cat: 'fris', glas: 'highball', c1: '#f3e2b0', c2: '#2e2510',
      tekst: 'Rum, ananas en kokos, romig opgeschud. Vakantie in een glas.',
      ing: ['Rum', 'Ananas', 'Kokos'] },
    { naam: 'Virgin Mojito', cat: 'mocktail', glas: 'highball', c1: '#9ccf8a', c2: '#132519',
      tekst: 'Verse munt, limoen en suiker met soda. Alle frisheid, zonder alcohol.',
      ing: ['Munt', 'Limoen', 'Soda'] },
    { naam: 'Virgin Colada', cat: 'mocktail', glas: 'highball', c1: '#f0dca8', c2: '#2a2210',
      tekst: 'Ananas en kokos, romig en tropisch, zonder alcohol.',
      ing: ['Ananas', 'Kokos', 'Limoen'] },
    { naam: 'Virgin Mule', cat: 'mocktail', glas: 'highball', c1: '#d6b77a', c2: '#2a1e0b',
      tekst: 'Ginger beer, limoen en een vleugje bitter. Kruidig en verfrissend.',
      ing: ['Ginger beer', 'Limoen', 'Munt'] },
    { naam: 'Jouw cocktail', cat: 'creatie', glas: 'coupe', c1: '#c9a45c', c2: '#2b2010',
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

  // Tarieven (zelfde bedragen als op de prijzenpagina in index.html)
  const TARIEF = {
    uur: 45,            // per uur achter de bar
    voorbereiding: 1,   // altijd 1 uur voorbereiding
    menu: 75,           // cocktailmenu & gebruik materialen (vanaf)
    fruitpers: 0.20,    // uurtarief +20% met fruitpers
    menuFruitpers: 99,  // cocktailmenu met fruitpers (vanaf)
    km: 0.25,           // reiskosten per km
    glas: 0.50,         // glazen via mij, per glas (vanaf)
    spoed: 0.25,        // toeslag bij boeken binnen 1 maand
    annuleren: 0.20     // bij annuleren binnen 14 dagen
  };

  // Web3Forms (web3forms.com): boekingen en reviews gaan direct naar je mail.
  // Zonder sleutel opent het formulier het mailprogramma van de bezoeker.
  const CONFIG = window.BECK_CONFIG || {};
  const WEB3FORMS_SLEUTEL = CONFIG.web3forms || '';  // staat in assets/js/config.js

  // Goedgekeurde reviews staan als losse .json-bestanden in deze map van de repository
  const REVIEWS_REPO = 'Rutger0201/Beck-On-The-Rocks';
  const REVIEWS_MAP = 'reviews';

  // Google reviews: plak hier je links zodra je Google Bedrijfsprofiel er is
  const GOOGLE_REVIEW_SCHRIJVEN = '';  // bijv. https://g.page/r/XXXX/review
  const GOOGLE_REVIEWS_BEKIJKEN = '';  // bijv. de link naar je bedrijf op Google Maps

  /* ================= SVG-glazen ================= */
  function glasSvg(type) {
    const stroke = 'stroke="#fff" stroke-opacity=".55" stroke-width="2.5" fill="none"';
    const drink = 'fill="#fff" fill-opacity=".28"';
    switch (type) {
      case 'coupe': return `<svg viewBox="0 0 100 120"><path d="M14 22 Q14 62 50 62 Q86 62 86 22 Z" ${drink}/><path d="M10 18 Q10 66 50 66 Q90 66 90 18" ${stroke}/><path d="M50 66 V108 M30 110 H70" ${stroke}/></svg>`;
      case 'martini': return `<svg viewBox="0 0 100 120"><path d="M18 24 L82 24 L50 60 Z" ${drink}/><path d="M8 14 L92 14 L50 62 Z" ${stroke}/><path d="M50 62 V108 M30 110 H70" ${stroke}/><circle cx="64" cy="26" r="4" fill="#3a2414"/><circle cx="56" cy="30" r="4" fill="#3a2414"/></svg>`;
      case 'highball': return `<svg viewBox="0 0 100 120"><rect x="30" y="38" width="40" height="72" rx="3" ${drink}/><path d="M28 10 V108 Q28 112 32 112 H68 Q72 112 72 108 V10" ${stroke}/><path d="M60 2 L54 60" stroke="#fff" stroke-opacity=".7" stroke-width="3"/><rect x="36" y="50" width="14" height="14" rx="2" fill="#fff" fill-opacity=".3"/><rect x="48" y="70" width="14" height="14" rx="2" fill="#fff" fill-opacity=".25"/></svg>`;
      default: return `<svg viewBox="0 0 100 120"><path d="M16 56 H84 L80 104 Q80 110 74 110 H26 Q20 110 20 104 Z" ${drink}/><path d="M12 30 H88 L82 106 Q81 112 75 112 H25 Q19 112 18 106 Z" ${stroke}/><rect x="32" y="50" width="26" height="26" rx="4" fill="#fff" fill-opacity=".3" transform="rotate(-10 45 63)"/></svg>`;
    }
  }

  const MAIL = CONFIG.mail || 'rutger@beck.nl';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const vandaagIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const euro = n => '€ ' + n.toLocaleString(LOCALE, { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const isSpoed = datum => {
    if (!datum) return false;
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
  }
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', open);
      toggle.setAttribute('aria-label', open ? t('Menu sluiten', 'Close menu') : t('Menu openen', 'Open menu'));
      menu.classList.toggle('is-open', open);
    });
    $$('a', menu).forEach(a => a.addEventListener('click', sluitMenu));
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) { sluitMenu(); toggle.focus(); }
    });
  }
  // "Naar de inhoud": focus op de inhoud zonder de #pagina te wisselen
  $$('.skiplink').forEach(a => a.addEventListener('click', e => {
    const doel = $('main'); if (!doel) return;
    e.preventDefault(); doel.tabIndex = -1; doel.focus();
  }));
  if (nav) addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 40), { passive: true });

  /* ================= Homepage: één pagina tegelijk (via #hash) ================= */
  const pages = $$('.page');
  const basisTitel = document.title;
  if (pages.length) {
    let huidige = null;
    const route = () => {
      const id = decodeURIComponent(location.hash.slice(1)) || 'home';
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
      if (fab) fab.classList.toggle('is-hidden', page.id === 'boeken');
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
  // Zonder JavaScript of met "minder beweging" is alles meteen zichtbaar (zie .js .reveal in style.css)
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
    }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 80}ms`; io.observe(el); });
  } else $$('.reveal').forEach(el => el.classList.add('is-visible'));

  /* ================= Cocktailkaart ================= */
  const grid = $('#cocktail-grid');
  if (grid) {
    grid.innerHTML = COCKTAILS.map(c => `
      <article class="card reveal is-visible" data-cat="${c.cat}">
        <div class="card__visual" style="--c1:${c.c1};--c2:${c.c2}" aria-hidden="true">
          <span class="card__tag">${LABELS[c.cat]}</span>
          ${glasSvg(c.glas)}
        </div>
        <div class="card__body">
          <h3>${c.titel || c.naam}</h3>
          <p>${c.tekst}</p>
          <ul class="card__ing" aria-label="${t('Ingrediënten', 'Ingredients')}">${c.ing.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>
      </article>`).join('');
    $$('.filter').forEach(btn => btn.addEventListener('click', () => {
      $$('.filter').forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-pressed', b === btn); });
      const f = btn.dataset.filter;
      $$('.card', grid).forEach(card => { card.hidden = f !== 'alle' && card.dataset.cat !== f; });
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
    const cD = $('#c-datum'), cC = $('#c-cocktails'), cF = $('#c-fruitpers'), cK = $('#c-km'), cG = $('#c-glazen');
    cD.min = vandaagIso();
    const bereken = () => {
      const uren = +cU.value, spoed = isSpoed(cD.value), fp = cF.checked;
      const uurprijs = TARIEF.uur * (fp ? 1 + TARIEF.fruitpers : 1);
      const km = Math.max(0, +cK.value || 0), glazen = Math.max(0, +cG.value || 0);
      $('#c-uren-out').textContent = uren;
      const regels = [
        [t(`${uren} uur achter de bar × ${euro(uurprijs)}`, `${uren} ${uren === 1 ? 'hour' : 'hours'} behind the bar × ${euro(uurprijs)}`), uren * uurprijs],
        [t(`Voorbereiding (${TARIEF.voorbereiding} uur, altijd)`, `Preparation (${TARIEF.voorbereiding} hour, always)`), TARIEF.voorbereiding * uurprijs],
        [t(`Cocktailmenu (${cC.value} ${+cC.value === 1 ? 'cocktail' : 'cocktails'}) & materialen, vanaf`,
          `Cocktail menu (${cC.value} ${+cC.value === 1 ? 'cocktail' : 'cocktails'}) & equipment, from`), fp ? TARIEF.menuFruitpers : TARIEF.menu]
      ];
      if (km) regels.push([t(`Reiskosten ${km} km × ${euro(TARIEF.km)}`, `Travel ${km} km × ${euro(TARIEF.km)}`), km * TARIEF.km]);
      if (glazen) regels.push([t(`${glazen} glazen × ${euro(TARIEF.glas)}`, `${glazen} glasses × ${euro(TARIEF.glas)}`), glazen * TARIEF.glas]);
      const basis = regels.reduce((s, r) => s + r[1], 0);
      if (spoed) regels.push([t(`Spoedtoeslag (+${TARIEF.spoed * 100}%)`, `Short-notice surcharge (+${TARIEF.spoed * 100}%)`), basis * TARIEF.spoed, true]);
      const totaal = regels.reduce((s, r) => s + r[1], 0);
      $('#c-lines').innerHTML = regels.map(([l, b, isSpoedRegel]) => `<li${isSpoedRegel ? ' class="is-spoed"' : ''}><span>${l}</span><b>${euro(b)}</b></li>`).join('');
      $('#c-totaal').textContent = euro(totaal);
      $('#c-detail').textContent = (spoed
        ? t('Spoedboeking: je feest is binnen een maand.', 'Short-notice booking: your party is within a month.')
        : cD.value ? t('Normaal tarief: meer dan een maand vooruit geboekt.', 'Standard rate: booked more than a month ahead.')
          : t('Vul een datum in om te zien of er spoedtoeslag geldt.', 'Enter a date to see whether a short-notice surcharge applies.'))
        + (km ? '' : t(' Reiskosten (€0,25 per km) komen er nog bij.', ' Travel costs (€0.25 per km) are added on top.'));
    };
    [cU, cD, cC, cF, cK, cG].forEach(el => { el.addEventListener('input', bereken); el.addEventListener('change', bereken); });
    bereken();

    // "Vraag dit aan": neem de berekening mee naar het aanvraagformulier
    $('#c-cta').addEventListener('click', () => {
      if (!boekForm) return;
      const f = boekForm.elements;
      f.uren.value = cU.value;
      f.cocktails.value = cC.value;
      f.fruitpers.checked = cF.checked;
      f.glazen.checked = +cG.value > 0;
      if (cD.value) f.datum.value = cD.value;
      f.datum.dispatchEvent(new Event('input'));
      const meer = $('.form__meer', boekForm); if (meer) meer.open = true;
    });
  }

  /* ================= Reviews ================= */
  const reviewLijst = $('#reviews-lijst');
  if (reviewLijst) {
    const zetLink = (id, url) => { const a = $(id); if (a && url) { a.href = url; a.hidden = false; } };
    zetLink('#google-review', GOOGLE_REVIEW_SCHRIJVEN);
    zetLink('#google-profiel', GOOGLE_REVIEWS_BEKIJKEN);
    const sterren = n => '★'.repeat(n) + '☆'.repeat(5 - n);
    const maandJaar = d => { const x = new Date(d + 'T00:00'); return isNaN(x) ? '' : x.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' }); };

    // Lijst met goedgekeurde reviews ophalen: 1 verzoek voor de map, daarna de bestanden zelf
    const laadReviews = async () => {
      let reviews = null;
      try { const c = JSON.parse(sessionStorage.getItem('beck-reviews')); if (c && Date.now() - c.t < 5 * 60e3) reviews = c.r; } catch { /* geen cache */ }
      if (!reviews) {
        const res = await fetch(`https://api.github.com/repos/${REVIEWS_REPO}/contents/${REVIEWS_MAP}?ref=main`, { headers: { Accept: 'application/vnd.github+json' } });
        if (!res.ok) return;
        const bestanden = (await res.json()).filter(f => f.type === 'file' && f.name.endsWith('.json'));
        reviews = (await Promise.all(bestanden.map(f => fetch(f.download_url).then(r => r.ok ? r.json() : null).catch(() => null))))
          .filter(r => r && r.tekst && r.naam);
        try { sessionStorage.setItem('beck-reviews', JSON.stringify({ t: Date.now(), r: reviews })); } catch { /* privémodus */ }
      }
      toonReviews(reviews);
    };
    const toonReviews = reviews => {
      if (!reviews.length) return;
      reviews.sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
      reviewLijst.innerHTML = reviews.map(r => {
        const n = Math.min(5, Math.max(1, Math.round(+r.sterren) || 5));
        return `<blockquote class="review">
          <div class="stars" role="img" aria-label="${t(`${n} van 5 sterren`, `${n} out of 5 stars`)}">${sterren(n)}</div>
          <p>${esc(r.tekst)}</p>
          <footer><strong>${esc(r.naam)}</strong><span>${esc(soortTekst(r.soort || ''))}${r.datum ? ' · ' + esc(maandJaar(r.datum)) : ''}</span></footer>
        </blockquote>`;
      }).join('');
      reviewLijst.hidden = false;
      const gem = reviews.reduce((s, r) => s + (Math.min(5, Math.max(1, +r.sterren || 5))), 0) / reviews.length;
      const score = $('#review-score');
      score.innerHTML = `<strong>${gem.toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
        <div><div class="stars" aria-hidden="true">${sterren(Math.round(gem))}</div><span>${t('Gemiddeld uit', 'Average of')} ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}</span></div>`;
      score.hidden = false;
      $('#review-intro').textContent = t('Ik hoor graag hoe jij het vond. Je review helpt anderen kiezen.', 'I would love to hear what you thought. Your review helps others choose.');
    };
    laadReviews().catch(() => { /* geen verbinding met GitHub: alleen de oproep tonen */ });
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
      if (!WEB3FORMS_SLEUTEL) {
        location.href = `mailto:${MAIL}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(Object.entries(velden).map(([k, v]) => `${k}: ${v}`).join('\n'))}`;
        return;
      }
      const knop = $('#review-knop');
      knop.disabled = true; knop.textContent = t('Versturen…', 'Sending…');
      try {
        await verstuur({ subject: onderwerp, from_name: 'Beck on the Rocks · reviews', ...(d.email ? { replyto: d.email } : {}), ...velden });
        reviewForm.hidden = true; reviewForm.reset();
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
        ...(EN ? { 'Taal': 'Engels (antwoord in het Engels)' } : {})
      };
      const onderwerp = `Aanvraag ${d.soort} op ${d.datum}`;
      const naarMail = () => {
        const body = Object.entries(velden).map(([k, v]) => `${k}: ${v}`).join('\n');
        location.href = `mailto:${MAIL}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(body)}`;
      };
      if (!WEB3FORMS_SLEUTEL) { naarMail(); note.textContent = t('Dank je! Je mailprogramma opent nu met je aanvraag.', 'Thank you! Your email app will now open with your request.'); return; }

      const knop = $('#form-knop'), knopTekst = knop.textContent;
      knop.disabled = true; knop.textContent = t('Versturen…', 'Sending…');
      try {
        await verstuur({ subject: onderwerp, from_name: 'Beck on the Rocks · website', replyto: d.email, ...velden });
        toonBedankt(velden);
        telBezoek('aanvraag-verstuurd', 'Aanvraag verstuurd', true);
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
})();
