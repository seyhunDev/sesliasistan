## Nerede kaldım

- Büyük video yalnız telefonda (Seyhun 2026-11-02): iPhone uygulamasında aslı 50 MB'ı (`MediaTab.jsx` `PHONE_MB`) geçen video buluta yüklenmez. Küçük resmi ve künyesi yazılır (`ph: true`, url yok), dosya telefonda kalır (aslı Fotoğraflar'da, uygulamada izlemek için IndexedDB'de `stay`, 7 gün silinmez). Karede "Telefonda", izlerken "Yalnız telefonda" + "Buluta yükle" (720p kopya `cloudCopy` → `raceLiveStore.cloudMedia`, url gelir, ph kalkar). Başka cihazda "Bu video yalnız çekildiği telefonda", Paylaş/İndir yok. Canlı ekran ve Yayın'ın video seçimi ph'leri almaz.
- Safari'de değişmedi (hepsi yüklenir, aslı telefonda 7 gün).
- Kural değişikliği gerekmedi (Firestore/Storage). Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: 50 MB üstü video çek, karede Telefonda, izle, Buluta yükle. Sınır değişecekse `PHONE_MB`.
