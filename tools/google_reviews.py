#!/usr/bin/env python3
"""Google-reviews ophalen voor de reviewpagina.

Haalt via de Google Places API (New) de score, het aantal reviews en de (max. 5) meest relevante
reviews op en zet ze in assets/data/google-reviews.json. De site toont ze naast de eigen reviews.
Bezoekers maken zo zelf geen contact met Google.

Nodig (GitHub → Settings → Secrets and variables → Actions):
  GOOGLE_PLACES_KEY   API-sleutel met de Places API (New) aan          (secret, verplicht)
  GOOGLE_PLACE_ID     Place ID van het Bedrijfsprofiel                  (optioneel: wordt anders
                      één keer gezocht op naam en daarna in de JSON bewaard)

Gebruik: GOOGLE_PLACES_KEY=... python3 tools/google_reviews.py
"""
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UIT = ROOT / 'assets/data/google-reviews.json'
API = 'https://places.googleapis.com/v1'
ZOEK = 'Beck on the Rocks'
SITE = 'beckontherocks.nl'


def vraag(pad, sleutel, velden, data=None):
    req = urllib.request.Request(f'{API}/{pad}', data=json.dumps(data).encode() if data else None,
                                 headers={'X-Goog-Api-Key': sleutel, 'X-Goog-FieldMask': velden,
                                          'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        # Google legt in de foutmelding uit wat er mis is (de sleutel zelf staat er niet in)
        sys.exit(f'Google gaf fout {e.code}: {e.read().decode("utf-8", "replace")[:600]}')


def zoek_place_id(sleutel):
    res = vraag('places:searchText', sleutel, 'places.id,places.displayName,places.websiteUri',
                {'textQuery': ZOEK, 'languageCode': 'nl', 'regionCode': 'NL'})
    for p in res.get('places', []):
        if SITE in (p.get('websiteUri') or '') or (p.get('displayName') or {}).get('text', '').lower() == ZOEK.lower():
            return p['id']
    return None


def main():
    sleutel = os.environ.get('GOOGLE_PLACES_KEY', '').strip()
    if not sleutel:
        print('Geen GOOGLE_PLACES_KEY ingesteld: niets opgehaald.')
        return
    oud = json.loads(UIT.read_text()) if UIT.exists() else {}
    place_id = os.environ.get('GOOGLE_PLACE_ID', '').strip() or oud.get('placeId') or zoek_place_id(sleutel)
    if not place_id:
        sys.exit(f'Bedrijfsprofiel "{ZOEK}" niet gevonden. Zet het Place ID in GOOGLE_PLACE_ID.')

    p = vraag(f'places/{place_id}?languageCode=nl', sleutel, 'rating,userRatingCount,googleMapsUri,reviews')
    reviews = []
    for r in p.get('reviews', []):
        tekst = (r.get('originalText') or r.get('text') or {}).get('text', '').strip()
        if not tekst:
            continue  # alleen sterren zonder tekst: telt wel mee in de score, niet in de lijst
        reviews.append({
            'naam': (r.get('authorAttribution') or {}).get('displayName', 'Google-gebruiker'),
            'sterren': r.get('rating', 5),
            'tekst': tekst,
            'datum': (r.get('publishTime') or '')[:10],
            'link': r.get('googleMapsUri') or p.get('googleMapsUri', ''),
        })
    nieuw = {'placeId': place_id, 'score': p.get('rating'), 'aantal': p.get('userRatingCount', 0),
             'url': p.get('googleMapsUri', ''), 'reviews': reviews}
    if {k: v for k, v in oud.items() if k != 'bijgewerkt'} == nieuw:
        print('Google-reviews ongewijzigd.')
        return
    UIT.parent.mkdir(parents=True, exist_ok=True)
    UIT.write_text(json.dumps({'bijgewerkt': date.today().isoformat(), **nieuw}, ensure_ascii=False, indent=2) + '\n')
    print(f'Bijgewerkt: {nieuw["aantal"]} reviews op Google, score {nieuw["score"]}, {len(reviews)} met tekst.')


if __name__ == '__main__':
    main()
