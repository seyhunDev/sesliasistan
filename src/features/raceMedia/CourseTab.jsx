"use client";

import { useEffect, useRef, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { addCourseObs, courseRef, saveCourse } from "@/features/athletes/raceLiveStore";
import { canShare, loadSharedCourse, shareCourse } from "@/features/athletes/sharedRaces";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { BYS, CARD_TYPES, PICKS, cardType, cleanCourse, selCard, cleanObs, degText, norm, obsTitle, obsValue, windTrend, withLiveWind } from "@/lib/raceCourse";
import { RaceWx } from "@/features/athletes/RaceWx";
import { CompassSight, askCompass } from "./CompassSight";
import { angDiff, compassReader } from "@/lib/compass";
import { startCompass } from "@/lib/nativeIos";
import { setCourseView } from "./courseView";

// Parkur sekmesi (Seyhun 2026-10-28): üstte rota kartı (lib/courseCard.js, komitenin ekseni yukarıda; harita kaldırıldı).
// Ekleme yalnız "Yön ekle" ve "Pusula" (2026-10-29: "burada" düğmeleri ve söyle/yaz kutusu kaldırıldı, sonra asistanla yapılacak).
// Altta start hattı avantajı, rüzgâr dönüşü ve hız, ölçüm listesi (dokununca sil).
// Saha (Seyhun 2026-10-30 "parkur ve rüzgârı aynı sayfada yapabiliriz", yaris-yapi): üstte seçili günün havası (RaceWx, gün üstteki
// Bugün ▾'dan), sesle yazılan rüzgâr (raceLive.wind) ölçümlerde ve kartta.
const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const BY = Object.fromEntries(BYS);

// wx: üstte yarışın havası (antrenman ekranında yok, Rüzgâr ayrı düğmede); types: rota kartı türü seçimi (ILCA · Trapez);
// big: "Büyük göster" (antrenmanda çocuklara göstermek için kart tam ekran; Seyhun 2026-11-05)
export function CourseTab({ orgId, race, day, wind = [], onDropWind, onDay, wx = true, types = false, big = false }) {
  const toast = useToast();
  const [c, setC] = useState(() => cleanCourse({}));
  const [here, setHere] = useState(null); // telefonun yeri { lat, lon, acc }
  const [add, setAdd] = useState(null); // elle ekleme penceresi { lat, lon } | {}
  const [sight, setSight] = useState(false);
  const [open, setOpen] = useState(null); // dokunulan ölçüm
  const [full, setFull] = useState(false); // kart tam ekran
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
      {wx && <RaceWx r={race} pinned={day} onDay={onDay} />}
      {types && (
        <div className="mt-1 grid grid-cols-2 gap-2" role="group" aria-label="Parkur türü">
          {Object.entries(CARD_TYPES).map(([k, l]) => {
            const on = cardType(selCard(c)) === k;
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => !on && save({ ...latest.current, cards: latest.current.cards.map((x) => (x.id === selCard(latest.current).id ? { ...x, type: k } : x)) })} className={`h-11 rounded-xl text-[0.9375rem] font-semibold ${on ? "bg-white text-[#0b1626]" : "bg-white/10 text-white"}`}>
                {l}
              </button>
            );
          })}
        </div>
      )}
      <div className={`-mx-2 ${wx ? "mt-4" : "mt-2"}`}>
        {kart ? (
          <div aria-label="Rota kartı" role="img" dangerouslySetInnerHTML={{ __html: kart }} />
        ) : (
          <p className="px-4 py-16 text-center text-[0.9375rem] text-white/60">Rüzgârı ya da parkur eksenini ekle, kart çizilsin</p>
        )}
      </div>
      {big && kart && (
        <button type="button" onClick={() => setFull(true)} className="mt-3 h-12 w-full rounded-xl bg-[#2f6bff] text-[1rem] font-bold text-white active:translate-y-px">
          Büyük göster
        </button>
      )}
      {full && kart && (
        <button type="button" aria-label="Kapat" onClick={() => setFull(false)} className="fixed inset-0 z-[60] grid place-items-center bg-[#0b1626] p-4">
          <span className="block w-full max-w-[60rem]" dangerouslySetInnerHTML={{ __html: kart }} />
        </button>
      )}
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

// Ölçüm ekle (Seyhun 2026-11-05 "daha profesyonel, kullanıcı dostu; iPhone/iPad'in pusulasını kullan; her yerde aynı tasarım"; örnek
// project-files/yayin-parkur/olcum-ekle-ornek.png onaylandı). Tek pencere: Yayın › Parkur, /canli (LiveStart), antrenman (CourseTab).
// Ne: 8 kısa kutu; yön: pusula kadranı (parmakla çevrilir) + −5 −1 +1 +5; Pusula: kadran telefonun baktığı yönü canlı gösterir,
// "Bunu kullan" yazar (iPhone uygulamasında gerçek kuzey, tarayıcıda manyetik); "Kamerayla nişan al" CompassSight. Rüzgârda Hız,
// Sağanak, Aralık tek liste (Yok = eklenmez); Kim ölçtü altta. Haritaya dokunulduysa ölçüm o noktaya konur.
// pick0: açılışta seçili ölçüm (PICKS sırası; yayın sayfası Rüzgâr / Parkur ekseni ile açar, Seyhun 2026-11-01)
// onVoice: varsa "Sesle" düğmesi (Seyhun 2026-11-05 "canlı ekranda da sesle de olmalı"); ana sayfa pencereyi kapatıp sesle parkuru açar
export function AddSheet({ open, at, c, onClose, onAdd, pick0 = 0, onVoice = null }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ölçüm ekle">
      {open && <AddBody at={at} c={c} onAdd={onAdd} pick0={pick0} onVoice={onVoice} />}
    </Sheet>
  );
}
const SHORT = { "Rüzgâr": "Rüzgâr", "Parkur ekseni": "Eksen", "Komiteden pin": "Hat K→P", "Pin'den komite": "Hat P→K", "Orsa şamandırası": "Orsa", "Apaz şamandırası": "Apaz", "Orsadan apaza": "Orsa→Apaz", "Apazdan orsaya": "Apaz→Orsa" };
const DIRS = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"];
const dirOf = (d) => DIRS[Math.round(d / 45) % 8];

// Telefonun pusulası: on iken derece (null = henüz okunmadı); iPhone uygulamasında yerel pusula, yoksa deviceorientation
function useCompass(on) {
  const [deg, setDeg] = useState(null);
  useEffect(() => {
    if (!on) return;
    let last = null;
    const put = (h) => {
      last = last === null ? h : norm(last + angDiff(h, last) * 0.35);
      setDeg(Math.round(last) % 360);
    };
    const stopNative = startCompass((e) => {
      const h = e.true >= 0 ? e.true : e.mag;
      if (typeof h === "number") put(h);
    });
    const read = compassReader();
    const f = (e) => {
      const h = read(e);
      if (h !== null) put(h);
    };
    if (!stopNative) {
      window.addEventListener("deviceorientation", f, true);
      window.addEventListener("deviceorientationabsolute", f, true);
    }
    return () => {
      stopNative?.();
      window.removeEventListener("deviceorientation", f, true);
      window.removeEventListener("deviceorientationabsolute", f, true);
      setTimeout(() => setDeg(null), 0);
    };
  }, [on]);
  return deg;
}

// Pusula kadranı: parmakla çevrilir (merkeze göre açı); live iken yeşil ve dokunulmaz
function Dial({ deg, live, onDeg, className = "" }) {
  const box = useRef(null);
  const drag = useRef(false);
  const at = (e) => {
    const r = box.current.getBoundingClientRect();
    const a = (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI;
    onDeg(Math.round(norm(a)) % 360);
  };
  const rad = ((deg - 90) * Math.PI) / 180;
  const col = live ? "#34c38f" : "var(--acc)";
  return (
    <div
      ref={box}
      className={`relative aspect-square touch-none select-none ${className}`}
      onPointerDown={(e) => !live && ((drag.current = true), e.currentTarget.setPointerCapture?.(e.pointerId), at(e))}
      onPointerMove={(e) => drag.current && at(e)}
      onPointerUp={() => (drag.current = false)}
      onPointerCancel={() => (drag.current = false)}
    >
      <svg viewBox="0 0 200 200" className="size-full" aria-hidden="true">
        <circle cx="100" cy="100" r="96" fill="var(--bg)" stroke="var(--line)" />
        {Array.from({ length: 72 }, (_, i) => {
          const a = ((i * 5 - 90) * Math.PI) / 180;
          const l = i % 6 === 0 ? 12 : 6;
          return <line key={i} x1={100 + 84 * Math.cos(a)} y1={100 + 84 * Math.sin(a)} x2={100 + (84 - l) * Math.cos(a)} y2={100 + (84 - l) * Math.sin(a)} stroke={i % 18 === 0 ? "var(--fg2)" : "var(--line)"} strokeWidth={i % 6 === 0 ? 2 : 1} />;
        })}
        {[["K", 0], ["D", 90], ["G", 180], ["B", 270]].map(([t, a]) => {
          const r = ((a - 90) * Math.PI) / 180;
          return <text key={t} x={100 + 62 * Math.cos(r)} y={100 + 62 * Math.sin(r) + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--mut)">{t}</text>;
        })}
        <path d={`M${100 + 58 * Math.cos(rad)} ${100 + 58 * Math.sin(rad)} L${100 + 84 * Math.cos(rad)} ${100 + 84 * Math.sin(rad)}`} stroke={col} strokeWidth="3" strokeLinecap="round" />
        <circle cx={100 + 92 * Math.cos(rad)} cy={100 + 92 * Math.sin(rad)} r="9" fill={col} stroke="#fff" strokeWidth="2" />
      </svg>
      <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
        <div>
          <b className="block text-[2.75rem] font-bold leading-none tracking-[-.03em] tabular-nums">{deg}°</b>
          <span className="mt-1 block text-[0.875rem] font-semibold text-mut">{dirOf(deg)}{live ? " · canlı" : ""}</span>
        </div>
      </div>
    </div>
  );
}

function AddBody({ at, c, onAdd, pick0 = 0, onVoice = null }) {
  const [pick, setPick] = useState(pick0);
  const [by, setBy] = useState("ben");
  const lastOf = (k) => [...c.obs].reverse().find((x) => x.kind === k);
  const [deg, setDeg] = useState(() => lastOf(PICKS[pick0][0])?.deg ?? lastOf("wind")?.deg ?? 0);
  const [kn, setKn] = useState(() => lastOf("wind")?.kn ?? 8);
  const [gust, setGust] = useState(() => lastOf("wind")?.gust ?? null); // sağanak (Seyhun 2026-11-03 17:39 "sağanak da ekleyelim")
  const [span, setSpan] = useState(0); // rüzgâr aralığının genişliği (derece; 0 = yok), aralık deg … deg+span (Seyhun 2026-10-30)
  const [comp, setComp] = useState(false); // pusula açık
  const [sight, setSight] = useState(false); // kamerayla nişan
  const live = useCompass(comp);
  const [kind, ref] = PICKS[pick];
  const wind = kind === "wind";
  const shown = comp && live !== null ? live : deg;
  const tile = (on) => `h-10 rounded-xl px-1 text-[0.8125rem] font-semibold active:scale-[.97] ${on ? "bg-acc text-white" : "bg-bg text-fg2"}`;
  const step = "grid h-11 place-items-center rounded-xl bg-bg text-[1rem] font-semibold shadow-[inset_0_-2px_0_rgba(0,0,0,.12)] active:translate-y-px disabled:opacity-35";
  const openComp = async () => (await askCompass()) && setComp(true);
  const use = () => (live !== null && setDeg(live), setComp(false));
  const row = (name, val, minus, plus, off = false) => (
    <div className="flex h-14 items-center border-t border-line pl-3.5 pr-1.5 first:border-t-0">
      <span className="flex-1 text-[0.9375rem] font-semibold text-fg2">{name}</span>
      <button type="button" aria-label={`${name} azalt`} onClick={minus} className={`${step} w-11`}>−</button>
      <b className={`min-w-[5.5rem] text-center tabular-nums ${off ? "text-[0.9375rem] font-semibold text-mut" : "text-[1.375rem] font-bold"}`}>{val}</b>
      <button type="button" aria-label={`${name} artır`} onClick={plus} className={`${step} w-11`}>+</button>
    </div>
  );
  const tool = "h-12 rounded-2xl bg-bg text-[0.9375rem] font-semibold text-acc active:scale-[.98]";
  const tools = onVoice ? (
    <div className="grid grid-cols-2 gap-1.5">
      <button type="button" onClick={openComp} className={tool}>Pusula</button>
      <button type="button" onClick={onVoice} className={tool}>Sesle</button>
    </div>
  ) : (
    <button type="button" onClick={openComp} className={tool}>Pusula</button>
  );
  const out = { kind, ref, deg, by, kn: wind ? kn : null, ...(wind && gust !== null && gust > kn ? { gust } : {}), ...(wind && span ? { range: [deg, norm(deg + span)] } : {}), ...(at?.lat != null ? { lat: at.lat, lon: at.lon } : {}) };
  return (
    <div className="pb-2">
      <div className="grid grid-cols-4 gap-1.5">
        {PICKS.map(([, , l], i) => (
          <button key={l} type="button" aria-pressed={pick === i} onClick={() => (setPick(i), setDeg(lastOf(PICKS[i][0])?.deg ?? deg))} className={tile(pick === i)}>
            {SHORT[l] || l}
          </button>
        ))}
      </div>
      <div className="mt-4 md:grid md:grid-cols-[15rem_1fr] md:gap-5">
        <div className="flex items-center gap-3.5 md:block">
          <Dial deg={shown} live={comp} onDeg={setDeg} className="w-44 shrink-0 md:w-full" />
          <div className="flex flex-1 flex-col gap-2 md:hidden">
            {comp ? (
              <>
                <button type="button" onClick={use} disabled={live === null} className="flex h-14 flex-col items-center justify-center rounded-2xl bg-acc text-white active:scale-[.98] disabled:opacity-50">
                  <b className="text-[0.9375rem]">Bunu kullan</b>
                  <small className="text-[0.75rem] font-semibold opacity-80">{live === null ? "Pusula okunuyor" : `Pusula · ${live}°`}</small>
                </button>
                <button type="button" onClick={() => (setComp(false), setSight(true))} className="h-12 rounded-2xl bg-bg text-[0.875rem] font-semibold text-acc">Kamerayla nişan al</button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  {[-5, 5, -1, 1].map((d) => (
                    <button key={d} type="button" onClick={() => setDeg((v) => norm(v + d))} className={step}>{d > 0 ? `+${d}` : `−${-d}`}</button>
                  ))}
                </div>
                {tools}
              </>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <div className="hidden gap-2 md:flex md:flex-col">
            {comp ? (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={use} disabled={live === null} className="flex h-14 flex-col items-center justify-center rounded-2xl bg-acc text-white active:scale-[.98] disabled:opacity-50">
                  <b className="text-[0.9375rem]">Bunu kullan</b>
                  <small className="text-[0.75rem] font-semibold opacity-80">{live === null ? "Pusula okunuyor" : `Pusula · ${live}°`}</small>
                </button>
                <button type="button" onClick={() => (setComp(false), setSight(true))} className="h-14 rounded-2xl bg-bg text-[0.875rem] font-semibold text-acc">Kamerayla nişan al</button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-1.5">
                  {[-5, -1, 1, 5].map((d) => (
                    <button key={d} type="button" onClick={() => setDeg((v) => norm(v + d))} className={step}>{d > 0 ? `+${d}` : `−${-d}`}</button>
                  ))}
                </div>
                {tools}
              </>
            )}
          </div>
          {wind && (
            <div className="mt-4 overflow-hidden rounded-2xl bg-bg/60 md:mt-2">
              {row("Hız", `${kn} kn`, () => setKn((v) => Math.max(0, v - 1)), () => setKn((v) => Math.min(60, v + 1)))}
              {row("Sağanak", gust === null ? "Yok" : `${gust} kn`, () => setGust((v) => (v === null || v - 1 <= kn ? null : v - 1)), () => setGust((v) => Math.min(60, v === null ? kn + 4 : v + 1)), gust === null)}
              {row("Aralık", span ? `${deg}–${norm(deg + span)}°` : "Yok", () => setSpan((v) => Math.max(0, v - 5)), () => setSpan((v) => Math.min(90, v + 5)), !span)}
            </div>
          )}
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-bg/60 p-1">
            {BYS.map(([k, l]) => (
              <button key={k} type="button" aria-pressed={by === k} onClick={() => setBy(k)} className={`h-9 rounded-lg text-[0.8125rem] font-semibold ${by === k ? "bg-card text-fg shadow-sm" : "text-mut"}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <Button className="mt-4 h-14 w-full" disabled={comp} onClick={() => onAdd(out)}>
        {`Ekle · ${dirOf(deg)} ${span && wind ? `${deg}–${norm(deg + span)}` : deg}°${wind ? ` · ${kn} kn` : ""}`}
      </Button>
      <CompassSight open={sight} onClose={() => setSight(false)} onAdd={(o) => (setDeg(o.deg), setSight(false))} />
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
      {value && <span className={`shrink-0 text-[0.9375rem] font-medium tabular-nums ${acc ? "text-[#8fb3ff]" : "text-white"}`}>{value}</span>}
    </T>
  );
}
