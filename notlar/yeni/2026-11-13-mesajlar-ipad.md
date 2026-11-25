## Nerede kaldım
- Mesajlar iPad yatay/Mac tasarımı (Seyhun 2026-11-13 örneği onayladı): solda liste (açık sohbet vurgulu, sabit grup kartları gizli), sağda sohbet; geri düğmesi yok. Sohbet seçili değilken sağda `ChatBlank.jsx` ("Kime yazacaksın?": gruplar + kişiler).
- Sohbet başlığında "Bilgi" sağda panel açar (`ChatInfoPanel`, `.chat-info`); telefonda aynı içerik alt pencerede (`ChatInfoSheet`). İçerik: Fotoğraf ve dosyalar, birebirde Kişi sayfası (ana hesap), Sessize al, üyeler, Arşivle, Herkes için sil.
- Liste üstünde ⋯: Arşiv, Tümünü okundu say, Mesajları sıfırla (onaylı). Büyük kırmızı sıfırla düğmesi kalktı (telefonda da).
- Sesle: "tüm mesajları okundu say" (yol `chatReadAll`).

## Sıradaki işler
- Seyhun iPad ve telefonda denesin; dik iPad (tek bölme) değişmedi.
