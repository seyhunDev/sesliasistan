## Nerede kaldım
- Ana sayfa kokpit 2. adım: alttaki kartlar (Notlar, Sporcular, Fitness, Kulüp/Özet, Instagram) ortak liste kalıbına geçti: dışarıda başlık + sayı + "Tümü ›" (ListHead), altında tek ince çerçeveli liste (RowList/Row).
- Kulüp listesi: Aidat (ince oran çubuğu Bar + 18/30, eksik varsa sarı alt yazı), Hesap, Fiş / Fatura, Mesajlar her biri bir satır; okunurken iskelet satır (SkelRow).
- Fitness satırı: yüz + ad + program · saat, sağda durum etiketi (Tag: Yaptı / Yapmadı / Atladı / Bekliyor).
- Ortak parçalar: Row'a `lead`, `warn`; ListHead `count/href/more`; yeni `SkelRow`, `Tag` (Row.jsx), `Bar` (Gauge.jsx).
- Telefonda denenmedi.

## Sıradaki işler
- Seyhun onaylarsa aynı liste/başlık kalıbını diğer sayfalara uygula (Planlar, Yarışlar, Aidatlar…).

## Tasarım
- Ana sayfa bölümleri: dışarıda küçük büyük harfli başlık + sayı, sağda yalnız "Tümü ›"; içerik tek kartta satır satır; satır = ad + alt bilgi + sağda değer/etiket.
- Sıra (Seyhun 2026-10-21): iş düğmeleri › Notlar › Takvim (Sırada) › Sporcular › Fitness › Kulüp.
