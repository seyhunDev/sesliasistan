## Nerede kaldım

- Sorun: asistan soru sorunca ("Göndereyim mi?") mikrofon kendiliğinden açılıyordu, ama "gönder" denince "ses algılanmadı" çıkıyordu (Seyhun 2026-10-20). Nedeni şuydu:
  - Okumadan hemen sonra açılan telefon ses tanıması kısa sözü hiç yazıya çevirmiyordu.
  - Ekrandaki dalga gerçek ses değildi; telefonun tanımasında dalga süs.
- Çözüm:
  - Cevap mikrofonu (`listenOnce`) artık kayıt yolunu kullanıyor (`sp.start({ server: true })`). Ses gerçekten ölçülüyor, susunca kayıt sunucuda (/api/transcribe) çevriliyor.
  - Kullanıcı ↑ ile bitirirse kayıt, ölçer konuşma görmemiş olsa da sunucuya gidiyor (`stop` → `stopNow(mode, true)`).
- Ekran testlerinde cevaplar `answer()` yardımcısıyla veriliyor. Testteki sahte mikrofon konuşma sayılmadığı için test ↑'e basıyor.
- iPhone'da denenmedi.

## Sıradaki işler

- Asistan ekranında sesli okumayı aç/kapat düğmesi (Seyhun 2026-10-20 istedi).
