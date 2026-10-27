"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Row, RowList } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { loadRace } from "@/features/athletes/races";
import { raceDays } from "@/features/athletes/raceWeather";
import { loadLive, saveStarts } from "@/features/athletes/raceLiveStore";
import { handShot } from "@/features/raceMedia/handoff";
import { RecPick } from "@/features/raceMedia/RecPick";
import { useRaceFlow } from "@/features/raceMedia/useRaceFlow";
import { audio, raceFinish, raceStart, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { db } from "@/lib/firebase/clientApp";
import { liveRace } from "@/lib/homeTiles";
import { cleanLive, ownedBy, raceName, upSec, zeroRace } from "@/lib/raceLive";
import { mmss } from "@/lib/raceScore";
import { todayStr } from "@/lib/utils/format";

// Süren yarışın Multimedya kısayolu (Seyhun 2026-10-26, örnek "B · İnce şerit"): yarışın ilk gününden son gününe kadar ana sayfada günlerin altında
// tek satır: canlı nokta + "YARIŞ SÜRÜYOR", yarış adı, sağda Multimedya (yarışın /media sayfası) ve ⋯. ⋯: "Bu yarışta gösterme" (bu cihazda
// o yarış gizlenir, sonraki yarışta yine çıkar) ve "Hiç gösterme" (users.raceLive "off"; Ayarlar › Ana sayfada yarış kısayolu ile geri açılır).
// 2026-10-27 (Seyhun "Evet, böyle yap", örnek yaris-kontrol): şerit büyüdü; büyük sayaç + Başlat/Durdur/Devam/Bitir · Kayıt · Multimedya.
// Sayaç telefonun TEK sayacı (Countdown.jsx), yarışın multimedya sayfası adına çalışır (own = /media yolu): oradaki Süre aynı sayacı ve
// yarışı görür, Bitir/İptal/+30 sn orada da yapılır. Başlat günün sıradaki yarışını açar (useRaceFlow, aynı akış). Kayıt iPhone kamerasını açar
// (RecPick); çekilen dosya yarışın Medya sayfasına geçer (handoff.js) ve yükleme orada (MediaTab) sürer.
const HIDE = "sa-race-live-hide";
const hidden = () => {
  try {
    return localStorage.getItem(HIDE) || "";
  } catch {
    return "";
  }
};

export function RaceLive({ open }) {
  const { profile } = useAuth();
  const [gone, setGone] = useState(hidden);
  const [menu, setMenu] = useState(false);
  const r = profile?.raceLive === "off" ? null : liveRace(open, todayStr());
  if (!r || gone === r.id) return null;
  const hideThis = () => {
    try {
      localStorage.setItem(HIDE, r.id);
    } catch {}
    setMenu(false);
    setGone(r.id);
  };
  const hideAll = () => {
    setMenu(false);
    setGone(r.id);
    if (profile?.uid) updateDoc(doc(db, "users", profile.uid), { raceLive: "off" }).catch(() => {});
  };
  return (
    <div className="mt-3 rounded-[1.125rem] border border-[rgba(103,232,249,.45)] bg-white/[.07] px-3 py-2.5" aria-label="Süren yarış">
      <div className="flex items-center gap-2.5">
        <Link href={`/athletes/races/${r.id}`} className="min-w-0 flex-1 pl-0.5">
          <span className="flex items-center gap-1.5 text-[0.75rem] font-bold tracking-[.04em]">
            <span className="size-2 shrink-0 rounded-full bg-[#f05a5a] shadow-[0_0_0_4px_rgba(240,90,90,.25)]" />
            YARIŞ SÜRÜYOR
          </span>
          <b className="block truncate text-[0.9375rem] font-semibold">{r.title}</b>
        </Link>
        <button type="button" data-press aria-label="Yarış kısayolu seçenekleri" onClick={() => setMenu(true)} className="grid size-[2.125rem] shrink-0 place-items-center rounded-full bg-white/12 text-white">
          <Icon name="more" className="size-5" />
        </button>
      </div>
      <Controls id={r.id} orgId={profile?.orgId} />
      <Sheet open={menu} onClose={() => setMenu(false)} title="Yarış kısayolu" navy>
        <RowList>
          <Row title="Bu yarışta gösterme" sub="Sonraki yarışta yine çıkar" onClick={hideThis} chev={false} />
          <Row title="Hiç gösterme" sub="Ayarlar'dan yeniden açılır" onClick={hideAll} chev={false} />
        </RowList>
      </Sheet>
    </div>
  );
}

const nowMs = () => Date.now();

// Sayaç ve düğmeler. Yarışın kaydı (raceLive) açılışta bir kez okunur; Başlat günün sıradaki yarışını açar.
function Controls({ id, orgId }) {
  const router = useRouter();
  const toast = useToast();
  const own = `/athletes/races/${id}/media`;
  const today = todayStr();
  const [race, setRace] = useState(null);
  const [live, setLive] = useState(() => cleanLive({}));
  useEffect(() => {
    if (!orgId) return;
    let on = true;
    loadRace(orgId, id).then((x) => on && x && setRace(x), () => {});
    loadLive(orgId, id).then((l) => on && setLive(l), () => {});
    return () => {
      on = false;
    };
  }, [orgId, id]);
  const rdays = race ? raceDays(race) : null;
  const change = useCallback(
    (patch, job) => {
      setLive((l) => cleanLive({ ...l, ...(typeof patch === "function" ? patch(l) : patch) }));
      Promise.resolve(job?.()).catch(() => toast("Kaydedilemedi. İnterneti kontrol et."));
    },
    [toast],
  );
  // Sayaç 0 olunca yarışın start saati yazılır (multimedya sayfasındaki gibi; yalnız bu yarışın sayacı)
  const onZero = useCallback(
    (end, t) => {
      if (Date.now() - end > 20 * 60e3 || t?.mode !== "start" || !t.rid || !ownedBy(t.own, own)) return;
      change((l) => {
        const next = zeroRace(l.starts, t.rid, end, l.wind, rdays);
        if (next === l.starts) return {};
        saveStarts(orgId, id, next).catch(() => {});
        return { starts: next };
      });
    },
    [change, orgId, id, own, rdays],
  );
  const { t, now, running, rem, up } = useTimerRun({ onZero });
  const rf = useRaceFlow({ orgId, raceId: id, live, onChange: change, rdays, today });
  const ours = !t.own || ownedBy(t.own, own);
  const paused = !running && t.left != null;
  const cur = t.rid ? live.starts.find((x) => x.id === t.rid) : null;
  const name = cur ? raceName(cur) : rf.flow.label;
  const time = up ? `+${mmss(upSec(t.end, now))}` : mmss(Math.max(0, paused ? t.left : rem));
  const sub = up ? "startan beri" : running ? "starta kalan" : paused ? "durdu" : "start sayacı";
  const start = () => race && raceStart(rf.flow, "start", race.name || "Yarış", own);
  const pause = () => writeTimer({ ...t, end: null, left: Math.max(1, rem) });
  const resume = () => {
    audio();
    const end = nowMs() + (t.left ?? t.dur) * 1000;
    writeTimer({ ...t, end, left: null });
    if (t.rid) rf.flow.onShift(end, t.rid);
  };
  const [label, act] = !ours ? ["Sayaca git", () => router.push(t.own)] : up ? ["Bitir", () => raceFinish(rf.flow, own)] : running ? ["Durdur", pause] : paused ? ["Devam", resume] : ["Başlat", start];
  const btn = "flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-[0.875rem] px-2 text-[0.8125rem] font-bold";
  return (
    <>
      <div className="mt-2 flex items-baseline gap-2 pl-0.5">
        <b className="text-[2.25rem] font-bold leading-none tracking-[-.03em] tabular-nums">{time}</b>
        <span className="min-w-0 truncate text-[0.8125rem] text-white/65">
          {ours ? name : t.where || "Başka sayaç"} · {sub}
        </span>
      </div>
      <div className="mt-2.5 grid grid-cols-[1.3fr_1fr_1fr] gap-2">
        <button type="button" data-press onClick={act} disabled={!race && label === "Başlat"} className={`${btn} ${running && !up ? "bg-white text-[#11203a]" : "bg-[#0ea5c4] text-white"} disabled:opacity-50`}>
          {label}
        </button>
        <RecPick onFile={(f) => (handShot(id, f), router.push(`${own}?tab=media`))} aria-label="Kayıt" className={`${btn} bg-white/12 text-white`}>
          <span className="grid size-3.5 place-items-center rounded-full ring-2 ring-white">
            <span className="size-2 rounded-full bg-[#f05a5a]" />
          </span>
          Kayıt
        </RecPick>
        <Link href={own} data-press className={`${btn} bg-white/12 text-white`}>
          Multimedya
        </Link>
      </div>
    </>
  );
}
