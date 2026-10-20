// Küçük veri özeti (motor planı, çalışma haritası 2. iş): yapay zekaya her istekte bütün veri değil, isteğin konusu gider.
// Planlar, bu hafta / gelecek hafta / 60 gün ve notlar her zaman gider (kayıt ve soru çoğunu bunlarla çözer). Şunlar
// yalnız gerekince eklenir:
//   club     yarış, sporcu, aidat, fatura, envanter (ya da bir sporcunun ya da yarışın adı geçiyorsa; names)
//   year     yılın tüm planları (geçmiş, ay adı, sayma, "ne zaman", değiştirme ve silme isteklerinde)
//   receipts fiş ve kasa toplamları
// Son konuşmadaki kullanıcı sözleri de bakılır ("peki geçen ay?" önceki konuya devam eder). Saf işlev, test edilir.
import { fold } from "@/lib/brain/seedMatch";

const W = (s) => new RegExp(`(?<![\\p{L}])(${s})`, "u");
const CLUB = W("sporcu|yaris|kupa|sampiyona|lig|regat|aidat|fatura|envanter|malzeme|tekne|antrenman|kulup|yoklama|veli|optimist|laser|ilca|sinif|kamp|federasyon|hakem|bot|yelken|sayac|sonuc");
const YEAR = W("yil|ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik|gecen|gecmis|kac|toplam|ozet|istatistik|tum|hepsi|butun|ne zaman|hangi gun|sil|iptal|degistir|tasi|ertele|guncelle|tamamla|bitir|ileri al|geri al|kaldir");
const RECEIPT = W("fis|kasa|harca|masraf|gider|odeme|ode|para|lira|tl|fatura|butce");

export function digestScope(text, recent = [], names = []) {
  const t = fold([text, ...recent].filter(Boolean).join(" \n "));
  const named = names.some((n) => {
    const f = fold(String(n || "").split(/\s+/)[0]);
    return f.length > 2 && new RegExp(`(?<![\\p{L}])${f}`, "u").test(t);
  });
  return { club: CLUB.test(t) || named, year: YEAR.test(t), receipts: RECEIPT.test(t) };
}
