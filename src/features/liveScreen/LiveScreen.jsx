"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apText, trHm, nextRaceNo, cleanPlan, daysUntil, orangeUp, raceDays, dirShort, livePhase, planLabel, planStartMs, raceName, raceTime, raceTitle, seqState, seqSteps, windByHour, windPoints, bestOffset } from "@/lib/raceLive";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { CARD_TYPES, cleanCourse, lineBias, selCard } from "@/lib/raceCourse";
import { cleanRoute, routeText, sceneSvg } from "@/lib/courseScene";
import { gapAt, leaderAt, manualFinish, markLabel, markName, nowPos, officialFor, prepName, rankMove, sameSail, SHOW_ON, shortClub, shortName, showSlide, standings, whoBySail, whoOf, screenUrl, ytSrc } from "@/lib/raceRounds";
import { groupColor, onlyCat, provisional } from "@/lib/roundScore";
import { useDemo } from "./demo";
import { useVisit } from "./useVisit";
import { dayProgram, expText, expWind } from "./program";
import { agendaView } from "@/lib/raceProgram";
import { autoCaption } from "@/lib/raceCaption";
import "./liveScreen.css";

// Herkese açık canlı yarış ekranı (/canli/<yarış>, Seyhun 2026-11-01; yayın görünümü 2026-11-02 SailGP örneği, project-files/samandira-donus/yayin4).
// Arka plan tam ekran: ekranda canlı yayın ya da tekrar varsa video, yoksa deniz zemini. Üstüne köşelerde ince paneller (Backdrop, Panel…):
// sol üst günün yarışının sıralaması (sıra, yelken, kısa ad, kulüp kısaltması; dokununca şamandıra şamandıra tam tablo), üst orta yarış adı + mesaj
// ("2. şamandıra lideri", tehir), sağ üst parkur, sol alt rüzgâr, alt orta sayaç ve bayraklar, sağ alt sıradaki start + genel ilk 5.
// Üç evre (lib/raceLive.js livePhase): yarış öncesi (bugünün startları, ilk start'a geri sayım, günün rüzgâr tahmini), yarış, gün sonu (yarışlar, birinciler, genel).
// Grup grup yarışta (Mavi, Sarı…) startın grubu ve aynı yarışın diğer grupları. Resmî sonuç (PDF) gelince liste ondan. Önceki yarışlar ?y=<start>.
const POLL = 4000;
const GONE_MS = 6000; // kaldırılan yarışın linki bu kadar sonra /canli sayfasına geçer
const pad = (n) => String(n).padStart(2, "0");
const clockOf = (sec) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};
const hmOf = (iso) => (iso ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "");
const dayText = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");
const trDay = (ms) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10); // Türkiye günü (sunucudaki gibi)
// Ekranın günü: sunucu "yeni güne geçer" saatinden sonra yarını gönderir (data.see)
const seeDay = (data, ms) => (data?.see && data.see > trDay(ms) ? data.see : trDay(ms));

// Sunucudan gelen her alan eksik olabilir (Seyhun 2026-11-02 çökme "reading 'status'"): ekranın okuduğu alanlar boş değerle doldurulur
const arr = (v) => (Array.isArray(v) ? v : []);
export const fillData = (j) => ({
  ...j,
  plan: cleanPlan(j.plan),
  starts: arr(j.starts),
  media: arr(j.media),
  wind: arr(j.wind),
  entries: arr(j.entries),
  fleets: arr(j.fleets),
  rounds: j.rounds && typeof j.rounds === "object" ? j.rounds : {},
});

// Logo kaldırıldı (Seyhun 2026-11-01 "herkese açık sayfadaki logoyu da kaldır"); başlık en solda
function useData(id, y) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const skew = useClockSync(!!id);
  useEffect(() => {
    if (!id) return undefined; // örnek yarış (/canli/ornek) sunucuya sormaz
    let on = true;
    let t = 0;
    const load = async () => {
      clearTimeout(t);
      if (document.hidden) return (t = setTimeout(load, POLL));
      try {
        const res = await fetch(`/api/canli?id=${encodeURIComponent(id)}${y ? `&y=${encodeURIComponent(y)}` : ""}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!on) return;
        // Yarım/boş yanıt (yayın sırasında eski sürüm, kesilen bağlantı) ekranı çökertmez: race yoksa hata sayılır, plan her zaman dolu
        if (res.ok && j?.race) {
          setData(fillData(j));
          setErr("");
        } else setErr(j?.error || "fail");
      } catch {
        if (on) setErr((e) => e || "net");
      }
      if (on) t = setTimeout(load, POLL);
    };
    load();
    const vis = () => !document.hidden && load();
    document.addEventListener("visibilitychange", vis);
    return () => {
      on = false;
      clearTimeout(t);
      document.removeEventListener("visibilitychange", vis);
    };
  }, [id, y]);
  return { data, err, skew };
}

// Saat eşleme (Seyhun 2026-11-02 "sayılar şaşıyor, 57 56 57 55"): eskiden her 4 sn'lik veri yanıtındaki sunucu saati farkı
// yeniden alınıyordu; yanıt CDN önbelleğinden 2-4 sn eski gelebildiği için fark her seferinde değişiyor, sayaç geri gidiyordu.
// Şimdi yayın saatleri gibi (NTP): önbelleksiz ayrı saat isteği (?saat=1), 3 deneme, en kısa gidiş-dönüşlü olanın ortası alınır;
// 10 dakikada bir tazelenir, ufak farkta (< 0,5 sn) dokunulmaz. Sayaç cihaz saatine değil tekdüze saate (performance.now) bağlı:
// cihazın saati değişse de geri gitmez. Start, bitiş gibi anlar veriyle bir kez gelir; saniyeler cihazda sayılır.
const mono = () => (typeof performance !== "undefined" && performance.timeOrigin ? performance.timeOrigin + performance.now() : Date.now());
function useClockSync(on) {
  const off = useRef(0);
  const synced = useRef(false);
  useEffect(() => {
    if (!on) return undefined;
    let live = true;
    let t = 0;
    const sync = async () => {
      const samples = [];
      for (let i = 0; i < 3 && live; i++) {
        try {
          const t0 = mono();
          const res = await fetch(`/api/canli?saat=1&r=${Math.random().toString(36).slice(2)}`, { cache: "no-store" });
          const j = await res.json();
          samples.push({ t0, t1: mono(), server: +j.now });
        } catch {
          /* ağ yoksa eski fark kalır */
        }
      }
      const b = bestOffset(samples);
      if (live && b && (!synced.current || Math.abs(b.off - off.current) >= 500)) off.current = b.off;
      if (b) synced.current = true;
      if (live) t = setTimeout(sync, synced.current ? 10 * 60e3 : 15e3);
    };
    sync();
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [on]);
  return off;
}
function useNow(skew, ms = 250) {
  const [now, setNow] = useState(() => mono());
  useEffect(() => {
    const t = setInterval(() => setNow(mono()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return Math.round(now + (skew.current || 0));
}

// Sayaç: start öncesi geri sayım, startan sonra geçen süre, bitince yarışın süresi
// Start dizisindeki bayraklar (Seyhun 2026-11-01): Uyarı'da sınıf bayrağı (Optimist, ILCA 4…), Hazırlık'ta seçilen bayrak (P, I, Z, U, Kara).
// Son dakikada hazırlık bayrağı iner (soluklaşır), startla sınıf bayrağı iner.
// Panel girip çıkarken yumuşak geçiş (Seyhun 2026-11-02 "animasyonla geçiş"): açılınca "in", kapanınca ms boyunca "out", sonra kaldırılır
function useFade(on, ms = 500) {
  const [gone, setGone] = useState(!on);
  const [prev, setPrev] = useState(on);
  if (on !== prev) {
    setPrev(on);
    if (on) setGone(false);
  }
  useEffect(() => {
    if (on) return undefined;
    const t = setTimeout(() => setGone(true), ms);
    return () => clearTimeout(t);
  }, [on, ms]);
  return on ? "in" : gone ? "" : "out";
}

// Sınıf bayrağı (Seyhun 2026-11-02 "mavi grupsa mavi bayrağın üstünde Optimist işareti"): grup renginde zemin, ortada sınıfın işareti
// (beyaz daire içinde; gerçek sınıf işaretleri gelene kadar sade yelken + sınıf kısaltması). Grup yoksa beyaz zemin.
const CLASS_SHORT = (cls) => (/^opti/i.test(cls) ? "OPTİ" : /^ilca\s*(\d)/i.test(cls) ? `ILCA ${/^ilca\s*(\d)/i.exec(cls)[1]}` : String(cls || "").slice(0, 5).toUpperCase());
// Bayrak zemininde okunur yazı/işaret rengi: açık zeminde (sarı, beyaz) koyu, koyuda beyaz
const inkOn = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.6 ? "#111" : "#fff";
};
function Flag({ kind, cls, down, grp }) {
  const c = `lv-flag${down ? " down" : ""}`;
  if (kind === "cls")
    return (
      <span className={`${c} cls${grp ? " g" : ""}${/^opti/i.test(cls) ? " opti" : ""}`} style={{ background: grp ? groupColor(grp) : "#fff", color: inkOn(grp ? groupColor(grp) : "#fff") }}>
        {/^opti/i.test(cls) ? (
          // Optimist sınıf işareti (Seyhun 2026-11-02 gönderdi, yayin-tasarim/sinif/optimist-isaret.png): halka ve içinden aşağı uzanan I; grup renginin üstünde
          <svg viewBox="0 0 60 40" aria-label="Optimist">
            <circle cx="30" cy="15.4" r="11.2" fill="none" stroke="currentColor" strokeWidth="2.6" />
            <path d="M27.1 14.6 L32.9 14.6 Q31.35 15.4 31.3 16.9 L31.3 35.2 Q31.35 36.6 32.9 37.4 L27.1 37.4 Q28.65 36.6 28.7 35.2 L28.7 16.9 Q28.65 15.4 27.1 14.6 Z" fill="currentColor" />
          </svg>
        ) : (
          <b>{CLASS_SHORT(cls)}</b>
        )}
      </span>
    );
  if (kind === "P") return <span className={`${c} p`} />;
  if (kind === "I") return <span className={`${c} i`} />;
  if (kind === "U") return <span className={`${c} u`} />;
  if (kind === "Z")
    return (
      <span className={`${c} z`}>
        <svg viewBox="0 0 30 20" preserveAspectRatio="none">
          <path d="M0 0 L15 10 L0 20 Z" fill="#111" />
          <path d="M0 0 L30 0 L15 10 Z" fill="#f5c400" />
          <path d="M30 0 L30 20 L15 10 Z" fill="#1b4fd6" />
          <path d="M0 20 L30 20 L15 10 Z" fill="#e11d48" />
        </svg>
      </span>
    );
  if (kind === "Kara") return <span className={`${c} black`} />;
  if (kind === "AP") return <span className={`${c} ap`} />;
  if (kind === "FS")
    return (
      <span className={`${c} fs`}>
        <svg viewBox="0 0 30 20" preserveAspectRatio="none">
          <path d="M0 0 L30 0 L15 10 Z" fill="#1b4fd6" />
          <path d="M0 20 L30 20 L15 10 Z" fill="#1b4fd6" />
          <path d="M0 0 L0 20 L15 10 Z" fill="#f5c400" />
          <path d="M30 0 L30 20 L15 10 Z" fill="#f5c400" />
        </svg>
      </span>
    );
  if (kind === "N") return <span className={`${c} n`} />;
  return null;
}
// Geçersiz startın bayrağı (Seyhun 2026-11-02 "genel geri bayrağı, tehir bayrağı görseli"): Tehir → AP, Genel geri çağırma → 1. tekrar, İptal → N
const voidFlag = (v) => (/tehir/i.test(v || "") ? "AP" : /genel/i.test(v || "") ? "FS" : /abandone|iptal/i.test(v || "") ? "N" : "");


// Sayaç: ekranın alt ortasında şerit (SailGP örneğindeki "EVENT WINNER" kutusu gibi): üstte evre ve start saati, ortada büyük sayı,
// altında bayraklar (sınıf, hazırlık) ve dakika adımları. Bekleme evresinde ilk start'a, yarışta start'a / start'tan beri, biten yarışta süre.
function clockState({ sel, isCur, timer, now, entry, data, today }) {
  let label = "";
  let value = "--:--";
  let rem = null;
  let right = sel?.at ? `Start ${hmOf(sel.at)}` : "";
  const running = timer?.end != null && timer.mode === "start";
  if (isCur && running && now < timer.end) {
    rem = (timer.end - now) / 1000;
    label = "Start'a";
    value = clockOf(Math.ceil(rem));
    right = `Start ${hmOf(new Date(timer.end).toISOString())}`;
  } else if (isCur && timer?.end == null && timer?.left != null && timer.mode === "start") {
    rem = timer.left;
    label = "Durdu";
    value = clockOf(timer.left);
  } else if (isCur && running && !sel?.at) {
    // 0'dan sonra start kaydı henüz yazılmadıysa da sayaçtan ileri sayar, durdurulana kadar (Seyhun 2026-11-01 "geri sayım bitince ileri devam etsin")
    label = "Start'tan beri";
    value = clockOf(Math.min(4 * 3600, (now - timer.end) / 1000));
    right = `Start ${hmOf(new Date(timer.end).toISOString())}`;
    rem = 0;
  } else if (sel?.void) {
    label = sel.void;
    value = "—";
    right = sel.fin ? `${voidShort(sel.void)} ${hmOf(sel.fin)}` : ""; // eski start saati değil (Seyhun 2026-11-02)
  } else if (sel?.fin) {
    label = "Süre";
    value = raceTime(sel) || "--:--";
    right = `${right} · Bitti`;
  } else if (sel?.at) {
    const at = Date.parse(sel.at);
    if (now < at) {
      rem = (at - now) / 1000;
      label = "Start'a";
      value = clockOf(Math.ceil(rem));
    } else {
      label = "Start'tan beri";
      value = clockOf(Math.min(4 * 3600, (now - at) / 1000));
      rem = 0;
    }
  } else if (data) {
    // yarış evresinde start kaydı ve sayaç yoksa: planın ilk start saatine
    const plan = data.plan;
    const ms = planStartMs(plan, today);
    const pick = plan.status === "done" && plan.next ? plan.next : { day: plan.day, at: plan.at };
    const nextDay = pick.day > today;
    if (ms && ms > now) {
      rem = (ms - now) / 1000;
      label = plan.status === "ap" ? "Ertelenen start'a" : nextDay ? "Yarın ilk start'a" : "İlk start'a";
      value = clockOf(Math.ceil(rem));
      right = plan.status === "ap" ? apText(plan) : `${nextDay ? dayText(pick.day) : "Bugün"} ${pick.at}`;
    } else label = plan.status === "ap" ? "Start ertelendi" : "Start bekleniyor";
  }
  return { label: label || "Start bekleniyor", value, rem, right };
}
// Start bayrakları (Seyhun 2026-11-02 "startta yarış bayraklarını göster; yönetimde seçtiğim sınıf ve kural bayrakları"):
// sınıf bayrağı grup renginde (uyarıda çekilir, startta iner), hazırlık bayrağı P / I / U / Z / Kara (son dakikada iner)
function startFlags(entry, started, lastMin) {
  const cls = entry?.cls || "", prep = entry?.prep || "", grp = entry?.grp || "";
  return [cls || grp ? { kind: "cls", cls: cls || "Sınıf", grp, down: started, name: [cls, grp ? `${grp} grup` : ""].filter(Boolean).join(" · ") } : null, prep ? { kind: prep, down: lastMin, name: prepName(prep) } : null].filter(Boolean);
}
function FlagRow({ flags }) {
  if (!flags.length) return null;
  return (
    <div className="lv-flags">
      {flags.map((f) => (
        <span key={f.kind} className={`lv-fl${f.down ? " down" : ""}`}>
          <Flag {...f} />
          <small>{f.name}</small>
        </span>
      ))}
    </div>
  );
}
function Clock({ sel, isCur, timer, skew, entry, data, today }) {
  const now = useNow(skew);
  const { label, value, rem, right } = clockState({ sel, isCur, timer, now, entry, data, today });
  const steps = seqSteps(timer?.dur || 300);
  const st = rem == null ? steps.map(() => (sel?.at && !sel.void ? "done" : "")) : seqState(steps, rem, true);
  if (rem === 0 || (rem == null && sel?.at && !sel.void)) st[st.length - 1] = "now";
  const started = rem === 0 || (rem == null && !!sel?.at && !sel.void);
  const lastMin = started || (rem != null && rem <= 60);
  const flags = startFlags(entry, started, lastMin);
  return (
    <div className="lv-pill lv-cd">
      <div className="lv-pillh">
        <span>{label}</span>
        <span>{right}</span>
      </div>
      <div className="lv-clock">{value}</div>
      {flags.length || (rem != null && (timer?.mode === "start" || sel?.at)) ? (
        <div className="lv-pillf">
          {flags.map((f) => (
            <span key={f.kind} className={`lv-fl${f.down ? " down" : ""}`}>
              <Flag {...f} />
              <small>{f.name}</small>
            </span>
          ))}
          {timer?.mode === "start" || sel?.at ? (
            <span className="lv-seq">
              {steps.map((x, i) => (
                <i key={x.m} className={st[i]}>
                  {x.m}
                </i>
              ))}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}


// Parkur panelinin başlığındaki rota: "1 · 4 · 1 · 2 · 3 · Finish"

// Zemin (Seyhun 2026-11-01 "koyuluktan açıklığa, yarış parkuru havası"): üstte açık deniz mavisi, altta koyu lacivert; arkada soluk bir
// parkur (şamandıralar, kesik rota, start hattı) ve dalga dokusu. Yazılar öne çıksın diye hepsi çok soluk.
// Zemin: açıktan koyuya deniz, çok soluk dalga deseni; parkur çizgisi kaldırıldı (Seyhun 2026-11-01 "dandik parkur gibi")
// Video yokken arkada soluk yarış fotoğrafı (Seyhun 2026-11-02 "video yoksa arkada güzel bir yarış fotoğrafı, soluk"); dosya yoksa
// yalnız deniz rengi kalır (CSS arka planı, kırık resim görünmez). Video gelince video, duraklatılınca da o video görünür.
// Seyhun 2026-11-02 seçti (sail-world.com Optimist fotoğrafı; sunucumuza indirilemedi, tarayıcı doğrudan oradan yükler)
export const BG_PHOTO = "https://www.sail-world.com/photos/optimist/yysw256373.jpg";
export function Sea({ photo = "" }) {
  return (
    <div className={`lv-sea${photo ? " photo" : ""}`} aria-hidden="true">
      {photo ? <div className="lv-photo" style={{ backgroundImage: `url(${photo})` }} /> : null}
      <svg viewBox="0 0 1600 900" preserveAspectRatio="none">
        <defs>
          <pattern id="lvw" width="220" height="46" patternUnits="userSpaceOnUse">
            <path d="M0 19 Q40 4 80 19 T160 19" fill="none" stroke="#bfe6f7" strokeWidth="1.6" opacity=".5" />
            <path d="M0 34 Q40 19 80 34 T160 34" fill="none" stroke="#bfe6f7" strokeWidth=".8" opacity=".3" />
          </pattern>
          <radialGradient id="lvm" cx="55%" cy="35%" r="75%">
            <stop offset="0" stopColor="#fff" stopOpacity=".9" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="lvk">
            <rect width="1600" height="900" fill="url(#lvm)" />
          </mask>
        </defs>
        <rect width="1600" height="900" fill="url(#lvw)" mask="url(#lvk)" />
      </svg>
    </div>
  );
}


// sağanak, 3 saatte bir saat ve yön, start saati işaretli, şimdi beyaz çizgi
// Gerçekleşen rüzgâr (istasyon, fc.obs) açık mavi alan ve çizgi tahminin üstünde; bizim ölçümlerimiz (mine: parkur rüzgâr kayıtları) beyaz nokta
function WindDay({ fc, now, at, mine = [], mini = false }) {
  const rows = (fc?.rows || []).filter((r) => +r.hh >= 6 && +r.hh <= 20);
  if (rows.length < 2) return null;
  const W = 720;
  const H = 150;
  const T = 26;
  const B = 24;
  const top = Math.max(15, Math.ceil((Math.max(...rows.map((r) => r.gust ?? r.wind)) + 2) / 5) * 5);
  const x = (i) => 8 + (i * (W - 16)) / (rows.length - 1);
  const y = (v) => T + (1 - v / top) * (H - T - B);
  const xh = (hh, mm = 0) => {
    const i = rows.findIndex((r) => +r.hh === hh);
    return i < 0 ? null : x(Math.min(rows.length - 1, i + mm / 60));
  };
  const line = (key) => rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(r[key] ?? r.wind).toFixed(1)}`).join("");
  const area = `${line("wind")}L${x(rows.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const tr = new Date(now + 3 * 3600e3);
  const nowX = xh(tr.getUTCHours(), tr.getUTCMinutes());
  const startX = at ? xh(+at.slice(0, 2), +at.slice(3)) : null;
  const OBS = "#8fd6ff";
  const got = (fc?.obs || []).map((o) => ({ ...o, i: rows.findIndex((r) => r.hh === o.hh) })).filter((o) => o.i >= 0 && o.wind != null);
  const oLine = got.map((o, k) => `${k ? "L" : "M"}${x(o.i).toFixed(1)},${y(o.wind).toFixed(1)}`).join("");
  const dots = (mine || [])
    .filter((m) => m.kn != null && m.at)
    .map((m) => {
      const d = new Date(Date.parse(m.at) + 3 * 3600e3);
      return { px: xh(d.getUTCHours(), d.getUTCMinutes()), py: y(m.kn) };
    })
    .filter((m) => m.px != null);
  const atRow = at ? rows.find((r) => r.hh === at.slice(0, 2)) : null;
  const lo = Math.min(...rows.map((r) => r.wind));
  const hi = Math.max(...rows.map((r) => r.wind));
  return (
    <div className={`lv-fc${mini ? " mini" : ""}`}>
      <div className="lv-lab">
        <span>Gün boyu</span>
        <span>{atRow ? `Start'ta ${dirShort(atRow.dir)} ${atRow.wind} kn, sağanak ${atRow.gust ?? atRow.wind}` : `${lo}–${hi} kn`}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {[5, 10, 15, 20, 25, 30].filter((v) => v < top && (top <= 30 || v % 10 === 0)).map((v) => (
          <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="#fff" strokeOpacity=".1" />
        ))}
        <path d={area} fill="#fff" fillOpacity=".16" />
        {got.length > 1 ? <path d={`${oLine}L${x(got.at(-1).i)},${y(0)}L${x(got[0].i)},${y(0)}Z`} fill={OBS} fillOpacity=".22" /> : null}
        {got.length > 1 ? <path d={oLine} fill="none" stroke={OBS} strokeWidth="2.5" strokeLinejoin="round" /> : got.length ? <circle cx={x(got[0].i)} cy={y(got[0].wind)} r="4" fill={OBS} /> : null}
        <path d={line("wind")} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" strokeOpacity={got.length ? 0.6 : 1} />
        <path d={line("gust")} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="5 5" strokeLinejoin="round" />
        {startX != null ? <line x1={startX} x2={startX} y1={T - 8} y2={H - B} stroke="var(--lv-acc)" strokeWidth="2.5" /> : null}
        {nowX != null ? <line x1={nowX} x2={nowX} y1={T - 8} y2={H - B} stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" /> : null}
        {dots.map((d, k) => (
          <circle key={k} cx={d.px} cy={d.py} r="4.5" fill="#fff" stroke="var(--lv-ink)" strokeWidth="2" />
        ))}
        {/* her saat yön oku (hava durumu sayfasındaki gibi): ölçülen saat mavi ve koyu, tahmin soluk beyaz */}
        {rows.map((r, i) => {
          const o = got.find((g) => g.i === i);
          return (
            <g key={`a${r.hh}`} transform={`translate(${x(i)} 12) rotate(${o?.dir ?? r.dir ?? 0})`}>
              <path d="M0 -6 L4 4 L0 2 L-4 4 Z" fill={o ? OBS : "#fff"} fillOpacity={o ? 1 : got.length ? 0.45 : 0.8} />
            </g>
          );
        })}
        {rows.map((r, i) =>
          +r.hh % 3 === 0 ? (
            <g key={r.hh}>
              <text x={x(i)} y={H - 6} fill="#fff" fillOpacity=".7" fontSize="13" textAnchor="middle">{`${+r.hh}`}</text>
              <text x={x(i)} y={y(r.wind) - 10} fill="#fff" fontSize="13" fontWeight="700" textAnchor="middle">{r.wind}</text>
            </g>
          ) : null,
        )}
      </svg>
      <div className="lv-sumt">
        {/* açıklama: renkli işaretlerle beklenen (tahmin) ve gerçekleşen (istasyon) (Seyhun 2026-11-02 "beklenti ve gerçekleşen, hava durumundaki gibi") */}
        <span className="lv-leg">
          <i className="f" />
          Beklenen
          {got.length ? (
            <>
              <i className="o" />
              {`Gerçekleşen${fc.station ? ` · ${fc.station}` : ""}`}
            </>
          ) : null}
          {dots.length ? (
            <>
              <i className="m" />
              Bizim ölçüm
            </>
          ) : null}
        </span>
        {at ? <span className="lv-acc">{`Start ${at}`}</span> : null}
      </div>
    </div>
  );
}



const Dot = ({ g }) => (g ? <span className="lv-dot" style={{ background: groupColor(g) || "var(--lv-mut)" }} aria-hidden="true" /> : null);

// Aynı yarışın diğer grupları (Mavi 3. yarış, Sarı 3. yarış…: aynı gün, aynı yarış numarası) ve aynı anda süren öbür startlar
// (Seyhun 2026-11-02 inceleme: Mavi sürerken Sarı start alınca Mavi ekrandan düşmesin)
const grpOf = (data, x) => x?.grp || data.rounds?.[x?.id]?.grp || "";
function Siblings({ data, sel, id }) {
  const today = data.now ? seeDay(data, data.now) : sel?.day || "";
  const sib = (data.starts || []).filter((x) => !x.void && x.day === sel?.day && ((x.n === sel?.n && grpOf(data, x)) || (!x.fin && x.day === today && x.id !== sel?.id && !sel?.fin)));
  if (!sib.some((x) => x.id !== sel?.id)) return null;
  if (!sib.some((x) => x.id === sel?.id) && sel) sib.push(sel);
  sib.sort((a, b) => a.at.localeCompare(b.at));
  return (
    <span className="lv-chips">
      {sib.map((x) => {
        const g = grpOf(data, x) || raceName(x);
        return (
          <Link key={x.id} href={x.id === data.cur ? `/canli/${id}` : `/canli/${id}?y=${x.id}`} className={`lv-btn${x.id === sel.id ? " on" : ""}`}>
            <Dot g={g} />
            {g}
          </Link>
        );
      })}
    </span>
  );
}


function Ranking({ data, sel, isCur, id }) {
  const entry = data.rounds?.[sel?.id] || { route: [], legs: [] };
  // ad ve kulüp: önce kayıt listesinden, yoksa sonuç PDF'lerinden
  const who = { ...whoBySail(data.fleets), ...Object.fromEntries((data.entries || []).map((r) => [r.sail, { name: r.name, club: r.club }])) };
  const st = standings(entry);
  const groups = sel?.n ? officialFor(data.fleets, sel.n, manualFinish(entry)) : [];
  const [gk, setGk] = useState("");
  const g = groups.find((x) => x.key === gk) || groups[0];
  const pos = nowPos(entry);
  const route = entry.route || [];
  const last = isCur && pos >= 0 ? entry.legs[pos].at(-1) : "";
  const ranksOf = (sail) => st.find((x) => sameSail(x.sail, sail))?.ranks || [];
  const name = (s) => whoOf(who, s);
  const cols = route.map((m, k) => (
    <th key={k} className={`m${!g && isCur && k === pos ? " now" : ""}`}>
      {markLabel(m)}
    </th>
  ));
  return (
    <div className="lv-card lv-rank">
      <div className="lv-lab">
        <span className="lv-row">
          {entry.grp ? (
            <>
              <Dot g={entry.grp} />
              {`${entry.grp} grup`}
            </>
          ) : (
            "Sıralama"
          )}{" "}
          {g ? <span className="lv-tag ok">Resmî</span> : st.length ? <span className="lv-tag acc">Geçici</span> : null}
        </span>
        {!groups.length ? <Siblings data={data} sel={sel} id={id} /> : null}
        {groups.length > 1 ? (
          <span className="lv-chips">
            {groups.map((x) => (
              <button key={x.key} type="button" className={`lv-btn${x.key === g.key ? " on" : ""}`} onClick={() => setGk(x.key)}>
                {x.label}
              </button>
            ))}
          </span>
        ) : null}
      </div>
      <table>
        <thead>
          <tr>
            <th className="p">Sıra</th>
            <th className="s">Yelken</th>
            <th>Ad</th>
            <th className="c">Kulüp</th>
            {cols}
            {g?.manual ? <th className="d" /> : null}
          </tr>
        </thead>
        <tbody>
          {g
            ? g.rows.map((r) => {
                const rk = ranksOf(r.sail);
                return (
                  <tr key={`${r.sail}${r.name}`}>
                    <td className="p">{r.place || r.code}</td>
                    <td className="s">{r.sail.replace(/^\D+/, "") || r.sail}</td>
                    <td className="n">
                      {r.name}
                      <span className="lv-nm2">{[r.sail, r.club].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td className="c">{r.club}</td>
                    {route.map((_, k) => (
                      <td key={k} className="m">
                        {rk[k] || ""}
                      </td>
                    ))}
                    {g.manual ? <td className="d">{r.diff || ""}</td> : null}
                  </tr>
                );
              })
            : st.map((x, i) => {
                const w = name(x.sail);
                return (
                  <tr key={x.sail} className={x.sail === last ? "new" : ""}>
                    <td className="p">{i + 1}</td>
                    <td className="s">{x.sail}</td>
                    <td className="n">
                      {w?.name || x.sail}
                      <span className="lv-nm2">{[w?.name ? x.sail : "", w?.club].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td className="c">{w?.club || ""}</td>
                    {route.map((_, k) => (
                      <td key={k} className={`m${isCur && k === pos ? " now" : ""}`}>
                        {x.ranks[k] || ""}
                      </td>
                    ))}
                  </tr>
                );
              })}
        </tbody>
      </table>
      {!g && !st.length ? <div className="lv-empty">{isCur ? "İlk şamandıra dönüşüyle sıralama burada başlar" : "Dönüş yazılmadı"}</div> : null}
    </div>
  );
}

// Genel sıralama: resmî sonuç (PDF) varsa ondan; yoksa geçici, bütün grupların yarışları toplanarak (lib/roundScore.js:
// grup içi sıra puan, eşitlikte birincilik sayısı, sonra son yarış). Kızlar ve Junior kendi içinde.
// Sade liste (Seyhun 2026-11-01 "genel bilgi tarafını daha sade, liste hâlinde"): sıra, yelken, ad, kulüp, toplam; yarış yarış puan yok.
// Kendi görünümünde (üstte Bugün · Genel): günün yarışı ana ekran, genel sıralama onu itmez.
// hideEmpty: bekleme ve özet ekranında sonuç yokken kart çizilmez (Seyhun 2026-11-01 "genel sıralama şu an yok, olunca gösterilecek")
function Overall({ data, hideEmpty = false }) {
  const year = +String(data.race?.startDate || "").slice(0, 4) || new Date().getFullYear();
  const who = useMemo(() => whoBySail(data.fleets), [data.fleets]); // kayıt listesinde olmayanlar için
  const prov = useMemo(() => provisional({ starts: data.starts || [], rounds: data.rounds || {}, entries: data.entries || [], groups: data.groups || {}, who, year }), [data.starts, data.rounds, data.entries, data.groups, who, year]);
  const official = (data.fleets || []).filter((f) => f.rows?.some((r) => r.pts != null && r.pts !== ""));
  const [ci, setCi] = useState(0);
  const [cat, setCat] = useState("");
  if (official.length) {
    const f = official[Math.min(ci, official.length - 1)];
    return (
      <div className="lv-card lv-rank lv-all">
        <div className="lv-lab">
          <span className="lv-row">
            Genel sıralama <span className="lv-tag ok">Resmî</span>
          </span>
          {official.length > 1 ? (
            <span className="lv-chips">
              {official.map((x, i) => (
                <button key={x.cls} type="button" className={`lv-btn${x === f ? " on" : ""}`} onClick={() => setCi(i)}>
                  {x.cls}
                </button>
              ))}
            </span>
          ) : null}
        </div>
        <table>
          <thead>
            <tr>
              <th className="p">Sıra</th>
              <th className="s">Yelken</th>
              <th>Ad</th>
              <th className="c">Kulüp</th>
              <th className="t">Net</th>
            </tr>
          </thead>
          <tbody>
            {f.rows.map((r) => (
              <tr key={`${r.sail}${r.name}`}>
                <td className="p">{r.rank}</td>
                <td className="s">{String(r.sail || "").replace(/^\D+/, "") || r.sail}</td>
                <td className="n">
                  {r.grp ? <Dot g={r.grp} /> : null}
                  {r.name}
                  <span className="lv-nm2">{[r.sail, r.club].filter(Boolean).join(" · ")}</span>
                </td>
                <td className="c">{r.club}</td>
                <td className="t">{r.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (!prov.length && hideEmpty) return null;
  if (!prov.length)
    return (
      <div className="lv-card lv-rank lv-all">
        <div className="lv-lab">
          <span>Genel sıralama</span>
        </div>
        <div className="lv-empty">Yarışlar bittikçe geçici, resmî sonuç yüklenince kesin</div>
      </div>
    );
  const f = prov[Math.min(ci, prov.length - 1)];
  const cats = ["Kız", "Junior"].filter((c) => f.rows.some((r) => r.cats.includes(c)));
  const rows = onlyCat(f.rows, cats.includes(cat) ? cat : "");
  return (
    <div className="lv-card lv-rank lv-all">
      <div className="lv-lab">
        <span className="lv-row">
          Genel sıralama <span className="lv-tag acc">{`Geçici · ${f.races.length} yarış`}</span>
        </span>
        <span className="lv-chips">
          {prov.length > 1
            ? prov.map((x, i) => (
                <button key={x.cls || "-"} type="button" className={`lv-btn${x === f ? " on" : ""}`} onClick={() => setCi(i)}>
                  {x.cls || "Diğer"}
                </button>
              ))
            : null}
          {cats.length ? (
            <>
              <button type="button" className={`lv-btn${!cats.includes(cat) ? " on" : ""}`} onClick={() => setCat("")}>
                Genel
              </button>
              {cats.map((c) => (
                <button key={c} type="button" className={`lv-btn${cat === c ? " on" : ""}`} onClick={() => setCat(c)}>
                  {c === "Kız" ? "Kızlar" : c}
                </button>
              ))}
            </>
          ) : null}
        </span>
      </div>
      <table>
        <thead>
          <tr>
            <th className="p">Sıra</th>
            <th className="s">Yelken</th>
            <th>Ad</th>
            <th className="c">Kulüp</th>
            <th className="k">Kat.</th>
            <th className="t">Toplam</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.sail}>
              <td className="p">{r.place}</td>
              <td className="s">{r.sail}</td>
              <td className="n">
                {r.name || r.sail}
                <span className="lv-nm2">{[r.name ? r.sail : "", r.club, r.born].filter(Boolean).join(" · ")}</span>
              </td>
              <td className="c">{[r.club, r.born].filter(Boolean).join(" · ")}</td>
              <td className="k">{r.cats.join(" · ")}</td>
              <td className="t">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Önceki yarışlar (Seyhun 2026-11-02 "geniş, kaymasın, bayraklar"): geniş pencere, kartlar yan yana; kartta gün · yarış, grup, bayraklar
// (sınıf, hazırlık, tehir AP / genel geri 1. tekrar / iptal N), durum ve birinci
function Races({ id, starts, cur, sel, fleets, rounds, entries, onClose }) {
  const list = [...starts].reverse();
  const who = { ...whoBySail(fleets), ...Object.fromEntries((entries || []).map((r) => [r.sail, { name: r.name, club: r.club }])) };
  return (
    <div className="lv-pop" role="dialog" aria-label="Yarışlar" onClick={onClose}>
      <div className="lv-card lv-races" onClick={(e) => e.stopPropagation()}>
        <div className="lv-lab">
          <span>{`Yarışlar · ${list.length}`}</span>
          <button type="button" className="lv-link" onClick={onClose}>
            Kapat
          </button>
        </div>
        <div className="lv-rgrid">
          {list.map((s) => {
            const e = rounds?.[s.id] || {};
            const off = officialFor(fleets, s.n).length > 0;
            const first = e.legs?.length ? standings(e)[0] : null;
            const w = first ? whoOf(who, first.sail) : null;
            const vf = voidFlag(s.void);
            const state = s.id === cur ? "Canlı" : s.void ? s.void : off ? "Resmî sonuç" : s.fin ? "Bitti" : "Sürüyor";
            return (
              <Link key={s.id} href={s.id === cur ? `/canli/${id}` : `/canli/${id}?y=${s.id}`} className={`lv-rc${s.id === sel?.id ? " sel" : ""}${s.id === cur ? " live" : ""}${s.void ? " void" : ""}`} onClick={onClose}>
                <header>
                  <b>
                    <Dot g={e.grp} />
                    {[e.cls, e.grp ? `${e.grp} grup` : ""].filter(Boolean).join(" · ") || "Yarış"}
                  </b>
                  <span>{raceName(s)}</span>
                </header>
                <div className="lv-rcf">
                  {e.cls ? <Flag kind="cls" cls={e.cls} /> : null}
                  {e.prep ? <Flag kind={e.prep} /> : null}
                  {vf ? <Flag kind={vf} /> : null}
                  <span className={`lv-tag${s.id === cur ? " acc" : off ? " ok" : ""}`}>{state}</span>
                </div>
                <div className="lv-rcb">
                  <span>{`${dayText(s.day)} · ${hmOf(s.at)}${s.fin && !s.void ? ` · ${raceTime(s) || ""}` : ""}`}</span>
                  <b>{first ? `1. ${first.sail} ${shortName(w?.name) || ""}` : ""}</b>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}


// ---- Yayın görünümü (Seyhun 2026-11-02, SailGP örneği: project-files/samandira-donus/yayin4) ----
// Arka plan tam ekran: ekranda canlı yayın ya da tekrar varsa video (yumuşak açılır, kenarlar koyulaşır), yoksa deniz zemini.
// Üstüne köşelerde ince paneller: sol üst sıralama (sıra, yelken, kısa ad, kulüp kısaltması), üst orta yarış adı ve mesaj,
// sağ üst parkur, sol alt rüzgâr, alt orta sayaç, sağ alt sıradaki start + genel sıralama. Üç evre: yarış öncesi, yarış, gün sonu.
function Backdrop({ data, isCur }) {
  const scr = isCur ? data.screen || {} : {};
  const yt = ytSrc(screenUrl(scr, data.stream)); // canlı yayın ya da drone
  const rec = scr.kind === "rec" ? (data.media || []).find((m) => m.id === scr.mid) : null;
  const on = !!(yt || rec);
  const st = useFade(on, 900);
  const vref = useRef(null);
  const [last, setLast] = useState(null); // kapanırken solarken gösterilen son görüntü
  if (on && (last?.yt !== yt || last?.rec?.id !== rec?.id || last?.loop !== !!scr.loop)) setLast({ yt, rec, loop: !!scr.loop });
  // Duraklatılınca tekrar videosu durur, sürdürülünce devam eder (canlı yayın iframe'i yalnız karartılır)
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    if (scr.pause) v.pause();
    else v.play?.().catch?.(() => {});
  }, [scr.pause, on]);
  const show = on ? { yt, rec, loop: !!scr.loop } : last;
  // dikey telefon videosu (h > w) kırpılmaz: ortada tam boy, iki yanı bulanık kopyası (Seyhun 2026-11-01 "dikey ve yatay video güzel gösterilsin")
  const tall = !!(show?.rec?.w && show.rec.h > show.rec.w);
  return (
    <>
      <Sea photo={on ? "" : BG_PHOTO} />
      {st && show ? (
        <div className={`lv-bg ${st}${tall ? " tall" : ""}`} aria-hidden="true">
          {tall && show.rec?.kind === "video" ? <video className="lv-bgblur" src={show.rec.url} autoPlay muted playsInline loop /> : null}
          {show.yt ? (
            <iframe title="Canlı yayın" src={show.yt} allow="autoplay; encrypted-media; picture-in-picture" />
          ) : show.rec?.kind === "video" ? (
            <video ref={vref} key={show.rec.id} src={show.rec.url} poster={show.rec.thumb || undefined} autoPlay muted playsInline loop={show.loop} />
          ) : show.rec ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={show.rec.url} alt="" />
          ) : null}
        </div>
      ) : null}
      {on && scr.pause ? (
        <div className="lv-pause" role="status">
          <div className="lv-pausec">
            <span className="lv-pulse" aria-hidden="true" />
            <b>Yayına ara verildi</b>
            <span>Görüntü düzeltiliyor, birazdan sürer</span>
          </div>
        </div>
      ) : null}
    </>
  );
}

const Panel = ({ cls = "", head, right, children, onClick, label }) => {
  const Tag = onClick ? "button" : "section";
  return (
    <Tag className={`lv-p ${cls}`} onClick={onClick} type={onClick ? "button" : undefined} aria-label={label}>
      <header className="lv-ph">
        <b>{head}</b>
        {right ? <span>{right}</span> : null}
      </header>
      <div className="lv-pb">{children}</div>
    </Tag>
  );
};

const whoMap = (data) => ({ ...whoBySail(data.fleets), ...Object.fromEntries((data.entries || []).map((r) => [r.sail, { name: r.name, club: r.club }])) });
const RANK_MAX = 15; // uzun liste aşağı doğru (Seyhun 2026-11-02 "biraz aşağı doğru gitsin")

// Sol üst: günün yarışının sıralaması (SailGP listesi gibi kısa satırlar); dokununca tam tablo (şamandıra şamandıra sıralar)
function RankPanel({ data, sel, isCur, id, max = RANK_MAX, onAll }) {
  const entry = data.rounds?.[sel?.id] || { route: [], legs: [] };
  const who = whoMap(data);
  const st = standings(entry);
  const g = sel?.n ? officialFor(data.fleets, sel.n, manualFinish(entry))[0] : null;
  const pos = nowPos(entry);
  const route = entry.route || [];
  // "son geçen" vurgusu yok (Seyhun 2026-11-02); grup ve yarış adı alttaki başlıkta, burada yalnız "Sıralama"
  // Lidere fark (Seyhun 2026-11-02 inceleme): aynı noktadaki liderden kaç sn sonra yazıldığı; cezalının yerine kodu (OCS, BFD…)
  const top = st[0];
  const rows = g
    ? g.rows.map((r) => ({ p: r.place || r.code, sail: r.sail.replace(/^\D+/, "") || r.sail, name: r.name, club: r.club }))
    : st.map((x, i) => {
        const w = whoOf(who, x.sail);
        const gap = x.pen ? null : x.pos === top?.pos ? gapAt(entry, x.pos, x.ranks[x.pos] - 1) : null;
        const mv = x.pen ? { hist: [], move: null } : rankMove(x.ranks);
        return { p: x.pen || i + 1, sail: x.sail, name: w?.name || "", club: w?.club || "", gap: gap ? `+${Math.floor(gap / 60)}:${String(gap % 60).padStart(2, "0")}` : "", ...mv };
      });
  // ilk şamandıra dönüşü yazılana kadar sıralama hiç görünmez (Seyhun 2026-11-02)
  if (!rows.length) return null;
  const hist = !g && rows.some((r) => (r.hist || []).length > 1);
  // cam kart (Seyhun 2026-11-02 cam-kart/ onay): başlık şamandıranın adı büyük, sağda kaç teknenin döndüğü; lider sarı
  const fin = pos >= 0 && route[pos] === "F" && pos === route.length - 1;
  const head = g ? "Resmî sonuç" : pos >= 0 ? (fin ? "Finiş" : markName(route[pos])) : "Sıralama";
  const n = pos >= 0 ? (entry.legs?.[pos] || []).length : 0;
  const leg = g ? "" : n ? `Sıralama · ${n} tekne ${fin ? "bitirdi" : "döndü"}` : "";
  return (
    <Panel cls="lv-rankp lv-glass" head={head} right={leg} onClick={rows.length ? onAll : undefined} label="Tam sıralama">
      {rows.length ? (
        <ol className="lv-rl">
          {rows.slice(0, max).map((r, i) => (
            <li key={`${r.sail}${r.name}`} className={`${r.isNew ? "new" : ""}${hist ? " h" : ""}${i === 0 && !g ? " l" : ""}`}>
              <b>{r.p}</b>
              {/* bir önceki yazılan şamandıraya göre yükseldi / düştü (Seyhun 2026-11-02) */}
              <s className={`lv-mv${r.move > 0 ? " up" : r.move < 0 ? " down" : ""}`} aria-label={r.move ? `${Math.abs(r.move)} sıra ${r.move > 0 ? "yükseldi" : "düştü"}` : undefined}>
                {r.move > 0 ? `▲${r.move}` : r.move < 0 ? `▼${-r.move}` : ""}
              </s>
              <i>{r.sail}</i>
              <span>{shortName(r.name) || ""}</span>
              <em>{shortClub(r.club)}</em>
              {/* şamandıra şamandıra kendi sıraları: 3 · 2 · 1, atlanan "–" */}
              {hist ? <small className="lv-hist">{(r.hist || []).length > 1 ? r.hist.map((h) => (h == null ? "–" : h)).join(" · ") : ""}</small> : null}
              {r.gap ? <u>{r.gap}</u> : !g && i === 0 && rows.length > 1 ? <u className="ld">Lider</u> : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className="lv-pe">{isCur ? "İlk şamandıra dönüşüyle sıralama burada başlar" : "Dönüş yazılmadı"}</div>
      )}
      {rows.length > max ? <div className="lv-pm">{`+${rows.length - max} tekne · Tümü`}</div> : null}
      <Siblings data={data} sel={sel} id={id} />
    </Panel>
  );
}

// Genel sıralamanın ilk beşi (sağ alt panel ve gün sonunda sol üst): resmî PDF varsa ondan, yoksa geçici
function overallTop(data, n = 5) {
  const official = (data.fleets || []).filter((f) => f.rows?.some((r) => r.pts != null && r.pts !== ""));
  if (official.length) {
    const f = official[0];
    return { tag: "Resmî", cls: f.cls || "", rows: f.rows.slice(0, n).map((r) => ({ p: r.place || r.code, sail: r.sail, name: r.name, club: r.club, t: r.pts })), total: f.rows.length };
  }
  const year = +String(data.race?.startDate || "").slice(0, 4) || new Date().getFullYear();
  let prov = [];
  try {
    prov = provisional({ starts: data.starts || [], rounds: data.rounds || {}, entries: data.entries || [], groups: data.groups || {}, who: whoBySail(data.fleets), year });
  } catch {
    prov = [];
  }
  if (!prov.length) return null;
  const f = prov[0];
  return { tag: `Geçici · ${f.races.length} yarış`, cls: f.cls || "", rows: f.rows.slice(0, n).map((r, i) => ({ p: r.rank || i + 1, sail: r.sail, name: r.name, club: r.club, t: r.total })), total: f.rows.length };
}


// Yarışta genel sıralama (Seyhun 2026-11-02 "arka planları olmasın, zaten arka plan flu; şamandıra dönüşleriyle karışmasın"):
// kutu yok, sağ kenarda bulanık şerit; sıra, ad, kulüp ve büyük puan. Şamandıra sıralaması solda başka biçimde (lv-rankp)
function OverallSide({ data, n = 10 }) {
  const top = useMemo(() => overallTop(data, n), [data, n]);
  if (!top) return null;
  return (
    <aside className="lv-ovs lv-glass" aria-label="Genel sıralama">
      <header>
        <b>Genel</b>
        <span>{[top.cls, top.tag].filter(Boolean).join(" · ")}</span>
      </header>
      <ol>
        {top.rows.map((r) => (
          <li key={`${r.sail}${r.name}`}>
            <b>{r.p}</b>
            <span>
              {shortName(r.name) || r.sail}
              <em>{[r.sail, shortClub(r.club)].filter(Boolean).join(" · ")}</em>
            </span>
            <u>{r.t}</u>
          </li>
        ))}
      </ol>
      {top.total > top.rows.length ? <div className="lv-ovf">{`${top.total} tekne · ilk ${top.rows.length}`}</div> : null}
    </aside>
  );
}

// Ekranın altındaki yazı (Seyhun 2026-11-02 "olimpiyat yayınlarındaki gibi"): Yayın › Video › Ekranda yazı; altında sınıf · grup · yarış
// ---- Sade yayın ekranı (Seyhun 2026-11-02 "her yerde bir şey yazıyor, daha sade, bilgi ekranı, alt tarafta") ----
// Son rüzgâr ölçümü (parkur rüzgâr kayıtları + eski canlı rüzgâr); önceki yarışta startındaki
function lastWind(data, sel, isCur) {
  const obs = (data.course?.obs || []).filter((o) => o.kind === "wind").map((o) => ({ at: o.at, dir: o.deg, kn: o.kn, gust: null, range: o.range || null }));
  const upto = !isCur && sel ? sel.fin || sel.at : "";
  const all = [...(data.wind || []), ...obs].filter((x) => x.dir != null && (!upto || x.at <= upto)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  // parkurda / Yayın'dan elle girilen ölçümler (istasyon değil): şeritte "Manuel" yazar
  const last = all.at(-1);
  return { w: !isCur && sel?.dir != null ? { at: sel.at, dir: sel.dir, kn: sel.kn, gust: null, man: true } : last ? { ...last, man: true } : last, obs };
}
function WindArrow({ w }) {
  const span = w?.range ? ((w.range[1] - w.range[0] + 540) % 360) - 180 : 0;
  // ok rüzgârın gittiği yönü gösterir (parkur sahnesindeki ok gibi): KB 310°'den esen rüzgârda ok güneydoğuya
  const style = w?.range ? { "--lv-a": `${w.range[0] + 180}deg`, "--lv-b": `${w.range[0] + 180 + span}deg` } : { transform: `rotate(${(w?.dir ?? 0) + 180}deg)` };
  return (
    <span className={`lv-arrow${w?.range ? " swing" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 40 40" style={style}>
        <path d="M20 4 L27 22 L20 17 L13 22 Z" fill="#fff" />
        <line x1="20" y1="17" x2="20" y2="36" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

// Üstte tek soluk satır: yarış adı · yer · tarih, yanında hayalet düğmeler (geri ayrı, sol köşede)
// Yarışın adı ve şu an ne olduğu alt şeridin hemen üstünde, şeffaf zeminde, hep orada (Seyhun 2026-11-02 "yukarıdaki yazıyı kaldıralım,
// hangi grup, yarış adı altta şeridin üstünde, arka fonu şeffaf"). Yayıncının yazdığı alt yazı (screen.caption) bunun üstünde vurgulu satır.
// Yarışın adı (şeridin ilk hücresi, büyük) ve altında küçük satır: sınıf · yarış adı · yer
function titleOf({ data, sel, phase, today, prog = [] }) {
  const plan = data.plan;
  const entry = sel ? data.rounds?.[sel.id] : null;
  const none = plan.status === "none" && plan.day === today;
  const at = plan.status === "done" && plan.next ? plan.next.at : plan.at;
  let head = "";
  let g = "";
  let what = "";
  if (phase === "race" && sel) {
    // Şerit (Seyhun 2026-11-02 serit-yeni onay): büyük "3. yarış · Sarı", altında küçük sınıf
    head = [raceTitle(sel), entry?.grp || ""].filter(Boolean).join(" · ") || "Yarış";
    g = entry?.grp || "";
    what = entry?.cls || "";
  } else if (phase === "race") {
    head = plan.order[0] ? planLabel(plan.order[0]) : "Yarış günü";
    g = plan.order[0]?.grp || "";
  } else if (phase === "wait") {
    // yarış öncesi: büyük "Optimist · Sarı grup", altında "3. yarış · yarışın adı"; start saati ayrı modülde
    const f = prog.find((x) => x.state === "next");
    const o = plan.order[0];
    head = none ? "Bugün yarış yok" : plan.status === "ap" ? "Start ertelendi" : (o ? [o.cls, grpText(o.grp)].filter(Boolean).join(" · ") : "") || "Yarış öncesi";
    g = o?.grp || "";
    what = plan.status === "ap" ? apText(plan) : none ? data.race.name : [f?.name, data.race.name].filter(Boolean).join(" · ");
  } else head = "Gün bitti";
  const sub = phase === "wait" ? what : [what, data.race.name, data.race.place].filter(Boolean).join(" · ");
  return { head, g, sub };
}

// Şeridin üstünde yalnız yayıncının alt yazısı (screen.caption) ve önceki yarışlar düğmeleri; yarışın adı şeridin içinde (Seyhun 2026-11-02 "tek bir çizgi olmalı")
// Yayıncı yazmadıysa yazı kendiliğinden (lib/raceCaption.js): Start, Son dakika, Tehir, Genel geri, Bireysel geri, Finiş; uyarılar kehribar
function TitleLine({ data, isCur, id, starts, onList, auto }) {
  const own = isCur ? data.screen?.caption || "" : "";
  const cap = own || (isCur ? auto?.text || "" : "");
  const warn = !own && auto?.kind === "warn";
  const btns = (!isCur && data.cur) || starts.length > 1 || (!isCur && starts.length);
  if (!cap && !btns) return null;
  return (
    <div className="lv-title">
      {cap ? (
        <em key={cap} className={`lv-cap${warn ? " warn" : ""}`}>
          {cap}
        </em>
      ) : null}
      {btns ? (
        <span className="lv-titleb">
          {!isCur && data.cur ? (
            <Link href={`/canli/${id}`} className="lv-ghost on">
              Canlı yarış
            </Link>
          ) : null}
          {starts.length > 1 || (!isCur && starts.length) ? (
            <button type="button" className="lv-ghost" onClick={onList}>
              Önceki yarışlar
            </button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

// Altta tek bilgi şeridi (TV yayınlarındaki alt bant; grup · yarış hemen üstünde TitleLine'da): süre (start'tan sonra; önce ortada büyük sayaç), nerede (şamandıra,
// lider ve dönüş saati), rüzgâr (dokununca gün boyu grafik), parkur (dokununca büyük), sıradaki start. Her hücre: üstte değer, altta küçük etiket.
function InfoBar({ data, sel, isCur, phase, cs, counting, clockIn, today, now = 0, ongoing, hasSvg, prog = [], onCourse, onWind }) {
  const t = titleOf({ data, sel, phase, today, prog });
  const plan = data.plan;
  const entry = sel ? data.rounds?.[sel.id] : null;
  const route = entry?.route || [];
  const pos = entry ? nowPos(entry) : -1;
  const { w } = lastWind(data, sel, isCur);
  const cells = [];
  // Video varken geri sayım ortada videonun önüne gelmez, şeritte büyük (Seyhun 2026-11-02 "videonun önüne geliyor, öyle olmaması lazım")
  if (clockIn) cells.push(["time clock", cs.value, cs.label]);
  if (phase === "race") {
    const shm = /Start (\d\d:\d\d)/.exec(cs.right || "")?.[1];
    if (clockIn) {
      // saat zaten şeritte
    } else if (!counting && sel?.void) {
      // Abandone / genel geri (Seyhun 2026-11-02): eski start saati değil, abandone saati; son yarışsa yeni start için uyarı işareti bekleniyor
      cells.push(["time", sel.fin ? hmOf(sel.fin) : "—", voidShort(sel.void)]);
      const last = (data.starts || []).filter((x) => x.day === today).at(-1);
      if (isCur && last?.id === sel.id) cells.push(["time warn", "Uyarı işareti", "Yeni start bekleniyor"]);
    } else if (!counting && sel) cells.push(["time", cs.value, cs.label]);
    else if (counting && shm) cells.push(["time", shm, "Start"]); // geri sayım ortada büyük; şeritte start saati
    // Şamandırada her zaman ilk dönen (lider) ve dönüş saati; finiş yazıldıysa kazanan (Seyhun 2026-11-02 "son geçen olmasın")
    const ld = pos >= 0 ? leaderAt(entry, pos) : null;
    if (ld) {
      const who = whoOf(whoMap(data), ld.sail);
      const fin = route[pos] === "F" && pos === route.length - 1;
      cells.push(["pos", `${ld.sail}${who?.name ? ` ${shortName(who.name)}` : ""}`, `${fin ? "Kazanan" : `${markName(route[pos])} lideri`}${ld.at ? ` · ${hmOf(ld.at)}` : ""}`]);
    } else if (sel?.fin) cells.push(["pos", "Bitti", "Yarış"]);
  } else if (phase === "wait") {
    // videolu bekleme (Seyhun 2026-11-02 tasarım 2): geri sayım ve beklenen rüzgâr
    // büyük geri sayım ortada; şeritte start saati (ör. 14:00 · Start)
    const hm = /Start (\d\d:\d\d)/.exec(cs.right || "")?.[1] || (plan.status !== "none" && plan.status !== "ap" ? plan.at : "");
    const wt = waitTurn(data, today, cs, now);
    if (clockIn) {
      // saat zaten şeritte
    } else if (wt) {
      // Program saati geçti ya da abandone (Seyhun 2026-11-02 "çok geçmiş bir saati gösteriyor… uyarı işareti bekleniyor"): eski saat start gibi yazmaz
      if (wt.vd) cells.push(["time", wt.at || "—", voidShort(wt.vd)]);
      cells.push(["time warn", "Uyarı işareti", wt.vd ? "Yeni start bekleniyor" : `Bekleniyor${plan.at ? ` · Program ${plan.at}` : ""}`]);
    } else if (hm) cells.push(["time", hm, "Start"]);
    else if (cs.rem) cells.push(["time", cs.value, cs.label]);
    const ew = !w ? expWind(data.forecast, plan.at) : null;
    if (ew) cells.push(["exp", expText(ew), "Beklenen rüzgâr", ew]);
  } else {
    if (plan.next?.at) cells.push(["time", plan.next.at, "Yarın ilk start"]);
    const ew = expWind(data.forecastNext, plan.next?.at);
    if (ew) cells.push(["exp", expText(ew), "Yarın beklenen rüzgâr", ew]);
  }
  // Parkur: rota noktaları 1 – 2 – 3 – F; yarışta liderin olduğu şamandıra sarı
  const croute = cleanRoute(sceneRoute(data, sel, isCur, phase));
  const cpos = phase === "race" && isCur && sel && croute.length === route.length ? pos : -1;
  return (
    <div className="lv-bar">
      {phase !== "summary" ? (
        <div className="lv-cell ttl">
          <b>
            <Dot g={t.g} />
            {t.head}
          </b>
          <span>
            {ongoing ? <em className="lv-livedot">Canlı</em> : null}
            {t.sub}
          </span>
        </div>
      ) : null}
      {cells.map(([k, v, l, ew]) => (
        <div key={k} className={`lv-cell ${k}`}>
          <b>
            {ew ? <WindArrow w={{ dir: ew.dir }} /> : null}
            {v}
          </b>
          <span>{l}</span>
        </div>
      ))}
      {w && phase !== "summary" ? (
        <button type="button" className="lv-cell wind" onClick={onWind} aria-label="Gün boyu rüzgâr">
          <b>
            <WindArrow w={w} />
            {w.range ? `${w.range[0]}–${w.range[1]}°` : `${w.dir}°`}
          </b>
          <span>{`${dirShort(w.dir)}${w.kn != null ? ` · ${w.kn} knot` : ""}${w.man ? " · Manuel" : ""}`}</span>
        </button>
      ) : null}
      {hasSvg ? (
        <button type="button" className="lv-cell course" onClick={onCourse} aria-label="Parkuru göster">
          {croute.length ? (
            <b className="lv-route" aria-label={routeText(croute)}>
              {croute.map((m, i) => (
                <Fragment key={i}>
                  {i ? <s /> : null}
                  <i className={i === cpos ? "on" : i < cpos ? "done" : ""}>{m}</i>
                </Fragment>
              ))}
            </b>
          ) : (
            <b>Göster</b>
          )}
          <span>{axisInfo(data) ? `Parkur · Eksen ${axisInfo(data).deg}°` : "Parkur"}</span>
        </button>
      ) : null}
      {phase === "race" && sel && plan.order[0] ? (
        // sıradaki yarış sağda küçük (Seyhun 2026-11-02 "sıradaki start diye belirtmeyelim, küçük gösterelim")
        <div className="lv-cell next">
          <span>Sıradaki</span>
          <b>
            <Dot g={plan.order[0].grp} />
            {[grpText(plan.order[0].grp), dayProgram(data, today).find((x) => x.state === "next")?.name].filter(Boolean).join(" · ") || planLabel(plan.order[0]) || "Start"}
          </b>
        </div>
      ) : null}
    </div>
  );
}

// ---- Yayın tasarımı (Seyhun 2026-11-02 onay, project-files/samandira-donus/tasarim7) ----
const grpText = (g) => (g ? `${g} grup` : "");

// Program etiketleri (yarışta ve videolu beklemede sağ üstte): "1. yarış · Bitti", "2. yarış · Canlı", "3. yarış · 12:20"
function ProgramChips({ items }) {
  if (items.length < 2) return null;
  return (
    <div className="lv-prog2" aria-label="Günün programı">
      {items.map((x) => (
        <span key={x.key} className={`lv-p2 ${x.state}`}>
          <Dot g={x.grp} />
          {[x.name, x.state === "done" ? "Bitti" : x.state === "now" ? "Canlı" : x.at].filter(Boolean).join(" · ")}
        </span>
      ))}
    </div>
  );
}

// Yarış öncesi (video yokken) bekleme ekranı (Seyhun 2026-11-02 bekleme.png onay, "birbirine karışıyor"): ekran ikiye bölünür.
// Solda durum hep sabit: ne bekleniyor (Start'a / Yeni start bekleniyor / Start ertelendi), büyük süre, hangi yarış ve grup,
// bayraklı durum kutusu (Abandone · 3. yarış, Genel geri, Tehir). Sağda vitrin: parkur → rüzgâr → program, üstte hangisi; arasız döner.
// Telefonda durum üstte, vitrin altında. Alttaki program kartları kalktı (program vitrinde).
const voidShort = (v) => (v === "Genel geri çağırma" ? "Genel geri" : v === "İptal" ? "Abandone" : v);
// Start saati geçti ama geri sayım yok: son start abandone/genel geri (vd, saati at) ya da programdaki tahmini saat geçti. Yoksa null
function waitTurn(data, today, cs, now) {
  const plan = data.plan;
  if (cs.rem || plan.status === "ap" || plan.status === "none" || plan.status === "done") return null;
  const last = (data.starts || []).filter((x) => x.day === today).at(-1);
  if (last?.void && last.void !== "Tehir" && (!last.fin || now - Date.parse(last.fin) < 3 * 3600e3)) return { vd: last.void, at: last.fin ? hmOf(last.fin) : "" };
  const ms = planStartMs(plan, today);
  return ms && now > ms ? { vd: "", at: "" } : null;
}
function holdState(data, today, cs, now) {
  const plan = data.plan;
  const none = plan.status === "none" && plan.day === today;
  const last = (data.starts || []).filter((x) => x.day === today).at(-1);
  const vd = last?.void && (!last.fin || now - Date.parse(last.fin) < 3 * 3600e3) ? last.void : "";
  let box = null;
  if (plan.status === "ap") box = { flag: "AP", head: "Tehir", sub: apText(plan) || "Start ertelendi" };
  else if (plan.warn && now < Date.parse(plan.warn)) box = { flag: "AP", head: "Tehir indi", sub: `Uyarı işareti ${trHm(plan.warn)}` };
  else if (vd) {
    const grp = last.grp || data.rounds?.[last.id]?.grp || "";
    const head = [vd === "Genel geri çağırma" ? "Genel geri" : vd, raceName(last)].filter(Boolean).join(" · ");
    const why = vd === "Tehir" ? "Start ertelendi" : "Yarış sayılmadı, yeniden start verilecek";
    box = { flag: voidFlag(vd), head, sub: [last.fin ? `${hmOf(last.fin)}` : "", grp ? `${grp} grup` : "", why].filter(Boolean).join(" · ") };
  }
  const late = !cs.rem && !vd && waitTurn(data, today, cs, now);
  const kick = none ? "Bugün yarış yok" : cs.rem ? cs.label : plan.status === "ap" ? "Start ertelendi" : vd ? "Yeni start için uyarı işareti bekleniyor" : late ? "Uyarı işareti bekleniyor" : "Start bekleniyor";
  return { none, box, kick };
}
// Bugün yarış yok (Seyhun 2026-11-02 örnek A, yayin-tasarim/yaris-yok/yok-a.png): solda bir sonraki yarış gününün ilk start'ına geri
// sayım ve tarih, altında genel sıralamanın ilk üçü; sağda o günün beklenen rüzgârı (startta, en çok, kesik tahmin çizgisi) ve programı
function NoneHero({ data, today, now }) {
  const r = data.race || {};
  const nx = data.plan.next;
  const ms = nx.at ? Date.parse(`${nx.day}T${nx.at}:00+03:00`) : null;
  const rem = ms ? Math.max(0, Math.floor((ms - now) / 1000)) : null;
  const tomorrow = nx.day === new Date(Date.parse(`${today}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);
  const wd = new Date(`${nx.day}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });
  const no = nextRaceNo(data.starts || [], nx.day, raceDays(r.startDate, r.endDate, data.plan), "");
  const fc = (data.forecastNext?.rows || []).filter((x) => +x.hh >= 8 && +x.hh <= 18 && x.wind != null);
  const max = fc.length ? Math.max(...fc.map((x) => x.wind)) : null;
  const maxH = fc.find((x) => x.wind === max)?.hh;
  const ag = (data.plan.agenda?.[nx.day] || []).slice(0, 6);
  const top = overallTop(data, 3);
  const W = 720, H = 190, L = 24, R = 24, T = 34, B = 34;
  const x = (h) => L + ((h - 8) / 10) * (W - L - R);
  const top_ = Math.max(10, Math.ceil(((max ?? 0) + 3) / 5) * 5);
  const y = (v) => T + (1 - v / top_) * (H - T - B);
  const d = fc.map((q, i) => `${i ? "L" : "M"}${x(+q.hh).toFixed(1)} ${y(q.wind).toFixed(1)}`).join(" ");
  const atH = nx.at ? +nx.at.slice(0, 2) + +nx.at.slice(3, 5) / 60 : null;
  return (
    <div className="lv-hold">
      <div className="lv-hst">
        {r.name ? <div className="lv-hname">{r.name}</div> : null}
        <span className="lv-nopill">Bugün yarış yok</span>
        <div className="lv-kick">{`${tomorrow ? "Yarın" : wd} ilk start'a`}</div>
        {rem != null ? (
          <div className="lv-big lv-nobig">
            {rem >= 86400 ? (
              <>
                {Math.floor(rem / 86400)}
                <small>gün</small>
              </>
            ) : (
              <>
                {`${String(Math.floor(rem / 3600)).padStart(2, "0")}:${String(Math.floor((rem % 3600) / 60)).padStart(2, "0")}`}
                <small>{`:${String(rem % 60).padStart(2, "0")}`}</small>
              </>
            )}
          </div>
        ) : null}
        <div className="lv-what lv-whatd">{[wd, nx.at ? `İlk start ${nx.at}` : "", `${no}. yarış`].filter(Boolean).join(" · ")}</div>
        {top ? (
          <div className="lv-notop">
            <b>Genel</b>
            {top.rows.map((x) => (
              <span key={x.sail}>{`${x.p}. ${x.name || x.sail} ${x.t}`}</span>
            ))}
            <i>{top.tag}</i>
          </div>
        ) : null}
      </div>
      <div className="lv-show">
        <div className="lv-nocard">
          {fc.length >= 2 ? (
            <>
              <small>Rüzgâr tahmini</small>
              <div className="lv-nokn">
                {max != null ? (
                  <span>
                    {`En çok ${max} kn`}
                    <i>{` ${maxH}:00`}</i>
                  </span>
                ) : null}
              </div>
              <svg viewBox={`0 0 ${W} ${H}`} className="lv-nochart" role="img" aria-label="Beklenen rüzgâr">
                <path d={`${d} L${x(+fc.at(-1).hh)} ${y(0)} L${x(+fc[0].hh)} ${y(0)} Z`} fill="#fff" fillOpacity=".08" />
                <path d={d} fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="3" strokeDasharray="9 7" />
                {fc.map((q) => (
                  <g key={q.hh}>
                    <text x={x(+q.hh)} y={y(q.wind) - 10} textAnchor="middle" fontSize="19" fontWeight="800" fill="#fff">{q.wind}</text>
                    <text x={x(+q.hh)} y={H - 8} textAnchor="middle" fontSize="14" fontWeight="600" fill="#fff" fillOpacity=".6">{`${q.hh}:00`}</text>
                  </g>
                ))}
                {atH != null && atH >= 8 && atH <= 18 ? (
                  <g>
                    <line x1={x(atH)} x2={x(atH)} y1="12" y2={y(0)} stroke="#ff3d77" strokeWidth="2.5" strokeDasharray="4 4" />
                    <text x={x(atH) + 8} y="22" fontSize="15" fontWeight="800" fill="#ff5c8f">{`START ${nx.at}`}</text>
                  </g>
                ) : null}
              </svg>
            </>
          ) : null}
          {ag.length ? (
            <>
              <small>{`${tomorrow ? "Yarının" : `${wd}`} programı`}</small>
              <div className="lv-noag">
                {ag.map((a) => (
                  <span key={`${a.at}${a.text}`} className={/start/i.test(a.text) ? "s" : ""}>{[a.at, a.text].filter(Boolean).join(" ")}</span>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
function WaitHero({ data, today, cs, prog, now }) {
  const plan = data.plan;
  const { none, box, kick } = holdState(data, today, cs, now);
  const first = prog.find((x) => x.state === "next") || null;
  const at = plan.status === "done" && plan.next ? plan.next.at : plan.at;
  const svg = courseSvg(data, sceneRoute(data, null, true, "wait"));
  // Yarışa günler varken (Seyhun 2026-11-02 "6 gün sonra bir yarış; kaç gün kaldı, o tarihlerdeki beklenen rüzgâr"): büyük "6 gün", vitrinde yarış günlerinin rüzgârı
  const r = data.race || {};
  const left = !cs.rem && r.startDate > today ? daysUntil(r.startDate, today) : 0;
  const aDays = left ? data.ahead?.days || raceDays(r.startDate, r.endDate, plan).map((day) => ({ day, at: plan.times?.[day] || plan.daily || "" })) : [];
  const ag = agOf(data, now);
  const slides = none ? [] : left ? [svg ? "course" : "", aDays.length ? "ahead" : "", ag ? "prog" : ""].filter(Boolean) : [svg ? "course" : "", windShowable(data) ? "wind" : "", prog.length || ag ? "prog" : ""].filter(Boolean);
  // vitrin arasız döner; Yayın'dan "Göster" turu baştan başlatır
  // yeni parkur ölçümü (komite parkuru attı) gelince önce parkur (Seyhun 2026-11-02 "parkur eksenini güzelce gösterelim")
  const cNew = Math.max(0, Date.parse(data.course?.cardAt || "") || 0, ...(data.course?.obs || []).map((o) => Date.parse(o.at) || 0));
  if (none && !left && plan.next?.day) return <NoneHero data={data} today={today} now={now} />;
  const k = svg && slides.includes("course") && cNew > 0 && now - cNew < COURSE_MS ? "course" : slides.length ? showSlide({ show: { ...data.courseShow, auto: false }, now, pre: true, slides }) || slides[Math.floor(now / SHOW_ON) % slides.length] : "";
  return (
    <div className="lv-hold">
      <div className="lv-hst">
        {/* Yarışın adı soluk, en üstte (Seyhun 2026-11-02 "yarışın adını da göstermemiz gerekiyor, arka planda biraz soluk") */}
        {r.name ? <div className="lv-hname">{r.name}</div> : null}
        <div className="lv-kick">{left ? "Yarışa" : kick}</div>
        {left ? (
          <div className="lv-big lv-bigd">
            {left}
            <small>gün</small>
          </div>
        ) : !none ? (
          <div className="lv-big">{cs.rem ? cs.value : "—:—"}</div>
        ) : null}
        {left ? <div className="lv-what lv-whatd">{[r.endDate && r.endDate !== r.startDate ? `${dayText(r.startDate)} – ${dayText(r.endDate)}` : dayText(r.startDate), aDays[0]?.at ? `İlk start ${aDays[0].at}` : "", r.place].filter(Boolean).join(" · ")}</div> : null}
        {!none && !left ? <NowWind data={data} now={now} /> : null}
        {!none && !left && first ? (
          <div className="lv-what">
            <Dot g={first.grp} />
            {[first.name, grpText(first.grp)].filter(Boolean).join(" · ")}
            <small>{[first.cls, at ? `Program ${at}` : ""].filter(Boolean).join(" · ")}</small>
          </div>
        ) : null}
        {box ? (
          <div className="lv-hbox">
            {box.flag ? <Flag kind={box.flag} /> : null}
            <div>
              <b>{box.head}</b>
              <span>{box.sub}</span>
            </div>
          </div>
        ) : null}
      </div>
      {slides.length ? (
        <div className="lv-show">
          <div className="lv-tabs">
            {slides.map((x) => (
              <i key={x} className={x === k ? "on" : ""}>
                {SLIDE_NAME[x]}
              </i>
            ))}
          </div>
          <div key={k} className="lv-showb">
            {k === "course" ? <div className="lv-sceneb" dangerouslySetInnerHTML={{ __html: svg }} /> : k === "wind" ? <WindBody data={data} sel={null} isCur now={now} /> : k === "ahead" ? <AheadBody days={aDays} /> : ag ? <AgendaBody ag={ag} /> : <ProgBody prog={prog} />}
          </div>
        </div>
      ) : null}
    </div>
  );
}
// Videolu yarış öncesi sol şerit (Seyhun 2026-11-02 "solda olmalı bilgiler, arka fon blur olabilir sadece bu alanın, bilgilere arka plan ekleme"):
// yarışın adı soluk, durum (Yarış öncesi / turuncu bayrakla Start öncesi), büyük süre, rüzgâr (şimdi + start'ta beklenen; start öncesinde hat avantajı),
// parkur (çizim, adı, rota), program (start öncesinde yalnız sıradakiler)
function SidePanel({ data, today, cs, prog, now, entry }) {
  const orange = orangeUp(data.plan, today);
  const r = data.race || {};
  const c = curWind(data, null, true, now);
  const ew = expWind(data.forecast, data.plan.at);
  const crs = cleanCourse(data.course || {});
  const route = sceneRoute(data, null, true, "wait");
  const svg = courseSvg(data, route, { axis: false });
  const ax = axisInfo(data);
  let bias = null;
  try {
    bias = orange ? lineBias(crs) : null;
  } catch {
    bias = null;
  }
  const left = prog.filter((x) => x.state !== "done");
  const first = left[0] || null;
  const rows = orange ? left.slice(1, 3) : left.slice(0, 4);
  const prep = data.plan.order?.[0]?.prep || "";
  const ag = agOf(data, now);
  // geri sayımda bayraklar: süren startın kaydı, yoksa sıradaki bekleyen (Yayın'da seçilen sınıf, grup, bayrak)
  const entryNow = entry?.cls || entry?.prep || entry?.grp ? entry : data.plan.order?.[0] || null;
  // bayraklar yalnız start dizisinde (Yayın'da sayaç çalışırken); o zaman küçük parkur çizimi yer açmak için gizlenir
  const seq = !!(data.timer && cs.rem && entryNow);
  const flags = seq ? startFlags(entryNow, false, cs.rem <= 60) : [];
  const ww = c || ew;
  return (
    <aside className="lv-side">
      <div className="lv-stop">
        {r.name ? <div className="lv-sname">{r.name}</div> : null}
        <div className={`lv-skick${orange ? " o" : ""}`}>
          {orange ? <span className="lv-oflag" aria-hidden="true" /> : null}
          {orange ? "Start öncesi" : "Yarış öncesi"}
        </div>
        <div className="lv-sbig">{cs.rem ? cs.value : "—:—"}</div>
        <div className="lv-ssub">{[cs.label, cs.right].filter(Boolean).join(" · ")}</div>
        {orange && first && !seq ? (
          <div className="lv-swhat">
            <Dot g={first.grp} />
            {[first.name, grpText(first.grp), first.cls, prep ? prepName(prep) : ""].filter(Boolean).join(" · ")}
          </div>
        ) : null}
      </div>
      {flags.length ? (
        <div className="lv-sflags">
          {flags.map((f) => (
            <div key={f.kind} className={`lv-sfl${f.down ? " down" : ""}`}>
              <Flag {...f} />
              <div>
                <b>{f.kind === "cls" ? f.cls : prepName(f.kind)}</b>
                <small>{f.kind === "cls" ? (f.grp ? `${f.grp} grup` : "Sınıf") : f.down ? "İndi" : "1 dk'da iner"}</small>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {ww ? (
        <div className={`lv-ssec lv-s2${bias?.end ? "" : " one"}`}>
          <div>
            <div className="lv-sh">{orange ? "Start hattında rüzgâr" : "Rüzgâr"}</div>
            <div className="lv-swind">
              {ww.dir != null ? <WindArrow w={ww} /> : null}
              <div className="v">
                <b>
                  {ww.kn}
                  <em>knot</em>
                </b>
                <small>
                  {[ww.dir != null ? `${dirShort(ww.dir)} ${degText(ww)}` : "", orange && ew?.gust && ew.gust > ww.kn ? `Sağanak ${ew.gust}` : "", c && ew && !orange ? `Start'ta ${ew.kn} knot` : ""].filter(Boolean).join(" · ")}
                </small>
                <small>{c ? <span className={c.man ? "m" : ""}>{c.by}</span> : "Tahmin"}</small>
              </div>
            </div>
          </div>
          {bias?.end ? (
            <div>
              <div className="lv-sh">Start hattı</div>
              <div className="lv-sbias">
                {bias.end === "pin" ? "Pin" : "Komite"}
                <br />
                {`avantajlı ${Math.round(bias.deg)}°`}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {svg || ax ? (
        <div className="lv-ssec">
          <div className="lv-sh">{`Parkur · ${CARD_TYPES[selCard(crs).type] || CARD_TYPES.std}`}</div>
          {route.length ? (
            <b className="lv-route lv-sroute" aria-label={routeText(route)}>
              {cleanRoute(route).map((m, k) => (
                <Fragment key={k}>
                  {k ? <s /> : null}
                  <i>{m}</i>
                </Fragment>
              ))}
            </b>
          ) : null}
          {ax ? (
            <div className="lv-sax">
              <i style={{ transform: `rotate(${ax.deg}deg)` }} aria-hidden="true" />
              <div>
                <b>{`Eksen ${ax.deg}° ${dirShort(ax.deg)}`}</b>
                <span>{["Komitenin attığı yön", shiftText(ax.sh).replace(/^Rüzgâr /, "rüzgâr ")].filter(Boolean).join(" · ")}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {ag && !orange ? (
        <div className="lv-ssec lv-sprog">
          <div className="lv-sh">{ag.mode === "all" ? "Program" : "Bugünün programı"}</div>
          {(ag.mode === "day" ? ag.rows : ag.days.flatMap((d) => d.rows.map((x) => ({ ...x, at: `${new Date(`${d.day}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${x.at}`.trim() })))).slice(0, 6).map((x, i) => (
            <div key={i} className={x.state || ""}>
              <span className="t">{x.text}</span>
              <i>{x.at || ""}</i>
            </div>
          ))}
        </div>
      ) : rows.length ? (
        <div className="lv-ssec lv-sprog">
          <div className="lv-sh">{orange ? "Sıradaki" : "Program"}</div>
          {rows.map((x) => (
            <div key={x.key} className={x.state}>
              <Dot g={x.grp} />
              <span className="t">{[x.name, x.grp].filter(Boolean).join(" · ")}</span>
              <i>{x.state === "now" ? "Canlı" : x.at || "Sonra"}</i>
            </div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}
const SLIDE_NAME = { course: "Parkur", wind: "Rüzgâr", prog: "Program", ahead: "Beklenen rüzgâr" };
const wdText = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short" });
// Yarış günlerinin beklenen rüzgârı: gün, ilk start, ok (rüzgârın gittiği yön), knot, yön, sağanak; tahmini olmayan gün "Tahmin yok"
function AheadBody({ days }) {
  return (
    <div className="lv-ahead">
      {days.map((x) => (
        <div key={x.day} className="lv-ah">
          <div className="d">
            <b>{dayText(x.day)}</b>
            <span>{[wdText(x.day), x.at].filter(Boolean).join(" · ")}</span>
          </div>
          {x.wind != null ? (
            <>
              {x.dir != null ? (
                <svg className="ar" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${x.dir + 180}deg)` }}>
                  <path d="M12 2 L18 20 L12 16 L6 20 Z" />
                </svg>
              ) : (
                <i className="ar" />
              )}
              <b className="k">
                {x.wind}
                <em>knot</em>
              </b>
              <span className="w">{[x.dir != null ? `${dirShort(x.dir)} ${x.dir}°` : "", x.gust && x.gust > x.wind ? `Sağanak ${x.gust}` : ""].filter(Boolean).join(" · ")}</span>
            </>
          ) : (
            <span className="w n">Tahmin yok</span>
          )}
        </div>
      ))}
    </div>
  );
}

// Gün sonu (Seyhun 2026-11-02 "gün bitince ne gösteriyoruz; bugün ne bekleniyordu ne oldu, sonuçlar, yarın beklentisi; geçici olduğu
// muhakkak yazsın; genel sıralama tümüyle"): bekleme ekranı gibi solda sabit durum (Gün bitti, kaç yarış, yarınki ilk start'a sayaç),
// sağda sırayla dönen vitrin: Bugün (rüzgâr beklenen ve gerçekleşen, program planlanan/yapılan), Sonuçlar (yarış yarış ilk üç),
// Genel (ilk 10, Tümü, geçici uyarısı), Yarın (yarının rüzgâr tahmini, start'ta beklenen)
const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
export function dayStats(data, day) {
  const all = (data.starts || []).filter((x) => x.day === day);
  const done = all.filter((x) => !x.void);
  const voids = all.filter((x) => x.void).length;
  const fc = data.forecast;
  const rows = (fc?.rows || []).filter((r) => +r.hh >= 6 && +r.hh <= 20);
  const man = windByHour(data, Date.parse(`${day}T12:00:00+03:00`));
  const obsAt = Object.fromEntries((fc?.obs || []).filter((o) => o.wind != null).map((o) => [o.hh, o]));
  const hrOf = (iso) => +new Date(Date.parse(iso) + 3 * 3600e3).toISOString().slice(11, 13);
  const times = all.flatMap((x) => [x.at, x.fin].filter(Boolean)).filter((t) => !Number.isNaN(Date.parse(t)));
  const h0 = times.length ? Math.min(...times.map(hrOf)) : null, h1 = times.length ? Math.max(...times.map(hrOf)) : null;
  const span = rows.filter((r) => h0 != null && +r.hh >= h0 && +r.hh <= h1);
  const got = (r) => man[r.hh]?.wind ?? obsAt[r.hh]?.wind ?? null;
  const both = span.filter((r) => got(r) != null);
  return { races: done.length, voids, h0, h1, exp: avg(both.map((r) => r.wind)), real: avg(both.map(got)) };
}
// Gün sonu (Seyhun 2026-11-02, iki taslaktan sonra "karman çorman; Gün bitti sahnesi olmasın; modern geçiş, yayın gibi"):
// yayın grafikleri gibi kartlar; her kart soldan sağa açılarak gelir (clip-path), süresi bitince sağa kapanarak gider.
// Sahneler: Bugün rüzgâr (esen / beklenen, sütunlar) → yarış yarış podyum (geçici) → Genel ilk 10 (geçici, Tümü) → Yarın.
// Sol üstte küçük künye (yarış · gün · Gün sonu), altta hikâye çizgisi.
export function endScenes({ wind, races, all, next }) {
  return [...(wind ? [{ k: "wind", d: 10000 }] : []), ...races.map((id) => ({ k: "race", id, d: 8000 })), ...(all ? [{ k: "all", d: 12000 }] : []), ...(next ? [{ k: "next", d: 9000 }] : [])];
}
export function sceneAt(scenes, now) {
  const T = scenes.reduce((a, x) => a + x.d, 0);
  if (!T) return { i: -1, p: 0 };
  let t = now % T;
  for (let i = 0; i < scenes.length; i++) {
    if (t < scenes[i].d) return { i, p: t / scenes[i].d };
    t -= scenes[i].d;
  }
  return { i: 0, p: 0 };
}
const PODIUM = [1, 0, 2]; // ekranda 2 · 1 · 3
function EndHero({ data, today, now, onAll }) {
  const plan = data.plan;
  const day = plan.day || today;
  const st = dayStats(data, day);
  const who = whoMap(data);
  const races = (data.starts || []).filter((x) => x.day === day && !x.void && data.rounds?.[x.id] && standings(data.rounds[x.id]).length);
  const top = overallTop(data, 10);
  const nx = plan.next;
  const fcn = data.forecastNext;
  const nrows = (fcn?.rows || []).filter((r) => +r.hh >= 6 && +r.hh <= 20);
  const trows = (data.forecast?.rows || []).filter((r) => +r.hh >= 6 && +r.hh <= 20);
  const scenes = endScenes({ wind: trows.length >= 2 && st.exp != null, races: races.map((x) => x.id), all: !!top, next: !!nx?.at });
  const { i, p } = sceneAt(scenes, now);
  const sc = scenes[i];
  const out = sc && (1 - p) * sc.d < 700; // son 0,7 sn: kart kapanır
  const ew = nx ? expWind(fcn, nx.at) : null;
  const race = sc?.k === "race" ? races.find((x) => x.id === sc.id) : null;
  let head = "", right = "", body = null;
  if (sc?.k === "wind") {
    head = "Bugün rüzgâr";
    body = (
      <div className="lv-gw">
        <div className="lv-gstat">
          <div className="o">
            <span>Esen</span>
            <b>
              {st.real}
              <em>knot</em>
            </b>
          </div>
          <div className="f">
            <span>Beklenen</span>
            <b>
              {st.exp}
              <em>knot</em>
            </b>
          </div>
        </div>
        <div className="lv-gchart">
          <WindBars rows={trows} obsAt={Object.fromEntries((data.forecast?.obs || []).filter((o) => o.wind != null).map((o) => [o.hh, o]))} man={windByHour(data, now)} pts={windPoints(data, now)} nowH={24} at="" flat />
        </div>
      </div>
    );
  } else if (race) {
    const e = data.rounds[race.id];
    const t3 = standings(e).slice(0, 3);
    head = [raceTitle(race), grpText(e.grp)].filter(Boolean).join(" · ");
    right = "Geçici sonuç";
    body = (
      <div className="lv-pod">
        {PODIUM.filter((n) => t3[n]).map((n) => {
          const t = t3[n];
          const w = whoOf(who, t.sail);
          return (
            <div key={t.sail} className={`c p${n + 1}`} style={{ "--d": `${0.35 + (2 - n) * 0.25}s` }}>
              <div className="who">
                <b>{w?.name || t.sail}</b>
                <span>{[t.sail, shortClub(w?.club)].filter(Boolean).join(" · ")}</span>
              </div>
              <div className="blk">{n + 1}</div>
            </div>
          );
        })}
      </div>
    );
  } else if (sc?.k === "all" && top) {
    head = ["Genel sıralama", top.cls].filter(Boolean).join(" · ");
    right = top.tag === "Resmî" ? "" : "Geçici sonuç";
    body = (
      <>
        <ol className="lv-gtab">
          {top.rows.map((r, n) => (
            <li key={`${r.sail}${r.name}`} style={{ "--d": `${0.25 + n * 0.07}s` }}>
              <b>{r.p}</b>
              <span>{shortName(r.name) || r.sail}</span>
              <em>{[r.sail, shortClub(r.club)].filter(Boolean).join(" · ")}</em>
              <u>{r.t}</u>
            </li>
          ))}
        </ol>
        <div className="lv-gfoot">
          {top.total > top.rows.length ? (
            <button type="button" onClick={onAll}>
              {`Tümü · ${top.total} tekne`}
            </button>
          ) : null}
        </div>
      </>
    );
  } else if (sc?.k === "next") {
    head = "Yarın";
    body = (
      <div className="lv-gw">
        <div className="lv-gstat">
          <div className="s">
            <span>İlk start</span>
            <b>{nx.at}</b>
          </div>
          {ew ? (
            <div className="n">
              <span>Beklenen rüzgâr</span>
              <b>
                {ew.kn}
                <em>{`knot${ew.dir != null ? ` ${dirShort(ew.dir)}` : ""}`}</em>
              </b>
            </div>
          ) : null}
        </div>
        {nrows.length >= 2 ? (
          <div className="lv-gchart">
            <WindBars rows={nrows} obsAt={{}} nowH={0} at={nx.at} />
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div className="lv-flow">
      {sc ? (
        <section key={`${sc.k}${sc.id || ""}`} className={`lv-gcard${out ? " out" : ""}`}>
          <header>
            <h2>
              {race ? <Dot g={data.rounds[race.id].grp} /> : null}
              {head}
            </h2>
            {right ? <span>{right}</span> : null}
          </header>
          <div className="lv-gbody">{body}</div>
        </section>
      ) : (
        <section className="lv-gcard">
          <header>
            <h2>Gün sonu</h2>
          </header>
        </section>
      )}
      {scenes.length > 1 ? (
        <div className="lv-flbar" aria-hidden="true">
          {scenes.map((x, n) => (
            <i key={`${x.k}${x.id || ""}`}>
              <s style={{ width: n < i ? "100%" : n === i ? `${Math.round(p * 100)}%` : "0%", transition: n === i ? "width 1s linear" : "none" }} />
            </i>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Ortada büyük sayaç: yalnız geri sayarken (yarış öncesi ilk start'a, start dizisi); start olunca küçülüp alttaki şeride iner
function CenterClock({ show, ...p }) {
  const st = useFade(show, 700);
  if (!st) return null;
  return (
    <div className={`lv-center ${st}`}>
      <Clock {...p} />
    </div>
  );
}

// Parkur sürekli ekranda değil (Seyhun 2026-11-02): yarış öncesinde görünür; yarışta yeni ölçüm girilince ya da kart değişince 20 sn çıkar,
// sonra şeritteki "Parkur"a çekilir; şeritten dokununca açılır. Çizim olimpiyat yayınındaki gibi sahne (lib/courseScene.js): denizde komite,
// pin ve finiş botu, sarı şamandıralar, rota sarı okla çizilip akar. Rota: süren yarışın rotası, yoksa seçili parkur kartınınki.
const COURSE_MS = 20000;
export const sceneRoute = (data, sel, isCur, phase) => {
  const r = phase === "race" && isCur && sel ? data.rounds?.[sel.id]?.route || [] : [];
  return r.length ? r : selCard(cleanCourse(data.course || {})).route;
};
// Gösterim (Seyhun 2026-11-02): yarış öncesi 30 sn'de bir 12 sn kendiliğinden (Yayın'dan kapatılabilir), Yayın'dan "Parkuru göster" ile 15 sn;
// kartsız, arka plan (video ya da deniz/fotoğraf) bulanıklaşır, parkur sağda; bitince bulanıklık kalkar
const courseSvg = (data, route, o = {}) => {
  try {
    return sceneSvg(cardOf(cleanCourse(data.course || {})), route, { pre: "lv", sail: true, sailT: 12, ...o });
  } catch {
    return "";
  }
};
// Parkur ekseni (komitenin parkuru attığı yön) ve son rüzgârın eksenden farkı (+ sağa); ölçüm yoksa null
const axisInfo = (data) => {
  try {
    const k = cardOf(cleanCourse(data.course || {}));
    if (!k || k.axis == null) return null;
    const sh = k.wind == null ? null : ((((Math.round(k.wind) - Math.round(k.axis)) % 360) + 540) % 360) - 180;
    return { deg: Math.round(k.axis), sh };
  } catch {
    return null;
  }
};
const shiftText = (sh) => (sh == null ? "" : Math.abs(sh) < 1 ? "Rüzgâr eksende" : `Rüzgâr eksenden ${Math.abs(sh)}° ${sh > 0 ? "sağa" : "sola"}`);
// Yarış öncesi gösterim (Seyhun 2026-11-02): parkur → rüzgâr (şimdi + beklenen, gün boyu grafik) → günün programı, sırayla 12'şer sn;
// otomatikte dakikada bir tur, Yayın'dan "Göster" ile bir tur. Yarış başlayınca (pre değil) hiçbiri, yeni ölçüm de parkuru açmaz.
// İzleyici şeritteki "Parkur"a dokunursa parkur her zaman açılır.
function slideOn({ data, sel, isCur, open, now, phase, pre, prog }) {
  const svg = !!courseSvg(data, sceneRoute(data, sel, isCur, phase));
  if (open && svg) return "course";
  const slides = [svg ? "course" : "", windShowable(data) ? "wind" : "", prog.length || agOf(data, now) ? "prog" : ""].filter(Boolean);
  // Yayın'dan elle açılan (courseShow.one) her evrede, gün sonunda da ekranda
  const one = isCur ? data.courseShow?.one : "";
  if (one && slides.includes(one)) return one;
  if (!isCur || !pre || phase === "summary") return "";
  const latest = Math.max(0, Date.parse(data.course?.cardAt || "") || 0, ...(data.course?.obs || []).map((o) => Date.parse(o.at) || 0));
  if (svg && latest > 0 && now - latest < COURSE_MS) return "course";
  return showSlide({ show: data.courseShow, now, pre, slides });
}
const windShowable = (data) => (data.forecast?.rows || []).length >= 2 || (data.course?.obs || []).some((o) => o.kind === "wind");
// Rüzgâr gösterimi: üstte şimdiki rüzgâr (ölçüm) ve start saatinde beklenen, altta gün boyu grafik
function WindFloat({ data, sel, isCur, show, now }) {
  const st = useFade(show, 600);
  if (!st) return null;
  return (
    <div className={`lv-scene lv-slide ${st}`}>
      <span className="lv-scenet">Rüzgâr</span>
      <WindBody data={data} sel={sel} isCur={isCur} now={now} />
    </div>
  );
}
const trOf = (iso) => new Date(Date.parse(iso) + 3 * 3600e3).toISOString();
// Rüzgâr gösterimi (Seyhun 2026-11-02 ruzgar-yeni.png onay, "çocuklar bile anlayabilmeli, ne bekleniyordu ne gerçekleşti"):
// üstte iki kutu (şimdi esen + o saatte beklenen ve fark; start'ta beklenen), altta saat saat sütunlar: geçmiş saatler dolu
// (gerçekleşen: istasyon mavi, manuel girilen turuncu; üstünde o saatte beklenen beyaz kesik çizgi), gelecek saatler kesik kenarlı
// soluk (tahmin); start saati ve sonrası geniş ve canlı, öncesi dar ve soluk (Seyhun 2026-11-02); şimdi çizgisi, start çizgisi
// Şimdiki rüzgâr: son 1 saatte elle girilen ölçüm (parkurda, Yayın'dan), yoksa istasyonun son saati. man: elle girildi
function curWind(data, sel, isCur, now) {
  const { w: mine } = lastWind(data, sel, isCur);
  const fc = data.forecast;
  const tr = new Date(now + 3 * 3600e3);
  const so = (fc?.obs || []).filter((o) => o.wind != null).at(-1);
  const fresh = mine?.kn != null && mine.at && now - Date.parse(mine.at) < 3600e3;
  if (fresh) return { kn: mine.kn, dir: mine.dir, range: mine.range || null, hh: tr.toISOString().slice(11, 13), man: true, by: `Manuel girildi ${trOf(mine.at).slice(11, 16)}` };
  return so ? { kn: so.wind, dir: so.dir, range: null, hh: so.hh, man: false, by: `${fc.station || "İstasyon"} ${so.hh}:00` } : null;
}
const degText = (w) => (w?.range ? `${w.range[0]}–${w.range[1]}°` : w?.dir != null ? `${Math.round(w.dir)}°` : "");
// Bekleme ekranında şimdiki rüzgâr (Seyhun 2026-11-02 "rüzgâr yönü daha doğru ve profesyonel; manuel girildiyse gösterilsin"):
// akış yönünü gösteren ok, derece ve pusula, knot; altında kaynak (Manuel girildi 14:05 turuncu ya da istasyon)
function NowWind({ data, now }) {
  const c = curWind(data, null, true, now);
  if (!c || (c.dir == null && c.kn == null)) return null;
  return (
    <div className={`lv-hwind${c.man ? " m" : ""}`}>
      {c.dir != null ? <WindArrow w={c} /> : null}
      <div>
        <b>
          {c.dir != null ? <span>{`${dirShort(c.dir)} ${degText(c)}`}</span> : null}
          {c.kn != null ? <span>{`${c.kn} knot`}</span> : null}
        </b>
        <small>{c.man ? <i /> : null}{c.by}</small>
      </div>
    </div>
  );
}
// Rüzgâr ve hava (Seyhun 2026-11-02 "anlaşılabilir değil; o saatte beklenen'i sıfır saatte beklenen gibi okuyorum" → örnek A onay,
// yayin-tasarim/ruzgar-anlasilir/ruzgar-a.png; "yağmuru da, hava durumunu da göster, beklenen ve gerçekleşen"). Üstte (arka plansız) Şu an esen
// (ölçülen) ve Bugün en çok (tahmin); start saati yalnız grafikteki pembe çizgi (Seyhun 2026-11-02 "o yazıyı kaldır"). Altta tek grafik: tahmin kesik beyaz çizgi (bütün gün), ölçülen mavi düz
// çizgi (istasyon) ve turuncu noktalar (elle girilen); şimdi ve start çizgisi. Grafiğin altında iki saatte bir yön, hava (simge + sıcaklık)
// ve yağış: geçmiş saatte ölçülen (mavi), sonra tahmin (beyaz; yağış olasılığı).
const hh2 = (h) => String(h).padStart(2, "0");
function SkyIcon({ code, x, y, c }) {
  const k = code == null ? "" : code === 0 ? "sun" : code <= 2 ? "part" : code === 3 ? "cloud" : code <= 48 ? "fog" : code >= 95 ? "storm" : "rain";
  if (!k) return null;
  const cloud = "M-11 6 a7 7 0 0 1 1-13.5 a9 9 0 0 1 17 2 a6 6 0 0 1 2 11.5 Z";
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      {k === "sun" || k === "part" ? (
        <g transform={k === "part" ? "translate(-5 -6) scale(.75)" : ""}>
          <circle r="6.5" fill={c} fillOpacity=".25" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="0" y1="-10" x2="0" y2="-13" transform={`rotate(${a})`} />
          ))}
        </g>
      ) : null}
      {k !== "sun" ? <path d={cloud} transform={k === "part" ? "translate(3 3) scale(.8)" : ""} fill={c} fillOpacity=".18" /> : null}
      {k === "rain" ? [-6, 0, 6].map((d) => <line key={d} x1={d} y1="10" x2={d - 2} y2="15" />) : null}
      {k === "storm" ? <path d="M1 8 L-3 14 L2 14 L-1 19" /> : null}
      {k === "fog" ? [9, 13].map((d) => <line key={d} x1="-11" y1={d} x2="11" y2={d} />) : null}
    </g>
  );
}
function WindBody({ data, sel, isCur, now }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fc = data.forecast;
  const rows = (fc?.rows || []).filter((r) => +r.hh >= 6 && +r.hh <= 20 && r.wind != null);
  const obsAt = Object.fromEntries((fc?.obs || []).filter((o) => o.wind != null || o.code != null || o.temp != null).map((o) => [o.hh, o]));
  const tr = new Date(now + 3 * 3600e3);
  // Akşam ekran ertesi güne geçince (see) grafik o günün tahminidir: şimdi çizgisi, ölçülen ve "Şu an esen" yok; başlıkta tarih (Seyhun 2026-11-02
  // "yarını gösteriyor ama tarih olmadığı için anlamıyorum")
  const other = !sel && data.see && data.see > trDay(now) ? data.see : "";
  const nowH = other ? -1 : tr.getUTCHours() + tr.getUTCMinutes() / 60;
  const at = data.plan?.at || "";
  const c = other ? null : curWind(data, sel, isCur, now);
  const rest = rows.filter((r) => +r.hh >= Math.floor(nowH));
  const max = rest.length ? Math.max(...rest.map((r) => r.wind)) : null;
  const maxH = rest.filter((r) => r.wind === max).map((r) => +r.hh);
  const hasSt = Object.values(obsAt).some((o) => o.wind != null);
  const pts = windPoints(data, now);
  const W = 1000, L = 112, R = 26, T = 34, YB = 290, Hh = 486;
  const x = (h) => L + ((h - 6) / 14) * (W - L - R);
  const vals = [...rows.map((r) => r.wind), ...Object.values(obsAt).map((o) => o.wind ?? 0), ...pts.map((p) => p.kn), c?.kn ?? 0];
  const top = Math.max(10, Math.ceil((Math.max(...vals) + 3) / 5) * 5);
  const y = (v) => T + (1 - v / top) * (YB - T);
  const line = (p) => p.map((q, i) => `${i ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" ");
  const fpts = rows.map((r) => [x(+r.hh), y(r.wind)]);
  const opts = rows.filter((r) => +r.hh <= nowH && obsAt[r.hh]?.wind != null).map((r) => [x(+r.hh), y(obsAt[r.hh].wind)]);
  const inDay = nowH >= 6 && nowH <= 20;
  const nowPt = inDay && c?.kn != null ? [x(nowH), y(c.kn)] : null;
  const mline = nowPt && opts.length ? [...opts, nowPt] : opts;
  const atH = at ? +at.slice(0, 2) + +at.slice(3, 5) / 60 : null;
  const evens = rows.filter((r) => +r.hh % 2 === 0);
  const lab = (r) => [x(+r.hh), y(r.wind) - 12];
  const peak = rest.find((r) => r.wind === max);
  return (
    <div className="lv-wa">
      <div className="lv-wkh">
        {c?.kn != null ? (
          <div>
            <small>Şu an esen</small>
            <b className={c.man ? "m" : "o"}>
              {`${c.kn} kn`}
              {c.dir != null ? <span>{` ${dirShort(c.dir)} ${degText(c)}`}</span> : null}
            </b>
            <i>{c.by}</i>
          </div>
        ) : null}
        {max != null ? (
          <div>
            <small>{other ? `${new Date(`${other}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" })} · en çok` : "Bugün en çok"}</small>
            <b>{`${max} kn`}</b>
            <i>{`Tahmin · ${maxH.length > 1 ? `${hh2(maxH[0])}:00–${hh2(maxH.at(-1))}:00` : `${hh2(maxH[0])}:00`}`}</i>
          </div>
        ) : null}
      </div>
      {rows.length >= 2 ? (
        <svg className="lv-wchart" viewBox={`0 0 ${W} ${Hh}`} role="img" aria-label="Rüzgâr ve hava: ölçülen ve tahmin">
          <defs>
            <linearGradient id={`${uid}a`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#4fb3ff" stopOpacity=".35" />
              <stop offset="1" stopColor="#4fb3ff" stopOpacity=".03" />
            </linearGradient>
          </defs>
          {[5, 10, 15, 20, 25].filter((v) => v < top).map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#fff" strokeOpacity=".1" />
              <text x={L - 10} y={y(v) + 5} textAnchor="end" fontSize="15" fill="#fff" fillOpacity=".5">{`${v} kn`}</text>
            </g>
          ))}
          {inDay ? <rect x={L} y={T - 10} width={x(nowH) - L} height={YB - T + 10} fill="#4fb3ff" fillOpacity=".07" /> : null}
          <path d={line(fpts)} fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="3" strokeDasharray="9 7" />
          {mline.length >= 2 ? <path d={`${line(mline)} L${mline.at(-1)[0]} ${y(0)} L${mline[0][0]} ${y(0)} Z`} fill={`url(#${uid}a)`} /> : null}
          {mline.length >= 2 ? <path d={line(mline)} fill="none" stroke="#6cc4ff" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" /> : null}
          {opts.map(([px, py]) => <circle key={px} cx={px} cy={py} r="6" fill="#6cc4ff" stroke="#0b2038" strokeWidth="2" />)}
          {pts.filter((p) => p.h >= 6 && p.h <= Math.min(20, nowH + 0.02)).map((p) => <circle key={p.h} cx={x(p.h)} cy={y(p.kn)} r="6" fill={MAN} stroke="#0b2038" strokeWidth="2" />)}
          {nowPt ? (
            <>
              <circle className="lv-wpulse" cx={nowPt[0]} cy={nowPt[1]} r="9" fill={c.man ? MAN : "#6cc4ff"} stroke="#fff" strokeWidth="3" />
              <text x={nowPt[0] - 14} y={nowPt[1] - 16} textAnchor="end" fontSize="26" fontWeight="800" fill={c.man ? "#ffab66" : "#9ed6ff"}>{`${c.kn} kn şimdi`}</text>
            </>
          ) : null}
          {opts.length >= 2 ? (
            <text x={(opts[0][0] + opts.at(-1)[0]) / 2} y={Math.min(...opts.map((q) => q[1])) - 34} textAnchor="middle" fontSize="17" fontWeight="700" letterSpacing="1.5" fill="#6cc4ff">ÖLÇÜLEN</text>
          ) : null}
          {peak ? (
            <>
              <text x={lab(peak)[0]} y={lab(peak)[1]} textAnchor="middle" fontSize="20" fontWeight="700" fill="#fff">{peak.wind}</text>
              <text x={lab(peak)[0]} y={lab(peak)[1] - 26} textAnchor="middle" fontSize="17" fontWeight="700" letterSpacing="1.5" fill="#fff" fillOpacity=".8">TAHMİN</text>
            </>
          ) : null}
          {rest.filter((r) => r !== peak && +r.hh > nowH + 0.6 && Math.abs(+r.hh - +peak?.hh) > 1 && +r.hh % 3 === 2).map((r) => (
            <text key={r.hh} x={lab(r)[0]} y={lab(r)[1]} textAnchor="middle" fontSize="18" fontWeight="700" fill="#fff" fillOpacity=".85">{r.wind}</text>
          ))}
          {inDay ? (
            <g>
              <line x1={x(nowH)} x2={x(nowH)} y1={T - 14} y2={y(0)} stroke="#fff" strokeWidth="2" />
              <rect x={x(nowH) - 30} y={YB + 6} width="60" height="22" rx="11" fill="#fff" />
              <text x={x(nowH)} y={YB + 22} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0b2038">ŞİMDİ</text>
            </g>
          ) : null}
          {atH != null && atH >= 6 && atH <= 20 ? (
            <g>
              <line x1={x(atH)} x2={x(atH)} y1={T - 14} y2={y(0)} stroke="#ff3d77" strokeWidth="2.5" strokeDasharray="4 4" />
              <text x={x(atH) + 8} y={T + 2} fontSize="16" fontWeight="800" fill="#ff5c8f">{`START ${at}`}</text>
            </g>
          ) : null}
          <text x="4" y={YB + 110} fontSize="13" fontWeight="700" letterSpacing="1" fill="#fff" fillOpacity=".55">HAVA</text>
          <text x="4" y={YB + 176} fontSize="13" fontWeight="700" letterSpacing="1" fill="#fff" fillOpacity=".55">YAĞIŞ</text>
          {evens.map((r) => {
            const h = +r.hh, px = x(h);
            const o = h <= nowH ? obsAt[r.hh] : null;
            const code = o?.code ?? r.code;
            const temp = o?.temp ?? r.t;
            const meas = o && (o.code != null || o.temp != null);
            const col = meas ? "#9ed6ff" : "rgba(255,255,255,.8)";
            const rain = h <= nowH && o?.rain ? (o.rain.mm ? `${String(o.rain.mm).replace(".", ",")} mm` : "Yok") : h > nowH && r.pop != null ? `%${r.pop}` : r.mm != null && h <= nowH ? (r.mm ? `${String(r.mm).replace(".", ",")} mm` : "Yok") : "";
            const rMeas = h <= nowH && !!o?.rain;
            return (
              <g key={r.hh}>
                <text x={px} y={YB + 50} textAnchor="middle" fontSize="15" fontWeight="600" fill="#fff" fillOpacity={h >= nowH ? 0.8 : 0.6}>{`${r.hh}:00`}</text>
                {r.dir != null || o?.dir != null ? (
                  <g transform={`translate(${px - 18} ${YB + 70}) rotate(${(o?.dir ?? r.dir) + 180}) scale(.75)`}>
                    <path d="M0 -10 L6 3 L0 0 L-6 3 Z" fill="#fff" fillOpacity=".85" />
                    <line x1="0" y1="0" x2="0" y2="10" stroke="#fff" strokeOpacity=".85" strokeWidth="2.2" strokeLinecap="round" />
                  </g>
                ) : null}
                {r.dir != null || o?.dir != null ? <text x={px - 6} y={YB + 75} fontSize="13" fontWeight="600" fill="#fff" fillOpacity=".75">{`${Math.round(o?.dir ?? r.dir)}°`}</text> : null}
                <SkyIcon code={code} x={px} y={YB + 106} c={col} />
                {temp != null ? <text x={px} y={YB + 144} textAnchor="middle" fontSize="16" fontWeight="700" fill={col}>{`${temp}°`}</text> : null}
                {rain ? <text x={px} y={YB + 176} textAnchor="middle" fontSize="15" fontWeight="700" fill={rMeas ? "#9ed6ff" : "rgba(255,255,255,.75)"}>{rain}</text> : null}
              </g>
            );
          })}
        </svg>
      ) : null}
      <div className="lv-wleg">
        {hasSt ? (
          <span>
            <i className="lo" />
            {`Ölçülen${fc?.station ? ` (${fc.station} istasyonu)` : ""}`}
          </span>
        ) : null}
        {pts.length ? (
          <span>
            <i className="lm" />
            Elle girilen (parkurda)
          </span>
        ) : null}
        <span>
          <i className="lf" />
          Tahmin
        </span>
      </div>
    </div>
  );
}
const MAN = "#ff9a4d", OBSC = "#4fb3ff";
// rüzgâr gücüne göre tepe rengi (Seyhun 2026-11-02 "grafik biraz daha canlı olabilir"): hafif camgöbeği, orta yeşil, kuvvetli sarı, sert pembe
const knColor = (v) => (v < 6 ? "#7fdcff" : v < 12 ? "#3fe0a0" : v < 17 ? "#ffd23f" : "#ff5d8a");
// yumuşak eğri (Catmull-Rom → Bezier)
const smooth = (p) => p.map((q, i) => { if (!i) return `M${q[0]} ${q[1]}`; const a = p[i - 2] || p[i - 1], b = p[i - 1], c = q, d = p[i + 1] || q; return ` C${b[0] + (c[0] - a[0]) / 6} ${b[1] + (c[1] - a[1]) / 6} ${c[0] - (d[0] - b[0]) / 6} ${c[1] - (d[1] - b[1]) / 6} ${c[0]} ${c[1]}`; }).join("");
function WindBars({ rows, obsAt, man = {}, pts = [], nowH, at, flat = false }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  if (rows.length < 2) return null;
  // yön satırı (Seyhun 2026-11-02 "ne oldu ne bekleniyor grafiğinde yönler derece olarak da gösterilmeli"): saatin altında ok + derece
  const hasDir = rows.some((r) => r.dir != null);
  const W = 1000, H = hasDir ? 470 : 400, L = 50, R = 12, T = 64, B = hasDir ? 136 : 64;
  const i0 = +rows[0].hh;
  // odak: start saati (yoksa şimdi); öncesi dar ve soluk, odak ve sonrası geniş
  const fh = flat ? -1 : at ? +at.slice(0, 2) : Math.floor(nowH);
  const wt = rows.map((r) => (+r.hh < fh ? 0.55 : 1.35));
  const unit = (W - L - R) / wt.reduce((a, b) => a + b, 0);
  const xs = wt.reduce((acc, w, i) => [...acc, acc[i] + w * unit], [L]);
  const xh = (h) => { const k = Math.min(rows.length - 1, Math.max(0, Math.floor(h - i0))); return xs[k] + (xs[k + 1] - xs[k]) * Math.min(1, Math.max(0, h - i0 - k)); };
  const past = (r) => +r.hh + 1 <= nowH + 0.01 || +r.hh <= nowH;
  const got = (r) => (past(r) ? (man[r.hh] ? { v: man[r.hh].wind, c: MAN, d: man[r.hh].dir } : obsAt[r.hh] ? { v: obsAt[r.hh].wind, c: OBSC, d: obsAt[r.hh].dir } : null) : null);
  const vals = [...rows.flatMap((r) => [r.wind, got(r)?.v ?? 0]), ...pts.map((p) => p.kn)];
  const top = Math.max(10, Math.ceil((Math.max(...vals) + 3) / 5) * 5);
  const y = (v) => T + (1 - v / top) * (H - T - B);
  const end = +rows.at(-1).hh + 1;
  const nowX = nowH >= i0 && nowH <= end ? xh(nowH) : null;
  const atH = at ? +at.slice(0, 2) + +at.slice(3, 5) / 60 : null;
  const sx = atH != null && atH >= i0 && atH <= end ? xh(atH) : null;
  const pastEnd = nowX ?? (nowH > end ? W - R : L);
  return (
    <svg className="lv-wbars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Saat saat rüzgâr: gerçekleşen ve beklenen">
      <defs>
        <linearGradient id={`${uid}f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".34" />
          <stop offset="1" stopColor="#fff" stopOpacity=".04" />
        </linearGradient>
        <linearGradient id={`${uid}o`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7cc8ff" />
          <stop offset="1" stopColor="#2f7fd0" />
        </linearGradient>
        <linearGradient id={`${uid}m`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb06b" />
          <stop offset="1" stopColor="#e9722a" />
        </linearGradient>
      </defs>
      {[5, 10, 15, 20, 25].filter((v) => v < top).map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#fff" strokeOpacity=".1" />
          {!flat ? <text x={L - 10} y={y(v) + 5} textAnchor="end" fontSize="15" fill="#fff" fillOpacity=".5">{v}</text> : null}
        </g>
      ))}
      {!flat && pastEnd > L ? <rect x={L} y={T - 40} width={pastEnd - L} height={H - B - T + 40} fill={OBSC} fillOpacity=".06" /> : null}
      {!flat && pastEnd > L + 60 ? <text x={(L + pastEnd) / 2} y={T - 16} textAnchor="middle" fontSize="16" fontWeight="700" letterSpacing="2" fill="#7cc8ff">NE OLDU</text> : null}
      {!flat && pastEnd < W - R - 60 ? <text x={(pastEnd + W - R) / 2} y={T - 16} textAnchor="middle" fontSize="16" fontWeight="700" letterSpacing="2" fill="#fff" fillOpacity=".7">NE BEKLENİYOR</text> : null}
      {rows.map((r, i) => {
        const big = +r.hh >= fh;
        const bw = xs[i + 1] - xs[i];
        const x = xs[i] + bw * (big ? 0.16 : 0.2), w = bw * (big ? 0.68 : 0.6);
        const g = got(r);
        const v = g ? g.v : r.wind;
        const fs = big ? 22 : 13;
        return (
          <g key={r.hh} opacity={big ? 1 : 0.55}>
            {/* çubuklar soldan sağa sırayla yükselir; gerçekleşen dolu renkli, beklenen buzlu cam ve tepesinde rüzgâr gücü rengi */}
            <g className="lv-wb" style={{ "--i": i }}>
              {g ? (
                <>
                  <rect x={x} y={y(v)} width={w} height={y(0) - y(v)} rx="5" fill={`url(#${uid}${g.c === MAN ? "m" : "o"})`} />
                  <line x1={x - 3} x2={x + w + 3} y1={y(r.wind)} y2={y(r.wind)} stroke="#fff" strokeWidth={big ? 3 : 2} strokeDasharray="5 4" />
                </>
              ) : (
                <>
                  <rect x={x} y={y(v)} width={w} height={Math.max(0, y(0) - y(v))} rx="5" fill={`url(#${uid}f)`} stroke="#fff" strokeOpacity={big ? 0.35 : 0.25} strokeWidth="1.5" />
                  <rect x={x} y={y(v)} width={w} height="5" rx="2.5" fill={knColor(v)} />
                </>
              )}
            </g>
            <text x={x + w / 2} y={y(Math.max(v, g ? r.wind : 0)) - 10} textAnchor="middle" fontSize={fs} fontWeight={g || big ? 800 : 700} fill="#fff">
              {v}
            </text>
            {hasDir && (big || +r.hh % 2 === 0) && (g?.d ?? r.dir) != null ? (
              <g>
                <g transform={`translate(${x + w / 2} ${H - B + 50}) rotate(${(g?.d ?? r.dir) + 180}) scale(${big ? 1 : 0.8})`}>
                  <path d="M0 -11 L6 3 L0 0 L-6 3 Z" fill={g?.d != null ? "#fff" : "rgba(255,255,255,.7)"} />
                  <line x1="0" y1="0" x2="0" y2="11" stroke={g?.d != null ? "#fff" : "rgba(255,255,255,.7)"} strokeWidth="2.2" strokeLinecap="round" />
                </g>
                <text x={x + w / 2} y={H - B + 88} textAnchor="middle" fontSize={big ? 15 : 12} fontWeight={big ? 700 : 600} fill="#fff" fillOpacity={g?.d != null ? 0.95 : 0.7}>{`${Math.round(g?.d ?? r.dir)}°`}</text>
              </g>
            ) : null}
            {big || +r.hh % 2 === 0 ? (
              <text x={x + w / 2} y={H - B + 24} textAnchor="middle" fontSize={big ? 14 : 12} fontWeight={big ? 600 : 500} fill="#fff" fillOpacity={big ? 0.75 : 0.55}>{`${r.hh}:00`}</text>
            ) : null}
          </g>
        );
      })}
      {(() => {
        // beklenen rüzgârın akan eğrisi (odak saatinden sonra), parlak
        const q = rows.map((r, i) => [r, i]).filter(([r]) => +r.hh >= fh && !got(r)).map(([r, i]) => [(xs[i] + xs[i + 1]) / 2, y(r.wind) - 2]);
        return !flat && q.length >= 2 ? <path className="lv-wcurve" d={smooth(q)} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeOpacity=".85" /> : null;
      })()}
      {pts
        .filter((p) => p.h >= i0 && p.h <= Math.min(end, nowH + 0.02))
        .map((p, k) => (
          <circle key={k} cx={xh(p.h)} cy={y(p.kn)} r={+p.h >= fh ? 6 : 4} fill={MAN} stroke="#fff" strokeWidth="2" />
        ))}
      {sx != null ? (
        <g>
          <line x1={sx} x2={sx} y1={T - 40} y2={H - B} stroke="#ff3d77" strokeWidth="2.5" strokeDasharray="4 4" />
          <text x={sx} y={T - 46} textAnchor="middle" fontSize="15" fontWeight="800" fill="#ff6b8f">{`START ${at}`}</text>
        </g>
      ) : null}
      {nowX != null ? (
        <g>
          <line x1={nowX} x2={nowX} y1={T - 40} y2={H - B} stroke="#fff" strokeWidth="2" />
          <circle className="lv-wpulse" cx={nowX} cy={T - 40} r="7" fill="#fff" />
          <rect x={nowX - 30} y={H - B + (hasDir ? 104 : 34)} width="60" height="24" rx="12" fill="#fff" />
          <text x={nowX} y={H - B + (hasDir ? 121 : 51)} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0b1a2a">ŞİMDİ</text>
        </g>
      ) : null}
    </svg>
  );
}
// Günün programı: yarış yarış grup, durum ve saat
// Programın maddeleri (Seyhun 2026-11-02 "PDF'teki program: antrenör toplantısı, ilk start, son start saati"): yarış öncesi bütün program,
// o gün o günün maddeleri (geçen soluk, sıradaki vurgulu); program yüklenmediyse günün startları (dayProgram)
const agOf = (data, now) => agendaView(data.plan?.agenda, seeDay(data, now), seeDay(data, now) > trDay(now) ? "00:00" : new Date(now + 3 * 3600e3).toISOString().slice(11, 16));
function AgendaBody({ ag }) {
  if (ag.mode === "day")
    return (
      <div className="lv-slprog lv-agenda">
        {ag.rows.map((x, i) => (
          <div key={i} className={x.state}>
            <i>{x.at || ""}</i>
            <b>{x.text}</b>
            <span>{x.state === "done" ? "Yapıldı" : x.state === "next" ? "Sıradaki" : ""}</span>
          </div>
        ))}
      </div>
    );
  return (
    <div className="lv-slprog lv-agenda all">
      {ag.days.map((d) => (
        <section key={d.day}>
          <h4>{new Date(`${d.day}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" })}</h4>
          {d.rows.map((x, i) => (
            <div key={i}>
              <i>{x.at || ""}</i>
              <b>{x.text}</b>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
function ProgFloat({ prog, show, data, now }) {
  const st = useFade(show, 600);
  if (!st) return null;
  return (
    <div className={`lv-scene lv-slide ${st}`}>
      <span className="lv-scenet">{agOf(data, now)?.mode === "all" ? "Program" : "Bugünün programı"}</span>
      {agOf(data, now) ? <AgendaBody ag={agOf(data, now)} /> : <ProgBody prog={prog} />}
    </div>
  );
}
function ProgBody({ prog }) {
  return (
    <div className="lv-slprog">
      {prog.slice(0, 8).map((x) => (
        <div key={x.key} className={x.state}>
          <Dot g={x.grp} />
          <b>{[x.name, x.grp ? `${x.grp} grup` : ""].filter(Boolean).join(" · ")}</b>
          <span>{x.state === "done" ? "Bitti" : x.state === "now" ? "Canlı" : x.state === "next" ? (x.at ? `Sıradaki · ${x.at}` : "Sıradaki") : x.at || ""}</span>
        </div>
      ))}
    </div>
  );
}
function CourseFloat({ data, sel, isCur, show, phase, onClose }) {
  const route = sceneRoute(data, sel, isCur, phase);
  // aynı yazı üretilince React innerHTML'i yeniden yazmaz, animasyon baştan başlamaz
  const svg = courseSvg(data, route);
  const st = useFade(!!svg && show, 600);
  if (!st || !svg) return null;
  return (
    <button type="button" className={`lv-scene ${st}`} onClick={onClose} aria-label="Parkuru kapat">
      <span className="lv-scenet">{`Parkur · ${routeText(route)}`}</span>
      <div className="lv-sceneb" dangerouslySetInnerHTML={{ __html: svg }} />
    </button>
  );
}

// Örnek yarışın oynatıcısı (yalnız /canli/ornek): adım adı, ‹ ›, durdur, baştan
function DemoBar({ ctl }) {
  return (
    <div className="lv-demo">
      <span>{`Örnek · ${ctl.step + 1}/${ctl.n} · ${ctl.name}`}</span>
      <button type="button" onClick={ctl.prev} aria-label="Önceki adım">
        ‹
      </button>
      <button type="button" onClick={ctl.toggle}>
        {ctl.play ? "Durdur" : "Oynat"}
      </button>
      <button type="button" onClick={ctl.next} aria-label="Sonraki adım">
        ›
      </button>
      <button type="button" onClick={ctl.restart}>
        Baştan
      </button>
    </div>
  );
}

// Tam liste penceresi: günün yarışının şamandıra şamandıra tablosu ya da genel sıralamanın tamamı
function FullList({ kind, data, sel, isCur, id, onClose }) {
  return (
    <div className="lv-pop" role="dialog" aria-label={kind === "all" ? "Genel sıralama" : "Sıralama"} onClick={onClose}>
      <div className="lv-card lv-full" onClick={(e) => e.stopPropagation()}>
        <div className="lv-lab">
          <span>{kind === "all" ? "Genel sıralama" : "Sıralama"}</span>
          <button type="button" className="lv-link" onClick={onClose}>
            Kapat
          </button>
        </div>
        {kind === "all" ? <Overall data={data} /> : <Ranking data={data} sel={sel} isCur={isCur} id={id} />}
      </div>
    </div>
  );
}

export function LiveScreen({ id, y = "" }) {
  const demoOn = id === "ornek";
  useVisit(id); // isimsiz ziyaret haberi (Ayarlar › Yayın)
  const real = useData(demoOn ? "" : id, y);
  const demo = useDemo(demoOn);
  const { data, err, skew } = demoOn ? { data: demo.data, err: "", skew: real.skew } : real;
  const [list, setList] = useState(false);
  const [full, setFull] = useState(""); // "race" | "all": tam liste penceresi
  const [courseOpen, setCourseOpen] = useState(false);
  const [windOpen, setWindOpen] = useState(false);
  const nowMs = useNow(skew, 1000); // evre ve bekleme sayacı için saat (sunucuyla eşlenmiş)
  const router = useRouter();
  // Yarış silinmiş ya da ekranı kapalı (Seyhun 2026-11-01 "sildiğimde linki de kullanılamasın"): paylaşılan link genel sayfaya (/canli) gider
  const gone = !data && err === "yok";
  useEffect(() => {
    if (!gone) return;
    const t = setTimeout(() => router.replace("/canli"), GONE_MS);
    return () => clearTimeout(t);
  }, [gone, router]);
  if (!data) {
    return (
      <div className="lv">
        <Sea />
        <div className="lv-page">
          {gone ? (
            <div className="lv-msg lv-gone">
              <b>Bu yarış kaldırıldı</b>
              <span>Açık yarışların sayfasına geçiliyor.</span>
              <Link href="/canli" className="lv-btn">
                Açık yarışlar
              </Link>
            </div>
          ) : err ? (
            <div className="lv-msg">Bağlanılamadı, yeniden deneniyor.</div>
          ) : (
            <div className="lv-msg lv-mut">Yükleniyor</div>
          )}
        </div>
      </div>
    );
  }
  const starts = data.starts || [];
  const sel = (y && starts.find((x) => x.id === y)) || starts.find((x) => x.id === data.cur) || null;
  // Canlı görünüm: önceki yarış seçilmediyse (henüz start kaydı yokken de sayaç ve ekrandaki yayın görünür; Seyhun 2026-11-01 "süre başlattım gösterilmiyor");
  // aynı anda süren öbür grubun startı da canlıdır (bugün, bitmemiş)
  const isCur = !y || (!!sel && (sel.id === data.cur || (!sel.fin && !sel.void && sel.day === trDay(nowMs))));
  const entry = sel ? data.rounds?.[sel.id] : null;
  const ongoing = isCur && sel && !sel.fin && !sel.void;
  // Evre (lib/raceLive.js livePhase): bekleme (start saatine geri sayım) · yarış (sayaç ya da bugünkü start) · gün özeti
  const today = seeDay(data, nowMs);
  const phase = isCur ? livePhase({ plan: data.plan, starts, timer: data.timer, today, now: nowMs }) : "race";
  const hasVideo = isCur && ["live", "drone", "rec"].includes(data.screen?.kind);
  const csel = phase === "race" ? sel : null;
  const ctimer = phase === "race" ? data.timer : null;
  const cs = clockState({ sel: csel, isCur, timer: ctimer, now: nowMs, entry, data, today });
  // Ortada büyük sayaç yalnız geri sayarken (start'a ya da ilk start'a) ve sayaç durdurulmuşken; sonra şeritte "Süre"
  const auto = isCur && phase !== "summary" ? autoCaption({ plan: data.plan, starts, timer: data.timer, rounds: data.rounds, now: nowMs, today }) : null;
  // Parkur: yarış öncesi (bekleme ya da start'a geri sayım) otomatik; açıkken arka plan bulanık (lv-bc.course)
  const counting = phase !== "summary" && ((cs.rem != null && cs.rem > 0) || cs.label === "Durdu");
  const hasSvg = (data.course?.obs || []).length > 0;
  // Genel sıralama yarışta sağda, alttan yukarı sabit alanda, kaydırılır (Seyhun 2026-11-02 "genel sıralama varsa sağ tarafta")
  const prog = isCur ? dayProgram(data, today) : [];
  // Yarış öncesi gösterim (parkur → rüzgâr → program); süren yarış varken yok (Seyhun 2026-11-02 "yarış başladığında gösterilmemeli")
  const pre = !ongoing && (phase === "wait" || (cs.rem != null && cs.rem > 0));
  // start'tan önce (geri sayımda) yok; Yayın › Video › Genel sıralama ya da sesle "geneli kaldır" ile kapanır (Seyhun 2026-11-02)
  const ovOn = phase === "race" && isCur && !!sel && !pre && data.courseShow?.ov !== false;
  // Videolu yarış öncesi (Seyhun 2026-11-02 videolu/1-yaris-oncesi.png, 2-start-oncesi-turuncu.png onay): solda bulanık şeritte bilgiler,
  // turuncu bayrak çekiliyse "Start öncesi"; Yayın › Video › Sol bilgi ile kapanır. Açıkken gösterim kartları ve alt şerit yok
  const side = isCur && hasVideo && pre && data.courseShow?.side !== false;
  const slide = !(phase === "wait" && !hasVideo) && !side ? slideOn({ data, sel, isCur, open: courseOpen, now: nowMs, phase, pre, prog }) : "";
  const cOn = slide === "course";
  // Yarış öncesi video yokken sade sayfa (Seyhun 2026-11-02 "geri sayım sayfası sade temiz"): ortada sayaç, altta program; şerit yok
  const hero = phase === "wait" && !hasVideo;
  return (
    <div className={`lv lv-bc${slide ? " course" : ""}${hasVideo ? " video" : ""}${counting ? " counting" : ""}${hasVideo && data.screen?.pause ? " pause" : ""} ${phase}`}>
      <Backdrop data={data} isCur={isCur} />
      <div className="lv-page lv-ov">
        {/* Geri tek başına en solda (Seyhun 2026-11-02) */}
        <Link href="/canli" className="lv-back lv-backc" aria-label="Yarışlar">
          ‹
        </Link>
        <div className="lv-left">
          {phase === "race" ? <RankPanel key="race" data={data} sel={sel} isCur={isCur} id={id} max={hasVideo ? 5 : RANK_MAX} onAll={() => setFull("race")} /> : null}
        </div>
        {ovOn ? <OverallSide data={data} n={hasVideo ? 6 : 10} /> : null}
        {(phase === "race" || (phase === "wait" && hasVideo)) && !side ? <ProgramChips items={prog} /> : null}
        {side ? <SidePanel data={data} today={today} cs={cs} prog={prog} now={nowMs} entry={entry} /> : null}
        {hero ? <WaitHero data={data} today={today} cs={cs} prog={prog} now={nowMs} /> : null}
        {phase === "summary" ? <EndHero data={data} today={today} now={nowMs} onAll={() => setFull("all")} /> : null}
        <CenterClock show={counting && !hero && !hasVideo} sel={csel} isCur={isCur} timer={ctimer} skew={skew} entry={entry} data={data} today={today} />
        <CourseFloat data={data} sel={sel} isCur={isCur} show={cOn} phase={phase} onClose={() => setCourseOpen(false)} />
        <WindFloat data={data} sel={sel} isCur={isCur} show={slide === "wind"} now={nowMs} />
        <ProgFloat prog={prog} show={slide === "prog"} data={data} now={nowMs} />
        <div className={`lv-foot${hero || side ? " off" : ""}`}>
          <TitleLine data={data} isCur={isCur} id={id} starts={starts} onList={() => setList(true)} auto={auto} />
          {windOpen && (data.forecast?.rows || []).length ? (
            <button type="button" className="lv-p lv-windpop" onClick={() => setWindOpen(false)} aria-label="Grafiği kapat">
              <WindDay fc={data.forecast} now={nowMs} at={data.plan.at} mine={lastWind(data, sel, isCur).obs} />
            </button>
          ) : null}
          <InfoBar data={data} sel={sel} isCur={isCur} phase={phase} cs={cs} counting={counting} clockIn={counting && hasVideo} today={today} now={nowMs} ongoing={ongoing} hasSvg={hasSvg} prog={prog} onCourse={() => setCourseOpen((v) => !v)} onWind={() => setWindOpen((v) => !v)} />
        </div>
      </div>
      {demoOn ? <DemoBar ctl={demo.ctl} /> : null}
      {list ? <Races id={id} starts={starts} cur={data.cur} sel={sel} fleets={data.fleets} rounds={data.rounds} entries={data.entries} onClose={() => setList(false)} /> : null}
      {full ? <FullList kind={full} data={data} sel={sel} isCur={isCur} id={id} onClose={() => setFull("")} /> : null}
    </div>
  );
}
