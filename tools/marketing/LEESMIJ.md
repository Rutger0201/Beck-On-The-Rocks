# Marketingcentrum

Tabblad **Marketing** op https://beckontherocks.nl/admin/ (zelfde wachtwoord als de klussenlijst).
Toont de 10 tot 20 beste marketingkansen voor de komende 30 dagen, met tekst, beeld, score, kalender en goedkeuren.
Er wordt niets automatisch gepubliceerd.

## Hoe het werkt

| Onderdeel | Bestand |
| --- | --- |
| Vaste momenten per jaar (kerstborrels, Koningsdag, ...) | `tools/marketing/kalender.json` |
| Vaste ideeën zonder datum (reviews vragen, Google-profiel, ...) | `tools/marketing/ideeen.json` |
| Regels voor alcoholreclame en 18+ | `assets/data/marketing-regels.json` |
| Wekelijks onderzoek van Claude | `assets/data/marketing-onderzoek.enc.json` |
| Wat je goedkeurt, aanpast of afwijst | `assets/data/marketing-status.enc.json` |
| De gekozen kansen, resultaten en advies (dit leest de adminpagina) | `assets/data/marketing.enc.json` |
| Antwoorden van de AI | `assets/data/marketing-ai.enc.json` |
| Sleutelpaar | `assets/data/marketing-sleutel.json` |

De actie **Marketing bijwerken** (`.github/workflows/marketing.yml`) draait elke nacht `python3 tools/marketing`:
kansen verzamelen, dubbele en verlopen weghalen, scoren (relevantie 30%, impact 30%, uitvoerbaarheid 15%,
tijd 15%, budget 10%), de beste kiezen (van elke soort minstens twee als die er zijn) en versleutelen.
Afgewezen of gepubliceerde ideeën komen pas na hun pauze terug.

**Versleuteling**: de `.enc.json`-bestanden zijn versleuteld met de publieke sleutel uit `marketing-sleutel.json`.
Iedereen kan dus iets toevoegen (de Claude-run, je browser), maar alleen met `ADMIN_WACHTWOORD` is het te lezen.
Wachtwoord veranderd? Draai *Marketing bijwerken* opnieuw: er komt een nieuw sleutelpaar en de planning wordt opnieuw
gemaakt (goedkeuringen en het laatste onderzoek van vóór de wijziging vervallen).

**AI (gratis)**: "Verbeter met AI" en "Nieuw idee met AI" op de adminpagina starten de actie *Marketing AI*
(`.github/workflows/marketing-ai.yml`). Die gebruikt GitHub Models met de ingebouwde `GITHUB_TOKEN` (geen eigen sleutel,
wel daglimieten). Verzoek en antwoord zijn versleuteld (`assets/data/marketing-ai.enc.json`). Vereist het GitHub-token
op de adminpagina met Actions: Read and write.

**Resultaten** (tabblad Resultaten, `tools/marketing/resultaten.py`, elke nacht):
- bezoekers, bronnen, pagina's en aanvragen uit GoatCounter (secret `GOATCOUNTER_TOKEN`, optioneel);
- per gepubliceerde post de bezoeken via zijn `?ref=`-link en de aanvragen die daaruit kwamen (de site onthoudt de
  campagnecode tijdens het bezoek en telt `aanvraag-via/<code>`; de code staat ook in de aanvraagmail);
- kanalen die meer bezoekers per post opleveren krijgen tot 5 punten extra bij het kiezen van kansen;
- wekelijks advies met AI (of vaste regels als de AI niet bereikbaar is);
- SEO-controle van de pagina's uit `sitemap.xml`, en optioneel Search Console (secret `GSC_SERVICE_ACCOUNT`).

**Synchroniseren**: zie het tabblad Instellingen op de adminpagina (GitHub-token met Contents en Actions: Read and write,
alleen voor deze repository).

## Wekelijks onderzoek (Claude)

Een geplande taak in het Claude-project draait elke maandagochtend. Die zoekt op het web, schrijft het resultaat als
JSON (formaat hieronder) en slaat het zo op:

```
pip install cryptography
python3 tools/marketing versleutel-onderzoek /tmp/onderzoek.json
git checkout -B marketing-onderzoek
git add assets/data/marketing-onderzoek.enc.json && git commit -m "Marketingonderzoek <datum>"
git push -f origin marketing-onderzoek
```

Het script weigert onderzoek met ontbrekende velden of met teksten die tegen de alcoholregels ingaan.
Een push naar de branch `marketing-onderzoek` start *Marketing bijwerken*, die het onderzoek naar `main` haalt.

### Formaat

```json
{
  "gemaakt": "2026-10-26",
  "samenvatting": "Drie tot vijf zinnen: wat speelt er deze maand en waar liggen de kansen.",
  "trends": [
    {
      "soort": "trend | seo | concurrent | doelgroep | kans",
      "titel": "Korte titel",
      "samenvatting": "Een tot drie zinnen, wat het betekent voor Beck on the Rocks.",
      "bron": { "titel": "Naam van de pagina", "url": "https://...", "datum": "2026-10-20" }
    }
  ],
  "kansen": [
    {
      "titel": "Korte titel",
      "soort": "snel | structureel | betaald",
      "kanaal": "Instagram | Facebook | LinkedIn | TikTok | Google | Website | Mail | WhatsApp",
      "formaat": "post | reel | story | carrousel | advertentie | pagina | samenwerking | update",
      "datum": "2026-11-03 (optioneel; leeg = systeem kiest een dag)",
      "tijd": "19:30",
      "doelgroep": "Wie, leeftijd (18+, liefst 25+), regio",
      "waarom": "Waarom nu, met verwijzing naar de bron",
      "tekst": "Volledige caption of advertentietekst. Bij alcohol: eindigen met 'Geniet, maar drink met mate.'",
      "cta": "Call-to-action, mag {link} bevatten",
      "hashtags": ["zonder", "hekje"],
      "pagina": "/ of /cocktail-bartender-bedrijfsfeest/ of /cocktail-bartender-privefeest/ of /tarieven/ of /faq/",
      "beeld": { "foto": "beck-portret | galerij-gin-tonic | galerij-garneren | galerij-lachen | (leeg)", "idee": "Wat te fotograferen of filmen" },
      "kosten": { "euro": 0, "uren": 0.5, "toelichting": "Waar het geld en de tijd in zitten" },
      "impact": { "niveau": "laag | middel | hoog", "toelichting": "Onderbouwing, geen verzonnen cijfers" },
      "criteria": { "relevantie": 1, "impact": 1, "haalbaarheid": 1, "tijd": 1, "budget": 1 },
      "bronnen": [{ "titel": "...", "url": "https://...", "datum": "2026-10-20" }]
    }
  ]
}
```

`criteria` zijn scores van 1 tot 5 (5 = best: zeer relevant, grote impact, makkelijk, weinig tijd, goedkoop).
