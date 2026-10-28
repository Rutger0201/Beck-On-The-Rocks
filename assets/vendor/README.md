# Externe bibliotheken

Lokaal meegeleverd zodat de offerte- en factuurmaker ook offline en zonder CDN werkt.
Ze worden pas geladen als je een bestand van dat type laat analyseren.

| Map | Bibliotheek | Versie | Licentie | Gebruik |
| --- | --- | --- | --- | --- |
| `pdfjs/` | [pdf.js](https://github.com/mozilla/pdf.js) (legacy build) | 3.11.174 | Apache-2.0 | Tekst uit PDF's lezen |
| `mammoth/` | [mammoth.js](https://github.com/mwilliamson/mammoth.js) | 1.13.0 | BSD-2-Clause | Tekst uit Word (.docx) lezen |
| `tesseract/` | [tesseract.js](https://github.com/naptha/tesseract.js) + core | 5.1.1 | Apache-2.0 | Tekstherkenning (OCR) op screenshots en foto's |
| `goatcounter/` | [GoatCounter count.js](https://github.com/arp242/goatcounter/blob/master/public/count.js) (master, 28-10-2026) | - | ISC | Bezoekers tellen op de site (zelf gehost i.p.v. gc.zgo.at) |
| `tesseract/lang/` | [tessdata](https://github.com/tesseract-ocr/tessdata_best) Nederlands (`best_int`) | 4.0.0 | Apache-2.0 | Taalmodel voor de OCR |

**Beveiliging pdf.js:** versie 3.11.174 is kwetsbaar voor CVE-2024-4367 als `isEvalSupported` aan staat.
`analyse.js` zet die optie daarom uit. Bij een update naar 4.2.67 of nieuwer is dat niet meer nodig.
