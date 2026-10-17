// Haftalık değerlendirme (Fitness › Sporcular › sporcu › Değerlendirme). Saf işlevler; testler de bunları sınar.
// Programda takip listesi: prog.review { rows [{ label, goal, unit }], ask [soru] } (eklerken/düzenlerken değişir, PDF'ten okunur).
//   unit: "saat" gibi birim, "/ 2" (en çok 2) ya da "Evet / Hayır"
// Kayıt: orgs/{org}/fitReviews/{sporcu}_{pazartesi} { for, forName, prog, week, rows [{ label, goal, unit, v }], ask [{ q, a }], note, createdAt, updatedAt }
// Liste kayda kopyalanır: program sonra değişse de eski haftanın değerlendirmesi aynı kalır.
import { DOWS, STATUS, addDays, cleanTrack, dowOf, fitPlans, mondayOf, resRows, statusOf } from "./model";

export { cleanTrack };

const S = (v, n = 200) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const T = (v, n = 600) => String(v ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, n);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Takip listesinin satırı nasıl doldurulur: { yn } evet/hayır, { of } en çok n, { unit } sayı ve birim
export function rowKind(unit) {
  const u = S(unit, 20);
  if (/evet|hay[ıi]r/i.test(u)) return { yn: true };
  const m = u.match(/^\/\s*(\d{1,3})$/);
  if (m) return { of: +m[1] };
  return { unit: u };
}

// Satırın değeri: evet/hayır için "e" | "h", sayılar için 0–999 (ondalık virgül olur), boş bırakılabilir
export function cleanValue(row, v) {
  if (v == null || v === "") return "";
  const k = rowKind(row.unit);
  if (k.yn) return v === "e" || v === "h" ? v : "";
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return "";
  return Math.min(k.of || 999, Math.round(n * 10) / 10);
}

export const reviewId = (uid, week) => `${uid}_${week}`;
export const weekOf = (day) => mondayOf(day);

export function cleanReview(r = {}, track = null) {
  const week = DAY.test(r.week || "") ? weekOf(r.week) : "";
  const base = cleanTrack(track || r) || { rows: [], ask: [] };
  const vals = new Map((Array.isArray(r.rows) ? r.rows : []).map((x) => [S(x?.label, 40), x?.v]));
  const answers = new Map((Array.isArray(r.ask) ? r.ask : []).map((x) => (typeof x === "string" ? [S(x, 160), ""] : [S(x?.q, 160), x?.a])));
  return {
    for: S(r.for, 128),
    forName: S(r.forName, 80),
    prog: S(r.prog, 64),
    week,
    rows: base.rows.map((x) => ({ ...x, v: cleanValue(x, vals.get(x.label)) })),
    ask: base.ask.map((q) => ({ q, a: T(answers.get(q), 600) })),
    note: T(r.note, 1500),
  };
}
export const reviewFilled = (r) => !!(r && (r.rows?.some((x) => x.v !== "" && x.v != null) || r.ask?.some((x) => x.a) || r.note));

export const valueText = (row) => {
  if (row.v === "" || row.v == null) return "";
  const k = rowKind(row.unit);
  if (k.yn) return row.v === "e" ? "Evet" : "Hayır";
  const n = String(row.v).replace(".", ",");
  return k.of ? `${n} / ${k.of}` : `${n}${k.unit ? ` ${k.unit}` : ""}`;
};

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const dm = (d) => `${+d.slice(8)} ${MONTHS[+d.slice(5, 7) - 1]}`;
// "13–19 Eki" · "27 Eki – 2 Kas"
export function weekLabel(mon) {
  const sun = addDays(mon, 6);
  return mon.slice(5, 7) === sun.slice(5, 7) ? `${+mon.slice(8)}–${dm(sun)}` : `${dm(mon)} – ${dm(sun)}`;
}

// Haftanın antrenmanları (Pzt–Paz), tarih sırasıyla
export const weekPlans = (plans, mon) => fitPlans(plans).filter((p) => p.date >= mon && p.date <= addDays(mon, 6));

// Bir antrenmanın yazdırılacak/gösterilecek özeti: { date, day, name, status, rows [{ name, line, sets }], min, feel, note }
export function planSummary(p, today) {
  const st = statusOf(p, today);
  const r = resRows(p.fit);
  return {
    id: p.id,
    date: p.date,
    day: `${DOWS[dowOf(p.date)]} ${dm(p.date)}`,
    name: p.fit?.name || p.title || "Antrenman",
    st,
    status: STATUS[st],
    rows: st === "done" ? r.rows.map((x) => ({ name: x.name, line: x.line, sets: x.sets.map((s) => s.text).join(" · ") })) : [],
    min: st === "done" ? p.fit?.res?.min || 0 : 0,
    feel: p.fit?.res?.feel || 0,
    note: S(p.fit?.res?.note, 300),
  };
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const FEEL = ["", "Zor", "İyi", "Kolay"];

function plansHtml(title, list) {
  if (!list.length) return `<h2>${esc(title)}</h2><p class="m">Antrenman yok.</p>`;
  const body = list
    .map((s) => {
      const head = `<tr class="h"><td>${esc(s.day)}</td><td>${esc(s.name)}</td><td>${esc(s.status)}${s.min ? ` · ${s.min} dk` : ""}${s.feel ? ` · ${FEEL[s.feel]}` : ""}</td></tr>`;
      const rows = s.rows.map((x) => `<tr><td></td><td>${esc(x.name)}</td><td>${esc(x.line)}${x.sets ? `<br><span class="m">${esc(x.sets)}</span>` : ""}</td></tr>`).join("");
      const note = s.note ? `<tr><td></td><td colspan="2" class="m">Not: ${esc(s.note)}</td></tr>` : "";
      return head + rows + note;
    })
    .join("");
  const done = list.filter((s) => s.st === "done").length;
  return `<h2>${esc(title)}</h2><p class="m">${done} / ${list.length} antrenman yapıldı</p><table>${body}</table>`;
}

function reviewHtml(r) {
  const rows = r.rows.map((x) => `<tr><td>${esc(x.label)}</td><td>${esc(x.goal)}</td><td class="v">${esc(valueText(x)) || "&nbsp;"}</td></tr>`).join("");
  const ask = r.ask.map((x) => `<div class="q"><b>${esc(x.q)}</b><p>${esc(x.a).replace(/\n/g, "<br>") || "&nbsp;"}</p></div>`).join("");
  return `<h2>Değerlendirme · ${esc(weekLabel(r.week))}</h2>${rows ? `<table><tr class="th"><td>Gösterge</td><td>Hedef</td><td>Haftalık kayıt</td></tr>${rows}</table>` : ""}${ask ? `<h3>Pazar geri bildirimi</h3>${ask}` : ""}${r.note ? `<h3>Antrenör notu</h3><p>${esc(r.note).replace(/\n/g, "<br>")}</p>` : ""}`;
}

// Yazdırılacak sayfa: pick { week, all, review } (en az biri). plans: sporcunun fitness planları
export function printHtml({ name, prog, plans = [], review, week, pick = {}, today }) {
  const parts = [];
  if (pick.week) parts.push(plansHtml(`Bu haftanın antrenmanları · ${weekLabel(week)}`, weekPlans(plans, week).map((p) => planSummary(p, today))));
  if (pick.all) parts.push(plansHtml("Bütün antrenmanlar", fitPlans(plans).filter((p) => p.date <= today || p.fit?.res?.st).map((p) => planSummary(p, today))));
  if (pick.review && review) parts.push(reviewHtml(review));
  const title = `${name || "Sporcu"} · ${prog?.title || "Fitness"}`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
body{font:12px -apple-system,Arial,sans-serif;color:#222;margin:24px}h1{font-size:18px;margin:0 0 2px}h2{font-size:15px;margin:22px 0 4px}h3{font-size:13px;margin:16px 0 6px}
.m{color:#666}table{width:100%;border-collapse:collapse}td{border-bottom:1px solid #ddd;padding:5px 4px;vertical-align:top;text-align:left}
tr.h td{font-weight:600;border-top:2px solid #444;padding-top:8px}tr.th td{font-weight:600;border-bottom:2px solid #444}td.v{width:30%}
.q{margin:0 0 10px}.q p{margin:3px 0 0;min-height:18px;border-bottom:1px solid #ddd}
</style></head><body><h1>${esc(title)}</h1><p class="m">Yazdırma: ${esc(dm(today))} ${esc(today.slice(0, 4))}</p>${parts.join("")}
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
}
