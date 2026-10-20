"use client";

import { useEffect, useState } from "react";
import { Label, card } from "@/components/ui/Page";
import { Loading } from "@/components/ui/Loader";
import { Sheet } from "@/components/ui/Sheet";
import { DayDetail } from "@/features/weather/DaySheet";
import { windLevel } from "@/features/weather/weather";
import { cleanSpot, loadRaceDay } from "@/features/athletes/raceWeather";
import { saveRaceSpot } from "@/features/athletes/races";
import { useToast } from "@/components/ui/ToastProvider";
import { SpotSheet } from "./SpotSheet";
import { addWind, saveWind } from "@/features/athletes/raceLiveStore";
import { Bar } from "@/features/training/Countdown";
import { DIRS, atOf, dayOf, dirShort, hm, marksFor, windOn } from "@/lib/raceLive";

// Hava: yarış yerinin o günkü saatlik tahmini, hava sayfasındaki grafiğin aynısı (DayDetail); elle yazılan rüzgâr grafikte içi boş nokta.
// "Rüzgar yaz": yön + şiddet, saat kendiliğinden (değiştirilebilir). Satıra dokununca kayıt silinir (sorar).
// Yer: yarışın `spot`u; yoksa ilk açılışta ilçeden bulunup yarışa kaydedilir, bulunamazsa ya da istenirse haritadan seçilir (SpotSheet).
// Bugün ve geçmiş günlerde en yakın resmî istasyonun ölçümü (uzaklık sınırı yok; istasyon ve km grafiğin altında yazar).
// saveSpot: yerin kaydı (antrenman sayfası planına yazar); verilmezse yarışa (saveRaceSpot)
export function WeatherTab({ orgId, race, day, live, onChange, onRace, saveSpot: put }) {
  const toast = useToast();
  const [wx, setWx] = useState({ day: "", rows: null, err: "" });
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(false);
  useEffect(() => {
    let on = true;
    loadRaceDay(race, day).then(
      (d) => {
        if (!on) return;
        setWx({ day, rows: d.rows, place: d.place, at: d.lat != null ? { lat: d.lat, lon: d.lon } : null, err: "" });
        // İlçeden bulunan yer yarışa yazılır: bir daha aranmaz, başka telefonda da aynı yer
        const sp = d.found && !race.spot && cleanSpot({ name: d.place, lat: d.lat, lon: d.lon });
        if (sp) (put ? put(sp) : saveRaceSpot(orgId, race.id, sp)).then(() => onRace?.((r) => (r && !r.spot ? { ...r, spot: sp } : r)), () => {});
      },
      (e) => on && setWx({ day, rows: null, err: e?.message || "Hava tahmini alınamadı" }),
    );
    return () => {
      on = false;
    };
  }, [race, day, orgId, onRace, put]);
  const saveSpot = async (p) => {
    const sp = cleanSpot(p);
    try {
      await (put ? put(sp) : saveRaceSpot(orgId, race.id, sp));
    } catch {
      return toast("Kaydedilemedi. İnterneti kontrol et.");
    }
    setPick(false); // yer değişince hava yeniden alınır (loadRaceDay saklananın yerine bakar)
    onRace?.((r) => (r ? { ...r, spot: sp } : r));
  };

  const list = windOn(live.wind, day);
  const rows = wx.day === day ? wx.rows : null;
  const marks = rows ? marksFor(rows, list) : [];
  const drop = (w) => {
    if (!confirm(`${hm(w.at)} rüzgâr kaydı silinsin mi?`)) return;
    const next = live.wind.filter((x) => x !== w);
    onChange({ wind: next }, () => saveWind(orgId, race.id, next));
  };

  return (
    <>
      <section className={`${card} mt-3 px-4 pb-3 pt-4`}>
        {rows ? (
          <DayDetail date={day} rows={rows} marks={marks} place={wx.place} at={wx.at} far />
        ) : wx.day === day && wx.err ? (
          <div className="py-5 text-center">
            <p className="text-[0.875rem] text-mut">{wx.err}</p>
            <button type="button" onClick={() => setPick(true)} data-press className="btn btn-primary btn-sm mt-3">
              Haritadan yer seç
            </button>
          </div>
        ) : (
          <Loading label="Hava yükleniyor" className="py-8" />
        )}
      </section>
      {wx.place && rows && (
        <div className="mt-1.5 flex items-start gap-3 px-1 text-[0.75rem] text-mut">
          <p className="min-w-0 flex-1 leading-snug">Open-Meteo</p>
          <button type="button" onClick={() => setPick(true)} className="shrink-0 font-semibold text-acc active:opacity-60">
            Yeri değiştir
          </button>
        </div>
      )}
      <SpotSheet open={pick} onClose={() => setPick(false)} spot={cleanSpot(race.spot) || (wx.at && { name: wx.place, ...wx.at })} onSave={saveSpot} />

      {list.length > 0 && (
        <>
          <Label right={list.length}>Ölçülen</Label>
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {[...list].reverse().map((w) => (
              <li key={w.at + w.src}>
                <button type="button" onClick={() => drop(w)} data-press="row" className="flex w-full flex-wrap items-center gap-x-3 px-4 py-3 text-left">
                  <span className="flex-1 text-[0.9375rem] font-medium tabular-nums">{hm(w.at)}</span>
                  <span className="text-[0.875rem] text-mut tabular-nums">
                    {dirShort(w.dir)} · <b className={`font-semibold ${windLevel(w.kn).tone}`}>{w.kn} kn</b>
                    {w.gust ? ` · sağanak ${w.gust}` : ""}
                    {w.ckn ? ` · akıntı ${w.ckn} kn${w.cdir !== null ? ` ${dirShort(w.cdir)}` : ""}` : ""}
                    {w.src !== "elle" ? ` · ${w.src}` : ""}
                  </span>
                  {w.note && <span className="mt-0.5 w-full truncate text-[0.8125rem] text-mut">{w.note}</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <WindSheet
        open={open}
        onClose={() => setOpen(false)}
        day={day}
        last={list[list.length - 1]}
        onSave={(w) => {
          setOpen(false);
          onChange((l) => ({ wind: [...l.wind, w] }), () => addWind(orgId, race.id, w));
        }}
      />
      <Bar>
        <button type="button" onClick={() => setOpen(true)} data-press className="btn btn-primary h-14 w-full">
          Rüzgar yaz
        </button>
      </Bar>
    </>
  );
}

// Rüzgâr kaydı: nereden esiyor (8 yön), knot, saat (şimdi), sağanak, akıntı (hız + nereye) ve not (isteğe bağlı)
const GRID = ["KB", "K", "KD", "B", "", "D", "GB", "G", "GD"];
export function WindSheet({ open, onClose, day, last, onSave }) {
  return (
    <Sheet open={open} onClose={onClose} title="Rüzgâr ve akıntı">
      {open && <WindForm day={day} last={last} onSave={onSave} />}
    </Sheet>
  );
}
function WindForm({ day, last, onSave }) {
  const now = new Date().toISOString();
  const [dir, setDir] = useState(last?.dir ?? null);
  const [kn, setKn] = useState(last?.kn ?? 10);
  const [gust, setGust] = useState(0);
  const [time, setTime] = useState(dayOf(now) === day ? hm(now) : "12:00");
  const [ckn, setCkn] = useState(0);
  const [cdir, setCdir] = useState(null);
  const [note, setNote] = useState("");
  const deg = Object.fromEntries(DIRS);
  const step = "grid size-12 place-items-center rounded-full bg-bg text-[1.5rem] text-fg2 active:scale-95";
  return (
    <div className="pb-2">
      <p className="mb-2 text-[0.875rem] font-semibold text-fg2">Nereden esiyor</p>
      <div className="mx-auto grid w-[13.5rem] grid-cols-3 gap-2">
        {GRID.map((d, i) =>
          d ? (
            <button key={d} type="button" onClick={() => setDir(deg[d])} aria-pressed={dir === deg[d]} className={`h-14 rounded-2xl text-[1rem] font-semibold active:scale-95 ${dir === deg[d] ? "bg-acc text-white" : "bg-bg text-fg2"}`}>
              {d}
            </button>
          ) : (
            <span key={i} className="grid place-items-center text-[0.75rem] text-mut">{last ? `son ${dirShort(last.dir)}` : ""}</span>
          ),
        )}
      </div>
      <p className="mb-2 mt-5 text-[0.875rem] font-semibold text-fg2">Şiddet</p>
      <div className="flex items-center justify-center gap-5">
        <button type="button" aria-label="Azalt" onClick={() => setKn((v) => Math.max(0, v - 1))} className={step}>−</button>
        <b className="min-w-[6.5rem] text-center text-[2.75rem] font-semibold tabular-nums">
          {kn}
          <small className="ml-1 text-[1.0625rem] font-medium text-mut">kn</small>
        </b>
        <button type="button" aria-label="Artır" onClick={() => setKn((v) => Math.min(60, v + 1))} className={step}>+</button>
      </div>
      <div className="mt-5 divide-y divide-line border-y border-line">
        <label className="flex items-center justify-between py-3 text-[0.9375rem]">
          <span className="text-mut">Saat</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="bg-transparent text-right font-semibold tabular-nums outline-none" />
        </label>
        <div className="flex items-center justify-between py-2 text-[0.9375rem]">
          <span className="text-mut">Sağanak</span>
          <span className="flex items-center gap-3">
            <button type="button" aria-label="Sağanak azalt" onClick={() => setGust((v) => (v <= kn + 1 ? 0 : v - 1))} data-press className="btn btn-round btn-sm">−</button>
            <b className="w-14 text-center font-semibold tabular-nums">{gust ? `${gust} kn` : "yok"}</b>
            <button type="button" aria-label="Sağanak artır" onClick={() => setGust((v) => Math.min(80, Math.max(v + 1, kn + 2)))} data-press className="btn btn-round btn-sm">+</button>
          </span>
        </div>
        <div className="flex items-center justify-between py-2 text-[0.9375rem]">
          <span className="text-mut">Akıntı</span>
          <span className="flex items-center gap-3">
            <button type="button" aria-label="Akıntı azalt" onClick={() => setCkn((v) => Math.max(0, Math.round((v - 0.5) * 10) / 10))} data-press className="btn btn-round btn-sm">−</button>
            <b className="w-14 text-center font-semibold tabular-nums">{ckn ? `${ckn} kn` : "yok"}</b>
            <button type="button" aria-label="Akıntı artır" onClick={() => setCkn((v) => Math.min(10, v + 0.5))} data-press className="btn btn-round btn-sm">+</button>
          </span>
        </div>
        {ckn > 0 && (
          <div className="py-3">
            <p className="mb-2 text-[0.9375rem] text-mut">Akıntı nereye</p>
            <div className="grid grid-cols-8 gap-1">
              {DIRS.map(([d, v]) => (
                <button key={d} type="button" onClick={() => setCdir(cdir === v ? null : v)} aria-pressed={cdir === v} className={`h-10 rounded-xl text-[0.8125rem] font-semibold active:scale-95 ${cdir === v ? "bg-acc text-white" : "bg-bg text-fg2"}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="flex items-center gap-3 py-3 text-[0.9375rem]">
          <span className="text-mut">Not</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className="min-w-0 flex-1 bg-transparent text-right outline-none" />
        </label>
      </div>
      <button
        type="button"
        disabled={dir === null}
        onClick={() => onSave({ at: atOf(day, time), dir, kn, gust: gust || null, src: "elle", ckn: ckn || null, cdir: ckn ? cdir : null, note: note.trim() })}
        data-press className="btn btn-primary mt-5 h-14 w-full"
      >
        Kaydet
      </button>
    </div>
  );
}
