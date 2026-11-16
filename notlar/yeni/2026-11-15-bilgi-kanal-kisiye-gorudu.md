## Nerede kaldım
- Bilgi ekranı KANAL (Seyhun 2026-11-15, hepsini onayladı): Yönet › Kanal "Kanal aç" (ad, örn. Antrenman) yeni link açar (eski link çalışmaz), "Kapat" ekranları durdurur. bilgi/ekran.kanal { id, name, open }. Ekran yalnız açık kanala "Katıl ve başlat" ile başlar; kanal kapanır ya da yenisi açılırsa katılma kartına döner.
- Kişiye gönderme: Mesaj üstünde "Hepsi" + kanaldaki açık kişiler (yelken no + isim). msg.to / ses.to = cihaz id; yalnız o ekran gösterir, "Sana" yazar.
- Gönderim durumu: İletildi (sunucu onayı, waitForPendingWrites, 10 sn) → Görüldü (ekran bilgiTekne.seen = mesaj/ses id) → 15 sn'de görmeyen Ulaşmadı + Tekrar. Sonuç bilgiLog'a (st, seen, of) yazılır, Gönderilenler'de görünür. lib/bilgi deliveryOf, membersOf.
- Varlık: bilgiTekne/{cihaz} artık konum izni olmasa da 30 sn'de bir yazılır (lat/lon boş), ch = kanal. Harita ve liste kanala göre.
- Uygulamada (iPhone kabuğu / ana ekran uygulaması) tam ekran istenmiyor: iOS üstte site adresli "tam ekran" şeridi çıkarıyordu. Web'de (link) aynı.
- Sesle: "bilgi kanalı aç: Antrenman", "bilgi kanalını kapat", "bilgi ekranında Mustafa'ya yaz: …".
- firestore.rules bilgiTekne alanları (ch, seen, boş konum) değişti; konsoldan yayınlanmalı.

## Sıradaki işler
- Telefonlarda uçtan uca dene (kanal aç, linkle katıl, hepsine/kişiye, Görüldü).
