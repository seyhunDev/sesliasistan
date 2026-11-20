## Nerede kaldım
- Bilgi Yönet › Kanallar (Seyhun 2026-11-17 "yap", örnek artifact NfHsyaZBkVVH3Rc91hUWCQ): kanal satırındaki liste simgesi "Kanallar" penceresini açar. Her kanal `orgs/{org}/bilgiKanal/{id}` { name, at, end }. ⋯: İzi izle, Tekrar aç (yeni link, aynı kanal kimliği; açık olan kapanır) / Kapat, Adını değiştir, Sil. Aynı anda tek kanal açık.
- Sil: onay yok, 6 sn "Geri al"; sonra kanalın izleri (bilgiIz), son konumları (bilgiTekne), gelen sesleri (bilgiGelen), günlük kayıtları (bilgiLog, `ch` alanı olanlar; bu sürümden önceki kayıtlarda ch yok) ve kanal kaydı silinir.
- İz: sporcu ekranı 5 sn'de bir nokta toplar, dakikada bir `bilgiIz` belgesi ekler (pts düz liste: sn, enlem, boylam, hız kn). Sporcu başına 3 saatte ~180 yazma.
- İzi izle: harita her teknenin izini kendi renginde çizer; ▶ (×10, ×30, ×1), kaydırma çubuğu, o anki hızlar. Saf işlevler `izTracks`, `izAt` (src/lib/bilgi.js).
- firestore.rules: yeni `bilgiIz/{id}` kuralı (yalnız ekleme; okuma/silme ana hesap). Seyhun konsoldan yayınlamalı.

## Sıradaki işler
- Denizde deneme: iz kaydı ve geri oynatma telefonda denenmedi.
