## Nerede kaldım
- firestore.rules'a Velora Sailing bölümü eklendi (KURAL DEĞİŞİKLİĞİ VAR, PR #1475'in yerini alır): `sailingEvents`, `sailingTrim`, yeni `sailUsers/{uid}` (+ `sailTactics`, `sailRaces`), `sailChallenges`. Kaynak: velora-sailing deposu `firebase/firestore-sailing.rules`.
- Kurallar: her kullanıcı yalnız kendi verisini okur/yazar; site sahibi (`sailAdmin()`: Seyhun uid ya da e-posta) hepsini okur ama başkası adına yazmaz. Taktik sınırı: sahip dışında en çok 10 (profildeki `tac` listesi). Antrenör yarışını her Velora hesabı kendisi için kurar.
- Emülatörde 51 kural testi geçti (bu dosyanın tamamıyla).
- Yayın: `pbcopy < firestore.rules`, Firebase konsolu › Firestore › Kurallar › Yayınla.

## Sıradaki işler
- Yayından sonra Sailing'de ziyaret.html → Hesaplar listesi dolmalı.
- `/api/sailing-giris` içindeki `vs` bilgisi artık Sailing'de rol vermiyor (Sailing yalnız Seyhun'u sahip sayıyor); ileride sadeleştirilebilir.

## Asistan
- 2026-11-28: Sailing "Herkese açık taktikler" için `sailPublic/{uid}_{tid}` kuralı eklendi: giriş yapan herkes okur, yalnız sahibi yazar/kaldırır, Velora ana hesabı kaldırabilir; ad (`by`) yalnız sahibi isterse yazılır.
