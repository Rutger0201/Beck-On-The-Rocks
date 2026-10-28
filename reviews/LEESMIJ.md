# Reviews

Elke goedgekeurde review is een los `.json`-bestand in deze map. De reviewpagina van de
website toont de reviews, nieuwste eerst, met de gemiddelde score. Na elke wijziging in deze map zet de
Action *Reviews bijwerken* alle reviews in `assets/data/reviews.json`; dat ene bestand leest de site
(ontbreekt dat bestand, dan leest hij deze map via de GitHub API). Staat een nieuwe review er na een paar
minuten nog niet op, kijk dan bij *Actions* of *Reviews bijwerken* rood is en start hem opnieuw.

## Goedkeuren
1. Een klant vult het reviewformulier op de site in.
2. Je krijgt een mail (via Web3Forms) met de review en een link **GOEDKEUREN**.
3. Klik op de link: GitHub opent met het bestand al ingevuld. Klik op **Commit changes**.
4. Binnen een paar minuten staat de review op de site.

Afwijzen: doe niets. Een review verwijderen: open het bestand hier en kies *Delete file*.

## Formaat
```json
{
  "naam": "Sanne",
  "sterren": 5,
  "soort": "Bruiloft",
  "tekst": "Wat een topavond!",
  "datum": "2026-10-20"
}
```
