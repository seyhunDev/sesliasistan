"use client";

import { useState } from "react";
import { todayStr } from "@/lib/utils/format";
import { doneFor, stepsOf } from "./races";
import { RaceGo } from "./raceUi";

const MON = ["OCA", "ŞUB", "MAR", "NİS", "MAY", "HAZ", "TEM", "AĞU", "EYL", "EKİ", "KAS", "ARA"];
const day = (s) => new Date(`${s}T12:00:00`);
const diff = (s) => Math.round((day(s) - day(todayStr())) / 864e5);

// "12 gün kaldı", "Yarın", "Sürüyor", "Bitti"
export function leftText(r) {
  if (!r.startDate) return "Tarih yok";
  const a = diff(r.startDate);
  const b = diff(r.endDate || r.startDate);
  if (a > 1) return `${a} gün kaldı`;
  if (a === 1) return "Yarın";
  if (a === 0) return "Bugün başlıyor";
  return b >= 0 ? "Sürüyor" : "Bitti";
}
export const isPast = (r) => !!r.startDate && diff(r.endDate || r.startDate) < 0;
export const placeText = (r) => [r.district, r.city].filter(Boolean).join(", ");
export const initials = (n = "") => n.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr-TR");

// Takvim yaprağı: ay + gün aralığı
export function DateBadge({ r, light }) {
  const s = r.startDate && day(r.startDate);
  const e = r.endDate && r.endDate !== r.startDate ? day(r.endDate) : null;
  return (
    <span className={`flex w-[3.75rem] shrink-0 flex-col items-center justify-center rounded-2xl py-2 ${light ? "bg-white/10 text-white" : "bg-rose-500/10 text-rose-700"}`}>
      <span className="text-[0.625rem] font-bold tracking-[.1em]">{s ? MON[s.getMonth()] : "—"}</span>
      <b className="text-[1.0625rem] font-semibold leading-tight tabular-nums">
        {s ? s.getDate() : "?"}
        {e && <span className="text-[0.8125rem] font-medium">–{e.getDate()}</span>}
      </b>
    </span>
  );
}

const WD = ["PAZ", "PZT", "SAL", "ÇAR", "PER", "CUM", "CMT"];
const MONTHS = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
const nextStep = (r) => stepsOf(r)[0]?.label;
// Talimattaki en yakın son tarih; yapıldı işaretlenen işin son tarihi atlanır (Seyhun: "yaptıysak bir sonrakini göstermeli")
const nextDeadline = (r) =>
  [...(r.notice?.deadlines || [])].sort((a, b) => String(a.date).localeCompare(String(b.date))).find((d) => diff(d.date) >= 0 && !doneFor(r, d.title, d.date));
// Sağdaki kısa süre: "12 gün", "Yarın", "Bugün", "Sürüyor", uzaksa "4 ay"
function soonText(r) {
  if (!r.startDate) return "";
  const a = diff(r.startDate);
  if (a > 59) return `${Math.round(a / 30)} ay`;
  if (a > 1) return `${a} gün`;
  return a === 1 ? "Yarın" : a === 0 ? "Bugün" : "Sürüyor";
}
// Ay başlığı: bu yıl "EKİM", başka yıl "ŞUBAT 2027"; tarihsiz yarışlar en sonda
const monthOf = (r) => {
  if (!r.startDate) return "TARİHSİZ";
  const d = day(r.startDate);
  return d.getFullYear() === new Date().getFullYear() ? MONTHS[d.getMonth()] : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const byMonth = (list) => list.reduce((g, r) => (g.at(-1)?.[0] === monthOf(r) ? g.at(-1)[1].push(r) : g.push([monthOf(r), [r]]), g), []);

// Liste satırı (ortak Row): solda gün ve haftanın günü, ortada ad ve yer (eksik varsa sarı), sağda kalan süre
// Geniş ekranda (iPad, Mac; Seyhun 2026-11-05 onayı, yaris-tasarim/ipad) satırın sağı sütun sütun: sporcu · hazırlık · kalan süre
export function WideCols({ a, b, c }) {
  return (
    <span className="flex items-center gap-4 text-[0.875rem] font-normal">
      <span className="w-20 truncate">{a}</span>
      <span className="w-28 truncate">{b}</span>
      <span className="w-16 text-right text-[0.9375rem] font-bold">{c}</span>
    </span>
  );
}
// "19–21 Kas", "27 Eki–1 Kas"
const shortRange = (r) => {
  if (!r.startDate) return "";
  const a = day(r.startDate);
  const b = r.endDate && r.endDate !== r.startDate ? day(r.endDate) : null;
  const m = (d) => MON[d.getMonth()].charAt(0) + MON[d.getMonth()].slice(1).toLocaleLowerCase("tr-TR");
  if (!b) return `${a.getDate()} ${m(a)}`;
  return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${m(b)}` : `${a.getDate()} ${m(a)}–${b.getDate()} ${m(b)}`;
};
// Satır (yeni beyaz görünüm, Seyhun 2026-11-06, yayin-canli/ornek.png): solda gün ve haftanın günü, ortada ad, altında yer · sporcu,
// sağda tek durum: sarı "Sporcu seç" / "N iş eksik", yoksa kalan süre; geçmişte "Sonuç var"
function RaceRow({ r, past, onOpen }) {
  const s = r.startDate && day(r.startDate);
  const n = r.athleteIds.length;
  const todo = stepsOf(r).length;
  const close = r.startDate && diff(r.startDate) <= 7;
  const sub = [placeText(r), r.abroad && "Yurt dışı", n ? `${n} sporcu` : shortRange(r)].filter(Boolean).join(" · ");
  const right = past
    ? r.results?.rows && Object.keys(r.results.rows).length ? ["Sonuç var", ""] : ["", ""]
    : !n ? ["Sporcu seç", "rz-warn font-semibold"] : close && todo ? [`${todo} iş eksik`, "rz-warn font-semibold"] : [soonText(r), ""];
  return (
    <button type="button" onClick={() => onOpen(r)} data-press="row" className="rz-row w-full text-left">
      <span className="w-11 shrink-0 text-center leading-tight">
        <b className={`block text-[1.125rem] font-bold tabular-nums ${past ? "text-mut" : ""}`}>{s ? s.getDate() : "?"}</b>
        <small className="block text-[0.6875rem] font-semibold text-mut">{s ? (past ? cap(MON[s.getMonth()]) : cap(WD[s.getDay()])) : "—"}</small>
      </span>
      <span className="rz-k">
        {r.name || "Adsız yarış"}
        {sub && <small>{sub}</small>}
      </span>
      {right[0] && <span className={`rz-v ${right[1]}`}>{right[0]}</span>}
      <span className="rz-chev" aria-hidden="true" />
    </button>
  );
}
const cap = (x) => x.charAt(0) + x.slice(1).toLocaleLowerCase("tr-TR");

// Sıradaki ya da süren yarış (yeni beyaz görünüm 2026-11-06): küçük gri "Sıradaki · 3 gün kaldı" (yarışta kırmızı nokta), ad, tarih · yer · sporcu,
// son tarih ve sıradaki iş satırı; ana hesapta Canlı ekran · Yayın (RaceGo)
function NextTop({ r, onOpen, owner }) {
  const a = diff(r.startDate);
  const on = a <= 0 && diff(r.endDate || r.startDate) >= 0;
  const dl = nextDeadline(r);
  const step = nextStep(r);
  const lbl = on ? `Yarışta · ${1 - a}. gün` : a > 1 ? `Sıradaki · ${a} gün kaldı` : `Sıradaki · ${leftText(r)}`;
  return (
    <div className="race-next mt-5" aria-label="Sıradaki yarış">
      <button type="button" onClick={() => onOpen(r)} className="block w-full text-left active:opacity-70">
        <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-mut">
          {on && <span className="size-2 rounded-full bg-rec" aria-hidden="true" />}
          {lbl}
        </span>
        <b className="mt-1 block truncate text-[1.375rem] font-bold leading-tight tracking-tight">{r.name || "Adsız yarış"}</b>
        <span className="mt-0.5 block truncate text-[0.9375rem] text-mut">{[shortRange(r), placeText(r), r.athleteIds.length && `${r.athleteIds.length} sporcu`].filter(Boolean).join(" · ")}</span>
      </button>
      <div className="race-next-b">
        {(dl || step) && (
          <div className="rz-list mt-2.5">
            {dl && (
              <button type="button" onClick={() => onOpen(r)} data-press="row" className="rz-row w-full text-left">
                <span className="rz-k">Son tarih</span>
                <span className={`rz-v ${diff(dl.date) <= 7 ? "rz-warn font-semibold" : ""}`}>
                  {dl.title} · {diff(dl.date) ? `${diff(dl.date)} gün` : "Bugün"}
                </span>
              </button>
            )}
            {step && (
              <button type="button" onClick={() => onOpen(r)} data-press="row" className="rz-row w-full text-left">
                <span className="rz-k">Sıradaki iş</span>
                <span className="rz-v rz-acc">{step}</span>
                <span className="rz-chev" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        {owner && r.id && <RaceGo id={r.id} className="mt-4" />}
      </div>
    </div>
  );
}

// Yarış listesi: lacivert üstte başlık (head) ve sıradaki yarış; açık zeminde yaklaşan yarışlar ay ay, en altta geçmiş (son yarış + "N yarış daha")
export function RaceList({ races, onOpen, head, owner = false, children }) {
  const [showPast, setShowPast] = useState(false);
  const list = races || [];
  const up = list.filter((r) => !isPast(r)).sort((a, b) => (a.startDate || "9").localeCompare(b.startDate || "9"));
  const past = list.filter(isPast).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const next = up.find((r) => r.startDate);
  const rest = up.filter((r) => r !== next);
  const title = (m) => <h2 className="rz-h">{cap(m)}</h2>;

  return (
    <>
      <section className="rz-top race-top pb-1 pt-[calc(0.5rem+env(safe-area-inset-top))]" aria-label="Yarışlar">
        {head}
        {next && <NextTop r={next} onOpen={onOpen} owner={owner} />}
      </section>
      <div className="race-body bg-bg pt-1">
        {children}
        {races && !list.length && <p className="py-8 text-center text-[0.9375rem] text-mut">Henüz yarış yok</p>}
        {races && list.length > 0 && !up.length && <p className="py-6 text-center text-[0.9375rem] text-mut">Yaklaşan yarış yok</p>}
        {byMonth(rest).map(([m, l]) => (
          <section key={m}>
            {title(m)}
            <div className="rz-list">
              {l.map((r) => (
                <RaceRow key={r.id} r={r} onOpen={onOpen} />
              ))}
            </div>
          </section>
        ))}
        {past.length > 0 && (
          <section>
            {title("GEÇMİŞ")}
            <div className="rz-list">
              {(showPast ? past : past.slice(0, 1)).map((r) => (
                <RaceRow key={r.id} r={r} past onOpen={onOpen} />
              ))}
              {past.length > 1 && (
                <button type="button" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast} data-press="row" className="rz-row w-full text-left text-[1rem] font-medium text-acc">
                  {showPast ? "Daha az göster" : `${past.length - 1} yarış daha`}
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
