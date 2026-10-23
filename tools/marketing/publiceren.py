"""Publiceren na goedkeuring (Action "Marketing publiceren", elk uur).

Plaatst alleen posts die Rutger op de adminpagina heeft goedgekeurd, ingepland en op "Automatisch plaatsen" gezet,
op of na hun geplande tijd. Zonder rode punten uit de alcoholcontrole en hoogstens MAX_PER_RUN per keer.
Het resultaat (link of fout) staat versleuteld in assets/data/marketing-publicaties.enc.json; dat bestand schrijft
alleen deze actie, zodat er nooit iets dubbel geplaatst wordt.

Koppelingen (repository secrets, allemaal optioneel):
  Instagram en Facebook: META_PAGE_TOKEN, META_PAGE_ID, META_IG_ID (Meta Graph API)
  LinkedIn:              LINKEDIN_TOKEN (60 dagen geldig), optioneel LINKEDIN_AUTHOR (urn:li:organization:...);
                         zonder LINKEDIN_AUTHOR plaatst hij op je persoonlijke profiel
TikTok, Google en de rest blijven handwerk: kopieer de tekst op de adminpagina.
"""
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from controle import controleer

SITE = 'https://beckontherocks.nl'
GRAPH = 'https://graph.facebook.com/' + os.environ.get('META_API_VERSIE', 'v23.0')
LINKEDIN = 'https://api.linkedin.com/rest/posts'
AMS = ZoneInfo('Europe/Amsterdam')
MAX_PER_RUN = 3
TE_LAAT = timedelta(hours=36)    # daarna niet meer plaatsen: de post hoort bij een datum
MAX_POGINGEN = 3
FOTO = {'beck-portret', 'galerij-gin-tonic', 'galerij-garneren', 'galerij-lachen'}   # JPEG, 4:5
FORMATEN = ('post', 'update')   # reels, stories en carrousels vragen eigen beeld: die plaats je zelf


class Fout(Exception):
    pass


def env(naam):
    return os.environ.get(naam, '').strip()


def koppelingen(controleren=False):
    """Welke kanalen zijn gekoppeld. Met controleren=True ook of Meta het token nog accepteert."""
    meta = bool(env('META_PAGE_TOKEN') and env('META_PAGE_ID'))
    uit = {'instagram': {'ingesteld': meta and bool(env('META_IG_ID'))},
           'facebook': {'ingesteld': meta},
           'linkedin': {'ingesteld': bool(env('LINKEDIN_TOKEN'))}}
    if controleren and meta:
        try:
            pagina = _graph('GET', env('META_PAGE_ID'), {'fields': 'name'})
            uit['facebook']['naam'] = pagina.get('name', '')
            if uit['instagram']['ingesteld']:
                uit['instagram']['naam'] = _graph('GET', env('META_IG_ID'), {'fields': 'username'}).get('username', '')
        except Fout as e:
            for k in ('instagram', 'facebook'):
                uit[k]['fout'] = str(e)[:200]
    if controleren and uit['linkedin']['ingesteld']:
        try:
            uit['linkedin']['naam'] = linkedin_profiel().get('name', '')
        except Fout as e:
            uit['linkedin']['fout'] = ('Het LinkedIn-token is verlopen of ongeldig; maak een nieuw (60 dagen geldig). '
                                       if '401' in str(e) else '') + str(e)[:200]
    return uit


def linkedin_profiel():
    return _verzoek('GET', 'https://api.linkedin.com/v2/userinfo', koppen={'Authorization': f'Bearer {env("LINKEDIN_TOKEN")}'})[2]


def _verzoek(methode, url, data=None, koppen=None):
    req = urllib.request.Request(url, data=data, method=methode, headers=koppen or {})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            inhoud = r.read()
            return r.status, r.headers, json.loads(inhoud) if inhoud.strip() else {}
    except urllib.error.HTTPError as e:
        tekst = e.read()[:400].decode('utf-8', 'replace')
        try:
            tekst = json.loads(tekst).get('error', {}).get('message', tekst) if tekst.startswith('{') else tekst
        except (ValueError, AttributeError):
            pass
        raise Fout(f'HTTP {e.code}: {tekst}')
    except (urllib.error.URLError, TimeoutError, ValueError) as e:
        raise Fout(str(e))


def _graph(methode, pad, velden):
    velden = dict(velden, access_token=env('META_PAGE_TOKEN'))
    if methode == 'GET':
        return _verzoek('GET', f'{GRAPH}/{pad}?{urllib.parse.urlencode(velden)}')[2]
    return _verzoek('POST', f'{GRAPH}/{pad}', urllib.parse.urlencode(velden).encode(),
                    {'Content-Type': 'application/x-www-form-urlencoded'})[2]


def bijschrift(k, kanaal):
    """De tekst zoals hij geplaatst wordt: tekst, call-to-action en hashtags."""
    tags = ' '.join('#' + h for h in k.get('hashtags') or [])
    cta = k.get('cta') or ''
    if kanaal == 'instagram':
        cta = re.sub(r'https?://\S+', '(link in bio)', cta)   # links zijn op Instagram niet klikbaar
    return '\n\n'.join(t for t in (k.get('tekst'), cta, tags) if t).strip()


def plaats_instagram(k):
    foto = (k.get('beeld') or {}).get('foto')
    if foto not in FOTO:
        raise Fout('Instagram heeft een foto nodig: kies bij Bewerken een foto of plaats deze post zelf.')
    media = _graph('POST', f'{env("META_IG_ID")}/media',
                   {'image_url': f'{SITE}/assets/img/{foto}.jpg', 'caption': bijschrift(k, 'instagram')[:2200]})
    for _ in range(10):   # Instagram moet de foto eerst ophalen
        klaar = _graph('GET', media['id'], {'fields': 'status_code'}).get('status_code')
        if klaar == 'FINISHED':
            break
        if klaar == 'ERROR':
            raise Fout('Instagram kon de foto niet verwerken.')
        time.sleep(3)
    post = _graph('POST', f'{env("META_IG_ID")}/media_publish', {'creation_id': media['id']})
    try:
        return _graph('GET', post['id'], {'fields': 'permalink'}).get('permalink', '')
    except Fout:
        return ''


def plaats_facebook(k):
    foto = (k.get('beeld') or {}).get('foto')
    if foto in FOTO:
        post = _graph('POST', f'{env("META_PAGE_ID")}/photos',
                      {'url': f'{SITE}/assets/img/{foto}.jpg', 'caption': bijschrift(k, 'facebook')})
        ident = post.get('post_id') or post['id']
    else:
        velden = {'message': bijschrift(k, 'facebook')}
        if k.get('link'):
            velden['link'] = k['link']
        ident = _graph('POST', f'{env("META_PAGE_ID")}/feed', velden)['id']
    try:
        return _graph('GET', ident, {'fields': 'permalink_url'}).get('permalink_url', '')
    except Fout:
        return f'https://www.facebook.com/{ident}'


def _linkedin_tekst(k):
    """LinkedIn verwacht 'little text': speciale tekens met een backslash, hashtags als sjabloon."""
    tekens = re.compile(r'([\\|{}@\[\]()<>#*_~])')
    delen = [tekens.sub(r'\\\1', t) for t in (k.get('tekst'), k.get('cta')) if t]
    tags = ' '.join('{hashtag|\\#|' + h + '}' for h in k.get('hashtags') or [])
    return '\n\n'.join(delen + ([tags] if tags else []))


def linkedin_versie(vandaag=None):
    """LinkedIn-Version (JJJJMM): twee maanden terug, want een nieuwe versie is niet meteen overal actief."""
    if env('LINKEDIN_VERSIE'):
        return env('LINKEDIN_VERSIE')
    d = (vandaag or date.today()).replace(day=1)
    for _ in range(2):
        d = (d - timedelta(days=1)).replace(day=1)
    return d.strftime('%Y%m')


def plaats_linkedin(k):
    auteur = env('LINKEDIN_AUTHOR') or 'urn:li:person:' + linkedin_profiel()['sub']
    body = {'author': auteur, 'commentary': _linkedin_tekst(k)[:3000], 'visibility': 'PUBLIC',
            'distribution': {'feedDistribution': 'MAIN_FEED', 'targetEntities': [], 'thirdPartyDistributionChannels': []},
            'lifecycleState': 'PUBLISHED', 'isReshareDisabledByAuthor': False}
    _, koppen, _ = _verzoek('POST', LINKEDIN, json.dumps(body).encode(), {
        'Authorization': f'Bearer {env("LINKEDIN_TOKEN")}', 'Content-Type': 'application/json',
        'LinkedIn-Version': linkedin_versie(), 'X-Restli-Protocol-Version': '2.0.0'})
    urn = koppen.get('x-restli-id', '')
    return f'https://www.linkedin.com/feed/update/{urn}/' if urn else 'https://www.linkedin.com/feed/'


PLAATS = {'instagram': plaats_instagram, 'facebook': plaats_facebook, 'linkedin': plaats_linkedin}


def gepland(k, s):
    try:
        d = date.fromisoformat(str(s.get('datum') or k.get('datum')))
        uur, minuut = map(int, str(s.get('tijd') or k.get('tijd') or '19:30').split(':'))
        return datetime(d.year, d.month, d.day, uur, minuut, tzinfo=AMS)
    except (ValueError, TypeError):
        return None


def met_status(k, s):
    """De kans zoals Rutger hem goedkeurde (zelfde velden als kans() in admin/marketing.js)."""
    uit = dict(k)
    for veld in ('tekst', 'hashtags', 'cta', 'datum', 'tijd', 'beeld'):
        if s.get(veld) is not None:
            uit[veld] = s[veld]
    return uit


def te_plaatsen(kansen, status, log, nu):
    """Welke posts nu aan de beurt zijn, en welke te laat of niet te plaatsen zijn (met reden)."""
    klaar, overslaan = [], []
    for k in kansen:
        s = status.get(k['id']) or {}
        if s.get('status') != 'ingepland' or not s.get('automatisch'):
            continue
        kanaal = (k.get('kanaal') or '').lower()
        vorig = log.get(k['id']) or {}
        if vorig.get('url'):
            continue
        opnieuw = (s.get('opnieuw') or '') > (vorig.get('laatste') or '')
        if vorig.get('pogingen', 0) >= MAX_POGINGEN and not opnieuw:
            continue
        if vorig.get('fout') and vorig.get('definitief') and not opnieuw:
            continue
        tijd = gepland(k, s)
        if not tijd or tijd > nu:
            continue
        post = met_status(k, s)
        if kanaal not in PLAATS:
            overslaan.append((post, f'{k.get("kanaal")} kan niet automatisch; plaats deze post zelf.'))
        elif nu - tijd > TE_LAAT and not opnieuw:
            overslaan.append((post, 'Niet geplaatst: de geplande tijd is meer dan een dag voorbij. Plan opnieuw in.'))
        elif (post.get('formaat') or 'post').lower() not in FORMATEN:
            overslaan.append((post, f'Niet geplaatst: een {post.get("formaat")} plaats je zelf (alleen gewone posts gaan automatisch).'))
        elif kanaal == 'instagram' and (post.get('beeld') or {}).get('foto') not in FOTO:
            overslaan.append((post, 'Niet geplaatst: Instagram heeft een foto nodig. Kies er een bij Bewerken.'))
        elif any(m['niveau'] == 'rood' for m in controleer(post)):
            overslaan.append((post, 'Niet geplaatst: de tekst heeft rode punten uit de alcoholcontrole.'))
        else:
            klaar.append(post)
    klaar.sort(key=lambda k: gepland(k, {}) or nu)
    return klaar[:MAX_PER_RUN], overslaan


def publiceer(kansen, status, log, nu=None, proef=False):
    """Plaatst wat aan de beurt is en werkt het log bij. Geeft het aantal wijzigingen."""
    nu = nu or datetime.now(timezone.utc).astimezone(AMS)
    tijdstip = nu.astimezone(timezone.utc).isoformat(timespec='seconds')
    gekoppeld = koppelingen()
    klaar, overslaan = te_plaatsen(kansen, status, log, nu)
    wijzigingen = 0
    for k, reden in overslaan:
        if (log.get(k['id']) or {}).get('fout') != reden:
            log[k['id']] = {'kanaal': k['kanaal'], 'fout': reden, 'definitief': True, 'laatste': tijdstip,
                            'pogingen': (log.get(k['id']) or {}).get('pogingen', 0)}
            wijzigingen += 1
        print(f'  overgeslagen: {k["kanaal"]} {k["titel"][:50]}: {reden}')
    for k in klaar:
        kanaal = k['kanaal'].lower()
        vorig = log.get(k['id']) or {}
        regel = {'kanaal': k['kanaal'], 'laatste': tijdstip, 'pogingen': vorig.get('pogingen', 0) + 1}
        if not gekoppeld[kanaal]['ingesteld']:
            # Geen poging: zodra de koppeling er is (en de post niet te laat is) gaat hij alsnog.
            regel.update(fout=f'{k["kanaal"]} is nog niet gekoppeld (zie Instellingen op de adminpagina).',
                         pogingen=vorig.get('pogingen', 0))
        elif proef:
            print(f'  PROEF, niet geplaatst: {k["kanaal"]} {k["titel"][:50]}\n' + bijschrift(k, kanaal)[:300])
            continue
        else:
            try:
                regel['url'] = PLAATS[kanaal](k)
                regel['geplaatst'] = tijdstip
                print(f'  geplaatst: {k["kanaal"]} {k["titel"][:50]} {regel["url"]}')
            except (Fout, KeyError) as e:
                regel['fout'] = f'Plaatsen mislukt: {e}'[:400]
                print(f'  mislukt: {k["kanaal"]} {k["titel"][:50]}: {e}')
        if {a: b for a, b in regel.items() if a != 'laatste'} != {a: b for a, b in vorig.items() if a != 'laatste'}:
            log[k['id']] = regel
            wijzigingen += 1
    return wijzigingen
