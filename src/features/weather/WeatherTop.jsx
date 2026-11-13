"use client";

import { useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { useRainRadar } from "./useRainRadar";
import { NowRain } from "./NowRain";
import { radarNow, radarRows } from "./rainLine";
import { RegionMap, pointName } from "./RegionMap";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase/clientApp";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { HourTable } from "./HourTable";
import { DayCell, HavaPanel, useObsRows } from "./WxPanel";
import { nextDay } from "./hourCols";
import { todayStr } from "@/lib/utils/format";
import { dayHours, getPlace, placeLabel, setPlace, compareLinks } from "./weather";

// Hava sayfası (Seyhun 2026-11-12 "hava durumu sayfasını da ana sayfa hava durumuna göre yap… gerçekleşen değerleri de göster… birleştir";
// örnek ana-sayfa/sade-2026-11/hava.html): ana sayfayla aynı lacivert (.iph) ve aynı Hava kutusu (HavaPanel: pusula + saat saat rüzgâr,
// geçen saatler istasyon ölçümü beyaz çizgi). Altında 12 gün (önceki 5 gün ölçülen, bugün ve 6 gün ileri; dokununca kutu ve tablo o güne geçer),
// sonra saat saat tablo (HourTable, ölçülen saatler ayrı satırda) ve BÖLGE haritası (RegionMap; geniş ekranda yan yana), MGM / Windy, kaynak satırı.
const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 2 ? "az önce" : m < 60 ? `${m} dk önce` : `${Math.round(m / 60)} sa önce`;
};
const shift = (date, k) => {
  const d = new Date(`${date}T12:00`);
  d.setDate(d.getDate() + k);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function WeatherTop({ w, err, refresh }) {
  const today = todayStr();
  const [sel, setSel] = useState(today);
  const place = getPlace();
  const radar = useRainRadar(place);
  const days = Array.from({ length: 12 }, (_, i) => shift(today, i - 5)).filter((d) => dayHours(w, d)?.length);
  const isToday = sel === today;
  // Radar burada yağış görmüyorsa şu anki yağmur ve son saatlerin yağmuru gösterilmez (rainLine radarNow / radarRows)
  const fcRows = dayHours(w, sel) || [];
  const rows = isToday ? radarRows(fcRows, radar) : fcRows;
  const ww = isToday && w ? { ...w, now: radarNow(w.now, radar) || w.now } : w;
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const ob = useObsRows(sel, today);
  const obToday = useObsRows(today, today);
  const st = ob.station || obToday.station;
  const { profile } = useAuth();
  const toast = useToast();
  // Günler açılışta bugünden başlar (geçmiş 5 gün solda, kaydırınca)
  const strip = useRef(null);
  useEffect(() => {
    const el = strip.current?.querySelector("[aria-pressed=true]");
    if (el) strip.current.scrollLeft = el.offsetLeft - strip.current.firstElementChild.offsetLeft;
  }, [days.length]);
  // Haritada dokunulan nokta seçilen yer olur (Ayarlar › Hava konumu gibi profile de yazılır); "Geri al" eski yeri geri koyar
  const save = (p) => {
    const saved = setPlace(p);
    if (profile?.uid) updateDoc(doc(db, "users", profile.uid), { weatherPlace: saved }).catch(() => {});
    return saved;
  };
  const movePoint = async (at) => {
    const prev = getPlace();
    const got = await pointName(at);
    const saved = save({ ...got, ...at });
    toast(`Nokta taşındı · ${saved.name}`, { duration: 8000, action: { label: "Geri al", onClick: () => save(prev) } });
  };
  const links = compareLinks(place);
  const dname = isToday ? "Bugün" : new Date(`${sel}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric" });
  return (
    <main className="iph iph-page navy" aria-label="Hava durumu">
      <header className="iph-hd">
        <BackButton href="/" />
        <h1 className="iph-date">
          <b>Hava</b>
          <small className="truncate">{placeLabel(place)}</small>
        </h1>
        <button type="button" onClick={() => refresh(true)} aria-label="Yenile" data-press className="iph-me">
          <Icon name="load" className="size-4" />
        </button>
      </header>
      <HavaPanel w={ww} err={err} refresh={refresh} date={sel} today={today} rows={rows} nowH={nowH} title="Şimdi" onOpen={() => refresh(true)} radar={radar} />
      <div ref={strip} className="iph-wk iph-wk-x" aria-label="Günler">
        {days.map((d) => (
          <DayCell key={d} date={d} today={today} w={w} on={d === sel} nowH={d === today ? nowH : null} onSel={() => setSel(d)} />
        ))}
      </div>
      <div className="iph-wxg">
        <section className="iph-pn" aria-label="Saat saat">
          <span className="iph-pt">Saat saat · {dname}</span>
          {rows.length > 0 && <HourTable key={sel} rows={rows} next={dayHours(w, nextDay(sel))} date={sel} flat />}
          {isToday && <NowRain place={place} rows={fcRows} radar={radar} />}
        </section>
        <section className="iph-pn" aria-label="Bölge">
          <span className="iph-pt">
            Bölge<span className="flex-1" />
            {st?.lat != null && <em className="truncate">{st.name} istasyonu · {String(st.km).replace(".", ",")} km</em>}
          </span>
          <RegionMap place={place} day={sel} station={st} obs={obToday.rows} onPick={movePoint} inline />
        </section>
      </div>
      <div className="flex gap-2">
        <a href={links.mgm} target="_blank" rel="noopener noreferrer" data-press className="iph-mini h-11 flex-1 text-[0.875rem]">MGM</a>
        <a href={links.windy} target="_blank" rel="noopener noreferrer" data-press className="iph-mini h-11 flex-1 text-[0.875rem]">Windy</a>
      </div>
      <p className="px-1 text-[0.75rem] leading-snug text-mut">
        Kaynak: Open-Meteo · {ago(w.at)}
        {st?.near ? ` · Ölçüm: ${st.name} istasyonu, ${String(st.km).replace(".", ",")} km` : ""}
        {radar ? ` · Radar: ${radar.src || "RainViewer"}` : ""}
      </p>
    </main>
  );
}
