## Nerede kaldım
- Gömülü Market (/sanal) hızlı açılıyor (Seyhun 2026-10-26: "yemek nasıl yükleniyorsa sanal da öyle yüklensin"): çerçeve giriş anahtarını beklemeden hemen kökten açılır (`velora-sanal.netlify.app/#st=…&sb=…&u=<uid>`), "Açılıyor…" yazısı yok, yalnız lacivert zemin. Anahtar arka planda alınır (`sanalToken`, lib/sanal.js); Sanal'da saklı oturum yoksa Sanal `{type:"velora-sanal", event:"need-token"}` gönderir, Velora `{type:"velora-token", t}` ile cevaplar (yalnız velora-sanal kökenine). Ana sayfa Yemek · Market · Giyim kartları Sanal'a önceden bağlanır (`preconnect`).
- Sanal tarafı velora-sanal #14. Test: elle "gömülü Sanal sayfası". Telefonda denenmedi.

## Sıradaki işler
- Telefonda ilk açılış ve sonraki açılış hızına bak.
