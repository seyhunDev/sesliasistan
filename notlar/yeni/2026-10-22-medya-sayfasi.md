## Nerede kaldım
- Yeni Medya sayfası `/media` (Seyhun 2026-10-22 onayı, örnek /mnt/project-files/yaris-tasarim/medya/medya-sayfasi.png): lacivert başlık (toplam video/fotoğraf), Antrenman / Yarış seçici (kayıt sayılı). Her antrenman (raceLive/ant-<planId>) ve yarış (raceLive/<yarışId>) bir bölüm: başlık, gün ya da yer · tarih · kaç kayıt, ilk 4 kare (fazlası "+N"), "Tümü ›" o sayfanın Medya sekmesine. Kareye dokununca izleme (yalnız İndir; düzelt/sil kendi sayfasında). Telefonda 7 gün tutulan aslı varsa onu oynatır.
- Veri: raceLiveStore loadAllMedia (raceLive koleksiyonu, ana hesap kuralı; kural değişmedi), yarış adları loadRaces, antrenman adı/günü DataProvider planlarından. Bölümleme lib/mediaLibrary.js (test: test:yaris "medya sayfası bölümleri").
- Giriş: Ana sayfa › Tümü › Kulüp › "Medya" (homeTiles, sporcu yetkisi olan ana hesap; bilgisayarda sol menüde de). Ana sayfa tasarım başlığına haber verildi.
- Telefonda denenmedi.

## Sıradaki işler
- Seyhun isterse ana sayfa kısayollarına Medya'yı kendisi ekleyebilir (Tümü penceresinde).
