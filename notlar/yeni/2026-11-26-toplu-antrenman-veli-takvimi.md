## Nerede kaldım
- Toplu antrenman ve veli takvimi (Seyhun 2026-11-26: "Kasım boyunca bütün hafta sonlarına antrenman otomatik ekleyebileyim… bayram tatiline antrenman koyduysam hafta içine geliyorsa 2 antrenman gözükmesin… velilere PDF"; örnek project-files/toplu-antrenman/ornek.html; telefonda denenmedi):
  Takvim › + › Toplu antrenman (yalnız ana hesap): aylar, Hafta sonu / Hafta içi / Gün seç, "Bayram ve resmi tatiller de", saat–bitiş, ad, yer; önce "N antrenman eklenecek · M gün zaten antrenman var, atlanır"; günler küme (bayram hafta içine denk gelse de tek), aynı gün aynı saatte (ya da saatsiz) antrenman varsa atlanır, tatil seçilmediyse tam gün tatil atlanır, geçmiş gün yok, en çok 200. Kayıt tek seri (`repeat.every "bulk"`), "Geri al" hepsini siler; planda "Toplu antrenman" etiketi.
  Takvim › + › Veli takvimi: aylar, başlık, not → PDF (A4, en çok 6 ay/sayfa, mavi antrenman, kırmızı çerçeve tatil, arife alt yarısı) → PdfViewer Paylaş (Mail, WhatsApp, Dosyalar). Başlık ve not cihazda hatırlanır.
  Takvimde tatil satırı, kırmızı nokta, iPad hücresinde adı. Sesle: "Aralık ve Ocak hafta sonlarına 10:30'da antrenman ekle", "velilere Aralık–Mart antrenman takvimi hazırla" (pencere dolu açılır, kaydetmez).
  Dosyalar: lib/tatiller.js, lib/topluAntrenman.js, lib/veliTakvimi.js, features/calendar (TopluAntrenman, VeliTakvimi, veliPdf, bulkOpen, toplu.css), isler/topluAntrenman.js; test elle.mjs "Toplu antrenman" (12).

## Sıradaki işler
0. Telefonda dene: Takvim › + › Toplu antrenman (Aralık–Şubat hafta sonları, bayramlar açık), Geri al; Veli takvimi PDF → Paylaş › Mail.
1. 2028 bayram tarihleri `src/lib/tatiller.js` BAYRAM tablosuna eklenecek (2027 sonunda).

## Asistan
- Toplu antrenman ve veli takvimi sesle yalnız pencereyi dolu açar (toplu iş, kullanıcı Ekle'ye basar); `assistRoute` `bulkTrain`/`parentsCal` erken adaylar.
