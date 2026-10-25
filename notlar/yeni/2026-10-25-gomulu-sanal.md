## Nerede kaldım

- Velora Sanal artık Velora'nın içinde gömülü sayfa: `/sanal` (`src/app/(app)/sanal/page.jsx`). Üstte geri düğmesi + "Market", altında tam ekran çerçeve (iframe), alt sekme çubuğu Velora'nın. Adres her açılışta `sanalLink()` (1 saatlik giriş anahtarı, şifresiz).
- Ana sayfa Market kartı ve market sipariş kartındaki "Yeni sipariş" `/sanal`'a gider (Seyhun 2026-10-25: "ayrı bir şey açmadan, bizim bir sayfaymış gibi"). Sesli gezinme için `nav.js`'e `sanal` eklendi.
- Çalışması için velora-sanal sitesinin Velora çerçevesinde açılmaya izin vermesi gerekiyor (frame-ancestors); Sanal başlığına iletildi. İzin gelene kadar çerçeve boş kalabilir. Telefonda denenmedi.

## Sıradaki işler

- Sanal izni gelince telefonda dene (iPhone Safari ve uygulama, giriş çerçevede kalıyor mu).
- Eski Velora market ekranları kaldırılacak (Market başlığı). Hedef: Yemek de Velora Food'dan aynı yolla gömülü açılsın.

## Asistan

- Velora'daki ayrı sistemler (Sanal, ileride Food) ayrı pencere açmadan Velora içinde gömülü sayfa olarak açılır.
