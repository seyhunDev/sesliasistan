// Telefonda çalışan testlerin raporları: yalnız bu cihazda (localStorage), en yeni 20 çalıştırma.
// Rapor: { at, ms, items: [{ key, name, feature, pass, total, lines: [{ ok, text, sub }] }] }
const KEY = "velora.testRaporlari";

export function reportList() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function reportSave(r) {
  const list = [r, ...reportList()].slice(0, 20);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  return list;
}

// Her testin son sonucu: { "ses.okuma": { pass, total, at } }
export function lastResults(list) {
  const out = {};
  for (const r of list) for (const x of r.items) if (!out[x.key]) out[x.key] = { pass: x.pass, total: x.total, at: r.at };
  return out;
}

export const reportPass = (r) => r.items.reduce((a, x) => a + x.pass, 0);
export const reportTotal = (r) => r.items.reduce((a, x) => a + x.total, 0);

const hm = (t) => new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
// "Çar 21 Eki 22:49"
const day = (t) => {
  const d = new Date(t);
  return `${d.toLocaleDateString("tr-TR", { weekday: "short" })} ${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`;
};
export const reportWhen = (t) => `${day(t)} ${hm(t)}`;

// Paylaşılacak düz metin
export function reportText(r, meta = "") {
  return [
    `TEST RAPORU · ${reportWhen(r.at)} · ${reportPass(r)}/${reportTotal(r)} geçti · ${Math.round(r.ms / 1000)} sn`,
    meta,
    ...r.items.flatMap((x) => ["", `${x.feature} › ${x.name}: ${x.pass}/${x.total}`, ...x.lines.map((l) => `${l.ok ? "✓" : "✗"} ${l.text}${l.sub ? ` (${l.sub})` : ""}`)]),
  ]
    .filter((l) => l !== undefined)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}
