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
    // Set süreleri yalnız erken geçilen set varsa yazılır (hepsi tamamsa satır zaten söylüyor)
    rows: st === "done" ? r.rows.map((x) => ({ name: x.name, line: x.line, sets: x.sets.some((s) => s.state === "early") ? x.sets.map((s) => s.text).join(" · ") : "" })) : [],
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

export const CLUB = "Dikili Yelken Spor Kulübü";
export const CLUB_LOGO = "/club-logo.png";

// Rapor (uygulama içinde önizlenir ve yazdırılır): kulüp başlığı ve logosu, sporcu, program, hafta, antrenör; seçilen bölümler; imza.
// pick { week, all, review } (en az biri). plans: sporcunun fitness planları. Biçim REPORT_CSS (yalnız .fr içinde geçerli).
export function reportHtml({ name, prog, plans = [], review, week, pick = {}, today, coach = "", meta = "" }) {
  const parts = [];
  if (pick.week) parts.push(plansHtml(`Bu haftanın antrenmanları · ${weekLabel(week)}`, weekPlans(plans, week).map((p) => planSummary(p, today))));
  if (pick.all) parts.push(plansHtml("Bütün antrenmanlar", fitPlans(plans).filter((p) => p.date <= today || p.fit?.res?.st).map((p) => planSummary(p, today))));
  if (pick.review && review) parts.push(reviewHtml(review));
  const info = [
    ["Sporcu", [name, meta].filter(Boolean).join(" · ")],
    ["Program", prog?.title || "Fitness"],
    ["Hafta", weekLabel(week)],
    ["Antrenör", coach],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`)
    .join("");
  return `<header><img src="${CLUB_LOGO}" alt=""><div><b>${esc(CLUB.toLocaleUpperCase("tr-TR"))}</b><span>Sporcu antrenman raporu</span></div><time>${esc(dm(today))} ${esc(today.slice(0, 4))}</time></header>
<section class="info">${info}</section>${parts.join("")}
<footer><div><span>Antrenör</span><b>${esc(coach) || "&nbsp;"}</b><i>İmza</i></div><div><span>Sporcu / Veli</span><b>${esc(name) || "&nbsp;"}</b><i>İmza</i></div></footer>`;
}

export const REPORT_CSS = `
.fr{font:12px/1.45 -apple-system,"Helvetica Neue",Arial,sans-serif;color:#2b2d31;background:#fff;max-width:760px;margin:0 auto;padding:28px 26px}
.fr header{display:flex;align-items:center;gap:14px;padding-bottom:12px;border-bottom:2px solid #2f7d6b}
.fr header img{width:58px;height:58px;object-fit:contain}
.fr header div{flex:1;display:flex;flex-direction:column}
.fr header b{font-size:16px;letter-spacing:.04em;color:#1f3a5f}
.fr header span{font-size:13px;color:#2f7d6b;font-weight:600}
.fr header time{font-size:11px;color:#777;align-self:flex-start}
.fr .info{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin:14px 0 4px;padding:10px 12px;background:#f4f6f3;border-radius:10px}
.fr .info div{display:flex;flex-direction:column}.fr .info small{font-size:10px;color:#777;text-transform:uppercase;letter-spacing:.06em}.fr .info b{font-weight:600}
.fr h2{font-size:14px;margin:20px 0 4px;color:#1f3a5f}.fr h3{font-size:12.5px;margin:14px 0 6px;color:#1f3a5f}
.fr .m{color:#6b6e73}.fr p{margin:0 0 6px}
.fr table{width:100%;border-collapse:collapse;page-break-inside:auto}.fr tr{page-break-inside:avoid}
.fr td{border-bottom:1px solid #e3e5e1;padding:5px 4px;vertical-align:top;text-align:left}
.fr tr.h td{font-weight:600;border-top:1.5px solid #9aa39c;padding-top:7px}
.fr tr.th td{font-weight:600;font-size:11px;color:#555;border-bottom:1.5px solid #9aa39c}.fr td.v{width:28%;font-weight:600}
.fr .q{margin:0 0 9px;page-break-inside:avoid}.fr .q p{margin:3px 0 0;min-height:18px;border-bottom:1px solid #e3e5e1}
.fr footer{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-top:34px;page-break-inside:avoid}
.fr footer div{display:flex;flex-direction:column;border-top:1px solid #9aa39c;padding-top:6px}
.fr footer span{font-size:10px;color:#777;text-transform:uppercase;letter-spacing:.06em}.fr footer i{font-style:normal;font-size:10px;color:#999;margin-top:22px}
`;
