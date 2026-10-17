## Nerede kaldım
- Fitness › Sporcular › sporcu › "Değerlendirme" (Programı düzenle'nin altında; `src/features/fitness/FitReview.jsx`, hesaplar `src/lib/fitness/review.js`). Telefonda denenmedi.
- Sayfa: hafta seçimi (Pzt–Paz, ‹ ›, ileriye geçilmez); o haftanın antrenmanları ve sonuçları (hareket, set × tekrar/süre, süreli setlerin geçen saniyesi, dakika, his, sporcunun notu); altında Haftalık takip (gösterge, hedef, kayıt: sayı + birim, "/ n" ya da Evet/Hayır), Pazar geri bildirimi soruları, Antrenör notu; Önceki değerlendirmeler listesi. Kaydet her hafta için ayrı kayıt: `orgs/{org}/fitReviews/{sporcu}_{pazartesi}` (yalnız ana hesap; mevcut kural yetiyor, kural değişikliği yok). Liste kayda kopyalanır, program sonra değişse de eski hafta aynı kalır.
- Yazdır: Bu haftanın antrenmanları / Bütün antrenmanlar / Değerlendirme, istenen biri ya da hepsi işaretlenir; yazdırılabilir sayfa açılır (fişlerdeki gibi). Değerlendirme boşsa boş form çıkar.
- Takip listesi programın parçası: `prog.review { rows [{ label, goal, unit }], ask [] }` (model.js cleanTrack). Program düzenleme ekranında "Haftalık takip" (satır ekle/sil) ve "Pazar soruları" (her satır bir soru). PDF/metinden okurken yapay zeka listeyi alır; değişiklik isteğinde korunur. Hazır program "Yelken ev kuvveti"nde PDF'teki 8 satır ve 5 soru var. Programında liste olmayan sporcuda son değerlendirmenin, o da yoksa hazır programın listesi kullanılır.

## Sıradaki işler
0. Telefonda dene: İlay › Değerlendirme, değerleri gir, Kaydet, haftayı değiştir, Yazdır'da üç seçenek; programı düzenle › Haftalık takip satırı ekle.
1. Olası: değerlendirmeyi sporcunun da doldurması (şimdilik yalnız ana hesap); "Ev kuvveti" gibi satırları yapılan antrenman sayısından otomatik doldurma.
