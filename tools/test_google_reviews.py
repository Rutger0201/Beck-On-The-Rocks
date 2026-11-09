#!/usr/bin/env python3
"""Lokale tests voor tools/google_reviews.py. Geen netwerk en geen echte API-sleutel."""
import io
import json
import os
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

import google_reviews as gr


SLEUTEL = 'AIzaTESTKEY_DO_NOT_LEAK_1234567890'


class NepAntwoord(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def http_fout(code, body):
    return urllib.error.HTTPError('https://places.googleapis.com/v1/x', code, 'fout', None, io.BytesIO(body.encode()))


class GoogleReviewsTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.uit = Path(self.tmp.name) / 'google-reviews.json'
        self.slaap = []
        self.env = patch.dict(os.environ, {'GOOGLE_PLACES_KEY': '', 'GOOGLE_PLACE_ID': ''})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.addCleanup(self.tmp.cleanup)
        patcher = patch.object(gr, 'UIT', self.uit)
        patcher.start()
        self.addCleanup(patcher.stop)
        slaap = patch.object(gr.time, 'sleep', side_effect=lambda s: self.slaap.append(s))
        slaap.start()
        self.addCleanup(slaap.stop)

    def test_ontbrekende_sleutel_stopt_zonder_google(self):
        with patch.object(gr.urllib.request, 'urlopen', side_effect=AssertionError('geen netwerk')):
            gr.main()
        self.assertFalse(self.uit.exists())

    def test_alza_typo_roept_google_niet_aan(self):
        os.environ['GOOGLE_PLACES_KEY'] = 'Alza' + 'x' * 35
        with patch.object(gr.urllib.request, 'urlopen', side_effect=AssertionError('geen netwerk')) as open_:
            with patch('sys.stdout', new_callable=io.StringIO) as uit:
                gr.main()
        open_.assert_not_called()
        tekst = uit.getvalue()
        self.assertIn('Alza', tekst)
        self.assertIn('AIza', tekst)
        self.assertNotIn(os.environ['GOOGLE_PLACES_KEY'], tekst)
        self.assertFalse(self.uit.exists())

    def test_zoeken_vraagt_servicegebied_mee(self):
        os.environ['GOOGLE_PLACES_KEY'] = SLEUTEL
        lichamen = []

        def open_(req, timeout):
            self.assertEqual(timeout, gr.TIMEOUT)
            self.assertNotIn(SLEUTEL, req.full_url)
            if req.data:
                lichamen.append(json.loads(req.data.decode()))
            if req.full_url.endswith(':searchText'):
                return NepAntwoord(json.dumps({'places': [{
                    'id': 'ChIJtest',
                    'displayName': {'text': 'Beck on the Rocks'},
                    'websiteUri': 'https://beckontherocks.nl/',
                }]}).encode())
            return NepAntwoord(json.dumps({
                'rating': 5, 'userRatingCount': 1, 'googleMapsUri': 'https://maps.example/p',
                'reviews': [{
                    'rating': 5,
                    'originalText': {'text': 'Noël was top'},
                    'authorAttribution': {'displayName': 'Sam'},
                    'publishTime': '2026-03-01T12:00:00Z',
                }],
            }).encode())

        with patch.object(gr.urllib.request, 'urlopen', side_effect=open_):
            gr.main()
        self.assertEqual(len(lichamen), 1)
        self.assertTrue(lichamen[0]['includePureServiceAreaBusinesses'])
        self.assertEqual(lichamen[0]['textQuery'], 'Beck on the Rocks')
        data = json.loads(self.uit.read_text())
        self.assertEqual(data['placeId'], 'ChIJtest')
        self.assertEqual(data['reviews'][0]['tekst'], 'Noël was top')
        self.assertIn('Noël', self.uit.read_text())

    def test_andere_zaak_wordt_niet_gekozen(self):
        os.environ['GOOGLE_PLACES_KEY'] = SLEUTEL
        lichamen = []
        rondes = {'n': 0}

        def open_(req, timeout):
            if req.full_url.endswith(':searchText'):
                lichamen.append(json.loads(req.data.decode()))
                rondes['n'] += 1
                if rondes['n'] == 1:
                    return NepAntwoord(json.dumps({'places': [{
                        'id': 'ChIJverkeerd',
                        'displayName': {'text': "Beck's Bar and Grill"},
                    }]}).encode())
                return NepAntwoord(json.dumps({'places': [{
                    'id': 'ChIJgoed',
                    'displayName': {'text': 'Beck on the Rocks'},
                }]}).encode())
            return NepAntwoord(b'{"userRatingCount": 0, "reviews": []}')

        with patch.object(gr.urllib.request, 'urlopen', side_effect=open_):
            gr.main()
        self.assertGreaterEqual(len(lichamen), 2)
        self.assertTrue(all(l['includePureServiceAreaBusinesses'] for l in lichamen))
        self.assertEqual(json.loads(self.uit.read_text())['placeId'], 'ChIJgoed')

    def test_bewaard_place_id_slaat_zoeken_over(self):
        os.environ['GOOGLE_PLACES_KEY'] = SLEUTEL
        self.uit.write_text(json.dumps({'placeId': 'ChIJbewaard', 'reviews': []}) + '\n')
        urls = []

        def open_(req, timeout):
            urls.append(req.full_url)
            return NepAntwoord(b'{"rating": null, "userRatingCount": 0, "reviews": []}')

        with patch.object(gr.urllib.request, 'urlopen', side_effect=open_):
            gr.main()
        self.assertEqual(urls, [f'{gr.API}/places/ChIJbewaard?languageCode=nl'])

    def test_tijdelijke_fout_probeert_opnieuw(self):
        os.environ['GOOGLE_PLACES_KEY'] = SLEUTEL
        os.environ['GOOGLE_PLACE_ID'] = 'ChIJvast'
        n = {'n': 0}

        def open_(req, timeout):
            n['n'] += 1
            if n['n'] < 3:
                raise http_fout(503, 'unavailable')
            return NepAntwoord(b'{"rating": 4.5, "userRatingCount": 2, "googleMapsUri": "https://maps.example", "reviews": []}')

        with patch.object(gr.urllib.request, 'urlopen', side_effect=open_):
            gr.main()
        self.assertEqual(n['n'], 3)
        self.assertEqual(self.slaap, [2, 4])
        self.assertEqual(json.loads(self.uit.read_text())['aantal'], 2)

    def test_ongeldige_sleutel_van_google_faalt_zonder_nieuwe_poging(self):
        os.environ['GOOGLE_PLACES_KEY'] = SLEUTEL
        os.environ['GOOGLE_PLACE_ID'] = 'ChIJvast'
        with patch.object(gr.urllib.request, 'urlopen', side_effect=lambda *a, **k: (_ for _ in ()).throw(http_fout(400, '{"reason": "API_KEY_INVALID"}'))):
            with self.assertRaises(SystemExit) as gevonden:
                gr.main()
        self.assertIn('GOOGLE_PLACES_KEY', str(gevonden.exception))
        self.assertNotIn(SLEUTEL, str(gevonden.exception))
        self.assertEqual(self.slaap, [])
        self.assertFalse(self.uit.exists())

    def test_api_uit_geeft_duidelijke_opdracht(self):
        os.environ['GOOGLE_PLACES_KEY'] = SLEUTEL
        os.environ['GOOGLE_PLACE_ID'] = 'ChIJvast'
        body = 'Places API (New) has not been used in project 1 before or it is disabled.'
        with patch.object(gr.urllib.request, 'urlopen', side_effect=lambda *a, **k: (_ for _ in ()).throw(http_fout(403, body))):
            with self.assertRaises(SystemExit) as gevonden:
                gr.main()
        self.assertIn('Places API (New)', str(gevonden.exception))
        self.assertIn('gratis tegoed', str(gevonden.exception))
        self.assertEqual(self.slaap, [])

    def test_ongewijzigd_schrijft_bestand_niet_opnieuw(self):
        os.environ['GOOGLE_PLACES_KEY'] = SLEUTEL
        os.environ['GOOGLE_PLACE_ID'] = 'ChIJvast'
        bestaand = {
            'bijgewerkt': '2026-10-23',
            'placeId': 'ChIJvast',
            'score': None,
            'aantal': 0,
            'url': '',
            'reviews': [],
        }
        self.uit.write_text(json.dumps(bestaand, indent=2) + '\n')
        voor = self.uit.read_text()
        with patch.object(gr.urllib.request, 'urlopen', return_value=NepAntwoord(
                b'{"rating": null, "userRatingCount": 0, "googleMapsUri": "", "reviews": []}')):
            gr.main()
        self.assertEqual(self.uit.read_text(), voor)

    def test_netwerkfout_bewaart_bestaand_bestand(self):
        os.environ['GOOGLE_PLACES_KEY'] = SLEUTEL
        os.environ['GOOGLE_PLACE_ID'] = 'ChIJvast'
        self.uit.write_text('{"placeId": "ChIJvast", "reviews": [{"tekst": "bewaard"}]}\n')
        voor = self.uit.read_text()
        with patch.object(gr.urllib.request, 'urlopen', side_effect=urllib.error.URLError('timeout')):
            with self.assertRaises(SystemExit):
                gr.main()
        self.assertEqual(self.uit.read_text(), voor)
        self.assertEqual(self.slaap, [2, 4])


if __name__ == '__main__':
    unittest.main()
