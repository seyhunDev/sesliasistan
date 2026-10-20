## Nerede kaldım

- Seyhun'un cümlesi: "Fişlerin ve faturaların kontrol edilmesi ve envanterin oluşturulması gerekiyor, bunları yarın 14:00 için iki ayrı plan olarak ekle". "plan olarak ekle" kayıt kalıbına uymadığı için envantere gitti; envanter yapay zekası değişiklik yapmadı ama "iki planı takvime ekledim" diye yanlış cevap yazdı, envanter kartı çıktı, plan oluşmadı.
- Düzeltme: `invWords.js` plan/görev/hatırlatma/takvim sözcüğü + ekleme fiili ayrı yerlerde olsa da kayıt sayar (envantere yönelik "envantere/envanterden" yoksa). `isler/envanter.js`: değişiklik yok ve cümle envanter sorusu değilse (INV_ASK) envanter cevabı ve kartı yazılmaz, istek ana asistana gider. Envanter yapay zekası süre satırında "Yapay zeka" adımı olarak görünür.

## Sıradaki işler

- Diğer işlerin kendi yapay zeka çağrıları (fitness, yemek, yarış…) süre satırında hâlâ "yapay zekaya gitmedi" görünebilir; aynı timingMark eklenmeli.

## Asistan

- Kural (Seyhun 2026-10-20): net olmayan ya da işle ilgisi olmayan bilgi/kart yazılmaz; bir kelimenin geçmesi o işe gitmek için yeterli değil.
