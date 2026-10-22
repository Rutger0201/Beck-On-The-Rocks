#!/usr/bin/env python3
"""Mogelijke klussen zoeken voor de adminpagina (/admin/).

Zoekt events en oproepen voor de komende maand, geeft elk een score en zet de beste in
assets/data/events.enc.json. Dat bestand is versleuteld met jouw wachtwoord: de site is openbaar,
dus zonder wachtwoord kan niemand de lijst lezen. De adminpagina ontsleutelt hem in je browser.

Bronnen:
  1. Agenda's in tools/event-instellingen.json ("bronnen"): webpagina's met evenementen in
     schema.org-formaat (de meeste agenda's en Eventbrite hebben dat) of iCal-links (.ics).
  2. Claude met webzoeken (als ANTHROPIC_API_KEY is ingesteld): zoekt openbare pagina's,
     ook openbare Facebook-events en oproepen als "barman gezocht". Er wordt nooit ingelogd.

Nodig (GitHub → Settings → Secrets and variables → Actions):
  ADMIN_WACHTWOORD    wachtwoord voor de adminpagina                    (secret, verplicht)
  ANTHROPIC_API_KEY   sleutel van console.anthropic.com                 (secret, optioneel)

Gebruik: ADMIN_WACHTWOORD=... python3 tools/events.py   (--toon: lijst ook in de terminal tonen)
Pakketten: pip install cryptography anthropic
"""
import base64
import hashlib
import html
import json
import os
import re
import sys
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INSTELLINGEN = ROOT / 'tools/event-instellingen.json'
UIT = ROOT / 'assets/data/events.enc.json'
ITERATIES = 310_000  # PBKDF2; moet gelijk zijn aan admin/index.html
MODEL = 'claude-opus-5-5'
AGENT = 'Mozilla/5.0 (compatible; BeckOnTheRocks-eventzoeker; +https://beckontherocks.nl)'


# ---------- ophalen ----------

def haal(url):
    req = urllib.request.Request(url, headers={'User-Agent': AGENT, 'Accept-Language': 'nl,en;q=0.8'})
    with urllib.request.urlopen(req, timeout=25) as r:
        return r.read().decode(r.headers.get_content_charset() or 'utf-8', 'replace')


def tekst(v):
    if isinstance(v, list):
        v = v[0] if v else ''
    if isinstance(v, dict):
        v = v.get('name') or v.get('@id') or ''
    return html.unescape(re.sub(r'<[^>]+>', ' ', str(v or ''))).strip()


def plaats_van(loc):
    if isinstance(loc, list):
        loc = loc[0] if loc else {}
    if not isinstance(loc, dict):
        return tekst(loc), ''
    adres = loc.get('address') or {}
    if isinstance(adres, dict):
        stad = adres.get('addressLocality') or ''
        adres = ', '.join(x for x in (adres.get('streetAddress'), adres.get('postalCode'), stad) if x)
    else:
        stad = ''
    return tekst(stad or loc.get('name')), tekst(adres)


def uit_jsonld(pagina, bron):
    gevonden = []

    def loop(x):
        if isinstance(x, list):
            for y in x:
                loop(y)
        elif isinstance(x, dict):
            soort = x.get('@type')
            soort = ' '.join(soort) if isinstance(soort, list) else str(soort or '')
            if soort.endswith('Event') and x.get('startDate'):
                stad, adres = plaats_van(x.get('location'))
                org = x.get('organizer') or {}
                gevonden.append({
                    'naam': tekst(x.get('name')), 'start': str(x.get('startDate')), 'eind': str(x.get('endDate') or ''),
                    'plaats': stad, 'adres': adres, 'organisator': tekst(org),
                    'mail': tekst(org.get('email')) if isinstance(org, dict) else '',
                    'url': tekst(x.get('url')) or bron, 'beschrijving': tekst(x.get('description'))[:400], 'bron': bron,
                })
            for y in x.values():
                if isinstance(y, (dict, list)):
                    loop(y)

    for blok in re.findall(r'<script[^>]+application/ld\+json[^>]*>(.*?)</script>', pagina, re.S | re.I):
        try:
            loop(json.loads(blok.strip()))
        except ValueError:
            pass
    return gevonden


def uit_ical(pagina, bron):
    pagina = re.sub(r'\r?\n[ \t]', '', pagina)  # gevouwen regels weer aan elkaar
    gevonden = []
    for blok in re.findall(r'BEGIN:VEVENT(.*?)END:VEVENT', pagina, re.S):
        veld = {}
        for regel in blok.strip().splitlines():
            if ':' in regel:
                k, v = regel.split(':', 1)
                veld.setdefault(k.split(';')[0].upper(), v.replace('\\,', ',').replace('\\n', ' ').strip())

        def tijd(v):
            m = re.match(r'(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2}))?', v or '')
            if not m:
                return ''
            return f'{m[1]}-{m[2]}-{m[3]}' + (f'T{m[4]}:{m[5]}' if m[4] else '')
        if veld.get('DTSTART'):
            gevonden.append({'naam': veld.get('SUMMARY', ''), 'start': tijd(veld['DTSTART']), 'eind': tijd(veld.get('DTEND')),
                             'plaats': veld.get('LOCATION', ''), 'adres': veld.get('LOCATION', ''), 'organisator': '',
                             'mail': '', 'url': veld.get('URL') or bron, 'beschrijving': veld.get('DESCRIPTION', '')[:400],
                             'bron': bron})
    return gevonden


def uit_bronnen(inst):
    alles = []
    for bron in inst.get('bronnen', []):
        try:
            pagina = haal(bron)
        except Exception as e:  # één kapotte agenda mag de rest niet tegenhouden
            print(f'  {bron}: niet gelukt ({e})')
            continue
        lijst = uit_ical(pagina, bron) if 'BEGIN:VCALENDAR' in pagina[:500] else uit_jsonld(pagina, bron)
        print(f'  {bron}: {len(lijst)} events')
        alles += lijst
    return alles


def met_claude(inst, van, tot):
    sleutel = os.environ.get('ANTHROPIC_API_KEY', '').strip()
    if not sleutel or not inst.get('zoeken_met_claude', True):
        print('  Claude: overgeslagen (geen ANTHROPIC_API_KEY of uitgezet)')
        return []
    import anthropic

    regio = (f'binnen {inst.get("max_km", 50)} km van {inst["woonplaats"]}' if inst.get('woonplaats')
             else 'in heel Nederland')
    vraag = f"""Je zoekt klussen voor Rutger van Beck on the Rocks, een freelance cocktailbartender {regio}.
Hij komt alleen als barman (geen drank of ijs, wel eigen cocktailgereedschap), €45 per uur.

Zoek op het web naar events tussen {van.isoformat()} en {tot.isoformat()} waar een losse bartender goed past:
- openbare oproepen waarin iemand een barman, bartender of cocktailbar zoekt (vacaturesites, Marktplaats,
  openbare Facebook-groepen en -events, LinkedIn-posts die zonder inloggen te zien zijn)
- bedrijfsfeesten, kerst- en nieuwjaarsborrels, netwerkborrels, jubilea, openingen, pop-ups, gala's,
  huwelijks- en evenementenbeurzen, feesten van verenigingen en sportclubs
Sla grote festivals, concerten en zalen met een eigen vaste bar over, net als alles waarvoor je moet inloggen.

Geef bij elk event een score van 0 tot 100 voor hoe kansrijk het is dat Rutger daar als bartender geboekt wordt,
en in één korte Nederlandse zin waarom. Neem alleen events op die je echt op een pagina hebt gezien, met die link.

Antwoord met alleen een JSON-lijst tussen <events> en </events>, elk item met deze velden:
naam, start (JJJJ-MM-DD of JJJJ-MM-DDTUU:MM), plaats, organisator, mail (of ""), telefoon (of ""), url,
soort ("oproep" als iemand een bartender zoekt, anders "event"), score, waarom."""
    tools = [{'type': 'web_search_20260209', 'name': 'web_search', 'max_uses': int(inst.get('claude_zoekopdrachten', 12)),
              'user_location': {'type': 'approximate', 'country': 'NL', 'timezone': 'Europe/Amsterdam',
                                **({'city': inst['woonplaats']} if inst.get('woonplaats') else {})}}]
    client = anthropic.Anthropic(api_key=sleutel)
    berichten = [{'role': 'user', 'content': vraag}]
    for _ in range(5):
        res = client.beta.messages.create(model=MODEL, max_tokens=16000, messages=berichten, tools=tools,
                                          output_config={'effort': 'medium'},
                                          betas=['server-side-fallback-2026-07-01'], fallbacks='default')
        if res.stop_reason != 'pause_turn':
            break
        berichten = [berichten[0], {'role': 'assistant', 'content': res.content}]  # de server gaat verder
    if res.stop_reason == 'refusal':
        print('  Claude: verzoek geweigerd')
        return []
    antwoord = ''.join(b.text for b in res.content if b.type == 'text')
    m = re.search(r'<events>(.*?)</events>', antwoord, re.S)
    try:
        lijst = json.loads(m[1]) if m else []
    except ValueError:
        print('  Claude: antwoord was geen geldige lijst')
        return []
    for e in lijst:
        e['bron'] = 'Claude webzoeken'
        e['claude_score'] = e.pop('score', None)
    print(f'  Claude: {len(lijst)} events ({res.usage.input_tokens} + {res.usage.output_tokens} tokens)')
    return lijst


# ---------- beoordelen ----------

def datum(s):
    try:
        d = datetime.fromisoformat(str(s).replace('Z', '+00:00'))
        return d.date()
    except ValueError:
        try:
            return date.fromisoformat(str(s)[:10])
        except ValueError:
            return None


def beoordeel(e, inst, vandaag):
    woorden = f'{e.get("naam", "")} {e.get("beschrijving", "")} {e.get("organisator", "")}'.lower()
    redenen, score = [], 0
    cs = e.get('claude_score')
    score += round(float(cs) * 0.6) if isinstance(cs, (int, float)) else 25
    plus = [w for w in inst.get('plus', {}) if w in woorden]
    score += min(45, sum(inst['plus'][w] for w in plus))
    score += sum(v for w, v in inst.get('min', {}).items() if w in woorden)
    if plus:
        redenen.append('past bij: ' + ', '.join(plus[:3]))
    if e.get('soort') == 'oproep':
        score += 25
        redenen.append('iemand zoekt een bartender')
    plaatsen = [p.lower() for p in inst.get('plaatsen', []) + [inst.get('woonplaats', '')] if p]
    if any(p in f'{e.get("plaats", "")} {e.get("adres", "")}'.lower() for p in plaatsen):
        score += 15
        redenen.append('in je regio')
    if e.get('mail') or e.get('telefoon'):
        score += 10
        redenen.append('contact bekend')
    d = e['_datum']
    if d.weekday() >= 4:
        score += 5
    if (d - vandaag).days < 4:
        score -= 10
        redenen.append('erg kort dag')
    e['score'] = max(0, min(100, score))
    e['waarom'] = e.get('waarom') or ('; '.join(redenen) or 'algemeen event').capitalize()
    return e


def sleutel_van(e):
    naam = re.sub(r'[^a-z0-9]', '', (e.get('naam') or '').lower())[:40]
    return f'{e["_datum"]}-{naam}'


# ---------- versleutelen ----------

def versleutel(gegevens, wachtwoord):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
    zout, iv = os.urandom(16), os.urandom(12)
    sleutel = hashlib.pbkdf2_hmac('sha256', wachtwoord.encode(), zout, ITERATIES, 32)
    data = AESGCM(sleutel).encrypt(iv, json.dumps(gegevens, ensure_ascii=False).encode(), None)
    b64 = lambda b: base64.b64encode(b).decode()
    return {'versie': 1, 'iteraties': ITERATIES, 'zout': b64(zout), 'iv': b64(iv), 'data': b64(data)}


def main():
    wachtwoord = os.environ.get('ADMIN_WACHTWOORD', '')
    if not wachtwoord:
        sys.exit('Geen ADMIN_WACHTWOORD ingesteld: niets opgeslagen (de lijst gaat nooit onversleuteld online).')
    inst = json.loads(INSTELLINGEN.read_text())
    vandaag = datetime.now(timezone(timedelta(hours=1))).date()
    tot = vandaag + timedelta(days=int(inst.get('dagen_vooruit', 31)))

    print('Zoeken:')
    ruw = uit_bronnen(inst) + met_claude(inst, vandaag, tot)
    uniek = {}
    for e in ruw:
        d = datum(e.get('start'))
        if not d or not (vandaag <= d <= tot) or not e.get('naam'):
            continue
        e['_datum'] = d
        e = beoordeel(e, inst, vandaag)
        k = sleutel_van(e)
        if k not in uniek or e['score'] > uniek[k]['score']:
            uniek[k] = e
    goed = [e for e in uniek.values() if e['score'] >= int(inst.get('min_score', 20))]
    beste = sorted(goed, key=lambda e: (-e['score'], e['_datum']))[:int(inst.get('top', 15))]
    for e in beste:
        e['id'] = hashlib.sha1(sleutel_van(e).encode()).hexdigest()[:10]
        del e['_datum']
    print(f'{len(ruw)} gevonden, {len(uniek)} in de komende {inst.get("dagen_vooruit", 31)} dagen, top {len(beste)} bewaard.')
    if '--toon' in sys.argv:
        for e in beste:
            print(f'  {e["score"]:3}  {e["start"][:10]}  {e["naam"][:60]}  ({e.get("plaats", "")})')

    UIT.parent.mkdir(parents=True, exist_ok=True)
    UIT.write_text(json.dumps(versleutel({'bijgewerkt': datetime.now(timezone.utc).isoformat(timespec='minutes'),
                                         'van': vandaag.isoformat(), 'tot': tot.isoformat(), 'events': beste},
                                        wachtwoord)) + '\n')


if __name__ == '__main__':
    main()
