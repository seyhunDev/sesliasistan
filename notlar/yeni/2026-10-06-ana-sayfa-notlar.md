## Nerede kaldım

- Ana sayfada notlar listesi (Seyhun: "ana sayfada da açık bir şekilde liste halinde notlarımızı gösterelim, güzel bir notlar alanımız olsun"; telefonda denenmedi): ÖZET kartlarının altında, İşlemler'in üstünde "NOTLAR" bölümü. Başlıkta not sayısı ve "Tümü ›" (Notlar sayfası). Altında tek kartta en çok 5 not, açık liste: sabitlenenler önce (yıldız simgesi), sonra en yeni (oluşturma ya da son değişiklik); satırda başlık, içeriğin ilk satırı (en çok 2 satır), tarih (Bugün, Dün, gün), okunmamış mesaj noktası. Dokununca not açılır; kartın altında "+ Not ekle". Not yoksa "Henüz not yok" ve "+ Not ekle". Arşivlenen notlar girmez. Notlar zaten bellekte (DataProvider), Firestore'a ek okuma yok; not eklenince/değişince liste hemen güncellenir (`HomeNotes.jsx`, `homeNotes`, homeTiles.js). Testi `test:elle` › "Ana sayfa kartları" › "notlar".

## Sıradaki işler

- Ana sayfadaki Notlar bölümüne telefonda bak: yeri, 5 not çok mu az mı, satırlar okunuyor mu. Beğenmediğin yer olursa (ör. sayı 3 olsun, yalnız sabitlenenler, kart hâlinde yan yana) yeni threade yaz.
