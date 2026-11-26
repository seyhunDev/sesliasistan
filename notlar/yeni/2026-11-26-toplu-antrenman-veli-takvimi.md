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

## Nerede kaldım
- Kimler: takım ve sınıf (Seyhun 2026-11-26 "sadece A takım ya da sadece B takım… İkisi de"; "yarışmaları da… PDF'te… kimlerin katılabileceği"; telefonda denenmedi):
  Sporcu sayfası › Bilgiler › Takım (Yok · A · B), liste `orgs/{org}/takim/liste` (`features/athletes/takimlar.js`; kulüp sitesinin sporcu kaydına yazılmaz).
  Toplu antrenman ve Veli takvimi pencerelerinde "Kimler": Herkes · A takım · B takım · sporcuların sınıfları (takım + sınıf birlikte olur). Plan `aud` {team, cls, clsName} + `audUids` (yazarken eşleşen sporcu/öğrenci hesapları + velileri; `lib/kimler.js`). Sporcu tarafı kitleli antrenmanı yalnız listedeyse görür (DataProvider sidePlans `seesPlan`), yeni antrenman bildirimi de yalnız onlara (`api/notify`). Farklı takımın aynı saatteki antrenmanı çakışma sayılmaz.
  Veli takvimi: yarışlar (tür "Yarış" planları) turuncu gün + ay altında "12–14 İzmir Kupası · A takım · Optimist"; pencerede "Yarışlar · kimler katılır" listesi (yarış planına `aud` yazar). PDF kitlesi seçilirse B takım antrenmanı A takım PDF'ine girmez. Takvim gün listesinde plan alt satırında kitle.
  Test elle.mjs "Kimler: takım ve sınıf" (9).

## Sıradaki işler
0. Telefonda dene: sporcu sayfasında Takım seç; A takım toplu antrenman ekle; sporcu hesabında yalnız A takımda görünsün.
1. Sonradan takıma eklenen sporcu eski kitleli antrenmanları görmez (audUids yazarken hesaplanır); gerekirse "kitleyi yeniden hesapla".
2. Tek tek eklenen antrenmanda (Plan penceresi) "Kimler" henüz yok.
