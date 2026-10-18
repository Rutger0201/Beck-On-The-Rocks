# Externe bibliotheken

Lokaal meegeleverd zodat de offerte- en factuurmaker ook offline en zonder CDN werkt.
Ze worden pas geladen als je een bestand van dat type laat analyseren.

| Map | Bibliotheek | Versie | Licentie | Gebruik |
| --- | --- | --- | --- | --- |
| `pdfjs/` | [pdf.js](https://github.com/mozilla/pdf.js) (legacy build) | 3.11.174 | Apache-2.0 | Tekst uit PDF's lezen |
| `mammoth/` | [mammoth.js](https://github.com/mwilliamson/mammoth.js) | 1.8.0 | BSD-2-Clause | Tekst uit Word (.docx) lezen |
| `tesseract/` | [tesseract.js](https://github.com/naptha/tesseract.js) + core | 5.1.1 | Apache-2.0 | Tekstherkenning (OCR) op screenshots en foto's |
| `tesseract/lang/` | [tessdata](https://github.com/tesseract-ocr/tessdata_best) Nederlands (`best_int`) | 4.0.0 | Apache-2.0 | Taalmodel voor de OCR |
