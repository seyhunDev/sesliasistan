## Nerede kaldım

- Bayrakla işlem (Seyhun 2026-11-03 19:23-19:28 "bütün kuralları kullanabiliyor, bayrakları tıklayarak; hepsinde onay"): `src/lib/raceSignals.js` kural kitabındaki bütün işaretleri çizer (`flagSvg`), anlamı ve sesiyle (`SIGNALS`, `soundText`).
- Yayın › Süre: altta her zaman "Bayrak" düğmesi. Pencere o ana uyan bayrakları gösterir (start öncesi tehir, saatli tehir 1–9, hazırlık; yarışta abandone, rota, geri çağırma; diğer). Bayrağa dokununca onay paneli (bayrak, anlam, ses), ancak "Çek" ile işlem yapılır.
- Start dizisi başladıysa altta kırmızı "Tehir" düğmesi hazırda (AP onayı açılır). Satırdaki Abandone düğmesi de N bayrağının onayını açar.
- Akışlar: AP ailesi tehir akışını kullanır (AP/A günü bitirir, AP/H kıyıda, saatli tehir startı N saat kaydırır); N ailesi ve birinci tekrar (FS) yarışı geçersiz sayıp start sırasına geri koyar; hazırlık bayrağı sıradaki startın bayrağı olur; diğerleri `plan.sig` olarak ekranda "İşaret" kartı (Yayın'da "İndir").
- Canlı ekran: İşaret kartı sağ üstte start kartının altında (`GSig`).

## Sıradaki işler

- Telefonda denenmedi. İşaret kartının ne zaman kendiliğinden ineceği (ör. yarış bitince) daha konuşulmadı; şimdilik Yayın'dan "İndir" ile iner, ertesi gün görünmez.
