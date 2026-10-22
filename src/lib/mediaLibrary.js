// Medya sayfası (/media; Seyhun 2026-10-22, örnek yaris-tasarim/medya/medya-sayfasi.png): bütün fotoğraf ve videolar tek yerde,
// Antrenman ve Yarış ayrı. Her antrenman (raceLive/ant-<planId>) ve yarış (raceLive/<yarışId>) bir bölüm: başlık, gün/yer · kaç kayıt,
// "Tümü ›" o sayfanın Medya sekmesine gider. Bölümler en son çekilen üstte; bölüm içinde çekiliş sırası (eskiden yeniye).
const D = (s) => new Date(`${s}T00:00`);
const dayOf = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
const short = (s) => `${D(s).toLocaleDateString("tr-TR", { weekday: "short" })} ${D(s).getDate()} ${D(s).toLocaleDateString("tr-TR", { month: "short" })}`;
const addDay = (s, n) => {
  const d = D(s);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("sv-SE");
};
// "Bugün · Per 22 Eki", "Dün · Çar 21 Eki", "Pzt 19 Eki"
export const dayText = (s, today) => (s === today ? `Bugün · ${short(s)}` : s === addDay(today, -1) ? `Dün · ${short(s)}` : short(s));
// "17-18 Eki", "30 Eki - 2 Kas", "11 Eki"
export function rangeText(a, b) {
  if (!a) return "";
  const m = (s) => D(s).toLocaleDateString("tr-TR", { month: "short" });
  if (!b || b === a) return `${D(a).getDate()} ${m(a)}`;
  return m(a) === m(b) ? `${D(a).getDate()}-${D(b).getDate()} ${m(b)}` : `${D(a).getDate()} ${m(a)} - ${D(b).getDate()} ${m(b)}`;
}
export const countText = (xs) =>
  [xs.filter((m) => m.kind === "video").length, xs.filter((m) => m.kind !== "video").length].map((n, k) => n && `${n} ${k ? "fotoğraf" : "video"}`).filter(Boolean).join(" · ");

export function librarySections(docs, { plans = [], races = [], today = dayOf(new Date().toISOString()) } = {}) {
  const ant = [];
  const race = [];
  for (const d of docs || []) {
    const items = [...(d.media || [])].sort((a, b) => a.at.localeCompare(b.at));
    if (!items.length) continue;
    const last = items[items.length - 1].at;
    const n = `${items.length} kayıt`;
    if (d.id.startsWith("ant-")) {
      const pid = d.id.slice(4);
      const p = plans.find((x) => x.id === pid);
      const day = p?.date || dayOf(items[0].at);
      ant.push({ key: d.id, id: d.id, title: p?.title || "Antrenman", sub: `${dayText(day, today)} · ${n}`, href: `/training/day?id=${pid}&tab=media`, items, last });
    } else {
      const r = races.find((x) => x.id === d.id);
      const where = r?.district || r?.city || "";
      const when = rangeText(r?.startDate || dayOf(items[0].at), r?.endDate || "");
      race.push({ key: d.id, id: d.id, title: r?.name || "Yarış", sub: [where, when, n].filter(Boolean).join(" · "), href: `/athletes/races/${d.id}/media?tab=media`, items, last });
    }
  }
  const byLast = (a, b) => b.last.localeCompare(a.last);
  return { ant: ant.sort(byLast), race: race.sort(byLast) };
}
