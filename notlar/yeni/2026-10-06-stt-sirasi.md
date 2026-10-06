## Nerede kaldım

- Ses tanımada Gemini 3.5 Transcribe artık her zaman ilk denenir (Seyhun: "STT provider'ı nasıl temizleyeceğim, GitHub'dan yapalım"): Netlify'daki `STT_PROVIDER` (ör. groq) yalnız yedeklerin sırasını seçer, silinmesine gerek yok (`providers`, /api/transcribe). Kapatmak yine `GEMINI_TRANSCRIBE_MODEL=off`.
