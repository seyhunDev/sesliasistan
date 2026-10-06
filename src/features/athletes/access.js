// Ana sayfadaki "Sporcular" düğmesi yalnızca bu e-postalarda görünür: NEXT_PUBLIC_SPORCU_EMAILS="a@b.com,c@d.com".
// Asıl koruma sporcu projesinin (dikili-c7cc8) kendi güvenlik kurallarıdır; veriyi o projenin hesabıyla okuruz.
const list = () =>
  (process.env.NEXT_PUBLIC_SPORCU_EMAILS || "seyhunyildiz@gmail.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const canSeeAthletes = (email) => !!email && list().includes(String(email).toLowerCase());

// Asistana söylenen yoklama mı? ("yoklama: Ali ve Zeynep geldi", "bugün antrenmana Ali gelmedi")
// here: yoklama sayfası açık; orada "yoklama" denmeden de "Ali ve Zeynep geldi", "Emre izinli", "kalanlar gelmedi" yoklamadır
// (soru ve "geldiğinde" gibi sözler değil)
const HERE = /(?<![\p{L}])(geldi(ler)?|gelmedi(ler)?|gelmeyen\p{L}*|gelmiş(ler)?|gelmemiş(ler)?|izinli\p{L}*|raporlu\p{L}*|katıldı(lar)?|katılmadı(lar)?|katılmayan\p{L}*|yoktu|vardı|kalanlar\p{L}*)(?![\p{L}])/u;
// Soru ("antrenmana Ali geldi mi", "dün kimler geldi?") ve ileriye dönük cümle ("yarın 17:00 antrenman var, gelmedi derse…") yoklama değildir
const ASK = /\?\s*$|(?<![\p{L}])m[ıiuü][.!\s]*$|(?<![\p{L}])(kim|kimler|kaç|hangi|hangisi|nerede|neydi)(?![\p{L}])/u;
const AHEAD = /\d{1,2}[:.]\d{2}|(?<![\p{L}])(yarın|haftaya|gelecek hafta|derse|gelmezse|gelirse)(?![\p{L}])/u;
export const wantsAttendance = (text, here = false) => {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  if (ASK.test(t.trim()) || AHEAD.test(t)) return false;
  if (t.includes("yoklama") || (/(antrenman|idman|sporcu|çalışma)/.test(t) && /(geldi|gelmedi|gelmeyen|izinli|raporlu|katıldı|katılmadı|katılmayan|vardı|yoktu|gelmiş|gelmemiş)/.test(t))) return true;
  return here && HERE.test(t) && !/(\?|(?<![\p{L}])m[ıiuü](\p{L}*)?)\s*$/u.test(t.trim());
};
