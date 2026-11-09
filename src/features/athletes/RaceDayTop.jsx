"use client";

import { useEffect, useState } from "react";
import { todayStr } from "@/lib/utils/format";
import { dayPlan, nextDay, ourPlaces, racePhase } from "@/lib/raceDay";
import { ResultCards } from "./ResultCards";
import { loadLive } from "./raceLiveStore";
import { RaceWxRows } from "./RaceWx";
import { RaceStats } from "./raceUi";

// Yarış günü üstü (Seyhun 2026-10-28, yaris-tasarim/harita "Yarış günü: saate göre değişen sayfa"):
//   A yarışlar sürerken: rüzgâr (RaceWx, şimdiki ölçüm/tahmin) üstte, altında Multimedya · Parkur
//   B bugünün sonucu gelince: bizimkilerin sırası ve dünden farkı (↑2), "Tüm sonuçlar" Multimedya › Sonuçlar; rüzgâr altta
//   C gün bitince (son yarış bitip 90 dk ya da 18:00): sonuç kısa, sonra yarın (talimat programından ilk start, toplanma; havası yarına açılır);
//     son günün akşamı yarın yerine dönüş.
// Evre raceDay.js racePhase: sayaçtaki yarışlar (raceLive starts) dakikada bir bakılır, belge iki dakikada bir okunur.
const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const dm = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });

export function useRacePhase(r, orgId, rid, on) {
  const [now, setNow] = useState(() => new Date());
  const [starts, setStarts] = useState([]);
  useEffect(() => {
    if (!on || !rid) return;
    let live = true;
    let n = 0;
    const read = () => loadLive(orgId, rid).then((l) => live && setStarts(l.starts), () => {});
    read();
    const t = setInterval(() => {
      setNow(new Date());
      if (++n % 2 === 0) read();
    }, 60e3);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [on, orgId, rid]);
  const today = todayStr();
  const mine = starts.filter((x) => x.day === today && !x.void);
  return { phase: racePhase({ r, today, now, starts }), races: mine };
}


// Yarış günü üstü (sade, Seyhun 2026-11-08 "hava durumunu, kaç yarış yapıldığını birkaç yerde gösteriyoruz… tekrar olmasın"; örnek
// yaris-tasarim/sade/takip-*.png): Canlı ekran · Yayın (go), altında tek kartta "Şimdi" (2 yarış bitti · 3. start 12:30 / Sonuçlar geldi /
// Gün bitti) ve Hava, Harita. Bizimkilerin sırası yalnız Takip sekmesi yoksa burada (track: sitesi bağlı yarışta sonuçlar Takip'te, tek yer);
// gün bitince yarın ya da dönüş satırı.
export function RaceDayTop({ r, rid, chosen, phase, races, dayAll, go = null, track = false }) {
  const today = todayStr();
  const places = track ? [] : ourPlaces(r.results, chosen);
  const fleet = r.results?.fleet;
  const last = today >= (r.endDate || r.startDate);
  const tom = nextDay(today);
  const fin = races.filter((x) => x.fin).length;
  const cur = races.at(-1);
  // Üst kart (Seyhun 2026-11-09 sade öneri): Bitti · Sıradaki start · (gün bitince) durum; hava ayrı satırda (RaceWxRows)
  const next = cur && fin < races.length ? cur : null;
  const resN = Math.max(0, ...Object.values(r.results?.rows || {}).map((x) => x?.r?.length || 0));
  const lead = (
    <RaceStats
      className="mb-2.5"
      items={[
        // sayaçta start yoksa sonuç belgesindeki yarış sayısı
        ["Bitti", races.length ? fin || (next ? 0 : races.length) : resN || "", "yarış"],
        next ? ["Sıradaki", hm(next.at), `${next.n}. start`] : phase === "done" ? ["Durum", dayAll > 1 && !last ? "Gün bitti" : "Bitti", ""] : phase === "results" ? ["Sonuçlar", "Geldi", ""] : ["Sıradaki", "–", "start"],
        fleet ? ["Tekne", fleet, ""] : null,
      ]}
    />
  );
  return (
    <div className="rz-dtop mt-4">
      {/* Canlı ekran · Yayın (yalnız ana hesap; raceUi RaceGo, Seyhun 2026-11-06) */}
      {go}
      <div className="mt-3">
        <RaceWxRows key={phase} r={{ ...r, id: rid }} day={phase === "done" && !last ? tom : ""} lead={lead} />
      </div>
      {places.length > 0 && <ResultCards className="mt-6" list={phase === "done" ? places.slice(0, 4) : places} short={phase === "done"} />}
      {phase === "done" && !track && <NextRow r={r} />}
    </div>
  );
}

// Gün bitince yarın ya da son gün dönüş, beyaz görünümde tek satır
function NextRow({ r }) {
  const today = todayStr();
  const last = today >= (r.endDate || r.startDate);
  const plan = dayPlan(r, nextDay(today));
  const val = last ? [r.returnDate && dm(r.returnDate), r.returnTime].filter(Boolean).join(" · ") || "Yazılmadı" : plan.start ? `İlk start ${plan.start.time}` : plan.first ? `${plan.first.title} ${plan.first.time}` : dm(nextDay(today));
  return (
    <div className="rz-list">
      <div className="rz-row">
        <span className="rz-k">{last ? "Dönüş" : "Yarın"}</span>
        <span className="rz-v">{val}</span>
      </div>
    </div>
  );
}

// Gün bitince yarın (talimat programından ilk start, toplanma) ya da son gün dönüş (Sonuç sekmesinin üstü de, Seyhun 2026-10-30)
export function NextCard({ r }) {
  const today = todayStr();
  const last = today >= (r.endDate || r.startDate);
  const tom = nextDay(today);
  const plan = dayPlan(r, tom);
  const gap = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5);
  const dayNo = gap(r.startDate, today) + 1;
  const dayAll = gap(r.startDate, r.endDate || r.startDate) + 1;
  return last ? (
    <div className="ck-glass mt-3 rounded-2xl px-4 py-3">
      <small className="block text-[0.8125rem] text-white/65">Dönüş</small>
      <b className="block truncate text-[1.25rem] font-bold">{[r.returnDate && dm(r.returnDate), r.returnTime].filter(Boolean).join(" · ") || "Dönüş saati yazılmadı"}</b>
      {r.departFrom && <small className="block truncate text-[0.8125rem] text-white/65">{r.departFrom}</small>}
    </div>
  ) : (
    <div className="ck-glass mt-3 rounded-2xl px-4 py-3">
      <small className="block text-[0.8125rem] text-white/65">Yarın · {dayNo + 1}. gün{dayNo + 1 === dayAll ? " (son)" : ""}</small>
      <b className="block truncate text-[1.25rem] font-bold">{plan.start ? `İlk start ${plan.start.time}` : plan.first ? `${plan.first.title} ${plan.first.time}` : dm(tom)}</b>
      {plan.first && plan.first !== plan.start && plan.start && <small className="block truncate text-[0.8125rem] text-white/65">{plan.first.title} {plan.first.time}</small>}
    </div>
  );
}
