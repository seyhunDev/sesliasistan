## Nerede kaldım

- Fotoğrafla kişi ekleme (Seyhun 2026-10-23). Asistanın yazı kutusunda Fotoğraf düğmesi var (tasarım #760); düğme useAssistant `photoIn(file)` çağırıyor:
  - Fotoğrafta kare kod varsa telefonda okunuyor (jsQR), yapay zekaya gitmiyor.
  - Kod yoksa fotoğraf /api/person'a gidiyor. Kişi fotoğrafı (face) profil fotoğrafı oluyor ve adı soruluyor. Kimlik ya da kartvizitte (card) üstündeki ad, telefon, e-posta, unvan, doğum tarihi okunuyor. Kimlik numarası, seri no, adres alınmıyor; kart fotoğrafı saklanmıyor.
  - Kişi eklenirken gelen fotoğraf o kişinin fotoğrafı oluyor.
- Ad sorulunca "adı Ali Kaya, telefonu 0532…, çalışan" gibi birkaç bilgi birden alınıyor (assistPerson.applyAnswer).
- Velora kişi kare kodu: standart vCard 3.0 ile X-VELORA-KIND / X-VELORA-REL satırları (lib/contactQr.js). iPhone kamerası da okuyup "Kişilere ekle" diyor.
  - Sesle "kare kodu okut" kamerayı açıyor (people/ContactScan.jsx, tam ekran asistanın üstünde). Okununca kişi özeti ve "Kaydedeyim mi?" geliyor.
  - Velora dışı vCard ve MECARD da okunuyor; grup soruluyor.
- Örnek çalışan kartı: /mnt/project-files/kisi-kare-kod/ornek-calisan-deniz-aydin.png (Deniz Aydın, antrenör, 0555 000 00 00). Yeni kart üretmek için `node scripts/kisi-kare-kod.mjs kart.png "Ad Soyad" staff Unvan "telefon" e-posta`.
- Testler:
  - test:asistan: "Kişi kare kodu (vCard)", "Fotoğraftan kişi: adı sorulunca".
  - Yönlendirme: contactScan.
  - test:asistan-ekran: "Kişi kare kodu" (sesle okut, Fotoğraf düğmesiyle kodun fotoğrafı).
- Telefonda denenmedi. Gerçek yapay zekayla kişi ya da kimlik fotoğrafı denenmedi.

## Sıradaki işler

- Kişi sayfasında "Kare kod" (kişinin kartını gösterme / paylaşma) Seyhun isterse eklenir.
- Kişi fotoğrafı ortadan kare kırpılıyor (yüz bulma yok); kötü kırpılırsa kişi sayfasından değiştirilir.

## Asistan

- Fotoğraf asistana gelince şimdilik yalnız kişi ekleme işi yapılıyor. Fiş ve yemek fotoğrafları kendi sayfalarında kalıyor.
