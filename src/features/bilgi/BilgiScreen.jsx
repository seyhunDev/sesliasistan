"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { sunsetHM } from "@/lib/attRemind";
import { FRESH_MS, SHOW_DEF, beepOf, buildCourse, dirName, normDeg, pFlag, screenMode, seqMarks, startView, declination, quatHeading, tiltHeading, windRel } from "@/lib/bilgi";
import { CourseMap } from "./CourseMap";
import { deviceId, readWho, savePusula, saveWho, sendGelen, sendIz, sendPos, useBilgi, useBilgiDoc, usePublic } from "./bilgiStore";
import { usePtt } from "./usePtt";
import { sayDevice, sayWith } from "@/lib/speech/ttsClient";
import { PttCancel, Wave } from "./Wave";
import { mineOf, useCanliRace } from "@/features/liveScreen/sonuclar";
import { groupColor } from "@/lib/roundScore";
import "./bilgi.css";

// Sporcu bilgi ekranı (Seyhun 2026-11-15, örnek 4): başlıksız tek ekran, dokunulmaz. Üstte en büyük pusula derecesi (telefonun
// baktığı yön) + kayan şerit, ortada parkur, start sürerken altta mavi süre, sağ altta küçük soluk saat (rüzgâr şimdilik 0) ve gelen mesaj (sesli okunur) / bas-konuş ses. İlk açılışta bir kez "Başlat":
// telefon pusula izni, ses ve ekranın açık kalması için dokunuş ister.
// Örnek 5 (Seyhun 2026-11-15): startın son 1 dakikasında yalnız büyük süre (bipli), start olunca ortada büyük pusula + altta küçük
// akan süre; start sonrası ekranda ne görüneceği Yönet'ten (show: pusula, süre, parkur, rüzgâr, saat).
const pad = (n) => String(n).padStart(2, "0");

function useTick(ms) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// Telefonun baktığı yön, eğim düzeltmeli (lib/bilgi tiltHeading): öne/arkaya yatırınca değişmez, yalnız sağa sola dönünce değişir.
// Android: deviceorientationabsolute (alpha kuzeye göre). iPhone: alpha keyfi başlar; telefon düze yakınken webkitCompassHeading ile
// fark (ofset) bulunur, sonra eğim düzeltmeli yön + ofset. Ölçüm titremesin diye yön birim vektörüyle yumuşatılır.
const DEAD = 4;
const screenAngle = () => (typeof screen !== "undefined" && screen.orientation ? screen.orientation.angle || 0 : Number(window.orientation) || 0);
let MYPOS = null; // son GPS konumu (sapma hesabı için)
function useHeading(on) {
  const [h, setH] = useState(null);
  const last = useRef({ t: 0, h: null, x: 0, y: 0, off: null });
  useEffect(() => {
    if (!on) return;
    const L = last.current;
    const take = (mag, e) => {
      if (mag == null || !Number.isFinite(mag)) return;
      const deg = mag + declination(MYPOS?.lat, MYPOS?.lon); // manyetikten gerçek kuzeye
      const r = (deg * Math.PI) / 180;
      L.x = L.x * 0.85 + Math.sin(r) * 0.15;
      L.y = L.y * 0.85 + Math.cos(r) * 0.15;
      const v = normDeg((Math.atan2(L.x, L.y) * 180) / Math.PI);
      SENS = {
        h: v,
        roll: Number.isFinite(e?.gamma) ? Math.round(e.gamma) : null,
        pitch: Number.isFinite(e?.beta) ? Math.round(e.beta) : null,
        t: Date.now(),
      };
      const now = Date.now();
      // Ölü bölge (Seyhun 2026-11-15): 2-3 derecelik oynamada sayı değişmez, 4 derece ve üstü değişimde gösterilir (kayıt ham kalır)
      if (now - L.t < 150 || (L.h != null && Math.abs(((v - L.h + 540) % 360) - 180) < DEAD)) return;
      L.t = now;
      L.h = v;
      setH(v);
    };
    const abs = (e) => take(tiltHeading(e.alpha, e.beta, e.gamma, screenAngle()), e);
    const ios = (e) => {
      const t = tiltHeading(e.alpha, e.beta, e.gamma, screenAngle());
      if (e.webkitCompassHeading != null && Number.isFinite(e.webkitCompassHeading)) {
        if (t != null && Math.abs(e.beta) < 35 && Math.abs(e.gamma) < 35) L.off = normDeg(e.webkitCompassHeading + screenAngle() - t);
        return take(t != null && L.off != null ? t + L.off : e.webkitCompassHeading + screenAngle(), e);
      }
      if (e.absolute) take(t, e);
    };
    const events = () => {
      if ("ondeviceorientationabsolute" in window) window.addEventListener("deviceorientationabsolute", abs);
      else window.addEventListener("deviceorientation", ios);
    };
    // Android: önce AbsoluteOrientationSensor (dörtlük; dik telefonda da doğru). Yoksa, izin verilmezse ya da 2 sn'de okuma
    // gelmezse eski açı olayına dönülür. iPhone'da bu sensör yok, webkitCompassHeading yolu sürer.
    let sensor = null;
    let fell = false;
    let wait = 0;
    const fall = () => {
      if (fell) return;
      fell = true;
      clearTimeout(wait);
      try {
        sensor?.stop();
      } catch {}
      sensor = null;
      events();
    };
    const iosLike = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    if (!iosLike && typeof window.AbsoluteOrientationSensor === "function") {
      try {
        sensor = new window.AbsoluteOrientationSensor({ frequency: 20, referenceFrame: "device" });
        sensor.addEventListener("reading", () => {
          clearTimeout(wait);
          const q = quatHeading(sensor?.quaternion, screenAngle());
          if (q) take(q.h, q);
        });
        sensor.addEventListener("error", fall);
        sensor.start();
        wait = setTimeout(fall, 2000);
      } catch {
        fall();
      }
    } else fall();
    return () => {
      clearTimeout(wait);
      try {
        sensor?.stop();
      } catch {}
      sensor = null;
      fell = true;
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
      savePusula(org, {
        uid,
        name: name || "",
        at: t0,
        pts: buf.flat(),
        n: buf.length,
      }).catch(() => {});
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

// Ekran kaymasın (Seyhun 2026-11-15, iPhone'da yukarı aşağı oynuyordu): sayfa kaydırma ve lastik esneme kapalı, sürükleme yok
function useLock() {
  useEffect(() => {
    const el = document.documentElement;
    el.classList.add("bz-lock");
    const stop = (e) => e.touches?.length < 2 && e.cancelable && e.preventDefault();
    document.addEventListener("touchmove", stop, { passive: false });
    return () => {
      el.classList.remove("bz-lock");
      document.removeEventListener("touchmove", stop);
    };
  }, []);
}

// Tekne konumu: ekran açıkken GPS izlenir, 10 sn'de bir yazılır; tekne durgunsa (10 m'den az kıpırdadı) 45 sn'de bir.
// (Seyhun 2026-11-15 "Firebase'e yük, masraf": 5/30 sn'den 10/45 sn'ye; hareketli teknede saatte 360 yazma)
// Belge: bilgiTekne/{cihaz} { org, k (açık link anahtarı), sail, name, lat, lon, spd (kn), hdg, acc, t, uid }
const metres = (a, b) => {
  const r = Math.PI / 180;
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  return Math.hypot(x, (b.lat - a.lat) * r) * 6371e3;
};
// Kanaldaki varlık + konum (tek belge bilgiTekne/{cihaz}): GPS varsa 10 sn'de bir (durgunsa 45 sn), yoksa 45 sn'de bir konumsuz.
// seen: ekranın gösterdiği/çaldığı son mesaj ya da ses (Yönet'te "Görüldü"); değişince hemen yazılır.
function usePresence(on, who, org, k, uid, ch, seen) {
  const st = useRef({ seen: "", kick: null });
  useEffect(() => {
    if (!on || !org || !who || !ch) return;
    const S0 = st.current;
    const dev = deviceId();
    if (!dev) return;
    let fix = null;
    let sent = null;
    const write = () => {
      const c = fix && Date.now() - fix.timestamp < 20000 ? fix.coords : null;
      const pt = c ? { lat: +c.latitude.toFixed(6), lon: +c.longitude.toFixed(6) } : { lat: null, lon: null };
      const d = {
        org,
        k: k || "",
        ch,
        sail: who.sail || "",
        name: who.name || "",
        ...pt,
        spd: c && Number.isFinite(c.speed) ? Math.round(c.speed * 19.44) / 10 : null,
        hdg: c && Number.isFinite(c.heading) ? Math.round(c.heading) : null,
        acc: c ? Math.round(c.accuracy || 0) : null,
        t: Date.now(),
        uid: uid || "",
        seen: S0.seen || "",
      };
      sent = { ...pt, t: d.t, seen: d.seen };
      sendPos(dev, d).catch(() => (sent = null));
    };
    S0.kick = write;
    const w = navigator.geolocation?.watchPosition(
      (p) => (fix = p),
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    write();
    // İz: 5 sn'de bir nokta (taze konum varsa), 12 nokta (1 dk) olunca ya da ekran kapanınca tek belge
    let iz = [];
    let t0 = 0;
    const flushIz = () => {
      if (!iz.length) return;
      sendIz({ org, k: k || "", ch, dev, sail: who.sail || "", name: who.name || "", uid: uid || "", t0, pts: iz.flat() }).catch(() => {});
      iz = [];
    };
    const hide = () => document.visibilityState === "hidden" && flushIz();
    document.addEventListener("visibilitychange", hide);
    const id = setInterval(() => {
      const c = fix && Date.now() - fix.timestamp < 20000 ? fix.coords : null;
      if (c && Date.now() - fix.timestamp < 10000) {
        if (!iz.length) t0 = Date.now();
        iz.push([Math.round((Date.now() - t0) / 1000), +c.latitude.toFixed(6), +c.longitude.toFixed(6), Number.isFinite(c.speed) ? Math.round(c.speed * 19.44) / 10 : -1]);
        if (iz.length >= 12) flushIz();
      }
      const age = sent ? Date.now() - sent.t : Infinity;
      if (c && sent?.lat != null && metres(sent, { lat: c.latitude, lon: c.longitude }) < 10 && age < 45000) return;
      if (!c && age < 45000) return;
      if (age < 9500) return;
      write();
    }, 5000);
    return () => {
      S0.kick = null;
      if (w != null) navigator.geolocation.clearWatch(w);
      clearInterval(id);
      document.removeEventListener("visibilitychange", hide);
      flushIz();
    };
  }, [on, who, org, k, uid, ch]);
  useEffect(() => {
    if (!seen || st.current.seen === seen) return;
    st.current.seen = seen;
    st.current.kick?.();
  }, [seen]);
}

const noSub = () => () => {};
const whoRaw = () => {
  try {
    return localStorage.getItem("sa-bilgi-kim") || "";
  } catch {
    return "";
  }
};

// Başlat: yelken no + isim (bu telefonda saklı). Kayıtlıysa yalnız Başlat ve Değiştir
// why: link yoksa/eskiyse "none", okunamadıysa "err" (Seyhun 2026-11-17: hepsi "Kanal açık değil" diyordu, sebep anlaşılmıyordu)
const WHY = {
  none: "Bu link geçersiz ya da eski. Antrenöründen yeni linki iste.",
  err: "Bağlanılamadı. İnterneti kontrol edip sayfayı yenile.",
};
// Kapat (Seyhun 2026-11-23 "katıl ve başlat, değiştir açılıyor, geri ya da X yok, öyle kalıyor"): sol üstte X. Değiştir açıkken X değiştirmeyi
// bırakır; değilse ekrandan çıkar (uygulamada geri; linkte yalnız geri gidilecek sayfa varsa görünür).
function StartCard({ onGo, onClose, kanal, why = "" }) {
  // Saklı kimlik ilk çizimden sonra okunur (sunucu çizimiyle uyuşsun): sunucuda null
  const raw = useSyncExternalStore(noSub, whoRaw, () => null);
  const who = raw ? readWho() : null;
  const [editing, setEditing] = useState(false);
  const edit = editing || (raw !== null && !who);
  const [sail, setSail] = useState("");
  const [name, setName] = useState("");
  const go = () => {
    if (edit) {
      if (!sail.trim() && !name.trim()) return;
      saveWho({ sail, name });
      onGo(readWho());
    } else onGo(who);
  };
  const change = () => {
    setSail(who?.sail || "");
    setName(who?.name || "");
    setEditing(true);
  };
  const close = editing && who ? () => setEditing(false) : onClose;
  const x = close ? (
    <button type="button" className="btn btn-round bz-x" onClick={close} aria-label={editing && who ? "Vazgeç" : "Kapat"} data-press>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  ) : null;
  if (raw === null || kanal === undefined) return <div className="bz-go navy">{x}</div>;
  if (!kanal?.open)
    return (
      <div className="bz-go navy">
        {x}
        <div className="bz-card bz-none">{WHY[why] || "Kanal açık değil"}</div>
      </div>
    );
  return (
    <div className="bz-go navy">
      {x}
      <form
        className="bz-card"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
      >
        <div className="bz-ch">{kanal.name}</div>
        {edit ? (
          <>
            <label>
              Yelken no
              <input className="num" value={sail} maxLength={12} inputMode="text" autoCapitalize="characters" onChange={(e) => setSail(e.target.value)} />
            </label>
            <label>
              İsim
              <input value={name} maxLength={30} autoCapitalize="words" onChange={(e) => setName(e.target.value)} />
            </label>
          </>
        ) : (
          <div className="bz-who">
            <b className="num">{who.sail}</b>
            <span>{who.name}</span>
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={edit && !sail.trim() && !name.trim()}>
          Katıl ve başlat
        </button>
        {!edit && (
          <button type="button" className="bz-chg" onClick={change}>
            Değiştir
          </button>
        )}
      </form>
    </div>
  );
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

// Bip sesi (Web Audio): bağlam "Başlat" dokunuşunda açılır. one: kısa bip, two: çift bip, long: uzun bip
let ACTX = null;
function tone(at, len) {
  const c = ACTX;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "square";
  o.frequency.value = 1500;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.5, at + 0.01);
  g.gain.setValueAtTime(0.5, at + len - 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + len + 0.02);
}
function beep(kind) {
  if (!ACTX) return;
  if (ACTX.state === "suspended") ACTX.resume().catch(() => {});
  const t = ACTX.currentTime + 0.02;
  if (kind === "long") tone(t, 1);
  else if (kind === "two") (tone(t, 0.12), tone(t + 0.2, 0.12));
  else tone(t, 0.15);
}
function useBeeps(on, left) {
  const prev = useRef(null);
  useEffect(() => {
    const k = beepOf(prev.current, left);
    prev.current = left;
    if (on && k) beep(k);
  }, [on, left]);
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
    if (!on || Date.now() - msg.at > FRESH_MS) return;
    // Doğal ses (Gemini, lib/speech/ttsClient.js); giriş yoksa ya da 5 sn'de gelmezse cihaz sesi
    const opts = { style: "asistan", timeoutMs: 5000, onStart: () => setTalk(true), onEnd: () => setTalk(false) };
    if (AUDIO) sayWith(AUDIO, msg.text, opts);
    else sayDevice(msg.text, opts);
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
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && !ACTX) ACTX = new AC();
      ACTX?.resume().catch(() => {});
    } catch {}
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
  const L = {
    0: "K",
    45: "KD",
    90: "D",
    135: "GD",
    180: "G",
    225: "GB",
    270: "B",
    315: "KB",
  };
  const ticks = [];
  if (h != null)
    for (let d = Math.ceil((h - 50) / 5) * 5; d <= h + 50; d += 5) {
      const x = W / 2 + (d - h) * px;
      const dd = ((d % 360) + 360) % 360;
      const maj = dd % 15 === 0;
      ticks.push(<line key={`l${d}`} x1={x} x2={x} y1={maj ? 6 : 12} y2={20} style={{ stroke: maj ? "var(--bz-tick)" : "var(--bz-tick2)" }} strokeWidth="1.4" />);
      if (dd % 45 === 0)
        ticks.push(
          <text key={`t${d}`} x={x} y="32" className="bz-tl">
            {L[dd]}
          </text>,
        );
      else if (maj)
        ticks.push(
          <text key={`t${d}`} x={x} y="32" className="bz-tn">
            {dd}
          </text>,
        );
    }
  return (
    <svg className="bz-tape" viewBox={`0 0 ${W} 34`} preserveAspectRatio="none" aria-hidden="true">
      {ticks}
      <path d={`M${W / 2 - 6} 0 L${W / 2 + 6} 0 L${W / 2} 8 Z`} style={{ fill: "var(--bz-acc)" }} />
      <line x1={W / 2} x2={W / 2} y1="0" y2="22" style={{ stroke: "var(--bz-acc)" }} strokeWidth="2" />
    </svg>
  );
}

// Rüzgâr göstergesi (Seyhun 2026-11-15): halkanın üstü teknenin burnu; mavi ok rüzgârın geldiği yerden içeri. Yanında rüzgâr yönü
// ve burna göre açısı ("27° iskeleden"). Rüzgâr Yönet › Parkur'da girilir
function WindDial({ wind, head }) {
  if (wind == null) return null;
  const r = windRel(wind, head);
  return (
    <div className="bz-wind">
      <svg viewBox="-50 -50 100 100" aria-hidden="true">
        <circle r="44" className="bz-wr" />
        <path d="M0 -44 L0 -35" className="bz-wb" />
        {r && (
          <g transform={`rotate(${r.rel})`}>
            <path d="M0 -47 L0 -13" className="bz-wa" />
            <path d="M-9 -23 L0 -11 L9 -23" className="bz-wa" />
          </g>
        )}
      </svg>
      <div className="bz-wt">
        <b className="num">{wind}°</b>
        {r && (
          <span>
            {r.side ? (
              <>
                <em className="num">{r.deg}°</em> {r.side}
              </>
            ) : r.rel === 0 ? (
              "tam burundan"
            ) : (
              "tam kıçtan"
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// Teknenin kendi konumu (ekranda harita için) ve son 10 dk izi (5 sn'de bir nokta). err: konum alınamıyorsa kısa sebep
// (Seyhun 2026-11-15 Android'de harita/konum boş kaldı: hata sessizce yutuluyordu). Yüksek doğruluk 20 sn'de konum vermezse
// (içeride GPS tutmaz, Google servisi olmayan telefon) düşük doğrulukla (ağ) da denenir.
const noGeo = () => !navigator.geolocation || window.isSecureContext === false;
const GEO_ERR = { 1: "Konum izni verilmedi", 2: "Konum bulunamadı, telefonda konum açık mı?", 3: "Konum bekleniyor…" };
// İzin yoksa kullanıcı uğraşmasın (Seyhun 2026-11-15): "Konum iznini ver" düğmesi izni yeniden ister; telefon artık sormuyorsa
// (kalıcı red) o cihaza göre nereden açılacağı tek satırla yazılır.
function geoHelp() {
  const ua = navigator.userAgent || "";
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const app = !!window.Capacitor?.isNativePlatform?.();
  if (app && ios) return "iPhone Ayarlar › Velora › Konum › Uygulamayı Kullanırken";
  if (app) return "Telefon Ayarlar › Uygulamalar › Velora › İzinler › Konum › İzin ver";
  if (ios) return "iPhone Ayarlar › Gizlilik › Konum Servisleri açık olsun; Safari'de adres çubuğundaki aA › Web Sitesi Ayarları › Konum › İzin Ver";
  return "Adres çubuğunun solundaki simge › İzinler › Konum › İzin ver, sonra sayfayı yenile";
}
function useMyPos(on) {
  const [pos, setPos] = useState({ me: null, trail: [], err: "", denied: false, help: "" });
  const [run, setRun] = useState(0);
  // Düğme: izni dokunuşla yeniden ister; verilirse izleme baştan başlar, yine red gelirse ayar yolu gösterilir
  const ask = () => {
    try {
      navigator.geolocation.getCurrentPosition(
        () => {
          setPos((o) => ({ ...o, err: "", denied: false, help: "" }));
          setRun((n) => n + 1);
        },
        (e) => setPos((o) => (e?.code === 1 ? { ...o, help: geoHelp() } : { ...o, err: GEO_ERR[e?.code] || "Konum alınamadı", denied: false })),
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
      );
    } catch {}
  };
  useEffect(() => {
    if (!on) return;
    if (noGeo()) return;
    let last = 0;
    let got = false;
    const ok = (p) => {
      got = true;
      const me = { lat: p.coords.latitude, lon: p.coords.longitude };
      MYPOS = me;
      const t = Date.now();
      setPos((o) => {
        const add = t - last > 5000;
        if (add) last = t;
        return { me, err: "", trail: add ? [...o.trail.filter((x) => t - x.t < 600e3), { ...me, t }] : o.trail };
      });
    };
    const bad = (e) => !got && setPos((o) => ({ ...o, err: GEO_ERR[e?.code] || "Konum alınamadı", denied: e?.code === 1 }));
    const w1 = navigator.geolocation.watchPosition(ok, bad, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
    let w2 = null;
    const slow = setTimeout(() => {
      if (!got) w2 = navigator.geolocation.watchPosition(ok, bad, { enableHighAccuracy: false, maximumAge: 30000, timeout: 30000 });
    }, 20000);
    return () => {
      clearTimeout(slow);
      navigator.geolocation.clearWatch(w1);
      if (w2 != null) navigator.geolocation.clearWatch(w2);
    };
  }, [on, run]);
  const none = useSyncExternalStore(noSub, noGeo, () => false);
  return none ? { ...pos, err: "Bu tarayıcı konum vermiyor, linki Chrome ya da Safari'de aç", ask } : { ...pos, ask };
}

function GeoAsk({ pos }) {
  return (
    <span className="bz-geo">
      <button type="button" className="bz-geo-b" onClick={pos.ask}>
        Konum iznini ver
      </button>
      {pos.help && <span className="bz-geo-h">{pos.help}</span>}
    </span>
  );
}

// pub: herkese açık linkle (/ekran/{anahtar}) girişsiz açılış; veri kopya belgeden, pusula kaydı yok, geri düğmesi yok
export function BilgiScreen({ pub = "" }) {
  const router = useRouter();
  const { profile } = useAuth();
  const org = pub ? "" : profile?.orgId || "";
  const own = useBilgi(org);
  const ownSes = useBilgiDoc(org, "ses");
  const [pb, pses, porg, pwhy] = usePublic(pub);
  const [who, setWho] = useState(null);
  const b = pub ? pb : own;
  const ses = pub ? pses : ownSes;
  const [on, setOn] = useState(false);
  const [big, setBig] = useState(false);
  const now = useTick(250);
  const h = useHeading(on);
  useRecord(on, org, profile?.uid, profile?.name);
  useWake(on);
  useLock();
  // Kanal: yalnız açık kanala katılınca çalışır; kanal kapanır ya da yenisi açılırsa ekran yeniden katılma kartına döner
  const kanal = b === undefined ? undefined : b?.kanal || null;
  const [joined, setJoined] = useState("");
  const active = on && !!kanal?.open && joined === kanal.id;
  const dev = useSyncExternalStore(noSub, deviceId, () => "");
  const forMe = (x) => x && (!x.to || x.to === dev);
  const myMsg = forMe(b?.msg) ? b.msg : null;
  const mySes = forMe(ses) ? ses : null;
  const fresh = [myMsg, mySes].filter((x) => x?.id && now - x.at < FRESH_MS).sort((x, y) => y.at - x.at)[0];
  usePresence(active, who, pub ? porg : org, pub, profile?.uid, kanal?.id || "", active ? fresh?.id || "" : "");
  const [talk, unlock] = useVoice(active, myMsg, mySes);
  const pos = useMyPos(active);
  const { data: mine } = useCanliRace(active && !!who?.sail, 60e3);
  // Sporcudan Yönet'e bas-konuş (Seyhun 2026-11-17, örnek C): altta ortada mikrofon; basılı tut, konuş, bırakınca Yönet'e gider
  const ptt = usePtt({ send: (blob, sec) => sendGelen(dev, { org: pub ? porg : org, k: pub, ch: kanal?.id || "", sail: who?.sail, name: who?.name, uid: profile?.uid }, blob, sec) });
  const recSec = ptt.rec ? Math.max(0, Math.floor((now - ptt.rec.t0) / 1000)) : 0;

  // Tek dokunuş: pusula izni (iPhone), sesin açılması ve ekranın açık kalması tarayıcının dokunuş istediği işler
  const start = async (w) => {
    setWho(w);
    setJoined(kanal?.id || "");
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") await DeviceOrientationEvent.requestPermission();
    } catch {}
    // Konum izni dokunuşla istensin (bazı tarayıcılar dokunuşsuz isteği göstermiyor)
    try {
      navigator.geolocation?.getCurrentPosition(
        () => {},
        () => {},
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
      );
    } catch {}
    await unlock();
    // Tam ekran yalnız tarayıcıda: uygulamada (iPhone kabuğu, ana ekran uygulaması) iOS üstte site adresli "tam ekran" şeridi gösteriyordu
    // (Seyhun 2026-11-15); uygulama zaten tam ekran
    const app = !!window.Capacitor?.isNativePlatform?.() || window.navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
    if (!app)
      try {
        await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
      } catch {}
    setOn(true);
  };
  const canBack = useSyncExternalStore(noSub, () => window.history.length > 1, () => false);
  const leave = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    router.back();
  };

  const d = new Date(now);
  const night = isNight(d);
  const sv = startView(b?.timer, now);
  const dur = b?.timer?.dur ?? 300;
  const seq = sv.phase === "down" && dur === 300 ? seqMarks(sv.left) : null;
  // Sabit mesaj (Seyhun 2026-11-23): Yönet kaldırana kadar durur; yeni mesaj gelince 1 dk o görünür, sonra sabit geri gelir
  const myPin = forMe(b?.pin) ? b.pin : null;
  const msg = (myMsg && now - myMsg.at < FRESH_MS && myMsg.id !== myPin?.id ? myMsg : null) || myPin;
  const mode = screenMode(sv);
  const show = b?.show || SHOW_DEF;
  useBeeps(on, sv.phase === "down" || sv.phase === "up" ? sv.left : null);
  const compass = (
    <div className="bz-cmp">
      <div className="bz-hd num">{h == null ? "---" : h}°</div>
      <div className="bz-dn num">{h == null ? "" : dirName(h)}</div>
      <Tape h={h} />
    </div>
  );
  const course = buildCourse(b?.parkur);
  const wind = <WindDial wind={course.up} head={h} />;
  // Harita köşede küçük (Seyhun 2026-11-18 örnek B "pusula ortada büyük, konum ek bilgi"): dokununca tam ekran, tekrar dokununca küçülür
  const showMap = mode !== "last" && (mode !== "race" || show.parkur);
  const mapNote = pos.me ? "" : big ? pos.denied ? <GeoAsk pos={pos} /> : pos.err || "Konum bekleniyor…" : pos.denied ? "Konum izni" : "Konum…";
  const map = (
    <div className={`bz-rt${big ? " big" : ""}`} role="button" tabIndex={0} aria-label={big ? "Haritayı küçült" : "Haritayı büyüt"} onClick={(e) => !e.target.closest("button") && setBig((x) => !x)}>
      <CourseMap course={course} me={pos.me} head={h} trail={pos.trail} className="bz-map" note={mapNote} />
    </div>
  );
  const csLine = b?.state ? <div className="bz-cs">{b.state}</div> : null;
  // Kendi sırası, grubu, grubunun startı (Seyhun 2026-11-19 örnek onaylandı): o günün yarışından, yelken numarasıyla; yalnız start öncesi
  const me = mine ? mineOf(mine, who?.sail, now) : null;
  const meLine =
    me && (me.p !== "" || me.g || me.at) ? (
      <div className="bz-me num">
        {me.p !== "" && (
          <span>
            <small>Genel</small>
            <b>
              {`${me.p}${/^\d+$/.test(String(me.p)) ? "." : ""}`}
              {me.n ? <em>/{me.n}</em> : null}
            </b>
          </span>
        )}
        {me.g && (
          <span>
            <small>{me.gday === "Bugün" ? "Grup" : me.gday}</small>
            <b>
              <i style={{ background: groupColor(me.g) || "#ffd23f" }} aria-hidden="true" />
              {me.g}
            </b>
          </span>
        )}
        {me.at && (
          <span>
            <small>{me.now ? "Yarışta" : "Start"}</small>
            <b>{me.at}</b>
          </span>
        )}
      </div>
    ) : null;

  return (
    <main className={`bz${active ? " bz-pton" : ""}${showMap ? " bz-mapon" : ""}${night ? "" : " bz-day"} bz-m-${mode}${mode === "pre" && sv.phase !== "none" ? " bz-cnt" : ""}`} data-bilgi>
      {!pub && (
        <button type="button" className="bz-back" onClick={leave} aria-label="Geri">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      {talk && (
        <span className="bz-talk" role="status">
          Yönet
          <Wave />
        </span>
      )}
      {active && ptt.rec && <PttCancel on={!!ptt.rec.cancel} className="bz-pcx" />}
      {active && (
        <button
          type="button"
          className="bz-ptt"
          data-rec={ptt.rec ? "1" : undefined}
          data-cancel={ptt.rec?.cancel ? "1" : undefined}
          data-ok={ptt.done && now - ptt.done.at < 2000 ? "1" : undefined}
          aria-label="Bas konuş"
          onPointerDown={(e) => ptt.begin(e, "y", null)}
          onPointerMove={ptt.move}
          onPointerUp={ptt.end}
          onPointerCancel={ptt.end}
          onContextMenu={(e) => e.preventDefault()}
        >
          {ptt.rec ? (
            <b className="num">{ptt.rec.cancel ? "✕" : recSec}</b>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          )}
        </button>
      )}
      {mode === "last" && (
        <div className="bz-last">
          <div className="bz-lm num">{sv.txt}</div>
          {b?.label && <div className="bz-ll">{b.label}</div>}
        </div>
      )}
      {mode === "race" && (
        <>
          {/* Start sonrası (Seyhun 2026-11-15): üst yarı büyük pusula (+ rüzgâr), alt yarı harita; en altta solda akan süre, sağda saat */}
          <div className="bz-top">
            {show.pusula && compass}
            {show.ruzgar && wind}
            {show.parkur && csLine}
          </div>
          {(show.sure || show.saat) && (
            <div className="bz-foot num">
              <span>
                {show.sure && sv.txt}
                {show.sure && b?.label && <small>{b.label}</small>}
              </span>
              {show.saat && (
                <span className="bz-fclk" aria-label="Saat">
                  {pad(d.getHours())}:{pad(d.getMinutes())}
                </span>
              )}
            </div>
          )}
        </>
      )}
      {mode === "pre" && (
        <>
          {compass}
          {wind}
          {csLine}
          {meLine}
          {sv.phase !== "none" && (
            <div className="bz-tm">
              {seq && (
                <div className="bz-seq">
                  {seq.map((x) => (
                    <div key={x.m} className={x.on ? "on" : x.done ? "done" : ""}>
                      {x.m}
                    </div>
                  ))}
                </div>
              )}
              <div className="bz-cd num">{sv.txt}</div>
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
            </div>
          )}
        </>
      )}
      {msg && (
        <div className="bz-msg" role="status">
          <time className="num">
            {pad(new Date(msg.at).getHours())}:{pad(new Date(msg.at).getMinutes())}
          </time>
          <p>
            {(msg === myPin || msg.to) && <em>{[msg === myPin ? "Sabit" : "", msg.to ? "Sana" : ""].filter(Boolean).join(" · ")}</em>}
            {msg.text}
          </p>
        </div>
      )}
      {mode !== "race" && (
        <span className="bz-clk num" aria-label="Saat">
          {pad(d.getHours())}:{pad(d.getMinutes())}
        </span>
      )}
      {showMap && map}
      {!active && <StartCard onGo={start} onClose={!pub || canBack ? leave : null} kanal={kanal} why={pub ? pwhy : ""} />}
    </main>
  );
}
