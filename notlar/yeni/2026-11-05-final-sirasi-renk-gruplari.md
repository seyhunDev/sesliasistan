## Nerede kaldım

- Seyhun 2026-11-05 22:52 (Yayın › Süre ve /canli Start ekran görüntüleri): Altın, Gümüş, Bronz eklenmişken Sarı, Mavi, Kırmızı hâlâ start listesindeydi ve sıra Gümüş ile başlıyordu. `lib/raceLive.js` cleanPlan: sınıf adı büyük/küçük harf, boşluk ya da boş olsa da final grubu olan sınıfın renk startları düşer; bekleyen final startları sınıfın grup sırasıyla dizilir (Sporcu sekmesi / kurulum sırası, yoksa Altın, Gümüş, Bronz, Zümrüt), yerleri aynı kalır. Süre, Program ve /canli Start aynı plan.order'ı okur.
- Telefonda denenmedi.

## Sıradaki işler

- Sorun sürerse yarışın raceLive.plan.order ve sets kayıtlarına bakılmalı (sınıf adı farklı olabilir).

## Tasarım

- Ölçüm ekle kadranı (Seyhun 2026-11-05 22:56 "pusulanın üstten, yandan, alttan boşlukları olsun, kenarlardan kesiliyor"): SVG çevresinde pay (viewBox -12 -12 224 224), tutamaç kenarda kesilmez; derece yazısı biraz küçüldü.
