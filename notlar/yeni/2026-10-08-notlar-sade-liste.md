## Nerede kaldım

- Notlar sayfası sade liste (Seyhun'un seçtiği "Öneri B"; örnek `/mnt/project-files/notlar-sayfasi/oneriler.png`; telefonda denenmedi): başlıkta Arşiv ve yeşil "+ Yeni not" düğmesi (boş not formu açar). Altında arama ("Ara") ve tek seçici Tümü · Sabitli · Bana verilen (yalnız sabitli ya da verilen not varsa görünür; "Benim" ve kategori çipleri kalktı, kategori aramada bulunur). Liste iki bölüm: SABİTLİ ve SON NOTLAR (sabitli yoksa NOTLAR); Bugün/Dün/Bu hafta başlıkları, sabitli kart ızgarası, satırlardaki kalem simgesi ve alttaki ipucu yazısı kalktı. Satır: solda kategori rengi çizgisi (Genel'de gri), kalın başlık, sağda kişi etiketi / okunmamış mesaj noktası / sarı yıldız; altında koyu tarih ("bugün", "dün") + kim verdi + içeriğin ilk satırı. Sola kaydırınca Yapıldı / Sabitle / Sil eskisi gibi. Antrenman günlüğüne benzeyen notlar kartı tek satıra indi (dokununca açılır). Yalnız `src/app/(app)/notes/page.jsx`; kural değişikliği yok, Firestore'a ek okuma yok.

## Sıradaki işler

- Notlar sayfasını telefonda dene: "+ Yeni not" boş not açıyor mu, arama, Sabitli seçici, satırı sola kaydırıp Yapıldı. Koyu görünümde renk çizgileri seçiliyor mu bak.

## Tasarım

- Notlar sayfası tek sade liste (2026-10-08): arama + Tümü/Sabitli/Bana verilen seçici, SABİTLİ ve SON NOTLAR, satırda solda kategori rengi, altında tarih + ilk satır.
