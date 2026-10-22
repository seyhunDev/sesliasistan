// Zildeki "Yapılacaklar": bir fitness programı sporcuya onlarca plan olarak düşer; her plan ayrı satır olmasın,
// program başına tek satır (ForYou).
// Yeni fitness planlarını programa göre topla: { prog, n, weeks, by, at }
export function fitGroups(list) {
  const map = new Map();
  for (const r of list) {
    const g = map.get(r.fit.prog) || { prog: r.fit.prog, n: 0, from: r.date || "", to: r.date || "", by: r.createdByUid, at: r.createdAt || "" };
    g.n++;
    if (r.date && (!g.from || r.date < g.from)) g.from = r.date;
    if (r.date && r.date > g.to) g.to = r.date;
    map.set(r.fit.prog, g);
  }
  return [...map.values()].map(({ from, to, ...g }) => ({ ...g, weeks: from && to ? Math.max(1, Math.ceil((Date.parse(to) - Date.parse(from) + 864e5) / (7 * 864e5))) : 0 }));
}
export const fitText = (g) => `${g.weeks ? `${g.weeks} haftalık, ` : ""}${g.n} antrenman`;
