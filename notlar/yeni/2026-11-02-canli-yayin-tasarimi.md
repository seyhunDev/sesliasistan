## Nerede kaldım
- Canlı ekran (/canli/<yarış>) Seyhun'un onayladığı yayın tasarımıyla yeniden yapıldı (örnekler project-files/samandira-donus/tasarim7, uygulanmış hâli uygulama7):
  - Yarış öncesi, video yok: ortada büyük geri sayım, ilk yarış ve grubu, beklenen rüzgâr (tahminin start saati), altta günün programı kartları. Şerit gizli.
  - Yarış öncesi, video var: geri sayım ve beklenen rüzgâr alt şeritte, program sağ üstte etiketler.
  - Yarış: sağ üstte program (Bitti · Canlı · sıradaki), solda sıralama (videoda ilk 5).
  - Gün sonu: "Gün bitti · N yarış", yarış kartları (ilk üç), sağda genel ilk 10; şeritte yarının ilk startı ve beklenen rüzgârı (/api/canli forecastNext).
- Yazı: Barlow + Barlow Condensed (src/app/canli/layout.jsx), etiketler büyük harf, rakamlar eşit genişlikte.
- Arka fotoğraf 18px bulanık, koyu gölgeli.
- Yarış ekranı testi (test:yaris-ekran) multimedya sayfasının kalkmasına göre güncellendi: yarış günü sayfa yerinde kalır, "Yayına git" /yayin'a götürür.

## Sıradaki işler
- Telefonda ve büyük ekranda gerçek yarışla dene (fotoğraf sail-world.com'dan doğrudan yüklenir).
- Yarışlar arası ekran (biri bitti, sıradaki bekleniyor) için ayrı görünüm istenirse ekle.

## Tasarım
- Canlı ekran yazısı spor yayını gibi tek aile: Barlow Condensed başlık/sayı/etiket, Barlow satır (Seyhun 2026-11-02 "rastgele yazı karakteri olmasın").
