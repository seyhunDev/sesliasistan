// Cümleden doğum günü: "Annemin doğum günü 12 Mart", "Ali'nin doğum günü 3 Mayıs 1990", "teyzemin doğum günü 05.11"
// Yapay zeka gerekmez. Dönüş: { name, month, day, year } (bulunamayan alanlar boş) ya da null (doğum günü cümlesi değil).
const MONTHS = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];
const ASCII = ["ocak", "subat", "mart", "nisan", "mayis", "haziran", "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik"];

export const isBirthdayText = (text) => /doğum\s*gün|dogum\s*gun/iu.test(String(text || ""));

// Tamlayan ekini at: "Annemin" -> "Annem", "Ali'nin" -> "Ali", "teyzemin" -> "teyzem", "Ayşe'nin" -> "Ayşe"
function owner(words) {
  if (!words) return "";
  let w = words.trim().replace(/\s+/g, " ");
  if (/['’]/.test(w)) return w.replace(/['’][\p{L}]*$/u, "");
  return w.replace(/(nın|nin|nun|nün|ın|in|un|ün)$/u, "");
}

const capWords = (s) => s.replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toLocaleUpperCase("tr-TR"));

export function parseBirthday(text) {
  const t = String(text || "").trim();
  if (!isBirthdayText(t)) return null;
  const low = t.toLocaleLowerCase("tr-TR");
  const out = { name: "", month: 0, day: 0, year: null };

  // Tarih: "12 Mart [1990]" ya da "12.03[.1990]" / "12/03"
  const mName = low.match(new RegExp(`(\\d{1,2})\\s*(${[...MONTHS, ...ASCII].join("|")})(?:\\s*(\\d{4}))?`, "u"));
  const mNum = low.match(/(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}))?/);
  if (mName) {
    const k = MONTHS.indexOf(mName[2]) >= 0 ? MONTHS.indexOf(mName[2]) : ASCII.indexOf(mName[2]);
    Object.assign(out, { day: +mName[1], month: k + 1, year: mName[3] ? +mName[3] : null });
  } else if (mNum) {
    Object.assign(out, { day: +mNum[1], month: +mNum[2], year: mNum[3] ? +mNum[3] : null });
  }
  // "bugün" / "yarın" (tarih yazılmadıysa)
  if (!mName && !mNum && /(bugün|yarın)/u.test(low)) {
    const d = new Date();
    if (/yarın/u.test(low)) d.setDate(d.getDate() + 1);
    Object.assign(out, { day: d.getDate(), month: d.getMonth() + 1 });
  }
  if (!(out.month >= 1 && out.month <= 12 && out.day >= 1 && out.day <= 31)) Object.assign(out, { month: 0, day: 0 });

  // Kimin: "doğum günü"nden önceki kelimeler (baştaki fiil/dolgu atılır)
  const before = t.split(/doğum\s*gün|dogum\s*gun/iu)[0]
    .replace(/^(bugün|yarın)\s+/iu, "")
    .replace(/^(bir|yeni|lütfen|not al|ekle|kaydet|hatırlat)\s+/iu, "")
    .replace(/\s+(ve|de|da)$/iu, "")
    .trim();
  out.name = before ? capWords(owner(before)) : "";
  return out;
}
