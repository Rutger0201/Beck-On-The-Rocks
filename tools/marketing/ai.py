"""AI, gratis met daglimieten: Google Gemini (secret GEMINI_API_KEY, gratis sleutel via aistudio.google.com) en
GitHub Models (ingebouwde GITHUB_TOKEN van een Action, permissions: models: read). Wat het eerst antwoordt, telt.

Wordt gebruikt voor "Verbeter met AI" en "Nieuw idee" op de adminpagina en voor het advies bij de resultaten.
"""
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

URL = 'https://models.github.ai/inference/chat/completions'
GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
GEMINI_MODELLEN = ['gemini-3.8-flash', 'gemini-3.5-flash-lite']   # Google stopt oude modellen; zie ook nieuw_model()
MODELLEN = ['openai/gpt-4.1', 'openai/gpt-4.1-mini']   # bij een limiet of fout de volgende
# GitHub wisselt af en toe van API-versie; geeft een combinatie geen JSON terug, dan de volgende.
KOPPEN = [{'Accept': 'application/json', 'X-GitHub-Api-Version': '2026-03-10'},
          {'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'},
          {'Accept': 'application/json'}]

BASIS = """Je bent de marketingassistent van Beck on the Rocks (https://beckontherocks.nl): Rutger, een freelance
cocktailbartender uit Almere. Hij komt alleen als bartender met eigen cocktailgereedschap; de klant regelt drank, ijs
en ingrediënten (Rutger maakt de boodschappenlijst). Ook mocktails. Geen aanbetaling. Werkgebied Almere, Flevoland,
het Gooi en Amsterdam, soms heel Nederland. Uurtarief €{uur}, altijd {voorbereiding} uur voorbereiding, cocktailmenu
vanaf €{menu}; binnen een maand boeken kost {spoed}% spoedtoeslag. Doelgroepen: particulieren 25+ en bedrijven.
Toon: premium, warm, persoonlijk, Nederlands in de je-vorm, geen overdreven reclametaal, weinig emoji.

Regels (Nederlandse Reclamecode voor Alcoholhoudende Dranken en AVG), altijd:
- niets gericht op of over minderjarigen; doelgroep 18+, liefst 25+;
- geen veel, snel of onbeperkt drinken, geen dronkenschap, drinkspellen of prijsacties op drank;
- geen sociaal, seksueel of zakelijk succes door alcohol; geen alcohol in combinatie met verkeer;
- komt alcohol voor in een social-mediatekst, eindig dan met de zin "Geniet, maar drink met mate.";
- geen verzonnen feiten, cijfers, reviews of klantnamen; gebruik [plaatshouders] als iets onbekend is;
- laat {{link}} staan als die in de tekst of call-to-action voorkomt."""


class GeenAI(Exception):
    pass


class _HoudPost(urllib.request.HTTPRedirectHandler):
    """urllib maakt van een doorverwezen POST een GET zonder vraag (en krijgt dan "OK" terug); stuur hem opnieuw als POST."""
    def redirect_request(self, req, fp, code, msg, headers, nieuw):
        print(f'  AI: doorverwezen ({code}) naar {nieuw}')
        host = urllib.parse.urlsplit(nieuw).hostname or ''
        if not (host == 'models.github.ai' or host.endswith(('.github.ai', '.github.com', '.azure.com', '.googleapis.com'))):
            raise urllib.error.URLError(f'doorverwijzing naar onbekende host {host} niet gevolgd')
        return urllib.request.Request(nieuw, data=req.data, headers=dict(req.header_items()), method='POST')


_opener = urllib.request.build_opener(_HoudPost)


def basis(tarieven):
    return BASIS.format(uur=tarieven.get('uur', 45), voorbereiding=tarieven.get('voorbereidingUren', 1),
                        menu=tarieven.get('menu', 75), spoed=tarieven.get('spoedProcent', 25))


def _vraag(url, sleutel, model, kop, systeem, vraag, temperatuur, json_modus):
    """Eén chatvraag (OpenAI-formaat). Geeft het JSON-antwoord als dict."""
    inhoud = {'model': model, 'temperature': temperatuur,
              'messages': [{'role': 'system', 'content': systeem}, {'role': 'user', 'content': vraag}]}
    if json_modus:
        inhoud['response_format'] = {'type': 'json_object'}
    req = urllib.request.Request(url, data=json.dumps(inhoud).encode(), method='POST', headers={
        'Authorization': f'Bearer {sleutel}', 'Content-Type': 'application/json', **kop})
    ruw, soort = b'', ''
    try:
        with _opener.open(req, timeout=120) as r:
            ruw, soort = r.read(), f'{r.status} {r.url} {r.headers.get("Content-Type", "")}'
        antwoord = json.loads(ruw)
    except json.JSONDecodeError as e:
        raise ValueError(f'{e} in {soort} {ruw[:200]!r}')
    tekst = antwoord['choices'][0]['message'].get('content') or ''
    print(f'  AI: {model}, {antwoord.get("usage", {}).get("total_tokens", "?")} tokens')
    begin, eind = tekst.find('{'), tekst.rfind('}')
    if begin < 0 or eind < begin:
        raise ValueError(f'geen JSON in het antwoord: {tekst[:200]!r}')
    return json.loads(tekst[begin:eind + 1])


def pogingen():
    """Welke AI's we proberen, in volgorde: Gemini (als GEMINI_API_KEY bestaat), dan GitHub Models."""
    uit = []
    gemini = os.environ.get('GEMINI_API_KEY', '').strip()
    if gemini:
        uit += [(GEMINI_URL, gemini, model, {}, False) for model in GEMINI_MODELLEN]
    token = os.environ.get('GITHUB_TOKEN', '')
    if token:
        uit += [(URL, token, model, kop, True) for model in MODELLEN for kop in KOPPEN]
    return uit


def nieuw_model(melding):
    """Google noemt bij een gestopt model de opvolger ("use models/gemini-..."); die proberen we dan."""
    m = re.search(r'use models/([a-z0-9.\-]+)', melding)
    return m.group(1).rstrip('.') if m else None


def vraag_json(systeem, vraag, temperatuur=0.7):
    """Stelt een vraag en geeft het JSON-antwoord als dict. Gooit GeenAI als geen enkele AI antwoordt."""
    lijst = pogingen()
    if not lijst:
        raise GeenAI('geen GEMINI_API_KEY of GITHUB_TOKEN (draait dit buiten GitHub Actions?)')
    fouten, overslaan = [], set()
    while lijst:
        url, sleutel, model, kop, json_modus = lijst.pop(0)
        if (url, model) in overslaan:
            continue
        try:
            antwoord = _vraag(url, sleutel, model, kop, systeem, vraag, temperatuur, json_modus)
            if kop in KOPPEN:
                KOPPEN.remove(kop)
                KOPPEN.insert(0, kop)   # deze werkt: volgende keer meteen
            return antwoord
        except urllib.error.HTTPError as e:
            melding = e.read()[:400].decode('utf-8', 'replace')
            fouten.append(f'{model}: HTTP {e.code} {melding[:200]!r}')
            opvolger = nieuw_model(melding) if e.code == 404 else None
            if opvolger and (url, opvolger) not in overslaan and all(p[2] != opvolger for p in lijst):
                print(f'  AI: {model} bestaat niet meer, probeer {opvolger}')
                lijst.insert(0, (url, sleutel, opvolger, kop, json_modus))
            if e.code in (401, 403, 429):
                overslaan.add((url, model))   # andere koppen helpen dan niet
        except (urllib.error.URLError, KeyError, IndexError, TypeError, ValueError, TimeoutError) as e:
            fouten.append(f'{model}: {e}')
    raise GeenAI('; '.join(fouten))
