#!/usr/bin/env python3
"""Zet alle goedgekeurde reviews uit reviews/ in één bestand: assets/data/reviews.json.

De site leest dat ene bestand (1 verzoek, geen limiet van de GitHub API). Draait vanzelf via de Action
"Reviews bijwerken" zodra er iets in reviews/ verandert. Een kapot of onvolledig bestand wordt overgeslagen
(met een melding), zodat één fout niet alle reviews laat verdwijnen. Is er iets overgeslagen, dan eindigt het
script met code 1, zodat de Action rood wordt. Gebruik: python3 tools/reviews_index.py
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAP = ROOT / 'reviews'
UIT = ROOT / 'assets/data/reviews.json'


def main():
    reviews = []
    overgeslagen = 0
    for pad in sorted(MAP.glob('*.json')):
        try:
            r = json.loads(pad.read_text(encoding='utf-8'))
        except (OSError, ValueError) as e:
            print(f'Overgeslagen: {pad.name} ({e})')
            overgeslagen += 1
            continue
        if not (isinstance(r, dict) and isinstance(r.get('naam'), str) and isinstance(r.get('tekst'), str)
                and r['naam'].strip() and r['tekst'].strip()):
            print(f'Overgeslagen: {pad.name} (naam of tekst ontbreekt)')
            overgeslagen += 1
            continue
        reviews.append(r)
    UIT.write_text(json.dumps(reviews, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(reviews)} reviews in {UIT.relative_to(ROOT)}')
    return 1 if overgeslagen else 0


if __name__ == '__main__':
    sys.exit(main())
