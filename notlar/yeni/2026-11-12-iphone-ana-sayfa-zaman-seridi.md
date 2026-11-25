## Nerede kaldım

- iPhone ana sayfası da iPad'deki "A · Zaman şeridi" oldu (Seyhun 2026-11-12 "hem iPad hem iPhone'da, birleştir"; örnek ana-sayfa/sade-2026-11/ipad.html "A · iPhone"). Tek bileşen: `src/features/home/IpadHome.jsx`; OwnerHome artık her ekranda onu çiziyor (eski telefon kokpiti Cockpit + Notlar kartı ana sayfada yok).
- Telefon düzeni `globals.css` (max-width 47.99rem): başlıkta tarih, + Ekle, Tümü, zil, profil; Hava paneli (pusula solda, sıcaklık sağda, altında saat saat rüzgâr); Takvim paneli (plan çizgisi, bloklarda yalnız başlama saati; günler yana kayar); Bekleyen, Kulüp.
- Plan çizgisinde blok en az genişliği de sayılıyor; çakışan bloklar ikinci sıraya iner (iPad'de de).

## Sıradaki işler

- Seyhun'un iPhone ve iPad'de deneyip söyleyecekleri; sonra ana sayfa işleyişinin gözden geçirilmesi.
- Kullanılmayan `Cockpit.jsx` istenirse silinebilir.

## Tasarım

- Ana sayfa telefonda ve iPad'de aynı bileşen; yalnız diziliş ekrana göre değişir.
