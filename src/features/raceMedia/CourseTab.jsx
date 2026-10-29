"use client";

import { useEffect, useRef, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { Label, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { Bar } from "@/features/training/Countdown";
import { addCourseObs, courseRef, saveCourse } from "@/features/athletes/raceLiveStore";
import { canShare, loadSharedCourse, shareCourse } from "@/features/athletes/sharedRaces";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { BYS, PICKS, cleanCourse, cleanObs, norm, obsTitle, obsValue, windTrend } from "@/lib/raceCourse";
import { CompassSight, askCompass } from "./CompassSight";

// Parkur sekmesi (Seyhun 2026-10-28): üstte rota kartı (lib/courseCard.js, komitenin ekseni yukarıda; harita kaldırıldı).
// Ekleme yalnız "Yön ekle" ve "Pusula" (2026-10-29: "burada" düğmeleri ve söyle/yaz kutusu kaldırıldı, sonra asistanla yapılacak).
// Altta start hattı avantajı, rüzgâr dönüşü ve hız, ölçüm listesi (dokununca sil).
const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const BY = Object.fromEntries(BYS);

export function CourseTab({ orgId, race, day }) {
  const toast = useToast();
  const [c, setC] = useState(() => cleanCourse({}));
  const [here, setHere] = useState(null); // telefonun yeri { lat, lon, acc }
  const [add, setAdd] = useState(null); // elle ekleme penceresi { lat, lon } | {}
  const [sight, setSight] = useState(false);
  const [open, setOpen] = useState(null); // dokunulan ölçüm
  const latest = useRef(c);
  useEffect(() => {
    latest.current = c;
  }, [c]);

  // Ortak yarış (race.shared, Seyhun 2026-10-28): ekleyen kulüp parkuru ortağa da yazar; başka kulüpte kendi kaydı boşsa ortaktaki görünür
  // (ilk eklemede kendi kaydına bütünüyle geçer)
  const sid = race?.shared || "";
  const shareOk = useRef(false);
  const fromShared = useRef(false);
  useEffect(() => {
    shareOk.current = false;
    if (sid) canShare(sid).then((v) => (shareOk.current = v), () => {});
  }, [sid]);
  const share = (next) => shareOk.current && shareCourse(sid, day, next);

  useEffect(() => {
    if (!orgId || !race?.id || !day) return;
    let on = true;
    const off = onSnapshot(
      courseRef(orgId, race.id, day),
      (s) => {
        if (s.metadata.hasPendingWrites) return;
        const own = cleanCourse(s.exists() ? s.data() : {});
        const empty = !own.obs.length && !Object.keys(own.pts).length;
        fromShared.current = false;
        setC(own);
        if (empty && sid)
          loadSharedCourse(sid, day).then((x) => {
            if (!on || !x || (!x.obs.length && !Object.keys(x.pts).length)) return;
            fromShared.current = true;
            setC((p) => (p.obs.length || Object.keys(p.pts).length ? p : x));
          });
      },
      () => {},
    );
    return () => {
      on = false;
      off();
    };
  }, [orgId, race?.id, day, sid]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition((p) => setHere({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }), () => {}, { enableHighAccuracy: true, maximumAge: 5000 });
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const save = (next, undoText) => {
    const before = latest.current;
    setC(next);
    latest.current = next;
    fromShared.current = false;
    saveCourse(orgId, race.id, day, next).catch(() => toast("Kaydedilemedi, interneti kontrol et"));
    share(next);
    if (undoText) toast(undoText, { action: { label: "Geri al", onClick: () => (setC(before), saveCourse(orgId, race.id, day, before).catch(() => {}), share(before)) } });
  };
  const addObs = (o) => {
    const x = cleanObs({ ...o, at: new Date().toISOString(), ...(o.lat == null && here && o.kind === "wind" && !o.spot && (o.by || "ben") === "ben" ? { lat: here.lat, lon: here.lon } : {}) });
    if (!x) return;
    const next = { ...latest.current, obs: [...latest.current.obs, x] };
    setC(next);
    latest.current = next;
    (fromShared.current ? saveCourse(orgId, race.id, day, next) : addCourseObs(orgId, race.id, day, x)).catch(() => toast("Kaydedilemedi, interneti kontrol et"));
    fromShared.current = false;
    share(next);
    return x;
  };
  const trend = windTrend(c);
  // Rota kartı (Seyhun 2026-10-28 "A · Rüzgâr yukarıda"; harita kaldırıldı: "Kart gayet iyi, kart üstüne çalışalım")
  const kart = kartOf(c);

  return (
    <>
      <div className={`${card} mt-4 px-1 py-1.5`}>
        {kart ? (
          <div aria-label="Rota kartı" role="img" dangerouslySetInnerHTML={{ __html: kart }} />
        ) : (
          <p className="px-4 py-10 text-center text-[0.875rem] text-mut">Rüzgârı ya da parkur eksenini söyle, kart çizilsin</p>
        )}
      </div>
      {trend && (
        <>
          <Label>Özet</Label>
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {Math.abs(trend.deg) >= 3 && (
              <li className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] font-semibold">Rüzgâr {trend.deg > 0 ? "sağa" : "sola"} dönüyor</b>
                  <span className="block truncate text-[0.8125rem] text-mut">{hm(trend.from.at)} {trend.from.deg}° → {hm(trend.to.at)} {trend.to.deg}°</span>
                </span>
                <b className="shrink-0 font-semibold text-acc tabular-nums">{trend.deg > 0 ? "+" : "−"}{Math.abs(trend.deg)}°</b>
              </li>
            )}
            {trend.kn !== null && Math.abs(trend.kn) >= 1 && (
              <li className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] font-semibold">Rüzgâr {trend.kn > 0 ? "artıyor" : "düşüyor"}</b>
                  <span className="block truncate text-[0.8125rem] text-mut">{trend.from.kn} kn → {trend.to.kn} kn</span>
                </span>
                <b className="shrink-0 font-semibold tabular-nums">{trend.kn > 0 ? "+" : "−"}{String(Math.abs(trend.kn)).replace(".", ",")} kn</b>
              </li>
            )}
            {Math.abs(trend.deg) < 3 && (trend.kn === null || Math.abs(trend.kn) < 1) && <li className="px-4 py-3 text-[0.9375rem] font-semibold">Rüzgâr sabit</li>}
          </ul>
        </>
      )}
      <Label right={c.obs.length || ""}>Ölçümler</Label>
      <ul className={`${card} divide-y divide-line overflow-hidden`}>
        {!c.obs.length && <li className="px-4 py-3 text-[0.875rem] text-mut">Henüz ölçüm yok</li>}
        {[...c.obs].reverse().map((o) => (
          <li key={o.id}>
            <button type="button" onClick={() => setOpen(o)} data-press="row" className="flex w-full items-center gap-3 px-4 py-3 text-left">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{obsTitle(o)}</b>
                <span className="block truncate text-[0.8125rem] text-mut">{BY[o.by]} · {hm(o.at)}</span>
              </span>
              <b className="shrink-0 font-semibold tabular-nums">{obsValue(o)}</b>
            </button>
          </li>
        ))}
      </ul>
      <div className="h-36" />

      <Bar>
        {/* altındaki liste şeridin arkasından görünmesin: sayfa renginde zemin, alt sekmelere kadar */}
        <div className="pointer-events-none absolute inset-x-0 -bottom-8 -top-4 -z-10 bg-gradient-to-b from-bg/0 via-bg via-[1.25rem] to-bg" />
        {/* Söyle ya da yaz kutusu kaldırıldı (Seyhun 2026-10-29: "bunu daha sonra asistanla yapacağız") */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => setAdd({})}>Yön ekle</Button>
          <Button variant="secondary" onClick={async () => ((await askCompass()) ? setSight(true) : toast("Pusula izni verilmedi"))}>Pusula</Button>
        </div>
      </Bar>

      <AddSheet open={!!add} at={add} c={c} onClose={() => setAdd(null)} onAdd={(o) => (addObs(o), setAdd(null))} />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? obsTitle(open) : ""}>
        {open && (
          <div className="pb-2">
            <p className="text-[2.25rem] font-bold tabular-nums">{obsValue(open)}</p>
            <p className="text-[0.875rem] text-mut">{BY[open.by]} · {hm(open.at)}</p>
            <Button variant="danger" className="mt-4" onClick={() => (save({ ...latest.current, obs: latest.current.obs.filter((x) => x.id !== open.id) }, "Ölçüm silindi"), setOpen(null))}>Sil</Button>
          </div>
        )}
      </Sheet>
      <CompassSight open={sight} onClose={() => setSight(false)} onAdd={(o) => (addObs(o), setSight(false), toast(`${obsTitle(cleanObs(o))} · ${o.deg}° eklendi`))} />
    </>
  );
}

// Elle ekleme: ne, kim, derece (−5 −1 +1 +5), rüzgârda knot. Haritaya dokunulduysa ölçüm o noktaya konur.
function AddSheet({ open, at, c, onClose, onAdd }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ölçüm ekle">
      {open && <AddBody at={at} c={c} onAdd={onAdd} />}
    </Sheet>
  );
}
function AddBody({ at, c, onAdd }) {
  const [pick, setPick] = useState(0);
  const [by, setBy] = useState("ben");
  const lastOf = (k) => [...c.obs].reverse().find((x) => x.kind === k);
  const [deg, setDeg] = useState(() => lastOf("wind")?.deg ?? 0);
  const [kn, setKn] = useState(() => lastOf("wind")?.kn ?? 8);
  const [kind, ref] = PICKS[pick];
  const chip = (on) => `h-9 rounded-full px-3.5 text-[0.875rem] font-medium active:scale-95 ${on ? "bg-acc text-white" : "bg-bg"}`;
  const step = "grid h-10 w-11 place-items-center rounded-xl border border-line bg-card text-[0.875rem] font-semibold shadow-[0_2px_0_var(--line)] active:translate-y-px active:shadow-none";
  return (
    <div className="pb-2">
      <p className="text-[0.8125rem] font-semibold text-fg2">Ne</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PICKS.map(([, , l], i) => (
          <button key={l} type="button" onClick={() => (setPick(i), setDeg(lastOf(PICKS[i][0])?.deg ?? deg))} className={chip(pick === i)}>{l}</button>
        ))}
      </div>
      <p className="mt-4 text-[0.8125rem] font-semibold text-fg2">Kim ölçtü</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {BYS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => setBy(k)} className={chip(by === k)}>{l}</button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <b className="text-[3rem] font-bold leading-none tracking-[-.03em] tabular-nums">{deg}°</b>
        <div className="flex gap-1.5">
          {[-5, -1, 1, 5].map((d) => (
            <button key={d} type="button" onClick={() => setDeg((v) => norm(v + d))} className={step}>{d > 0 ? `+${d}` : `−${-d}`}</button>
          ))}
        </div>
      </div>
      {kind === "wind" && (
        <div className="mt-3 flex items-center justify-between">
          <b className="text-[1.5rem] font-semibold tabular-nums">{kn} kn</b>
          <div className="flex gap-1.5">
            {[-1, 1].map((d) => (
              <button key={d} type="button" onClick={() => setKn((v) => Math.max(0, Math.min(60, v + d)))} className={step}>{d > 0 ? "+1" : "−1"}</button>
            ))}
          </div>
        </div>
      )}
      <Button className="mt-5 h-14" onClick={() => onAdd({ kind, ref, deg, by, kn: kind === "wind" ? kn : null, ...(at?.lat != null ? { lat: at.lat, lon: at.lon } : {}) })}>Ekle</Button>
    </div>
  );
}

function kartOf(c) {
  try {
    return cardSvg(cardOf(c));
  } catch (e) {
    console.warn("[parkur] kart çizilemedi", e);
    return "";
  }
}
