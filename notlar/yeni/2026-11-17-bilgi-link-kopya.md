## Nerede kaldım

- Sporcu linki "Kanal açık değil" diyordu, kanal açılamıyordu (Seyhun 2026-11-17). Sebep: `bilgiAcik` / `bilgiTekne` / `bilgi` / `bilgiPusula` kuralları Firebase'de yayınlanmamıştı (15 Kasım'da depoya eklenmiş). Seyhun birleşik kural dosyasını yayınladı (Velora Sailing blokları dahil, proje klasörü `firestore/firestore-kurallari-2026-11-17.txt`).
- Kural yokken açılan kanalda linkin kopyası (`bilgiAcik/{anahtar}`) hiç yazılmamıştı; ana belgeye yazma sürdüğü için Yönet kanalı açık gösteriyordu. Düzeltme: `syncLink(org)` (bilgiStore) kopyayı ana belgeden baştan yazar; Yönet açılınca ve kanal açılınca çağrılır.
- Linkle açılan ekran artık sebebi söyler: link yok/eski → "Bu link geçersiz ya da eski…", okunamadı → "Bağlanılamadı…", kanal kapalı → "Kanal açık değil".
- Telefonda denenmedi.

## Sıradaki işler

- Kural değişince birleşik dosyayı (Velora + Velora Sailing) yenileyip Seyhun'a yayınlat.

## Ek (aynı gün)

- Belge açıkken bazı telefonlarda yine "Kanal açık değil" çıktı (bilgisayarda temiz tarayıcıda link çalışıyordu). `usePublic` artık: önbellekten gelen "belge yok" sayılmaz; dinleyici hata verirse ya da 8 sn'de sunucudan cevap gelmezse belge ve son ses 5 sn'de bir doğrudan REST ile (girişsiz, `bilgiAcik` get herkese açık) okunur. Playwright'ta Firestore dinleme engellenerek denendi: 14 sn'de "Katıl ve başlat" geldi.
