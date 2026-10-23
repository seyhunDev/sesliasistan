## Nerede kaldım

- Teslim edildi ekranı (`src/yemek/ui/Delivered.jsx`): sipariş teslim edilince takip sayfasında tam ekran, arkada siparişin ilk ürününün fotoğrafı, "Afiyet olsun", restoran · teslim saati. Puan isteğe bağlı: yıldıza dokununca (yazıldıysa "Not ekle" notuyla) kaydedilir ve kapanır; ✕ puansız kapatır. Kapanınca `rateDone: true` yazılır, bir daha çıkmaz; gelinen sayfaya dönülür (router.back, yoksa Alışveriş › Yemek).
- Teslim edilmiş siparişin takip sayfasında lacivert üstte siparişin fotoğrafı; verilen puan "Puanın ★★★★" satırı. Eski "Nasıldı?" kartı kaldırıldı.
- Telefonda denenmedi.

## Tasarım

- Yemek teslim ekranı: tam ekran fotoğraf + lacivert geçiş, puan zorunlu değil, yıldız ya da ✕ ile kapanır (Seyhun 2026-10-23).
