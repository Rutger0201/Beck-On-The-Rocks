#!/usr/bin/env python3
"""Tarieven van Beck on the Rocks op één plek.

Bron: tarieven.json (in de hoofdmap). Dit script zet die bedragen overal goed:
- elk bedrag in de HTML met data-t="sleutel" (bijv. <span data-t="uur">€45</span>);
- meta-omschrijvingen en gestructureerde gegevens (JSON-LD), inclusief de FAQ voor Google;
- assets/js/tarieven.js, dat de calculator en de offerte-generator gebruiken.

Gebruik:
  python3 tools/tarieven.py              bijwerken
  python3 tools/tarieven.py --controleer alleen controleren (exit 1 bij verschil)
  python3 tools/tarieven.py --markeer    eenmalig: losse bedragen in de HTML labelen
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGINAS = ['index.html', 'en/index.html', 'tarieven/index.html', 'faq/index.html',
           'cocktail-bartender-privefeest/index.html', 'cocktail-bartender-bedrijfsfeest/index.html',
           'cocktail-bartender-bruiloft/index.html']


def waarden(t):
    """Alle bedragen die op de site staan, afgeleid uit tarieven.json."""
    uur_fp = t['uur'] * (1 + t['fruitpersProcent'] / 100)
    prep = t['uur'] * t['voorbereidingUren']
    prep_fp = uur_fp * t['voorbereidingUren']
    vb = t['voorbeeldUren']
    return {
        'uur': ('euro', t['uur']), 'uurFp': ('euro', uur_fp), 'prep': ('euro', prep), 'prepFp': ('euro', prep_fp),
        'menu': ('euro', t['menu']), 'menuFp': ('euro', t['menuFruitpers']),
        'km': ('euro', t['km']), 'glas': ('euro', t['glas']),
        'vb': ('euro', vb * t['uur'] + prep + t['menu']), 'vbFp': ('euro', vb * uur_fp + prep_fp + t['menuFruitpers']),
        'vb5': ('euro', 5 * t['uur'] + prep + t['menu']),  # voorbeeld bruiloft: 5 uur
        'calc': ('calc', vb * t['uur'] + prep + t['menu']),
        'spoed': ('pct', t['spoedProcent']), 'fruitpers': ('pct', t['fruitpersProcent']), 'annuleer': ('pct', t['annulerenProcent']),
        'annuleerDagen': ('getal', t['annulerenDagen']), 'betaalDagen': ('getal', t['betaalDagen']),
    }


def opmaak(soort, n, taal):
    komma = taal == 'nl'
    if soort in ('euro', 'calc'):
        s = f'{n:.2f}' if round(n, 2) % 1 else f'{n:.0f}'
        if komma:
            s = s.replace('.', ',')
        return ('€ ' if soort == 'calc' else '€') + s
    if soort == 'pct':
        return f'{n:g}%'
    return f'{n:g}'


def taal_van(tekst):
    m = re.search(r'<html lang="(\w+)"', tekst)
    return m.group(1) if m else 'nl'


# ---------- eenmalig markeren ----------
# Volgorde telt: specifieke patronen eerst. Alleen in tekst tussen tags, nooit in <script> of attributen.
MARKEER = [
    (r'(€45)(?= voorbereiding| preparation)', 'prep'),
    (r'(?<=voorbereiding \()(€45)', 'prep'), (r'(?<=preparation \()(€45)', 'prep'),
    (r'(?<=× €54 \+ )(€54)', 'prepFp'),
    (r'€45', 'uur'), (r'€54', 'uurFp'), (r'€75', 'menu'), (r'€99', 'menuFp'),
    (r'€0[,.]25', 'km'), (r'€0[,.]50', 'glas'), (r'€369', 'vbFp'), (r'€300', 'vb'),
    (r'25%', 'spoed'), (r'20%', 'annuleer'),
    (r'(?<=betaaltermijn van )14(?= dagen)', 'betaalDagen'),
    (r'14(?= dagen| days)', 'annuleerDagen'),
]


def markeer(tekst):
    # voorbewerking: in de prijslijst staat "Voorbereiding" in een ander element dan het bedrag
    tekst = re.sub(r'((?:Voorbereiding|Preparation)</strong>.*?<b>)(€45)(</b>)', r'\1<span data-t="prep">\2</span>\3', tekst)
    delen = re.split(r'(<script\b.*?</script>|<[^>]+>)', tekst, flags=re.S)
    uit = []
    vorige = ''
    for deel in delen:
        if not deel or deel.startswith('<') or 'data-t=' in vorige:
            uit.append(deel)
            if deel:
                vorige = deel
            continue
        vorige = deel
        # tekst tussen tags: elk bedrag één keer labelen
        stukken = [(deel, None)]
        for patroon, sleutel in MARKEER:
            nieuw = []
            for s, k in stukken:
                if k is not None:
                    nieuw.append((s, k))
                    continue
                pos = 0
                for m in re.finditer(patroon, s):
                    nieuw.append((s[pos:m.start()], None))
                    nieuw.append((m.group(0), sleutel))
                    pos = m.end()
                nieuw.append((s[pos:], None))
            stukken = nieuw
        uit.append(''.join(f'<span data-t="{k}">{s}</span>' if k else s for s, k in stukken))
    tekst = ''.join(uit)
    # calculator-startwaarde
    return tekst.replace('<strong id="c-totaal">€ 300</strong>', '<strong id="c-totaal" data-t="calc">€ 300</strong>')


# ---------- bijwerken ----------
def faq_ld(tekst):
    """FAQPage-gegevens opnieuw opbouwen uit de zichtbare FAQ, zodat ze altijd gelijk zijn."""
    vragen = re.findall(r'<details>\s*<summary>(.*?)</summary>(.*?)</details>', tekst, flags=re.S)
    def schoon(h):
        h = re.sub(r'<li>', ' ', h)
        h = re.sub(r'<[^>]+>', '', h)
        return re.sub(r'\s+', ' ', html.unescape(h)).strip()
    return [{'@type': 'Question', 'name': schoon(v), 'acceptedAnswer': {'@type': 'Answer', 'text': schoon(a)}} for v, a in vragen]


def bijwerken(tekst, w, taal):
    # oude waarden lezen (voor meta-teksten en JSON-LD), daarna de labels bijwerken
    oud = {}
    for k, v in re.findall(r'data-t="(\w+)">([^<]*)<', tekst):
        oud.setdefault(k, v)
    def vervang_label(m):
        k = m.group(2)
        if k not in w:
            return m.group(0)
        return f'{m.group(1)}{opmaak(*w[k], taal)}{m.group(3)}'
    tekst = re.sub(r'(<(?:span|strong)[^>]*\bdata-t="(\w+)"[^>]*>)[^<]*(</(?:span|strong)>)', vervang_label, tekst)
    # meta-omschrijvingen en JSON-LD: oud bedrag → nieuw bedrag
    paren = [(oud[k], opmaak(*w[k], taal)) for k in ('uur', 'vb') if k in oud and oud[k] != opmaak(*w[k], taal)]
    def in_meta(m):
        s = m.group(0)
        for a, b in paren:
            s = re.sub(re.escape(a) + r'(?![\d,.])', b, s)
        return s
    tekst = re.sub(r'<meta [^>]*content="[^"]*"[^>]*>', in_meta, tekst)
    def in_ld(m):
        s = in_meta(m)
        s = re.sub(r'"price": [\d.]+', f'"price": {w["uur"][1]:g}', s)
        try:
            data = json.loads(s[s.index('>') + 1:s.rindex('<')])
        except (ValueError, json.JSONDecodeError):
            return s
        if isinstance(data, dict) and data.get('@type') == 'FAQPage':
            data['mainEntity'] = faq_ld(tekst)
            inhoud = json.dumps(data, ensure_ascii=False, indent=2).replace('\n', '\n  ')
            return s[:s.index('>') + 1] + '\n  ' + inhoud + '\n  ' + s[s.rindex('<'):]
        return s
    tekst = re.sub(r'<script type="application/ld\+json">.*?</script>', in_ld, tekst, flags=re.S)
    return tekst


def js(t):
    return ('// Gemaakt door tools/tarieven.py uit tarieven.json. Niet hier aanpassen.\n'
            f'window.BECK_TARIEVEN = {json.dumps({k: v for k, v in t.items() if not k.startswith("_")}, ensure_ascii=False)};\n')


def main():
    t = json.loads((ROOT / 'tarieven.json').read_text())
    w = waarden(t)
    controleer = '--controleer' in sys.argv
    verschillen = []
    for pad in PAGINAS:
        bestand = ROOT / pad
        if not bestand.exists():
            continue
        tekst = bestand.read_text()
        nieuw = markeer(tekst) if '--markeer' in sys.argv else tekst
        nieuw = bijwerken(nieuw, w, taal_van(tekst))
        if nieuw != tekst:
            verschillen.append(pad)
            if not controleer:
                bestand.write_text(nieuw)
    js_pad = ROOT / 'assets/js/tarieven.js'
    if not js_pad.exists() or js_pad.read_text() != js(t):
        verschillen.append('assets/js/tarieven.js')
        if not controleer:
            js_pad.write_text(js(t))
    if controleer:
        if verschillen:
            print('Niet bijgewerkt:', ', '.join(verschillen))
            sys.exit(1)
        print('Alle tarieven kloppen met tarieven.json.')
    else:
        print('Bijgewerkt:', ', '.join(verschillen) if verschillen else 'niets (alles klopte al)')


if __name__ == '__main__':
    main()
