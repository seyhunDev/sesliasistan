## Nerede kaldım
- Yayın sayfası iPad ve Mac'te tek sayfa (Seyhun 2026-11-04 "MacBook'ta yönetim çok karmaşık, tek sayfadan her şeyi yöneteyim, önizleme küçük; iPad'i de düzelt"): 48rem ve üstünde alt sekme çubuğu yok, bütün bölümler yan yana sütunlarda, her sütun kendi kayar.
  - 80rem ve üstü (MacBook, iPad Pro 13" yatay) 3 sütun: Süre + Program | Ekran + Parkur | Canlı ekran (küçük) + Dönüş + Tekne takibi + Belgeler + Sporcu.
  - 48-80rem (iPad dik, iPad 11" yatay) 2 sütun: Süre + Program + Dönüş + Tekne takibi + Belgeler | Canlı ekran + Ekran + Parkur + Sporcu.
  - Bölüm başlığı sekmenin adı ve kısa durumu (üstte yapışık). Bölümün iş düğmeleri bölümün altına yapışık (`masa-pbar`), ekranın altına sabit değil. Önizleme 15rem. Sağdaki eski büyük canlı ekran ve altındaki Ekranda · Sıradaki · Durum kutuları kalktı (bilgi Süre ve Ekran'da zaten var). Alttan pencereler ortada.
  - Kod: `BroadcastPage.jsx` `Pane` (sekme içeriğini portal ile sütundaki yerine taşır, telefonda olduğu yerde), `BOARD2`/`BOARD3`, `MasaBar` panoda `masa-pbar`; `masa.css` "Tek sayfa panosu". Sekme içerikleri değişmedi.
- Telefon düzeni aynı (alt sekmeler, sabit düğme çubuğu).

## Sıradaki işler
- Gerçek Mac/iPad'de denenmedi (örnek veriyle 1440, 1366, 1180, 820 genişlikte ölçüldü). Canlı ekran çerçevesi artık iPad dikte de yüklenir (bir izleyici okuması daha).
