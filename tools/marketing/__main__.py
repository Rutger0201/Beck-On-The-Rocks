#!/usr/bin/env python3
"""Marketingcentrum: kiest de beste marketingkansen voor de komende 30 dagen (tabblad Marketing op /admin/).

Bronnen (alle optioneel behalve de kalender):
  tools/marketing/kalender.json         vaste momenten per jaar (kerstborrels, Koningsdag, ...)
  tools/marketing/ideeen.json           vaste ideeën zonder datum, met een pauze na gebruik
  assets/data/marketing-onderzoek.enc.json   wekelijks onderzoek van Claude (zie tools/marketing/LEESMIJ.md)
  assets/data/marketing-status.enc.json      wat je op de adminpagina hebt goedgekeurd, afgewezen of gepubliceerd

Uitvoer: assets/data/marketing.enc.json, versleuteld met de publieke sleutel uit assets/data/marketing-sleutel.json.

Gebruik:
  ADMIN_WACHTWOORD=... python3 tools/marketing                    bijwerken (--toon: lijst in de terminal)
  ADMIN_WACHTWOORD=... VERZOEK=... python3 tools/marketing ai-verzoek   verzoek van de adminpagina (Action "Marketing AI")
  python3 tools/marketing versleutel-onderzoek onderzoek.json     onderzoek controleren en versleuteld opslaan
                                                                 (geen wachtwoord nodig)
Pakket: pip install cryptography
"""
import hashlib
import json
import os
import re
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import ai
import publiceren
import resultaten
import sleutels
from controle import controleer

HIER = Path(__file__).resolve().parent
ROOT = HIER.parents[1]
DATA = ROOT / 'assets/data'
SLEUTEL = DATA / 'marketing-sleutel.json'
UIT = DATA / 'marketing.enc.json'
ONDERZOEK = DATA / 'marketing-onderzoek.enc.json'
STATUS = DATA / 'marketing-status.enc.json'
AI_UIT = DATA / 'marketing-ai.enc.json'
PUBLICATIES = DATA / 'marketing-publicaties.enc.json'
SITE = 'https://beckontherocks.nl'

DAGEN = 30
MAX_KANSEN = 20
MIN_SCORE = 35
ONDERZOEK_GELDIG = 21     # dagen dat een onderzoeksrun meetelt
TREND_GELDIG = 60         # dagen dat een bron van een trend meetelt
BEWAAR_NA = 7             # afgehandelde kansen blijven zo lang zichtbaar in de kalender
SOORTEN = ('snel', 'structureel', 'betaald')
GEWICHT = {'relevantie': .3, 'impact': .3, 'haalbaarheid': .15, 'tijd': .15, 'budget': .1}
KANAALCODE = {'instagram': 'ig', 'facebook': 'fb', 'linkedin': 'li', 'tiktok': 'tt', 'google': 'gg',
              'website': 'web', 'mail': 'mail', 'whatsapp': 'wa', 'youtube': 'yt', 'pinterest': 'pin'}
AFGEHANDELD = ('gepubliceerd', 'afgewezen')


def lees_json(pad):
    return json.loads(pad.read_text()) if pad.exists() else None


def slug(s, n=40):
    s = re.sub(r'[^a-z0-9]+', '-', (s or '').lower().translate(str.maketrans('áàäéèëíïóöúüç', 'aaaeeeiioouuc')))
    return s.strip('-')[:n].strip('-')


def maak_id(*delen):
    return hashlib.sha1('|'.join(map(str, delen)).encode()).hexdigest()[:10]


def dag(s):
    try:
        return date.fromisoformat(str(s)[:10])
    except ValueError:
        return None


# ---------- kansen opbouwen ----------

def normaliseer(k, herkomst):
    """Vult ontbrekende velden aan en maakt de waarden veilig om te tonen."""
    tekst = lambda v, n=4000: str(v or '').strip()[:n]
    crit = k.get('criteria') or {}
    uit = {
        'titel': tekst(k.get('titel'), 140), 'soort': k.get('soort') if k.get('soort') in SOORTEN else 'snel',
        'kanaal': tekst(k.get('kanaal'), 30) or 'Instagram', 'formaat': tekst(k.get('formaat'), 30) or 'post',
        'tijd': k.get('tijd') if re.fullmatch(r'\d\d:\d\d', str(k.get('tijd', ''))) else '19:30',
        'doelgroep': tekst(k.get('doelgroep'), 300), 'waarom': tekst(k.get('waarom'), 800),
        'tekst': tekst(k.get('tekst')), 'cta': tekst(k.get('cta'), 300),
        'hashtags': [slug(h.lstrip('#'), 40).replace('-', '') for h in (k.get('hashtags') or [])][:15],
        'pagina': k.get('pagina') if re.fullmatch(r'/[a-z0-9/-]*', str(k.get('pagina', ''))) else '',
        'beeld': {'foto': slug((k.get('beeld') or {}).get('foto'), 40), 'idee': tekst((k.get('beeld') or {}).get('idee'), 400)},
        'kosten': {'euro': max(0, float((k.get('kosten') or {}).get('euro') or 0)),
                   'uren': max(0, float((k.get('kosten') or {}).get('uren') or 0)),
                   'toelichting': tekst((k.get('kosten') or {}).get('toelichting'), 300)},
        'impact': {'niveau': (k.get('impact') or {}).get('niveau') if (k.get('impact') or {}).get('niveau') in ('laag', 'middel', 'hoog') else 'middel',
                   'toelichting': tekst((k.get('impact') or {}).get('toelichting'), 300)},
        'criteria': {c: min(5, max(1, int(crit.get(c) or 3))) for c in GEWICHT},
        'bronnen': [{'titel': tekst(b.get('titel'), 200), 'url': b['url'], 'datum': str(b.get('datum') or '')[:10]}
                    for b in (k.get('bronnen') or []) if isinstance(b, dict) and re.match(r'https?://', str(b.get('url', '')))][:6],
        'herkomst': herkomst,
    }
    uit['hashtags'] = [h for h in uit['hashtags'] if h]
    return uit


def score(k):
    basis = sum(GEWICHT[c] * k['criteria'][c] for c in GEWICHT)   # 1 tot 5
    return max(1, min(100, round((basis - 1) / 4 * 99 + 1)))


def vul_in(k, ref, jaar, tarieven):
    k['ref'] = ref
    link = f'{SITE}{k["pagina"] or "/"}?ref={ref}'
    for veld in ('tekst', 'cta', 'titel'):
        k[veld] = k[veld].replace('{link}', link).replace('{jaar}', str(jaar)).replace('{uur}', str(tarieven.get('uur', '')))
    k['link'] = link if k['pagina'] else ''
    return k


def datum_van_moment(d, jaar):
    if isinstance(d, str):
        m, dd = map(int, d.split('-'))
        return date(jaar, m, dd)
    eerste = date(jaar, d['maand'], 1)
    if d['nr'] > 0:
        verschil = (d['weekdag'] - eerste.weekday()) % 7
        return eerste + timedelta(days=verschil + 7 * (d['nr'] - 1))
    volgende = date(jaar + (d['maand'] == 12), d['maand'] % 12 + 1, 1)
    laatste = volgende - timedelta(days=1)
    return laatste - timedelta(days=(laatste.weekday() - d['weekdag']) % 7)


def uit_kalender(van, tot, tarieven):
    kansen = []
    for m in json.loads((HIER / 'kalender.json').read_text())['momenten']:
        for jaar in (van.year, van.year + 1):
            moment = datum_van_moment(m['datum'], jaar)
            for p in m['posts']:
                d = moment - timedelta(days=p['voor'])
                if van <= d <= tot:
                    code = KANAALCODE.get(p['kanaal'].lower(), 'x')
                    k = vul_in(normaliseer(p, 'kalender'), f'{code}-{m["sleutel"]}-{jaar % 100}', moment.year, tarieven)
                    k.update(id=maak_id('kal', m['sleutel'], jaar, p['voor']), sleutel=m['sleutel'], datum=d.isoformat(),
                             moment={'naam': m['naam'], 'datum': moment.isoformat()})
                    kansen.append(k)
    return kansen


def uit_ideeen(van, tot, vorige, geschiedenis, tarieven):
    kansen = []
    open_vorige = {k['sleutel']: k for k in vorige if k.get('herkomst') == 'idee'}
    for i in json.loads((HIER / 'ideeen.json').read_text())['ideeen']:
        oud = open_vorige.get(i['sleutel'])
        laatst = dag(geschiedenis.get(i['sleutel'], ''))
        if not oud and laatst and (van - laatst).days < int(i.get('pauze', 30)):
            continue
        code = KANAALCODE.get(i['kanaal'].lower(), 'x')
        ident = oud['id'] if oud else maak_id('idee', i['sleutel'], van.isoformat())
        k = vul_in(normaliseer(i, 'idee'), f'{code}-{i["sleutel"]}-{ident[:4]}', van.year, tarieven)
        k.update(id=ident, sleutel=i['sleutel'], datum=oud['datum'] if oud and (dag(oud['datum']) or van) >= van else '',
                 weekdag=int(i.get('weekdag', 1)))
        kansen.append(k)
    return kansen


def uit_onderzoek(onderzoek, van, tot, tarieven):
    if not onderzoek:
        return []
    gemaakt = dag(onderzoek.get('gemaakt'))
    if not gemaakt or (van - gemaakt).days > ONDERZOEK_GELDIG:
        print(f'  Onderzoek van {onderzoek.get("gemaakt")} is te oud, overgeslagen.')
        return []
    kansen = []
    for ruw in onderzoek.get('kansen', []):
        k = normaliseer(ruw, 'onderzoek')
        if not k['titel'] or not k['tekst']:
            continue
        d = dag(ruw.get('datum'))
        if d and not (van <= d <= tot):
            continue
        s = slug(k['titel'], 30)
        k = vul_in(k, f'{KANAALCODE.get(k["kanaal"].lower(), "x")}-{s[:24]}', (d or van).year, tarieven)
        k.update(id=maak_id('ond', s), sleutel=s, datum=d.isoformat() if d else '', weekdag=int(ruw.get('weekdag', 2)) % 7)
        kansen.append(k)
    return kansen


def uit_eigen(eigen, van, tarieven):
    """Kansen die je zelf met "Nieuw idee" hebt gemaakt en aan de planning hebt toegevoegd."""
    kansen = []
    for ident, ruw in eigen.items():
        d = dag(ruw.get('datum'))
        if not d or d < van - timedelta(days=BEWAAR_NA):
            continue
        k = normaliseer(ruw, 'eigen')
        k = vul_in(k, f'{KANAALCODE.get(k["kanaal"].lower(), "x")}-eigen-{ident[:6]}', d.year, tarieven)
        k.update(id=ident, sleutel='eigen-' + ident, datum=d.isoformat())
        kansen.append(k)
    return kansen


def lijkt_op(a, b):
    wa, wb = set(slug(a['titel']).split('-')) - {''}, set(slug(b['titel']).split('-')) - {''}
    return bool(wa and wb) and len(wa & wb) / len(wa | wb) >= .6


def plan_data(kansen, van, tot):
    """Geeft kansen zonder datum de eerste vrije voorkeursdag, max. 2 posts per dag."""
    per_dag = {}
    for k in kansen:
        if k['datum']:
            per_dag[k['datum']] = per_dag.get(k['datum'], 0) + 1
    for k in sorted((k for k in kansen if not k['datum']), key=lambda k: -k['score']):
        d = van + timedelta(days=1)
        kandidaten = []
        while d <= tot:
            if per_dag.get(d.isoformat(), 0) < 2:
                kandidaten.append(d)
            d += timedelta(days=1)
        kies = next((d for d in kandidaten if d.weekday() == k.get('weekdag', 1)), kandidaten[0] if kandidaten else tot)
        k['datum'] = kies.isoformat()
        per_dag[k['datum']] = per_dag.get(k['datum'], 0) + 1


def kies(kansen, status, van):
    """Afgehandelde en goedgekeurde kansen blijven staan; van de rest de beste, met elke soort vertegenwoordigd."""
    vast = [k for k in kansen if k['id'] in status]
    open_ = sorted((k for k in kansen if k['id'] not in status and k['score'] >= MIN_SCORE), key=lambda k: -k['score'])
    plek = max(0, MAX_KANSEN - sum(1 for k in vast if status[k['id']].get('status') != 'afgewezen'))
    gekozen = []
    for soort in SOORTEN:   # eerst de beste twee van elke soort
        gekozen += [k for k in open_ if k['soort'] == soort][:2]
    gekozen = sorted(gekozen, key=lambda k: -k['score'])[:plek]
    for k in open_:
        if len(gekozen) >= plek:
            break
        if k not in gekozen:
            gekozen.append(k)
    return vast + gekozen


# ---------- hoofdprogramma ----------

def laad_sleutels(wachtwoord, nieuw_mag=True):
    bestand = lees_json(SLEUTEL)
    geheim = sleutels.open_geheim(bestand, wachtwoord) if bestand else None
    if not geheim and not nieuw_mag:
        sys.exit('Het wachtwoord past niet bij de sleutel. Draai eerst "Marketing bijwerken" (maakt een nieuwe sleutel) '
                 'en probeer het daarna opnieuw.')
    if not geheim:
        if bestand:
            print('LET OP: het wachtwoord past niet bij de bestaande sleutel (gewijzigd?). Nieuw sleutelpaar gemaakt;'
                  ' onderzoek en status van vóór de wijziging zijn niet meer te lezen.')
        bestand = sleutels.maak_sleutelpaar(wachtwoord)
        SLEUTEL.write_text(json.dumps(bestand, indent=1) + '\n')
        geheim = sleutels.open_geheim(bestand, wachtwoord)
    elif bestand['geheim'].get('iteraties', 0) < sleutels.ITERATIES:
        # Zelfde sleutelpaar, zwaarder verpakt: alle versleutelde bestanden blijven leesbaar
        print(f'Geheime sleutel opnieuw verpakt met {sleutels.ITERATIES} PBKDF2-iteraties.')
        bestand = sleutels.maak_sleutelpaar(wachtwoord, geheim)
        SLEUTEL.write_text(json.dumps(bestand, indent=1) + '\n')
    return bestand['publiek'], geheim


def lees_versleuteld(pad, geheim):
    bestand = lees_json(pad)
    if not bestand:
        return None
    try:
        return sleutels.ontsleutel(bestand, geheim)
    except Exception:
        print(f'  {pad.name}: niet te openen met deze sleutel, overgeslagen.')
        return None


def met_publicaties(status, publicaties):
    """Wat de Action "Marketing publiceren" heeft geplaatst telt als gepubliceerd."""
    uit = dict(status)
    for ident, p in publicaties.items():
        if p.get('url') and (uit.get(ident) or {}).get('status') == 'ingepland':
            uit[ident] = dict(uit[ident], status='gepubliceerd', gewijzigd=p.get('geplaatst', ''),
                              datum=str(p.get('geplaatst', ''))[:10] or uit[ident].get('datum'))
    return uit


def publiceer():
    """Voor de Action "Marketing publiceren": plaatst ingeplande posts met "Automatisch plaatsen"."""
    wachtwoord = os.environ.get('ADMIN_WACHTWOORD', '')
    if not wachtwoord:
        sys.exit('Geen ADMIN_WACHTWOORD ingesteld.')
    publiek, geheim = laad_sleutels(wachtwoord, nieuw_mag=False)
    statusbestand = lees_versleuteld(STATUS, geheim) or {}
    status = statusbestand.get('items', {})
    if not any(s.get('automatisch') and s.get('status') == 'ingepland' for s in status.values()):
        print('Niets ingepland om automatisch te plaatsen.')
        return
    data = lees_versleuteld(UIT, geheim) or {}
    kansen = {k['id']: k for k in data.get('kansen', [])}
    tarieven = lees_json(ROOT / 'tarieven.json') or {}
    for k in uit_eigen(statusbestand.get('eigen', {}), date.today() - timedelta(days=2), tarieven):
        kansen.setdefault(k['id'], k)
    bestand = lees_versleuteld(PUBLICATIES, geheim) or {}
    log = bestand.get('publicaties', {})
    if publiceren.publiceer(list(kansen.values()), status, log, proef='--proef' in sys.argv):
        PUBLICATIES.write_text(json.dumps(sleutels.versleutel({'publicaties': log}, publiek)) + '\n')
        print('Publicatielog bijgewerkt.')


def bijwerken():
    wachtwoord = os.environ.get('ADMIN_WACHTWOORD', '')
    if not wachtwoord:
        sys.exit('Geen ADMIN_WACHTWOORD ingesteld: niets opgeslagen (de lijst gaat nooit onversleuteld online).')
    publiek, geheim = laad_sleutels(wachtwoord)
    tarieven = lees_json(ROOT / 'tarieven.json') or {}
    van = datetime.now(ZoneInfo('Europe/Amsterdam')).date()
    tot = van + timedelta(days=DAGEN)

    vorige = lees_versleuteld(UIT, geheim) or {}
    statusbestand = lees_versleuteld(STATUS, geheim) or {}
    publicaties = (lees_versleuteld(PUBLICATIES, geheim) or {}).get('publicaties', {})
    status = met_publicaties(statusbestand.get('items', {}), publicaties)
    onderzoek = lees_versleuteld(ONDERZOEK, geheim)
    geschiedenis = dict(vorige.get('geschiedenis', {}))

    # Afgehandelde ideeën krijgen een pauze; ze blijven nog even zichtbaar in de kalender.
    oud = {k['id']: k for k in vorige.get('kansen', [])}
    for ident, s in status.items():
        if s.get('status') in AFGEHANDELD and ident in oud:
            geschiedenis[oud[ident]['sleutel']] = (s.get('gewijzigd') or van.isoformat())[:10]
    open_vorige = [k for k in oud.values() if status.get(k['id'], {}).get('status') not in AFGEHANDELD]

    kansen = uit_kalender(van, tot, tarieven) + uit_ideeen(van, tot, open_vorige, geschiedenis, tarieven) \
        + uit_onderzoek(onderzoek, van, tot, tarieven) + uit_eigen(statusbestand.get('eigen', {}), van, tarieven)
    # Kansen met een status die niet meer uit de bronnen komen (bijv. oud onderzoek) blijven staan zolang ze actueel zijn.
    nieuw = {k['id'] for k in kansen}
    for k in oud.values():
        s = status.get(k['id'])
        datum = dag((s or {}).get('datum') or k['datum'])
        if s and k['id'] not in nieuw and datum and datum >= van - timedelta(days=BEWAAR_NA):
            kansen.append(k)

    # Gepubliceerde posts onthouden, zodat de resultaten per post en per kanaal te volgen zijn.
    posts = {p['id']: p for p in vorige.get('posts', [])}
    for k in list(oud.values()) + kansen:
        s = status.get(k['id'], {})
        if s.get('status') == 'gepubliceerd' and k['id'] not in posts:
            posts[k['id']] = {'id': k['id'], 'ref': k['ref'], 'titel': k['titel'], 'kanaal': k['kanaal'],
                              'datum': s.get('datum') or k['datum']}
    posts = sorted(posts.values(), key=lambda p: p['datum'], reverse=True)[:200]
    uitslag, bonus = resultaten.verzamel(van, posts, (vorige.get('resultaten') or {}).get('advies'), tarieven)

    uniek = []
    for k in sorted(kansen, key=lambda k: (k['id'] not in status, -score(k))):
        k['bonus'] = bonus.get(k['kanaal'].lower(), 0)
        k['score'] = max(1, min(100, score(k) + k['bonus']))
        k['controle'] = controleer(k)
        if any(k['id'] == u['id'] or (k['id'] not in status and lijkt_op(k, u)) for u in uniek):
            continue
        uniek.append(k)
    gekozen = kies(uniek, status, van)
    plan_data(gekozen, van, tot)
    for k in gekozen:
        k.pop('weekdag', None)
    gekozen.sort(key=lambda k: (k['datum'], -k['score']))

    grens = van - timedelta(days=TREND_GELDIG)
    trends = [t for t in (onderzoek or {}).get('trends', [])
              if not dag((t.get('bron') or {}).get('datum')) or dag(t['bron']['datum']) >= grens]
    uit = {'van': van.isoformat(), 'tot': tot.isoformat(), 'kansen': gekozen, 'trends': trends,
           'onderzoek': {'gemaakt': (onderzoek or {}).get('gemaakt', ''), 'samenvatting': (onderzoek or {}).get('samenvatting', '')},
           'geschiedenis': geschiedenis, 'posts': posts, 'resultaten': uitslag,
           'koppelingen': publiceren.koppelingen(controleren=True)}

    print(f'{len(kansen)} kansen bekeken, {len(gekozen)} gekozen voor {van} tot {tot}'
          f' ({", ".join(f"{sum(k["soort"] == s for k in gekozen)} {s}" for s in SOORTEN)}).')
    if '--toon' in sys.argv:
        for k in gekozen:
            print(f'  {k["score"]:3}  {k["datum"]}  {k["soort"]:11} {k["kanaal"]:9} {k["titel"][:60]}'
                  + ('  [' + ', '.join(m['niveau'] for m in k['controle']) + ']' if k['controle'] else ''))
    if {k: v for k, v in vorige.items() if k != 'bijgewerkt'} == uit:
        print('Niets veranderd.')
        return
    uit['bijgewerkt'] = datetime.now(timezone.utc).isoformat(timespec='minutes')
    UIT.write_text(json.dumps(sleutels.versleutel(uit, publiek)) + '\n')


def versleutel_onderzoek(pad):
    """Voor de wekelijkse Claude-run: controleert het onderzoek en slaat het versleuteld op."""
    onderzoek = json.loads(Path(pad).read_text())
    fouten = []
    if not dag(onderzoek.get('gemaakt')):
        fouten.append('"gemaakt" moet een datum zijn (JJJJ-MM-DD)')
    kansen = onderzoek.get('kansen')
    if not isinstance(kansen, list) or not kansen:
        fouten.append('"kansen" moet een lijst met minstens één kans zijn')
    for i, k in enumerate(kansen or []):
        for veld in ('titel', 'soort', 'kanaal', 'doelgroep', 'waarom', 'tekst', 'cta', 'criteria'):
            if not k.get(veld):
                fouten.append(f'kans {i + 1}: veld "{veld}" ontbreekt')
        if k.get('soort') not in SOORTEN:
            fouten.append(f'kans {i + 1}: soort moet een van {SOORTEN} zijn')
        if k.get('datum') and not dag(k['datum']):
            fouten.append(f'kans {i + 1}: datum moet JJJJ-MM-DD zijn')
        rood = [m['tekst'] for m in controleer(normaliseer(k, 'onderzoek')) if m['niveau'] == 'rood']
        if rood:
            fouten.append(f'kans {i + 1} ("{k.get("titel")}"): ' + '; '.join(rood))
    for i, t in enumerate(onderzoek.get('trends', [])):
        if not re.match(r'https?://', str((t.get('bron') or {}).get('url', ''))):
            fouten.append(f'trend {i + 1}: bron.url ontbreekt')
    if fouten:
        sys.exit('Onderzoek niet opgeslagen:\n- ' + '\n- '.join(fouten))
    publiek = lees_json(SLEUTEL)['publiek']
    ONDERZOEK.write_text(json.dumps(sleutels.versleutel(onderzoek, publiek)) + '\n')
    print(f'Onderzoek opgeslagen: {len(kansen)} kansen, {len(onderzoek.get("trends", []))} trends → {ONDERZOEK.relative_to(ROOT)}')


OPDRACHTEN = {
    'korter': 'Maak de tekst korter en krachtiger, ongeveer de helft van de lengte.',
    'zakelijker': 'Maak de toon zakelijker, gericht op office managers, HR en ondernemers.',
    'speelser': 'Maak de toon speelser en luchtiger, zonder kinderachtig te worden.',
    'persoonlijker': 'Maak het persoonlijker: vertel het vanuit Rutger zelf, met een klein moment achter de bar.',
    'engels': 'Vertaal naar natuurlijk Engels voor internationale gasten en expats. Gebruik dan "Enjoy responsibly." als slotzin bij alcohol.',
    'instagram': 'Herschrijf als Instagram-caption: sterke eerste regel, korte alinea\'s, 4 tot 8 relevante hashtags.',
    'facebook': 'Herschrijf als Facebook-post voor 30 tot 55-jarigen in de regio, zonder hashtags of met hoogstens twee.',
    'linkedin': 'Herschrijf als LinkedIn-post voor zakelijke klanten: persoonlijk verhaal, nut voor het team, 3 hashtags.',
    'tiktok': 'Herschrijf als TikTok-script: een hook in de eerste 2 seconden, 3 tot 5 korte scènes, en daarna een korte caption.',
    'google': 'Herschrijf als update voor het Google-bedrijfsprofiel: maximaal 1200 tekens, geen hashtags.',
}


def ai_verzoek():
    """Voor de Action "Marketing AI": verwerkt een versleuteld verzoek van de adminpagina (env VERZOEK)."""
    wachtwoord = os.environ.get('ADMIN_WACHTWOORD', '')
    if not wachtwoord:
        sys.exit('Geen ADMIN_WACHTWOORD ingesteld.')
    publiek, geheim = laad_sleutels(wachtwoord, nieuw_mag=False)   # nooit een tweede sleutelpaar naast de nachtelijke run
    tarieven = lees_json(ROOT / 'tarieven.json') or {}
    try:
        verzoek = sleutels.ontsleutel(json.loads(os.environ['VERZOEK']), geheim)
    except Exception:
        sys.exit('Verzoek niet te openen: versleuteld met een oude sleutel. Herlaad de adminpagina en probeer opnieuw.')
    antwoord = {'id': str(verzoek.get('id', ''))[:40], 'soort': verzoek.get('soort'),
                'gemaakt': datetime.now(timezone.utc).isoformat(timespec='seconds')}
    systeem = ai.basis(tarieven)
    vrij = str(verzoek.get('vrij') or '')[:1000]
    try:
        if verzoek.get('soort') == 'nieuw':
            vraag = ('Bedenk één nieuwe marketingkans op basis van deze wens van Rutger: "' + vrij + '".\n'
                     + (f'Kanaal: {verzoek["kanaal"]}.\n' if verzoek.get('kanaal') else '') +
                     'Antwoord als JSON met: titel, soort ("snel", "structureel" of "betaald"), kanaal, formaat, tijd (UU:MM), '
                     'doelgroep, waarom, tekst (volledig en direct bruikbaar), cta (met {link}), hashtags (lijst zonder #), '
                     'pagina ("/", "/cocktail-bartender-privefeest/", "/cocktail-bartender-bedrijfsfeest/", "/tarieven/" of "/faq/"), '
                     'beeld {foto: "beck-portret", "galerij-gin-tonic", "galerij-garneren", "galerij-lachen" of "", idee}, '
                     'kosten {euro, uren, toelichting}, impact {niveau: "laag", "middel" of "hoog", toelichting}, '
                     'criteria {relevantie, impact, haalbaarheid, tijd, budget} elk 1 tot 5.')
            k = normaliseer(ai.vraag_json(systeem, vraag), 'eigen')
            k['controle'] = controleer(k)
            if any(m['niveau'] == 'rood' for m in k['controle']):
                k = normaliseer(ai.vraag_json(systeem, vraag + '\nLet op, vorige keer ging dit mis: '
                                              + '; '.join(m['tekst'] for m in k['controle'])), 'eigen')
                k['controle'] = controleer(k)
            k['score'] = score(k)
            antwoord['kans'] = k
        else:
            kans = verzoek.get('kans') or {}
            opdracht = OPDRACHTEN.get(verzoek.get('opdracht'), '')
            vraag = ('Dit is een marketingvoorstel:\n' + json.dumps({v: kans.get(v) for v in
                     ('titel', 'kanaal', 'formaat', 'doelgroep', 'tekst', 'cta', 'hashtags')}, ensure_ascii=False) +
                     f'\n\nOpdracht: {opdracht} {vrij}'.rstrip() +
                     '\nGeef twee verschillende verbeterde versies. Antwoord als JSON: {"varianten": [{"tekst": "...", '
                     '"cta": "...", "hashtags": ["zonder", "hekje"], "toelichting": "wat je veranderde, in één zin"}]}')
            varianten = []
            for poging in range(2):
                ruw = ai.vraag_json(systeem, vraag)
                varianten = []
                for v in (ruw.get('varianten') or [])[:3]:
                    if not isinstance(v, dict) or not v.get('tekst'):
                        continue
                    n = normaliseer(dict(kans, tekst=v.get('tekst'), cta=v.get('cta') or kans.get('cta'),
                                         hashtags=v.get('hashtags') or []), 'ai')
                    varianten.append({'tekst': n['tekst'], 'cta': n['cta'], 'hashtags': n['hashtags'],
                                      'toelichting': str(v.get('toelichting') or '')[:300], 'controle': controleer(n)})
                schoon = [v for v in varianten if not any(m['niveau'] == 'rood' for m in v['controle'])]
                if schoon:
                    break
                rood = [m['tekst'] for v in varianten for m in v['controle'] if m['niveau'] == 'rood']
                vraag += '\nLet op, vorige keer ging dit mis: ' + ('; '.join(rood) or 'geen bruikbare varianten')
            antwoord['varianten'] = schoon or varianten
            antwoord['kans_id'] = str(kans.get('id', ''))[:20]
    except ai.GeenAI as e:
        print(f'AI niet beschikbaar: {e}')
        antwoord['fout'] = 'De AI was niet bereikbaar (daglimiet of storing). Probeer het later opnieuw.'
    alle = (lees_versleuteld(AI_UIT, geheim) or {}).get('antwoorden', [])
    alle = [antwoord] + [a for a in alle if a.get('id') != antwoord['id']][:29]
    AI_UIT.write_text(json.dumps(sleutels.versleutel({'antwoorden': alle}, publiek)) + '\n')
    print('Antwoord opgeslagen' + (' (met fout)' if 'fout' in antwoord else '') + '.')


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'versleutel-onderzoek':
        versleutel_onderzoek(sys.argv[2])
    elif len(sys.argv) > 1 and sys.argv[1] == 'ai-verzoek':
        ai_verzoek()
    elif len(sys.argv) > 1 and sys.argv[1] == 'publiceer':
        publiceer()
    else:
        bijwerken()
