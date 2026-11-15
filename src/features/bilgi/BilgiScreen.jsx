"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { sunsetHM } from "@/lib/attRemind";
import { FRESH_MS, courseOf, dirName, normDeg, pFlag, seqMarks, startView } from "@/lib/bilgi";
import { savePusula, useBilgi, useBilgiDoc } from "./bilgiStore";
import "./bilgi.css";

// Sporcu bilgi ekranı (Seyhun 2026-11-15, örnek 2): başlıksız tek ekran, dokunulmaz. Saat · pusula (telefonun baktığı yön),
// start sayacı, parkur (rüzgâr şimdilik 0) ve gelen mesaj (sesli okunur) / bas-konuş ses. İlk açılışta bir kez "Başlat":
// telefon pusula izni, ses ve ekranın açık kalması için dokunuş ister.
const pad = (n) => String(n).padStart(2, "0");

function useTick(ms) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// Telefonun baktığı yön: iPhone webkitCompassHeading, Android deviceorientationabsolute (360 - alpha); ekran yan dönünce açı eklenir
function useHeading(on) {
  const [h, setH] = useState(null);
  const last = useRef({ t: 0, h: null });
  useEffect(() => {
    if (!on) return;
    const take = (deg, e) => {
      if (deg == null || !Number.isFinite(deg)) return;
      const rot = typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle || 0 : Number(window.orientation) || 0;
      const v = normDeg(deg + rot);
      SENS = { h: v, roll: Number.isFinite(e?.gamma) ? Math.round(e.gamma) : null, pitch: Number.isFinite(e?.beta) ? Math.round(e.beta) : null, t: Date.now() };
      const now = Date.now();
      if (now - last.current.t < 150 || v === last.current.h) return;
      last.current = { t: now, h: v };
      setH(v);
    };
    const ios = (e) => (e.webkitCompassHeading != null ? take(e.webkitCompassHeading, e) : e.absolute && e.alpha != null ? take(360 - e.alpha, e) : null);
    const abs = (e) => (e.alpha != null ? take(360 - e.alpha, e) : null);
    const hasAbs = "ondeviceorientationabsolute" in window;
    if (hasAbs) window.addEventListener("deviceorientationabsolute", abs);
    else window.addEventListener("deviceorientation", ios);
    return () => {
      window.removeEventListener("deviceorientationabsolute", abs);
      window.removeEventListener("deviceorientation", ios);
    };
  }, [on]);
  return h;
}

// Gündüz beyaz zemin (güneşte net), güneş batınca lacivert (Seyhun 2026-11-15). Yer: Dikili; doğuş, güneş öğlesinin batışa göre simetriği
const HERE = { lat: 39.07, lon: 26.89 };
const mOf = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
export function isNight(d = new Date()) {
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const set = mOf(sunsetHM(day, HERE));
  const n = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5);
  const B = ((2 * Math.PI) / 365) * (n - 81);
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B); // zaman denklemi (dk)
  const noon = 12 * 60 + (180 - HERE.lon * 4) - eot;
  const rise = 2 * noon - set;
  const m = d.getHours() * 60 + d.getMinutes();
  return m >= set || m < rise;
}

// Son sensör değeri (yön, yatış, baş-kıç); kayıt saniyede bir buradan alır
let SENS = { h: null, roll: null, pitch: null, t: 0 };

// Pusula kaydı (Seyhun 2026-11-15 "kafaya açma, orsalama açılarını anlamak için"): ekran açıkken saniyede bir [sn, yön, yatış, baş-kıç],
// 60 örnekte bir (ve ekrandan çıkınca) tek belge yazılır: saatte ~60 yazma, okuma yok
function useRecord(on, org, uid, name) {
  useEffect(() => {
    if (!on || !org || !uid) return;
    let buf = [];
    let t0 = 0;
    const flush = () => {
      if (buf.length < 5) return;
      savePusula(org, { uid, name: name || "", at: t0, pts: buf.flat(), n: buf.length }).catch(() => {});
      buf = [];
    };
    const id = setInterval(() => {
      const s = SENS;
      if (s.h == null || Date.now() - s.t > 3000) return;
      if (!buf.length) t0 = Date.now();
      buf.push([Math.round((Date.now() - t0) / 1000), s.h, s.roll ?? 0, s.pitch ?? 0]);
      if (buf.length >= 60) flush();
    }, 1000);
    const hide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", hide);
      flush();
    };
  }, [on, org, uid, name]);
}

function useWake(on) {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock = null;
    let off = false;
    const ask = () => {
      if (document.visibilityState !== "visible") return;
      navigator.wakeLock
        .request("screen")
        .then((l) => (off ? l.release() : (lock = l)))
        .catch(() => {});
    };
    ask();
    document.addEventListener("visibilitychange", ask);
    return () => {
      off = true;
      document.removeEventListener("visibilitychange", ask);
      lock?.release().catch(() => {});
    };
  }, [on]);
}

// Ses öğesi tek: ekran tek, dokunuşla açılan öğe sonra gelen kayıtları çalar
let AUDIO = null;

// Gelen mesaj sesli okunur, bas-konuş kaydı çalınır. Ekran açılmadan önceki (taze olmayan) mesaj/ses çalınmaz.
function useVoice(on, msg, ses) {
  const [talk, setTalk] = useState(false);
  const seen = useRef({ msg: null, ses: null });
  useEffect(() => {
    if (!msg?.id || seen.current.msg === msg.id) return;
    const first = seen.current.msg === null;
    seen.current.msg = msg.id;
    if (first && Date.now() - msg.at > 5000) return;
    if (!on || Date.now() - msg.at > FRESH_MS || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(msg.text);
    u.lang = "tr-TR";
    const v = speechSynthesis.getVoices().find((x) => /^tr/i.test(x.lang));
    if (v) u.voice = v;
    u.onstart = () => setTalk(true);
    u.onend = u.onerror = () => setTalk(false);
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }, [on, msg]);
  useEffect(() => {
    if (!ses?.id || seen.current.ses === ses.id) return;
    const first = seen.current.ses === null;
    seen.current.ses = ses.id;
    if (first && Date.now() - ses.at > 5000) return;
    const a = AUDIO;
    if (!on || !a || !ses.data || Date.now() - ses.at > FRESH_MS) return;
    a.src = `data:${ses.type || "audio/mp4"};base64,${ses.data}`;
    a.onplaying = () => setTalk(true);
    a.onended = a.onerror = a.onpause = () => setTalk(false);
    a.play().catch(() => setTalk(false));
  }, [on, ses]);
  // Tarayıcı sesi yalnız dokunuştan sonra çalar: aynı ses öğesi dokunuşta bir kez sessizce çalınır, sonra gelen kayıtlar onunla çalar
  const unlock = async () => {
    try {
      const a = AUDIO || (AUDIO = new Audio());
      a.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
      await a.play().catch(() => {});
    } catch {}
    try {
      if ("speechSynthesis" in window) speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    } catch {}
  };
  return [talk, unlock];
}

function Tape({ h }) {
  const W = 300;
  const px = 3.2;
  const L = { 0: "K", 45: "KD", 90: "D", 135: "GD", 180: "G", 225: "GB", 270: "B", 315: "KB" };
  const ticks = [];
  if (h != null)
    for (let d = Math.ceil((h - 50) / 5) * 5; d <= h + 50; d += 5) {
      const x = W / 2 + (d - h) * px;
      const dd = ((d % 360) + 360) % 360;
      const maj = dd % 15 === 0;
      ticks.push(<line key={`l${d}`} x1={x} x2={x} y1={maj ? 6 : 12} y2={20} style={{ stroke: maj ? "var(--bz-tick)" : "var(--bz-tick2)" }} strokeWidth="1.4" />);
      if (dd % 45 === 0)
        ticks.push(<text key={`t${d}`} x={x} y="32" className="bz-tl">{L[dd]}</text>);
      else if (maj)
        ticks.push(<text key={`t${d}`} x={x} y="32" className="bz-tn">{dd}</text>);
    }
  return (
    <svg className="bz-tape" viewBox={`0 0 ${W} 34`} preserveAspectRatio="none" aria-hidden="true">
      {ticks}
      <path d={`M${W / 2 - 6} 0 L${W / 2 + 6} 0 L${W / 2} 8 Z`} style={{ fill: "var(--bz-acc)" }} />
      <line x1={W / 2} x2={W / 2} y1="0" y2="22" style={{ stroke: "var(--bz-acc)" }} strokeWidth="2" />
    </svg>
  );
}

function Course({ kind }) {
  const c = courseOf(kind);
  const wind = 0; // parkurdaki rüzgâr: kendi ölçümümüz gelince (Seyhun 2026-11-15 "şimdilik 0")
  return (
    <svg className="bz-course" viewBox="0 0 300 260" preserveAspectRatio="xMidYMid meet" aria-label={`Parkur ${c.name}`}>
      <path d={c.path.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ")} fill="none" style={{ stroke: "var(--bz-line2)" }} strokeWidth="1.5" strokeDasharray="4 5" />
      {c.marks.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="6.5" style={{ fill: "var(--bz-mark)" }} />
      ))}
      {c.labels.map(([n, x, y]) => (
        <text key={n} x={x} y={y} className="bz-mk">
          {n}
        </text>
      ))}
      <path d="M110 236 L196 236" style={{ stroke: "var(--bz-line3)" }} strokeWidth="2" />
      <rect x="196" y="230" width="14" height="12" rx="2" style={{ fill: "var(--bz-line3)" }} />
      <circle cx="110" cy="236" r="4" style={{ fill: "var(--bz-line3)" }} />
      <g transform="translate(250 54)">
        <circle r="26" fill="none" style={{ stroke: "var(--bz-line2)" }} strokeWidth="1.5" />
        <path d="M0 -18 L0 12 M-7 4 L0 13 L7 4" style={{ stroke: "var(--bz-dim)" }} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
      <text x="250" y="102" className="bz-wk">
        {wind}
        <tspan className="bz-wu"> kn</tspan>
      </text>
      <text x="250" y="118" className="bz-wd">— °</text>
    </svg>
  );
}

export function BilgiScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const org = profile?.orgId || "";
  const b = useBilgi(org);
  const ses = useBilgiDoc(org, "ses");
  const [on, setOn] = useState(false);
  const now = useTick(250);
  const h = useHeading(on);
  useRecord(on, org, profile?.uid, profile?.name);
  useWake(on);
  const [talk, unlock] = useVoice(on, b?.msg, ses);

  // Tek dokunuş: pusula izni (iPhone), sesin açılması ve ekranın açık kalması tarayıcının dokunuş istediği işler
  const start = async () => {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") await DeviceOrientationEvent.requestPermission();
    } catch {}
    await unlock();
    try {
      await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
    } catch {}
    setOn(true);
  };
  const leave = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    router.back();
  };

  const d = new Date(now);
  const night = isNight(d);
  const sv = startView(b?.timer, now);
  const dur = b?.timer?.dur ?? 300;
  const seq = sv.phase === "down" && dur === 300 ? seqMarks(sv.left) : null;
  const msg = b?.msg && now - b.msg.at < FRESH_MS ? b.msg : null;

  return (
    <main className={`bz${night ? "" : " bz-day"}`} data-bilgi>
      <button type="button" className="bz-back" onClick={leave} aria-label="Geri">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      {talk && (
        <span className="bz-talk" aria-label="Konuşuyor">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </span>
      )}
      <div className="bz-l">
        <div className="bz-tw">
          <div>
            <span className="bz-big num">
              {pad(d.getHours())}:{pad(d.getMinutes())}
              <small>:{pad(d.getSeconds())}</small>
            </span>
          </div>
          <div className="bz-r">
            <span className="bz-big num">{h == null ? "---" : h}°</span>
            <span className="bz-sm num">{h == null ? "" : dirName(h)}</span>
          </div>
        </div>
        <Tape h={h} />
        <div className="bz-hr" />
        <div className="bz-st">
          <div className={`bz-cd num${sv.phase === "none" ? " off" : ""}`}>{sv.txt}</div>
          {(b?.label || pFlag(sv.left, dur)) && (
            <div className="bz-ln">
              {b?.label && <span>{b.label}</span>}
              {pFlag(sv.left, dur) && (
                <span className="bz-flag">
                  <i />P
                </span>
              )}
            </div>
          )}
          {seq && (
            <div className="bz-seq">
              {seq.map((x) => (
                <div key={x.m} className={x.on ? "on" : x.done ? "done" : ""}>
                  {x.m}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="bz-rt">
        <div className="bz-hr bz-hr2" />
        <div className="bz-cx">
          <Course kind={b?.course} />
          {b?.state && <div className="bz-cs">{b.state}</div>}
        </div>
      </div>
      {msg && (
        <div className="bz-msg" role="status">
          <time className="num">
            {pad(new Date(msg.at).getHours())}:{pad(new Date(msg.at).getMinutes())}
          </time>
          <p>{msg.text}</p>
        </div>
      )}
      {!on && (
        <button type="button" className="bz-go" onClick={start}>
          <span className="btn btn-primary">Başlat</span>
        </button>
      )}
    </main>
  );
}
