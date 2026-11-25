"use client";

// Teknedeki telefon (Seyhun 2026-11-02 tekne takibi): /takip/<yarış>?k=<anahtar>. Giriş yok. Yelken numarası seçilir, "Başla" ile
// konum 3 sn'de bir (kımıldamazsa 15 sn'de bir) gönderilir. Tarayıcı ekran kilitlenince konumu durdurur: ekran açık tutulur (Wake Lock).
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { card } from "@/components/ui/Page";
import { KEY, cleanSail, fromGeo, shouldSend } from "@/lib/boatTrack";
import { sendFix } from "./trackStore";

const store = (id) => `takip:${id}`;
const readSail = (id) => {
  try {
    return localStorage.getItem(store(id)) || "";
  } catch {
    return "";
  }
};
const ago = (ms) => (ms < 60e3 ? `${Math.max(0, Math.round(ms / 1000))} sn önce` : `${Math.round(ms / 60e3)} dk önce`);

export function Tracker({ id, k }) {
  const [race, setRace] = useState(null); // { name, entries } | null
  const [err, setErr] = useState("");
  const [sail, setSail] = useState("");
  const [q, setQ] = useState("");
  const [run, setRun] = useState(false);
  const [fix, setFix] = useState(null);
  const [sent, setSent] = useState({ n: 0, t: 0 });
  const [warn, setWarn] = useState("");
  const [now, setNow] = useState(0);
  const lastRef = useRef(null);
  const okKey = KEY.test(k || "");

  useEffect(() => {
    if (!okKey) return;
    let on = true;
    fetch(`/api/canli?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => on && (setSail((v) => v || readSail(id)), setRace({ name: j.race?.name || "Yarış", entries: (j.entries || []).filter((e) => cleanSail(e.sail)) })))
      .catch(() => on && setErr("Yarış bulunamadı. Linki yeniden iste."));
    return () => {
      on = false;
    };
  }, [id, okKey]);

  // Konum izleme + ekranı açık tutma
  useEffect(() => {
    if (!run || !sail) return;
    let lock = null;
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        ?.request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    };
    wake();
    const onVis = () => {
      if (document.visibilityState === "visible") wake();
      else setWarn("Ekran kapanınca konum gitmez. Uygulamayı açık bırak.");
    };
    document.addEventListener("visibilitychange", onVis);
    if (!navigator.geolocation) return;
    const wid = navigator.geolocation.watchPosition(
      (p) => {
        const f = fromGeo(p);
        if (!f) return;
        setFix(f);
        setWarn((w) => (w.startsWith("Konum izni") ? "" : w));
        if (!shouldSend(lastRef.current, f)) return;
        lastRef.current = f;
        sendFix(id, sail, k, f)
          .then(() => setSent((s) => ({ n: s.n + 1, t: Date.now() })))
          .catch((e) => setWarn(/permission|insufficient/i.test(String(e?.code || e?.message)) ? "Takip kapalı ya da link eski. Yeni link iste." : "Gönderilemedi, yeniden deneniyor."));
      },
      (e) => setWarn(e?.code === 1 ? "Konum izni verilmedi. Ayarlardan bu siteye konum izni ver." : "Konum alınamıyor, açık alanda bekle."),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
    return () => {
      navigator.geolocation.clearWatch(wid);
      document.removeEventListener("visibilitychange", onVis);
      lock?.release?.().catch?.(() => {});
    };
  }, [run, sail, id, k]);

  useEffect(() => {
    if (!run) return;
    const tick = () => setNow(Date.now());
    const t0 = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => (clearTimeout(t0), clearInterval(t));
  }, [run]);

  const pick = (s) => {
    setSail(s);
    try {
      localStorage.setItem(store(id), s);
    } catch {}
  };

  if (!okKey || err) {
    return (
      <Shell>
        <p className={`${card} px-4 py-4 text-[0.9375rem] font-semibold`}>{err || "Link eksik. Takip linkini yeniden iste."}</p>
      </Shell>
    );
  }
  if (run) {
    const age = sent.t ? now - sent.t : null;
    const late = age !== null && age > 30e3;
    return (
      <Shell title={race?.name}>
        <div className={`${card} px-4 py-6 text-center`}>
          <div className="text-[0.8125rem] font-semibold text-mut">Yelken no</div>
          <div className="text-[3.5rem] font-bold leading-none tabular-nums">{sail}</div>
          <div className={`mt-4 text-[1.0625rem] font-semibold ${late || !sent.n ? "text-warn" : "text-ok"}`}>{sent.n ? (late ? `Son konum ${ago(age)}` : "Konum gidiyor") : "Konum bekleniyor"}</div>
          <div className="mt-1 text-[0.875rem] text-mut tabular-nums">{[fix?.acc != null ? `± ${fix.acc} m` : "", fix?.spd != null ? `${String(fix.spd).replace(".", ",")} kn` : "", sent.n ? `${sent.n} gönderim` : ""].filter(Boolean).join(" · ")}</div>
        </div>
        {typeof navigator !== "undefined" && !navigator.geolocation ? <p className="rounded-[1rem] bg-warnbg px-4 py-3 text-[0.875rem] font-semibold text-warn">Bu telefon konum vermiyor.</p> : null}
        {warn ? <p className="rounded-[1rem] bg-warnbg px-4 py-3 text-[0.875rem] font-semibold text-warn">{warn}</p> : null}
        <Button variant="secondary" onClick={() => setRun(false)}>
          Durdur
        </Button>
      </Shell>
    );
  }
  const d = q.replace(/\D/g, "");
  const list = (race?.entries || []).filter((e) => !d || cleanSail(e.sail).startsWith(d)).slice(0, 60);
  const typed = cleanSail(q);
  return (
    <Shell title={race?.name}>
      <input value={q} onChange={(e) => setQ(e.target.value)} inputMode="numeric" placeholder="Yelken no" className={`${card} w-full px-4 py-3 text-[1.25rem] font-semibold outline-none`} />
      <div className={`${card} divide-y divide-line overflow-hidden`}>
        {!race ? <div className="px-4 py-3 text-mut">…</div> : null}
        {list.map((e) => {
          const s = cleanSail(e.sail);
          return (
            <button key={s} type="button" onClick={() => pick(s)} className={`flex w-full items-center gap-3 px-4 py-3 text-left ${sail === s ? "bg-accbg" : ""}`}>
              <b className="w-16 shrink-0 tabular-nums">{s}</b>
              <span className="truncate text-[0.9375rem]">{e.name || ""}</span>
              <span className="ml-auto truncate text-[0.8125rem] text-mut">{e.club || ""}</span>
            </button>
          );
        })}
        {race && typed && !list.some((e) => cleanSail(e.sail) === typed) ? (
          <button type="button" onClick={() => pick(typed)} className={`flex w-full px-4 py-3 text-left font-semibold ${sail === typed ? "bg-accbg" : ""}`}>
            {`${typed} (listede yok)`}
          </button>
        ) : null}
      </div>
      <Button disabled={!sail} onClick={() => setRun(true)}>
        {sail ? `${sail} · Başla` : "Başla"}
      </Button>
    </Shell>
  );
}

function Shell({ title = "", children }) {
  return (
    <div className="min-h-dvh bg-bg px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="truncate text-[1.25rem] font-bold">{title ? `${title} · Takip` : "Tekne takibi"}</h1>
        {children}
      </div>
    </div>
  );
}
