## Nerede kaldım

- Asistan puanlaması, 1. adım: ölçüm (Seyhun: "puanlama ve öğrenme sistemi kuralım, asıl kaynak Firebase, hızlı ve sağlıklı"; öneri `/mnt/project-files/asistan/puanlama-ogrenme-onerisi.md`; telefonda denenmedi). Asistanın davranışı değişmedi, yalnız ölçülüyor. Her komut bitince kendiliğinden puan: +1 iş bitti ve 2 dk dokunulmadı, +1 soru sormadan yaptı, +1 kartta tek "evet"; −2 "geri al / yanlış / Ali değil Ayşe" düzeltmesi, −2 aynı cümle 2 dk içinde yeniden söylendi, −1 kayıt 10 dk içinde elle düzeltildi, −1 ✗ / Vazgeç, −1 asistanın açtığı sayfadan 30 sn içinde geri dönüldü. Puanlar cümle kalıbına (sayı, gün, ekler atılmış kelimeler) toplanır (`src/lib/brain/score.js` saf, `scoreStore.js`; bağlantılar yonlendirme.js `scoreStart`, cevap.js `scoreEnd`, AddSheet `scoreEdit`, navTrail `scoreBack`, BrainSync). Ayarlar › Öğrenme'de "Asistan puanı": bu hafta komut sayısı, % doğru, puan, önceki 3 hafta, en çok hata yapılan cümleler, Kopyala. Kayıt Firebase'de `orgs/{org}/learnSum/{uid}` (kalıp ve hafta özetleri, increment ile en sık 2 dk'da bir ve uygulama arka plana geçince; okuma günde en çok 1), ham olaylar mevcut aylık `learn` belgesine. 60 günden eski kalıplar rapora girmez, en çok 500 kalıp. Öğrenme kapalıysa ölçülmez; "Öğrenilenleri sıfırla" puanları da siler. KURAL DEĞİŞİKLİĞİ VAR: `learnSum` (kişi yalnız kendi belgesi). Testi `test:asistan` › "Puanlama".

## Sıradaki işler

- firestore.rules'ı Firebase konsolunda yayınla. Birkaç gün asistanı kullan, Ayarlar › Öğrenme › Asistan puanı'na bak; "Kopyala" ile raporu threade ver.
- 2. adım: düzeltme sözlüğü ve kişisel varsayılanlar (aynı düzeltme 3 kez olunca). 3. adım: kalıp puanına göre yol seçimi ve yapay zekaya benzer iyi örnekler.

## Asistan

- Asistanın her komutu kendiliğinden puanlanır (kullanıcı düğmeye basmaz); puanlar cümle kalıbına toplanır, asıl kaynak Firebase `learnSum`, telefon hızlı kopya (2026-10-14).
