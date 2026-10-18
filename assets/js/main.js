// Beck on the Rocks: interactie
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

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

  const LABELS = { klassiek: 'Klassieker', fris: 'Fris & fruitig', mocktail: 'Alcoholvrij', creatie: 'Op maat' };

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

  /* ================= Cocktailkaart ================= */
  const grid = $('#cocktail-grid');
  grid.innerHTML = COCKTAILS.map(c => `
    <article class="card reveal" data-cat="${c.cat}">
      <div class="card__visual" style="--c1:${c.c1};--c2:${c.c2}">
        <span class="card__tag">${LABELS[c.cat]}</span>
        ${glasSvg(c.glas)}
      </div>
      <div class="card__body">
        <h3>${c.naam}</h3>
        <p>${c.tekst}</p>
        <div class="card__ing">${c.ing.map(i => `<span>${i}</span>`).join('')}</div>
      </div>
    </article>`).join('');

  $$('.filter').forEach(btn => btn.addEventListener('click', () => {
    $$('.filter').forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-selected', b === btn); });
    const f = btn.dataset.filter;
    $$('.card', grid).forEach(card => card.classList.toggle('is-hidden', f !== 'alle' && card.dataset.cat !== f));
  }));

  /* ================= Navigatie: één pagina tegelijk ================= */
  const nav = $('.nav'), toggle = $('.nav__toggle'), menu = $('#menu'), fab = $('.fab');
  const pages = $$('.page');
  let huidige = null;

  function route() {
    const id = decodeURIComponent(location.hash.slice(1)) || 'home';
    const doel = document.getElementById(id);
    const page = (doel && doel.closest('.page')) || $('#home');
    if (page !== huidige) {
      pages.forEach(p => { p.hidden = p !== page; });
      page.classList.remove('page--in'); void page.offsetWidth; page.classList.add('page--in');
      huidige = page;
      document.title = page.id === 'home' ? 'Beck on the Rocks · Freelance bartender'
        : `${$(`#menu a[href="#${page.id}"]`)?.textContent || ''} · Beck on the Rocks`;
    }
    $$('#menu a').forEach(a => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + page.id));
    nav.classList.toggle('is-solid', page.id !== 'home');
    fab.classList.toggle('is-hidden', page.id === 'boeken');
    if (doel && doel !== page) doel.scrollIntoView();
    else scrollTo(0, 0);
  }
  addEventListener('hashchange', route);
  route();

  addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 40), { passive: true });

  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu openen');
    menu.classList.toggle('is-open', open);
  });
  $$('a', menu).forEach(a => a.addEventListener('click', () => {
    toggle.setAttribute('aria-expanded', 'false');
    menu.classList.remove('is-open');
  }));

  /* ================= Scroll-animaties & tellers ================= */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-visible');
    io.unobserve(e.target);
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 80}ms`; io.observe(el); });

  const tel = el => {
    const doel = +el.dataset.count, start = performance.now(), duur = 1600;
    const stap = t => {
      const p = Math.min(1, (t - start) / duur);
      el.textContent = Math.round(doel * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(stap);
    };
    requestAnimationFrame(stap);
  };
  const io2 = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { tel(e.target); io2.unobserve(e.target); }
  }));
  $$('[data-count]').forEach(el => io2.observe(el));

  /* ================= Prijscalculator ================= */
  const euro = n => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const isSpoed = datum => {
    if (!datum) return false;
    const grens = new Date(); grens.setHours(0, 0, 0, 0); grens.setMonth(grens.getMonth() + 1);
    return new Date(datum + 'T00:00') < grens;
  };
  const vandaag = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const cU = $('#c-uren'), cD = $('#c-datum');
  cD.min = vandaag;
  $('#boek-form [name=datum]').min = vandaag;

  const cC = $('#c-cocktails'), cF = $('#c-fruitpers'), cK = $('#c-km'), cG = $('#c-glazen');
  function bereken() {
    const uren = +cU.value, spoed = isSpoed(cD.value), fp = cF.checked;
    const uurprijs = TARIEF.uur * (fp ? 1 + TARIEF.fruitpers : 1);
    const km = Math.max(0, +cK.value || 0), glazen = Math.max(0, +cG.value || 0);
    $('#c-uren-out').textContent = uren;
    const regels = [
      [`${uren} uur bartender × ${euro(uurprijs)}`, uren * uurprijs],
      [`Voorbereiding (${TARIEF.voorbereiding} uur)`, TARIEF.voorbereiding * uurprijs],
      [`Cocktailmenu (${cC.value} ${+cC.value === 1 ? 'cocktail' : 'cocktails'}) & materialen, vanaf`, fp ? TARIEF.menuFruitpers : TARIEF.menu]
    ];
    if (km) regels.push([`Reiskosten ${km} km × ${euro(TARIEF.km)}`, km * TARIEF.km]);
    if (glazen) regels.push([`${glazen} glazen × ${euro(TARIEF.glas)}`, glazen * TARIEF.glas]);
    const basis = regels.reduce((t, r) => t + r[1], 0);
    if (spoed) regels.push([`Spoedtoeslag (+${TARIEF.spoed * 100}%)`, basis * TARIEF.spoed]);
    const totaal = regels.reduce((t, r) => t + r[1], 0);
    $('#c-lines').innerHTML = regels.map(([l, b]) => `<li${l.startsWith('Spoed') ? ' class="is-spoed"' : ''}><span>${l}</span><b>${euro(b)}</b></li>`).join('');
    $('#c-totaal').textContent = euro(totaal);
    $('#c-detail').textContent = (spoed
      ? 'Spoedboeking: je feest is binnen een maand.'
      : cD.value ? 'Normaal tarief: meer dan een maand vooruit geboekt.' : 'Vul een datum in om te zien of er spoedtoeslag geldt.')
      + (km ? '' : ' Reiskosten: €0,25 per km.');
  }
  [cU, cD, cC, cF, cK, cG].forEach(el => el.addEventListener('input', bereken));
  cF.addEventListener('change', bereken);
  bereken();

  $('#c-cta').addEventListener('click', () => {
    const f = $('#boek-form');
    f.elements.uren.value = cU.value;
    f.elements.cocktails.value = cC.value;
    f.elements.fruitpers.checked = cF.checked;
    f.elements.glazen.checked = +cG.value > 0;
    if (cD.value) f.elements.datum.value = cD.value;
    f.elements.datum.dispatchEvent(new Event('input'));
  });

  /* ================= Reviews ================= */
  const zetLink = (id, url) => { const a = $(id); if (url) { a.href = url; a.hidden = false; } };
  zetLink('#google-review', GOOGLE_REVIEW_SCHRIJVEN);
  zetLink('#google-profiel', GOOGLE_REVIEWS_BEKIJKEN);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sterren = n => '★'.repeat(n) + '☆'.repeat(5 - n);
  const maandJaar = d => { const x = new Date(d + 'T00:00'); return isNaN(x) ? '' : x.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }); };

  // Lijst met goedgekeurde reviews ophalen: 1 verzoek voor de map, daarna de bestanden zelf
  async function laadReviews() {
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
  }
  function toonReviews(reviews) {
    const lijst = $('#reviews-lijst');
    if (!reviews.length) return;
    reviews.sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
    lijst.innerHTML = reviews.map(r => {
      const n = Math.min(5, Math.max(1, Math.round(+r.sterren) || 5));
      return `<blockquote class="review">
        <div class="stars" aria-label="${n} van 5 sterren">${sterren(n)}</div>
        <p>${esc(r.tekst)}</p>
        <footer><strong>${esc(r.naam)}</strong><span>${esc(r.soort || '')}${r.datum ? ' · ' + esc(maandJaar(r.datum)) : ''}</span></footer>
      </blockquote>`;
    }).join('');
    lijst.hidden = false;
    const gem = reviews.reduce((t, r) => t + (Math.min(5, Math.max(1, +r.sterren || 5))), 0) / reviews.length;
    const score = $('#review-score');
    score.innerHTML = `<strong>${gem.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
      <div><div class="stars">${sterren(Math.round(gem))}</div><span>Gemiddeld uit ${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'}</span></div>`;
    score.hidden = false;
    $('#review-intro').textContent = 'Ik hoor graag hoe jij het vond. Je review helpt anderen kiezen.';
  }
  laadReviews().catch(() => { /* geen verbinding met GitHub: alleen de oproep tonen */ });

  // Review schrijven
  $('#review-schrijf').addEventListener('click', () => {
    $('#review-form').hidden = false; $('#review-knoppen').hidden = true;
    $('#review-form [name=naam]').focus();
  });
  const slug = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'review';
  $('#review-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target, note = $('#review-note');
    let ok = true;
    $$('[required]', form).forEach(el => {
      const geldig = el.type === 'checkbox' ? el.checked : el.checkValidity() && el.value.trim() !== '';
      el.classList.toggle('is-invalid', !geldig);
      if (!geldig) ok = false;
    });
    note.classList.remove('is-fout');
    if (!ok) { note.textContent = 'Vul je naam en review in (minstens 10 tekens) en geef toestemming om hem te plaatsen.'; note.classList.add('is-fout'); return; }
    const d = Object.fromEntries(new FormData(form));
    if (d.botcheck) return;

    const vandaagIso = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const review = { naam: d.naam.trim(), sterren: +d.sterren, soort: d.soort, tekst: d.tekst.trim(), datum: vandaagIso };
    const pad = `${REVIEWS_MAP}/${vandaagIso}-${slug(review.naam)}-${Math.random().toString(36).slice(2, 6)}.json`;
    const goedkeuren = `https://github.com/${REVIEWS_REPO}/new/main?filename=${encodeURIComponent(pad)}`
      + `&value=${encodeURIComponent(JSON.stringify(review, null, 2) + '\n')}`
      + `&message=${encodeURIComponent('Review van ' + review.naam + ' goedgekeurd')}`;
    const velden = {
      'Naam': review.naam, 'Sterren': `${sterren(review.sterren)} (${review.sterren}/5)`, 'Soort feest': review.soort,
      'Review': review.tekst, 'E-mail reviewer': d.email || '-',
      'GOEDKEUREN (publiceren op de site)': goedkeuren,
      'Afwijzen': 'Doe niets: de review verschijnt dan niet.'
    };
    const onderwerp = `Nieuwe review van ${review.naam} (${review.sterren}/5)`;
    const knop = $('#review-knop');
    if (!WEB3FORMS_SLEUTEL) {
      location.href = `mailto:${MAIL}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(Object.entries(velden).map(([k, v]) => `${k}: ${v}`).join('\n'))}`;
      return;
    }
    knop.disabled = true; knop.textContent = 'Versturen…';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: WEB3FORMS_SLEUTEL, subject: onderwerp, from_name: 'Beck on the Rocks · reviews', ...(d.email ? { replyto: d.email } : {}), botcheck: false, ...velden })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Versturen mislukt');
      form.hidden = true; form.reset();
      const klaar = $('#review-klaar'); klaar.hidden = false; klaar.focus();
    } catch {
      note.textContent = 'Het versturen is niet gelukt. Probeer het later nog eens, of mail je review naar rutger@beck.nl.';
      note.classList.add('is-fout');
    } finally {
      knop.disabled = false; knop.textContent = 'Verstuur review';
    }
  });

  /* ================= Quiz ================= */
  const UITSLAG = {
    'zoet-ja': 'Pornstar Martini', 'zuur-ja': 'Daiquiri', 'bitter-ja': 'Negroni',
    'zoet-nee': 'Virgin Colada', 'zuur-nee': 'Virgin Mojito', 'bitter-nee': 'Virgin Mule'
  };
  const SFEER = {
    strand: 'Met je tenen in het zand,', lounge: 'Lekker weggezakt bij de jazz,', feest: 'Tussen twee dansjes door,'
  };
  $('#quiz-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(e.target);
    let naam = UITSLAG[`${f.get('q1')}-${f.get('q3')}`];
    if (f.get('q2') === 'lounge' && f.get('q3') === 'ja' && f.get('q1') !== 'zuur') naam = 'Old Fashioned';
    if (f.get('q2') === 'strand' && f.get('q3') === 'ja' && f.get('q1') === 'zoet') naam = 'Piña Colada';
    const c = COCKTAILS.find(x => x.naam === naam);
    const res = $('#quiz-result');
    res.innerHTML = `<p class="eyebrow">Jouw match</p><h3>${c.naam}</h3><p>${SFEER[f.get('q2')]} ${c.tekst.charAt(0).toLowerCase() + c.tekst.slice(1)}</p>`;
    res.hidden = false;
  });

  /* ================= Boekingsformulier ================= */
  // Aanvragen gaan via Web3Forms (zie WEB3FORMS_SLEUTEL bovenaan) direct naar je mail.
  const MAIL = CONFIG.mail || 'rutger@beck.nl';
  const fDatum = $('#boek-form [name=datum]');
  fDatum.addEventListener('input', () => { $('#form-spoed').hidden = !isSpoed(fDatum.value); });
  $('#boek-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.target;
    let ok = true;
    $$('[required]', form).forEach(el => {
      const geldig = el.checkValidity() && el.value.trim() !== '';
      el.classList.toggle('is-invalid', !geldig);
      if (!geldig) ok = false;
    });
    const note = $('#form-note');
    note.classList.remove('is-fout');
    if (!ok) { note.textContent = 'Vul je naam, een geldig e-mailadres en de datum in.'; note.classList.add('is-fout'); return; }
    const d = Object.fromEntries(new FormData(form));
    if (d.botcheck) return; // spambot

    // Velden met duidelijke namen: zo staan ze ook zo in je mail (en leest de generator ze in)
    const velden = {
      'Naam': d.naam, 'E-mail': d.email, 'Telefoon klant': d.telefoon || '-', 'Datum': d.datum, 'Aantal uur': d.uren || '-',
      'Gasten': d.gasten || '-', 'Soort feest': d.soort, 'Locatie': d.locatie || '-',
      'Cocktails op de kaart': d.cocktails, 'Fruitpers': d.fruitpers ? 'ja' : 'nee', 'Glazen via Rutger': d.glazen ? 'ja' : 'nee',
      'Spoedboeking': isSpoed(d.datum) ? 'ja (binnen 1 maand)' : 'nee', 'Bericht': d.bericht || '-'
    };
    const onderwerp = `Aanvraag ${d.soort} op ${d.datum}`;
    const naarMail = () => {
      const body = Object.entries(velden).map(([k, v]) => `${k}: ${v}`).join('\n');
      location.href = `mailto:${MAIL}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(body)}`;
    };
    if (!WEB3FORMS_SLEUTEL) { naarMail(); note.textContent = 'Dank je! Je mailprogramma opent nu met je aanvraag.'; return; }

    const knop = $('#form-knop');
    knop.disabled = true; knop.textContent = 'Versturen…';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_SLEUTEL, subject: onderwerp, from_name: 'Beck on the Rocks · website',
          replyto: d.email, botcheck: false, ...velden
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || 'Versturen mislukt');
      toonBedankt(velden);
      form.reset();
      $('#form-spoed').hidden = true;
    } catch (err) {
      note.innerHTML = 'Het versturen is niet gelukt. Probeer het nog eens, of <a href="#" id="form-mail">verstuur je aanvraag via je mail</a>.';
      note.classList.add('is-fout');
      $('#form-mail').addEventListener('click', ev => { ev.preventDefault(); naarMail(); });
    } finally {
      knop.disabled = false; knop.textContent = 'Verstuur aanvraag';
    }
  });

  function toonBedankt(velden) {
    const toon = ['Datum', 'Soort feest', 'Aantal uur', 'Gasten', 'Locatie', 'Cocktails op de kaart'];
    $('#form-samenvatting').innerHTML = toon.filter(k => velden[k] && velden[k] !== '-')
      .map(k => `<li><span>${k}</span><b>${String(k === 'Datum' ? new Date(velden[k] + 'T00:00').toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) : velden[k]).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))}</b></li>`).join('');
    $('#boek-form').hidden = true;
    const klaar = $('#form-klaar');
    klaar.hidden = false; klaar.focus();
    klaar.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  $('#form-opnieuw').addEventListener('click', () => {
    $('#form-klaar').hidden = true; $('#boek-form').hidden = false;
    $('#form-note').textContent = 'Je kunt ook mailen naar rutger@beck.nl, bellen of appen naar 06 39 65 86 62.';
  });

  $('#jaar').textContent = new Date().getFullYear();
})();
