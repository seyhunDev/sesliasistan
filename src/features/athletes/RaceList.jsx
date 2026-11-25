"use client";

import { useState } from "react";
import { todayStr } from "@/lib/utils/format";
import { stepsOf } from "./races";

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

// Sağdaki kısa süre: "12 gün", "Yarın", "Bugün", "Sürüyor", uzaksa "4 ay"
function soonText(r) {
  if (!r.startDate) return "";
  const a = diff(r.startDate);
  if (a > 59) return `${Math.round(a / 30)} ay`;
  if (a > 1) return `${a} gün`;
  return a === 1 ? "Yarın" : a === 0 ? "Bugün" : "Sürüyor";
}

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
// En iyi derece: yarışa giden sporcularımızın genel sıralamadaki en iyi yeri (sonuç yoksa 0)
const bestPlace = (r) => {
  const rows = r.results?.rows || {};
  const ps = (r.athleteIds || []).map((id) => rows[id]?.place || 0).filter((x) => x > 0);
  return ps.length ? Math.min(...ps) : 0;
};
const monShort = (d) => MON[d.getMonth()].charAt(0) + MON[d.getMonth()].slice(1).toLocaleLowerCase("tr-TR");
// Satır (açık tema, Seyhun 2026-11-23 "Yap"): solda gün ve ay, ortada ad, altında yer · sporcu; sağda kalan gün ("23 / gün"), eksikte sarı
// "Sporcu seç" / "N iş eksik"; geçmişte "En iyi 3."
function RaceRow({ r, past, onOpen }) {
  const s = r.startDate && day(r.startDate);
  const n = r.athleteIds.length;
  const todo = stepsOf(r).length;
  const close = r.startDate && diff(r.startDate) <= 7;
  const sub = [placeText(r), r.abroad && "Yurt dışı", n && `${n} sporcu`].filter(Boolean).join(" · ") || shortRange(r);
  const best = past ? bestPlace(r) : 0;
  const a = r.startDate ? diff(r.startDate) : null;
  let right = null;
  if (past) right = best ? <span className="rz-v rz-strong">En iyi {best}.</span> : null;
  else if (!n) right = <span className="rz-v rz-warn font-semibold">Sporcu seç</span>;
  else if (close && todo) right = <span className="rz-v rz-warn font-semibold">{todo} iş eksik</span>;
  else if (a != null && a > 1 && a <= 59) right = <span className="rzl-left"><b>{a}</b><small>gün</small></span>;
  else if (a != null) right = <span className="rz-v rz-strong">{soonText(r)}</span>;
  return (
    <button type="button" onClick={() => onOpen(r)} data-press="row" className="rz-row w-full text-left">
      <span className={`rzc-day ${past ? "rzc-past" : ""}`}>
        <b className="tabular-nums">{s ? s.getDate() : "?"}</b>
        <small>{s ? monShort(s) : "—"}</small>
      </span>
      <span className="rz-k">
        {r.name || "Adsız yarış"}
        {sub && <small>{sub}</small>}
      </span>
      {right}
    </button>
  );
}

// Sıradaki ya da süren yarış (açık tema 2026-11-23): beyaz kart; üstte "Sıradaki" (yarışta kırmızı "Yarışta · 2. gün"), ad, tarih · yer;
// sağda büyük kalan gün; altında ince çizgi ve Sporcu · Evrak · Yapılacak
function NextCard({ r, onOpen }) {
  const a = diff(r.startDate);
  const on = a <= 0 && diff(r.endDate || r.startDate) >= 0;
  const todo = stepsOf(r).length;
  const n = r.athleteIds.length;
  const lbl = on ? `Yarışta · ${1 - a}. gün` : "Sıradaki";
  const info = [shortRange(r), placeText(r)].filter(Boolean).join(" · ");
  const big = on ? null : a > 1 ? [a, "gün"] : [a === 1 ? "Yarın" : "Bugün", ""];
  return (
    <button type="button" onClick={() => onOpen(r)} data-press="row" className="rzl-next w-full text-left" aria-label={`Sıradaki yarış: ${r.name || ""}`}>
      <span className="rzl-next-top">
        <span className="min-w-0 flex-1">
          <small className={on ? "rzl-on" : ""}>{lbl}</small>
          <b>{r.name || "Adsız yarış"}</b>
          {info && <span className="rzl-info">{info}</span>}
        </span>
        {big && (
          <span className={`rzl-big ${big[1] ? "" : "rzl-big-w"}`}>
            <b>{big[0]}</b>
            {big[1] && <small>{big[1]}</small>}
          </span>
        )}
      </span>
      <span className="rzl-facts">
        <span>
          <small>Sporcu</small>
          <b className={n ? "" : "rz-warn"}>{n || "Seç"}</b>
        </span>
        <span>
          <small>Evrak</small>
          <b>{r.docsAt ? "Hazır" : "Yok"}</b>
        </span>
        <span>
          <small>Yapılacak</small>
          <b className={todo ? "rz-warn" : ""}>{todo ? `${todo} iş` : "Tamam"}</b>
        </span>
      </span>
    </button>
  );
}

// Yarış listesi (açık tema, Seyhun 2026-11-23 "Yap"; örnek ac-liste-tel/ipad): üstte başlık (head), beyaz Sıradaki kartı, Yaklaşan listesi;
// Geçmiş son iki yarış ("Tümü" hepsini açar), Yarış takvimi (extra). iPad'de iki sütun: solda Sıradaki + Yaklaşan, sağda Geçmiş + takvim.
const PAST_N = 2;
export function RaceList({ races, onOpen, head, extra = null, children }) {
  const [showPast, setShowPast] = useState(false);
  const list = races || [];
  const up = list.filter((r) => !isPast(r)).sort((a, b) => (a.startDate || "9").localeCompare(b.startDate || "9"));
  const past = list.filter(isPast).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const next = up.find((r) => r.startDate);
  const rest = up.filter((r) => r !== next);
  const pastShown = showPast ? past : past.slice(0, PAST_N);

  return (
    <>
      <section className="rzl-head pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Yarışlar">
        {head}
      </section>
      {children}
      {races && !list.length && <p className="py-8 text-center text-[0.9375rem] text-mut">Henüz yarış yok</p>}
      <div className="rzl-cols">
        <div>
          {next && <NextCard r={next} onOpen={onOpen} />}
          {races && list.length > 0 && !up.length && <p className="py-6 text-center text-[0.9375rem] text-mut">Yaklaşan yarış yok</p>}
          {rest.length > 0 && (
            <section>
              <h2 className="rz-h">Yaklaşan</h2>
              <div className="rz-list">
                {rest.map((r) => (
                  <RaceRow key={r.id} r={r} onOpen={onOpen} />
                ))}
              </div>
            </section>
          )}
        </div>
        <div>
          {past.length > 0 && (
            <section>
              <div className="rz-h flex items-center justify-between">
                <h2>Geçmiş</h2>
                {past.length > PAST_N && (
                  <button type="button" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast} data-press className="rzl-all">
                    {showPast ? "Az" : "Tümü"}
                  </button>
                )}
              </div>
              <div className="rz-list">
                {pastShown.map((r) => (
                  <RaceRow key={r.id} r={r} past onOpen={onOpen} />
                ))}
              </div>
            </section>
          )}
          {extra && <div className="rz-list rzl-extra">{extra}</div>}
        </div>
      </div>
    </>
  );
}
