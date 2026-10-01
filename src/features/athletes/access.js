// Ana sayfadaki "Sporcular" düğmesi yalnızca bu e-postalarda görünür: NEXT_PUBLIC_SPORCU_EMAILS="a@b.com,c@d.com".
// Asıl koruma sporcu projesinin (dikili-c7cc8) kendi güvenlik kurallarıdır; veriyi o projenin hesabıyla okuruz.
const list = () =>
  (process.env.NEXT_PUBLIC_SPORCU_EMAILS || "seyhunyildiz@gmail.com")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const canSeeAthletes = (email) => !!email && list().includes(String(email).toLowerCase());

// Asistana söylenen yoklama mı? ("yoklama: Ali ve Zeynep geldi", "bugün antrenmana Ali gelmedi")
export const wantsAttendance = (text) => {
  const t = String(text || "").toLocaleLowerCase("tr-TR");
  return t.includes("yoklama") || (/(antrenman|idman|sporcu|çalışma)/.test(t) && /(geldi|gelmedi|gelmeyen|izinli|raporlu|katıldı|katılmadı|katılmayan|vardı|yoktu|gelmiş|gelmemiş)/.test(t));
};
