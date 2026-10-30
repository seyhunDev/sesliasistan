"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { loadAthletes } from "@/features/athletes/data";
import { loadRace } from "@/features/athletes/races";
import { raceDays } from "@/features/athletes/raceWeather";
import { loadLive, saveStarts } from "@/features/athletes/raceLiveStore";
import { useTimerRun } from "@/features/training/Countdown";
import { liveRace } from "@/lib/homeTiles";
import { raceLine } from "@/lib/raceDay";
import { cleanLive, ownedBy, upSec, zeroRace } from "@/lib/raceLive";
import { mmss } from "@/lib/raceScore";
import { todayStr } from "@/lib/utils/format";

// Süren yarış ana sayfada TEK SATIR (Seyhun 2026-10-30: "ana sayfadan süreyi kaldıralım, sadece tıklama olsun, tıklanınca yarış sayfasına
// gidesin"; yapı haritası yaris-yapi): canlı nokta, yarış adı, altında günün evresine göre kısa durum (raceDay.js raceLine: ilk start, sayaç,
// "2. yarış sürüyor", bizimkilerin sırası, yarın ilk start, dönüş). Dokununca yarışın sayfası. Sayaç, Kayıt ve süre seçimi yarış sayfasında.
// Ayarlar › Ana sayfada yarış kısayolu kapatırsa (users.raceLive "off") görünmez; Kulüp listesindeki yarış satırı o zaman yine çıkar.
// Görünmeyen iş: sayaç 0 olunca yarışın start saati yine yazılır (telefon ana sayfadayken de; yalnız bu yarışın sayacı).
export function RaceLive({ open }) {
  const { profile } = useAuth();
  const r = profile?.raceLive === "off" ? null : liveRace(open, todayStr());
  if (!r) return null;
  return <Line id={r.id} orgId={profile?.orgId} title={r.title} />;
}

function Line({ id, orgId, title }) {
  const own = `/athletes/races/${id}/media`;
  const [race, setRace] = useState(null);
  const [live, setLive] = useState(() => cleanLive({}));
  const [kids, setKids] = useState([]);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    if (!orgId) return;
    let on = true;
    let n = 0;
    const read = () => loadLive(orgId, id).then((l) => on && setLive(l), () => {});
    loadRace(orgId, id).then((x) => on && x && setRace(x), () => {});
    read();
    // evre dakikada bir bakılır, sayaç belgesi iki dakikada bir okunur (RaceDayTop gibi)
    const tick = setInterval(() => {
      setClock(new Date());
      if (++n % 2 === 0) read();
    }, 60e3);
    return () => {
      on = false;
      clearInterval(tick);
    };
  }, [orgId, id]);
  const ids = race?.athleteIds?.join() || "";
  useEffect(() => {
    if (!ids) return;
    let on = true;
    const want = new Set(ids.split(","));
    loadAthletes().then(({ athletes }) => on && setKids(athletes.filter((a) => want.has(a.id))), () => {});
    return () => {
      on = false;
    };
  }, [ids]);
  const rdays = race ? raceDays(race) : null;
  const onZero = useCallback(
    (end, t) => {
      if (Date.now() - end > 20 * 60e3 || t?.mode !== "start" || !t.rid || !ownedBy(t.own, own)) return;
      setLive((l) => {
        const next = zeroRace(l.starts, t.rid, end, l.wind, rdays);
        if (next === l.starts) return l;
        saveStarts(orgId, id, next).catch(() => {});
        return cleanLive({ ...l, starts: next });
      });
    },
    [orgId, id, own, rdays],
  );
  const { t, now, running, rem, up } = useTimerRun({ onZero });
  const ours = !!t.own && ownedBy(t.own, own);
  const timer = !ours ? "" : up ? `Startan beri ${mmss(upSec(t.end, now))}` : running ? `Starta ${mmss(Math.max(0, rem))}` : t.left != null ? `Sayaç durdu · ${mmss(t.left)}` : "";
  const sub = race ? raceLine({ r: race, today: todayStr(), now: clock, starts: live.starts, athletes: kids, timer }) : timer;
  return (
    <Link href={`/athletes/races/${id}`} data-press aria-label="Süren yarış" className="mt-3 flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/[.06] px-4 py-3 active:translate-y-px">
      <span className="size-2 shrink-0 rounded-full bg-[#f05a5a] shadow-[0_0_0_4px_rgba(240,90,90,.25)]" />
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-semibold">{title}</b>
        {sub && <small className="block truncate text-[0.8125rem] tabular-nums text-white/70">{sub}</small>}
      </span>
      <Icon name="chev" className="size-4 shrink-0 text-white/50" />
    </Link>
  );
}
