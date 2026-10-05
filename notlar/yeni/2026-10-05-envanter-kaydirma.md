## Nerede kaldım

- Envanter ürün ekranı düzeltmesi (Seyhun: "ekleme sayfası açılınca içerik aşağıdan açılıyor, yukarı gelemiyorum, sayfa kapanıyor; foto butonu yukarıda olmalı"; telefonda denenmedi): yeni üründe ad alanı kendiliğinden seçiliyordu (autoFocus), iPhone klavyeyi açıp pencereyi kaydırıyordu; yukarı çıkmak için aşağı çekince pencere kapanıyordu. autoFocus kaldırıldı. Alttan açılan pencereler (Sheet.jsx) artık klavye açıkken (yazı alanı seçili) içerikten aşağı çekilince kapanmaz; tutamaç ve başlıktan çekme ve X yine kapatır. "Belgeler ve fotoğraflar" bölümü formun en üstüne taşındı (yeni üründe "Fotoğraf ya da belgeden doldur" hemen altında).

## Sıradaki işler

0. Envanterde "+ Ürün"e dokun: ekran üstten açılmalı, klavye kendiliğinden açılmamalı. Bir alana yazarken aşağı kaydırınca pencere kapanmamalı. Fotoğraf düğmeleri en üstte mi bak.
