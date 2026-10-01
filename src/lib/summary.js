// Günlük özet bildirimleri (zamanlanmış Netlify fonksiyonu gönderir). Saf fonksiyonlar: test edilebilir.
//   Sabah özeti  (users.summaryAt, "HH:MM"): o günün özeti; users.summaryTomorrow true ise yarın da eklenir
//   Akşam özeti  (users.eveningAt, "HH:MM"): ertesi günün özeti
// Gönderildiği gün users.summarySent / users.eveningSent olarak yazılır (günde bir kez).

const hm = (t) => (/^\d{2}:\d{2}$/.test(t || "") ? t : "");
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

// Saati geldi mi: seçilen saatten sonraki 2 saat içinde ve o gün henüz gönderilmediyse
export function due(at, sent, today, nowHM) {
  const a = hm(at);
  if (!a || sent === today) return false;
  const d = toMin(nowHM) - toMin(a);
  return d >= 0 && d < 120;
}
// Eski adla uyum
export const summaryDue = ({ summaryAt, summarySent }, today, nowHM) => due(summaryAt, summarySent, today, nowHM);

export function addDay(date, n = 1) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Bir günün kayıtları: o günkü planlar (saate göre), o gün biten görevler, (istenirse) gecikenler
export function dayItems({ plans = [], tasks = [], date, uid, late = false }) {
  const ps = plans
    .filter((p) => p.date <= date && (p.endDate || p.date) >= date)
    .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"));
  const open = tasks.filter((t) => !(t.done || t.doneBy?.[uid]));
  return { plans: ps, due: open.filter((t) => t.due === date), late: late ? open.filter((t) => t.due && t.due < date) : [] };
}

// Bir günün parçaları: ["2 plan, ilki 10:00 Antrenman", "1 görev"] (+ bugünse geciken)
function dayParts(o) {
  const { plans: ps, due: dueL, late: lateL } = dayItems(o);
  const dueN = dueL.length;
  const lateN = lateL.length;
  const out = [];
  const firstPlan = ps[0] && `${ps[0].time ? `${ps[0].time} ` : ""}${ps[0].title}`;
  if (ps.length) out.push(ps.length === 1 ? firstPlan : `${ps.length} plan, ilki ${firstPlan}`);
  if (dueN) out.push(`${dueN} görev`);
  if (lateN) out.push(`${lateN} geciken`);
  return out;
}
const first = (name) => String(name || "").split(" ")[0];

// Sabah: bugün (+ istenirse yarın)
export function morningText({ plans, tasks, today, uid, name, withTomorrow = false }) {
  const t = dayParts({ plans, tasks, date: today, uid, late: true });
  const body = [t.length ? t.join(" · ") : "Bugün plan ya da görev yok"];
  if (withTomorrow) {
    const y = dayParts({ plans, tasks, date: addDay(today), uid });
    body.push(`Yarın: ${y.length ? y.join(" · ") : "boş"}`);
  }
  return { title: `Günün özeti${first(name) ? `, ${first(name)}` : ""}`, body: body.join("\n") };
}

// Ana ekrandaki özet kartı: şu an hangisi geçerli? Akşam saati geçtiyse akşam (yarın), sabah saati geçtiyse sabah (bugün).
export function activeSummary({ summaryAt, eveningAt }, nowHM) {
  if (hm(eveningAt) && nowHM >= eveningAt) return "evening";
  if (hm(summaryAt) && nowHM >= summaryAt) return "morning";
  return "";
}

// Akşam: yarın
export function eveningText({ plans, tasks, today, uid }) {
  const y = dayParts({ plans, tasks, date: addDay(today), uid });
  return { title: "Yarının özeti", body: y.length ? y.join(" · ") : "Yarın için plan ya da görev yok" };
}
