## Nerede kaldım

- Antrenman yarışı sonucu sesle girilir: "birinci Ali, ikinci Ayşe, üçüncü Mehmet", "1 Ali 2 Ayşe", "bir Ali oldu, iki Ayşe oldu", "Ali birinci Ayşe ikinci", "yarış sonucu: Ali, Ayşe, Mehmet", "Can DNF / bitirmedi / siyah bayrak / erken çıktı / çekildi", "ikinci yarış: …", "yeni yarış: …", "son yarışta Can DNF".
- Çözümleme `src/lib/raceVoice.js` (resultCommand, resolveResult, pickRace, applyResult); asistan işi `src/features/assistant/isler/antrenmanYaris.js`; yönlendirme `assistRoute.js` moreKind → "trainResult" (yarış sayfası dışında, ana hesap + sporcu yetkisi).
- Adlar: önce o gün yoklamada gelenler, sonra tüm etkin sporcular, sonra ses adları dizini. Virgül adları ayırır. Yanlış duyulan ad gelenlerden tek birine yakınsa düzeltilir ve cevapta gösterilir; değilse en yakını sorulur ("Yaz" onayı), hiç yakını yoksa yeniden söylemesi istenir.
- Yarış: söylenen; yoksa sayacı süren; yoksa sonucu boş son yarış; son yarışın sonucu varken 1. söylenirse yeni yarış, yalnız kod ya da sonraki sıralar söylenirse son yarışa eklenir. Onaysız yazılır, 8 sn "Geri al".
- Telefonda denenmedi.

## Sıradaki işler

- Telefonda dene: antrenman sayfasında yoklama al, sonra asistana "birinci …, ikinci …" de; Yarışlar satırında sonucu kontrol et.

## Asistan

- Antrenman yarışı sonucu sesle (2026-10-20): sonuç oluşturma onaysız; bulunamayan ad varsa kaydetmeden sorulur.
