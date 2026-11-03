## Nerede kaldım

- Kayıt listesi PDF'i "Listede yelken numarası bulunamadı" diyordu (Seyhun 2026-11-03, TYF Yelken Ligi Optimist sporcu listesi, 217 satır). Artık yazılı PDF'lerde sütun başlıkları tanınırsa liste yapay zekasız, sütun sütun okunur (`tableOf`, `src/lib/pdfLines.js`): Y.NO / Yelken No / Sail No, AD SOYAD (ya da Ad + Soyad), CİNSİYET, D.TARİHİ / Doğum Tarihi, KULÜP, SINIF; başlığı tarih olan sütun (01.11.2025) o günün grubu (Mavi, Sarı, Kırmızı). Adlar "Muzaffer Gökçe" biçimine çevrilir, sınıf Latin ("Optimist").
- Başlıklar tanınmazsa yazı 45'er satırlık parçalarla yapay zekaya gider; taranmış PDF ve fotoğraf eskisi gibi.
- Örnek listede 77 numara iki kez var (Sümeyye Duman ve Bermet Orozbaeva); aynı sınıfta aynı numara bir kez tutulur, ikincisi alınmaz.

## Sıradaki işler

- Telefonda yükleme denenmedi.
