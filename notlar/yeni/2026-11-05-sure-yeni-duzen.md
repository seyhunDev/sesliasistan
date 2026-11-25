## Nerede kaldım

- Yayın › Süre yeni düzen (Seyhun 2026-11-05, örnek proje dosyaları `yayin-tasarim/sure-yeni/ornek.png` onaylandı): üstte "Yarışta" küçük şeritler (grup · yarış, son dönüş "2. şamandıra · 9/14 döndü", süre; dokununca Bitti · Bayrak · Dönüş · Abandone), ortada "Başlatılacak" büyük kart (grup çipleri, kural bayrağı ve rota kartı seçili kalır + Değiştir, ⋯ içinde startı sil, süre, turuncu, Başlat · grup), altta yarış × grup tablosu (bekleyen kutuya dokununca o start büyük karta gelir).
- Kural bayrağı değişince sınıfın bekleyen startlarına ve plan.prep'e yazılır; rota kartı grubun kartı olur (course.by).
- Ekranda kartı ve Kameralar Süre'den Ekran sekmesine taşındı. iPad/Mac panosunda Süre içeriği 30rem.
- Start kuralları ortak `features/broadcast/startFlow.js` (#1241, /canli Start penceresi de kullanır).
- Telefonda denenmedi.

## Sıradaki işler

- İlk finiş = Bitir: 15 dk finiş penceresi (varsayılan, değiştirilebilir), süre dolunca kendiliğinden biter, gelmeyen ve cezasız tekneye DNF (Seyhun onayladı 2026-11-05).
- Geçici sonuç PDF'inde karışık gruplar: satırdaki gruba göre ayırma (Yayın sohbetiyle; örnek PDF Seyhun'dan istendi).
