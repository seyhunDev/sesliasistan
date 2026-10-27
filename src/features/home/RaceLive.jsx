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
import { VoidSheet, useRaceFlow } from "@/features/raceMedia/useRaceFlow";
import { audio, raceCancel, raceFinish, raceStart, useTimerRun, writeTimer } from "@/features/training/Countdown";
import { db } from "@/lib/firebase/clientApp";
import { liveRace } from "@/lib/homeTiles";
import { cleanLive, ownedBy, raceName, seqState, seqSteps, upSec, zeroRace } from "@/lib/raceLive";
import { mmss } from "@/lib/raceScore";
import { todayStr } from "@/lib/utils/format";

// Süren yarışın Multimedya kısayolu (Seyhun 2026-10-26, örnek "B · İnce şerit"): yarışın ilk gününden son gününe kadar ana sayfada günlerin altında
// tek satır: canlı nokta + "YARIŞ SÜRÜYOR", yarış adı, sağda Multimedya (yarışın /media sayfası) ve ⋯. ⋯: "Bu yarışta gösterme" (bu cihazda
// o yarış gizlenir, sonraki yarışta yine çıkar) ve "Hiç gösterme" (users.raceLive "off"; Ayarlar › Ana sayfada yarış kısayolu ile geri açılır).
// 2026-10-27 (Seyhun "Evet, böyle yap", örnek yaris-kontrol): şerit büyüdü; büyük sayaç + Başlat/Durdur/Devam/Bitir · Kayıt · Multimedya.
// 2026-10-27 (Seyhun "A · Büyük rakam"): "YARIŞ SÜRÜYOR" kalktı; üstte ince satır (canlı nokta, yarış · kaçıncı yarış, Multimedya, ⋯), ortada
// dev süre ve durumu, beklerken süre çipleri 1 · 2 · 5 · 10 dk, sayarken start dizisi çubuğu ve −1 dk · Eşitle · +1 dk; altta Sıfırla · ana düğme · Kayıt.
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
    <div className="mt-3 rounded-[1.25rem] border border-white/10 bg-white/[.06] px-3.5 pb-3.5 pt-3" aria-label="Süren yarış">
      <Controls id={r.id} orgId={profile?.orgId} title={r.title} onMenu={() => setMenu(true)} />
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
const PRESETS = [60, 120, 300, 600];

// Sayaç ve düğmeler. Yarışın kaydı (raceLive) açılışta bir kez okunur; Başlat günün sıradaki yarışını açar.
function Controls({ id, orgId, title, onMenu }) {
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
  const idle = !running && t.left == null;
  const cur = t.rid ? live.starts.find((x) => x.id === t.rid) : null;
  const name = ours ? (cur ? raceName(cur) : rf.flow.label) : t.where || "Başka sayaç";
  const left = Math.max(0, paused ? t.left : rem);
  const time = up ? `+${mmss(upSec(t.end, now))}` : mmss(left);
  const total = Math.max(t.dur, left);
  const steps = seqSteps(running || paused ? total : t.dur);
  const seq = seqState(steps, left, running && !up);
  const step = steps[seq.indexOf("now")]?.name;
  const head = up ? "Startan beri" : running ? `Starta kalan${step ? ` · ${step}` : ""}` : paused ? "Durdu" : "Start sayacı";
  const hot = running && !up && rem <= 10;
  const start = () => race && raceStart(rf.flow, "start", race.name || "Yarış", own);
  const pause = () => writeTimer({ ...t, end: null, left: Math.max(1, rem) });
  const resume = () => {
    audio();
    const end = nowMs() + (t.left ?? t.dur) * 1000;
    writeTimer({ ...t, end, left: null });
    if (t.rid) rf.flow.onShift(end, t.rid);
  };
  const shift = (end) => (writeTimer({ ...t, end }), t.rid && rf.flow.onShift(end, t.rid));
  const even = () => shift(nowMs() + Math.round(rem / 60) * 60000);
  const choose = (s) => writeTimer({ dur: s, end: null, left: null, zero: t.zero, own: "", where: "" });
  const [label, act] = !ours ? ["Sayaca git", () => router.push(t.own)] : up ? ["Bitir", () => raceFinish(rf.flow, own)] : running ? ["Durdur", pause] : paused ? ["Devam", resume] : ["Başlat", start];
  const btn = "flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-[0.875rem] px-2 text-[0.9375rem] font-bold shadow-[0_2px_0_rgba(0,0,0,.35)] active:translate-y-px active:shadow-none";
  const chip = "flex h-9 min-w-0 flex-1 items-center justify-center rounded-full text-[0.8125rem] font-semibold tabular-nums active:translate-y-px";
  return (
    <>
      <div className="flex items-center gap-2">
        <Link href={`/athletes/races/${id}`} className="flex min-w-0 flex-1 items-center gap-2 text-[0.875rem] font-semibold">
          <span className="size-2 shrink-0 rounded-full bg-[#f05a5a] shadow-[0_0_0_4px_rgba(240,90,90,.25)]" />
          <span className="truncate">
            {title}
            {name && <span className="font-normal text-white/60"> · {name}</span>}
          </span>
        </Link>
        <Link href={own} data-press className="flex h-8 shrink-0 items-center rounded-full bg-white/12 px-3 text-[0.8125rem] font-semibold">
          Multimedya
        </Link>
        <button type="button" data-press aria-label="Yarış kısayolu seçenekleri" onClick={onMenu} className="grid size-8 shrink-0 place-items-center rounded-full bg-white/12 text-white">
          <Icon name="more" className="size-5" />
        </button>
      </div>
      <div className="mt-3 text-center" onPointerDown={() => running && !up && audio()}>
        <small className="block text-[0.6875rem] font-semibold uppercase tracking-[.08em] text-white/60">{head}</small>
        <b className={`block font-extrabold leading-[1.05] tracking-[-.04em] tabular-nums ${up ? "text-[4rem]" : "text-[4.6rem]"} ${hot ? "text-[#f4a49c]" : ""}`}>{time}</b>
      </div>
      {ours && idle && (
        <div className="mt-2 flex gap-1.5" aria-label="Süre seç">
          {PRESETS.map((s) => (
            <button key={s} type="button" aria-pressed={t.dur === s} onClick={() => choose(s)} className={`${chip} ${t.dur === s ? "bg-white text-[#11203a]" : "bg-white/10 text-white/80"}`}>
              {s / 60} dk
            </button>
          ))}
        </div>
      )}
      {(running || paused) && !up && steps.length > 1 && <Seq steps={steps} total={total} left={left} />}
      {ours && running && !up && (
        <div className="mt-3 flex gap-1.5">
          <button type="button" onClick={() => shift(t.end - 60000)} disabled={rem <= 60} className={`${chip} bg-white/10 text-white disabled:opacity-40`}>
            −1 dk
          </button>
          <button type="button" onClick={even} className={`${chip} bg-white/10 text-white`}>
            Eşitle
          </button>
          <button type="button" onClick={() => shift(t.end + 60000)} className={`${chip} bg-white/10 text-white`}>
            +1 dk
          </button>
        </div>
      )}
      <div className="mt-3 grid grid-cols-[1fr_1.6fr_1fr] gap-2">
        <button type="button" data-press onClick={() => raceCancel(rf.flow, own)} disabled={!ours || !paused} className={`${btn} bg-white/12 text-white disabled:opacity-40`}>
          Sıfırla
        </button>
        <button type="button" data-press onClick={act} disabled={!race && label === "Başlat"} className={`${btn} ${running && !up ? "bg-white text-[#11203a]" : "bg-[#0ea5c4] text-white"} disabled:opacity-50`}>
          {label}
        </button>
        <RecPick onFile={(f) => (handShot(id, f), router.push(`${own}?tab=media`))} aria-label="Kayıt" className={`${btn} bg-white/12 text-white`}>
          <span className="grid size-3.5 place-items-center rounded-full ring-2 ring-white">
            <span className="size-2 rounded-full bg-[#f05a5a]" />
          </span>
          Kayıt
        </RecPick>
      </div>
      <VoidSheet ask={rf.ask} onChoose={rf.choose} />
    </>
  );
}

// Start dizisi çubuğu: dolu kısım geçen süre, işaretler 5 · 4 Hazırlık · 1 Son dk · Start
function Seq({ steps, total, left }) {
  const at = (m) => `${Math.min(100, Math.max(0, ((total - m * 60) / total) * 100))}%`;
  return (
    <div className="mx-1 mt-3 pb-4" aria-label="Start dizisi">
      <div className="relative h-1.5 rounded-full bg-white/12">
        <div className="absolute inset-y-0 left-0 rounded-full bg-[#0ea5c4]" style={{ width: at(left / 60) }} />
        {steps.map((x) => (
          <span key={x.m} className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#11203a] bg-white" style={{ left: at(x.m) }}>
            <small className={`absolute top-3 whitespace-nowrap text-[0.625rem] font-semibold text-white/65 ${x.m === steps[0].m ? "left-0" : x.m === 0 ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
              {x.m === 0 ? x.name : x.m === steps[0].m ? x.m : `${x.m} ${x.name}`}
            </small>
          </span>
        ))}
      </div>
    </div>
  );
}
