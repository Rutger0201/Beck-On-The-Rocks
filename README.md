# Beck on the Rocks · website

Eerste versie van de website voor Beck on the Rocks, freelance bartender.
Live op **https://beckontherocks.nl** (GitHub Pages, domein via `CNAME`).
Gewone HTML, CSS en JavaScript: geen build-stap nodig. Open `index.html` in je browser
of zet de map op een host als Netlify, Vercel of GitHub Pages.

## Opbouw
- `index.html`: homepage met de andere onderdelen via het menu (Cocktails, Tarieven, Over mij, FAQ,
  Offerte aanvragen; Reviews via de footer). Elk onderdeel is een `<div class="page">`
  en opent via een #-link, bijvoorbeeld `/#prijzen`.
- `cocktail-bartender-privefeest/` en `cocktail-bartender-bedrijfsfeest/`: losse landingspagina's voor
  Google, met eigen titel, beschrijving, FAQ en structured data. De knoppen gaan naar het aanvraagformulier
  met `?via=privefeest` of `?via=bedrijfsfeest`; dat zie je terug in de mail als *Via pagina*.
- `tarieven/` en `faq/`: eigen pagina's voor de tarieven (met calculator) en veelgestelde vragen, zodat Google ze apart
  kan tonen. Oude links (`/#prijzen`, `/#faq`) sturen automatisch door. In de Engelse versie staan ze nog als onderdeel van `en/`.
- `privacy/`: privacyverklaring, gelinkt in de footer en bij elk formulier. Gebruik je een nieuwe dienst
  (ander formulier, mailprogramma, statistieken), pas deze tekst dan aan.
- `kaart/`: digitaal visitekaartje (niet in Google) voor je NFC-tag en QR-code, met
  "Opslaan in contacten" (`kaart/rutger-beck-on-the-rocks.vcf`).
- Foto's staan in `assets/img/`; de verkleinde WebP/JPG-versies die de site laadt in `assets/img/w/`.
  Nieuwe foto? Maak er ook versies van 480, 800 en 1200 px breed van in die map.
- Lettertypes (Cormorant Garamond en Jost voor de site, Inter voor admin en documenten) staan zelf gehost in `assets/fonts/` via `assets/css/fonts.css`:
  sneller en er gaat geen IP-adres naar Google.
- De cocktailkaart is een menukaart per categorie; de kleur van de stip is `c1` in de lijst `COCKTAILS`.

### NFC-tag en QR-code
- **NFC-tag of -kaartje**: schrijf met de gratis app *NFC Tools* de link
  `https://beckontherocks.nl/kaart/?ref=nfc` op de tag (Schrijven → Record toevoegen → URL).
- **QR-code**: `assets/img/qr-beckontherocks.svg` (of `.png`) linkt naar `https://beckontherocks.nl/?ref=qr`.
  Staat ook op het visitekaartje, zodat iemand hem van je scherm kan scannen.
- Met GoatCounter aan zie je bij de bronnen hoeveel bezoekers via `nfc` en `qr` kwamen.

### Engelse versie (`en/index.html`)
Dezelfde site in het Engels op https://beckontherocks.nl/en/, met een NL/EN-knop in het menu
(je blijft op dezelfde pagina). Pas je tekst aan in `index.html`, doe dat dan ook in `en/index.html`.
De teksten in JavaScript (cocktails, calculator, meldingen) staan in `assets/js/main.js`:
de Engelse cocktailteksten in `COCKTAILS_EN`, de rest via `t('Nederlands', 'English')`.
Aanvragen van de Engelse site komen gewoon in het Nederlands binnen, met de regel
*Taal: Engels*, zodat de generator ze net zo inleest.

## Prijzen en voorwaarden
Alle tarieven staan op één plek: **`tarieven.json`** (uurtarief, voorbereiding, cocktailmenu, fruitpers, reiskosten,
glazen, spoed, annuleren, betaaltermijn). Zo pas je een prijs aan:

1. Open `tarieven.json` op GitHub, klik op het potlood, wijzig het bedrag en klik op *Commit changes*.
2. De GitHub-actie *Tarieven bijwerken* zet daarna binnen een minuut alle bedragen op de site goed: tekst, voorbeelden,
   calculator, meta-omschrijvingen en de gegevens voor Google (ook de FAQ). Kijk bij *Actions* of hij groen is.
3. De offerte-generator neemt de nieuwe tarieven vanzelf over en meldt dat bij het openen.

Zelf draaien kan ook: `python3 tools/tarieven.py` (bijwerken) of `python3 tools/tarieven.py --controleer`.
Bedragen in de HTML staan in `<span data-t="…">`; nieuwe bedragen in een tekst krijgen zo'n label, anders worden ze niet bijgewerkt.

Huidige afspraken: uurtarief, altijd voorbereiding, cocktailmenu (vanaf; basis 3 cocktails, 1–5 mogelijk), fruitpers als
toeslag op het uurtarief met een duurder menu, reiskosten per km (heel Nederland), glazen in overleg, spoedtoeslag bij
boeken binnen 1 maand, geen aanbetaling, annuleringskosten binnen de annuleringstermijn. Klant regelt drank, ijs,
ingrediënten, een werkplek en een gootsteen met stromend water.

## Boekingsformulier (Web3Forms)
Aanvragen gaan via [Web3Forms](https://web3forms.com) direct naar je mail, zonder dat de klant
zijn mailprogramma opent. Vraag op web3forms.com gratis een *Access Key* aan met info@beckontherocks.nl
en zet die bij `web3forms` in `assets/js/config.js`.
Zonder sleutel opent het formulier het mailprogramma van de klant (zoals voorheen).
Kopieer een binnengekomen aanvraag in **Slim invullen** van de generator voor een offerte.

### Bevestigingsmail aan de klant (EmailJS)
Na een geslaagde aanvraag krijgt de klant een bevestiging via [EmailJS](https://www.emailjs.com) (gratis tot ca. 200 mails/maand).
Aanzetten: vul in `assets/js/config.js` bij `emailjs` de `service`, `template` en `publicKey` in (en eventueel `templateEn`
voor Engelse aanvragen). De template bij EmailJS gebruikt de velden `{{to_email}}`, `{{naam}}`, `{{datum}}`, `{{soort}}`,
`{{locatie}}` en `{{gasten}}`. Het vrije bericht van de klant gaat bewust niet mee, zodat niemand via je account eigen
teksten kan versturen. Stel in EmailJS (Account → Security) zo mogelijk in dat alleen beckontherocks.nl mag versturen.

### Spambescherming
Naast het verborgen honeypot-veld: een formulier dat binnen 3 seconden na het laden wordt verstuurd, gaat pas na die
3 seconden weg (zo gaat een snelle echte aanvraag, bijvoorbeeld met autofill vanuit de calculator, niet verloren); berichten met meer dan 2 links worden geweigerd; per browser kunnen er maximaal
3 berichten per 10 minuten worden verstuurd. Misbruik van de Web3Forms-sleutel buiten de site om stop je alleen in
het dashboard van Web3Forms (spamfilter, eventueel hCaptcha).

## Statistieken (GoatCounter)
Bezoekersstatistieken zonder cookies (dus geen cookiebanner nodig). Maak gratis een account op
[goatcounter.com](https://www.goatcounter.com) en zet de gekozen code (bijv. `beckontherocks`) bij `goatcounter`
in `assets/js/config.js`. Elke pagina (Home, Prijzen, Reviews, …) wordt apart geteld, plus de gebeurtenissen
*aanvraag-verstuurd* en *review-verstuurd*. Bezoeken vanaf localhost en de generator worden niet geteld.

## Reviews
Klanten schrijven een review via het formulier op de reviewpagina. Je krijgt een mail met een
**GOEDKEUREN**-link; daarmee zet je de review met één commit in de map `reviews/`, waarna hij op de
site verschijnt. Zie `reviews/LEESMIJ.md`.

Google reviews: de links staan in `assets/js/config.js` (`google.review` en `google.profiel`). Daarmee
verschijnen de Google-knoppen op de reviewpagina (NL en EN). De review-link staat ook op het visitekaartje
en in de generator (Mijn gegevens & tarieven), zodat hij in de factuurmail komt. De profiellink staat ook
in de bedrijfsgegevens voor Google (`sameAs` in `index.html` en `en/index.html`).

Google-reviews op de site: de actie *Google-reviews ophalen* (`.github/workflows/google-reviews.yml`) draait
elke ochtend `tools/google_reviews.py`. Die haalt de score, het aantal en (max. 5) reviews op via de Google
Places API en zet ze in `assets/data/google-reviews.json`. De reviewpagina toont ze samen met de eigen reviews
(dubbele één keer) en rekent één gemiddelde uit. Eenmalig instellen:
1. Google Cloud Console → nieuw project → *Places API (New)* aanzetten (vraagt een betaalaccount; dit gebruik
   valt ruim binnen het gratis maandtegoed). Zet voor de zekerheid een budgetwaarschuwing van € 1.
2. *Credentials* → API-sleutel maken → beperken tot *Places API (New)*.
3. GitHub → Settings → Secrets and variables → Actions → *New repository secret* `GOOGLE_PLACES_KEY`.
4. Actions → *Google-reviews ophalen* → *Run workflow*. Het Place ID wordt de eerste keer op naam gezocht en
   bewaard; vindt hij je profiel niet, zet het Place ID dan als variable `GOOGLE_PLACE_ID`.

## Mogelijke klussen (`admin/`)
`https://beckontherocks.nl/admin/` toont de beste events en oproepen voor de komende maand, met een score,
waarom het past en knoppen om een offerte te mailen, de pagina te bekijken of het event weg te klikken.
De pagina staat niet in Google (noindex, niet in de sitemap).

De actie *Events zoeken* (`.github/workflows/events.yml`) draait op maandag en donderdag `tools/events.py`. Die zoekt in
de agenda's uit `tools/event-instellingen.json` (pagina's met schema.org-events of iCal-links) en, als er een
sleutel is, laat Claude op het web zoeken naar openbare events en oproepen als "barman gezocht". Er wordt nergens
ingelogd. De lijst komt **versleuteld** in `assets/data/events.enc.json`: zonder wachtwoord is hij onleesbaar.
Eenmalig instellen:
1. GitHub → Settings → Secrets and variables → Actions → *New repository secret* `ADMIN_WACHTWOORD` (kies een lang
   wachtwoord; dit typ je op de adminpagina).
2. Optioneel: secret `ANTHROPIC_API_KEY` (console.anthropic.com) voor het zoeken met Claude. Zonder deze sleutel
   worden alleen de agenda's uit de instellingen gebruikt. Reken op een paar euro per maand.
3. Vul in `tools/event-instellingen.json` je `woonplaats`, `max_km` en `plaatsen` in de buurt in. Agenda's toevoegen
   kan onder `bronnen`; de woorden onder `plus` en `min` bepalen de score.
4. Actions → *Events zoeken* → *Run workflow*.

Wachtwoord veranderd? Draai de actie opnieuw, dan wordt de lijst met het nieuwe wachtwoord versleuteld.

## Marketingcentrum (`admin/`, tabblad Marketing)
Op dezelfde adminpagina staat het tabblad **Marketing**: de 10 tot 20 beste marketingkansen voor de komende 30 dagen,
elk met doelgroep, score (1-100), waarom, platform, datum, complete tekst, beeldsuggestie, call-to-action, hashtags,
kosten en impact. Je kunt teksten aanpassen, goedkeuren, afwijzen, inplannen (ook in je agenda) en kopiëren.
Er is een kalender met dag-, week- en maandweergave waarin ook je mogelijke klussen staan. Er wordt niets gepubliceerd zonder
jouw akkoord. Elke tekst wordt gecontroleerd op alcoholreclameregels en 18+.

De actie *Marketing bijwerken* (`.github/workflows/marketing.yml`) draait elke nacht `tools/marketing/`, en elke maandag
doet een geplande Claude-taak webonderzoek (trends, zoekwoorden, concurrenten, kansen) met bronnen en datums.
Alles is versleuteld met hetzelfde `ADMIN_WACHTWOORD`. Uitleg, bestanden en het formaat van het onderzoek staan in
`tools/marketing/LEESMIJ.md`. Seizoensmomenten en vaste ideeën pas je aan in `tools/marketing/kalender.json` en `ideeen.json`.
Met een GitHub-token (Instellingen op de adminpagina) kun je teksten laten verbeteren of nieuwe ideeën laten bedenken met AI
(gratis via GitHub Models). Het tabblad Resultaten toont bezoekers, bronnen en aanvragen per post zodra het secret
`GOATCOUNTER_TOKEN` is ingesteld, plus wekelijks advies en een SEO-controle.
Wil je dat posts vanzelf online gaan, koppel dan Instagram, Facebook en/of LinkedIn (stappen onder Instellingen op de
adminpagina) en zet een ingeplande post op *Automatisch plaatsen*; de actie *Marketing publiceren* plaatst hem dan op tijd.
Het tabblad Groei helpt met betaalde campagnes (stappen en controlelijst; je zet ze zelf aan, er wordt nooit geld
uitgegeven) en met samenwerkingen (partnerlijst en mailvoorbeelden; je verstuurt elke mail zelf).

## Nog zelf invullen vóór livegang
- **Reviews**: de eerste staan erop; Google reviews zijn gekoppeld (zie hierboven).
- **Foto's**: staan in `assets/img/` (portret + sfeerbeelden). Meer foto's toevoegen kan in de galerij op de pagina "Over mij".
- **Contactgegevens**: zakelijk telefoonnummer (nu privénummer) en Instagram.
- **KvK**: vul na je inschrijving `kvk` in `assets/js/config.js` in; het nummer verschijnt dan in elke footer.
  Laat het daarna ook vast in de HTML zetten, zodat het er ook zonder JavaScript staat (wettelijk verplicht).
- **Btw**: zet `btw` in `assets/js/config.js` op `'kor'` (geen btw) of `'incl'` (prijzen incl. btw); de regel verschijnt
  dan bij de tarieven. Reken je 21%, dan moeten consumentenprijzen inclusief btw zijn: bedragen eerst aanpassen.
- **Cocktails**: lijst `COCKTAILS` bovenaan `assets/js/main.js`.

## Vormgeving (design system)
De publieke pagina's gebruiken `assets/css/site.css` (stijl "Editorial Luxury": ivoor, papier en houtskool met één messingtint).
Bovenaan staan alle tokens: kleuren, lettergroottes, ruimte, breekpunten en bewegingstijden. Componenten gebruiken alleen
de betekenistokens (`--bg`, `--text`, `--muted`, `--line`, `--accent`, `--btn-bg` …), zodat je de look op één plek aanpast.

- Een donkere sectie maak je met `class="section section--donker"`: alle knoppen, lijnen en teksten erin passen zich vanzelf aan.
  `section--alt` geeft het lichtere papier. Wissel licht en donker af, maak niet alles donker.
- Foto's krijgen automatisch een warme, ingetogen kleurcorrectie zodat ze bij elkaar passen.
- Beweging staat uit voor bezoekers met "minder beweging" in hun systeeminstellingen.
- Pas je `site.css` of `main.js` aan, verhoog dan het `?v=`-nummer achter de link in alle HTML-pagina's
  (`grep -rl 'site.css?v=' --include=*.html .`). Anders houden telefoons tot 10 minuten de oude versie vast
  en kan nieuwe HTML er met oude opmaak uitzien (zoals een uitgerekte banner).
- De publieke pagina's hebben een Content-Security-Policy (meta-tag in de `<head>`) met de sha256-hash van het kleine
  themascript daaronder (het visitekaartje: zijn eigen inline script onderaan). Pas je dat script aan, zet dan de nieuwe hash in alle pagina's; `python3 tools/csp_controle.py`
  (draait in de PR-check en na elke wijziging op main) zegt welke pagina's niet kloppen. Een nieuwe externe dienst (script, API) moet in die policy staan.
- Admin, `documenten.html` en `akkoord.html` gebruiken ook `site.css`, met daarnaast hun eigen bestand voor wat alleen zij hebben
  (`admin/marketing.css`, `assets/css/documenten.css`, `assets/css/akkoord.css`). De print/PDF van offertes blijft wit papier.

## Logo
- `assets/img/logo-mark.png`: alleen het beeldmerk (B met cocktailglas), transparant. Gebruikt in menu en footer.
- `assets/img/logo-dark.png`: volledig logo voor donkere achtergronden (homepage).
- `assets/img/logo-light.png`: volledig logo voor lichte achtergronden (offertes en facturen).
- `assets/icons/`: favicon en app-iconen, gemaakt van het beeldmerk.
- `assets/img/origineel/`: de originele logobestanden.

## Offertes & facturen (`documenten.html`)
Een eigen hulpmiddel om offertes en facturen te maken. Niet gelinkt vanaf de website;
open het via `documenten.html` (https://beckontherocks.nl/documenten.html).

- Kies **Offerte**, **Factuur** of **Annulering** (factuur voor 20% annuleringskosten).
- Vul klant en feest in; de uren worden berekend uit begin- en eindtijd (ook over middernacht).
- Tarieven, voorbereiding, menu, spoedtoeslag (automatisch binnen 1 maand) en btw worden doorgerekend.
- Extra regels toevoegen voor bijvoorbeeld reiskosten of parkeren.
- **Opslaan & printen / PDF** bewaart het document en opent het printvenster (kies "Opslaan als PDF").
- **Maak factuur van deze offerte** neemt alle gegevens over en verwijst naar het offertenummer.
- Nummers lopen automatisch op: `O-2026-001` voor offertes, `F-2026-001` voor facturen.

### Slim invullen
Sleep een bestand in het blok **Slim invullen** (of plak tekst / een screenshot met Ctrl+V).
De generator zoekt naam, bedrijf, e-mail, telefoon, adres, datum, begin- en eindtijd, soort feest,
locatie, aantal gasten en gewenste cocktails, en laat je eerst controleren wat hij overneemt.
Werkt met: mails (.eml of geplakte tekst), WhatsApp-export (.txt), PDF, Word (.docx), HTML en
screenshots/foto's (tekstherkenning in het Nederlands). Alles gebeurt lokaal in de browser.
De bibliotheken hiervoor staan in `assets/vendor/` (zie de README daar).

### Snelkoppeling / app
De generator is installeerbaar als app (`documenten.webmanifest` + `sw.js`), werkt daarna ook
offline en heeft snelkoppelingen voor *Nieuwe offerte* en *Nieuwe factuur*. Uitleg staat in de
generator onder **Snelkoppeling / app**. Directe links: `documenten.html?type=offerte` of `?type=factuur`.

### Overzicht, versturen en back-up
- **📋 Overzicht**: alle offertes en facturen met bedrag en status (concept, verstuurd, akkoord, betaald).
  Facturen over de vervaldatum zijn rood ("te laat"). Bovenaan: openstaand, te laat, betaald dit jaar.
- **WhatsApp / Mail**: opent een kant-en-klaar bericht aan de klant (voeg zelf de PDF toe) en zet de status op *verstuurd*.
- **Online akkoord** (`akkoord.html`): bij een offerte zit in het bericht een link waarmee de klant de offerte
  bekijkt en akkoord geeft, eventueel met een opmerking, of eerst een vraag stelt. Het antwoord komt via Web3Forms
  in je mail; zet daarna zelf de status op *akkoord*.
- **Boodschappenlijst**: kies de cocktails; op basis van gasten, uren, % cocktaildrinkers en cocktails p.p. per uur
  rekent de generator uit wat de klant moet halen (flessen, fruit, siropen, ijs), met marge. Recepten volgens de
  officiële IBA-specificaties in `assets/js/recepten.js`. Te printen als A4/PDF of te delen via WhatsApp.
- **Betaalherinnering**: bij een factuur zet *In agenda* een afspraak in Google Agenda op de vervaldatum
  (factuurdatum + betaaltermijn, standaard 14 dagen). De link in die afspraak opent de factuur met de
  knoppen om de herinnering via WhatsApp of mail te sturen. In het overzicht zie je welke facturen een
  herinnering nodig hebben en wanneer je er een hebt gestuurd.
- **Controlecode in de akkoordlink**: elke akkoordlink is ondertekend met een geheime sleutel die alleen in jouw
  generator (en je back-up) staat. In de akkoordmail staat *Controleren (voor Rutger)*: open die link op het apparaat
  met je generator. Je ziet dan of de offerte ongewijzigd is, of dat iemand het bedrag in de link heeft aangepast.
- **Back-up**: download al je documenten en gegevens als bestand en zet ze terug op een andere telefoon/computer.

Vul eenmalig je gegevens in onder **Mijn gegevens & tarieven** (adres, KvK, IBAN, btw).
Alles wordt alleen in je eigen browser opgeslagen, dus gebruik steeds dezelfde browser
en bewaar de PDF's zelf (bijv. in een map per jaar).
