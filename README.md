# Beck on the Rocks · website

Eerste versie van de website voor Beck on the Rocks, freelance bartender.
Live op **https://beckontherocks.nl** (GitHub Pages, domein via `CNAME`).
Gewone HTML, CSS en JavaScript: geen build-stap nodig. Open `index.html` in je browser
of zet de map op een host als Netlify, Vercel of GitHub Pages.

## Opbouw
Eén homescreen; de andere pagina's open je via het menu (Over mij, Cocktails, Diensten,
Prijzen, Reviews, FAQ, Boek mij). Elke pagina is een `<div class="page">` in `index.html`.

## Prijzen en voorwaarden
- €45 per uur achter de bar
- Altijd 1 uur voorbereiding (€45) en vanaf €75 voor cocktailmenu & gebruik materialen (basis 3 cocktails, 1–5 mogelijk)
- Met fruitpers (vers geperste sappen): uurtarief +20% (€54) en menu vanaf €99
- Reiskosten €0,25 per km (heel Nederland); glazen in overleg, vanaf €0,50 per glas
- Boeken binnen 1 maand voor het feest: spoedtoeslag van 25% over alle kosten
- Geen aanbetaling; annuleren binnen 14 dagen: 20% van het afgesproken bedrag
- Klant regelt drank, ijs, ingrediënten en een werkplek

Bedragen aanpassen? Doe dat op de pagina Prijzen in `index.html` én in `TARIEF`
bovenaan `assets/js/main.js` (voor de calculator).

## Boekingsformulier (Web3Forms)
Aanvragen gaan via [Web3Forms](https://web3forms.com) direct naar je mail, zonder dat de klant
zijn mailprogramma opent. Vraag op web3forms.com gratis een *Access Key* aan met rutger@beck.nl
en zet die bij `web3forms` in `assets/js/config.js`.
Zonder sleutel opent het formulier het mailprogramma van de klant (zoals voorheen).
Kopieer een binnengekomen aanvraag in **Slim invullen** van de generator voor een offerte.

## Statistieken (GoatCounter)
Bezoekersstatistieken zonder cookies (dus geen cookiebanner nodig). Maak gratis een account op
[goatcounter.com](https://www.goatcounter.com) en zet de gekozen code (bijv. `beckontherocks`) bij `goatcounter`
in `assets/js/config.js`. Elke pagina (Home, Prijzen, Reviews, …) wordt apart geteld, plus de gebeurtenissen
*aanvraag-verstuurd* en *review-verstuurd*. Bezoeken vanaf localhost en de generator worden niet geteld.

## Reviews
Klanten schrijven een review via het formulier op de reviewpagina. Je krijgt een mail met een
**GOEDKEUREN**-link; daarmee zet je de review met één commit in de map `reviews/`, waarna hij op de
site verschijnt. Zie `reviews/LEESMIJ.md`.

Google reviews: plak je links bij `GOOGLE_REVIEW_SCHRIJVEN` en `GOOGLE_REVIEWS_BEKIJKEN` bovenaan
`assets/js/main.js`; de Google-knoppen verschijnen dan vanzelf. Zet de review-link ook in de generator
(Mijn gegevens & tarieven), dan komt hij op je facturen.

## Nog zelf invullen vóór livegang
- **Reviews**: nog geen; zie "Google reviews koppelen".
- **Foto's**: staan in `assets/img/` (portret + sfeerbeelden). Meer foto's toevoegen kan in de galerij op de pagina "Over mij".
- **Contactgegevens**: zakelijk telefoonnummer (nu privénummer), Instagram, KvK na inschrijving (footer + generator).
- **Cocktails**: lijst `COCKTAILS` bovenaan `assets/js/main.js`.

Kleuren en lettertypes staan als variabelen bovenaan `assets/css/style.css`.

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
- **Back-up**: download al je documenten en gegevens als bestand en zet ze terug op een andere telefoon/computer.

Vul eenmalig je gegevens in onder **Mijn gegevens & tarieven** (adres, KvK, IBAN, btw).
Alles wordt alleen in je eigen browser opgeslagen, dus gebruik steeds dezelfde browser
en bewaar de PDF's zelf (bijv. in een map per jaar).
