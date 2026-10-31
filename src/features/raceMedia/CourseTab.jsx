"use client";

import { useEffect, useRef, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { addCourseObs, courseRef, saveCourse } from "@/features/athletes/raceLiveStore";
import { canShare, loadSharedCourse, shareCourse } from "@/features/athletes/sharedRaces";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { BYS, PICKS, cleanCourse, cleanObs, degText, norm, obsTitle, obsValue, windTrend, withLiveWind } from "@/lib/raceCourse";
import { RaceWx } from "@/features/athletes/RaceWx";
import { CompassSight, askCompass } from "./CompassSight";
import { setCourseView } from "./courseView";

// Parkur sekmesi (Seyhun 2026-10-28): üstte rota kartı (lib/courseCard.js, komitenin ekseni yukarıda; harita kaldırıldı).
// Ekleme yalnız "Yön ekle" ve "Pusula" (2026-10-29: "burada" düğmeleri ve söyle/yaz kutusu kaldırıldı, sonra asistanla yapılacak).
// Altta start hattı avantajı, rüzgâr dönüşü ve hız, ölçüm listesi (dokununca sil).
// Saha (Seyhun 2026-10-30 "parkur ve rüzgârı aynı sayfada yapabiliriz", yaris-yapi): üstte seçili günün havası (RaceWx, gün üstteki
// Bugün ▾'dan), sesle yazılan rüzgâr (raceLive.wind) ölçümlerde ve kartta.
const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const BY = Object.fromEntries(BYS);

export function CourseTab({ orgId, race, day, wind = [], onDropWind, onDay }) {
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
  // asistan bu yarışın bu gününe yazar (courseView.js)
  useEffect(() => {
    if (!race?.id || !day) return;
    setCourseView({ id: race.id, day, get: () => latest.current });
    return () => setCourseView(null);
  }, [race?.id, day]);

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
        // bekleyen yazım da gösterilir (Seyhun 2026-10-30 "anlık değişmeli"): asistanın yazdığı ölçüm sunucu onayı gelmeden çizilir;
        // önce atlanıyordu, onay yalnız üst bilgi değişikliği olduğundan hiç gelmiyor, sayfa yenilenene dek görünmüyordu
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
  const all = withLiveWind(c, wind, day);
  const trend = windTrend(all);
  // Rota kartı (Seyhun 2026-10-28 "A · Rüzgâr yukarıda"; harita kaldırıldı: "Kart gayet iyi, kart üstüne çalışalım")
  const kart = kartOf(all);

  return (
    <>
      {/* Lacivert sayfa (Seyhun 2026-10-29 "arka plan uygulamayla uyumlu, rota kartı ön planda, yazılar ince ve hizalı"):
          kart kutusuz ve büyük; altında iki ince çerçeveli düğme; Özet ve Ölçümler aynı hizada ince çizgili liste (ad · açıklama · değer) */}
      <RaceWx r={race} pinned={day} onDay={onDay} />
      <div className="-mx-2 mt-4">
        {kart ? (
          <div aria-label="Rota kartı" role="img" dangerouslySetInnerHTML={{ __html: kart }} />
        ) : (
          <p className="px-4 py-16 text-center text-[0.9375rem] text-white/60">Rüzgârı ya da parkur eksenini ekle, kart çizilsin</p>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <button type="button" data-press onClick={() => setAdd({})} className="raised ck-pill font-medium">Yön ekle</button>
        <button type="button" data-press onClick={async () => ((await askCompass()) ? setSight(true) : toast("Pusula izni verilmedi"))} className="raised ck-pill font-medium">Pusula</button>
      </div>
      {trend && (
        <section className="mt-7" aria-label="Özet">
          <h3 className={secHead}>Özet</h3>
          <ul className={list}>
            {Math.abs(trend.deg) >= 3 && <Line name={`Rüzgâr ${trend.deg > 0 ? "sağa" : "sola"} dönüyor`} sub={`${degText(trend.from)} → ${degText(trend.to)}`} value={`${trend.deg > 0 ? "+" : "−"}${Math.abs(trend.deg)}°`} acc />}
            {trend.kn !== null && Math.abs(trend.kn) >= 1 && <Line name={`Rüzgâr ${trend.kn > 0 ? "artıyor" : "düşüyor"}`} sub={`${trend.from.kn} → ${trend.to.kn} kn`} value={`${trend.kn > 0 ? "+" : "−"}${String(Math.abs(trend.kn)).replace(".", ",")} kn`} />}
            {Math.abs(trend.deg) < 3 && (trend.kn === null || Math.abs(trend.kn) < 1) && <Line name="Rüzgâr sabit" />}
          </ul>
        </section>
      )}
      <section className="mt-7" aria-label="Ölçümler">
        <h3 className={secHead}>
          Ölçümler
          {all.obs.length > 0 && <span className="tabular-nums text-white/45">{all.obs.length}</span>}
        </h3>
        <ul className={list}>
          {!all.obs.length && <li className="py-3 text-[0.9375rem] text-white/55">Henüz ölçüm yok</li>}
          {[...all.obs].reverse().map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => setOpen(o)} data-press="row" className="w-full text-left">
                <Line as="span" name={obsTitle(o)} sub={`${BY[o.by]} · ${hm(o.at)}`} value={obsValue(o)} />
              </button>
            </li>
          ))}
        </ul>
      </section>
      <div className="h-8" />

      <AddSheet open={!!add} at={add} c={c} onClose={() => setAdd(null)} onAdd={(o) => (addObs(o), setAdd(null))} />
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? obsTitle(open) : ""}>
        {open && (
          <div className="pb-2">
            <p className="text-[2.25rem] font-bold tabular-nums">{obsValue(open)}</p>
            <p className="text-[0.875rem] text-mut">{BY[open.by]} · {hm(open.at)}</p>
            <Button variant="danger" className="mt-4" onClick={() => (open.live ? onDropWind?.(open.at) : save({ ...latest.current, obs: latest.current.obs.filter((x) => x.id !== open.id) }, "Ölçüm silindi"), setOpen(null))}>Sil</Button>
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
  const [deg2, setDeg2] = useState(null); // rüzgâr aralığının ikinci yönü (Seyhun 2026-10-30 "belli bir aralık seçebilmeliyim")
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
      {kind === "wind" &&
        (deg2 === null ? (
          <button type="button" onClick={() => setDeg2(norm(deg + 10))} className="mt-2 text-[0.875rem] font-semibold text-acc">Aralık ekle</button>
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-baseline gap-2">
              <span className="text-[1rem] text-mut">ile</span>
              <b className="text-[2.25rem] font-bold leading-none tracking-[-.03em] tabular-nums">{deg2}°</b>
              <button type="button" onClick={() => setDeg2(null)} className="ml-1 text-[0.8125rem] font-semibold text-mut">Kaldır</button>
            </span>
            <div className="flex gap-1.5">
              {[-5, -1, 1, 5].map((d) => (
                <button key={d} type="button" onClick={() => setDeg2((v) => norm(v + d))} className={step}>{d > 0 ? `+${d}` : `−${-d}`}</button>
              ))}
            </div>
          </div>
        ))}
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
      <Button className="mt-5 h-14" onClick={() => onAdd({ kind, ref, deg, by, kn: kind === "wind" ? kn : null, ...(kind === "wind" && deg2 !== null ? { range: [deg, deg2] } : {}), ...(at?.lat != null ? { lat: at.lat, lon: at.lon } : {}) })}>Ekle</Button>
    </div>
  );
}

function kartOf(c) {
  try {
    return cardSvg(cardOf(c), { navy: true });
  } catch (e) {
    console.warn("[parkur] kart çizilemedi", e);
    return "";
  }
}

// Lacivert sayfanın ince listesi: solda ad, ortada soluk açıklama, sağda hizalı değer
const secHead = "mb-1 flex items-baseline justify-between px-0.5 text-[0.8125rem] font-normal tracking-[.02em] text-white/55";
const list = "divide-y divide-[rgba(255,255,255,.1)] border-y border-[rgba(255,255,255,.1)] [&>li]:border-[rgba(255,255,255,.1)]";
function Line({ name, sub = "", value = "", acc = false, as: T = "li" }) {
  return (
    <T className="flex items-baseline gap-3 py-3">
      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-normal text-white">
        {name}
        {sub && <span className="text-white/50"> · {sub}</span>}
      </span>
      {value && <span className={`shrink-0 text-[0.9375rem] font-medium tabular-nums ${acc ? "text-[#67e8f9]" : "text-white"}`}>{value}</span>}
    </T>
  );
}
