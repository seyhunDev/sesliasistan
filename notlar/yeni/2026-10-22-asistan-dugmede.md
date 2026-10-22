## Nerede kaldım

- Asistan artık alt çubuktaki düğmede çalışıyor: tam ekran lacivert zemin yok, açık sayfa arkada bulanıklaşıyor (`.abg`, backdrop-filter blur).
- Düğmeye dokun: dinler (renk değişir, ses dalgası düğmenin içinde). Tekrar dokun: gönderir.
- Yanlarda: solda × (Vazgeç / Sil / Kapat), sağda Dur (dinlerken), Devam (yazı varken), Yaz (boşta).
- Boş bulanık alana dokununca (boşta, taslak yokken) kapanır.
- Mesaj balonları, görev listesi ve kartlar kendi zeminlerini koruyor; yalnız pencerenin bütün zemini kaldırıldı. Aralar açıldı (px-5, mt-4, gap-2.5).
- LogoRing.jsx silindi. Telefonda denenmedi.

## Sıradaki işler

- iPhone ortak `haptic()` main'e gelince: dinleme başlarken `light`, iş bitince `success`.
- En yakın planı ev listesinde de gösterme ("Listede de göster") açık onay bekliyor.

## Tasarım

- `.afull` üzerinde opacity animasyonu YAPMA: bulanıklığı bozar (backdrop root). Yalnız `.abg` opaklığı canlandırılır.
