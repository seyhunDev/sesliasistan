// Ana yapay zekanın kulüp özeti (inceleme 2026-10-09, adım 3: "ana yapay zeka uygulamanın yarısını bilmiyor").
// Planlar/görevler/notlar dışındaki bilgiler: yarışlar, sporcular, bu ayın aidatı, açık faturalar, envanter sayıları.
// Yalnız okumak için: değişiklikler kendi akışlarında yapılır. Kişisel bilgi (T.C., telefon, veli) yazılmaz; sporcunun
// yalnız adı ve sınıfı. Saf işlev: veriyi telefon toplar (AssistantSheet `clubFacts`), burada yalnız metne çevrilir.
import { monthRows } from "@/lib/dues";

const S = (v, n = 80) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const TL = (n) => `${Math.round(Number(n) || 0).toLocaleString("tr-TR")} TL`;
const block = (title, lines, more = 0) => `## ${title}\n${lines.length ? lines.join("\n") : "- yok"}${more > 0 ? `\n(+${more} daha)` : ""}`;

// races: [{ id, name, district, city, startDate, endDate, athleteIds, abroad }]
export function racesBlock(races = [], today = "") {
  if (!races.length) return "";
  const up = races.filter((r) => (r.endDate || r.startDate || "9999") >= today).sort((a, b) => (a.startDate || "9999").localeCompare(b.startDate || "9999"));
  const past = races.filter((r) => !up.includes(r)).sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
  const line = (r) => `r:${r.id} | ${r.startDate || "tarih yok"}${r.endDate && r.endDate !== r.startDate ? ` → ${r.endDate}` : ""} | ${S(r.name)} | ${[r.district, r.city].filter(Boolean).map((x) => S(x, 30)).join(", ") || "-"}${r.abroad ? " (yurt dışı)" : ""} | ${(r.athleteIds || []).length} sporcu`;
  const list = [...up.slice(0, 12).map(line), ...past.slice(0, 6).map((r) => `${line(r)} | geçti`)];
  return block("YARIŞLAR (yaklaşan, sonra geçmiş)", list, Math.max(0, up.length - 12) + Math.max(0, past.length - 6));
}

// athletes: [{ studentName, cls }] (etkin sporcular)
export function athletesBlock(athletes = []) {
  if (!athletes.length) return "";
  const names = athletes.slice(0, 120).map((a) => `${S(a.studentName, 40)}${a.cls ? ` (${S(a.cls, 20)})` : ""}`);
  return `## SPORCULAR (${athletes.length} etkin)\n${names.join(", ")}${athletes.length > 120 ? ` (+${athletes.length - 120} daha)` : ""}`;
}

// cfg: dues/settings (roster, fee, fees), month: dues/{ym}; ym: "2026-10"
export function duesBlock(cfg, month, ym) {
  const roster = (cfg?.roster || []).filter((a) => a.id && a.studentName);
  if (!roster.length || !ym) return "";
  const t = monthRows(roster, month || {}, cfg);
  const due = t.rows.filter((r) => r.state !== "paid").map((r) => `${S(r.a.studentName, 40)}${r.state === "part" ? ` (eksik: ${TL(r.paid)}/${TL(r.fee)})` : ""}`);
  return `## AİDAT (${ym})\n${t.paidCount}/${t.rows.length} sporcu ödedi, toplanan ${TL(t.paid)}${t.expected ? ` / beklenen ${TL(t.expected)}` : ""}.\nÖdemeyenler: ${due.length ? due.slice(0, 60).join(", ") : "yok"}${due.length > 60 ? ` (+${due.length - 60} daha)` : ""}`;
}

// list: invoiceIndex/open.list [{ seller, amount, currency, no, date }]
export function invoicesBlock(list = []) {
  if (!list.length) return "";
  return block("AÇIK FATURALAR (ödenmedi)", list.slice(0, 20).map((x) => `- ${S(x.seller, 50)} | ${TL(x.amount)}${x.currency && x.currency !== "TL" ? ` ${x.currency}` : ""}${x.no ? ` | no ${S(x.no, 20)}` : ""}${x.date ? ` | ${x.date}` : ""}`), list.length - 20);
}

// inventories: [{ name, items: [{ cat, qty, state, owner }] }]: kategori başına adet
export function inventoryBlock(inventories = []) {
  const lines = inventories
    .filter((v) => v.items?.length)
    .map((v) => {
      const by = new Map();
      v.items.forEach((x) => by.set(x.cat || "Diğer", (by.get(x.cat || "Diğer") || 0) + (Number(x.qty) || 1)));
      const bad = v.items.filter((x) => /Arızalı|Kayıp|Bakımda/.test(x.state || "") || x.damage).length;
      return `- ${S(v.name, 40)}: ${v.items.length} ürün; ${[...by].map(([c, n]) => `${c} ${n}`).join(", ")}${bad ? `; sorunlu ${bad}` : ""}`;
    });
  return lines.length ? block("ENVANTER (adetler)", lines.slice(0, 8)) : "";
}

export function clubDigest({ races, athletes, dues, invoices, inventories, today = "" } = {}) {
  return [racesBlock(races, today), athletesBlock(athletes), dues && duesBlock(dues.cfg, dues.month, dues.ym), invoicesBlock(invoices), inventoryBlock(inventories)].filter(Boolean).join("\n\n");
}
