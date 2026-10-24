"""Versleuteling voor het marketingcentrum.

Een sleutelpaar (ECDH P-256) in assets/data/marketing-sleutel.json:
  publiek  iedereen mag ermee versleutelen (de Action, de wekelijkse Claude-run, je browser)
  geheim   alleen te openen met ADMIN_WACHTWOORD (PBKDF2 + AES-GCM, net als de eventlijst)

Een versleuteld bestand: {versie, epk, iv, data}. Per bestand een nieuwe tijdelijke sleutel (epk);
ECDH met de publieke sleutel + HKDF-SHA256 geeft de AES-GCM-sleutel. admin/marketing.js doet hetzelfde.
"""
import base64
import hashlib
import json
import os

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

ITERATIES = 600_000  # PBKDF2-SHA256 (OWASP-advies); oudere bestanden noemen hun eigen aantal
INFO = b'beck-marketing-v1'


def b64(b):
    return base64.b64encode(b).decode()


def _wachtwoordsleutel(wachtwoord, zout, iteraties):
    return hashlib.pbkdf2_hmac('sha256', wachtwoord.encode(), zout, iteraties, 32)


def maak_sleutelpaar(wachtwoord, geheim=None):
    """Nieuw sleutelpaar, of (met geheim) hetzelfde paar opnieuw verpakt met het huidige aantal iteraties."""
    geheim = geheim or ec.generate_private_key(ec.SECP256R1())
    pkcs8 = geheim.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8,
                                 serialization.NoEncryption())
    zout, iv = os.urandom(16), os.urandom(12)
    data = AESGCM(_wachtwoordsleutel(wachtwoord, zout, ITERATIES)).encrypt(iv, pkcs8, None)
    return {'versie': 1, 'publiek': publiek_van(geheim),
            'geheim': {'iteraties': ITERATIES, 'zout': b64(zout), 'iv': b64(iv), 'data': b64(data)}}


def publiek_van(geheim):
    return b64(geheim.public_key().public_bytes(serialization.Encoding.X962,
                                                serialization.PublicFormat.UncompressedPoint))


def open_geheim(sleutelbestand, wachtwoord):
    """Geeft de geheime sleutel, of None als het wachtwoord niet past."""
    g = sleutelbestand['geheim']
    try:
        pkcs8 = AESGCM(_wachtwoordsleutel(wachtwoord, base64.b64decode(g['zout']), g['iteraties'])).decrypt(
            base64.b64decode(g['iv']), base64.b64decode(g['data']), None)
    except Exception:
        return None
    return serialization.load_der_private_key(pkcs8, None)


def _aes(gedeeld, epk):
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=epk, info=INFO).derive(gedeeld)


def versleutel(gegevens, publiek_b64):
    publiek = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), base64.b64decode(publiek_b64))
    tijdelijk = ec.generate_private_key(ec.SECP256R1())
    epk = tijdelijk.public_key().public_bytes(serialization.Encoding.X962,
                                              serialization.PublicFormat.UncompressedPoint)
    iv = os.urandom(12)
    sleutel = _aes(tijdelijk.exchange(ec.ECDH(), publiek), epk)
    data = AESGCM(sleutel).encrypt(iv, json.dumps(gegevens, ensure_ascii=False).encode(), None)
    return {'versie': 1, 'epk': b64(epk), 'iv': b64(iv), 'data': b64(data)}


def ontsleutel(bestand, geheim):
    epk = base64.b64decode(bestand['epk'])
    publiek = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), epk)
    sleutel = _aes(geheim.exchange(ec.ECDH(), publiek), epk)
    platte = AESGCM(sleutel).decrypt(base64.b64decode(bestand['iv']), base64.b64decode(bestand['data']), None)
    return json.loads(platte)

