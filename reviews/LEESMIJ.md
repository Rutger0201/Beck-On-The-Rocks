# Reviews

Elke eigen review is een los `.json`-bestand in deze map. De reviewpagina van de
website toont de reviews, nieuwste eerst, met de gemiddelde score. Na elke wijziging in deze map zet de
Action *Reviews bijwerken* alle reviews in `assets/data/reviews.json`; dat ene bestand leest de site
(ontbreekt dat bestand, dan leest hij deze map via de GitHub API). Staat een nieuwe review er na een paar
minuten nog niet op, kijk dan bij *Actions* of *Reviews bijwerken* rood is en start hem opnieuw.

## Toevoegen
Er is geen reviewformulier op de site. Maak in deze map een nieuw bestand `JJJJ-MM-DD-naam.json` in het formaat
hieronder en commit het (op GitHub: *Add file*). Binnen een paar minuten staat de review op de site.

Een review verwijderen: open het bestand hier en kies *Delete file*.

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
