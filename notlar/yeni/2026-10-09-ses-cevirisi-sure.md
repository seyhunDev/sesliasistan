## Nerede kaldım

- Ses çevirisi süre sınırı (denetim bulgusu: Google 14 sn + Whisper toplamı Netlify işlev sınırını aşabiliyordu): Gemini Transcribe beklemesi 6-9 sn'ye indi, yedek servisler kalan süreyle denenir, toplam 9,5 sn'yi aşmaz (`BUDGET`, /api/transcribe); süre biterse hata döner, telefon bir kez daha dener.
