"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apText, cleanPlan, dirShort, livePhase, planLabel, planStartMs, raceName, raceTime, raceTitle, seqState, seqSteps, windByHour, bestOffset } from "@/lib/raceLive";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { cleanCourse, selCard } from "@/lib/raceCourse";
import { cleanRoute, routeText, sceneSvg } from "@/lib/courseScene";
import { gapAt, leaderAt, manualFinish, markLabel, markName, nowPos, officialFor, prepName, rankMove, sameSail, SHOW_ON, shortClub, shortName, showSlide, standings, whoBySail, whoOf, ytSrc } from "@/lib/raceRounds";
import { groupColor, onlyCat, provisional } from "@/lib/roundScore";
import { useDemo } from "./demo";
import { dayProgram, expText, expWind } from "./program";
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

function Flag({ kind, cls, down }) {
  const c = `lv-flag${down ? " down" : ""}`;
  if (kind === "cls") return <span className={`${c} cls`}>{/^ilca\s*(\d)/i.exec(cls)?.[1] || cls.slice(0, 1).toUpperCase()}</span>;
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
function Clock({ sel, isCur, timer, skew, entry, data, today }) {
  const now = useNow(skew);
  const { label, value, rem, right } = clockState({ sel, isCur, timer, now, entry, data, today });
  const steps = seqSteps(timer?.dur || 300);
  const st = rem == null ? steps.map(() => (sel?.at && !sel.void ? "done" : "")) : seqState(steps, rem, true);
  if (rem === 0 || (rem == null && sel?.at && !sel.void)) st[st.length - 1] = "now";
  const cls = entry?.cls || "";
  const prep = entry?.prep || "";
  const started = rem === 0 || (rem == null && !!sel?.at && !sel.void);
  const lastMin = started || (rem != null && rem <= 60);
  const flags = [cls ? { kind: "cls", cls, down: started, name: cls } : null, prep ? { kind: prep, down: lastMin, name: prepName(prep) } : null].filter(Boolean);
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
  const today = data.now ? trDay(data.now) : sel?.day || "";
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
  const yt = scr.kind === "live" ? ytSrc(data.stream?.url) : "";
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
  const leg = g ? "Resmî" : pos >= 0 ? (route[pos] === "F" && pos === route.length - 1 ? "Finish" : `${markName(route[pos])} · ${pos + 1}/${route.length}`) : route.length ? route.map(markLabel).join(" · ") : "";
  return (
    <Panel cls="lv-rankp" head="Sıralama" right={leg} onClick={rows.length ? onAll : undefined} label="Tam sıralama">
      {rows.length ? (
        <ol className="lv-rl">
          {rows.slice(0, max).map((r) => (
            <li key={`${r.sail}${r.name}`} className={`${r.isNew ? "new" : ""}${hist ? " h" : ""}`}>
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
              {r.gap ? <u>{r.gap}</u> : null}
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
function OverallPanel({ data, n = 5, onAll, cls = "" }) {
  const top = useMemo(() => overallTop(data, n), [data, n]);
  if (!top) return null;
  return (
    <Panel cls={`lv-allp ${cls}`} head={["Genel", top.cls].filter(Boolean).join(" · ")} right={top.tag} onClick={onAll} label="Genel sıralama">
      <ol className="lv-rl">
        {top.rows.map((r) => (
          <li key={`${r.sail}${r.name}`}>
            <b>{r.p}</b>
            <i>{r.sail}</i>
            <span>{shortName(r.name)}</span>
            <em>{shortClub(r.club)}</em>
            <u>{r.t}</u>
          </li>
        ))}
      </ol>
      {top.total > n ? <div className="lv-pm">{`${top.total} tekne · Tümü`}</div> : null}
    </Panel>
  );
}


// Gün sonu (Seyhun 2026-11-02 "gün sonu tasarımı kötü, geliştir"): ortada büyük "4 yarış yapıldı", altında her yarışın kartı (grup, sınıf, ilk üç);
// solda genel ilk 10, altta rüzgâr çizgisi, alt ortada yarınki ilk start'a geri sayım
function SummaryHero({ data, today }) {
  const plan = data.plan;
  const day = plan.day || today;
  const races = (data.starts || []).filter((x) => x.day === day && !x.void);
  const who = whoMap(data);
  return (
    <div className="lv-sumhero">
      <h1 className="lv-sumh">
        <small>{[data.race.name, dayText(day)].filter(Boolean).join(" · ")}</small>
        {races.length ? `Gün bitti · ${races.length} yarış` : "Gün bitti"}
      </h1>
      {races.length ? (
        <div className="lv-sumraces">
          {races.map((x) => {
            const e = data.rounds?.[x.id];
            const top = e ? standings(e).slice(0, 3) : [];
            return (
              <div key={x.id} className="lv-sumr">
                <header>
                  <b>
                    <Dot g={e?.grp} />
                    {[raceTitle(x), grpText(e?.grp)].filter(Boolean).join(" · ")}
                  </b>
                  <span>{x.fin ? raceTime(x) || "" : ""}</span>
                </header>
                {top.length ? (
                  <ol className="lv-rl">
                    {top.map((t, i) => {
                      const w = whoOf(who, t.sail);
                      return (
                        <li key={t.sail}>
                          <b>{i + 1}</b>
                          <i>{t.sail}</i>
                          <span>{shortName(w?.name)}</span>
                          <em>{shortClub(w?.club)}</em>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="lv-pe">{x.fin ? "Bitti" : hmOf(x.at)}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

// Ekranın altındaki yazı (Seyhun 2026-11-02 "olimpiyat yayınlarındaki gibi"): Yayın › Video › Ekranda yazı; altında sınıf · grup · yarış
// ---- Sade yayın ekranı (Seyhun 2026-11-02 "her yerde bir şey yazıyor, daha sade, bilgi ekranı, alt tarafta") ----
// Son rüzgâr ölçümü (parkur rüzgâr kayıtları + eski canlı rüzgâr); önceki yarışta startındaki
function lastWind(data, sel, isCur) {
  const obs = (data.course?.obs || []).filter((o) => o.kind === "wind").map((o) => ({ at: o.at, dir: o.deg, kn: o.kn, gust: null, range: o.range || null }));
  const upto = !isCur && sel ? sel.fin || sel.at : "";
  const all = [...(data.wind || []), ...obs].filter((x) => x.dir != null && (!upto || x.at <= upto)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  return { w: !isCur && sel?.dir != null ? { at: sel.at, dir: sel.dir, kn: sel.kn, gust: null } : all.at(-1), obs };
}
function WindArrow({ w }) {
  const span = w?.range ? ((w.range[1] - w.range[0] + 540) % 360) - 180 : 0;
  const style = w?.range ? { "--lv-a": `${w.range[0]}deg`, "--lv-b": `${w.range[0] + span}deg` } : { transform: `rotate(${w?.dir ?? 0}deg)` };
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
function InfoBar({ data, sel, isCur, phase, cs, counting, clockIn, today, ongoing, hasSvg, prog = [], onCourse, onWind }) {
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
    if (clockIn) {
      // saat zaten şeritte
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
          <span>{`${dirShort(w.dir)}${w.kn != null ? ` · ${w.kn} knot` : ""}`}</span>
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
          <span>Parkur</span>
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
function holdState(data, today, cs, now) {
  const plan = data.plan;
  const none = plan.status === "none" && plan.day === today;
  const last = (data.starts || []).filter((x) => x.day === today).at(-1);
  const vd = last?.void && (!last.fin || now - Date.parse(last.fin) < 3 * 3600e3) ? last.void : "";
  let box = null;
  if (plan.status === "ap") box = { flag: "AP", head: "Tehir", sub: apText(plan) || "Start ertelendi" };
  else if (vd) {
    const grp = last.grp || data.rounds?.[last.id]?.grp || "";
    const head = [vd === "Genel geri çağırma" ? "Genel geri" : vd, raceName(last)].filter(Boolean).join(" · ");
    const why = vd === "Tehir" ? "Start ertelendi" : "Yarış sayılmadı, yeniden start verilecek";
    box = { flag: voidFlag(vd), head, sub: [last.fin ? `${hmOf(last.fin)}` : "", grp ? `${grp} grup` : "", why].filter(Boolean).join(" · ") };
  }
  const kick = none ? "Bugün yarış yok" : cs.rem ? cs.label : plan.status === "ap" ? "Start ertelendi" : vd ? "Yeni start bekleniyor" : "Start bekleniyor";
  return { none, box, kick };
}
function WaitHero({ data, today, cs, prog, now }) {
  const plan = data.plan;
  const { none, box, kick } = holdState(data, today, cs, now);
  const first = prog.find((x) => x.state === "next") || null;
  const at = plan.status === "done" && plan.next ? plan.next.at : plan.at;
  const svg = courseSvg(data, sceneRoute(data, null, true, "wait"));
  const slides = none ? [] : [svg ? "course" : "", windShowable(data) ? "wind" : "", prog.length ? "prog" : ""].filter(Boolean);
  // vitrin arasız döner; Yayın'dan "Göster" turu baştan başlatır
  const k = slides.length ? showSlide({ show: { ...data.courseShow, auto: false }, now, pre: true, slides }) || slides[Math.floor(now / SHOW_ON) % slides.length] : "";
  return (
    <div className="lv-hold">
      <div className="lv-hst">
        <div className="lv-kick">{kick}</div>
        {!none ? <div className="lv-big">{cs.rem ? cs.value : "—:—"}</div> : null}
        {!none && first ? (
          <div className="lv-what">
            <Dot g={first.grp} />
            {[first.name, grpText(first.grp)].filter(Boolean).join(" · ")}
            <small>{[first.cls, at].filter(Boolean).join(" · ")}</small>
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
            {k === "course" ? <div className="lv-sceneb" dangerouslySetInnerHTML={{ __html: svg }} /> : k === "wind" ? <WindBody data={data} sel={null} isCur now={now} /> : <ProgBody prog={prog} />}
          </div>
        </div>
      ) : null}
    </div>
  );
}
const SLIDE_NAME = { course: "Parkur", wind: "Rüzgâr", prog: "Program" };

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
const courseSvg = (data, route) => {
  try {
    return sceneSvg(cardOf(cleanCourse(data.course || {})), route, { pre: "lv", wind: false, sail: true, sailT: 12 });
  } catch {
    return "";
  }
};
// Yarış öncesi gösterim (Seyhun 2026-11-02): parkur → rüzgâr (şimdi + beklenen, gün boyu grafik) → günün programı, sırayla 12'şer sn;
// otomatikte dakikada bir tur, Yayın'dan "Göster" ile bir tur. Yarış başlayınca (pre değil) hiçbiri, yeni ölçüm de parkuru açmaz.
// İzleyici şeritteki "Parkur"a dokunursa parkur her zaman açılır.
function slideOn({ data, sel, isCur, open, now, phase, pre, prog }) {
  const svg = !!courseSvg(data, sceneRoute(data, sel, isCur, phase));
  if (open && svg) return "course";
  if (!isCur || !pre) return "";
  const latest = Math.max(0, Date.parse(data.course?.cardAt || "") || 0, ...(data.course?.obs || []).map((o) => Date.parse(o.at) || 0));
  if (svg && latest > 0 && now - latest < COURSE_MS) return "course";
  const slides = [svg ? "course" : "", windShowable(data) ? "wind" : "", prog.length ? "prog" : ""].filter(Boolean);
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
function WindBody({ data, sel, isCur, now }) {
  const { w: mine } = lastWind(data, sel, isCur);
  const fc = data.forecast;
  const rows = (fc?.rows || []).filter((r) => +r.hh >= 6 && +r.hh <= 20);
  const man = windByHour(data, now);
  const obsAt = Object.fromEntries((fc?.obs || []).filter((o) => o.wind != null).map((o) => [o.hh, o]));
  const tr = new Date(now + 3 * 3600e3);
  const nowH = tr.getUTCHours() + tr.getUTCMinutes() / 60;
  // şimdi: manuel son ölçüm (1 saatten yeni), yoksa istasyonun son saati
  const so = (fc?.obs || []).filter((o) => o.wind != null).at(-1);
  const fresh = mine?.kn != null && mine.at && now - Date.parse(mine.at) < 3600e3;
  const cur = fresh ? { kn: mine.kn, dir: mine.dir, hh: tr.toISOString().slice(11, 13), by: `Manuel girildi ${trOf(mine.at).slice(11, 16)}` } : so ? { kn: so.wind, dir: so.dir, hh: so.hh, by: `${fc.station || "İstasyon"} ${so.hh}:00` } : null;
  const was = cur ? rows.find((r) => r.hh === cur.hh) : null;
  const diff = cur && was ? cur.kn - was.wind : null;
  const ew = expWind(fc, data.plan.at);
  // şimdiden start'a: rüzgâr artacak mı, ne kadar sonra
  const dk = cur && ew ? ew.kn - cur.kn : 0;
  const trend = dk >= 2 ? "Artacak" : dk <= -2 ? "Azalacak" : "Aynı kalacak";
  const mins = data.plan.at ? Math.round(+data.plan.at.slice(0, 2) * 60 + +data.plan.at.slice(3, 5) - nowH * 60) : 0;
  const left = mins > 0 ? (mins >= 60 ? `${Math.floor(mins / 60)} sa ${mins % 60} dk sonra` : `${mins} dk sonra`) : "";
  const hasSt = Object.keys(obsAt).length > 0, hasMan = rows.some((r) => man[r.hh]);
  return (
    <>
      <WindBars rows={rows} obsAt={obsAt} man={man} nowH={nowH} at={data.plan.at} />
      {cur || ew ? (
        <div className="lv-wnow">
          {cur ? (
            <div className={`a${fresh ? " m" : ""}`}>
              <span>Şimdi</span>
              <b>
                {cur.kn}
                <em>knot</em>
                {cur.dir != null ? <i>{dirShort(cur.dir)}</i> : null}
              </b>
              <small>{was ? (diff ? `Tahmin ${was.wind} knot idi · ${Math.abs(diff)} knot ${diff > 0 ? "fazla" : "az"}` : `Tahmin ${was.wind} knot idi · tam tuttu`) : cur.by}</small>
              {was ? <small className="src">{cur.by}</small> : null}
            </div>
          ) : null}
          {cur && ew ? (
            <div className="mid" aria-hidden="true">
              <span>{trend}</span>
              <svg viewBox="0 0 120 20"><line x1="2" y1="10" x2="104" y2="10" /><path d="M102 3 L118 10 L102 17 Z" /></svg>
              <small>{left}</small>
            </div>
          ) : null}
          {ew ? (
            <div className="b">
              <span>{`Start ${data.plan.at} · beklenen`}</span>
              <b>
                {ew.kn}
                <em>knot</em>
                {ew.dir != null ? <i>{dirShort(ew.dir)}</i> : null}
              </b>
              <small>{ew.gust && ew.gust > ew.kn ? `Sağanak ${ew.gust} knot` : "Tahmin"}</small>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="lv-wleg">
        {hasMan ? (
          <span>
            <i className="m" />
            Manuel girildi
          </span>
        ) : null}
        {hasSt ? (
          <span>
            <i className="o" />
            {`Gerçekleşen${fc?.station ? ` (${fc.station} istasyonu)` : ""}`}
          </span>
        ) : null}
        <span>
          <i className="f" />
          Beklenen (tahmin)
        </span>
        {hasSt || hasMan ? (
          <span>
            <i className="l" />O saatte beklenen
          </span>
        ) : null}
      </div>
    </>
  );
}
const MAN = "#ff9a4d", OBSC = "#4fb3ff";
function WindBars({ rows, obsAt, man = {}, nowH, at }) {
  if (rows.length < 2) return null;
  const W = 1000, H = 400, L = 50, R = 12, T = 64, B = 64;
  const i0 = +rows[0].hh;
  // odak: start saati (yoksa şimdi); öncesi dar ve soluk, odak ve sonrası geniş
  const fh = at ? +at.slice(0, 2) : Math.floor(nowH);
  const wt = rows.map((r) => (+r.hh < fh ? 0.55 : 1.35));
  const unit = (W - L - R) / wt.reduce((a, b) => a + b, 0);
  const xs = wt.reduce((acc, w, i) => [...acc, acc[i] + w * unit], [L]);
  const xh = (h) => { const k = Math.min(rows.length - 1, Math.max(0, Math.floor(h - i0))); return xs[k] + (xs[k + 1] - xs[k]) * Math.min(1, Math.max(0, h - i0 - k)); };
  const past = (r) => +r.hh + 1 <= nowH + 0.01 || +r.hh <= nowH;
  const got = (r) => (past(r) ? (man[r.hh] ? { v: man[r.hh].wind, c: MAN } : obsAt[r.hh] ? { v: obsAt[r.hh].wind, c: OBSC } : null) : null);
  const vals = rows.flatMap((r) => [r.wind, got(r)?.v ?? 0]);
  const top = Math.max(10, Math.ceil((Math.max(...vals) + 3) / 5) * 5);
  const y = (v) => T + (1 - v / top) * (H - T - B);
  const end = +rows.at(-1).hh + 1;
  const nowX = nowH >= i0 && nowH <= end ? xh(nowH) : null;
  const atH = at ? +at.slice(0, 2) + +at.slice(3, 5) / 60 : null;
  const sx = atH != null && atH >= i0 && atH <= end ? xh(atH) : null;
  const pastEnd = nowX ?? (nowH > end ? W - R : L);
  return (
    <svg className="lv-wbars" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Saat saat rüzgâr: gerçekleşen ve beklenen">
      {[5, 10, 15, 20, 25].filter((v) => v < top).map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#fff" strokeOpacity=".1" />
          <text x={L - 10} y={y(v) + 5} textAnchor="end" fontSize="15" fill="#fff" fillOpacity=".5">{v}</text>
        </g>
      ))}
      {pastEnd > L ? <rect x={L} y={T - 40} width={pastEnd - L} height={H - B - T + 40} fill={OBSC} fillOpacity=".06" /> : null}
      {pastEnd > L + 60 ? <text x={(L + pastEnd) / 2} y={T - 16} textAnchor="middle" fontSize="16" fontWeight="700" letterSpacing="2" fill="#7cc8ff">NE OLDU</text> : null}
      {pastEnd < W - R - 60 ? <text x={(pastEnd + W - R) / 2} y={T - 16} textAnchor="middle" fontSize="16" fontWeight="700" letterSpacing="2" fill="#fff" fillOpacity=".7">NE BEKLENİYOR</text> : null}
      {rows.map((r, i) => {
        const big = +r.hh >= fh;
        const bw = xs[i + 1] - xs[i];
        const x = xs[i] + bw * (big ? 0.16 : 0.2), w = bw * (big ? 0.68 : 0.6);
        const g = got(r);
        const v = g ? g.v : r.wind;
        const fs = big ? 22 : 13;
        return (
          <g key={r.hh} opacity={big ? 1 : 0.5}>
            {g ? (
              <>
                <rect x={x} y={y(v)} width={w} height={y(0) - y(v)} rx="4" fill={g.c} />
                <line x1={x - 3} x2={x + w + 3} y1={y(r.wind)} y2={y(r.wind)} stroke="#fff" strokeWidth={big ? 3 : 2} strokeDasharray="5 4" />
              </>
            ) : (
              <rect x={x} y={y(v)} width={w} height={Math.max(0, y(0) - y(v))} rx="4" fill="#fff" fillOpacity={big ? 0.2 : 0.14} stroke="#fff" strokeOpacity={big ? 0.75 : 0.5} strokeWidth="2" strokeDasharray="5 4" />
            )}
            <text x={x + w / 2} y={y(Math.max(v, g ? r.wind : 0)) - 10} textAnchor="middle" fontSize={fs} fontWeight={g || big ? 800 : 700} fill="#fff">
              {v}
            </text>
            {big || +r.hh % 2 === 0 ? (
              <text x={x + w / 2} y={H - B + 26} textAnchor="middle" fontSize={big ? 18 : 13} fontWeight={big ? 700 : 500} fill="#fff" fillOpacity={big ? 0.85 : 0.6}>{r.hh}</text>
            ) : null}
          </g>
        );
      })}
      {sx != null ? (
        <g>
          <line x1={sx} x2={sx} y1={T - 40} y2={H - B} stroke="#ff3d77" strokeWidth="2.5" strokeDasharray="4 4" />
          <text x={sx} y={T - 46} textAnchor="middle" fontSize="15" fontWeight="800" fill="#ff6b8f">{`START ${at}`}</text>
        </g>
      ) : null}
      {nowX != null ? (
        <g>
          <line x1={nowX} x2={nowX} y1={T - 40} y2={H - B} stroke="#fff" strokeWidth="2" />
          <rect x={nowX - 30} y={H - B + 34} width="60" height="24" rx="12" fill="#fff" />
          <text x={nowX} y={H - B + 51} textAnchor="middle" fontSize="14" fontWeight="800" fill="#0b1a2a">ŞİMDİ</text>
        </g>
      ) : null}
    </svg>
  );
}
// Günün programı: yarış yarış grup, durum ve saat
function ProgFloat({ prog, show }) {
  const st = useFade(show, 600);
  if (!st) return null;
  return (
    <div className={`lv-scene lv-slide ${st}`}>
      <span className="lv-scenet">Bugünün programı</span>
      <ProgBody prog={prog} />
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
  const today = trDay(nowMs);
  const phase = isCur ? livePhase({ plan: data.plan, starts, timer: data.timer, today, now: nowMs }) : "race";
  const hasVideo = isCur && (data.screen?.kind === "live" || data.screen?.kind === "rec");
  const csel = phase === "race" ? sel : null;
  const ctimer = phase === "race" ? data.timer : null;
  const cs = clockState({ sel: csel, isCur, timer: ctimer, now: nowMs, entry, data, today });
  // Ortada büyük sayaç yalnız geri sayarken (start'a ya da ilk start'a) ve sayaç durdurulmuşken; sonra şeritte "Süre"
  const auto = isCur && phase !== "summary" ? autoCaption({ plan: data.plan, starts, timer: data.timer, rounds: data.rounds, now: nowMs, today }) : null;
  // Parkur: yarış öncesi (bekleme ya da start'a geri sayım) otomatik; açıkken arka plan bulanık (lv-bc.course)
  const counting = phase !== "summary" && ((cs.rem != null && cs.rem > 0) || cs.label === "Durdu");
  const hasSvg = (data.course?.obs || []).length > 0;
  // Genel sıralama yarışta sağda, alttan yukarı sabit alanda, kaydırılır (Seyhun 2026-11-02 "genel sıralama varsa sağ tarafta")
  const ov = phase === "race" && isCur ? overallTop(data, 1) : null;
  const prog = isCur ? dayProgram(data, today) : [];
  // Yarış öncesi gösterim (parkur → rüzgâr → program); süren yarış varken yok (Seyhun 2026-11-02 "yarış başladığında gösterilmemeli")
  const pre = !ongoing && (phase === "wait" || (cs.rem != null && cs.rem > 0));
  const slide = phase !== "summary" && !(phase === "wait" && !hasVideo) ? slideOn({ data, sel, isCur, open: courseOpen, now: nowMs, phase, pre, prog }) : "";
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
        {ov ? (
          <div className="lv-right">
            <OverallPanel data={data} n={200} cls="lv-rside" />
          </div>
        ) : null}
        {phase === "race" || (phase === "wait" && hasVideo) ? <ProgramChips items={prog} /> : null}
        {hero ? <WaitHero data={data} today={today} cs={cs} prog={prog} now={nowMs} /> : null}
        {phase === "summary" ? (
          <div className="lv-end">
            <SummaryHero data={data} today={today} />
            <OverallPanel data={data} n={10} cls="lv-endall" onAll={() => setFull("all")} />
          </div>
        ) : null}
        <CenterClock show={counting && !hero && !hasVideo} sel={csel} isCur={isCur} timer={ctimer} skew={skew} entry={entry} data={data} today={today} />
        <CourseFloat data={data} sel={sel} isCur={isCur} show={cOn} phase={phase} onClose={() => setCourseOpen(false)} />
        <WindFloat data={data} sel={sel} isCur={isCur} show={slide === "wind"} now={nowMs} />
        <ProgFloat prog={prog} show={slide === "prog"} />
        <div className={`lv-foot${hero ? " off" : ""}`}>
          <TitleLine data={data} isCur={isCur} id={id} starts={starts} onList={() => setList(true)} auto={auto} />
          {windOpen && (data.forecast?.rows || []).length ? (
            <button type="button" className="lv-p lv-windpop" onClick={() => setWindOpen(false)} aria-label="Grafiği kapat">
              <WindDay fc={data.forecast} now={nowMs} at={data.plan.at} mine={lastWind(data, sel, isCur).obs} />
            </button>
          ) : null}
          <InfoBar data={data} sel={sel} isCur={isCur} phase={phase} cs={cs} counting={counting} clockIn={counting && hasVideo} today={today} ongoing={ongoing} hasSvg={hasSvg} prog={prog} onCourse={() => setCourseOpen((v) => !v)} onWind={() => setWindOpen((v) => !v)} />
        </div>
      </div>
      {demoOn ? <DemoBar ctl={demo.ctl} /> : null}
      {list ? <Races id={id} starts={starts} cur={data.cur} sel={sel} fleets={data.fleets} rounds={data.rounds} entries={data.entries} onClose={() => setList(false)} /> : null}
      {full ? <FullList kind={full} data={data} sel={sel} isCur={isCur} id={id} onClose={() => setFull("")} /> : null}
    </div>
  );
}
