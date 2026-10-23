"""AI via GitHub Models: gratis met daglimieten, met de ingebouwde GITHUB_TOKEN van een Action (permissions: models: read).

Wordt gebruikt voor "Verbeter met AI" en "Nieuw idee" op de adminpagina en voor het advies bij de resultaten.
"""
import json
import os
import urllib.error
import urllib.parse
import urllib.request

URL = 'https://models.github.ai/inference/chat/completions'
MODELLEN = ['openai/gpt-4.1', 'openai/gpt-4.1-mini']   # bij een limiet of fout de volgende

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
        if not (host == 'models.github.ai' or host.endswith(('.github.ai', '.github.com', '.azure.com'))):
            raise urllib.error.URLError(f'doorverwijzing naar onbekende host {host} niet gevolgd')
        return urllib.request.Request(nieuw, data=req.data, headers=dict(req.header_items()), method='POST')


_opener = urllib.request.build_opener(_HoudPost)


def basis(tarieven):
    return BASIS.format(uur=tarieven.get('uur', 45), voorbereiding=tarieven.get('voorbereidingUren', 1),
                        menu=tarieven.get('menu', 75), spoed=tarieven.get('spoedProcent', 25))


def vraag_json(systeem, vraag, temperatuur=0.7):
    """Stelt een vraag en geeft het JSON-antwoord als dict. Gooit GeenAI als geen enkel model antwoordt."""
    token = os.environ.get('GITHUB_TOKEN', '')
    if not token:
        raise GeenAI('geen GITHUB_TOKEN (draait dit buiten GitHub Actions?)')
    fouten = []
    for model in MODELLEN:
        body = json.dumps({'model': model, 'temperature': temperatuur, 'response_format': {'type': 'json_object'},
                           'messages': [{'role': 'system', 'content': systeem}, {'role': 'user', 'content': vraag}]}).encode()
        req = urllib.request.Request(URL, data=body, headers={
            'Authorization': f'Bearer {token}', 'Content-Type': 'application/json',
            'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'})
        ruw = b''
        try:
            with _opener.open(req, timeout=120) as r:
                ruw = r.read()
            antwoord = json.loads(ruw)
            tekst = antwoord['choices'][0]['message'].get('content') or ''
            print(f'  AI: {model}, {antwoord.get("usage", {}).get("total_tokens", "?")} tokens')
            begin, eind = tekst.find('{'), tekst.rfind('}')
            if begin < 0 or eind < begin:
                raise ValueError(f'geen JSON in het antwoord: {tekst[:200]!r}')
            return json.loads(tekst[begin:eind + 1])
        except urllib.error.HTTPError as e:
            fouten.append(f'{model}: HTTP {e.code} {e.read()[:200]!r}')
        except json.JSONDecodeError as e:
            fouten.append(f'{model}: {e} in {ruw[:200]!r}')
        except (urllib.error.URLError, KeyError, IndexError, TypeError, ValueError, TimeoutError) as e:
            fouten.append(f'{model}: {e}')
    raise GeenAI('; '.join(fouten))
