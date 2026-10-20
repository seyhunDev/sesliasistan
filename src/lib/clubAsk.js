// Kulüp soruları (yapay zekasız, telefondaki veriden): "kaç sporcumuz var", "sıradaki yarış ne zaman",
// "yaklaşan doğum günleri", "Ali'nin velisi kim", "Ali'nin veli telefonu ne", "Ali kaç yaşında".
// İstek haritası (2026-10-20): veri telefonda varken yapay zekaya gidip beklenmesin. Saf işlevler, test edilir.
//   clubAsk(söz)                                     { kind } ya da null
//   clubAnswer(soru, { athletes, races, birthdays, today })  cevap yazısı
import { fold } from "@/lib/brain/seedMatch";
import { whoIn } from "@/lib/attQuery";
import { upcomingBirthdays } from "@/lib/agenda";

const ASK = /(?<![\p{L}])(kim|kimler|kimin|kimlerin|kac|hangi|hangisi|ne zaman|nedir|ne|neler|var mi|nerede)(?![\p{L}])/u;
// Kayıt, mesaj ya da sayfa isteği: soru değil
const NOT = /(?<![\p{L}])(ekle|kaydet|olustur|sil|yaz|gonder|soyle|haber ver|ac|diye)\p{L}{0,5}(?![\p{L}])/u;

export function clubAsk(s) {
  const t = fold(s).replace(/[.!?;]/g, " ").replace(/\s+/g, " ").trim();
  if (!t || !ASK.test(t) || NOT.test(t)) return null;
  if (/(^| )(kac|toplam) (aktif )?sporcu(muz|m|umuz)?( |$)|sporcu sayi/.test(t)) return { kind: "count", text: t };
  if (/(siradaki|yaklasan|sonraki|gelecek|bir sonraki|ilk) yaris|(^| )yaris(a|imiz)? (ne zaman|kac gun)/.test(t)) return { kind: "nextRace", text: t };
  if (/dogum gun/.test(t) && /(kim|yaklas|var mi|bu ay|bu hafta|neler)/.test(t)) return { kind: "birthdays", text: t };
  if (/veli/.test(t) && /(telefon|numara|tel( |$))/.test(t)) return { kind: "parentPhone", text: t };
  if (/veli(si|sinin|leri)?( |$)/.test(t) && /(^| )kim/.test(t)) return { kind: "parent", text: t };
  if (/kac yas/.test(t)) return { kind: "age", text: t };
  return null;
}

const first = (n) => String(n || "").trim().split(/\s+/)[0];
// İyelik eki: Ali'nin, Zeynep'in, Ufuk'un, Övgü'nün
function gen(n) {
  const v = [...n.toLocaleLowerCase("tr-TR")].reverse().find((c) => "aeıioöuü".includes(c)) || "e";
  const e = { a: "ın", ı: "ın", e: "in", i: "in", o: "un", u: "un", ö: "ün", ü: "ün" }[v];
  return `${n}'${"aeıioöuü".includes(n.slice(-1).toLocaleLowerCase("tr-TR")) ? "n" : ""}${e}`;
}
const DN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const MN = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const shortDay = (d) => `${+d.slice(8, 10)} ${MN[+d.slice(5, 7) - 1]}`;
const daysTo = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 86400000);
const whenText = (d, today) => {
  const n = daysTo(today, d);
  return n === 0 ? "bugün" : n === 1 ? "yarın" : n < 7 ? `${DN[new Date(`${d}T12:00:00`).getDay()]} (${n} gün sonra)` : `${shortDay(d)} (${n} gün sonra)`;
};
const join = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ve ${xs[xs.length - 1]}`);
const yearsOld = (birth, today) => {
  if (typeof birth !== "string" || !/^\d{4}-\d{2}-\d{2}/.test(birth)) return null;
  let y = +today.slice(0, 4) - +birth.slice(0, 4);
  if (today.slice(5, 10) < birth.slice(5, 10)) y--;
  return y;
};

export function clubAnswer(q, { athletes = [], races = [], birthdays = [], today }) {
  const act = athletes.filter((a) => a?.studentName && a.status === "active");
  if (q.kind === "count") return act.length ? `${act.length} aktif sporcu var.` : "Kayıtlı aktif sporcu yok.";
  if (q.kind === "nextRace") {
    const up = races.filter((r) => r?.name && (r.endDate || r.startDate) >= today).sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
    if (!up.length) return "Yaklaşan yarış yok.";
    const r = up[0];
    const on = r.startDate <= today ? "devam ediyor" : `${whenText(r.startDate, today)} başlıyor`;
    const more = up.length > 1 ? ` Sonra: ${up[1].name}, ${shortDay(up[1].startDate)}.` : "";
    return `Sıradaki yarış ${r.name}${r.district ? `, ${r.district}` : ""}; ${on}.${more}`;
  }
  if (q.kind === "birthdays") {
    const span = /bu hafta/.test(q.text) ? 7 : 30;
    const up = upcomingBirthdays(birthdays.filter((b) => b?.name && b.month && b.day), today, span);
    if (!up.length) return `Önümüzdeki ${span === 7 ? "hafta" : "30 gün"} doğum günü yok.`;
    return `Yaklaşan doğum günleri: ${join(up.slice(0, 6).map((b) => `${b.name} ${whenText(b.date, today)}${b.age ? `, ${b.age} yaşına giriyor` : ""}`))}.`;
  }
  const who = whoIn(q.text, athletes.filter((a) => a?.studentName));
  if (!who) return "";
  const n = first(who.studentName);
  if (q.kind === "parentPhone") return who.parentPhone ? `${gen(n)} velisi${who.parentName ? ` ${who.parentName}` : ""}, telefonu ${who.parentPhone}.` : `${n} için veli telefonu yazılmamış.`;
  if (q.kind === "parent") return who.parentName ? `${gen(n)} velisi ${who.parentName}${who.parentPhone ? `, telefonu ${who.parentPhone}` : ""}.` : `${n} için veli adı yazılmamış.`;
  if (q.kind === "age") {
    const y = yearsOld(who.studentBirthDate, today);
    return y != null ? `${n} ${y} yaşında.` : `${n} için doğum tarihi yazılmamış.`;
  }
  return "";
}
