## Nerede kaldım

- Yönet videosu galeride (Seyhun 2026-11-25 "seçili sporcu varsa onun etiketiyle… galerimizde o günün… Orsa, Pupa, Start"): Video kutusu ya da
  sporcu penceresindeki "● Video çek" ile çekilen video önce "Video etiketleri" penceresini açar (seçili sporcu(lar) hazır, Orsa/Pupa/Start/Dönüş/Trapez/Şamandıra,
  yeni etiket yazılır ve bu telefonda hatırlanır). Kaydet ya da kapat: `saveYonetVideo` (src/features/bilgi/yonetVideo.js) MediaTab ile aynı yoldan
  `raceLive/ant-yonet-<gün>`e yükler (50 MB üstü yalnız telefonda; aslı Fotoğraflar'da). Medya › Antrenman'da "Yönet · gün" bölümü, etiket süzgeci,
  "Tümü" yerinde açılır; izlerken başlıkta etiketler. `cleanMedia` artık `tags` taşır (lib/raceLive.js cleanTagList). Kural değişmedi. Telefonda denenmedi.
- Video en çok 2 dakika (prepRaceMedia sınırı).

## Sıradaki işler

- Galeride etiketi sonradan düzenleme (şimdilik çekimden sonra); sporcuya sesli not.
