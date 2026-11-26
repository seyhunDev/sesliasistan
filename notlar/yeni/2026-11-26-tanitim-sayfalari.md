## Nerede kaldım

- Tanıtımlar sitede, herkese açık, girişsiz (Seyhun 2026-11-26 "Hepsini yap"):
  - `/tanitim`: "Velora'da bir gün". Sonunda "Velora'ya katıl" formu var ve `/api/basvuru`'ya gönderir (Ayarlar › Admin › Başvurular, kaynak "Tanıtım").
  - `/tanitim/simulator`: simülatör tanıtımı. Bölümler: İA4 taktiği, elle sürüş + 3D, taktik çizme, yelken ayarı. Sondaki "Hemen katıl" düğmesi `/tanitim?k=simulator#katil` formunu açar (kaynak "Simülatör tanıtımı"); "Giriş yap" Velora Sailing'i açar.
- Dosyalar düz HTML: `public/tanitim` (+ `simulator/`). Videolar telefon (`-t.mp4`, 390x844) ve iPad (`-i.mp4`, 1180x820) için ayrı. Dik ve 700 pikselden dar ekranda telefon kaydı oynar. Adresler `next.config.mjs` içindeki rewrites ile bağlanır.
- Kaynaklar `/mnt/project-files/tanitim-sayfasi/` altında: `gosteri.html`, `sim2/` ve kayıt betikleri `kaynak/v16`. Telefon ve e-posta kuralları formda ve `src/lib/basvuru.js` içinde aynı.

## Sıradaki işler

- Telefonda ve iPad'de gerçek sitede bak.
- Videolar değişirse `public/tanitim` altındaki dosyaları yenile.
