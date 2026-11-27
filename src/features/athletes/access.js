// Sporcu işleri kimde (Seyhun 2026-11-27 "herkes kendi sporcularını yönetsin"): giriş yapan ana hesap kendi alanındaki
// (orgs/{uid}/athletes) sporcuları yönetir. Eskiden yalnız NEXT_PUBLIC_SPORCU_EMAILS listesi. Çalışan, sporcu, veli görmez.
// Oturumun ana hesap e-postasını AuthProvider yazar (profil belgesi okununca); asıl koruma Firestore kurallarıdır.
let ownerEmail = "";
export const setAthleteAccount = (email) => {
  ownerEmail = String(email || "").toLowerCase();
};
export const canSeeAthletes = (email) => !!email && !!ownerEmail && String(email).toLowerCase() === ownerEmail;

// Asistana söylenen yoklama mı? ("yoklama: Ali ve Zeynep geldi", "bugün antrenmana Ali gelmedi")
// here: yoklama sayfası açık; orada "yoklama" denmeden de "Ali ve Zeynep geldi", "Emre izinli", "kalanlar gelmedi" yoklamadır
// (soru ve "geldiğinde" gibi sözler değil)
const HERE = /(?<![\p{L}])(geldi(ler)?|gelmedi(ler)?|gelmeyen\p{L}*|gelmiş(ler)?|gelmemiş(ler)?|izinli\p{L}*|raporlu\p{L}*|katıldı(lar)?|katılmadı(lar)?|katılmayan\p{L}*|yoktu|vardı|kalanlar\p{L}*)(?![\p{L}])/u;
// Soru ("antrenmana Ali geldi mi", "dün kimler geldi?") ve ileriye dönük cümle ("yarın 17:00 antrenman var, gelmedi derse…") yoklama değildir
const ASK = /\?\s*$|(?<![\p{L}])m[ıiuü][.!\s]*$|(?<![\p{L}])(geldi|gelmedi|katıldı|katılmadı)(ler)?\s+m[ıi](?![\p{L}])|(?<![\p{L}])(kim|kimler|kaç|hangi|hangisi|nerede|neydi)(?![\p{L}])/u;
const AHEAD = /\d{1,2}[:.]\d{2}|(?<![\p{L}])(yarın|haftaya|gelecek hafta|derse|gelmezse|gelirse)(?![\p{L}])/u;
export const wantsAttendance = (text, here = false) => {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  if (ASK.test(t.trim()) || AHEAD.test(t)) return false;
  if (t.includes("yoklama") || (/(antre?n?man|idman|sporcu|çalışma)/.test(t) && /(geldi|gelmedi|gelmeyen|izinli|raporlu|katıldı|katılmadı|katılmayan|vardı|yoktu|gelmiş|gelmemiş)/.test(t))) return true;
  return here && HERE.test(t) && !/(\?|(?<![\p{L}])m[ıiuü](\p{L}*)?)\s*$/u.test(t.trim());
};
