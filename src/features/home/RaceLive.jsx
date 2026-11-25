"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { loadAthletes } from "@/features/athletes/data";
import { loadRace } from "@/features/athletes/races";
import { raceDays } from "@/features/athletes/raceWeather";
import { loadLive, saveStarts } from "@/features/athletes/raceLiveStore";
import { useTimerRun } from "@/features/training/Countdown";
import { liveRace } from "@/lib/homeTiles";
import { raceLine, racePhase } from "@/lib/raceDay";
import { cleanLive, ownedBy, upSec, zeroRace } from "@/lib/raceLive";
import { mmss } from "@/lib/raceScore";
import { todayStr } from "@/lib/utils/format";

// Süren yarış ana sayfada TEK SATIR (Seyhun 2026-10-30: "ana sayfadan süreyi kaldıralım, sadece tıklama olsun, tıklanınca yarış sayfasına
// gidesin"; yapı haritası yaris-yapi): canlı nokta, yarış adı, altında günün evresine göre kısa durum (raceDay.js raceLine: ilk start, sayaç,
// "2. yarış sürüyor", bizimkilerin sırası, yarın ilk start, dönüş). Dokununca yarışın sayfası. Sayaç, Kayıt ve süre seçimi yarış sayfasında.
// Ayarlar › Ana sayfada yarış kısayolu kapatırsa (users.raceLive "off") görünmez; Kulüp listesindeki yarış satırı o zaman yine çıkar.
// Günün yarışları bitince (18:00 ya da son yarıştan 90 dk sonra, raceDay.js racePhase "done") satır kalkar, yerine en yakın plan
// (Sıradaki kartı) görünür (Seyhun 2026-10-31: "akşam 8:30 ve hala bu duruyor"); bu yarışın sayacı çalışıyorsa ya da yarış bugün açıldıysa
// (deneme yarışı) kalır. Ertesi yarış günü yine çıkar.
// Görünmeyen iş: sayaç 0 olunca yarışın start saati yine yazılır (telefon ana sayfadayken de; yalnız bu yarışın sayacı).
export function RaceLive({ open }) {
  const { profile } = useAuth();
  const r = profile?.raceLive === "off" ? null : liveRace(open, todayStr());
  if (!r) return null;
  return <Line id={r.id} orgId={profile?.orgId} title={r.title} />;
}

// Kart açılışta son bilinen satırla hemen çizilir (Seyhun 2026-11-11 "her defasında yenileniyor, yer bir anda yükseliyor alçalıyor"): son durum yarış ve gün için
// cihazda saklanır (sa-rl:<yarış>); veri gelince satır değiştiyse kısa bir kayma animasyonu ve küçük "Güncellendi" işareti. Satır yeri hep ayrılır, kart zıplamaz.
const rlKey = (id) => `sa-rl:${id}`;
function readRl(id, today) {
  try {
    const c = JSON.parse(localStorage.getItem(rlKey(id)) || "null");
    return c && c.d === today ? c : null;
  } catch {
    return null;
  }
}

function Line({ id, orgId, title }) {
  const own = `/athletes/races/${id}/yayin`; // sayaç yayın sayfasının (multimedya kalktı, 2026-11-01)
  const [race, setRace] = useState(null);
  const [live, setLive] = useState(() => cleanLive({}));
  const [kids, setKids] = useState([]);
  const [clock, setClock] = useState(() => new Date());
  const [cache] = useState(() => readRl(id, todayStr()));
  const [first] = useState(cache?.base ?? null);
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
  const today = todayStr();
  // Bugün açılan yarış (deneme yarışı) akşam da kalır; denemeler multimedyaya buradan girer (Seyhun 2026-11-01)
  const made = race?.createdAt?.toDate?.() || (race?.createdAt?.seconds ? new Date(race.createdAt.seconds * 1000) : null);
  const fresh = !!made && made.toLocaleDateString("sv-SE") === today;
  const over = racePhase({ r: race || { startDate: today }, today, now: clock, starts: live.starts }) === "done" && !(ours && (running || up)) && !fresh;
  const base = race ? raceLine({ r: race, today, now: clock, starts: live.starts, athletes: kids, timer: "" }) : null;
  useEffect(() => {
    if (!race) return;
    try {
      localStorage.setItem(rlKey(id), JSON.stringify({ d: today, base, over }));
    } catch {}
  }, [race, id, today, base, over]);
  if (race ? over : cache?.over) return null;
  const sub = race ? raceLine({ r: race, today, now: clock, starts: live.starts, athletes: kids, timer }) : timer || cache?.base || "";
  const upd = race && first != null && base !== first;
  return (
    <Link href={`/athletes/races/${id}`} data-press aria-label="Süren yarış" className="mt-3 grid gap-0.5 rounded-[1.125rem] bg-[#0b1a33] px-3.5 py-3 text-white">
      <span className="flex items-center gap-2 text-[0.75rem] font-bold tracking-[.04em] text-[#ff8f8f]">
        <i className="size-2 rounded-full bg-[#ff5252] shadow-[0_0_0_4px_rgba(255,82,82,.25)]" />
        SÜREN YARIŞ
        <span className="ml-auto rounded-full bg-white/15 px-2.5 py-0.5 text-[0.75rem] font-semibold tracking-normal text-white">Aç ›</span>
      </span>
      <b className="block truncate text-[1.0625rem] font-semibold">{title}</b>
      <small key={base ?? "x"} data-race-sub={upd ? "upd" : undefined} className={`flex min-h-[1.25rem] items-center gap-2 truncate text-[0.8125rem] tabular-nums text-white/80 ${upd ? "rl-upd" : ""}`}>
        <span className="min-w-0 truncate">{sub}</span>
        {upd && <em className="rl-chip shrink-0 rounded-full bg-white/15 px-1.5 text-[0.6875rem] not-italic text-white/90">Güncellendi</em>}
      </small>
    </Link>
  );
}
