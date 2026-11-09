#!/usr/bin/env python3
"""Google-reviews ophalen voor de reviewpagina.

Haalt via de Google Places API (New) de score, het aantal reviews en de (max. 5) meest relevante
reviews op en zet ze in assets/data/google-reviews.json. De site toont ze naast de eigen reviews.
Bezoekers maken zo zelf geen contact met Google.

Nodig (GitHub → Settings → Secrets and variables → Actions):
  GOOGLE_PLACES_KEY   API-sleutel met de Places API (New) aan          (secret, verplicht)
  GOOGLE_PLACE_ID     Place ID van het Bedrijfsprofiel                  (optioneel: wordt anders
                      één keer gezocht op naam en daarna in de JSON bewaard)

Het bedrijfsprofiel heeft geen vast adres (servicegebied). Text Search slaat zulke profielen
standaard over; de zoekopdracht zet daarom includePureServiceAreaBusinesses aan.

Gebruik: GOOGLE_PLACES_KEY=... python3 tools/google_reviews.py
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UIT = ROOT / 'assets/data/google-reviews.json'
API = 'https://places.googleapis.com/v1'
ZOEK = 'Beck on the Rocks'
SITE = 'beckontherocks.nl'
TIMEOUT = 20
POGINGEN = 3
# Tijdelijke storing of quotum: even wachten, dan opnieuw. Geen extra Google-producten.
PAUZES = (2, 4)
TIJDELIJK = {429, 500, 502, 503, 504}


def log(tekst):
    # Op de Actions-runner is stdout gebufferd; zonder flush staat de fout boven de uitleg
    print(tekst, flush=True)


def wacht(seconden, reden):
    log(f'Tijdelijke fout ({reden}), opnieuw over {seconden}s.')
    time.sleep(seconden)


def sleutel_geldig(sleutel):
    # Een Google-API-sleutel begint met AIza. "Alza" is de i die als letter l is geplakt.
    return sleutel.startswith('AIza') and len(sleutel) >= 30 and all(c.isalnum() or c in '-_' for c in sleutel)


def lees_sleutel():
    sleutel = os.environ.get('GOOGLE_PLACES_KEY', '').strip()
    if len(sleutel) >= 2 and sleutel[0] == sleutel[-1] and sleutel[0] in '"\'':
        sleutel = sleutel[1:-1].strip()
    return sleutel


def google_fout(code, body):
    if code == 400 and 'API_KEY_INVALID' in body:
        return ('GOOGLE_PLACES_KEY wordt door Google geweigerd. Plak het secret opnieuw in '
                'GitHub → Settings → Secrets and variables → Actions, vanuit Google Cloud Console → '
                'Credentials. De sleutel moet met AIza beginnen; "Alza" betekent dat de i als de letter l is geplakt.')
    if code == 403 and ('has not been used' in body or 'SERVICE_DISABLED' in body or 'is disabled' in body):
        return ('Places API (New) staat uit in het Google Cloud-project. Zet die API aan onder '
                'APIs & Services → Places API (New). Geen extra betaalde dienst aanzetten: dit gebruik '
                'valt in het gratis tegoed. Wacht een paar minuten na het aanzetten en start de workflow '
                f'opnieuw. Google: {body[:300]}')
    return f'Google gaf fout {code}: {body[:600]}'


def vraag(pad, sleutel, velden, data=None):
    payload = json.dumps(data).encode() if data else None
    url = f'{API}/{pad}'
    laatste = 'Google gaf geen antwoord.'
    for poging in range(POGINGEN):
        req = urllib.request.Request(url, data=payload,
                                     headers={'X-Goog-Api-Key': sleutel, 'X-Goog-FieldMask': velden,
                                              'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            body = e.read().decode('utf-8', 'replace')[:600]
            laatste = google_fout(e.code, body)
            if e.code in TIJDELIJK and poging + 1 < POGINGEN:
                wacht(PAUZES[poging], e.code)
                continue
            sys.exit(laatste)
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            laatste = f'Google was niet bereikbaar: {e}'
            if poging + 1 < POGINGEN:
                wacht(PAUZES[poging], 'netwerk')
                continue
            sys.exit(f'{laatste} ({POGINGEN} pogingen)')
    sys.exit(laatste)


def zoek_place_id(sleutel):
    # Een bedrijf zonder vast adres staat soms onder een iets andere naam: meerdere zoekopdrachten
    # proberen en de gevonden namen tonen (zonder gevoelige gegevens) zodat het Place ID te vinden is.
    # Zonder includePureServiceAreaBusinesses geeft Google zulke profielen niet terug.
    schoon = lambda t: ''.join(c for c in t.lower() if c.isalnum())
    for zoek in (ZOEK, f'{ZOEK} Almere', f'{ZOEK} cocktail bartender', 'beckontherocks.nl'):
        res = vraag('places:searchText', sleutel, 'places.id,places.displayName,places.websiteUri',
                    {'textQuery': zoek, 'languageCode': 'nl', 'regionCode': 'NL',
                     'includePureServiceAreaBusinesses': True})
        gevonden = res.get('places', [])
        log(f'Zoeken naar "{zoek}": {len(gevonden)} resultaten: ' +
            ', '.join((p.get('displayName') or {}).get('text', '?') for p in gevonden))
        for p in gevonden:
            naam = (p.get('displayName') or {}).get('text', '')
            if SITE in (p.get('websiteUri') or '') or schoon(ZOEK) in schoon(naam):
                return p['id']
    return None


def lees_oud():
    if not UIT.exists():
        return {}
    try:
        data = json.loads(UIT.read_text())
    except (json.JSONDecodeError, OSError) as e:
        log(f'Bestaande google-reviews.json is onleesbaar ({e}); die blijft staan tot Google nieuwe gegevens geeft.')
        return {}
    return data if isinstance(data, dict) else {}


def meld_sleutel(sleutel):
    # Alleen de vorm, nooit de sleutel zelf
    begin = sleutel[:4] if sleutel else '(leeg)'
    log(f'Sleutel: {len(sleutel)} tekens, begint met "{begin}", '
        f'{sum(not (c.isalnum() or c in "-_") for c in sleutel)} ongewone tekens (verwacht: begint met "AIza", 0)')


def main():
    sleutel = lees_sleutel()
    if not sleutel:
        log('Geen GOOGLE_PLACES_KEY ingesteld: niets opgehaald. '
            'Zet het secret in GitHub → Settings → Secrets and variables → Actions. De site blijft de bestaande reviews tonen.')
        log('::warning title=Google-reviews::GOOGLE_PLACES_KEY ontbreekt. Niets opgehaald.')
        return
    if not sleutel_geldig(sleutel):
        meld_sleutel(sleutel)
        extra = ''
        if sleutel.startswith('Alza'):
            extra = ' Het begin "Alza" is de letter l in plaats van de i van "AIza".'
        log('GOOGLE_PLACES_KEY is ongeldig.' + extra +
            ' Plak de sleutel opnieuw vanuit Google Cloud Console → Credentials. '
            'Niets opgehaald; de bestaande reviews blijven staan.')
        log('::warning title=Google-reviews::GOOGLE_PLACES_KEY is ongeldig (verwacht begint met AIza, niet Alza).')
        return
    meld_sleutel(sleutel)
    oud = lees_oud()
    place_id = os.environ.get('GOOGLE_PLACE_ID', '').strip() or oud.get('placeId') or zoek_place_id(sleutel)
    if not place_id:
        sys.exit(f'Bedrijfsprofiel "{ZOEK}" niet gevonden. Zet het Place ID in de variable GOOGLE_PLACE_ID '
                 '(GitHub → Settings → Secrets and variables → Actions → Variables).')

    p = vraag(f'places/{place_id}?languageCode=nl', sleutel, 'rating,userRatingCount,googleMapsUri,reviews')
    reviews = []
    for r in p.get('reviews') or []:
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
        log('Google-reviews ongewijzigd.')
        return
    UIT.parent.mkdir(parents=True, exist_ok=True)
    UIT.write_text(json.dumps({'bijgewerkt': date.today().isoformat(), **nieuw}, ensure_ascii=False, indent=2) + '\n')
    log(f'Bijgewerkt: {nieuw["aantal"]} reviews op Google, score {nieuw["score"]}, {len(reviews)} met tekst.')


if __name__ == '__main__':
    main()
