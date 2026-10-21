## Nerede kaldım

- Asistan dinlerken canlı yazı artık Gemini Live akışından geliyor (Claude uygulaması gibi; Seyhun istedi, maliyeti kabul etti). Ses 16 kHz parçalar halinde Google'a doğrudan WebSocket ile akıyor, kelimeler yarım saniyede kutuya geliyor.
- Telefon önce `/api/live-token`'dan 10 dakikalık geçici anahtar alıyor; asıl anahtar telefona gitmiyor.
- Model adlarını sunucu Google'ın listesinden kendisi buluyor (Live destekleyen, flash ve yazı cevaplı olan önce). `GEMINI_LIVE_MODEL` verilirse o önce deneniyor.
- Gönderilen son yazı değişmedi: kayıt yine sunucuda tek seferde yazıya çevriliyor (adlar düzeltilmiş).
- Yedek: anahtar alınamazsa, model açılmazsa ya da hat koparsa eski yol (2–3 sn'lik parça çevirisi) kendiliğinden sürüyor.
- Harcama: dinleme bitince akan ses süresi bildiriliyor (`live-sec`, dakikası tahmini 0,006 $), Ayarlar › Yapay zeka kullanımı toplamına giriyor.
- Rapor: ilk canlı kelimenin gecikmesi "canlı yazı … (canlı model)" olarak, hat hatası "canlı hat: …" olarak görünüyor.
- Ses testi sayfası (Ayarlar › Ses testi, B) aynı kodu kullanıyor (`src/lib/speech/geminiLive.js`).
- Telefonda denenmedi. Gerçek Google bağlantısı bulutta denenemedi (ağ kapalı); ekran testinde taklit WebSocket ile denendi.

## Sıradaki işler

- Seyhun telefonda dener. Yazı akmazsa "rapor oluştur" raporundaki "canlı hat:" satırına bak (model adı ya da anahtar hatası).
- Canlı yazı iyi çalışırsa, Gönder'deki 2–4 sn'lik son çeviri yerine canlı yazıyı hemen göndermek düşünülebilir.

## Asistan

- Canlı yazı Gemini Live ile (2026-10-21). Son yazı sunucu çevirisi; hat yoksa parça çevirisi yedek.
