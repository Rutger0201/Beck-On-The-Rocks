"""Resultaten voor het tabblad Resultaten: bezoekers en aanvragen (GoatCounter), Search Console en een SEO-controle.

Optionele secrets (GitHub → Settings → Secrets and variables → Actions):
  GOATCOUNTER_TOKEN     API-sleutel van GoatCounter (Settings → API → recht "Read statistics")
  GSC_SERVICE_ACCOUNT   JSON-sleutel van een Google-serviceaccount met leesrecht in Search Console
Zonder deze secrets blijft het bij de SEO-controle van je eigen pagina's.
"""
import base64
import json
import os
import re
import time
import urllib.parse
import urllib.request
from datetime import date, timedelta
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DAGEN = 30


def _haal(url, headers=None, data=None):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def _aantal(x):
    return int(x.get('count') if x.get('count') is not None else x.get('count_unique') or 0)


# ---------- GoatCounter ----------

def goatcounter(van, tot):
    token = os.environ.get('GOATCOUNTER_TOKEN', '').strip()
    m = re.search(r"goatcounter:\s*'([^']*)'", (ROOT / 'assets/js/config.js').read_text())
    code = m[1].strip() if m else ''
    if not token or not code:
        return None
    basis = f'https://{code}.goatcounter.com/api/v0/stats'
    kop = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    periode = urllib.parse.urlencode({'start': van.isoformat(), 'end': tot.isoformat()})
    uit, fouten = {'van': van.isoformat(), 'tot': tot.isoformat()}, []

    try:
        totaal = _haal(f'{basis}/total?{periode}', kop)
        uit['bezoekers'] = int(totaal.get('total') or totaal.get('total_unique') or 0)
        uit['per_dag'] = [{'dag': s.get('day', '')[:10], 'n': int(s.get('daily') or sum(s.get('hourly') or []))}
                          for s in totaal.get('stats', []) if s.get('day')]
    except Exception as e:
        fouten.append(f'totaal: {e}')
    try:
        paginas, events = [], {}
        hits = _haal(f'{basis}/hits?{periode}&limit=100', kop)
        for h in hits.get('hits', []):
            if h.get('event'):
                events[h.get('path', '')] = _aantal(h)
            else:
                paginas.append({'pad': h.get('path', ''), 'n': _aantal(h)})
        uit['paginas'] = sorted(paginas, key=lambda p: -p['n'])[:10]
        uit['events'] = events
        uit['aanvragen'] = events.get('aanvraag-verstuurd', 0)
        uit['aanvragen_via'] = {p.split('/', 1)[1]: n for p, n in events.items() if p.startswith('aanvraag-via/')}
    except Exception as e:
        fouten.append(f'paginas: {e}')
    try:
        refs = _haal(f'{basis}/toprefs?{periode}&limit=50', kop)
        uit['bronnen'] = [{'naam': r.get('name') or '(direct)', 'n': _aantal(r)} for r in refs.get('stats', [])]
    except Exception as e:
        fouten.append(f'bronnen: {e}')
    if fouten:
        uit['fouten'] = fouten
        print('  GoatCounter: ' + '; '.join(fouten))
    return uit


# ---------- Search Console ----------

def _google_token(account):
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import padding
    b64 = lambda b: base64.urlsafe_b64encode(b).rstrip(b'=')
    nu = int(time.time())
    kop = b64(json.dumps({'alg': 'RS256', 'typ': 'JWT'}).encode())
    claims = b64(json.dumps({'iss': account['client_email'], 'scope': 'https://www.googleapis.com/auth/webmasters.readonly',
                             'aud': 'https://oauth2.googleapis.com/token', 'iat': nu, 'exp': nu + 3600}).encode())
    sleutel = serialization.load_pem_private_key(account['private_key'].encode(), None)
    handtekening = b64(sleutel.sign(kop + b'.' + claims, padding.PKCS1v15(), hashes.SHA256()))
    data = urllib.parse.urlencode({'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                                   'assertion': (kop + b'.' + claims + b'.' + handtekening).decode()}).encode()
    return _haal('https://oauth2.googleapis.com/token', {'Content-Type': 'application/x-www-form-urlencoded'}, data)['access_token']


def search_console(van, tot):
    ruw = os.environ.get('GSC_SERVICE_ACCOUNT', '').strip()
    if not ruw:
        return None
    try:
        token = _google_token(json.loads(ruw))
    except Exception as e:
        print(f'  Search Console: inloggen mislukt ({e})')
        return {'fout': 'Inloggen bij Google lukte niet; controleer de JSON-sleutel.'}
    vraag = json.dumps({'startDate': van.isoformat(), 'endDate': tot.isoformat(), 'dimensions': ['query'], 'rowLimit': 50}).encode()
    for site in ('sc-domain:beckontherocks.nl', 'https://beckontherocks.nl/'):
        try:
            res = _haal(f'https://www.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(site, safe="")}/searchAnalytics/query',
                        {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, vraag)
        except Exception as e:
            print(f'  Search Console {site}: {e}')
            continue
        rijen = [{'zoekterm': r['keys'][0], 'kliks': int(r.get('clicks', 0)), 'vertoningen': int(r.get('impressions', 0)),
                  'positie': round(r.get('position', 0), 1)} for r in res.get('rows', [])]
        return {'site': site, 'zoektermen': rijen,
                'bijna': [r for r in rijen if 4 <= r['positie'] <= 20 and r['vertoningen'] >= 5][:10]}
    return {'fout': 'Geen toegang. Voeg het serviceaccount toe als gebruiker in Search Console.'}


# ---------- SEO-controle van de eigen pagina's ----------

class _Pagina(HTMLParser):
    def __init__(self):
        super().__init__()
        self.titel, self.omschrijving, self.h1, self.zonder_alt, self.canoniek, self.jsonld = '', '', 0, 0, False, False
        self._in, self._tekst, self._skip = None, [], 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'style'):
            self._skip += 1
            if a.get('type') == 'application/ld+json':
                self.jsonld = True
        if tag == 'title':
            self._in = 'titel'
        elif tag == 'h1':
            self.h1 += 1
        elif tag == 'meta' and (a.get('name') or '').lower() == 'description':
            self.omschrijving = a.get('content') or ''
        elif tag == 'link' and a.get('rel') == 'canonical':
            self.canoniek = True
        elif tag == 'img' and 'alt' not in a:
            self.zonder_alt += 1

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self._skip = max(0, self._skip - 1)
        if tag == 'title':
            self._in = None

    def handle_data(self, data):
        if self._in == 'titel':
            self.titel += data
        elif not self._skip:
            self._tekst.append(data)

    @property
    def woorden(self):
        return len(' '.join(self._tekst).split())


def seo_controle():
    bevindingen = []
    urls = re.findall(r'<loc>https://beckontherocks\.nl(/[^<]*)</loc>', (ROOT / 'sitemap.xml').read_text())
    for pad in urls:
        bestand = ROOT / pad.strip('/') / 'index.html' if pad != '/' else ROOT / 'index.html'
        if not bestand.exists():
            continue
        p = _Pagina()
        p.feed(bestand.read_text())
        punt = lambda ernst, tekst: bevindingen.append({'pagina': pad, 'ernst': ernst, 'tekst': tekst})
        lt, lo = len(p.titel.strip()), len(p.omschrijving.strip())
        if not lt:
            punt('hoog', 'Geen <title>.')
        elif lt > 65:
            punt('laag', f'Titel is {lt} tekens; Google toont er ongeveer 60. Zet de zoekwoorden vooraan.')
        if not lo:
            punt('hoog', 'Geen meta-omschrijving.')
        elif not 70 <= lo <= 160:
            punt('laag', f'Meta-omschrijving is {lo} tekens; 120 tot 155 werkt het best.')
        if p.h1 != 1:
            punt('middel', f'{p.h1} koppen van niveau 1 (h1); gebruik er precies één.')
        if p.zonder_alt:
            punt('middel', f'{p.zonder_alt} afbeelding(en) zonder alt-tekst.')
        if not p.canoniek:
            punt('laag', 'Geen canonical-link.')
        if not p.jsonld and pad not in ('/privacy/',):
            punt('laag', 'Geen gestructureerde gegevens (JSON-LD) voor Google.')
        if p.woorden < 300 and pad not in ('/privacy/',):
            punt('middel', f'Weinig tekst ({p.woorden} woorden); Google beoordeelt pagina\'s met 400+ woorden vaak beter.')
    if not any('almere' in u for u in urls):
        bevindingen.append({'pagina': '(nieuw)', 'ernst': 'middel',
                            'tekst': 'Er is nog geen pagina voor "cocktailbartender Almere". Lokale zoekopdrachten hebben weinig concurrentie.'})
    return bevindingen


# ---------- verbanden met je posts ----------

def campagnes(resultaten, posts):
    """Bezoeken en aanvragen per gepubliceerde post (via de ?ref= in de link) en per kanaal."""
    bronnen = {b['naam']: b['n'] for b in (resultaten or {}).get('bronnen', [])}
    via = (resultaten or {}).get('aanvragen_via', {})
    lijst = [dict(p, bezoeken=bronnen.get(p['ref'], 0), aanvragen=via.get(p['ref'], 0)) for p in posts]
    kanalen = {}
    for p in lijst:
        k = kanalen.setdefault(p['kanaal'], {'kanaal': p['kanaal'], 'posts': 0, 'bezoeken': 0, 'aanvragen': 0})
        k['posts'] += 1
        k['bezoeken'] += p['bezoeken']
        k['aanvragen'] += p['aanvragen']
    return lijst, sorted(kanalen.values(), key=lambda k: -k['bezoeken'])


def kanaalbonus(kanalen):
    """Kanalen die meer bezoekers per post opleveren krijgen tot 5 punten extra, slechtere tot 5 minder."""
    bruikbaar = [k for k in kanalen if k['posts'] >= 2]
    totaal = sum(k['bezoeken'] for k in bruikbaar)
    if len(bruikbaar) < 2 or totaal < 10:
        return {}
    gemiddeld = totaal / sum(k['posts'] for k in bruikbaar)
    return {k['kanaal'].lower(): max(-5, min(5, round((k['bezoeken'] / k['posts'] / gemiddeld - 1) * 5))) for k in bruikbaar}


def advies(resultaten, kanalen, seo, gsc, tarieven, vandaag):
    """Advies voor de komende weken; met AI als dat lukt, anders met vaste regels."""
    feiten = {'bezoekers_30_dagen': (resultaten or {}).get('bezoekers'), 'aanvragen_30_dagen': (resultaten or {}).get('aanvragen'),
              'bronnen': (resultaten or {}).get('bronnen', [])[:10], 'paginas': (resultaten or {}).get('paginas', [])[:8],
              'kanalen': kanalen, 'seo': seo[:8], 'search_console_bijna_pagina_1': (gsc or {}).get('bijna', [])}
    try:
        import ai
        antwoord = ai.vraag_json(ai.basis(tarieven), 'Dit zijn de marketingresultaten van de afgelopen 30 dagen (alleen tellingen, '
                                 'geen persoonsgegevens):\n' + json.dumps(feiten, ensure_ascii=False) +
                                 '\n\nGeef in het Nederlands een eerlijke samenvatting (2-3 zinnen) en 3 tot 5 concrete aanbevelingen '
                                 'voor de komende vier weken, gebaseerd op deze cijfers. Zeg het als er te weinig gegevens zijn. '
                                 'Antwoord als JSON: {"samenvatting": "...", "aanbevelingen": [{"titel": "...", "uitleg": "..."}]}',
                                 temperatuur=0.4)
        return {'datum': vandaag.isoformat(), 'bron': 'ai', 'samenvatting': str(antwoord.get('samenvatting', ''))[:800],
                'aanbevelingen': [{'titel': str(a.get('titel', ''))[:120], 'uitleg': str(a.get('uitleg', ''))[:600]}
                                  for a in antwoord.get('aanbevelingen', [])[:5] if isinstance(a, dict)]}
    except Exception as e:
        print(f'  Advies zonder AI ({e})')
    tips = []
    if not resultaten:
        tips.append({'titel': 'Koppel GoatCounter', 'uitleg': 'Zonder statistieken kan het systeem niet zien wat werkt. Zie Resultaten → Instellen.'})
    elif not resultaten.get('aanvragen'):
        tips.append({'titel': 'Maak de stap naar een aanvraag kleiner', 'uitleg': 'Er kwamen bezoekers maar geen aanvragen. Zet in elke post een duidelijke call-to-action met de link naar het formulier.'})
    if kanalen:
        beste = kanalen[0]
        tips.append({'titel': f'Meer op {beste["kanaal"]}', 'uitleg': f'{beste["kanaal"]} leverde de meeste bezoekers op ({beste["bezoeken"]}). Plan daar de komende weken extra posts.'})
    for b in [s for s in seo if s['ernst'] == 'hoog'][:2]:
        tips.append({'titel': f'SEO: {b["pagina"]}', 'uitleg': b['tekst']})
    return {'datum': vandaag.isoformat(), 'bron': 'regels', 'samenvatting': '', 'aanbevelingen': tips}


def verzamel(vandaag, posts, vorig_advies, tarieven):
    van = vandaag - timedelta(days=DAGEN)
    gc = goatcounter(van, vandaag)
    gsc = search_console(van, vandaag - timedelta(days=2))   # Search Console loopt twee dagen achter
    seo = seo_controle()
    per_post, kanalen = campagnes(gc, posts)
    uit = {'goatcounter': gc, 'search_console': gsc, 'seo': seo, 'posts': per_post, 'kanalen': kanalen}
    oud = (vorig_advies or {}).get('datum', '')
    vers = oud and (vandaag - date.fromisoformat(oud)).days < 7
    uit['advies'] = vorig_advies if vers else advies(gc, kanalen, seo, gsc, tarieven, vandaag)
    return uit, kanaalbonus(kanalen)
