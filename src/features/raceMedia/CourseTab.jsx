"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { Label, card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { Bar } from "@/features/training/Countdown";
import { useSpeech } from "@/hooks/useSpeech";
import { addCourseObs, courseRef, saveCourse } from "@/features/athletes/raceLiveStore";
import { canShare, loadSharedCourse, shareCourse } from "@/features/athletes/sharedRaces";
import { readCourseText } from "@/services/courseService";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { BYS, PICKS, PT_NAME, cleanCourse, cleanObs, lineBias, nm, norm, obsTitle, obsValue, windTrend } from "@/lib/raceCourse";
import { CompassSight, askCompass } from "./CompassSight";

// Parkur sekmesi (Seyhun 2026-10-28): üstte rota kartı (lib/courseCard.js, rüzgâr yukarıda; harita kaldırıldı).
// "Burada" düğmeleri kaldırıldı (Seyhun 2026-10-29); işaretlenmeyen şamandıralar kartta kesik çizgiyle tahmini. Ekleme: Elle ekle,
// sesle ya da yazarak ("orsada rüzgâr 330, 5 knot"; önce telefondaki kural, anlamazsa yapay zekâ; 3 sn içinde İptal edilmezse
// eklenir), Pusula (telefonun pusulası). Altta start hattı avantajı, rüzgâr dönüşü ve hız, ölçüm listesi (dokununca sil).
const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const BY = Object.fromEntries(BYS);

export function CourseTab({ orgId, race, day }) {
  const toast = useToast();
  const [c, setC] = useState(() => cleanCourse({}));
  const [here, setHere] = useState(null); // telefonun yeri { lat, lon, acc }
  const [add, setAdd] = useState(null); // elle ekleme penceresi { lat, lon } | {}
  const [got, setGot] = useState(null); // anlaşılan cümle { said, res } (3 sn sonra eklenir)
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
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
  const markHere = (pt) => {
    if (!here) return toast("Konum alınamadı. Konum iznini aç.");
    save({ ...latest.current, pts: { ...latest.current.pts, [pt]: { lat: here.lat, lon: here.lon, at: new Date().toISOString() } } }, `${PT_NAME[pt]} işaretlendi`);
  };
  const apply = (res) => {
    if (res.pt) return markHere(res.pt);
    if (res.len) return save({ ...latest.current, len: res.len }, `Orsa ${nm(res.len.orsa)}`);
    if (res.obs) addObs(res.obs);
  };

  // Söylenen / yazılan cümle
  const read = async (said) => {
    const t = said.trim();
    if (!t) return;
    setBusy(true);
    const res = await readCourseText(t);
    setBusy(false);
    if (res.error) return toast(res.error);
    if (res.pt || res.len) return apply(res);
    setText("");
    setGot({ said: t, res, at: Date.now() });
  };
  const sp = useSpeech({ noLevel: true, terms: ["orsa", "apaz", "pupa", "pin", "komite", "hakem botu", "knot", "derece", "şamandıra"], onFinal: read, onFail: (m) => toast(m) });
  useEffect(() => {
    if (!got) return;
    const id = setTimeout(() => (apply(got.res), setGot(null)), 3000);
    return () => clearTimeout(id);
  }, [got]); // eslint-disable-line react-hooks/exhaustive-deps

  const bias = lineBias(c);
  const trend = windTrend(c);
  const listening = sp.status === "listening";
  // Rota kartı (Seyhun 2026-10-28 "A · Rüzgâr yukarıda"; harita kaldırıldı: "Kart gayet iyi, kart üstüne çalışalım")
  const kart = useMemo(() => {
    try {
      return cardSvg(cardOf(c));
    } catch (e) {
      console.warn("[parkur] kart çizilemedi", e);
      return "";
    }
  }, [c]);

  return (
    <>
      <div className={`${card} mt-4 px-1 py-1.5`}>
        {kart ? (
          <div aria-label="Rota kartı" role="img" dangerouslySetInnerHTML={{ __html: kart }} />
        ) : (
          <p className="px-4 py-10 text-center text-[0.875rem] text-mut">Rüzgârı ya da parkur eksenini söyle, kart çizilsin</p>
        )}
      </div>
      {bias && <LineCard b={bias} />}
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
        {got && (
          <div className="mb-2 rounded-2xl bg-accbg px-4 py-3">
            <span className="block truncate text-[0.8125rem] text-mut">“{got.said}”</span>
            <b className="mt-0.5 block text-[1.0625rem] font-semibold">{obsTitle(cleanObs(got.res.obs))} · {obsValue(cleanObs(got.res.obs))}</b>
            <span className="mt-2 block h-1 overflow-hidden rounded-full bg-acc/20"><span key={got.at} className="block h-full origin-left animate-[autofill_3s_linear_forwards] bg-acc" /></span>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => setGot(null)}>İptal</Button>
              <Button size="sm" onClick={() => (apply(got.res), setGot(null))}>Şimdi ekle</Button>
            </div>
          </div>
        )}
        <div className="mb-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          <button type="button" onClick={() => setAdd({})} data-press className="raised h-9 shrink-0 rounded-full border px-3.5 text-[0.8125rem] font-semibold">Elle ekle</button>
          <button type="button" onClick={async () => ((await askCompass()) ? setSight(true) : toast("Pusula izni verilmedi"))} data-press className="raised h-9 shrink-0 rounded-full border px-3.5 text-[0.8125rem] font-semibold">Pusula</button>
        </div>
        <form onSubmit={(e) => (e.preventDefault(), read(text))} className="flex gap-2">
          <input
            value={listening ? sp.finalText || sp.interim || "Dinliyorum…" : text}
            onChange={(e) => setText(e.target.value)}
            readOnly={listening}
            enterKeyHint="send"
            placeholder="Söyle ya da yaz…"
            aria-label="Ölçümü söyle ya da yaz"
            className="h-12 min-w-0 flex-1 rounded-[0.875rem] border border-line bg-card px-3.5 text-[0.9375rem] outline-none placeholder:text-mut focus:border-acc"
          />
          <button
            type={text.trim() && !listening ? "submit" : "button"}
            disabled={busy || sp.status === "transcribing"}
            onClick={text.trim() && !listening ? undefined : () => (listening ? sp.stop() : sp.start({ autoStop: 2 }))}
            aria-label={text.trim() && !listening ? "Ekle" : listening ? "Dinlemeyi bitir" : "Sesle söyle"}
            className={`grid size-12 shrink-0 place-items-center rounded-[0.875rem] text-white active:translate-y-px disabled:opacity-60 ${listening ? "bg-rec" : "bg-acc shadow-[0_3px_0_#075e72]"}`}
          >
            <Icon name={busy || sp.status === "transcribing" ? "load" : text.trim() && !listening ? "up" : listening ? "stop" : "mic"} className={`size-5 ${busy || sp.status === "transcribing" ? "animate-spin" : ""}`} />
          </button>
        </form>
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

// Start hattı: pin'den komite açısı rüzgâra dik olandan ne kadar sapmış, hangi uç rüzgâra yakın
function LineCard({ b }) {
  const d = b.end === "pin" ? -1 : b.end === "komite" ? 1 : 0;
  const tilt = Math.min(14, b.deg * 2) * d; // çizimde abartılı eğim
  return (
    <>
      <Label>Start hattı</Label>
      <div className={`${card} px-4 py-3.5`}>
        <div className="flex items-baseline justify-between gap-3">
          <b className="text-[1.0625rem] font-semibold">{b.end ? `${b.end === "pin" ? "Pin" : "Komite"} tarafı önde` : "Hat rüzgâra dik"}</b>
          {b.end && <b className="text-[1.625rem] font-bold leading-none text-acc tabular-nums">{b.deg}°</b>}
        </div>
        <p className="mt-0.5 text-[0.8125rem] text-mut">
          {`Pin'den komite ${b.line}°, rüzgâra dik olsa ${b.ideal}°`}{b.m ? ` · ${b.end === "pin" ? "pin" : "komite"} ≈${b.m} m önde` : ""}
        </p>
        <svg viewBox="0 0 320 96" className="mt-2 block w-full" aria-hidden="true">
          <line x1="160" y1="4" x2="160" y2="30" stroke="var(--acc)" strokeWidth="3" />
          <path d="M153 26 L160 38 L167 26z" fill="var(--acc)" />
          <text x="174" y="22" fontSize="12" fill="var(--acc)" fontWeight="600">rüzgâr {b.wind}°</text>
          <line x1="40" y1="68" x2="280" y2="68" stroke="var(--mut)" strokeOpacity=".5" strokeWidth="2" strokeDasharray="5 5" />
          <line x1="40" y1={68 - tilt} x2="280" y2={68 + tilt} stroke="var(--fg)" strokeWidth="3" />
          <circle cx="40" cy={68 - tilt} r="7" fill="#f59e0b" />
          <text x="40" y={52 - tilt} fontSize="12" textAnchor="middle" fontWeight="600" fill="var(--fg)">Pin</text>
          <rect x="273" y={61 + tilt} width="14" height="14" rx="3" fill="var(--fg)" />
          <text x="280" y={52 + tilt} fontSize="12" textAnchor="middle" fontWeight="600" fill="var(--fg)">Komite</text>
        </svg>
      </div>
    </>
  );
}
