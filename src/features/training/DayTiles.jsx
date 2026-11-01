"use client";

import { places, mmss } from "@/lib/raceScore";
import { upSec } from "@/lib/raceLive";
import { RATINGS, logLine } from "@/lib/trainingLog";
import { useTimerRun } from "@/features/training/Countdown";

// Antrenman sayfası Süre'nin orta alanı kareler (Seyhun 2026-11-01, örnek /mnt/project-files/antrenman-sayfasi/kareler/ornek.png):
// üstte Yoklama · Günlük yan yana, altında tam genişlikte Yarışlar (her yarış bir satır: kaç dakikalık start, ilk üç ya da işaretlenen
// şamandıralar, saat, ne kadar sürdüğü / süren yarışta yarışta +süre). Kareye ya da satıra dokununca pencere alttan açılır.
const hm = (ms) => new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const first = (n) => String(n || "").split(" ")[0];
const tile = "flex min-w-0 flex-col rounded-[1.125rem] border border-line bg-card px-3.5 py-3 text-left";
const btn = "mt-auto flex h-9 w-full items-center justify-center rounded-[0.6875rem] border border-line bg-card text-[0.875rem] font-semibold text-acc shadow-[0_2px_0_var(--line)] active:translate-y-px active:shadow-none";

function raceSub(r) {
  const pl = places(r);
  const top = (r.finishes || []).filter((f) => pl[f.id] <= 3).sort((a, b) => pl[a.id] - pl[b.id]).map((f) => `${pl[f.id]}. ${first(f.name)}`);
  const marks = Object.entries(r.marks || {}).sort((a, b) => a[1] - b[1]).map(([k, v]) => `${k.replace("Şamandıra ", "Ş")} ${mmss(v)}`);
  return [r.cd ? `${Math.round(r.cd / 60)} dk start` : "", ...(top.length ? top : marks)].filter(Boolean).join(" · ");
}

export function DayTiles({ roll, log, races, leader, onRoll, onLog, onRace }) {
  const tr = useTimerRun();
  const state = (r) => {
    if (tr.t.rid === r.id && tr.running) return { on: true, text: tr.up ? `yarışta +${mmss(upSec(tr.t.end, tr.now))}` : `starta ${mmss(Math.max(0, tr.rem))}` };
    if (r.fin != null) return { text: `${mmss(r.fin)} sürdü` };
    return null;
  };
  const list = [...races].map((r, i) => ({ ...r, n: i + 1 })).reverse();
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {roll && (
        <button type="button" onClick={onRoll} data-press="row" className={`${tile} ${log ? "" : "col-span-2"}`}>
          <span className="text-[0.9375rem] font-semibold">Yoklama</span>
          {roll.total ? (
            <>
              <b className="mt-1 text-[1.875rem] font-semibold leading-tight tabular-nums">
                {roll.present.length}
                <span className="text-[0.9375rem] font-medium text-mut"> / {roll.total} geldi</span>
              </b>
              <span className="mb-2.5 text-[0.8125rem] leading-snug text-mut">
                {roll.names && <span className="block truncate">{roll.names}</span>}
                {roll.blank ? `${roll.blank} kişi boş` : ""}
              </span>
            </>
          ) : (
            <span className="mb-2.5" />
          )}
          <span className={btn}>Yoklama al</span>
        </button>
      )}
      {log && (
        <button type="button" onClick={onLog} data-press="row" className={`${tile} ${roll ? "" : "col-span-2"}`}>
          <span className="text-[0.9375rem] font-semibold">Günlük</span>
          {log.rec ? (
            <span className="mb-2.5 mt-1.5 text-[0.8125rem] leading-snug text-mut">
              <span className="line-clamp-3">{logLine(log.rec) || log.rec.note || "Yazıldı"}</span>
              {log.rec.rating && <b className="mt-1 block font-semibold text-fg">{RATINGS.find(([k]) => k === log.rec.rating)?.[1]} geçti</b>}
            </span>
          ) : (
            <span className="mb-2.5 mt-2 self-start rounded-full bg-warnbg px-2 py-0.5 text-[0.75rem] font-semibold text-warn">Yazılmadı</span>
          )}
          <span className={btn}>{log.rec ? "Düzenle" : "Yaz"}</span>
        </button>
      )}
      {races && (
        <section className={`${tile} col-span-2 py-2.5`} aria-label="Yarışlar">
          <button type="button" onClick={() => onRace(null)} className="flex items-center justify-between gap-2 py-0.5 text-left">
            <span className="text-[0.9375rem] font-semibold">Yarışlar</span>
            <span className="truncate text-[0.8125rem] text-mut">{races.length ? [`${races.length} yarış`, leader ? `${leader} önde` : ""].filter(Boolean).join(" · ") : "Başlat'la yarış açılır"}</span>
          </button>
          {list.map((r) => {
            const st = state(r);
            const sub = raceSub(r);
            return (
              <button key={r.id} type="button" onClick={() => onRace(r.id)} data-press="row" className="flex items-center gap-3 border-t border-line py-2.5 text-left">
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] font-semibold">{r.name || `${r.n}. yarış`}</b>
                  {sub && <span className="block truncate text-[0.8125rem] text-mut">{sub}</span>}
                </span>
                <span className="shrink-0 text-right text-[0.875rem] tabular-nums text-fg2">
                  {Number.isFinite(r.startAt) ? hm(r.startAt) : ""}
                  {st && <small className={`block text-[0.75rem] ${st.on ? "font-semibold text-acc" : "text-mut"}`}>{st.text}</small>}
                </span>
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}
