#!/usr/bin/env python3
"""Controleert of de hash in de Content-Security-Policy van elke pagina nog bij het inline themascript past.

Klopt de hash niet (bijvoorbeeld na een wijziging aan dat script), dan blokkeert de browser het script stil en
blijft het thema op de standaard staan. Gebruik: python3 tools/csp_controle.py  (exitcode 1 bij een fout).
"""
import base64
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INLINE = re.compile(r'<script(?![^>]*\bsrc=)(?![^>]*ld\+json)[^>]*>(.*?)</script>', re.S)
CSP = re.compile(r'<meta http-equiv="Content-Security-Policy" content="([^"]*)"')


def main():
    fouten = 0
    for pad in sorted(ROOT.glob('**/*.html')):
        if '/assets/' in str(pad) or '/node_modules/' in str(pad):
            continue
        html = pad.read_text()
        csp = CSP.search(html)
        if not csp:
            continue
        toegestaan = set(re.findall(r"'(sha256-[A-Za-z0-9+/=]+)'", csp.group(1)))
        for script in INLINE.findall(html):
            h = 'sha256-' + base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
            if h not in toegestaan:
                print(f'{pad.relative_to(ROOT)}: inline script niet in de CSP (verwacht {h})')
                fouten += 1
    print('CSP-hashes kloppen.' if not fouten else f'{fouten} fout(en).')
    sys.exit(1 if fouten else 0)


if __name__ == '__main__':
    main()
