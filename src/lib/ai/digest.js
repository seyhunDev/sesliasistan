import { totalTL as totalOf } from "@/lib/receipts";

const DN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const DS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const MN = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const p2 = (n) => String(n).padStart(2, "0");
const fmt = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const D = (s) => new Date(`${s}T00:00`);
const dn = (s) => DS[D(s).getDay()];
const TRY = (n) => `${Math.round(n).toLocaleString("tr-TR")} TL`;

export function addDate(s, n) {
  const d = D(s);
  d.setDate(d.getDate() + n);
  return fmt(d);
}
// Pazartesi-Pazar hafta aralığı
export function weekRange(s) {
  const start = addDate(s, -((D(s).getDay() + 6) % 7));
  return { start, end: addDate(start, 6) };
}

// members: ana hesabın çalışanları [{ uid, name }]; verilirse kayıtlara sorumlu adları ve çalışan özeti eklenir
export function buildDigest({ plans = [], tasks = [], notes = [], receipts = [], name = "", members = [], now = new Date() }) {
  const today = fmt(now);
  const { start: ws, end: we } = weekRange(today);
  const { start: ns, end: ne } = weekRange(addDate(today, 7));
  const year = now.getFullYear();
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = fmt(new Date(year, now.getMonth() + 1, 0));
  const prevYm = fmt(new Date(year, now.getMonth() - 1, 1)).slice(0, 7);

  const pTitle = (id) => plans.find((p) => p.id === id)?.title || "-";
  // Sorumlular: çalışan adları (ekleyen çalışan da sorumlu sayılır)
  const whoIds = (r) => [...new Set([...(Array.isArray(r.assignees) ? r.assignees : (r.people || []).filter((u) => u !== r.createdByUid)), r.createdByUid])];
  const who = (r) => {
    if (!members.length) return "";
    const names = whoIds(r).map((u) => members.find((m) => m.uid === u)?.name).filter(Boolean);
    return ` | sorumlu:${names.join(", ") || "-"}`;
  };
  const inR = (p, a, b) => p.date <= b && (p.endDate || p.date) >= a;
  const byP = (x, y) => `${x.date}${x.time || ""}`.localeCompare(`${y.date}${y.time || ""}`);
  const pl = (p) => `p:${p.id} | ${p.date} ${dn(p.date)}${p.endDate && p.endDate !== p.date ? ` → ${p.endDate} ${dn(p.endDate)}` : ""} | ${p.time || "tüm gün"} | ${p.title}${p.status === "cancelled" ? " (İPTAL)" : ""} | ${p.place || "-"} | ${p.cat || "Genel"}${who(p)}`;
  const tl = (t) => `t:${t.id} | son:${t.due ? `${t.due} ${dn(t.due)}` : "-"} | ${t.done ? "tamam" : "açık"} | ${t.title} | plan:${t.planId ? pTitle(t.planId) : "-"}${who(t)}`;
  const nl = (n) => `n:${n.id} | ${(n.createdAt || "").slice(0, 10)} | ${n.title} | ${(n.body || "").replace(/\s+/g, " ").slice(0, 80)}`;
  const block = (title, lines, max = 40) =>
    `## ${title}\n${lines.length ? lines.slice(0, max).join("\n") + (lines.length > max ? `\n(+${lines.length - max} daha)` : "") : "- yok"}`;

  const open = tasks.filter((t) => !t.done);
  const plansIn = (a, b) => plans.filter((p) => inR(p, a, b)).sort(byP).map(pl);
  const dueIn = (a, b) => open.filter((t) => t.due && t.due >= a && t.due <= b).sort((x, y) => x.due.localeCompare(y.due)).map(tl);
  const doneIn = (a, b) => tasks.filter((t) => t.done && t.doneAt && t.doneAt.slice(0, 10) >= a && t.doneAt.slice(0, 10) <= b).map(tl);

  const perMonth = MN.map((m, i) => `${m} ${plans.filter((p) => p.date.startsWith(`${year}-${p2(i + 1)}`)).length}`).join(", ");
  const yearPlans = plans.filter((p) => p.date.startsWith(String(year)) || (p.endDate || "").startsWith(String(year))).sort(byP).map(pl);

  const rc = (ym) => {
    const rs = receipts.filter((r) => (r.date || "").startsWith(ym));
    const by = {};
    rs.forEach((r) => (by[r.cat] = (by[r.cat] || 0) + totalOf(r)));
    const tot = Object.values(by).reduce((a, b) => a + b, 0);
    const top = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c} ${TRY(v)}`).join(", ");
    return `${ym}: ${rs.length} fiş, toplam ${TRY(tot)}${top ? ` (${top})` : ""}`;
  };

  return [
    "# VERİ ÖZETİ (tek doğruluk kaynağı)",
    `KULLANICI ADI: ${name || "(verilmedi)"}`,
    `ŞİMDİ: ${today} ${DN[now.getDay()]} ${p2(now.getHours())}:${p2(now.getMinutes())} (Europe/Istanbul)`,
    `BU HAFTA: ${ws} → ${we} | GELECEK HAFTA: ${ns} → ${ne} | BU AY: ${monthStart} → ${monthEnd} | YIL: ${year}`,
    ...(members.length
      ? [
        block(
          "KİŞİLER (ekip ya da aile; sorumlu atanabilecek kişiler)",
          members.map((m) => {
            const mine = open.filter((t) => whoIds(t).includes(m.uid));
            const late = mine.filter((t) => t.due && t.due < today).length;
            return `${m.name} | açık görev: ${mine.length}${late ? ` (${late} gecikmiş)` : ""}`;
          }),
        ),
      ]
      : []),
    block("BUGÜN PLANLAR", plansIn(today, today)),
    block("BUGÜN SON TARİHLİ AÇIK GÖREVLER", dueIn(today, today)),
    block("GECİKMİŞ AÇIK GÖREVLER (son tarihi geçmiş)", open.filter((t) => t.due && t.due < today).sort((x, y) => x.due.localeCompare(y.due)).map(tl)),
    block("BU HAFTA PLANLAR", plansIn(ws, we)),
    block("BU HAFTA SON TARİHLİ AÇIK GÖREVLER", dueIn(ws, we)),
    block("BU HAFTA TAMAMLANAN GÖREVLER", doneIn(ws, we)),
    block("GELECEK HAFTA PLANLAR", plansIn(ns, ne)),
    block("GELECEK HAFTA SON TARİHLİ AÇIK GÖREVLER", dueIn(ns, ne)),
    block("BU AY PLANLAR", plansIn(monthStart, monthEnd), 30),
    block("SONRAKİ 60 GÜN PLANLAR (gelecek haftadan sonrası)", plansIn(addDate(ne, 1), addDate(today, 60))),
    block("TARİHSİZ AÇIK GÖREVLER", open.filter((t) => !t.due).map(tl)),
    block("SON NOTLAR", [...notes].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 10).map(nl), 10),
    `## YIL ${year} ÖZETİ\nAylara göre plan sayısı: ${perMonth}\nGörevler: ${tasks.filter((t) => t.done).length} tamamlandı, ${open.length} açık | Notlar: ${notes.length}`,
    block(`YIL ${year} TÜM PLANLAR`, yearPlans, 60),
    `## FİŞ TOPLAMLARI (örnek veri)\n${rc(today.slice(0, 7))}\n${rc(prevYm)}\nKontrol bekleyen fiş: ${receipts.filter((r) => r.status === "review").length}`,
  ]
    .join("\n\n")
    .slice(0, 12000);
}
