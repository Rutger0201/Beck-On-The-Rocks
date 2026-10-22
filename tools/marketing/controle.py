"""Controle op alcoholreclame en 18+ (regels in assets/data/marketing-regels.json, ook gebruikt door de adminpagina)."""
import json
import re
from pathlib import Path

REGELS = json.loads((Path(__file__).resolve().parents[2] / 'assets/data/marketing-regels.json').read_text())


def controleer(kans):
    """Geeft een lijst meldingen: {'niveau': 'rood'|'oranje', 'tekst': ...}."""
    tekst = ' '.join([kans.get('titel', ''), kans.get('tekst', ''), kans.get('cta', ''),
                      ' '.join('#' + h for h in kans.get('hashtags', []))])
    meldingen = []
    for niveau in ('rood', 'oranje'):
        for r in REGELS[niveau]:
            m = re.search(r['patroon'], tekst, re.I)
            if m:
                meldingen.append({'niveau': niveau, 'tekst': f'"{m[0]}": {r["uitleg"]}'})
    if (kans.get('kanaal', '').lower() in REGELS['slogan_kanalen'] and kans.get('formaat') not in REGELS['slogan_niet_bij']
            and re.search(REGELS['alcohol'], tekst, re.I) and not re.search(REGELS['geen_alcohol'], tekst, re.I)
            and REGELS['slogan'].lower() not in tekst.lower()):
        meldingen.append({'niveau': 'oranje', 'tekst': f'Er komt alcohol in voor: zet "{REGELS["slogan"]}" onder de tekst.'})
    if kans.get('soort') == 'betaald' and '18' not in kans.get('doelgroep', '') and '25' not in kans.get('doelgroep', ''):
        meldingen.append({'niveau': 'oranje', 'tekst': 'Betaalde campagne: stel de leeftijd in op 18+ (liefst 25+).'})
    return meldingen
