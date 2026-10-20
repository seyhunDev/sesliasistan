## Nerede kaldım

- Asistan motoru: küçük veri özeti yapıldı (`src/lib/ai/digestScope.js`).
  - Yapay zekaya her istekte bütün veri gitmiyor. Planlar (bugün, bu hafta, gelecek hafta, 60 gün), görevler ve notlar her zaman gidiyor.
  - Kulüp bölümü (yarışlar, sporcular, aidat, fatura, envanter) yalnız konu geçince ya da bir sporcunun veya yarışın adı geçince gidiyor.
  - Yılın tüm planları yalnız geçmiş, ay adı, sayma, "ne zaman", silme ve değiştirme isteklerinde gidiyor.
  - Fiş toplamları yalnız para, kasa ve fiş sözlerinde gidiyor.
  - Son kullanıcı sözlerine de bakılıyor ("peki geçen ay?").
  - Açık ekran (odak) varsa her şey gidiyor.
- Yapay zekanın en uzun yanıtı 8192 yerine 4096 token.

## Sıradaki işler

- Doğal cevap kalıpları (eksik bilgiyi teklif eden, değişkenli cümleler).
- Hızlı kalıplar ölçme (Firestore kuralı).
- Fatura, harcama, okunmamış mesaj soruları telefonda.
