"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Empty, Label } from "@/components/ui/Page";
import { CARD } from "@/features/home/ui";
import { todayStr } from "@/lib/utils/format";
import { rangeText } from "./raceDocs";
import { stepTotal, stepsOf } from "./races";

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
// Talimattaki en yakın son tarih
const nextDeadline = (r) => (r.notice?.deadlines || []).find((d) => diff(d.date) >= 0);
// Sağdaki kısa süre: "12 gün", "Yarın", "Bugün", "Sürüyor", uzaksa "4 ay"
function soonText(r) {
  if (!r.startDate) return "";
  const a = diff(r.startDate);
  if (a > 59) return `${Math.round(a / 30)} ay`;
  if (a > 1) return `${a} gün`;
  return a === 1 ? "Yarın" : a === 0 ? "Bugün" : "Sürüyor";
}
// Satırın dikkat isteyen bilgisi: talimat dosyası yok, yarışa bir hafta kala bitmemiş iş
function warnOf(r) {
  const todo = stepsOf(r).length;
  const close = r.startDate && diff(r.startDate) <= 7;
  const parts = [r.notice && !r.noticeFile && "Talimat dosyası yok", close && todo && `${todo} iş eksik`].filter(Boolean);
  return parts.join(" · ");
}
const subOf = (r) => [placeText(r), r.abroad && "Yurt dışı", r.athleteIds.length ? `${r.athleteIds.length} sporcu` : "Sporcu seçilmedi"].filter(Boolean).join(" · ");
// Ay başlığı: bu yıl "EKİM", başka yıl "ŞUBAT 2027"; tarihsiz yarışlar en sonda
const monthOf = (r) => {
  if (!r.startDate) return "TARİHSİZ";
  const d = day(r.startDate);
  return d.getFullYear() === new Date().getFullYear() ? MONTHS[d.getMonth()] : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const byMonth = (list) => list.reduce((g, r) => (g.at(-1)?.[0] === monthOf(r) ? g.at(-1)[1].push(r) : g.push([monthOf(r), [r]]), g), []);

// Liste satırı: solda gün ve haftanın günü, ortada ad ve yer (eksik varsa turuncu), sağda kalan süre
function Row({ r, past, onOpen }) {
  const s = r.startDate && day(r.startDate);
  const e = r.endDate && r.endDate !== r.startDate ? day(r.endDate) : null;
  const warn = !past && warnOf(r);
  return (
    <li>
      <button type="button" onClick={() => onOpen(r)} className={`flex w-full items-center gap-3 py-3 pl-3.5 pr-3 text-left transition active:bg-bg ${past ? "opacity-70" : ""}`}>
        <span className={`flex h-[3.125rem] w-[2.875rem] shrink-0 flex-col items-center justify-center rounded-[0.8rem] ${warn ? "bg-amber-500/12 text-amber-700" : past ? "bg-line/70 text-mut" : "bg-acc/10 text-acc"}`}>
          <b className="text-[1.1875rem] font-bold leading-none tabular-nums">{s ? s.getDate() : "?"}</b>
          <small className="mt-1 text-[0.625rem] font-bold tracking-[.08em]">{s ? (past ? MON[s.getMonth()] : WD[s.getDay()]) : "—"}</small>
        </span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold leading-snug">{r.name || "Adsız yarış"}</b>
          <small className={`block truncate text-[0.8125rem] leading-snug ${warn ? "font-semibold text-amber-700" : "text-mut"}`}>
            {warn || (past ? [placeText(r), e ? `${s.getDate()}–${e.getDate()} ${MON[e.getMonth()].toLocaleLowerCase("tr-TR")}` : ""].filter(Boolean).join(" · ") || subOf(r) : subOf(r))}
          </small>
        </span>
        {!past && <b className="shrink-0 text-[0.9375rem] font-bold tabular-nums tracking-tight">{soonText(r)}</b>}
        <Icon name="chev" className="size-4 shrink-0 text-mut" />
      </button>
    </li>
  );
}

// Sıradaki yarış: ana sayfadaki "Şu an" kartı gibi koyu yeşil; kocaman kalan gün, ad, yer · tarih · sporcu, hazırlık çubuğu,
// altında en yakın son tarih (bir haftadan yakınsa sarı) ve sıradaki iş
function NextCard({ r, onOpen }) {
  const a = diff(r.startDate);
  const total = stepTotal(r);
  const done = total - stepsOf(r).length;
  const dl = nextDeadline(r);
  const step = nextStep(r);
  return (
    <section aria-label="Sıradaki yarış" className="mt-2 overflow-hidden rounded-[1.5rem] bg-deep text-white shadow-[0_14px_30px_-18px_rgba(31,90,75,.85)]">
      <button type="button" onClick={() => onOpen(r)} className="block w-full px-5 pb-3.5 pt-4 text-left active:opacity-80">
        <span className="flex items-center justify-between gap-3 text-[0.75rem] font-bold tracking-[.08em] text-white/70">
          SIRADAKİ YARIŞ
          {r.planAdded && (
            <span className="flex items-center gap-1">
              Planda
              <Icon name="check" className="size-3.5" />
            </span>
          )}
        </span>
        <span className="mt-1.5 flex items-baseline gap-2">
          {a > 1 ? (
            <>
              <b className="text-[3.25rem] font-bold leading-none tracking-tight tabular-nums">{a}</b>
              <span className="text-[1rem] font-semibold text-white/75">gün kaldı</span>
            </>
          ) : (
            <b className="text-[2.25rem] font-bold leading-none tracking-tight">{leftText(r)}</b>
          )}
        </span>
        <b className="mt-2.5 block text-[1.3125rem] font-bold leading-tight tracking-tight">{r.name || "Adsız yarış"}</b>
        <span className="mt-0.5 block truncate text-[0.9rem] text-white/80">{[placeText(r), rangeText(r.startDate, r.endDate), `${r.athleteIds.length} sporcu`].filter(Boolean).join(" · ")}</span>
        {total > 0 && (
          <>
            <span className="mt-3.5 block h-1.5 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
              <span className="block h-full rounded-full bg-[#7ee2b8]" style={{ width: `${Math.round((done / total) * 100)}%` }} />
            </span>
            <span className="mt-1.5 flex justify-between text-[0.78rem] text-white/75">
              <span>Hazırlık</span>
              <span className="tabular-nums">{done === total ? "Hepsi tamam" : `${done} / ${total} iş tamam`}</span>
            </span>
          </>
        )}
      </button>
      {dl && (
        <button type="button" onClick={() => onOpen(r)} className="flex w-full items-center gap-3 border-t border-white/15 px-5 py-3 text-left text-[0.875rem] active:bg-white/5">
          <span className="shrink-0 text-white/70">Son tarih</span>
          <b className={`min-w-0 flex-1 truncate text-right font-semibold ${diff(dl.date) <= 7 ? "text-[#ffd59a]" : ""}`}>
            {dl.title} · {diff(dl.date) ? `${diff(dl.date)} gün` : "Bugün"}
          </b>
        </button>
      )}
      {step && (
        <button type="button" onClick={() => onOpen(r)} className="flex w-full items-center gap-3 border-t border-white/15 px-5 py-3 text-left text-[0.875rem] active:bg-white/5">
          <span className="shrink-0 text-white/70">Sıradaki iş</span>
          <b className="min-w-0 flex-1 truncate text-right font-semibold">{step}</b>
          <Icon name="chev" className="size-3.5 shrink-0 text-white/70" />
        </button>
      )}
    </section>
  );
}

// Yarış listesi: üstte sıradaki yarış kartı, altında yaklaşan yarışlar ay ay tek kartta satırlar, en altta geçmiş yarışlar (dokununca açılır)
export function RaceList({ races, onOpen }) {
  const [showPast, setShowPast] = useState(false);
  const up = races.filter((r) => !isPast(r)).sort((a, b) => (a.startDate || "9").localeCompare(b.startDate || "9"));
  const past = races.filter(isPast).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const next = up.find((r) => r.startDate);
  const rest = up.filter((r) => r !== next);

  if (!races.length)
    return <Empty icon="flag" title="Henüz yarış yok" sub="Yarışı ekle ya da yarış talimatını yükle; sporcuları seç, izin yazıları ve veli belgeleri hazır olsun. Asistana “yarış ekle” de diyebilirsin." />;

  return (
    <>
      {next && <NextCard r={next} onOpen={onOpen} />}
      {!up.length && <p className="mt-6 text-center text-[0.875rem] text-mut">Yaklaşan yarış yok</p>}
      {byMonth(rest).map(([m, list]) => (
        <section key={m}>
          <Label right={`${list.length} yarış`}>{m}</Label>
          <ul className={`divide-y divide-line overflow-hidden ${CARD}`}>
            {list.map((r) => (
              <Row key={r.id} r={r} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
      {past.length > 0 && (
        <section>
          <Label>GEÇMİŞ</Label>
          <div className={`overflow-hidden ${CARD}`}>
            <button type="button" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast} className="flex w-full items-center gap-3 p-3.5 text-left transition active:bg-bg">
              <span className="grid size-[2.375rem] shrink-0 place-items-center rounded-xl bg-line/70 text-mut">
                <Icon name="flag" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-[0.9375rem] font-semibold leading-snug">Geçmiş yarışlar</b>
                <small className="block truncate text-[0.8125rem] leading-snug text-mut">Son: {past[0].name || "Adsız yarış"}</small>
              </span>
              <b className="shrink-0 text-[0.9375rem] font-bold tabular-nums">{past.length}</b>
              <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${showPast ? "rotate-90" : ""}`} />
            </button>
            {showPast && (
              <ul className="divide-y divide-line border-t border-line">
                {past.map((r) => (
                  <Row key={r.id} r={r} past onOpen={onOpen} />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </>
  );
}
