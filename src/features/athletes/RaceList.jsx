"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Empty } from "@/components/ui/Page";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { todayStr } from "@/lib/utils/format";
import { useWide } from "@/hooks/useWide";
import { doneFor, stepTotal, stepsOf } from "./races";

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
// Satırın dikkat isteyen bilgisi: talimat dosyası yok, yarışa bir hafta kala bitmemiş iş
function warnOf(r) {
  const todo = stepsOf(r).length;
  const close = r.startDate && diff(r.startDate) <= 7;
  const parts = [r.notice && !r.noticeFile && "Talimat dosyası yok", close && todo && `${todo} iş eksik`].filter(Boolean);
  return parts.join(" · ");
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
// Hazırlık sütunu: sporcusuz yarışta "Sporcu seç", yoksa yapılan iş ve ince çubuk; geçmişte sonuç
function prepOf(r, past) {
  if (past) return r.results?.rows && Object.keys(r.results.rows).length ? "Sonuç var" : "";
  if (!r.athleteIds.length) return <span className="font-semibold text-warn">Sporcu seç</span>;
  const total = stepTotal(r);
  if (!total) return "";
  const done = total - stepsOf(r).length;
  return (
    <>
      {done === total ? "Hazır" : `${done} / ${total} iş`}
      <span className="mt-1 block h-[5px] overflow-hidden rounded-full bg-line" aria-hidden="true">
        <span className={`block h-full rounded-full ${done === total ? "bg-ok" : "bg-acc"}`} style={{ width: `${Math.round((done / total) * 100)}%` }} />
      </span>
    </>
  );
}

// Telefonda satırın 3. satırı (Seyhun 2026-11-05 "telefon tasarımını da aynı yap", yaris-tasarim/ipad/yarislar-telefon.png):
// iPad'deki sütunların aynısı alt alta: sporcu · iş sayısı ve ince çubuk, sporcusuzsa sarı "Sporcu seç"; geçmişte sonuç
function MetaLine({ r, past }) {
  const n = r.athleteIds.length;
  const total = stepTotal(r);
  const done = total - stepsOf(r).length;
  const prep = past
    ? r.results?.rows && Object.keys(r.results.rows).length ? "Sonuç var" : ""
    : !n ? <span className="font-semibold text-warn">Sporcu seç</span> : total ? (done === total ? "Hazır" : `${done} / ${total} iş`) : "";
  if (!n && !prep) return null;
  return (
    <span className="mt-1 flex items-center gap-1.5 text-[0.78125rem] text-fg">
      {n > 0 && `${n} sporcu`}
      {n > 0 && prep && " · "}
      {prep}
      {!past && n > 0 && total > 0 && (
        <span className="ml-1 h-[5px] w-14 shrink-0 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <span className={`block h-full rounded-full ${done === total ? "bg-ok" : "bg-acc"}`} style={{ width: `${Math.round((done / total) * 100)}%` }} />
        </span>
      )}
    </span>
  );
}

function RaceRow({ r, past, onOpen, wide }) {
  const s = r.startDate && day(r.startDate);
  const warn = !past && warnOf(r);
  const line = warn || [placeText(r), r.abroad && "Yurt dışı", shortRange(r)].filter(Boolean).join(" · ");
  const sub = wide ? line : (
    <>
      {line}
      <MetaLine r={r} past={past} />
    </>
  );
  return (
    <Row
      onClick={() => onOpen(r)}
      lead={
        <span className={`flex h-12 w-11 shrink-0 flex-col items-center justify-center rounded-[0.8rem] ${warn ? "bg-warnbg text-warn" : past ? "bg-bg text-mut" : "bg-accbg text-acc"}`}>
          <b className="text-[1.125rem] font-bold leading-none tabular-nums">{s ? s.getDate() : "?"}</b>
          <small className="mt-1 text-[0.625rem] font-bold tracking-[.08em]">{s ? (past ? MON[s.getMonth()] : WD[s.getDay()]) : "—"}</small>
        </span>
      }
      title={r.name || "Adsız yarış"}
      sub={sub}
      warn={!!warn}
      right={wide ? <WideCols a={r.athleteIds.length ? `${r.athleteIds.length} sporcu` : "—"} b={prepOf(r, past)} c={past ? "" : soonText(r)} /> : past ? null : soonText(r)}
    />
  );
}

// Sıradaki yarış (yeni tasarım 2026-10-21, örnek /mnt/project-files/yarislar/yeni-tasarim/ornek.png): lacivert üstün içinde büyük kalan gün,
// ad, yer · tarih · sporcu, hazırlık çubuğu; altında yarı saydam kutuda en yakın son tarih (bir haftadan yakınsa sarı) ve sıradaki iş; Multimedya.
function NextTop({ r, onOpen }) {
  const a = diff(r.startDate);
  const total = stepTotal(r);
  const done = total - stepsOf(r).length;
  const dl = nextDeadline(r);
  const step = nextStep(r);
  const line = "flex w-full items-center gap-3 border-t border-white/15 px-4 py-3 text-left text-[0.875rem] first:border-t-0 active:bg-white/5";
  return (
    <div className="race-next mt-5" aria-label="Sıradaki yarış">
      <button type="button" onClick={() => onOpen(r)} className="block w-full text-left active:opacity-80">
        <span className="flex items-center justify-between gap-3 text-[0.75rem] font-bold tracking-[.06em] text-white/65">
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
              <b className="text-[3.25rem] font-bold leading-none tracking-[-.04em] tabular-nums">{a}</b>
              <span className="text-[1rem] font-semibold text-white/75">gün kaldı</span>
            </>
          ) : (
            <b className="text-[2.25rem] font-bold leading-none tracking-tight">{leftText(r)}</b>
          )}
        </span>
        <b className="mt-2.5 block truncate text-[1.3125rem] font-bold leading-tight tracking-tight">{r.name || "Adsız yarış"}</b>
        <span className="mt-0.5 block truncate text-[0.875rem] text-white/70">{[placeText(r), shortRange(r), `${r.athleteIds.length} sporcu`].filter(Boolean).join(" · ")}</span>
      </button>
      {/* geniş ekranda sağ yarı: hazırlık, son tarih, sıradaki iş */}
      <div className="race-next-b">
        {total > 0 && (
          <button type="button" onClick={() => onOpen(r)} className="block w-full text-left active:opacity-80">
            <span className="mt-3.5 block h-1.5 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
              <span className="block h-full rounded-full bg-[#8fb3ff]" style={{ width: `${Math.round((done / total) * 100)}%` }} />
            </span>
            <span className="mt-1.5 flex justify-between text-[0.78rem] text-white/70">
              <span>Hazırlık</span>
              <span className="tabular-nums">{done === total ? "Hepsi tamam" : `${done} / ${total} iş tamam`}</span>
            </span>
          </button>
        )}
      {(dl || step) && (
        <div className="ck-glass mt-3.5 overflow-hidden rounded-2xl">
          {dl && (
            <button type="button" onClick={() => onOpen(r)} className={line}>
              <span className="shrink-0 text-white/65">Son tarih</span>
              <b className={`min-w-0 flex-1 truncate text-right font-semibold ${diff(dl.date) <= 7 ? "text-[#ffd59a]" : ""}`}>
                {dl.title} · {diff(dl.date) ? `${diff(dl.date)} gün` : "Bugün"}
              </b>
            </button>
          )}
          {step && (
            <button type="button" onClick={() => onOpen(r)} className={line}>
              <span className="shrink-0 text-white/65">Sıradaki iş</span>
              <b className="min-w-0 flex-1 truncate text-right font-semibold">{step}</b>
              <Icon name="chev" className="size-3.5 shrink-0 text-white/65" />
            </button>
          )}
        </div>
      )}
      {/* Yayın sayfası yarış günü (multimedya kalktı; Seyhun 2026-11-01) */}
      {r.id && a <= 0 && (
        <Link href={`/athletes/races/${r.id}/yayin`} data-press className="raised mt-3 flex h-11 items-center justify-center rounded-xl border text-[0.9375rem] font-semibold">
          Yayın
        </Link>
      )}
      </div>
    </div>
  );
}

// Yarış listesi: lacivert üstte başlık (head) ve sıradaki yarış; açık zeminde yaklaşan yarışlar ay ay, en altta geçmiş (son yarış + "N yarış daha")
export function RaceList({ races, onOpen, head, children }) {
  const [showPast, setShowPast] = useState(false);
  const wide = useWide();
  const list = races || [];
  const up = list.filter((r) => !isPast(r)).sort((a, b) => (a.startDate || "9").localeCompare(b.startDate || "9"));
  const past = list.filter(isPast).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const next = up.find((r) => r.startDate);
  const rest = up.filter((r) => r !== next);

  return (
    <>
      <section className="ck race-top -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Yarışlar">
        {head}
        {next && <NextTop r={next} onOpen={onOpen} />}
      </section>
      <div className="race-body relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {children}
        {races && !list.length && <Empty icon="flag" title="Henüz yarış yok" sub="Yarışı ekle ya da talimatını yükle." />}
        {races && list.length > 0 && !up.length && <p className="text-center text-[0.875rem] text-mut">Yaklaşan yarış yok</p>}
        {byMonth(rest).map(([m, l]) => (
          <section key={m}>
            <ListHead title={m} count={l.length} />
            <RowList>
              {l.map((r) => (
                <RaceRow key={r.id} r={r} onOpen={onOpen} wide={wide} />
              ))}
            </RowList>
          </section>
        ))}
        {past.length > 0 && (
          <section>
            <ListHead title="Geçmiş" count={past.length} />
            <RowList>
              {(showPast ? past : past.slice(0, 1)).map((r) => (
                <RaceRow key={r.id} r={r} past onOpen={onOpen} wide={wide} />
              ))}
              {past.length > 1 && (
                <button type="button" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast} data-press="row" className="flex min-h-[3rem] w-full items-center border-t border-line text-left text-[0.9375rem] font-semibold text-acc">
                  {showPast ? "Daha az göster" : `${past.length - 1} yarış daha`}
                </button>
              )}
            </RowList>
          </section>
        )}
      </div>
    </>
  );
}
