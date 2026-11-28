## Nerede kaldım

- Ana sayfa vitrin kartları v3 (Seyhun 2026-11-28 "yap"; örnek /mnt/project-files/yonetim-paneli/vitrin2/ornek.html): `src/features/home/Vitrin.jsx` + `pano.css` .vt.
- Velora Sailing kartının animasyonu artık Velora Sailing'in kendi "A1 · Start çizgisi avantajı" senaryosu: velora-sailing deposundaki engine/rules/boat-draw/scenarios/thumbs.js ile kare kare çizilip (rAF elle ilerletildi, 30 fps, 8 sn) ffmpeg ile mp4 yapıldı: `public/vitrin/sailing-a1.mp4` (130 KB) ve durağan kare `sailing-a1.jpg`.
- Yönet kartı: parkur (start hattı, hakem botu, orsa şamandırası, layline) ve yön üçgeniyle tramola atan tekneler; kanal açıksa sağ üstte "N tekne".
- Yerleşim: solda üst yazı, başlık, tek satır, hemen altında "Başlat"; sağda animasyon; yükseklik içeriğe göre.

## Sıradaki işler

- Sporcu ana ekranı yeni tasarım (Seyhun 2026-11-28 istedi, örnek hazırlanıyor).
- Başka senaryo videosu istenirse aynı yolla üretilir.
