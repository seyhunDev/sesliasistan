"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRainRadar } from "./useRainRadar";
import { NowRain } from "./NowRain";
import { radarNow, radarRows } from "./rainLine";
import { HourTable } from "./HourTable";
import { DayCell, HavaPanel } from "./WxPanel";
import { nextDay } from "./hourCols";
import { dayHours, loadWeatherAt } from "./weather";
import { todayStr } from "@/lib/utils/format";

// Belli bir yerin havası, ana sayfa / hava sayfasıyla aynı tasarım (Seyhun 2026-11-20 Bilgi › Yönet › Hava: "ana sayfadaki hava durum tasarımını
// kullanalım ve yarışın yapıldığı yerdeki hava durumunu göstermeliyiz"): üstte Hava kutusu (HavaPanel), altında günler (önceki 5 gün, bugün seçili,
// 6 gün ileri; DayCell), en altta saat saat tablo (HourTable). at: { name, lat, lon }.
const shift = (date, k) => {
  const d = new Date(`${date}T12:00`);
  d.setDate(d.getDate() + k);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function PlaceWx({ at }) {
  const today = todayStr();
  const [sel, setSel] = useState(today);
  const [got, setGot] = useState({ key: "", w: null, err: false });
  const key = at ? `${(+at.lat).toFixed(3)},${(+at.lon).toFixed(3)}` : "";
  const refresh = useCallback(
    (force) => {
      if (!at) return;
      loadWeatherAt(at, !!force).then(
        (w) => setGot({ key, w, err: false }),
        () => setGot((g) => ({ ...g, key, err: true })),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  useEffect(() => refresh(false), [refresh]);
  const w = got.key === key ? got.w : null;
  const err = got.key === key && got.err;
  const radar = useRainRadar(at);
  const days = Array.from({ length: 12 }, (_, i) => shift(today, i - 5)).filter((d) => dayHours(w, d)?.length);
  const isToday = sel === today;
  const fcRows = dayHours(w, sel) || [];
  const rows = isToday ? radarRows(fcRows, radar) : fcRows;
  const ww = isToday && w ? { ...w, now: radarNow(w.now, radar) || w.now } : w;
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  // Günler açılışta bugünden başlar (geçmiş günler solda, kaydırınca)
  const strip = useRef(null);
  useEffect(() => {
    const el = strip.current?.querySelector("[aria-pressed=true]");
    if (el) strip.current.scrollLeft = el.offsetLeft - strip.current.firstElementChild.offsetLeft;
  }, [days.length]);
  const dname = isToday ? "Bugün" : new Date(`${sel}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric" });
  return (
    <div className="navy -mx-2 grid gap-2 rounded-[1.5rem] p-0 sm:mx-0 sm:gap-3 sm:p-3">
      <HavaPanel w={ww} err={err} refresh={refresh} date={sel} today={today} rows={rows} nowH={nowH} title="Şimdi" onOpen={() => refresh(true)} radar={radar} at={at} />
      {days.length > 0 && (
        <div ref={strip} className="iph-wk iph-wk-x" aria-label="Günler">
          {days.map((d) => (
            <DayCell key={d} date={d} today={today} w={w} on={d === sel} nowH={d === today ? nowH : null} onSel={() => setSel(d)} at={at} />
          ))}
        </div>
      )}
      {rows.length > 0 && (
        <section className="iph-pn" aria-label="Saat saat">
          <span className="iph-pt">Saat saat · {dname}</span>
          <HourTable key={sel} rows={rows} next={dayHours(w, nextDay(sel))} date={sel} flat />
          {isToday && <NowRain place={at} rows={fcRows} radar={radar} />}
        </section>
      )}
    </div>
  );
}
