# Beck on the Rocks · website

Eerste versie van de website voor Beck on the Rocks, freelance bartender.
Gewone HTML, CSS en JavaScript: geen build-stap nodig. Open `index.html` in je browser
of zet de map op een host als Netlify, Vercel of GitHub Pages.

## Opbouw
Eén homescreen; de andere pagina's open je via het menu (Over mij, Cocktails, Diensten,
Prijzen, Reviews, FAQ, Boek mij). Elke pagina is een `<div class="page">` in `index.html`.

## Prijzen en voorwaarden
- €45 per uur achter de bar
- Altijd 1 uur voorbereiding (€45) en €75 voor cocktailmenu & gebruik materialen
- Boeken binnen 1 maand voor het feest: spoedtoeslag van 25% over alle kosten
- Geen aanbetaling; annuleren binnen 14 dagen: 20% van het afgesproken bedrag
- Klant regelt drank, ijs, ingrediënten en een werkplek

Bedragen aanpassen? Doe dat op de pagina Prijzen in `index.html` én in `TARIEF`
bovenaan `assets/js/main.js` (voor de calculator).

## Nog zelf invullen vóór livegang
- **Reviews**: nu voorbeeldteksten, vervang ze door echte reviews (en de score).
- **Foto's**: portret bij "Over mij" en de tegels bij "Sfeerbeelden".
- **Contactgegevens**: e-mail, telefoon, Instagram, KvK (in `index.html` en `MAIL` in `assets/js/main.js`).
- **Ervaring**: de cijfers op het homescreen en de jaartallen in de tijdlijn.
- **Cocktails**: lijst `COCKTAILS` bovenaan `assets/js/main.js`.

Kleuren en lettertypes staan als variabelen bovenaan `assets/css/style.css`.

## Offertes & facturen (`documenten.html`)
Een eigen hulpmiddel om offertes en facturen te maken. Niet gelinkt vanaf de website;
open het via `documenten.html` (bijv. `rutger0201.github.io/Beck-On-The-Rocks/documenten.html`).

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

Vul eenmalig je gegevens in onder **Mijn gegevens & tarieven** (adres, KvK, IBAN, btw).
Alles wordt alleen in je eigen browser opgeslagen, dus gebruik steeds dezelfde browser
en bewaar de PDF's zelf (bijv. in een map per jaar).
