"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Label, card } from "@/components/ui/Page";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { todayStr } from "@/lib/utils/format";
import { sky, windLevel, windName } from "@/features/weather/weather";
import { Col, WindArrow } from "@/features/weather/parts";
import { cleanWeather, forecastFrom, lastForecastDay, loadRaceWeather, raceDays } from "./raceWeather";

const dayName = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
const shortDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
function ago(iso, now) {
  const m = Math.round((now - new Date(iso)) / 60000);
  if (m < 2) return "az önce alındı";
  if (m < 60) return `${m} dk önce alındı`;
  if (m < 48 * 60) return `${Math.round(m / 60)} saat önce alındı`;
  return `${Math.round(m / 1440)} gün önce alındı`;
}
const STALE = 6 * 3600e3;

// Yarış › Çevre › Yarış havası: yarış günlerinin rüzgâr tahmini (kaydedilir, "Güncelle" ile yenilenir)
export function RaceWeather({ r, onChange }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now()); // "… önce alındı" için; tahmin alınınca tazelenir
  const w = cleanWeather(r.weather);
  const today = todayStr();
  const days = raceDays(r);
  const over = days.length > 0 && days[days.length - 1] < today;
  const last = lastForecastDay(today);
  const byDate = new Map((w?.days || []).map((x) => [x.date, x]));
  const stale = w?.at && !over && now - new Date(w.at) > STALE;

  const load = async () => {
    setBusy(true);
    try {
      const n = await loadRaceWeather(r, today);
      // Geçen yarış günlerinin son tahmini kalır (yarış sürerken)
      const kept = (w?.days || []).filter((x) => x.date < today && !n.days.some((y) => y.date === x.date));
      onChange({ ...n, days: [...kept, ...n.days].sort((a, b) => a.date.localeCompare(b.date)) });
      setNow(new Date(n.at).getTime());
      toast(n.days.length ? "Hava tahmini alındı" : "Bu günler için tahmin yok");
    } catch (e) {
      toast(e?.message || "Hava tahmini alınamadı");
    }
    setBusy(false);
  };

  if (!days.length) return null;
  return (
    <>
      <Label right={w?.at ? ago(w.at, now) : ""}>YARIŞ HAVASI</Label>
      {!w && days[0] > last && (
        <p className={`${card} px-4 py-3 text-[0.875rem] text-mut`}>
          Tahmin yarıştan en çok 16 gün önce çıkar; <b className="font-semibold text-fg">{shortDay(forecastFrom(days[0]))}</b> sonrasında buradan alabilirsin.
        </p>
      )}
      {w && (
        <div className="space-y-3">
          {days.map((d) => {
            const x = byDate.get(d);
            if (!x)
              return (
                <div key={d} className={`${card} flex items-center justify-between gap-3 px-4 py-3 text-[0.875rem]`}>
                  <b className="font-semibold">{dayName(d)}</b>
                  <span className="text-right text-mut">{d > last ? `Tahmin ${shortDay(forecastFrom(d))} sonrası` : "Tahmin yok"}</span>
                </div>
              );
            const lv = windLevel(x.hi);
            const s = sky(x.code);
            return (
              <div key={d} className={`${card} px-4 py-3`}>
                <div className="flex items-center justify-between gap-3">
                  <b className="text-[0.9375rem] font-semibold">{dayName(d)}</b>
                  <span className="flex shrink-0 items-center gap-1 text-[0.8125rem] text-mut">
                    <Icon name={s.icon} className="size-4" />
                    {x.min !== null && x.max !== null ? `${x.min}–${x.max}°` : s.label}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-bg ${lv.tone}`}>
                    <WindArrow deg={x.dir} className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className={`block text-[1.125rem] font-semibold tabular-nums leading-tight ${lv.tone}`}>
                      {x.lo === x.hi ? x.hi : `${x.lo}–${x.hi}`} kn <span className="text-[0.8125rem] font-semibold">{lv.label}</span>
                    </b>
                    <span className="block truncate text-[0.8125rem] text-mut">{`${windName(x.dir)[0]} (${windName(x.dir)[1]}) · sağanak ${x.gust} kn · gündüz 09–18`}</span>
                  </span>
                </div>
                {x.hours.length > 0 && (
                  <div className="mt-3 grid grid-cols-6 gap-1 border-t border-line pt-2.5">
                    {x.hours.map((h) => (
                      <Col key={h.hh} label={h.hh} icon={sky(h.code, +h.hh >= 7 && +h.hh <= 19).icon} temp={h.t} wind={h.wind} dir={h.dir} />
                    ))}
                  </div>
                )}
                <p className="mt-2 text-[0.8125rem] text-mut">{x.sail.length ? `Yelkene uygun: ${x.sail.join(", ")}` : "Gündüz yelkene uygun aralık yok (7–16 kn)"}</p>
              </div>
            );
          })}
        </div>
      )}
      {!over && days[0] <= last && (
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold active:scale-[.98] disabled:opacity-70 ${w && !stale ? "bg-card text-acc ring-1 ring-line" : "bg-acc text-white"}`}
        >
          {busy ? <Loader size="sm" className={w && !stale ? "text-acc" : "text-white"} label="Tahmin alınıyor" /> : <Icon name="wind" className="size-[1.125rem]" />}
          {w ? "Tahmini güncelle" : "Hava tahminini getir"}
        </button>
      )}
      <p className="mt-2 px-1 text-[0.75rem] text-mut">
        {w ? `${w.place.name} · Open-Meteo. ` : ""}
        {over ? "Yarış geçti; son alınan tahmin duruyor." : "Tahmin tarih yaklaştıkça değişir; yarıştan önceki günlerde güncelle."}
      </p>
    </>
  );
}
