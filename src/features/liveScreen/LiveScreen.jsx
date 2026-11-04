"use client";

import { Fragment, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { liveUrl } from "@/lib/raceCams";
import { momentRace, momentRaceName, apText, nextRaceNo, cleanPlan, daysUntil, orangeUp, raceDays, dirShort, livePhase, planLabel, planStartMs, raceName, raceTime, raceTitle, seqState, seqSteps, windByHour, windPoints, bestOffset } from "@/lib/raceLive";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { CARD_TYPES, ORSA_M, cardType, cleanCourse, lineBias, selCard } from "@/lib/raceCourse";
import { cleanRoute, routeText, sceneSvg } from "@/lib/courseScene";
import { recTitle, windAhead, gapAt, leaderAt, manualFinish, markLabel, markName, nowPos, officialFor, prepName, rankMove, sameSail, shortClub, shortName, preStep, cleanCourseShow, sceneOf, sceneScreen, showSlide, standings, whoBySail, whoOf, screenUrl, ytSrc } from "@/lib/raceRounds";
import { VeloraGlyph } from "@/components/ui/AppLogo";
import { catsOf, groupColor, groupMap, groupsOn, onlyCat, provisional } from "@/lib/roundScore";
import { colorOf as windColor } from "@/lib/windMap";
import { BoatMap } from "@/features/tracking/BoatMap";
import { BoatLive } from "@/features/tracking/BoatLive";
import { HourTable } from "@/features/weather/HourTable";
import { useDemo } from "./demo";
import { useVisit } from "./useVisit";
import { dayProgram, expText, expWind } from "./program";
import { agendaView } from "@/lib/raceProgram";
import { autoCaption } from "@/lib/raceCaption";
import { flagSvg, signalOf, sigOnCard, soundText } from "@/lib/raceSignals";
import "./liveScreen.css";
import "./sahne.css";

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
// Son veri bu tarayıcıda saklanır (Seyhun 2026-11-03 "loading mantığı yanlış"): yarış yeniden açılınca ekran hemen son haliyle gelir,
// arkadan tazelenir; ilk açılışta yalnız yarışın adı (listeden) ve ince yükleme çizgisi, sahte yerleşim yok
const cacheKey = (id) => `lv-data:${id}`;
export const PRE_KEY = (id) => `lv-pre:${id}`;
const subNoop = () => () => {};
// sessionStorage'daki kayıt (sunucuda boş; etki içinde setState yok)
function useStored(key) {
  const raw = useSyncExternalStore(
    subNoop,
    () => {
      try {
        return key ? sessionStorage.getItem(key) : null;
      } catch {
        return null;
      }
    },
    () => null,
  );
  return useMemo(() => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [raw]);
}
const dropStore = (k) => {
  try {
    sessionStorage.removeItem(k);
  } catch {
    /* özel pencere */
  }
};
const writeStore = (k, v) => {
  try {
    sessionStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* yer yok, özel pencere: önbelleksiz sürer */
  }
};
function useData(id, y) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [gone, setGone] = useState(false);
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
          setGone(false);
          setErr("");
          if (!y) writeStore(cacheKey(id), j);
        } else if (res.status === 404 && j?.error === "yok") {
          // Yarış silinmiş ya da ekranı kapalı (Seyhun 2026-11-03 "sildim ama link hâlâ çalışıyor"): tarayıcıdaki son kopya da
          // silinir, ekranda eski veri kalmaz; "Bu yarış kaldırıldı" sayfası çıkar
          dropStore(cacheKey(id));
          setData(null);
          setGone(true);
          setErr("yok");
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
  // sunucu yanıtı gelene kadar önbellekteki son veri
  const cached = useStored(id && !y ? cacheKey(id) : "");
  const fromCache = useMemo(() => (cached?.race ? fillData(cached) : null), [cached]);
  return { data: gone ? null : data || fromCache, err, skew };
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
          <svg viewBox="10 0 40 40" aria-label="Optimist">
            <circle cx="30" cy="15.4" r="11.2" fill="none" stroke="currentColor" strokeWidth="2.6" />
            <path d="M27.1 14.6 L32.9 14.6 Q31.35 15.4 31.3 16.9 L31.3 35.2 Q31.35 36.6 32.9 37.4 L27.1 37.4 Q28.65 36.6 28.7 35.2 L28.7 16.9 Q28.65 15.4 27.1 14.6 Z" fill="currentColor" />
          </svg>
        ) : (
          <b>{CLASS_SHORT(cls)}</b>
        )}
      </span>
    );
  // İşaret bayrakları (AP, FS, N, P, I, U, Z, Kara…): her yerde Yayın › Bayrak penceresindekiyle aynı çizim (lib/raceSignals flagSvg;
  // Seyhun 2026-11-04 "bayrak butonundaki tehir bayrağını kullanalım, başka yerde farklı olmasın")
  const art = flagSvg(kind);
  return art ? <span className={`${c} art${/^(AP|FS|n\d)$/.test(kind) ? " pen" : ""}`} dangerouslySetInnerHTML={{ __html: art }} /> : null;
}
// Geçersiz startın bayrağı (Seyhun 2026-11-02 "genel geri bayrağı, tehir bayrağı görseli"): Tehir → AP, Genel geri çağırma → 1. tekrar, İptal → N
const voidFlag = (v) => (/tehir/i.test(v || "") ? "AP" : /genel/i.test(v || "") ? "FS" : /abandone|iptal|İptal/i.test(v || "") ? "N" : "");


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
    const apDown = plan.status === "ap" && plan.ap?.down ? Date.parse(plan.ap.down) : 0;
    if (apDown && apDown > now) {
      // Tehir süresi belliyse inişine geri sayım (Seyhun 2026-11-03 "bir saatlik tehirse bir saat geri sayımda göstermeliyiz")
      rem = (apDown - now) / 1000;
      label = "Tehir inişine";
      value = clockOf(Math.ceil(rem));
      right = apText(plan);
    } else if (ms && ms > now) {
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


// Parkur panelinin başlığındaki rota: "1 · 4 · 1 · 2 · 3 · Finish"

// Zemin (Seyhun 2026-11-01 "koyuluktan açıklığa, yarış parkuru havası"): üstte açık deniz mavisi, altta koyu lacivert; arkada soluk bir
// parkur (şamandıralar, kesik rota, start hattı) ve dalga dokusu. Yazılar öne çıksın diye hepsi çok soluk.
// Zemin: açıktan koyuya deniz, çok soluk dalga deseni; parkur çizgisi kaldırıldı (Seyhun 2026-11-01 "dandik parkur gibi")
// Video yokken arkada soluk yarış fotoğrafı (Seyhun 2026-11-02 "video yoksa arkada güzel bir yarış fotoğrafı, soluk"); dosya yoksa
// yalnız deniz rengi kalır (CSS arka planı, kırık resim görünmez). Video gelince video, duraklatılınca da o video görünür.
// Seyhun 2026-11-02 seçti (sail-world.com Optimist fotoğrafı; sunucumuza indirilemedi, tarayıcı doğrudan oradan yükler)
export const BG_PHOTO = "https://www.sail-world.com/photos/optimist/yysw256373.jpg";
// Yükleniyor (Seyhun 2026-11-03 "o loading tasarımı yanlış, daha doğru mantıkla"): eski iskelet (sahte sıralama paneli, CANLI rozeti) yarış
// başlamamışken yanlış bir ekran vaat ediyordu. Şimdi: düz zemin, sol üstte geri ve yarışın adı (listeden geldiyse hemen), üstte ince kayan
// çizgi; başka bir şey yok. Daha önce açıldıysa veri önbellekten anında gelir, bu ekran hiç görünmez.
function LoadSkel({ name = "" }) {
  return (
    <div className="lv-skel" role="status" aria-label="Yükleniyor">
      <i className="lv-loadline" />
      <div className="lv-topl">
        <Link href="/canli" className="lv-back lv-backc" aria-label="Yarışlar">
          ‹
        </Link>
      </div>
      {/* Velora yükleme işareti (Seyhun 2026-11-04 "eski kalmış loading alanı yeni Velora tasarımıyla"): ortada V daire, çevresinde dönen ince
          mavi halka, altında yarışın adı (listeden geldiyse hemen) ve "Yayına bağlanılıyor" */}
      <div className="lv-lbrand">
        <span className="ring">
          <VeloraGlyph size={56} />
        </span>
        {name ? <b>{name}</b> : null}
        <small>Yayına bağlanılıyor</small>
      </div>
    </div>
  );
}
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
  const official = (data.fleets || []).filter((f) => f.rows?.length); // puansız sonuç PDF'i (geçici sonuçlar) de sırasıyla (Seyhun 2026-11-04)
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
// Arka plan görüntüsü ve geçiş (Seyhun 2026-11-03 "video yüklenirken hemen yayına alma; önce arka planda yüklensin, sonra profesyonel geçiş"):
// yeni kaynak görünmez katmanda yüklenir (iframe/video/resim hazır olunca ya da en geç LOAD_MS sonra), sonra eskisiyle çapraz geçişle öne gelir
const LOAD_MS = 8000;
const FADE_MS = 1100;
const noSub = () => () => {};
function Backdrop({ data, isCur, entry }) {
  const scr = isCur ? data.screen || {} : {};
  // canlı yayın ya da drone; ekrandaki yarışın grubuna kamera bağlıysa o kamera (lib/raceCams.js)
  const yt = ytSrc(liveUrl(screenUrl(scr, data.stream), scr, data.stream, data.camBy, entry));
  const rec = scr.kind === "rec" ? (data.media || []).find((m) => m.id === scr.mid) : null;
  const on = !!(yt || rec);
  const st = useFade(on, 900);
  const vref = useRef(null);
  const key = yt ? `y:${yt}` : rec ? `r:${rec.id}:${scr.loop ? 1 : 0}` : "";
  const [layers, setLayers] = useState([]); // {k, yt, rec, loop, s: "load" | "in" | "out"}
  const [seen, setSeen] = useState("");
  if (key !== seen) {
    setSeen(key);
    if (key) {
      const nl = { k: key, yt, rec, loop: !!scr.loop };
      setLayers((ls) => (ls.some((l) => l.k === key) ? ls : [...ls.filter((l) => l.s !== "load"), { ...nl, s: st && ls.length ? "load" : "in" }]));
    }
  }
  if (!on && !st && layers.length) setLayers([]);
  const ready = (k) => setLayers((ls) => (ls.some((l) => l.k === k && l.s === "load") ? ls.map((l) => (l.k === k ? { ...l, s: "in" } : l.s === "in" ? { ...l, s: "out" } : l)) : ls));
  const loadK = layers.find((l) => l.s === "load")?.k || "";
  const outN = layers.filter((l) => l.s === "out").length;
  useEffect(() => {
    if (!loadK) return undefined;
    const t = setTimeout(() => ready(loadK), LOAD_MS);
    return () => clearTimeout(t);
  }, [loadK]);
  useEffect(() => {
    if (!outN) return undefined;
    const t = setTimeout(() => setLayers((ls) => ls.filter((l) => l.s !== "out")), FADE_MS + 200);
    return () => clearTimeout(t);
  }, [outN]);
  // Duraklatılınca tekrar videosu durur, sürdürülünce devam eder (canlı yayın iframe'i yalnız karartılır)
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    if (scr.pause) v.pause();
    else v.play?.().catch?.(() => {});
  }, [scr.pause, on]);
  // Tanı (Seyhun 2026-11-03: Yayın'da seçilen video canlı ekranda görünmüyor, tekneler görünüyor): /canli/<yarış>?tani=1 ekranda ne geldiğini yazar
  const tani = useSyncExternalStore(noSub, () => /[?&]tani=1/.test(window.location.search), () => false);
  return (
    <>
      {tani ? (
        <pre style={{ position: "fixed", left: 8, right: 8, top: 8, zIndex: 99, maxHeight: "60vh", overflow: "auto", background: "rgba(0,0,0,0.85)", color: "#9f9", font: "11px/1.4 monospace", padding: 8, borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {JSON.stringify({ isCur, screen: data.screen, raw: screenUrl(scr, data.stream), yt, rec: rec ? rec.id : null, on, st, layers: layers.map((l) => `${l.k}:${l.s}`), sources: (data.stream?.sources || []).map((x) => `${x.id} ${x.url}`), url: data.stream?.url, drone: data.stream?.drone, camBy: data.camBy, entry: entry ? { cls: entry.cls, grp: entry.grp } : null }, null, 1)}
        </pre>
      ) : null}
      <Sea photo={on ? "" : BG_PHOTO} />
      {/* Canlı tekne konumları (Seyhun 2026-11-03): Yayın › Video › Tekneler; ekrandaki yarışın grubu (şimdilik start anı, döngüde) */}
      {scr.kind === "boats" ? (
        <div className="lv-boats" aria-hidden="true">
          <BoatLive grp={entry?.grp || ""} zoom={scr.zoom ?? 100} course={data.course || null} />
        </div>
      ) : null}
      {st && layers.length ? (
        <div className={`lv-bg ${st}`} aria-hidden="true">
          {layers.map((l) => {
            // dikey telefon videosu (h > w) kırpılmaz: ortada tam boy, iki yanı bulanık kopyası (Seyhun 2026-11-01 "dikey ve yatay video güzel gösterilsin")
            const tall = !!(l.rec?.w && l.rec.h > l.rec.w);
            return (
              <div key={l.k} className={`lv-bgl ${l.s}${tall ? " tall" : ""}`}>
                {tall && l.rec?.kind === "video" ? <video className="lv-bgblur" src={l.rec.url} autoPlay muted playsInline loop /> : null}
                {l.yt ? (
                  <iframe title="Canlı yayın" src={l.yt} allow="autoplay; encrypted-media; picture-in-picture" onLoad={() => ready(l.k)} />
                ) : l.rec?.kind === "video" ? (
                  <video ref={l.s === "in" ? vref : undefined} src={l.rec.url} poster={l.rec.thumb || undefined} autoPlay muted playsInline loop={l.loop} onCanPlay={() => ready(l.k)} />
                ) : l.rec ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.rec.url} alt="" onLoad={() => ready(l.k)} />
                ) : null}
              </div>
            );
          })}
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
  const official = (data.fleets || []).filter((f) => f.rows?.length); // puansız sonuç PDF'i (geçici sonuçlar) de sırasıyla (Seyhun 2026-11-04)
  if (official.length) {
    const f = official[0];
    return { tag: "Resmî", cls: f.cls || "", rows: f.rows.slice(0, n).map((r, i) => ({ p: r.rank || r.place || r.code || i + 1, sail: r.sail, name: r.name, club: r.club, t: r.pts })), total: f.rows.length };
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
  const obs = (data.course?.obs || []).filter((o) => o.kind === "wind").map((o) => ({ at: o.at, dir: o.deg, kn: o.kn, gust: o.gust ?? null, range: o.range || null }));
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

// ORTAK rüzgâr bloğu (Seyhun 2026-11-03 "rüzgâr gösteriminde çok eksiltmişsin; sağanak, gerçekleşen, ok ortalanmamış; birbirleriyle uyumlu
// gitmemiz gerekiyor"): canlı ekranın her adımında aynı iki parça. WindNow: daire içinde ortalı ok (rüzgârın gittiği yön), knot, sağanak, yön ve
// derece, kaynak (istasyon saati / manuel / start'ta tahmin). WindHours: uygulamanın her yerindeki ortak saatlik tablo (HourTable: rüzgâr, sağanak,
// yön; geçmiş saatlerde istasyon ölçümü açık mavi, şimdi kırmızı çerçeve, start pembe çizgi).
function WindNow({ w, by = "", cls = "" }) {
  if (!w || w.kn == null) return null;
  const a = (w.dir ?? 0) + 180;
  return (
    <div className={`lv-wn ${cls}`}>
      <svg className="lv-wna" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        {w.dir != null ? (
          <g transform={`rotate(${a} 24 24)`}>
            <path d="M24 7 L31 25 L24 20 L17 25 Z" fill="#fff" />
            <line x1="24" y1="20" x2="24" y2="40" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
          </g>
        ) : null}
      </svg>
      <div className="lv-wnt">
        <b>
          {w.kn}
          <em>kn</em>
          {w.gust != null && w.gust > w.kn ? <i>{`sağanak ${w.gust}`}</i> : null}
        </b>
        <span>{[dirText(w), by].filter(Boolean).join(" · ")}</span>
      </div>
    </div>
  );
}
// ahead: yalnız şu saatten sonrası, ölçüm yok (Seyhun 2026-11-03 17:34 "önümüzdeki saatler; geçmişi göstermeye gerek yok")
function WindHours({ data, now, scale = 1, cls = "", ahead = false }) {
  const fc = data.forecast;
  const h0 = new Date(now + 3 * 3600e3).getUTCHours();
  const rows = (fc?.rows || []).filter((r) => r.wind != null && (!ahead || +r.hh >= h0));
  if (rows.length < 2) return null;
  const at = data.plan?.at || "";
  return <HourTable className={`lv-wh ${cls}`} rows={rows} date={trDay(now)} nowMs={now} obs={ahead ? [] : fc?.obs || []} station={!ahead && fc?.station ? { name: fc.station } : null} marks={at ? [{ at, label: "Start" }] : []} scale={scale} />;
}
// Üstte tek soluk satır: yarış adı · yer · tarih, yanında hayalet düğmeler (geri ayrı, sol köşede)
// Yarışın adı ve şu an ne olduğu alt şeridin hemen üstünde, şeffaf zeminde, hep orada (Seyhun 2026-11-02 "yukarıdaki yazıyı kaldıralım,
// hangi grup, yarış adı altta şeridin üstünde, arka fonu şeffaf"). Yayıncının yazdığı alt yazı (screen.caption) bunun üstünde vurgulu satır.
// Yarışın adı (şeridin ilk hücresi, büyük) ve altında küçük satır: sınıf · yarış adı · yer
const f0 = (prog) => (prog || []).find((x) => x.state === "next");
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
  // Yarışın adı artık geri düğmesinin yanında soluk (Seyhun 2026-11-03); burada yalnız sınıf / program
  const sub = phase === "wait" ? (none || plan.status === "ap" ? what : f0(prog)?.name || "") : what;
  return { head, g, sub };
}

// Sağ üstte "Canlı" rozeti (Seyhun 2026-11-03): ekrandaki yarış sürüyorsa küçük nabız atan nokta; arada bir (40 sn'de bir, 6 sn) hangi yarış olduğunu
// yazarak açılır, sonra kapanır. Yalnız ekrandaki yarış (aynı anda birkaç yarışta yayın hangisini gösteriyorsa o); anahtar yarış değişince animasyonu baştan başlatır
function LiveBadge({ sel, data }) {
  const entry = data.rounds?.[sel.id] || {};
  const what = [raceTitle(sel), entry.grp ? `${entry.grp} grup` : ""].filter(Boolean).join(" · ");
  return (
    <div className="lv-onair" key={sel.id} role="status" aria-label={`Canlı yayın: ${what}`}>
      <i className="lv-pulse" aria-hidden="true" />
      <b>Canlı</b>
      <span className="lv-onairw">
        <span>{what}</span>
      </span>
    </div>
  );
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
function InfoBar({ data, sel, isCur, phase, cs, counting, clockIn, today, now = 0, hasSvg, prog = [], onCourse, onWind }) {
  const t = titleOf({ data, sel, phase, today, prog });
  const plan = data.plan;
  const entry = sel ? data.rounds?.[sel.id] : null;
  const route = entry?.route || [];
  const pos = entry ? nowPos(entry) : -1;
  const { w } = lastWind(data, sel, isCur);
  const cells = [];
  // Geri sayım hep şeritte (Seyhun 2026-11-02 örnek A "Şeritte saat", yayin-tasarim/videolu-geri-sayim/vcd-a.png): ortada kutu yok, beyaz
  // blokta büyük sayı, yanında kare bayraklar ve 5·4·1·0 çubuğu; start saati ve "Start" alt yazısı tekrar edilmez
  const steps = seqSteps(data.timer?.dur || 300);
  const sst = cs.rem != null ? seqState(steps, cs.rem, true) : steps.map(() => "");
  const sflags = clockIn ? startFlags(entry || data.rounds?.[data.timer?.rid] || (phase === "wait" ? plan.order[0] : null), false, cs.rem != null && cs.rem <= 60) : [];
  if (phase === "race") {
    if (clockIn) {
      // saat zaten şeritte
    } else if (!counting && sel?.void) {
      // Abandone / genel geri (Seyhun 2026-11-02): eski start saati değil, abandone saati; son yarışsa yeni start için uyarı işareti bekleniyor
      cells.push(["time", sel.fin ? hmOf(sel.fin) : "—", voidShort(sel.void)]);
      const last = (data.starts || []).filter((x) => x.day === today).at(-1);
      if (isCur && last?.id === sel.id) cells.push(["time warn", "Uyarı işareti", "Yeni start bekleniyor"]);
    } else if (!counting && sel) cells.push(["time", cs.value, cs.label]);
    // geri sayım ortada büyük, start saati orada soluk; şeritte tekrar edilmez (Seyhun 2026-11-02 "tekrar oluyor")
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
          <span>{t.sub}</span>
        </div>
      ) : null}
      {clockIn ? (
        <div className="lv-cell lv-sclock">
          <span>{cs.label}</span>
          <b>{cs.value}</b>
        </div>
      ) : null}
      {clockIn && (sflags.length || data.timer?.mode === "start") ? (
        <div className="lv-cell lv-sflag">
          {sflags.map((f) => (
            <span key={f.kind} className={`lv-fl${f.down ? " down" : ""}`} title={f.name}>
              <Flag {...f} />
            </span>
          ))}
          {data.timer?.mode === "start" ? (
            <span className="lv-sseg">
              {steps.map((x, i) => (
                <i key={x.m} className={sst[i]}>
                  <s />
                  {x.m}
                </i>
              ))}
            </span>
          ) : null}
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
  // İniş ve uyarı işareti saati yazılmaz (Seyhun 2026-11-03); bayrak + sebep
  if (plan.status === "ap") box = { flag: "AP", head: "Tehir", sub: apText(plan) };
  else if (plan.warn && now < Date.parse(plan.warn)) box = { flag: "AP", head: "Tehir indi", sub: "Start yakında" };
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
// Senaryo 3 tehir (Seyhun 2026-11-03 onay, yayin-tasarim/senaryo/3-videosuz.png, 3-videolu.png): AP bayraklı "Tehir" etiketi; tehir süresi
// belliyse "Tehir inişine" geri sayım, altında sebep · Karada ve bekleyen yarış; süre belli değilse sayaç yerine büyük sebep ve
// "Karada · uyarı işareti bekleniyor". İniş ve uyarı işareti saati yazılmaz. Tehir inince "Tehir indi" + "Start yakında". Videosuz ve bant aynı
function ApBlock({ data, cs, first, apDown = false, big = "lv-big", seq = false }) {
  const plan = data.plan;
  const counting = !apDown && cs.label === "Tehir inişine";
  const why = plan.ap?.why || "Start ertelendi";
  const land = plan.ap?.land ? "Karada" : "";
  // Sıradaki yarış: sınıf işareti (grup renginde) + "1. yarış · Sarı grup bekliyor"; hazırlık bayrağı yok (Seyhun 2026-11-03)
  const who = first ? (
    <small className="lv-who">
      {first.cls ? <Flag kind="cls" cls={first.cls} grp={first.grp} /> : <Dot g={first.grp} />}
      {`${[first.name, grpText(first.grp)].filter(Boolean).join(" · ")} bekliyor`}
    </small>
  ) : null;
  return (
    <>
      <div className="lv-apk">
        <Flag kind="AP" />
        {apDown ? "Tehir indi" : seq ? "Tehir · dizi durdu" : "Tehir"}
      </div>
      {counting ? (
        <>
          <div className="lv-kick">Tehir inişine</div>
          <div className={big}>{cs.value}</div>
          <div className="lv-why">
            {[why, land].filter(Boolean).join(" · ")}
            {who}
          </div>
        </>
      ) : (
        <>
          <div className="lv-bigt">{apDown ? "Start yakında" : why}</div>
          <div className="lv-why w">
            {apDown ? "Uyarı işareti bekleniyor" : seq ? "Start dizisi durduruldu" : [land, "Uyarı işareti bekleniyor"].filter(Boolean).join(" · ")}
            {who}
          </div>
        </>
      )}
    </>
  );
}
// Senaryo 5 (Seyhun 2026-11-03, tehirle aynı düzen): abandone / genel geri → bayrak etiketi, büyük yarış adı, saat ve sebep;
// yeni start için uyarı işareti bekleniyor. Startlar arası (yarış bitti, sıradaki start sayılmıyor) → "Bitti · saat", yarış adı, ilk üç, sıradaki
function VoidBlock({ data, last, first }) {
  const grp = last.grp || data.rounds?.[last.id]?.grp || "";
  const kind = voidFlag(last.void);
  const why = last.void === "Tehir" ? "Start ertelendi" : "Yarış sayılmadı, yeniden start verilecek";
  return (
    <>
      <div className="lv-apk">
        {kind ? <Flag kind={kind} /> : null}
        {[voidShort(last.void), grpText(grp), last.fin ? hmOf(last.fin) : ""].filter(Boolean).join(" · ")}
      </div>
      <div className="lv-bigt">{raceName(last)}</div>
      <div className="lv-why w">
        {why}
        <small>{["Uyarı işareti bekleniyor", first ? [first.name, grpText(first.grp)].filter(Boolean).join(" · ") : ""].filter(Boolean).join(" · ")}</small>
      </div>
    </>
  );
}
function FinBlock({ data, sel, first }) {
  const e = data.rounds?.[sel.id] || {};
  const t3 = standings(e).slice(0, 3);
  const who = whoMap(data);
  return (
    <>
      <div className="lv-apk f">{["Bitti", grpText(e.grp || sel.grp), sel.fin ? hmOf(sel.fin) : ""].filter(Boolean).join(" · ")}</div>
      <div className="lv-bigt f">{raceName(sel)}</div>
      {t3.length ? (
        <div className="lv-top3">
          {t3.map((t, i) => {
            const w = whoOf(who, t.sail);
            return (
              <div key={t.sail}>
                <b className={`p${i + 1}`}>{i + 1}</b>
                <span>{t.sail}</span>
                <em>{w?.name ? shortName(w.name) : ""}</em>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="lv-why w">
        {first ? `Sıradaki · ${[first.name, grpText(first.grp)].filter(Boolean).join(" · ")}` : "Start bekleniyor"}
        <small>Uyarı işareti bekleniyor</small>
      </div>
    </>
  );
}
// bugünün son startı abandone / genel geri ise (3 saat içinde) o start, yoksa null
const voidLast = (data, today, now) => {
  const last = (data.starts || []).filter((x) => x.day === today).at(-1);
  return last?.void && (!last.fin || now - Date.parse(last.fin) < 3 * 3600e3) ? last : null;
};
// ---- Senaryo 6, gün bitti (Seyhun 2026-11-03): diğer adımlarla aynı düzen, hiçbir şey dönmez. Solda "Gün bitti" ve yarının ilk startı;
// ortada bugünün yarışları (her biri ilk üç) ve genel sıralamanın ilk beşi; sağda yarının beklenen rüzgârı ve saat saat tahmin. Videoda alt bantta.
function nextText(plan, today) {
  const nx = plan.next;
  if (!nx?.day) return { big: "Yarış bitti", sub: "" };
  const tom = new Date(Date.parse(`${today}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);
  const d = nx.day === tom ? "Yarın" : `${wdText(nx.day)} ${dayText(nx.day)}`;
  return { big: [d, nx.at].filter(Boolean).join(" "), sub: nx.at ? "İlk start" : "Sıradaki yarış günü" };
}
function DayResults({ data, day, max = 4, ov = true }) {
  const who = whoMap(data);
  const races = (data.starts || []).filter((x) => x.day === day && !x.void && data.rounds?.[x.id] && standings(data.rounds[x.id]).length).slice(-max);
  const top = ov ? overallTop(data, 5) : null;
  if (!races.length && !top) return null;
  return (
    <div className="lv-dres">
      {races.length ? <div className="lv-hlab">Bugünün sonuçları</div> : null}
      {races.map((r) => {
        const e = data.rounds[r.id];
        return (
          <div key={r.id} className="lv-dr">
            <b>
              <Dot g={e.grp || r.grp} />
              {[raceName(r), grpText(e.grp || r.grp)].filter(Boolean).join(" · ")}
            </b>
            <ol>
              {standings(e)
                .slice(0, 3)
                .map((t, i) => {
                  const w = whoOf(who, t.sail);
                  return (
                    <li key={t.sail}>
                      <i className={`p${i + 1}`}>{i + 1}</i>
                      <span>{t.sail}</span>
                      <em>{w?.name ? shortName(w.name) : ""}</em>
                    </li>
                  );
                })}
            </ol>
          </div>
        );
      })}
      {top ? (
        <div className="lv-dr ov">
          <b>{["Genel sıralama", top.cls, top.tag === "Resmî" ? "" : "geçici"].filter(Boolean).join(" · ")}</b>
          <ol>
            {top.rows.map((r, i) => (
              <li key={`${r.sail}${r.name}`}>
                <i className={`p${i + 1}`}>{r.p}</i>
                <span>{r.sail}</span>
                <em>{shortName(r.name) || ""}</em>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
function NextWind({ data, now, scale = 1, big = false }) {
  const nx = data.plan.next;
  const fc = data.forecastNext;
  const rows = (fc?.rows || []).filter((r) => r.wind != null);
  const w = nx?.at ? expWind(fc, nx.at) : null;
  if (!w && rows.length < 2) return null;
  return (
    <div className="lv-hwnd lv-dwnd">
      <div className="lv-hlab">{nx?.day ? `${nextText(data.plan, trDay(now)).big.split(" ")[0] === "Yarın" ? "Yarın" : dayText(nx.day)} rüzgâr` : "Rüzgâr"}</div>
      {w ? <WindNow w={w} by={nx?.at ? `${nx.at} tahmin` : "tahmin"} cls={big ? "big" : ""} /> : null}
      {rows.length >= 2 ? <HourTable className="lv-wh" rows={rows} date={nx?.day || trDay(now)} nowMs={now} obs={[]} station={null} marks={nx?.at ? [{ at: nx.at, label: "Start" }] : []} scale={scale} /> : null}
    </div>
  );
}
function DayEndHero({ data, today, now }) {
  const r = data.race || {};
  const t = nextText(data.plan, today);
  const day = data.plan.day || today;
  const n = (data.starts || []).filter((x) => x.day === day && !x.void).length;
  const res = <DayResults data={data} day={day} />;
  const wind = <NextWind data={data} now={now} scale={1.05} big />;
  const cols = 1 + (res ? 1 : 0) + (wind ? 1 : 0);
  return (
    <div className="lv-hold lv-hold3 lv-dend" data-cols={cols}>
      <div className="lv-topr">{[dayText(day) ? `${wdText(day)} ${dayText(day)}` : "", r.place].filter(Boolean).join(" · ")}</div>
      <div className="lv-hst">
        <div className="lv-apk f">{["Gün bitti", n ? `${n} yarış` : ""].filter(Boolean).join(" · ")}</div>
        <div className="lv-kick">{t.sub}</div>
        <div className="lv-bigt f">{t.big}</div>
      </div>
      {res}
      {wind}
    </div>
  );
}
function DayEndBand({ data, today, now }) {
  const t = nextText(data.plan, today);
  const day = data.plan.day || today;
  const n = (data.starts || []).filter((x) => x.day === day && !x.void).length;
  return (
    <aside className="lv-side lv-band lv-dendb">
      <div className="lv-bclock">
        <div className="lv-apk f">{["Gün bitti", n ? `${n} yarış` : ""].filter(Boolean).join(" · ")}</div>
        <div className="lv-kick">{t.sub}</div>
        <div className="lv-bigt f">{t.big}</div>
      </div>
      <DayResults data={data} day={day} max={2} ov={false} />
      <NextWind data={data} now={now} scale={0.85} />
    </aside>
  );
}
function WaitHero({ data, today, cs, prog, now, fin = null }) {
  const plan = data.plan;
  const { none, box, kick } = holdState(data, today, cs, now);
  const first = prog.find((x) => x.state === "next") || null;
  const at = plan.status === "done" && plan.next ? plan.next.at : plan.at;
  const route = sceneRoute(data, null, true, "wait");
  const svg = courseSvg(data, route);
  // Yarışa günler varken (Seyhun 2026-11-02 "6 gün sonra bir yarış; kaç gün kaldı, o tarihlerdeki beklenen rüzgâr"): büyük "6 gün", vitrinde yarış günlerinin rüzgârı
  const r = data.race || {};
  const left = !cs.rem && r.startDate > today ? daysUntil(r.startDate, today) : 0;
  const aDays = left ? data.ahead?.days || raceDays(r.startDate, r.endDate, plan).map((day) => ({ day, at: plan.times?.[day] || plan.daily || "" })) : [];
  const ag = agOf(data, now);
  const ap = plan.status === "ap";
  const apDown = !ap && !!plan.warn && now < Date.parse(plan.warn);
  const vd = !ap && !apDown ? voidLast(data, today, now) : null;
  const plain = !ap && !apDown && !vd && !fin;
  if (none && !left && plan.next?.day) return <NoneHero data={data} today={today} now={now} />;
  // Örnek H (Seyhun 2026-11-03 onay): vitrin dönmez. Solda geri sayım, program ve rüzgâr; sağ üstte parkur. Parkur yoksa günler varken
  // yarış günlerinin beklenen rüzgârı, yoksa rüzgâr grafiği. Yayın'dan "Göster" ile rüzgâr ya da program seçilirse sağda o görünür
  const one = data.courseShow?.one;
  const hasProg = !none && !!(ag || prog.length);
  const progBody = ag ? <AgendaBody ag={ag} /> : <ProgBody prog={prog} />;
  const hasWind = !none && windShowable(data);
  if (!left) {
    // Senaryo 1 (Seyhun 2026-11-03 onay, yayin-tasarim/senaryo/1-videosuz.png): yarış günü, start'a 1 saatten fazla. Üç sütun: solda
    // geri sayım + sıradaki yarış + program; ortada parkur büyük (altında eksen, start hattı, ölçüm saati); sağda şimdiki rüzgâr ve gün
    // boyunca saat saat tahmin. Olmayan sütun hiç çizilmez, kalanlar genişler ("Yok" kutusu olmaz). Sağ üstte gün ve yer.
    // Örnek I (Seyhun 2026-11-03 "parkur sürekli gösteriliyor, istemiyorum; sağda rüzgâr, parkur, program ve yarış animasyonu sırayla
    // yandan kaysın; yarışın adı, yarış günü, tarih ve yer birlikte"; 10:38 "animasyonu göstermeyelim"): solda sabit başlık + durum, sağda tek alan kayarak değişir
    const items = [
      hasWind ? { k: "wind", ms: 10000, node: <WindCol data={data} now={now} scale={1.35} /> } : null,
      svg ? { k: "course", ms: SCENE_T * 1000 + 2000, node: <CourseCol data={data} route={route} svg={svg} /> } : null,
      hasProg
        ? {
            k: "prog",
            ms: 10000,
            node: (
              <div className="lv-hprog">
                <div className="lv-hlab">Program</div>
                {progBody}
              </div>
            ),
          }
        : null,
    ].filter(Boolean);
    return (
      <div className="lv-hold lv-hold4">
        <div className="lv-hst">
          <div className="lv-htitle">
            <b>{r.name || "Yarış"}</b>
            <span>{[none ? "" : "Yarış günü", dayText(today) ? `${wdText(today)} ${dayText(today)}` : "", r.place].filter(Boolean).join(" · ")}</span>
          </div>
          {orangeUp(plan, today) ? (
            <span className="lv-opill">
              <i aria-hidden="true" />
              Start öncesi
            </span>
          ) : null}
          {ap || apDown ? <ApBlock data={data} cs={cs} first={first} apDown={apDown} /> : vd ? <VoidBlock data={data} last={vd} first={first} /> : fin ? <FinBlock data={data} sel={fin} first={first} /> : null}
          {plain ? <div className="lv-kick">{kick}</div> : null}
          {!none && plain ? <div className="lv-big">{cs.rem ? cs.value : "—:—"}</div> : null}
          {!none && plain && first ? (
            <div className="lv-what">
              <Dot g={first.grp} />
              {[first.name, grpText(first.grp)].filter(Boolean).join(" · ")}
              <small>{[first.cls, at ? `Program ${at}` : ""].filter(Boolean).join(" · ")}</small>
            </div>
          ) : null}
          {box && plain ? (
            <div className="lv-hbox">
              {box.flag ? <Flag kind={box.flag} /> : null}
              <div>
                <b>{box.head}</b>
                <span>{box.sub}</span>
              </div>
            </div>
          ) : null}
        </div>
        <Slides items={items} />
      </div>
    );
  }
  const k = one === "wind" && windShowable(data) ? "wind" : one === "prog" && hasProg ? "prog" : svg ? "course" : left && aDays.length ? "ahead" : windShowable(data) ? "wind" : "";
  return (
    <div className="lv-hold lv-holdh">
      <div className="lv-hst">
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
        {box ? (
          <div className="lv-hbox">
            {box.flag ? <Flag kind={box.flag} /> : null}
            <div>
              <b>{box.head}</b>
              <span>{box.sub}</span>
            </div>
          </div>
        ) : null}
        {hasProg && k !== "prog" ? (
          <div className="lv-hprog">
            <div className="lv-hlab">Program</div>
            {progBody}
          </div>
        ) : null}
      </div>
      {k ? (
        <div className="lv-show lv-showh">
          <div className="lv-hlab">{k === "course" ? `Parkur · ${routeText(route)}` : SLIDE_NAME[k]}</div>
          <div key={k} className="lv-showb">
            {k === "course" ? <div className="lv-sceneb" dangerouslySetInnerHTML={{ __html: svg }} /> : k === "wind" ? <WindBody data={data} sel={null} isCur now={now} /> : k === "ahead" ? <AheadBody days={aDays} /> : progBody}
          </div>
        </div>
      ) : null}
    </div>
  );
}
// Parkur sütunu: büyük sahne, altında eksen · start hattı · son ölçüm saati
function CourseCol({ data, route, svg }) {
  const crs = cleanCourse(data.course || {});
  const ax = axisInfo(data);
  let bias = null;
  try {
    bias = lineBias(crs);
  } catch {
    bias = null;
  }
  const last = Math.max(0, Date.parse(data.course?.cardAt || "") || 0, ...(data.course?.obs || []).map((o) => Date.parse(o.at) || 0));
  return (
    <div className="lv-hcrs">
      <div className="lv-hlab">{`Parkur · ${CARD_TYPES[selCard(crs).type] || CARD_TYPES.std} · ${routeText(route)}`}</div>
      <div className="lv-sceneb" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="lv-cinfo">
        <div>
          <small>Eksen</small>
          <b>{axisText(data)}</b>
        </div>
        {bias?.end ? (
          <div>
            <small>Start hattı</small>
            <b>{`${bias.end === "pin" ? "Pin" : "Komite"} avantajlı ${Math.round(bias.deg)}°`}</b>
          </div>
        ) : null}
        {last ? (
          <div>
            <small>Ölçüm</small>
            <b>{hmOf(new Date(last).toISOString())}</b>
          </div>
        ) : null}
      </div>
    </div>
  );
}
// Rüzgâr sütunu: şimdiki rüzgâr (ölçüm yoksa start saatinin tahmini, "tahmin" yazar), altında gün boyunca saat saat: geçen saatler
// ölçülen (istasyon ya da manuel), gelecek saatler tahmin; start saati vurgulu
function WindCol({ data, now, scale = 1.05 }) {
  const c = curWind(data, null, true, now);
  const ew = expWind(data.forecast, data.plan?.at || "");
  const w = c || ew;
  return (
    <div className="lv-hwnd">
      <div className="lv-hlab">Rüzgâr</div>
      <WindNow w={w} by={c ? c.by : "Start'ta tahmin"} cls="big" />
      <WindHours data={data} now={now} scale={scale} />
    </div>
  );
}
// Videolu yarış öncesi (Seyhun 2026-11-03 senaryo 1, yayin-tasarim/senaryo/1-videolu.png): video üstte açık; altta bulanık bant, dört
// blok yan yana: geri sayım + sıradaki yarış (start dizisinde bayraklar), Program (bekleyen 3 madde), Parkur (rota, eksen, start hattı),
// Rüzgâr (şimdi + gün boyunca 6 saat). Olmayan blok çizilmez, kalanlar genişler. Tehirde etikette AP bayrağı ve sebep (iniş saati yok).
function SidePanel({ data, today, cs, prog, now, entry, fin = null }) {
  const orange = orangeUp(data.plan, today);
  const c = curWind(data, null, true, now);
  const at = data.plan.at || "";
  const ew = expWind(data.forecast, at);
  const crs = cleanCourse(data.course || {});
  const route = sceneRoute(data, null, true, "wait");
  const svg = courseSvg(data, route);
  const ax = axisInfo(data);
  let bias = null;
  try {
    bias = lineBias(crs);
  } catch {
    bias = null;
  }
  const left = prog.filter((x) => x.state !== "done");
  const first = left[0] || null;
  const prep = data.plan.order?.[0]?.prep || "";
  const ag = agOf(data, now);
  const entryNow = entry?.cls || entry?.prep || entry?.grp ? entry : data.plan.order?.[0] || null;
  // Bayraklar yalnız start dizisinde (Seyhun 2026-11-03 "tehirde, yarıştan önce bayrağı göstermemize gerek yok; geri sayımda tabii ki")
  const seq = !!(data.timer?.mode === "start" && data.plan.status !== "ap" && !data.plan.warn && cs.rem && entryNow);
  const flags = seq ? startFlags(entryNow, false, cs.rem <= 60) : [];
  const ww = c || ew;
  const rt = cleanRoute(route);
  const ap = data.plan.status === "ap";
  const apDown = !ap && !!data.plan.warn && now < Date.parse(data.plan.warn);
  const vd = !ap && !apDown ? voidLast(data, today, now) : null;
  const plain = !ap && !apDown && !vd && !fin;
  const hasProg = !!(ag?.rows?.length || left.length);
  const progRows = ag?.mode === "day" ? ag.rows.filter((x) => x.state !== "done").slice(0, 3).map((x) => ({ key: `${x.at}${x.text}`, at: x.at, name: x.text, grp: "", state: x.state })) : left.slice(0, 3);
  return (
    <aside className="lv-side lv-band">
      <div className="lv-bclock">
        {ap || apDown ? (
          <ApBlock data={data} cs={cs} first={first} apDown={apDown} big="lv-sbig" />
        ) : vd ? (
          <VoidBlock data={data} last={vd} first={first} />
        ) : fin ? (
          <FinBlock data={data} sel={fin} first={first} />
        ) : (
          <>
            <div className={`lv-skick${orange ? " o" : ""}`}>
              {orange ? <span className="lv-oflag" aria-hidden="true" /> : null}
              {orange ? "Start öncesi" : cs.label}
            </div>
            <div className="lv-sbig">{cs.rem ? cs.value : "—:—"}</div>
          </>
        )}
        {first && plain ? (
          <div className="lv-swhat">
            <Dot g={first.grp} />
            {[first.name, grpText(first.grp)].filter(Boolean).join(" · ")}
            <small>{[first.cls, prep && orange ? prepName(prep) : "", first.at].filter(Boolean).join(" · ")}</small>
          </div>
        ) : null}
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
      </div>
      <Slides
        items={[
          ww ? { k: "wind", ms: 10000, node: (
            <div className="lv-bwnd">
              <div className="lv-hlab">Rüzgâr</div>
              <WindNow w={ww} by={c ? c.by : "Start'ta tahmin"} />
              <WindHours data={data} now={now} scale={0.72} />
            </div>
          ) } : null,
          hasProg ? { k: "prog", ms: 10000, node: (
            <div className="lv-bprog">
              <div className="lv-hlab">Program</div>
              <div className="lv-slprog">
                {progRows.map((x) => (
                  <div key={x.key} className={x.state}>
                    <i>{x.at || ""}</i>
                    <s />
                    <b>
                      {x.grp ? <Dot g={x.grp} /> : null}
                      {[x.name, x.grp ? `${x.grp} grup` : ""].filter(Boolean).join(" · ")}
                    </b>
                    {x.state === "next" ? <em className="lv-pill">Sıradaki</em> : <span />}
                  </div>
                ))}
              </div>
            </div>
          ) } : null,
        ].filter(Boolean)}
      />
    </aside>
  );
}
// ---- Senaryo 2 (Seyhun 2026-11-03 onay, yayin-tasarim/senaryo/2b-videosuz-donen.png, 2b-videolu-donen.png): start'a 1 saatten az,
// turuncu bayrak ya da start dizisi. Sayaç, sıradaki yarış ve bayraklar sabit; sağda TEK bilgi paneli 8 sn'de bir kayarak değişir
// (Start hattı → Rüzgâr → Parkur → Sıradaki), altında noktalar; "hepsini aynı anda göstermemize gerek yok". Son dakikada panel kapanır,
// yalnız sayaç ve bayraklar kalır. Altta 5·4·1·0 çubuğu. Videoda hepsi alt bantta. Olmayan bilgi panele girmez. ----
// ---- Start geri sayımı (Seyhun 2026-11-03 onay, yayin-tasarim/senaryo/2e-*): ilk starta geri sayımdan ayrı; önemli olan süre. Büyük sayaç,
// altında 5·4·1·0 şeridi (süreye orantılı; her noktada çekilen/inen bayrak, geçilenler parlak), sağda sabit rüzgâr ve start hattı. Hiçbir şey dönmez.
// Dizide tehir: AP + sebep, şerit gri ve durduğu yerde kırmızı nokta. Genel geri: 1. tekrar bayrağı, "Yeniden start", şerit boş. Videoda alt bantta.
function SeqStrip({ dur = 300, rem = null, entry = null, stop = false }) {
  const steps = seqSteps(dur);
  const top = (steps[0]?.m || 5) * 60;
  const pos = (s) => Math.min(100, Math.max(0, ((top - s) / top) * 100));
  const prep = entry?.prep || "";
  const cf = { kind: "cls", cls: entry?.cls || "Sınıf", grp: entry?.grp || "" };
  const ev = (m, i) => (i === 0 ? [{ ...cf, up: true }] : m === 0 ? [{ ...cf, up: false }] : prep && m === 4 ? [{ kind: prep, up: true }] : prep && m === 1 ? [{ kind: prep, up: false }] : []);
  const fill = rem == null ? 0 : pos(rem);
  return (
    <div className={`lv-strip${stop ? " stop" : ""}`}>
      <div className="lv-strk">
        <b style={{ width: `${fill}%` }} />
      </div>
      {steps.map((x, i) => {
        const done = rem != null && rem <= x.m * 60;
        return (
          <div key={x.m} className={`lv-spt${done ? " done" : ""}${i === 0 ? " first" : ""}${i === steps.length - 1 ? " last" : ""}`} style={{ left: `${pos(x.m * 60)}%` }}>
            <div className="lv-sevs">
              {ev(x.m, i).map((f) => (
                <span key={`${f.kind}${f.up}`} className="lv-sev">
                  <Flag kind={f.kind} cls={f.cls} grp={f.grp} />
                  <i>{f.up ? "↑" : "↓"}</i>
                </span>
              ))}
            </div>
            <s />
            <small>
              {x.m}
              <span>{` · ${x.name}`}</span>
            </small>
          </div>
        );
      })}
      {rem != null ? <em className="lv-sknob" style={{ left: `${fill}%` }} /> : null}
    </div>
  );
}
function SeqSide({ data, now }) {
  const c = curWind(data, null, true, now);
  const w = c || expWind(data.forecast, data.plan?.at || "");
  let bias = null;
  try {
    bias = lineBias(cleanCourse(data.course || {}));
  } catch {
    bias = null;
  }
  if (!w && !bias) return null;
  const sub = bias ? [`Hat ${Math.round(bias.line)}°`, bias.wind != null ? `rüzgâr ${Math.round(bias.wind)}° ${dirShort(bias.wind)}` : ""].filter(Boolean).join(" · ") : "";
  return (
    <div className="lv-sqside">
      {w ? (
        <div>
          <small>Rüzgâr</small>
          <WindNow w={w} by={c ? c.by : "tahmin"} />
        </div>
      ) : null}
      {bias ? (
        <div className="lv-sqline">
          <small>Start hattı</small>
          <b>{bias.end ? `${bias.end === "pin" ? "Pin" : "Komite"} avantajlı ${Math.round(bias.deg)}°` : "Hat dengeli"}</b>
          <span>{sub}</span>
        </div>
      ) : null}
    </div>
  );
}
function SeqClock({ data, cs, prog, entry, mode, last, big = "lv-big" }) {
  const first = prog.find((x) => x.state === "next") || prog.find((x) => x.state !== "done") || null;
  const e = entry?.cls || entry?.grp ? entry : data.plan.order?.[0] || null;
  const name = first?.name || (last ? raceName(last) : "");
  const grp = e?.grp || first?.grp || last?.grp || "";
  const hm = /Start (\d\d:\d\d)/.exec(cs.right || "")?.[1] || "";
  const who = name || grp ? (
    <div className="lv-what">
      <Dot g={grp} />
      {[name, grpText(grp)].filter(Boolean).join(" · ")}
      <small>{[e?.cls || first?.cls, mode === "run" && hm ? `Start ${hm}` : ""].filter(Boolean).join(" · ")}</small>
    </div>
  ) : null;
  if (mode === "ap") return <ApBlock data={data} cs={cs} first={first} big={big} seq />;
  if (mode === "fs")
    return (
      <>
        <div className="lv-apk">
          <Flag kind="FS" />
          {["Genel geri", last?.fin ? hmOf(last.fin) : ""].filter(Boolean).join(" · ")}
        </div>
        <div className="lv-bigt">Yeniden start</div>
        <div className="lv-why w">Uyarı işareti bekleniyor</div>
        {who}
      </>
    );
  const lastMin = cs.rem != null && cs.rem <= 60;
  return (
    <>
      <div className={`lv-kick${lastMin ? " o" : ""}`}>{lastMin ? "Son dakika" : cs.label}</div>
      <div className={big}>{cs.value}</div>
      {who}
    </>
  );
}
function SeqStripOf({ data, cs, entry, mode }) {
  if (mode === "ap") return <SeqStrip dur={data.plan.ap?.dur || 300} rem={data.plan.ap?.seq ?? null} entry={entry || data.plan.order?.[0]} stop />;
  return <SeqStrip dur={data.timer?.dur || 300} rem={mode === "run" ? cs.rem : null} entry={entry || data.plan.order?.[0]} />;
}
function SeqHero({ data, cs, prog, now, entry, mode, last }) {
  return (
    <div className="lv-hold lv-sq">
      <div className="lv-sqc">
        <SeqClock data={data} cs={cs} prog={prog} entry={entry} mode={mode} last={last} />
      </div>
      <SeqSide data={data} now={now} />
      <SeqStripOf data={data} cs={cs} entry={entry} mode={mode} />
    </div>
  );
}
// Erken start yapanlar (OCS, UFD, BFD): yelken no ve ad; yoksa boş
const EARLY = ["OCS", "UFD", "BFD"];
function earlyOf(data, rid) {
  const pen = (rid && data.rounds?.[rid]?.pen) || {};
  const who = { ...whoBySail(data.fleets), ...Object.fromEntries((data.entries || []).map((r) => [r.sail, { name: r.name, club: r.club }])) };
  return Object.entries(pen)
    .filter(([, c]) => EARLY.includes(c))
    .map(([sail, c]) => ({ sail, c, name: shortName(whoOf(who, sail)?.name || "") }));
}
function EarlyList({ list }) {
  if (!list.length) return null;
  return (
    <div className="lv-early">
      <small>Erken start</small>
      {list.slice(0, 6).map((x) => (
        <div key={x.sail} className="lv-erow">
          <b>{x.sail}</b>
          <span>{x.name}</span>
          <em>{x.c}</em>
        </div>
      ))}
      {list.length > 6 ? <span className="lv-emore">+{list.length - 6}</span> : null}
    </div>
  );
}
// Videolu start geri sayımı (Seyhun 2026-11-03 11:47 "starta odaklanalım"): yalnız sayaç, kural bayrağıyla dizi şeridi ve varsa erken
// start yapanlar; parkur, rüzgâr tahmini, sıradaki yarış yok
function SeqBand({ data, cs, prog, now, entry, mode, last, rid }) {
  const early = earlyOf(data, mode === "fs" ? last?.id : rid);
  const c = curWind(data, null, true, now); // yalnız anlık ölçüm, tahmin yok (Seyhun 2026-11-03 11:50)
  return (
    <aside className="lv-side lv-band lv-sqb">
      <div className="lv-sqc">
        <SeqClock data={data} cs={cs} prog={prog} entry={entry} mode={mode} last={last} big="lv-sbig" />
      </div>
      <SeqStripOf data={data} cs={cs} entry={entry} mode={mode} />
      {c || early.length ? (
        <div className="lv-sqside">
          {c ? (
            <div>
              <small>Rüzgâr</small>
              <WindNow w={c} by={c.by} />
            </div>
          ) : null}
          <EarlyList list={early} />
        </div>
      ) : null}
    </aside>
  );
}
const ROTATE_MS = 8000;
function nearItems(data, prog, now, race = null) {
  const crs = cleanCourse(data.course || {});
  let bias = null;
  try {
    bias = lineBias(crs);
  } catch {
    bias = null;
  }
  const ax = axisInfo(data);
  const c = curWind(data, null, true, now);
  const ew = expWind(data.forecast, data.plan?.at || "");
  const w = c || ew;
  const route = cleanRoute(sceneRoute(data, null, true, "wait"));
  const after = race ? prog.find((x) => x.state === "next") || null : prog.filter((x) => x.state !== "done")[1] || null;
  const items = [];
  // yarışta: sıralama (ilk dönüş yazıldıysa) ve yarışın rotası
  if (race?.sel) {
    const e = data.rounds?.[race.sel.id];
    if (e && standings(e).length) items.push({ k: "rank", lab: "", race, data });
    // start'tan sonraki 10 dk erken start yapanlar en başta
    const ea = earlyOf(data, race.sel.id);
    if (ea.length && race.sel.at && now - Date.parse(race.sel.at) < 10 * 60e3) items.unshift({ k: "early", lab: "Erken start", big: ea.map((x) => x.sail).join(" · "), y: true, sub: ea.map((x) => [x.name, x.c].filter(Boolean).join(" ")).join(" · ") });
  }
  if (bias && !race) {
    const sub = [`Hat ${Math.round(bias.line)}°`, bias.wind != null ? `rüzgâr ${Math.round(bias.wind)}° ${dirShort(bias.wind)}` : ""].filter(Boolean).join(" · ");
    items.push(bias.end ? { k: "line", lab: "Start hattı", big: `${bias.end === "pin" ? "Pin" : "Komite"} avantajlı ${Math.round(bias.deg)}°`, y: true, sub } : { k: "line", lab: "Start hattı", big: "Hat dengeli", sub });
  }
  const svg = courseSvg(data, race ? sceneRoute(data, race.sel, true, "race") : sceneRoute(data, null, true, "wait"));
  if (svg) items.push({ k: "course", lab: `Parkur · ${CARD_TYPES[selCard(crs).type] || CARD_TYPES.std}${route.length ? ` · ${routeText(route)}` : ""}`, svg, sub: `Eksen ${axisText(data)}` });
  if (w) items.push({ k: "wind", lab: c ? "Rüzgâr" : "Start'ta beklenen rüzgâr", w, by: c ? c.by : "tahmin" });
  if ((data.forecast?.rows || []).filter((r) => r.wind != null).length >= 2) items.push({ k: "whours", lab: "Gün boyunca rüzgâr", data, now });
  if (after) items.push({ k: "next", lab: "Sıradaki", big: [after.name, grpText(after.grp)].filter(Boolean).join(" · "), grp: after.grp, sub: [after.cls, after.at ? `Start ${after.at}` : "Bu start'tan sonra"].filter(Boolean).join(" · ") });
  return items;
}
// Tek panel: her 8 sn'de sıradaki bilgi kayarak gelir; altında noktalar hangisinde olduğunu gösterir
// Her panelin kendi süresi var: parkur animasyonu bir kez tamamlanana kadar kalır (Seyhun 2026-11-03 "parkur animasyonu tamamlanmadan
// geçiyor; bir kere tamamlansın"), saatlik tablo biraz daha uzun, diğerleri 8 sn
const SCENE_T = 12; // sn, courseSvg sailT
const panelMs = (it) => (it?.k === "course" ? SCENE_T * 1000 + 2000 : it?.k === "whours" || it?.k === "rank" ? 10000 : ROTATE_MS);
function Rotator({ items }) {
  const [i, setI] = useState(0);
  const n = items.length;
  const cur = n ? items[i % n] : null;
  const ms = panelMs(cur);
  useEffect(() => {
    if (n < 2) return undefined;
    const t = setTimeout(() => setI((v) => v + 1), ms);
    return () => clearTimeout(t);
  }, [n, i, ms]);
  if (!n) return null;
  const it = cur;
  return (
    <div className="lv-one">
      <div key={it.k} className="lv-oneb">
        {it.lab ? <small>{it.lab}</small> : null}
        {it.k === "rank" ? (
          <RankPanel data={it.data} sel={it.race.sel} isCur id={it.race.id} max={6} onAll={it.race.onAll} />
        ) : it.k === "wind" ? (
          <WindNow w={it.w} by={it.by} cls="big" />
        ) : it.k === "whours" ? (
          <WindHours data={it.data} now={it.now} scale={1.1} />
        ) : it.k === "course" ? (
          <div className="lv-sceneb" dangerouslySetInnerHTML={{ __html: it.svg }} />
        ) : (
          <b className={it.y ? "y" : ""}>
            {it.grp ? <Dot g={it.grp} /> : null}
            {it.big || "—"}
          </b>
        )}
        {it.sub ? <span>{it.sub}</span> : null}
      </div>
      {n > 1 ? (
        <div className="lv-dots" aria-hidden="true">
          {items.map((x, j) => (
            <i key={x.k} className={j === i % n ? "on" : ""} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
// Yandan kayan tek alan (örnek I): her içerik kendi süresi kadar kalır, sonra sağdan gelen bir sonrakine yer verir; altta noktalar
function Slides({ items }) {
  const [i, setI] = useState(0);
  const n = items.length;
  const cur = n ? items[i % n] : null;
  const ms = cur?.ms || ROTATE_MS;
  useEffect(() => {
    if (n < 2) return undefined;
    const t = setTimeout(() => setI((v) => v + 1), ms);
    return () => clearTimeout(t);
  }, [n, i, ms]);
  if (!n) return null;
  return (
    <div className="lv-slides">
      <div key={`${cur.k}${i}`} className="lv-slide">
        {cur.node}
      </div>
      {n > 1 ? (
        <div className="lv-dots" aria-hidden="true">
          {items.map((x, j) => (
            <i key={x.k} className={j === i % n ? "on" : ""} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
// 5 · 4 · 1 · 0 çubuğu: geçen adımlar beyaz, süren adım pembe-turuncu dolarak ilerler
function SeqBar({ data, cs }) {
  if (data.timer?.mode !== "start") return null;
  const steps = seqSteps(data.timer?.dur || 300);
  const sst = cs.rem != null ? seqState(steps, cs.rem, true) : steps.map(() => "");
  return (
    <div className="lv-seq">
      {steps.map((x, i) => {
        const nx = steps[i + 1];
        const fill = sst[i] === "done" ? 100 : sst[i] === "now" && nx ? Math.min(100, Math.max(0, Math.round(((x.m * 60 - cs.rem) / ((x.m - nx.m) * 60)) * 100))) : sst[i] === "now" ? 100 : 0;
        return (
          <div key={x.m} className={sst[i]} style={{ "--lv-f": `${fill}%` }}>
            <s />
            <span>{`${x.m} · ${x.name}`}</span>
          </div>
        );
      })}
    </div>
  );
}
// Sabit blok: geri sayım, sıradaki yarış ve (start dizisinde) bayraklar
function NearClock({ data, cs, prog, entry, racing = false, sel = null }) {
  const first = racing && sel ? { name: raceName(sel), grp: sel.grp || entry?.grp || "", cls: entry?.cls || "" } : prog.find((x) => x.state === "next") || prog.find((x) => x.state !== "done") || null;
  const entryNow = entry?.cls || entry?.prep || entry?.grp ? entry : data.plan.order?.[0] || null;
  const seq = !racing && !!(data.timer && data.timer.mode === "start" && cs.rem != null && entryNow);
  const flags = seq ? startFlags(entryNow, false, cs.rem <= 60) : [];
  const hm = racing && sel?.at ? hmOf(sel.at) : /Start (\d\d:\d\d)/.exec(cs.right || "")?.[1] || data.plan.at || "";
  return (
    <div className="lv-nclock">
      <div className="lv-kick">{cs.label}</div>
      <div className="lv-big">{cs.value}</div>
      {first ? (
        <div className="lv-what">
          <Dot g={first.grp} />
          {[first.name, grpText(first.grp)].filter(Boolean).join(" · ")}
          <small>{[first.cls, hm ? `Start ${hm}` : ""].filter(Boolean).join(" · ")}</small>
        </div>
      ) : null}
      {flags.length ? (
        <div className="lv-sflags">
          {flags.map((f) => (
            <div key={f.kind} className={`lv-sfl${f.down ? " down" : ""}`}>
              <Flag {...f} />
              <div>
                <b>{f.kind === "cls" ? [f.cls, f.grp].filter(Boolean).join(" · ") : prepName(f.kind)}</b>
                <small>{f.kind === "cls" ? `Sınıf bayrağı · ${f.down ? "indi" : "çekildi"}` : `Hazırlık · ${f.down ? "indi" : "1 dk'da iner"}`}</small>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
// Sağ üst: turuncu bayrak çekiliyse "Start öncesi", yanında gün ve yer
function TopRight({ data, today }) {
  const orange = orangeUp(data.plan, today);
  return (
    <div className="lv-topr lv-topr2">
      {orange ? (
        <span className="lv-opill">
          <i aria-hidden="true" />
          Start öncesi
        </span>
      ) : null}
      <span>{[dayText(today) ? `${wdText(today)} ${dayText(today)}` : "", data.race?.place].filter(Boolean).join(" · ")}</span>
    </div>
  );
}
// Videosuz: solda sayaç, sağda dönen panel, altta çubuk
function StartHero({ data, cs, prog, now, entry, racing = false, sel = null, id = "", onAll }) {
  const items = !racing && cs.rem != null && cs.rem <= 60 ? [] : nearItems(data, prog, now, racing ? { sel, id, onAll } : null);
  return (
    <div className="lv-hold lv-hold2">
      <NearClock data={data} cs={cs} prog={prog} entry={entry} racing={racing} sel={sel} />
      <Rotator items={items} />
      {!racing ? <SeqBar data={data} cs={cs} /> : null}
    </div>
  );
}
// Videolu: alt bantta aynı üçlü
function NearBand({ data, cs, prog, now, entry, racing = false, sel = null, id = "", onAll }) {
  const items = !racing && cs.rem != null && cs.rem <= 60 ? [] : nearItems(data, prog, now, racing ? { sel, id, onAll } : null);
  return (
    <aside className="lv-side lv-band lv-band2">
      <div className="lv-brow">
        <NearClock data={data} cs={cs} prog={prog} entry={entry} racing={racing} sel={sel} />
        <Rotator items={items} />
      </div>
      {!racing ? <SeqBar data={data} cs={cs} /> : null}
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
// Ölçüm yokken de parkur sahnesi kurulur (Seyhun 2026-11-03 "hiç verisi yoksa rüzgârı tam kuzey 0 kabul ederek yine parkuru kuralım; önemli
// olan yarış parkurunun ne olduğunu göstermek"): eksen 0°, rüzgâr ve hat yok, bütün noktalar tahmini; veri girilince gerçek kart
// Eksen ölçülmemişse start saatindeki tahmin rüzgârının yönü "tahmin" olarak kullanılır (Seyhun 2026-11-03 "ölçülmedi yerine tahmin"), o da yoksa 0°
const guessAxis = (data) => expWind(data.forecast, data.plan?.at || "")?.dir ?? null;
const axisText = (data) => {
  const ax = axisInfo(data);
  if (ax) return `${ax.deg}° ${dirShort(ax.deg)}`;
  const g = guessAxis(data);
  return g != null ? `${Math.round(g)}° ${dirShort(g)} · tahmin` : "Ölçülmedi";
};
const defaultCard = (crs, data) => ({ axis: data ? (guessAxis(data) ?? 0) : 0, wind: null, range: null, kn: null, line: null, reach: null, orsa: crs.len?.orsa || ORSA_M, type: cardType(selCard(crs)), est: { komite: true, pin: true, m1: true, m2: true, m3: true, m4: true } });
const courseSvg = (data, route, o = {}) => {
  try {
    const crs = cleanCourse(data.course || {});
    return sceneSvg(cardOf(crs) || defaultCard(crs, data), route, { pre: "lv", sail: true, sailT: SCENE_T, ...o });
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
  if (fresh) return { kn: mine.kn, dir: mine.dir, gust: mine.gust ?? null, range: mine.range || null, hh: tr.toISOString().slice(11, 13), man: true, by: `Parkur verisi ${trOf(mine.at).slice(11, 16)}` };
  // İstasyon "sakin" (SYNOP 00000: 0 kn, yön yok) bildirince ekranda oksuz "0 kn" kalıyordu (Seyhun 2026-11-04 "rüzgâr sıfır, yön, ok yok"):
  // o zaman bu saatin tahmini yazılır (ok, yön, kaynak "Tahmin"); tahmin de yoksa "Sakin"
  if (so && !so.wind && so.dir == null) {
    const hh = tr.toISOString().slice(11, 13);
    const f = (fc?.rows || []).find((r) => r.hh === hh && r.wind != null);
    if (f && f.wind > 0) return { kn: f.wind, dir: f.dir ?? null, gust: f.gust ?? null, range: null, hh, man: false, by: `Tahmin ${hh}:00` };
  }
  return so ? { kn: so.wind, dir: so.dir, gust: so.gust ?? null, range: null, hh: so.hh, man: false, by: `${fc.station || "İstasyon"} ${so.hh}:00` } : null;
}
// yön yazısı: ok yoksa sakin (0 kn) ya da değişken
const dirText = (w) => (w?.dir != null ? `${dirShort(w.dir)} ${degText(w)}` : w?.kn === 0 ? "Sakin" : w?.kn != null ? "Değişken" : "");
const degText = (w) => (w?.range ? `${w.range[0]}–${w.range[1]}°` : w?.dir != null ? `${Math.round(w.dir)}°` : "");
// Bekleme ekranında şimdiki rüzgâr (Seyhun 2026-11-02 "rüzgâr yönü daha doğru ve profesyonel; manuel girildiyse gösterilsin"):
// akış yönünü gösteren ok, derece ve pusula, knot; altında kaynak (Parkur verisi 14:05 turuncu ya da istasyon)
// Yarış öncesi sol altta yatay rüzgâr şeridi (Seyhun 2026-11-03 "rüzgâr sol altta yatay uzansın"): ok, knot, yön, start'ta beklenen, sağanak, kaynak
function WindStrip({ data, now }) {
  const c = curWind(data, null, true, now);
  const ew = expWind(data.forecast, data.plan.at);
  const w = c || ew;
  if (!w || (w.dir == null && w.kn == null)) return null;
  const gust = ew?.gust && ew.gust > (w.kn ?? 0) ? ew.gust : null;
  return (
    <div className="lv-wstrip">
      {w.dir != null ? <WindArrow w={w} /> : null}
      {w.kn != null ? (
        <b className="kn">
          {w.kn}
          <em>knot</em>
        </b>
      ) : null}
      <div className="g">
        {dirText(w) ? (
          <div>
            <small>Yön</small>
            <b>{dirText(w)}</b>
          </div>
        ) : null}
        {c && ew?.kn != null ? (
          <div>
            <small>Start&apos;ta</small>
            <b>{`${ew.kn} knot`}</b>
          </div>
        ) : null}
        {gust ? (
          <div>
            <small>Sağanak</small>
            <b>{gust}</b>
          </div>
        ) : null}
      </div>
      <span className={`src${c?.man ? " m" : ""}`}>{c ? c.by : "Tahmin"}</span>
    </div>
  );
}
// Rüzgâr ve hava (Seyhun 2026-11-02 "anlaşılabilir değil; o saatte beklenen'i sıfır saatte beklenen gibi okuyorum" → örnek A onay,
// yayin-tasarim/ruzgar-anlasilir/ruzgar-a.png; "yağmuru da, hava durumunu da göster, beklenen ve gerçekleşen"). Üstte (arka plansız) Şu an esen
// (ölçülen) ve Bugün en çok (tahmin); start saati yalnız grafikteki pembe çizgi (Seyhun 2026-11-02 "o yazıyı kaldır"). Altta tek grafik: tahmin kesik beyaz çizgi (bütün gün), ölçülen mavi düz
// çizgi (istasyon) ve turuncu noktalar (elle girilen); şimdi ve start çizgisi. Grafiğin altında iki saatte bir yön, hava (simge + sıcaklık)
// ve yağış: geçmiş saatte ölçülen (mavi), sonra tahmin (beyaz; yağış olasılığı).
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
// Hava tablosu (Seyhun 2026-11-03 "yağış yüzde değil mm; rüzgâr, sağanak da gösterilsin, ana sayfadaki hava gibi" → örnek B; sonra "nerede hava durumu
// gösteriyorsak hepsi aynı tasarım"): uygulamanın her yerindeki ortak HourTable (src/features/weather/HourTable.jsx): her saat bir sütun, geçmişte istasyon
// ölçümü açık mavi, şimdi kırmızı çerçeve, start saati pembe çizgi. Büyük ekranda CSS zoom (scale), saat canlı ekranın eşlenmiş saati (nowMs).
function WindBody({ data, sel, isCur, now }) {
  const fc = data.forecast;
  const rows = (fc?.rows || []).filter((r) => r.wind != null);
  // Akşam ekran ertesi güne geçince (see) tablo o günün tahminidir: şimdi sütunu ve ölçülen yok; başlıkta tarih (Seyhun 2026-11-02
  // "yarını gösteriyor ama tarih olmadığı için anlamıyorum")
  const other = !sel && data.see && data.see > trDay(now) ? data.see : "";
  const at = data.plan?.at || "";
  const c = other ? null : curWind(data, sel, isCur, now);
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
        {other ? (
          <div>
            <small>Tahmin</small>
            <b>{new Date(`${other}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" })}</b>
          </div>
        ) : null}
      </div>
      {rows.length >= 2 ? (
        <HourTable
          rows={rows}
          date={other || trDay(now)}
          nowMs={now}
          obs={other ? [] : fc?.obs || []}
          station={fc?.station ? { name: fc.station } : null}
          marks={at && !other ? [{ at, label: "Start" }] : []}
          scale={1.45}
        />
      ) : null}
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
            <s />
            <b>{x.text}</b>
            {x.state === "next" ? <em className="lv-pill">Sıradaki</em> : <span>{x.state === "done" ? "Yapıldı" : ""}</span>}
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
          <i>{x.at || ""}</i>
          <s />
          <b>
            <Dot g={x.grp} />
            {[x.name, x.grp ? `${x.grp} grup` : ""].filter(Boolean).join(" · ")}
          </b>
          {x.state === "next" ? <em className="lv-pill">Sıradaki</em> : <span>{x.state === "done" ? "Bitti" : x.state === "now" ? "Canlı" : ""}</span>}
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
      {/* Tekne animasyonu (Seyhun 2026-11-03, features/tracking/BoatRace): hazır veri setinden start */}
      <Link href="/canli/ornek/konum">Tekneler</Link>
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

// ---- Yayın grafiği (Seyhun 2026-11-03 14:41 "yap", örnek yayin-tasarim/yayin-grafik/): videolu ve videosuz aynı düzen. Arka planda yayın
// varsa video, yoksa bulanık fotoğraf. Üst ortada süre; sol üstte yalnız sonuç varken sonuçlar; sağ üstte duruma göre tek kart (program,
// start dizisi bayrakları, tehir, genel geri / abandone, gün sonu); parkur Yayın › Ekranda göster › Parkur ile elle açılır; sol altta
// rüzgâr; sağ altta yarışın adı. Alt orta boş. Hepsi aynı anda çıkmaz: kartlar duruma göre gelir.
const gWhat = (x) => [x?.name, grpText(x?.grp)].filter(Boolean).join(" · ");
const gArrow = (dir) => (
  <svg className="gr-arr" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.4" />
    {dir != null ? (
      <g transform={`rotate(${dir + 180} 24 24)`}>
        <path d="M24 7 L31 25 L24 20 L17 25 Z" fill="#fff" />
        <line x1="24" y1="20" x2="24" y2="40" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      </g>
    ) : null}
  </svg>
);
// bir yarışın sıralaması: resmî sonuç yoksa şamandıra dönüşleri (lidere fark), cezalılar sonda kodlarıyla
function raceRows(data, sel) {
  const entry = data.rounds?.[sel?.id] || { route: [], legs: [] };
  const who = whoMap(data);
  const g = sel?.n ? officialFor(data.fleets, sel.n, manualFinish(entry))[0] : null;
  if (g) return { rows: g.rows.map((r) => ({ p: r.place || r.code, sail: r.sail.replace(/^\D+/, "") || r.sail, name: shortName(r.name) || "", gap: "" })), head: "Resmî sonuç", n: g.rows.length };
  const st = standings(entry);
  const top = st[0];
  const pos = nowPos(entry);
  const route = entry.route || [];
  const fin = pos >= 0 && route[pos] === "F" && pos === route.length - 1;
  const rows = st.map((x, i) => {
    const gap = x.pen ? null : x.pos === top?.pos && i ? gapAt(entry, x.pos, x.ranks[x.pos] - 1) : null;
    return { p: x.pen || i + 1, pen: !!x.pen, sail: x.sail, name: shortName(whoOf(who, x.sail)?.name || ""), gap: !i && !x.pen ? (st.length > 1 ? "Lider" : "") : gap ? `+${Math.floor(gap / 60)}:${String(gap % 60).padStart(2, "0")}` : "" };
  });
  const n = pos >= 0 ? (entry.legs?.[pos] || []).length : 0;
  return { rows, head: pos >= 0 ? (fin ? "Finiş" : markName(route[pos])) : "Sıralama", tag: n ? `${n} tekne ${fin ? "bitirdi" : "döndü"}` : "", n: rows.length };
}
// uzun program (3 yarış × 3 grup) kısalır (Seyhun 2026-11-03 18:25): bitenler tek satırda sayı, önümüzdeki en çok 4 start, kalanı "+N start daha"
const PROG_MAX = 4;
function progRows(prog) {
  const done = prog.filter((x) => x.state === "done").length;
  const up = prog.filter((x) => x.state !== "done");
  const rows = up.length ? up.slice(0, PROG_MAX) : prog.slice(-1);
  const more = up.length - rows.length;
  const foot = [done && up.length ? `${done} start bitti` : "", more > 0 ? `+${more} start daha${up[up.length - 1]?.at ? ` · son ${up[up.length - 1].at}` : ""}` : ""].filter(Boolean).join(" · ");
  return { rows, foot };
}
// Beklenen rüzgâr grafiği (Seyhun 2026-11-03 19:12 "güzel bir grafik olsun; bugün bitiyorsa yarına geçsin"): şimdiki saatten 12 saat,
// rüzgâr dolu alan, sağanak kesik çizgi, start anı pembe çizgi, gece yarısından sonrası "Yarın", altta saat saat yön okları
function WindChart({ rows, at }) {
  const W = 400, H = 190, l = 26, r = 8, t = 30, bt = 50;
  const n = rows.length;
  const xs = (i) => l + (i * (W - l - r)) / (n - 1);
  const top = Math.max(10, ...rows.map((x) => Math.max(x.wind || 0, x.gust || 0)));
  const max = Math.ceil((top + 2) / 5) * 5;
  const ys = (v) => t + (H - t - bt) * (1 - v / max);
  const curve = (pts) => pts.reduce((d, [x, y], i) => (i ? `${d} C${(pts[i - 1][0] + x) / 2} ${pts[i - 1][1]} ${(pts[i - 1][0] + x) / 2} ${y} ${x} ${y}` : `M${x} ${y}`), "");
  const k = rows.map((x, i) => [xs(i), ys(x.wind)]);
  const gs = rows.every((x) => x.gust != null) ? rows.map((x, i) => [xs(i), ys(x.gust)]) : null;
  const mi = rows.findIndex((x) => x.tm);
  const mx = mi > 0 ? (xs(mi - 1) + xs(mi)) / 2 : mi === 0 ? l : null;
  // start anı: bugünün saatlerinde kesirli konum
  let sx = null;
  let sk = null;
  if (at && /^\d\d:\d\d$/.test(at)) {
    const hf = +at.slice(0, 2) + +at.slice(3) / 60;
    const i = rows.findIndex((x, j) => !x.tm && +x.hh <= hf && (rows[j + 1] ? rows[j + 1].tm || +rows[j + 1].hh > hf : false));
    if (i >= 0) {
      const f = hf - +rows[i].hh;
      sx = xs(i) + (xs(i + 1) - xs(i)) * f;
      sk = Math.round((rows[i].wind + (rows[i + 1].wind - rows[i].wind) * f) * 10) / 10;
    }
  }
  const fs = { fontFamily: "var(--lv-font-c), var(--lv-font), sans-serif", fontWeight: 700 };
  return (
    <svg className="gr-wc" viewBox={`0 0 ${W} ${H}`} aria-label="Beklenen rüzgâr">
      <defs>
        <linearGradient id="gr-wca" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2fd6c3" stopOpacity=".55" />
          <stop offset="1" stopColor="#2fd6c3" stopOpacity=".02" />
        </linearGradient>
      </defs>
      {[5, 10, 15, 20, 25, 30].filter((v) => v < max).map((v) => (
        <g key={v}>
          <line x1={l} x2={W - r} y1={ys(v)} y2={ys(v)} stroke="rgba(255,255,255,.07)" />
          <text x={l - 6} y={ys(v) + 4} textAnchor="end" fontSize="12" fill="rgba(255,255,255,.45)" style={fs}>
            {v}
          </text>
        </g>
      ))}
      {mx != null ? (
        <g>
          <rect x={mx} y={t - 28} width={W - r - mx} height={H - t - bt + 28} fill="rgba(255,255,255,.035)" />
          <line x1={mx} x2={mx} y1={t - 28} y2={H - bt} stroke="rgba(255,255,255,.35)" strokeDasharray="3 4" />
          <text x={sx != null && sx > mx - 30 && sx < mx + 80 ? sx + 32 : mx + 6} y={t - 12} fontSize="12" fill="#fff" letterSpacing="2" style={fs}>
            YARIN
          </text>
        </g>
      ) : null}
      <path className="gr-wca" d={`${curve(k)} L${xs(n - 1)} ${ys(0)} L${xs(0)} ${ys(0)} Z`} fill="url(#gr-wca)" />
      {gs ? <path className="gr-wcl" d={curve(gs)} fill="none" stroke="#ffd23f" strokeWidth="1.8" strokeDasharray="5 4" opacity=".85" pathLength="1" /> : null}
      <path className="gr-wcl" d={curve(k)} fill="none" stroke="#2fd6c3" strokeWidth="3" strokeLinecap="round" pathLength="1" />
      {sx != null ? (
        <g className="gr-wcs">
          <line x1={sx} x2={sx} y1={t - 6} y2={H - bt} stroke="#ff3d77" strokeWidth="2" />
          <rect x={sx - 25} y={t - 26} width="50" height="19" rx="3" fill="#ff3d77" />
          <text x={sx} y={t - 12} textAnchor="middle" fontSize="13" fill="#fff" letterSpacing="1" style={{ ...fs, fontWeight: 800 }}>
            START
          </text>
          <circle cx={sx} cy={ys(sk)} r="4.5" fill="#fff" stroke="#ff3d77" strokeWidth="2.5" />
          <text x={sx + 9} y={ys(sk) - 9} fontSize="15" fill="#fff" style={{ ...fs, fontWeight: 800 }}>
            {`${String(sk).replace(".", ",")} kn`}
          </text>
        </g>
      ) : null}
      {rows.map((x, i) => (
        <g key={`${x.tm ? "y" : "b"}${x.hh}`}>
          {x.dir != null ? (
            <g transform={`translate(${xs(i)} ${H - 30}) rotate(${x.dir + 180}) scale(0.75)`}>
              <path d="M0 -9 L6 6 L0 3 L-6 6 Z" fill="rgba(255,255,255,.75)" />
            </g>
          ) : null}
          {i % 3 === 0 || +x.hh === 0 ? (
            <text x={xs(i)} y={H - 4} textAnchor="middle" fontSize="13" fill={+x.hh === 0 ? "#fff" : "rgba(255,255,255,.55)"} style={fs}>
              {x.hh}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
const gWho = (x) => (x ? { name: x.name || "", grp: x.grp || "", cls: x.cls || "" } : null);

// ---- Yayın sahneleri (Seyhun 2026-11-04 "yap", örnek artifact MWmT63Sb1mmtJ4s6izg82N): 01 Yarış öncesi (ortada tek kart: Süre · Program ·
// Rüzgâr sırayla), 02 Yarışta (görüntü önde, sol üstte tek kart; start'a dakikalar · geri sayım · start sonrası · dönüş), 03 Genel sıralama,
// 04 Tekrar, 05 Parkur, 06 Sıradaki yarış. Hepsinde sağ üstte Canlı + saat, sağ altta yarışın adı ve Velora. Sahne kendiliğinden seçilir
// (lib/raceRounds sceneOf); Yayın'dan elle seçilen (courseShow.scene) üstüne yazar.
const SC_TAB = 10; // sn, 01'deki kartın her bölümü
const SC_ROT = 15; // sn, 03 ↔ 06 ve sınıf sınıf sıralama
const SC_RANK = 10;
const SC_ROUND_MS = 60e3; // şamandıra dönüşünden sonra ilk 3 bu kadar görünür
const scHm = (ms) => new Date(ms + 3 * 3600e3).toISOString().slice(11, 16);
// Süre kartının içeriği (eski Grafik "top" mantığı): kicker, büyük süre, kim, start saati, alt satır, bayrak
function scTime({ data, sel, entry, cs, prog, today, now, mode, seqMode, fsLast }) {
  const plan = data.plan;
  const r = data.race || {};
  const first = prog.find((x) => x.state === "next") || null;
  const e = entry?.cls || entry?.grp ? { ...entry, name: sel ? raceName(sel) : first?.name } : plan.order?.[0] ? { ...plan.order[0], name: first?.name || "" } : first;
  const vd = mode === "wait" || mode === "between" ? voidLast(data, today, now) : null;
  if (mode === "summary") {
    const t = nextText(plan, today);
    return { k: "Gün bitti", tm: t.big, sub: t.sub, tx: true };
  }
  if (mode === "seq" && seqMode === "fs") return { k: "Genel geri çağırma", tone: "r", flag: "FS", tm: "Yeniden start", tx: true, who: fsLast ? gWho({ name: raceName(fsLast), grp: fsLast.grp || data.rounds?.[fsLast.id]?.grp || "", cls: data.rounds?.[fsLast.id]?.cls || "" }) : null, sub: "Uyarı işareti bekleniyor" };
  if (mode === "seq" || (mode === "ap" && plan.ap?.seq != null)) {
    if (seqMode === "ap" || mode === "ap") return { k: "Tehir · dizi durdu", tone: "r", flag: "AP", tm: plan.ap?.why || "Start ertelendi", tx: true, who: gWho(e) };
    const hm = /Start (\d\d:\d\d)/.exec(cs.right || "")?.[1] || "";
    const prep = e?.prep || "";
    // yalnız o an çekili bayrak (Seyhun 2026-11-04 örnek 02 geri sayım): 4 dk'dan sonra kural bayrağı çekili, son dakikada indi
    const flag = prep && cs.rem != null && cs.rem <= 240 && cs.rem > 60 ? { kind: prep, t: `${prepName(prep)} çekili`, s: "1 dk kala iner" } : prep && cs.rem != null && cs.rem <= 60 && cs.rem > 0 ? { kind: prep, down: true, t: `${prepName(prep)} indi`, s: "Son dakika" } : null;
    return { k: cs.rem != null && cs.rem <= 60 ? "Son dakika" : "Start'a", tone: cs.rem != null && cs.rem <= 60 ? "o" : "", tm: cs.rem === 0 ? "Start" : cs.value, at: hm, who: gWho(e), fl: flag };
  }
  if (mode === "ap") {
    const apDown = plan.status !== "ap";
    const counting = !apDown && cs.label === "Tehir inişine";
    return { k: apDown ? "Tehir indi" : "Tehir", tone: "r", flag: "AP", tm: apDown ? "Start yakında" : counting ? cs.value : plan.ap?.why || "Belirsiz", tx: !counting, who: null, sub: apDown ? "Uyarı işareti bekleniyor" : [counting ? plan.ap?.why : "", plan.ap?.land ? "Karada" : ""].filter(Boolean).join(" · ") };
  }
  if (mode === "race") return { k: cs.label || "Geçen süre", tm: cs.value, who: gWho({ name: sel ? raceName(sel) : "", grp: entry?.grp || sel?.grp || "", cls: entry?.cls || sel?.cls || "" }) };
  if (mode === "none") {
    const t = nextText(plan, today);
    return { k: "Bugün yarış yok", tm: t.big, sub: t.sub, tx: true };
  }
  if (vd) {
    const g = vd.grp || data.rounds?.[vd.id]?.grp || "";
    return { k: voidShort(vd.void), tone: "r", flag: voidFlag(vd.void), tm: cs.rem ? cs.value : "Yeniden start", tx: !cs.rem, who: gWho({ name: raceName(vd), grp: g, cls: data.rounds?.[vd.id]?.cls || vd.cls || "" }), sub: cs.rem ? "" : "Uyarı işareti bekleniyor" };
  }
  if (mode === "between" && sel?.fin) return { k: "Bitti", tm: raceTime(sel) || "—", who: gWho({ name: raceName(sel), grp: entry?.grp || sel.grp, cls: entry?.cls || "" }), sub: first ? `Sıradaki · ${gWhat(first)}${first.at ? ` · ${first.at}` : ""}` : "" };
  // bir günden uzaksa saat:dakika değil gün (Seyhun 2026-11-04 "yarışa 14 gün var")
  const far = !cs.rem || cs.rem >= 86400;
  const left0 = far && r.startDate > today ? daysUntil(r.startDate, today) : far && cs.rem ? Math.ceil(cs.rem / 86400) : 0;
  if (left0) return { k: "Yarışa", tm: String(left0), un: "gün", sub: [r.endDate && r.endDate !== r.startDate ? `${dayText(r.startDate)} – ${dayText(r.endDate)}` : dayText(r.startDate), r.place].filter(Boolean).join(" · ") };
  const orange = orangeUp(plan, today);
  const { kick } = holdState(data, today, cs, now);
  return { k: orange ? "Turuncu bayrak · start hattı kuruldu" : kick, tone: orange ? "o" : "", orange, tm: cs.rem ? cs.value : "—:—", at: first?.at || "", who: gWho(first) };
}
// son şamandıra dönüşü (ms) ve o şamandıradaki ilk 3
function scRound(data, sel) {
  const en = sel ? data.rounds?.[sel.id] : null;
  if (!en) return null;
  const pos = nowPos(en);
  if (pos < 0) return null;
  const t = Math.max(0, ...((en.legs?.[pos]?.t || []).map(Number).filter(Number.isFinite)));
  const rr = raceRows(data, sel);
  return rr.rows.length ? { t, head: rr.head, tag: rr.tag, n: rr.rows.length, rows: rr.rows.slice(0, SC_FLEET) } : null;
}
// genel sıralama: resmî (PDF) ya da geçici; sınıf sınıf, yarış yarış puanlar
function scBoards(data) {
  const official = (data.fleets || []).filter((f) => f.rows?.length); // puansız sonuç PDF'i (geçici sonuçlar) de sırasıyla (Seyhun 2026-11-04)
  const year = +String(data.race?.startDate || "").slice(0, 4) || new Date().getFullYear();
  // Kız / Junior / Bambino (Seyhun 2026-11-04 "kızları ayırmamız gerekiyor; kızlarda 1, 2, 3; diğer kızların yanında K"): yarış sayfasındaki sıralamayla
  // aynı kural (roundScore catsOf / onlyCat); sonuç belgesinde yoksa kayıt listesinden. catList: hepsinde olmayan kategoriler (hepsi Junior ise yazılmaz)
  const bySail = new Map((data.entries || []).map((e) => [e.sail, e]));
  const withCats = (b) => ({ ...b, catList: ["Kız", "Junior", "Bambino"].filter((c) => b.all.some((r) => r.cats.includes(c)) && !b.all.every((r) => r.cats.includes(c))) });
  if (official.length)
    return official.map((f) => {
      const n = Math.max(0, ...f.rows.map((r) => (Array.isArray(r.r) ? r.r.length : 0)));
      const all = f.rows.map((r, i) => {
        const en = bySail.get(r.sail) || {};
        const cats = catsOf({ cls: f.cls || en.cls, sex: r.sex || en.sex, cat: r.cat || en.cat, born: r.born || en.born }, year);
        return { p: r.rank || r.place || r.code || i + 1, sail: r.sail, name: r.name, club: r.club, cats, sc: (Array.isArray(r.r) ? r.r : []).slice(0, 8).map((v) => String(v ?? "")), t: r.pts };
      });
      return withCats({ cls: f.cls || "", tag: "Sonuç", races: Array.from({ length: Math.min(n, 8) }, (_, i) => i + 1), all, rows: all.slice(0, SC_RANK), total: f.rows.length });
    });
  let prov = [];
  try {
    prov = provisional({ starts: data.starts || [], rounds: data.rounds || {}, entries: data.entries || [], groups: data.groups || {}, who: whoBySail(data.fleets), year });
  } catch {
    prov = [];
  }
  return prov.map((f) => {
    const races = f.races.slice(-8);
    return { cls: f.cls || "", tag: `Geçici · ${f.races.length} yarış`, races, all: f.rows.map((r, i) => ({ p: r.rank || i + 1, sail: r.sail, name: r.name, club: r.club, cats: r.cats || [], sc: races.map((n) => (r.sc[n] ? r.sc[n].code || String(r.sc[n].pts) : "")), t: r.total })), total: f.rows.length };
  }).map((b) => withCats({ ...b, rows: b.all.slice(0, SC_RANK) }));
}
function ScTop({ rep, now }) {
  return (
    <div className="sc-tr">
      {rep ? <span className="sc-live rep">Tekrar</span> : <span className="sc-live">Canlı</span>}
      <span className="sc-clk">{scHm(now)}</span>
    </div>
  );
}
// Tehir rozeti: sağ üstte Canlı + saatin altında; karada (dizi dışı) tehir bütün gruplar için, dizide çekildiyse o start
function ScAp({ t, plan, seq }) {
  const down = plan.status !== "ap";
  const counting = !down && !t.tx && /\d/.test(String(t.tm || ""));
  const why = plan.ap?.why || "";
  // çekilen tehir işareti (AP, AP üzeri H, AP üzeri 6…): bayrak düğmesindekiyle aynı bayraklar
  const s = (signalOf(plan.sig?.id)?.kind === "ap" ? signalOf(plan.sig.id) : null) || signalOf(plan.ap?.land ? "AP/H" : "AP");
  const line = down ? ["Start yakında", "Uyarı işareti bekleniyor"] : [s.hours ? "" : why || "Belirsiz", plan.ap?.land ? "Karada" : "", seq && t.who ? gWhat(t.who) || t.who.name : "Tüm gruplar"];
  return (
    <div className="sc-ap">
      <span className="sc-sgf" aria-hidden="true">
        {(down ? ["AP"] : s.flags).map((f) => (
          <i key={f} dangerouslySetInnerHTML={{ __html: flagSvg(f) }} />
        ))}
      </span>
      <div>
        <b>
          {down ? "Tehir indi" : s.hours ? s.short : "Tehir"}
          {counting ? <em>{t.tm}</em> : null}
        </b>
        <span>{line.filter(Boolean).join(" · ")}</span>
      </div>
    </div>
  );
}
function ScWho({ who, tag }) {
  if (!who && !tag) return null;
  return (
    <div className="sc-who">
      {tag ? <span className="sc-tag">{tag}</span> : null}
      {who?.grp || who?.cls ? (
        <span className="sc-g">
          {who.grp ? <i style={{ background: groupColor(who.grp) || "#fff" }} /> : null}
          {[who.cls, who.grp ? `${who.grp} grup` : ""].filter(Boolean).join(" · ")}
        </span>
      ) : null}
    </div>
  );
}
function ScSig({ data, today }) {
  const sig = data.plan?.sig;
  const s = sig ? signalOf(sig.id) : null;
  if (!s || !sigOnCard(s)) return null;
  // tehir işaretleri (AP/H, AP 6 saat) saatin altındaki tehir rozetinde; tehir inince hiç gösterilmez
  if (s.kind === "ap" && !s.end) return null;
  if (new Date(Date.parse(sig.at) + 3 * 3600e3).toISOString().slice(0, 10) !== today) return null;
  return (
    <div className="sc-fl">
      <span className="sc-sgf" aria-hidden="true">
        {s.flags.map((f) => (
          <i key={f} dangerouslySetInnerHTML={{ __html: flagSvg(f) }} />
        ))}
      </span>
      <b>{s.short}</b>
      <em>{s.info}</em>
    </div>
  );
}
// rüzgâr: eski tasarım (halkalı ok, büyük kn, yön sağda, sarı sağanak); big: 01'deki grafikli hali
function ScWind({ data, now, prog, big = false }) {
  const c = curWind(data, null, true, now);
  const rows = big ? windAhead(data, now) : [];
  const at = (prog || []).find((x) => x.state === "next")?.at || "";
  if (!c && rows.length < 2) return null;
  const gu = c && c.gust != null && c.gust > c.kn ? `Sağanak ${c.gust} kn` : "";
  // elle ölçüm varken start'ta beklenen yazılmaz (Seyhun 2026-11-03 17:39: tahmin ile ölçüm çok farklı olabiliyor)
  const ew = c && big && data.plan?.at && !c?.man ? expWind(data.forecast, data.plan.at) : null;
  const ex = ew?.kn != null ? `start'ta ${ew.kn} kn` : "";
  return (
    <div className={`sc-w${big ? " big" : ""}`}>
      {c ? (
        <>
          <div className="sc-src">{c.by || "Şimdi"}</div>
          <div className="sc-wm">
            {gArrow(c.dir)}
            <b>
              {c.kn}
              <em>kn</em>
            </b>
            <span>{dirText(c)}</span>
          </div>
          {gu || ex ? <div className="sc-gu">{[gu, ex].filter(Boolean).join(" · ")}</div> : null}
        </>
      ) : null}
      {rows.length >= 2 ? (
        <>
          <div className="sc-wh">
            <span>Beklenen</span>
            <span>
              <i className="a" />
              Rüzgâr
            </span>
            {rows.every((x) => x.gust != null) ? (
              <span>
                <i className="b" />
                Sağanak
              </span>
            ) : null}
          </div>
          <WindChart rows={rows} at={at} />
        </>
      ) : null}
    </div>
  );
}
// tek satır rüzgâr (02 kartının altı)
function ScWindLine({ data, now }) {
  const c = curWind(data, null, true, now);
  if (!c) return null;
  return (
    <div className="sc-wl">
      {gArrow(c.dir)}
      <b>{`${c.kn} kn`}</b>
      <span>{dirText(c)}</span>
      {c.gust != null && c.gust > c.kn ? <em>{`sağanak ${c.gust}`}</em> : null}
    </div>
  );
}
function ScTime({ t, big = false }) {
  const tx = t.tx || !/\d/.test(String(t.tm || ""));
  return (
    <div className={`sc-t${big ? " big" : ""}${t.tone ? ` ${t.tone}` : ""}`}>
      <div className="sc-k">
        {t.flag ? <Flag kind={t.flag} /> : t.orange ? <i className="sc-of" aria-hidden="true" /> : null}
        {[big && t.who?.name ? t.who.name : "", t.k].filter(Boolean).join(" · ")}
      </div>
      <div className={`sc-tm${tx ? " tx" : ""}`}>
        {t.tm}
        {t.un ? <small className="sc-un">{t.un}</small> : null}
      </div>
      {big && (t.who?.grp || t.who?.cls || t.at) ? (
        <div className="sc-tw">
          {t.who?.cls ? <span>{t.who.cls}</span> : null}
          {t.who?.grp ? <span className="sc-gp" style={{ background: groupColor(t.who.grp) || "#ffd23f", color: inkOn(groupColor(t.who.grp) || "#ffd23f") }}>{`${t.who.grp} grup`}</span> : null}
          {t.at ? <em>{`start ${t.at}`}</em> : null}
        </div>
      ) : null}
      {t.sub ? <div className="sc-sub">{t.sub}</div> : null}
    </div>
  );
}
function ScProg({ prog }) {
  const { rows, foot } = progRows(prog);
  return (
    <div className="sc-pg">
      <div className="sc-src">Program · bugün</div>
      <ul>
        {rows.map((x) => (
          <li key={x.key} className={x.state}>
            <b>{x.at || ""}</b>
            <i style={{ background: groupColor(x.grp) || "rgba(255,255,255,.45)" }} />
            <span>{gWhat(x) || x.name}</span>
            {x.state === "next" ? <small>Sıradaki</small> : x.state === "now" ? <small>Yarışta</small> : x.state === "done" ? <small className="d">Bitti</small> : null}
          </li>
        ))}
      </ul>
      {foot ? <div className="sc-more">{foot}</div> : null}
    </div>
  );
}
// sıradaki startın grubundaki sporcular (eski sol sütun, Seyhun 2026-11-03 19:59): günün grup listesi, yoksa sınıfın kayıt listesi
function scBoats(data, who, today) {
  const all = data.entries || [];
  if (!all.length) return [];
  const gm = groupMap(groupsOn(data.groups, today));
  const grp = who?.grp || "";
  const cls = who?.cls || "";
  const inGrp = grp && Object.keys(gm).length ? all.filter((x) => gm[x.sail] === grp) : [];
  return (inGrp.length ? inGrp : all.filter((x) => !cls || !x.cls || x.cls === cls)).slice().sort((a, b) => Number(a.sail) - Number(b.sail));
}
// 01 Sıralama sekmesi: genel sıralamanın ilk 10'u, iki sütun (1–5, 6–10)
// Sağ üstte grubun sporcuları (start dizisinde ve ilk dönüşe kadar), şamandıra dönüşünden sonra aynı yerde dönüş sırası
// (Seyhun 2026-11-04 "starttan önce grubun sporcuları, sonra aynı sporcular şamandıra dönüşleriyle devam")
const SC_FLEET = 10;
function ScFleet({ data, sel, mode, now, who, today, onFull }) {
  const rd = mode === "race" ? scRound(data, sel) : null;
  if (rd) {
    const fresh = rd.t && now - rd.t < SC_ROUND_MS;
    return (
      <button type="button" className="sc-rd" onClick={() => onFull("race")}>
        <div className="sc-rdh">
          <span>{fresh ? `${rd.head} · az önce` : rd.head}</span>
          <span>{rd.tag || "Dönüş"}</span>
        </div>
        <ol>
          {rd.rows.map((r, i) => (
            <li key={`${r.sail}${i}`}>
              <u>{r.p}</u>
              <b>{r.sail}</b>
              <em>{r.gap || r.name}</em>
            </li>
          ))}
        </ol>
        {rd.n > rd.rows.length ? <div className="sc-rdm">{`+${rd.n - rd.rows.length} tekne`}</div> : null}
      </button>
    );
  }
  const boats = scBoats(data, who, today);
  if (!boats.length) return null;
  return (
    <div className="sc-rd">
      <div className="sc-rdh">
        <span>{who?.grp ? `${who.grp} grup` : who?.cls || "Sporcular"}</span>
        <span>{`${boats.length} tekne`}</span>
      </div>
      <ol>
        {boats.slice(0, SC_FLEET).map((x) => (
          <li key={x.sail}>
            <b>{x.sail}</b>
            <em>{shortName(x.name) || ""}</em>
          </li>
        ))}
      </ol>
      {boats.length > SC_FLEET ? <div className="sc-rdm">{`+${boats.length - SC_FLEET} tekne`}</div> : null}
    </div>
  );
}
// 01: ortada tek kart; Süre · Program · Rüzgâr sırayla (start dizisi, tehir, abandone ve genel geride yalnız Süre)
function Sc01({ t, data, prog, now, today, lock, ap = false }) {
  // Genel sıralama artık burada sekme değil, ayrıntılı 03 sahnesi araya girer (Seyhun 2026-11-04 "sıralamayı daha detaylı, uzun liste").
  // Tehirde Süre sekmesi yalnız tehir inişi sayılırken; tehir saatin altındaki rozette (ScAp)
  const have0 = [ap && t.tx ? "" : "time", prog.some((x) => x.state !== "done") ? "prog" : "", curWind(data, null, true, now) || windAhead(data, now).length >= 2 ? "wind" : ""].filter(Boolean);
  const have = have0.length ? have0 : ["time"];
  const k = lock ? "time" : have[Math.floor(now / 1000 / SC_TAB) % have.length];
  const NAME = { time: "Süre", prog: "Program", wind: "Rüzgâr" };
  return (
    <div className="sc-c1">
      <div className="sc-cb" key={k}>
        {k === "time" ? <ScTime t={t} big /> : k === "prog" ? <ScProg prog={prog} /> : <ScWind data={data} now={now} prog={prog} big />}
        {k === "time" ? <ScSig data={data} today={today} /> : null}
      </div>
      {have.length > 1 && !lock ? (
        <div className="sc-tabs" style={{ gridTemplateColumns: `repeat(${have.length}, 1fr)` }}>
          {have.map((x) => (
            <span key={x} className={x === k ? "on" : ""}>
              {NAME[x]}
              {x === k ? <i key={`${k}${Math.floor(now / 1000 / SC_TAB)}`} style={{ animationDuration: `${SC_TAB}s` }} /> : null}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
// 02: sol üstte tek kart; geri sayımda o an çekili bayrak, yarışta erken çıkanlar; şamandıra dönüşünden sonra sağ üstte ilk 3 (60 sn)
function Sc02({ t, data, sel, mode, now, today }) {
  const ea = mode === "race" && sel && now - Date.parse(sel.at) < 15 * 60e3 ? earlyOf(data, sel.id) : [];
  if (!t) {
    return (
      <div className="sc-c2">
        <ScSig data={data} today={today} />
        <ScWindLine data={data} now={now} />
      </div>
    );
  }
  const n = /^(\d+)\./.exec(t.who?.name || "")?.[1];
  return (
    <>
      <div className="sc-c2">
        <ScWho who={t.who} tag={n ? `Yarış ${n}` : t.who?.name || ""} />
        <ScTime t={t} />
        {t.fl ? (
          <div className="sc-fl">
            <Flag kind={t.fl.kind} down={t.fl.down} />
            <b>{t.fl.t}</b>
            <em>{t.fl.s}</em>
          </div>
        ) : null}
        {ea.length ? (
          <div className="sc-ocs">
            <b>{ea[0].c}</b>
            <span>{ea.map((x) => `TUR ${x.sail}`).join(" · ")}</span>
          </div>
        ) : null}
        <ScSig data={data} today={today} />
        <ScWindLine data={data} now={now} />
      </div>
    </>
  );
}
// 03: ortada ayrıntılı genel sıralama (Seyhun 2026-11-04 "sıralamayı daha detaylı; uzun bir liste olacak"): sınıf sınıf bütün tekneler,
// 12'şer satırlık sayfalar 8 sn'de bir ilerler (altta sayfa çizgileri); sıra, yelken, sporcu, kulüp, yarış yarış puan, net. Yarış yeni bittiyse önce o yarışın sonucu.
// Sahne girince ilk sayfadan başlar; sahnenin ekranda kalma süresi sayfa sayısı kadar (sc03Len → sceneOf dwell)
const SC_PAGE = 11; // satır: ilk 5 sabit + 6 akan (Seyhun 2026-11-04 "ilk 5 her zaman gösterilsin, sonrası ileri doğru aksın")
const SC_TOP = 5;
const SC_PAGE_S = 8;
const scPages = (len) => (len <= SC_PAGE ? 1 : Math.ceil((len - SC_TOP) / (SC_PAGE - SC_TOP)));
function sc03Slides(data, sel, mode) {
  const rr = mode === "between" && sel?.fin ? raceRows(data, sel) : null;
  const out = rr?.rows.length ? [{ rr }] : [];
  for (const b of scBoards(data)) {
    const n = scPages(b.all.length);
    for (let pg = 0; pg < n; pg++) out.push({ b, pg, n });
    // kategori sayfası: kızlar (Junior, Bambino) kendi içinde ilk 10
    for (const cat of b.catList) out.push({ b, pg: 0, n: 1, cat });
  }
  return out;
}
const sc03Len = (data, sel, mode) => Math.max(15, sc03Slides(data, sel, mode).length * SC_PAGE_S);
function Sc03({ data, sel, mode, now, onFull }) {
  const [t0] = useState(now);
  const slides = sc03Slides(data, sel, mode);
  if (!slides.length) return null;
  const k = Math.floor(Math.max(0, now - t0) / 1000 / SC_PAGE_S);
  const cur = slides[k % slides.length];
  if (cur.rr) {
    const rr = cur.rr;
    return (
      <button type="button" className="sc-board" onClick={() => onFull("race")}>
        <header>
          <b>{rr.head === "Resmî sonuç" ? "Sonuç" : "Yarış sonucu"}</b>
          <div>
            <strong>{gWhat({ name: raceName(sel), grp: data.rounds?.[sel.id]?.grp || sel.grp })}</strong>
            <span>{rr.head === "Resmî sonuç" ? "Resmî" : "Geçici"}</span>
          </div>
        </header>
        <table>
          <tbody>
            {rr.rows.slice(0, SC_PAGE).map((r, i) => (
              <tr key={`${r.sail}${i}`} className={`p${r.p}`}>
                <td className="r">{r.p}</td>
                <td className="sn">{r.sail}</td>
                <td className="n">{r.name}</td>
                <td className="t">{r.gap && r.gap !== "Lider" ? r.gap : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </button>
    );
  }
  const { b, pg, n, cat } = cur;
  const inCat = cat ? onlyCat(b.all, cat) : null;
  const rows = cat ? inCat.slice(0, SC_PAGE).map((r) => ({ ...r, p: r.place })) : n > 1 ? [...b.all.slice(0, SC_TOP), ...b.all.slice(SC_TOP + pg * (SC_PAGE - SC_TOP), SC_TOP + (pg + 1) * (SC_PAGE - SC_TOP))] : b.all.slice(0, SC_PAGE);
  const from = n > 1 ? SC_TOP + pg * (SC_PAGE - SC_TOP) + 1 : 1;
  const to = n > 1 ? Math.min(b.all.length, SC_TOP + (pg + 1) * (SC_PAGE - SC_TOP)) : rows.length;
  const catName = (c) => (c === "Kız" ? "Kızlar" : c);
  const marks = (r) => b.catList.filter((c) => c !== cat && r.cats.includes(c)).map((c) => c[0]);
  return (
    <button type="button" className="sc-board wide" onClick={() => onFull("all")}>
      <header>
        <b>Genel sıralama</b>
        <div>
          <strong>{[b.cls || "Genel", cat ? catName(cat) : ""].filter(Boolean).join(" · ")}</strong>
          <span>{b.tag}</span>
        </div>
      </header>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Yelken</th>
            <th>Sporcu</th>
            <th className="cl">Kulüp</th>
            {b.races.map((x) => (
              <th key={x} className="y">{`Y${x}`}</th>
            ))}
            <th className="t">Net</th>
          </tr>
        </thead>
        <tbody key={`${b.cls}${cat || ""}`}>
          {rows.map((r, i) => (
            <tr key={`${r.sail}${i}`} className={`p${r.p}${!cat && n > 1 && i === SC_TOP ? " cut" : ""}${!cat && n > 1 && i >= SC_TOP ? " fl" : ""}`}>
              <td className="r">{r.p}</td>
              <td className="sn">{r.sail}</td>
              <td className="n">
                {r.name || ""}
                {marks(r).map((m) => (
                  <em key={m} className="sc-cat">
                    {m}
                  </em>
                ))}
              </td>
              <td className="cl">{shortClub(r.club) || ""}</td>
              {b.races.map((x, j) => (
                <td key={x} className={`y${/^\(.*\)$/.test(r.sc[j] || "") ? " x" : ""}`}>
                  {String(r.sc[j] || "").replace(/^\((.*)\)$/, "$1")}
                </td>
              ))}
              <td className="t">{r.t ?? ""}</td>
            </tr>
          ))}
          {Array.from({ length: b.all.length > SC_PAGE ? SC_PAGE - rows.length : 0 }, (_, i) => (
            <tr key={`e${i}`} className="e" aria-hidden="true">
              <td colSpan={b.races.length + 5}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
      <footer>
        <span>{cat ? `${catName(cat)} · ${inCat.length} sporcu` : n > 1 ? `İlk ${SC_TOP} · ${from}–${to} · ${b.total} tekne` : `${b.total} tekne`}</span>
        {n > 1 ? (
          <span className="sc-pgs">
            {Array.from({ length: n }, (_, i) => (
              <i key={i} className={i === pg ? "on" : ""}>
                {i === pg ? <u key={k} style={{ animationDuration: `${SC_PAGE_S}s` }} /> : null}
              </i>
            ))}
          </span>
        ) : (
          <span>{scBoards(data).length > 1 ? scBoards(data).map((x) => x.cls).filter(Boolean).join(" · ") : ""}</span>
        )}
      </footer>
    </button>
  );
}
// 04: tekrar videosu; sol üstte yarış ve ekrandaki yazı
const scRecNo = (m, starts) => (m.phase ? momentRace(m, starts) : [...(starts || [])].filter((x) => !x.void && x.at <= m.at).at(-1)?.n || 0);
function Sc04({ data }) {
  const scr = data.screen || {};
  const starts = data.starts || [];
  const rec = (data.media || []).find((m) => m.id === scr.mid) || null;
  const no = rec ? scRecNo(rec, starts) : 0;
  const st = no ? starts.find((x) => x.n === no && !x.void) || null : null;
  const en = st ? data.rounds?.[st.id] : null;
  const title = rec ? recTitle(rec, rec.phase ? momentRaceName(rec, starts) : no ? `${no}. yarış` : "") : "";
  return (
    <div className="sc-c2">
      <ScWho who={st ? { grp: en?.grp || st.grp || "", cls: en?.cls || "" } : null} tag={no ? `Yarış ${no}` : ""} />
      <div className="sc-x">
        <b>{title || "Tekrar"}</b>
        {rec?.at ? <span>{hmOf(rec.at)}</span> : null}
      </div>
      {scr.caption ? <div className="sc-note">{scr.caption}</div> : null}
    </div>
  );
}
// 05: parkur; sol üstte kartın adı büyük şeritte, ortada çizim, sağda rota · eksen · hat
function Sc05({ data, sel, mode, now }) {
  const racing = mode === "race";
  const route = sceneRoute(data, racing ? sel : null, true, racing ? "race" : "wait");
  const svg = courseSvg(data, route, { W: 900, H: 760 });
  if (!svg) return null;
  const crs = cleanCourse(data.course || {});
  const card = selCard(crs);
  const ty = CARD_TYPES[card?.type] || "";
  let bias = null;
  try {
    bias = lineBias(crs);
  } catch {
    bias = null;
  }
  const ax = axisInfo(data);
  const c = curWind(data, null, true, now);
  return (
    <>
      <div className="sc-cbn">
        <b>{[ty.split(" ")[0], card?.id ? `Kart ${card.id}` : ""].filter(Boolean).join(" · ") || "Parkur"}</b>
        <span>{[data.race?.place, data.rounds?.[sel?.id]?.cls].filter(Boolean).join(" · ")}</span>
      </div>
      <div className="sc-crs" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="sc-ci">
        {route.length ? (
          <section>
            <small>Rota</small>
            <div className="sc-rt">
              <span className="s">Start</span>
              {route.map((m, i) => (
                <span key={`${m}${i}`}>{m === "F" ? "Finiş" : markLabel(m)}</span>
              ))}
            </div>
          </section>
        ) : null}
        <section>
          <small>Eksen</small>
          <b>{[axisText(data), ax?.sh != null ? shiftText(ax.sh) : ""].filter(Boolean).join(" · ")}</b>
        </section>
        {bias?.end ? (
          <section>
            <small>Hat</small>
            <b>{`${bias.end === "pin" ? "Pin" : "Komite"} tarafı ${Math.round(bias.deg)}° avantajlı`}</b>
          </section>
        ) : null}
        {c ? (
          <section>
            <small>Rüzgâr</small>
            <b>{`${c.kn} kn · ${dirText(c)}`}</b>
          </section>
        ) : null}
      </div>
    </>
  );
}
// 06: sıradaki yarış; büyük numara, sınıf · grup, tahmini start, kalan, beklenen rüzgâr; sağda sonraki startlar
function Sc06({ data, prog, now, today }) {
  const up = prog.filter((x) => x.state !== "done" && x.state !== "now");
  const nx = up[0] || null;
  const plan = data.plan;
  if (!nx) {
    const t = nextText(plan, today);
    return (
      <div className="sc-nx">
        <div className="sc-k">Sıradaki yarış günü</div>
        <h1>{t.big}</h1>
        {t.sub ? <div className="sc-sub">{t.sub}</div> : null}
      </div>
    );
  }
  const atMs = nx.at && plan.at ? Date.parse(plan.at) : null;
  const left = atMs && atMs > now ? Math.round((atMs - now) / 60e3) : null;
  const w = nx.at ? expWind(data.forecast, plan.at) : null;
  const n = /^(\d+)\./.exec(nx.name || "")?.[1];
  return (
    <>
      <div className="sc-nx">
        <div className="sc-k">Sıradaki yarış</div>
        <h1>{n ? `Yarış ${n}` : nx.name}</h1>
        <ScWho who={{ grp: nx.grp, cls: nx.cls }} />
        {nx.at || w ? (
          <div className="sc-nw">
            {nx.at ? (
              <div>
                <small>Tahmini start</small>
                <b>{nx.at}</b>
              </div>
            ) : null}
            {left != null ? (
              <div>
                <small>Kalan</small>
                <b>{left >= 60 ? `${Math.floor(left / 60)} sa ${left % 60} dk` : `${left} dk`}</b>
              </div>
            ) : null}
            {w?.kn != null ? (
              <div>
                <small>Beklenen rüzgâr</small>
                <b>{`${w.kn} kn`}</b>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {up.length > 1 ? (
        <div className="sc-later">
          <div className="sc-src">Sonra</div>
          <ul>
            {up.slice(1, 4).map((x) => (
              <li key={x.key}>
                {x.at ? <b>{x.at}</b> : null}
                <i style={{ background: groupColor(x.grp) || "rgba(255,255,255,.45)" }} />
                <span>{gWhat(x) || x.name}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
// Hangi sahne (lib/raceRounds sceneOf; Yayın sayfası da aynı işlevle bakar)
function scPick({ data, sel, mode, hasVideo, now, far }) {
  const route = sceneRoute(data, mode === "race" ? sel : null, true, mode === "race" ? "race" : "wait");
  const rec = data.screen?.kind === "rec";
  const has = { "01": true, "02": true, "03": mode === "between" || scBoards(data).length > 0, "04": rec || data.courseShow?.vid?.["04"]?.kind === "rec", "05": !!courseSvg(data, route), "06": true };
  // tehir indiyse (start yakında) sıralama araya girmez
  const m = mode === "ap" && data.plan?.status !== "ap" ? "wait" : mode;
  return sceneOf({ show: data.courseShow, rec, mode: m, hasVideo, now, has, far: m === mode ? far : false, dwell: { "03": sc03Len(data, sel, mode) } });
}
function Sahne({ data, sel, entry, cs, prog, today, now, mode, seqMode, fsLast, sc, onFull }) {
  const plan = data.plan;
  const r = data.race || {};
  const t = scTime({ data, sel, entry, cs, prog, today, now, mode, seqMode, fsLast });
  // Tehir (Seyhun 2026-11-04 "ortada kocaman değil, saatin altında; karada çekildiyse bütün gruplar için; ortada parkur, sıralama, rüzgâr devam")
  const ap = mode === "ap" || (mode === "seq" && seqMode === "ap");
  const lock = !ap && (mode === "seq" || t.tone === "r");
  const body =
    sc === "01" ? <Sc01 t={t} data={data} prog={prog} now={now} today={today} lock={lock} ap={ap} />
    : sc === "02" ? <Sc02 t={ap ? null : t} data={data} sel={sel} mode={mode} now={now} today={today} />
    : sc === "03" ? <Sc03 data={data} sel={sel} mode={mode} now={now} onFull={onFull} />
    : sc === "04" ? <Sc04 data={data} />
    : sc === "05" ? <Sc05 data={data} sel={sel} mode={mode} now={now} />
    : <Sc06 data={data} prog={prog} now={now} today={today} />;
  const live = mode !== "none" && plan.status !== "done";
  return (
    <div className={`sc s${sc}`} data-scene={sc}>
      <div className="sc-body" key={sc}>
        {body}
      </div>
      {(sc === "01" || sc === "02") && (mode === "seq" || mode === "race") ? <ScFleet data={data} sel={sel} mode={mode} now={now} who={t.who} today={today} onFull={onFull} /> : null}
      {live || sc === "04" ? <ScTop rep={sc === "04"} now={now} /> : null}
      {ap && sc !== "04" ? <ScAp t={t} plan={plan} seq={mode === "seq"} /> : null}
      <div className="sc-name">
        <div className="sc-nt">
          <b className={(plan.title || r.name || "").length > 22 ? "lg" : ""}>{plan.title || r.name || "Yarış"}</b>
          {plan.sub ? <small>{plan.sub}</small> : null}
        </div>
        <span className="sc-vl">
          <VeloraGlyph size={40} />
          <small>Velora</small>
        </span>
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
  // listeden gelen yarışın adı (yüklenirken yazılır)
  const preName = useStored(!data && id ? PRE_KEY(id) : "")?.name || "";
  if (!data) {
    return (
      <div className="lv">
        {gone || err ? <Sea /> : <div className="lv-sea lv-plain" aria-hidden="true" />}
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
            <LoadSkel name={preName} />
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
  // Başlat'la yarış kaydı açılır, start saati 0'da yazılır: geri sayım sürerken yarış henüz başlamadı (start dizisi şeridi görünür)
  const tm = data.timer;
  const preStart = isCur && !!sel && tm?.mode === "start" && (!tm.rid || tm.rid === sel.id) && ((tm.end != null && tm.end > nowMs) || tm.left != null) && (!sel.at || Date.parse(sel.at) > nowMs);
  const ongoing = isCur && sel && !sel.fin && !sel.void && !preStart;
  // Evre (lib/raceLive.js livePhase): bekleme (start saatine geri sayım) · yarış (sayaç ya da bugünkü start) · gün özeti
  const today = seeDay(data, nowMs);
  const phase = isCur ? livePhase({ plan: data.plan, starts, timer: data.timer, today, now: nowMs }) : "race";
  const hasVideo = isCur && ["live", "drone", "src", "rec", "boats"].includes(data.screen?.kind);
  const csel = phase === "race" ? sel : null;
  // sayaç başka grubun startını sayıyorsa (ekranda Sarı yarışta, Mavi geri sayımda) ekrandaki yarışın saati sayaçtan okunmaz
  const ctimer = phase === "race" && (!data.timer?.rid || !sel || data.timer.rid === sel.id) ? data.timer : null;
  const cs = clockState({ sel: csel, isCur, timer: ctimer, now: nowMs, entry, data, today });
  // Ortada büyük sayaç yalnız geri sayarken (start'a ya da ilk start'a) ve sayaç durdurulmuşken; sonra şeritte "Süre"
  const auto0 = isCur && phase !== "summary" ? autoCaption({ plan: data.plan, starts, timer: data.timer, rounds: data.rounds, now: nowMs, today }) : null;
  // Parkur: yarış öncesi (bekleme ya da start'a geri sayım) otomatik; açıkken arka plan bulanık (lv-bc.course)
  const counting = phase !== "summary" && ((cs.rem != null && cs.rem > 0) || cs.label === "Durdu");
  // geri sayımda "Start" / "Son dakika" alt yazısı yok: şeritteki saat bloğu zaten söylüyor (Seyhun 2026-11-02 örnek A)
  const auto = counting && auto0?.kind === "start" ? null : auto0;
  const hasSvg = (data.course?.obs || []).length > 0;
  // Genel sıralama yarışta sağda, alttan yukarı sabit alanda, kaydırılır (Seyhun 2026-11-02 "genel sıralama varsa sağ tarafta")
  const prog = isCur ? dayProgram(data, today) : [];
  // Yarış öncesi gösterim (parkur → rüzgâr → program); süren yarış varken yok (Seyhun 2026-11-02 "yarış başladığında gösterilmemeli")
  const pre = !ongoing && (phase === "wait" || (cs.rem != null && cs.rem > 0));
  // Senaryo 2 (Seyhun 2026-11-03 09:16 "ilk starta geri sayım ile start geri sayımı farklı olmalı"): yalnız start dizisi (Yayın sayacı start modunda); ilk starta geri sayım (1 saatten az, turuncu dahil) senaryo 1 düzeninde kalır; tehir, "yarış yok", süren yarış ve
  // yarın hariç. Videosuz StartHero, videolu NearBand; sıralama, çipler, kayan kartlar ve alt şerit yok
  // Start'tan sonra da aynı düzen (Seyhun 2026-11-03 "geri sayım bittiğinde gösterilen ekran diğerlerinden çok farklı olmasın"): sayaç
  // ileri sayar, sağdaki panel sıralama → parkur → rüzgâr → sıradaki
  const racing = !!(ongoing && phase === "race");
  // Start geri sayımı (Seyhun 2026-11-03 şerit onayı): Yayın sayacı start modunda sayarken "run"; dizide tehir "ap" (plan.ap.seq); son start
  // genel geri ise (30 dk içinde, yeni dizi başlayana kadar) "fs". Hepsi SeqHero / SeqBand
  const tSeq = (data.timer?.end != null || data.timer?.left != null) && data.timer?.mode === "start" && counting;
  const lastToday = starts.filter((x) => x.day === today).at(-1) || null;
  const fsLast = lastToday?.void === "Genel geri çağırma" && (!lastToday.fin || nowMs - Date.parse(lastToday.fin) < 30 * 60e3) ? lastToday : null;
  const st = data.plan.status;
  const seqMode = !isCur || phase === "summary" || ongoing ? "" : st === "ap" ? (data.plan.ap?.seq != null ? "ap" : "") : st === "none" || /Yarın/.test(cs.label) ? "" : tSeq ? "run" : fsLast ? "fs" : "";
  const near = isCur && phase !== "summary" && (!!seqMode || (racing && !["ap", "none"].includes(st) && !/Yarın/.test(cs.label)));
  // start'tan önce (geri sayımda) yok; Yayın › Video › Genel sıralama ya da sesle "geneli kaldır" ile kapanır (Seyhun 2026-11-02)
  // Senaryo 5 (Seyhun 2026-11-03): yarış bitti ya da abandone, sıradaki start henüz sayılmıyor → bekleme düzeni (WaitHero / SidePanel)
  const between = phase === "race" && isCur && !!sel && !!(sel.fin || sel.void) && !ongoing && !near && !counting;
  const fin = between && !sel.void ? sel : null;
  const ovOn = phase === "race" && isCur && !!sel && !pre && !near && !between && data.courseShow?.ov !== false;
  // Videolu yarış öncesi (Seyhun 2026-11-02 videolu/1-yaris-oncesi.png, 2-start-oncesi-turuncu.png onay): solda bulanık şeritte bilgiler,
  // turuncu bayrak çekiliyse "Start öncesi"; Yayın › Video › Sol bilgi ile kapanır. Açıkken gösterim kartları ve alt şerit yok
  const side = isCur && hasVideo && phase !== "summary" && (pre || between || !!seqMode || (ongoing && phase === "race")) && data.courseShow?.side !== false;
  const slide = !(phase === "wait" && !hasVideo) && !side && !near && !between ? slideOn({ data, sel, isCur, open: courseOpen, now: nowMs, phase, pre, prog }) : "";
  const cOn = slide === "course";
  // Yarış öncesi video yokken sade sayfa (Seyhun 2026-11-02 "geri sayım sayfası sade temiz"): ortada sayaç, altta program; şerit yok
  const hero = (phase === "wait" || between) && !hasVideo && !near;
  const hero2 = near && !hasVideo;
  // Yayın grafiği (Seyhun 2026-11-03 14:41): canlı görünümde videolu ve videosuz aynı düzen
  if (isCur) {
    const apDown = st !== "ap" && !!data.plan.warn && nowMs < Date.parse(data.plan.warn);
    const mode = phase === "summary" ? "summary" : seqMode ? "seq" : st === "ap" || apDown ? "ap" : racing ? "race" : between ? "between" : st === "none" && data.plan.day === today ? "none" : "wait";
    const sc = scPick({ data, sel, mode, hasVideo, now: nowMs, far: cs.rem == null || cs.rem > 600 });
    // sahnenin önceden seçilen videosu (Yayın › Ekran › sahne)
    const sd = { ...data, screen: sceneScreen(data.screen, data.courseShow, sc) };
    const vid = ["live", "drone", "src", "rec", "boats"].includes(sd.screen?.kind);
    return (
      <div className={`lv lv-bc lv-grx${vid ? " video" : ""}${vid && sd.screen?.pause ? " pause" : ""} ${phase}`}>
        <Backdrop data={sd} isCur={isCur} entry={entry} />
        <div className="lv-page lv-ov">
          <Sahne data={sd} sel={sel} entry={entry} cs={cs} prog={prog} today={today} now={nowMs} mode={mode} seqMode={seqMode} fsLast={fsLast} sc={sc} onFull={setFull} />
        </div>
        {demoOn ? <DemoBar ctl={demo.ctl} /> : null}
        {list ? <Races id={id} starts={starts} cur={data.cur} sel={sel} fleets={data.fleets} rounds={data.rounds} entries={data.entries} onClose={() => setList(false)} /> : null}
        {full ? <FullList kind={full} data={data} sel={sel} isCur={isCur} id={id} onClose={() => setFull("")} /> : null}
      </div>
    );
  }
  return (
    <div className={`lv lv-bc${ongoing && phase === "race" ? " has-live" : ""}${slide ? " course" : ""}${hasVideo ? " video" : ""}${counting ? " counting" : ""}${near ? " near" : ""}${hasVideo && data.screen?.pause ? " pause" : ""} ${phase}`}>
      <Backdrop data={data} isCur={isCur} entry={entry} />
      <div className="lv-page lv-ov">
        {/* Geri ve yarışın adı aynı satırda, bir kez (Seyhun 2026-11-03: iki yerde yazıyordu, hizalı değildi) */}
        <div className="lv-topl">
          <Link href="/canli" className="lv-back lv-backc" aria-label="Yarışlar">
            ‹
          </Link>
          {data.race?.name ? <span className="lv-rname">{data.race.name}</span> : null}
          {side && pre && !near ? <span className="lv-rsub">{["Yarış günü", dayText(today) ? `${wdText(today)} ${dayText(today)}` : "", data.race?.place].filter(Boolean).join(" · ")}</span> : null}
        </div>
        {ongoing && phase === "race" ? <LiveBadge sel={sel} data={data} /> : null}
        {near && !racing ? <TopRight data={data} today={today} /> : null}
        <div className="lv-left">
          {phase === "race" && !near && !between ? <RankPanel key="race" data={data} sel={sel} isCur={isCur} id={id} max={hasVideo ? 5 : RANK_MAX} onAll={() => setFull("race")} /> : null}
        </div>
        {ovOn ? <OverallSide data={data} n={hasVideo ? 6 : 10} /> : null}
        {/* Tekne takibi (Seyhun 2026-11-02): yarışta teknelerin konumu küçük haritada (Yayın › Dönüşler › Yayında harita) */}
        {phase === "race" && isCur && !side && !between && (!near || racing) ? <BoatMap boats={data.boats || []} course={data.course} groupOf={groupMap(groupsOn(data.groups, today))} grp={entry?.grp || ""} /> : null}
        {/* Yarış sürerken diğer yarışlar çip olarak gösterilmez (Seyhun 2026-11-03: ekrandaki yarış neyse o; sıradaki start alt şeritte) */}
        {(phase === "race" || (phase === "wait" && hasVideo)) && !side && !near && !between && !(ongoing && phase === "race") ? <ProgramChips items={prog} /> : null}
        {side && seqMode ? <SeqBand data={data} cs={cs} prog={prog} now={nowMs} entry={entry} mode={seqMode} last={fsLast} rid={sel?.id} /> : side && near ? <NearBand data={data} cs={cs} prog={prog} now={nowMs} entry={entry} racing={racing} sel={sel} id={id} onAll={() => setFull("race")} /> : side ? <SidePanel data={data} today={today} cs={cs} prog={prog} now={nowMs} entry={entry} fin={fin} /> : null}
        {hero2 && seqMode ? <SeqHero data={data} cs={cs} prog={prog} now={nowMs} entry={entry} mode={seqMode} last={fsLast} /> : null}
        {hero2 && !seqMode ? <StartHero data={data} cs={cs} prog={prog} now={nowMs} entry={entry} racing={racing} sel={sel} id={id} onAll={() => setFull("race")} /> : null}
        {hero ? <WaitHero data={data} today={today} cs={cs} prog={prog} now={nowMs} fin={fin} /> : null}
        {phase === "summary" ? hasVideo ? <DayEndBand data={data} today={today} now={nowMs} /> : <DayEndHero data={data} today={today} now={nowMs} /> : null}
        <CourseFloat data={data} sel={sel} isCur={isCur} show={cOn} phase={phase} onClose={() => setCourseOpen(false)} />
        <WindFloat data={data} sel={sel} isCur={isCur} show={slide === "wind"} now={nowMs} />
        <ProgFloat prog={prog} show={slide === "prog"} data={data} now={nowMs} />
        <div className={`lv-foot${hero || hero2 || side || (isCur && phase === "summary") ? " off" : ""}`}>
          <TitleLine data={data} isCur={isCur} id={id} starts={starts} onList={() => setList(true)} auto={auto} />
          {windOpen && (data.forecast?.rows || []).length ? (
            <button type="button" className="lv-p lv-windpop" onClick={() => setWindOpen(false)} aria-label="Grafiği kapat">
              <WindDay fc={data.forecast} now={nowMs} at={data.plan.at} mine={lastWind(data, sel, isCur).obs} />
            </button>
          ) : null}
          <InfoBar data={data} sel={sel} isCur={isCur} phase={phase} cs={cs} counting={counting} clockIn={counting && !hero} today={today} now={nowMs} hasSvg={hasSvg} prog={prog} onCourse={() => setCourseOpen((v) => !v)} onWind={() => setWindOpen((v) => !v)} />
        </div>
      </div>
      {demoOn ? <DemoBar ctl={demo.ctl} /> : null}
      {list ? <Races id={id} starts={starts} cur={data.cur} sel={sel} fleets={data.fleets} rounds={data.rounds} entries={data.entries} onClose={() => setList(false)} /> : null}
      {full ? <FullList kind={full} data={data} sel={sel} isCur={isCur} id={id} onClose={() => setFull("")} /> : null}
    </div>
  );
}
