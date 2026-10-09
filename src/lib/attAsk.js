// Yoklamada ad söylenmedi ya da bulunamadı ("bugün antrenmana ilave katıldı, yoklamaya onu ekle"): asistan "Kimi ekleyeyim?"
// diye sorar; cevap (yalnız ad: "Mustafa", ya da seçilen ad) ilk cümlenin günü ve durumuyla yeni bir yoklama cümlesi olur.
const DAY = /(evvelsi gün|önceki gün|dünkü|dün|bugünkü|bugün|(?:pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)\p{L}*|\d{1,2}\s+(?:ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık))/iu;
export function attState(text) {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  if (/(gelmedi|katılmadı|yoktu|gelemedi)/u.test(t)) return "gelmedi";
  if (/izinli/u.test(t)) return "izinli";
  return "geldi";
}
export function attRetry(original, answer) {
  const day = String(original || "").match(DAY)?.[0] || "";
  return `yoklama: ${day ? `${day} ` : ""}${String(answer || "").trim()} ${attState(original)}`;
}
