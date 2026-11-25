## Nerede kaldım

- Seyhun 2026-11-03: "%80 yağış ihtimali bölgenin neresine?" Saat tablosunda (hava sayfası ve yarış havası) bir saate dokununca bölge haritası tam ekran, Yağış modunda o saatte açılır (`HourTable onCol` → `RegionMap openAt {at, n}`). Noktalar ihtimale (%) göre renklenir (`pTone`: <30 görünmez, 30–49 açık, 50–79 mavi, 80+ koyu), `İhtimal | Miktar` düğmesi, alt satırda "Burada %80 · çevrenin %51'inde yağış, en çok N mm/sa" (`rainShare`).
- Izgara verisi `precipitation_probability` ile genişledi (`regionMap.js` `p`), kaydırıcı artık +24 saat (forecast_hours 25). Izgara ~5 km, yani mahalle değil kare düzeyinde.
- Telefonda denenmedi; ekran testi çalıştırılmadı (Seyhun istemedi).

## Sıradaki işler

- Ana sayfa tablosuna da onCol bağlanabilir (ana sayfa konuşmasının dosyası, haber verilmeli).
