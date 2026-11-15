"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { sunsetHM } from "@/lib/attRemind";
import { FRESH_MS, SHOW_DEF, beepOf, courseOf, dirName, normDeg, pFlag, screenMode, seqMarks, startView, tiltHeading } from "@/lib/bilgi";
import { deviceId, readWho, savePusula, saveWho, sendPos, useBilgi, useBilgiDoc, usePublic } from "./bilgiStore";
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
function useHeading(on) {
  const [h, setH] = useState(null);
  const last = useRef({ t: 0, h: null, x: 0, y: 0, off: null });
  useEffect(() => {
    if (!on) return;
    const L = last.current;
    const take = (deg, e) => {
      if (deg == null || !Number.isFinite(deg)) return;
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

// Tekne konumu: ekran açıkken GPS izlenir, 5 sn'de bir yazılır; tekne durgunsa (10 m'den az kıpırdadı) 30 sn'de bir.
// Belge: bilgiTekne/{cihaz} { org, k (açık link anahtarı), sail, name, lat, lon, spd (kn), hdg, acc, t, uid }
const metres = (a, b) => {
  const r = Math.PI / 180;
  const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  return Math.hypot(x, (b.lat - a.lat) * r) * 6371e3;
};
// Kanaldaki varlık + konum (tek belge bilgiTekne/{cihaz}): GPS varsa 5 sn'de bir (durgunsa 30 sn), yoksa 30 sn'de bir konumsuz.
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
    const id = setInterval(() => {
      const c = fix && Date.now() - fix.timestamp < 20000 ? fix.coords : null;
      const age = sent ? Date.now() - sent.t : Infinity;
      if (c && sent?.lat != null && metres(sent, { lat: c.latitude, lon: c.longitude }) < 10 && age < 30000) return;
      if (!c && age < 30000) return;
      write();
    }, 5000);
    return () => {
      S0.kick = null;
      if (w != null) navigator.geolocation.clearWatch(w);
      clearInterval(id);
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
function StartCard({ onGo, kanal }) {
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
  if (raw === null || kanal === undefined) return <div className="bz-go" />;
  if (!kanal?.open)
    return (
      <div className="bz-go">
        <div className="bz-card bz-none">Kanal açık değil</div>
      </div>
    );
  return (
    <div className="bz-go">
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
      <text x="250" y="118" className="bz-wd">
        — °
      </text>
    </svg>
  );
}

// pub: herkese açık linkle (/ekran/{anahtar}) girişsiz açılış; veri kopya belgeden, pusula kaydı yok, geri düğmesi yok
export function BilgiScreen({ pub = "" }) {
  const router = useRouter();
  const { profile } = useAuth();
  const org = pub ? "" : profile?.orgId || "";
  const own = useBilgi(org);
  const ownSes = useBilgiDoc(org, "ses");
  const [pb, pses, porg] = usePublic(pub);
  const [who, setWho] = useState(null);
  const b = pub ? pb : own;
  const ses = pub ? pses : ownSes;
  const [on, setOn] = useState(false);
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

  // Tek dokunuş: pusula izni (iPhone), sesin açılması ve ekranın açık kalması tarayıcının dokunuş istediği işler
  const start = async (w) => {
    setWho(w);
    setJoined(kanal?.id || "");
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") await DeviceOrientationEvent.requestPermission();
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
  const leave = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    router.back();
  };

  const d = new Date(now);
  const night = isNight(d);
  const sv = startView(b?.timer, now);
  const dur = b?.timer?.dur ?? 300;
  const seq = sv.phase === "down" && dur === 300 ? seqMarks(sv.left) : null;
  const msg = myMsg && now - myMsg.at < FRESH_MS ? myMsg : null;
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
  const course = (
    <div className="bz-rt">
      <Course kind={b?.course} />
      {b?.state && <div className="bz-cs">{b.state}</div>}
    </div>
  );

  return (
    <main className={`bz${night ? "" : " bz-day"} bz-m-${mode}`} data-bilgi>
      {!pub && (
        <button type="button" className="bz-back" onClick={leave} aria-label="Geri">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      {talk && (
        <span className="bz-talk" aria-label="Konuşuyor">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </span>
      )}
      {mode === "last" && (
        <div className="bz-last">
          <div className="bz-lm num">{sv.txt}</div>
          {b?.label && <div className="bz-ll">{b.label}</div>}
        </div>
      )}
      {mode === "race" && (
        <>
          <div className="bz-race">
            {show.pusula && compass}
            {show.ruzgar && (
              <div className="bz-wn num">
                0<small>kn</small>
              </div>
            )}
          </div>
          {show.parkur && course}
          {show.sure && (
            <div className="bz-mini num">
              {sv.txt}
              {b?.label && <span>{b.label}</span>}
            </div>
          )}
        </>
      )}
      {mode === "pre" && (
        <>
          {compass}
          {course}
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
            {msg.to && <em>Sana</em>}
            {msg.text}
          </p>
        </div>
      )}
      {(mode !== "race" || show.saat) && (
        <span className="bz-clk num" aria-label="Saat">
          {pad(d.getHours())}:{pad(d.getMinutes())}
        </span>
      )}
      {!active && <StartCard onGo={start} kanal={kanal} />}
    </main>
  );
}
