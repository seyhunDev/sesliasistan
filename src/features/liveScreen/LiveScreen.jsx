"use client";

import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { liveUrl, sourcesOf, videoGroup } from "@/lib/raceCams";
import { srcIsLive } from "@/lib/srcLive";
import { momentRace, momentRaceName, apPlace, apSigId, apText, nextRaceNo, cleanPlan, daysUntil, orangeUp, raceDays, dirShort, livePhase, planLabel, planStartMs, raceName, raceTime, raceTitle, seqState, seqSteps, windByHour, windPoints, bestOffset, winLeft, FIN_WIN } from "@/lib/raceLive";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { CARD_IDS, CARD_TYPES, ORSA_M, cardFor, cardKey, cardType, cleanCards, cleanCourse, lineBias, selCard } from "@/lib/raceCourse";
import { cleanRoute, routeText, sceneSvg } from "@/lib/courseScene";
import { recTitle, windAhead, gapAt, leaderAt, manualFinish, markLabel, markName, nowPos, officialFor, prepName, rankMove, sameSail, clubName, shortClub, shortName, preStep, cleanCourseShow, EVRE_NAME, evreOf, evreScreen, itemScene, showPlan, showSlide, standings, whoBySail, whoOf, screenUrl, ytSrc, ytId, SRC_CATS, srcCat } from "@/lib/raceRounds";
import { VeloraGlyph } from "@/components/ui/AppLogo";
import { HourTable } from "@/features/weather/HourTable";
import { GROUP_PICK, catsOf, groupColor, groupMap, groupsOn, onlyCat, provisional } from "@/lib/roundScore";
import { colorOf as windColor } from "@/lib/windMap";
import { BoatMap } from "@/features/tracking/BoatMap";
import { BoatLive } from "@/features/tracking/BoatLive";
import { BoatCtl } from "@/features/tracking/BoatCtl";
import { fleetOf } from "@/lib/boatPlay";
import { useDemo } from "./demo";
import { useVisit } from "./useVisit";
import { dayProgram, expText, expWind } from "./program";
import { agendaView } from "@/lib/raceProgram";
import { autoCaption } from "@/lib/raceCaption";
import { flagSvg, signalOf, sigOnCard, soundText } from "@/lib/raceSignals";
import dynamic from "next/dynamic";
import { readWarmMe } from "@/lib/warmStart";
import { useInAppBack } from "./InAppBack";
import "./liveScreen.css";
import "./sahne.css";
import { BG_PHOTO } from "./bgPhoto";

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
// Uygulama içinde bu telefonun sayacı (Seyhun 2026-11-05 "başlatıyorum, yukarıdaki geri sayım daha geç başlıyor; kendi içimizde gecikmesiz"):
// Yayın / Start penceresi sayacı telefonda yazar (training/Countdown "sa-sayac"), buluta sonra gider. Bu yarışın sayacıysa ve buluttakinden eski
// değilse ekran onu kullanır; saat sunucu saatine çevrilir (skew). Herkese açık linkte hep buluttaki
const LOC_KEY = "sa-sayac";
const locSub = (f) => {
  window.addEventListener(LOC_KEY, f);
  window.addEventListener("storage", f);
  return () => (window.removeEventListener(LOC_KEY, f), window.removeEventListener("storage", f));
};
const locRaw = () => {
  try {
    return localStorage.getItem(LOC_KEY) || "";
  } catch {
    return "";
  }
};
function useLocalTimer(skew, id, on, remote) {
  const raw = useSyncExternalStore(locSub, locRaw, () => "");
  const k = skew.current || 0;
  return useMemo(() => {
    if (!on || !raw || !id) return null;
    let t = null;
    try {
      t = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!t || t.own !== `/athletes/races/${id}/yayin` || t.mode !== "start") return null;
    if ((remote?.at || 0) > (t.at || 0) + 5000) return null; // başka cihaz sonradan değiştirdi: buluttaki geçerli
    const sh = (x) => (typeof x === "number" ? x + k : x ?? null);
    return { ...remote, ...t, end: sh(t.end), zero: sh(t.zero), at: t.at };
  }, [raw, id, on, remote, k]);
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
// Zemin (Seyhun 2026-11-01 "koyuluktan açıklığa, yarış parkuru havası"): üstte açık deniz mavisi, altta koyu lacivert; arkada soluk bir
// parkur (şamandıralar, kesik rota, start hattı) ve dalga dokusu. Yazılar öne çıksın diye hepsi çok soluk.
// Zemin: açıktan koyuya deniz, çok soluk dalga deseni; parkur çizgisi kaldırıldı (Seyhun 2026-11-01 "dandik parkur gibi")
// Video yokken arkada soluk yarış fotoğrafı (Seyhun 2026-11-02 "video yoksa arkada güzel bir yarış fotoğrafı, soluk"); dosya yoksa
// yalnız deniz rengi kalır (CSS arka planı, kırık resim görünmez). Video gelince video, duraklatılınca da o video görünür.
// Seyhun 2026-11-02 seçti (sail-world.com Optimist fotoğrafı; sunucumuza indirilemedi, tarayıcı doğrudan oradan yükler)
// adres bgPhoto.js içinde (yarış detayının iPad arka planı da kullanır, bu büyük dosyayı yüklemeden)
export { BG_PHOTO };
// kendi ekranımın varsayılan arkası: aynı fotoğraf bulanık (Backdrop "ph:" + bulanık işareti)
const BG_DEF = `ph:${BG_PHOTO}#bulanik`;
// Yükleniyor (Seyhun 2026-11-03 "o loading tasarımı yanlış, daha doğru mantıkla"): eski iskelet (sahte sıralama paneli, CANLI rozeti) yarış
// başlamamışken yanlış bir ekran vaat ediyordu. Şimdi: düz zemin, sol üstte geri ve yarışın adı (listeden geldiyse hemen), üstte ince kayan
// çizgi; başka bir şey yok. Daha önce açıldıysa veri önbellekten anında gelir, bu ekran hiç görünmez.
function LoadSkel({ name = "" }) {
  const inApp = useInAppBack();
  return (
    <div className="lv-skel" role="status" aria-label="Yükleniyor">
      <i className="lv-loadline" />
      <div className="lv-topl">
        {inApp ? (
          <button type="button" className="lv-back lv-backc" aria-label="Geri" onClick={inApp}>
            ‹
          </button>
        ) : null}
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
export function Sea({ photo = "", blur = false }) {
  return (
    <div className={`lv-sea${photo ? " photo" : ""}${blur ? " blur" : ""}`} aria-hidden="true">
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
  const groups = sel?.n ? officialFor(data.fleets, sel.n, manualFinish(entry), sel.grp || entry.grp || "") : [];
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
            const off = officialFor(fleets, s.n, {}, s.grp || e.grp || "").length > 0;
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
// Canlı yayın yokken arka plan (Seyhun 2026-11-04 "her zaman canlı yayın yapamayacağım; arkada ne gösterelim"): bugünün kayıtları sırayla
// (yalnız bugünün), köşede "Tekrar"; kayıt da yoksa yarış yerinin fotoğrafı yavaşça yakınlaşır (Ken Burns)
const AUTO_MAX = 6;
const dayIst = (t) => {
  const ms = typeof t === "number" ? t : Date.parse(t || "");
  return Number.isFinite(ms) ? new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" }) : "";
};
function autoRecs(data, today) {
  const vids = (data.media || []).filter((m) => m.kind === "video" && m.url);
  // yalnız bugünün kayıtları (Seyhun 2026-11-06 "olması gereken neyse"): eski günlerin videoları canlı sanılmasın; bugün kayıt yoksa fotoğraf
  return vids.filter((m) => dayIst(m.at) === today).slice(-AUTO_MAX);
}
// ekranda canlı görüntü ya da elle seçilen kayıt yoksa (tekne haritası da değilse) kendiliğinden tekrar açılır mı
function autoOn(data, isCur, entry, today) {
  const scr = isCur ? data.screen || {} : {};
  if (scr.kind === "boats" || scr.kind === "rec") return false;
  // elle "Yayından çıkar / Ekrandan kaldır" dendiyse kayıtlar kendiliğinden sırayla oynamaz (Seyhun 2026-11-06 "listenin bitmesi bekleniyor, anında kesilsin")
  if (scr.off) return false;
  if (ytSrc(liveUrl(screenUrl(scr, data.stream), scr, data.stream, data.camBy, entry))) return false;
  return autoRecs(data, today).length > 0;
}
// Tekne konumunun canlı anı: bugün o grubun son startı (2026-11-06); yoksa oynatıcı klibi baştan oynatır
function boatStart(data, grp, today) {
  const st = (data.starts || []).filter((x) => x.day === today && x.at && !x.void && (!grp || x.grp === grp)).at(-1);
  const ms = st ? Date.parse(st.at) : NaN;
  return Number.isFinite(ms) ? ms : null;
}
function Backdrop({ data, isCur, entry, today = "", photo = "" }) {
  const scr = isCur ? data.screen || {} : {};
  // canlı yayın ya da drone; ekrandaki yarışın grubuna kamera bağlıysa o kamera (lib/raceCams.js)
  const yt = ytSrc(liveUrl(screenUrl(scr, data.stream), scr, data.stream, data.camBy, entry));
  const autos = autoOn(data, isCur, entry, today) ? autoRecs(data, today) : [];
  const [ai, setAi] = useState(0);
  const auto = autos.length ? autos[ai % autos.length] : null;
  const rec = scr.kind === "rec" ? (data.media || []).find((m) => m.id === scr.mid) : auto;
  const on = !!(yt || rec);
  const st = useFade(on, 900);
  const vref = useRef(null);
  const loop = auto ? autos.length < 2 : !!scr.loop;
  const key = yt ? `y:${yt}` : rec ? `r:${rec.id}:${loop ? 1 : 0}` : "";
  const [layers, setLayers] = useState([]); // {k, yt, rec, loop, s: "load" | "in" | "out"}
  const [seen, setSeen] = useState("");
  if (key !== seen) {
    setSeen(key);
    if (key) {
      const nl = { k: key, yt, rec, loop };
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
  if (photo) return <Sea photo={photo.replace(/#bulanik$/, "")} blur={photo.endsWith("#bulanik")} />; // kendi ekranımda seçtiğim arka plan fotoğrafı: yayın açılmaz
  return (
    <>
      {tani ? (
        <pre style={{ position: "fixed", left: 8, right: 8, top: 8, zIndex: 99, maxHeight: "60vh", overflow: "auto", background: "rgba(0,0,0,0.85)", color: "#9f9", font: "11px/1.4 monospace", padding: 8, borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
          {JSON.stringify({ isCur, screen: data.screen, raw: screenUrl(scr, data.stream), yt, rec: rec ? rec.id : null, on, st, layers: layers.map((l) => `${l.k}:${l.s}`), sources: (data.stream?.sources || []).map((x) => `${x.id} ${x.url}`), url: data.stream?.url, drone: data.stream?.drone, camBy: data.camBy, entry: entry ? { cls: entry.cls, grp: entry.grp } : null }, null, 1)}
        </pre>
      ) : null}
      <Sea photo={on ? "" : BG_PHOTO} />
      {/* Canlı tekne konumları (Seyhun 2026-11-03): Yayın › Video › Canlı konum; seçilen grup (yoksa ekrandaki yarışın grubu), renk listesindeki
          tekneler (şimdilik örnek izlerle, start anı, döngüde) */}
      {scr.kind === "boats" ? (
        <div className="lv-boats" aria-hidden="true">
          <BoatLive grp={scr.grp || entry?.grp || ""} course={data.course || null} fleet={fleetOf(data.entries, groupMap(groupsOn(data.groups, today)))} startAt={boatStart(data, scr.grp || entry?.grp || "", today)} ctl />
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
                  <video ref={l.s === "in" ? vref : undefined} src={l.rec.url} poster={l.rec.thumb || undefined} autoPlay muted playsInline loop={l.loop} onCanPlay={() => ready(l.k)} onEnded={auto && l.s === "in" ? () => setAi((i) => i + 1) : undefined} />
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

const whoMap = (data) => ({ ...whoBySail(data.fleets), ...Object.fromEntries((data.entries || []).map((r) => [r.sail, { name: r.name, club: r.club }])) });
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
// ---- Yayın tasarımı (Seyhun 2026-11-02 onay, project-files/samandira-donus/tasarim7) ----
const grpText = (g) => (g ? `${g} grup` : "");

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
// Erken start yapanlar (OCS, UFD, BFD): yelken no ve ad; yoksa boş
const EARLY = ["OCS", "UFD", "BFD"];
function earlyOf(data, rid) {
  const pen = (rid && data.rounds?.[rid]?.pen) || {};
  const who = { ...whoBySail(data.fleets), ...Object.fromEntries((data.entries || []).map((r) => [r.sail, { name: r.name, club: r.club }])) };
  return Object.entries(pen)
    .filter(([, c]) => EARLY.includes(c))
    .map(([sail, c]) => ({ sail, c, name: shortName(whoOf(who, sail)?.name || "") }));
}
// Tek panel: her 8 sn'de sıradaki bilgi kayarak gelir; altında noktalar hangisinde olduğunu gösterir
// Her panelin kendi süresi var: parkur animasyonu bir kez tamamlanana kadar kalır (Seyhun 2026-11-03 "parkur animasyonu tamamlanmadan
// geçiyor; bir kere tamamlansın"), saatlik tablo biraz daha uzun, diğerleri 8 sn
const SCENE_T = 12; // sn, courseSvg sailT
const wdText = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short" });
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
  const fresh = mine?.kn != null && mine.at && now - Date.parse(mine.at) < 3600e3;
  const c = curWind0(mine, fc, tr, fresh);
  if (!c) return null;
  // ölçülende sağanak yoksa (istasyon çoğu saat yazmaz) bu saatin tahmini sağanağı (Seyhun 2026-11-04 "asıl şiddet sağanakta")
  const fg = (fc?.rows || []).find((r) => r.hh === tr.toISOString().slice(11, 13))?.gust;
  return { ...c, fg: fg != null ? fg : null };
}
function curWind0(mine, fc, tr, fresh) {
  const so = (fc?.obs || []).filter((o) => o.wind != null).at(-1);
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
// sağanak yazısı: ölçülen varsa o, yoksa bu saatin tahmini; rüzgârdan büyük değilse yazılmaz
const gustText = (c) => (c?.gust != null && c.gust > (c.kn ?? 0) ? `sağanak ${c.gust} kn` : c?.fg != null && c.fg > (c.kn ?? 0) ? `tahmini sağanak ${c.fg} kn` : "");
// beklenen (tahmin) rüzgâr + sağanağı: "12 kn · sağanak 18"
const cap = (t) => (t ? t[0].toLocaleUpperCase("tr-TR") + t.slice(1) : t);
const expKn = (w) => (w?.kn != null ? `${w.kn} kn${w.gust != null && w.gust > w.kn ? ` · sağanak ${w.gust} kn` : ""}` : "");
const degText = (w) => (w?.range ? `${w.range[0]}–${w.range[1]}°` : w?.dir != null ? `${Math.round(w.dir)}°` : "");
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
  const g = sel?.n ? officialFor(data.fleets, sel.n, manualFinish(entry), sel.grp || entry.grp || "")[0] : null;
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
  let sg = null;
  if (at && /^\d\d:\d\d$/.test(at)) {
    const hf = +at.slice(0, 2) + +at.slice(3) / 60;
    const i = rows.findIndex((x, j) => !x.tm && +x.hh <= hf && (rows[j + 1] ? rows[j + 1].tm || +rows[j + 1].hh > hf : false));
    if (i >= 0) {
      const f = hf - +rows[i].hh;
      sx = xs(i) + (xs(i + 1) - xs(i)) * f;
      sk = Math.round((rows[i].wind + (rows[i + 1].wind - rows[i].wind) * f) * 10) / 10;
      // start'taki sağanak (Seyhun 2026-11-04 "asıl şiddet sağanakta")
      if (rows[i].gust != null && rows[i + 1].gust != null) sg = Math.round(rows[i].gust + (rows[i + 1].gust - rows[i].gust) * f);
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
          <text x={sx > W - 150 ? sx - 9 : sx + 9} y={ys(sk) - 9} textAnchor={sx > W - 150 ? "end" : "start"} fontSize="15" fill="#fff" style={{ ...fs, fontWeight: 800 }}>
            {`${String(sk).replace(".", ",")} kn`}
            {sg != null && sg > sk ? (
              <tspan fill="#ffd23f" fontSize="13">{` · sağanak ${sg} kn`}</tspan>
            ) : null}
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
const SC_RANK = 10;
const SC_ROUND_MS = 60e3; // şamandıra dönüşünden sonra ilk 3 bu kadar görünür
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
    return { k: cs.rem != null && cs.rem <= 60 ? "Son dakika" : "Start'a", tone: cs.rem != null && cs.rem <= 60 ? "o" : "", tm: cs.rem === 0 ? "Start" : cs.value, at: hm, who: gWho(e), fl: flag, pr: prep };
  }
  if (mode === "ap") {
    const apDown = plan.status !== "ap";
    const counting = !apDown && cs.label === "Tehir inişine";
    return { k: apDown ? "Tehir indi" : "Tehir", tone: "r", flag: "AP", tm: apDown ? "Start yakında" : counting ? cs.value : plan.ap?.why || "Belirsiz", tx: !counting, who: null, sub: apDown ? "Uyarı işareti bekleniyor" : [counting ? plan.ap?.why : "", apPlace(plan)].filter(Boolean).join(" · ") };
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
  return { k: orange ? "Turuncu bayrak · start hattı kuruldu" : kick, tone: orange ? "o" : "", orange, tm: cs.rem ? cs.value : first?.at ? "Start bekleniyor" : "Program bekleniyor", tx: !cs.rem, at: first?.at || "", who: gWho(first) };
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
        // sa: bütün yarışlar (Sonuçlar tablosu, PDF'teki gibi; sc ekran için son 8)
        return { p: r.rank || r.place || r.code || i + 1, sail: r.sail, name: r.name, club: r.club, cats, sc: (Array.isArray(r.r) ? r.r : []).slice(0, 8).map((v) => String(v ?? "")), sa: (Array.isArray(r.r) ? r.r : []).map((v) => String(v ?? "")), t: r.pts };
      });
      const hd = Array.isArray(f.heads) ? f.heads : [];
      return withCats({ cls: f.cls || "", tag: "Sonuç", races: Array.from({ length: Math.min(n, 8) }, (_, i) => i + 1), ra: Array.from({ length: n }, (_, i) => hd[i] || String(i + 1)), all, rows: all.slice(0, SC_RANK), total: f.rows.length });
    });
  let prov = [];
  try {
    prov = provisional({ starts: data.starts || [], rounds: data.rounds || {}, entries: data.entries || [], groups: data.groups || {}, who: whoBySail(data.fleets), year });
  } catch {
    prov = [];
  }
  return prov.map((f) => {
    const races = f.races.slice(-8);
    const scOf = (r, n) => (r.sc[n] ? r.sc[n].code || String(r.sc[n].pts) : "");
    return { cls: f.cls || "", tag: `Geçici · ${f.races.length} yarış`, races, ra: f.races.map(String), all: f.rows.map((r, i) => ({ p: r.rank || i + 1, sail: r.sail, name: r.name, club: r.club, cats: r.cats || [], sc: races.map((n) => scOf(r, n)), sa: f.races.map((n) => scOf(r, n)), t: r.total })), total: f.rows.length };
  }).map((b) => withCats({ ...b, rows: b.all.slice(0, SC_RANK) }));
}
// Sağ üst sütun (Seyhun 2026-11-04 "canlı yazısı sağ üstte, yanındaki saat kalksın; altında hangi yarış, geri sayım, bayrak, rüzgâr; sol üstte
// olmasın"): Canlı / Tekrar, start dizisinde ve yarışta altında yarışın kartı (Sc02 col), en altta grubun sporcuları / şamandıra dönüşü
// Diğer gruplar (Seyhun 2026-11-04 aynı anda üç grup: "seçili grup büyük, diğerleri küçük satır"): ekrandaki yarışın dışında bugün
// yarışta ya da start geri sayımında olan her grup bir satır: renk, grup · yarış, son dönülen şamandıra, süre (yarışta ileri, geri sayımda kalan)
const mmssOf = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
function otherGroups(data, sel, today, now) {
  const tm = data.timer;
  return (data.starts || [])
    .filter((x) => x.id !== sel?.id && x.day === today && !x.void && !x.fin)
    .map((x) => {
      const e = data.rounds?.[x.id] || {};
      const grp = x.grp || e.grp || "";
      const at = Date.parse(x.at);
      const paused = tm?.rid === x.id && tm.left != null;
      const seq = paused || at > now;
      const last = (e.route || []).reduce((a, _, k) => ((e.legs?.[k] || []).length ? k : a), -1);
      const where = !seq && last >= 0 ? markName(e.route[last]) : "";
      const time = paused ? mmssOf(Math.max(0, Math.round(tm.left))) : seq ? `−${mmssOf(Math.max(0, Math.ceil((at - now) / 1000)))}` : mmssOf(Math.max(0, Math.floor((now - at) / 1000)));
      return { id: x.id, grp, name: raceName(x), what: seq ? (paused ? "Start · durdu" : "Start") : where || "Yarışta", time, at };
    })
    .filter((x) => x.grp)
    .sort((a, b) => a.at - b.at)
    .concat(
      // tek gruba tehir (Seyhun 2026-11-04): tehirdeki grup da küçük satır, "Tehir · sebep", sağda AP
      [...new Map((data.plan?.order || []).filter((o) => o.ap && o.grp && o.grp !== (sel?.grp || data.rounds?.[sel?.id]?.grp)).map((o) => [o.grp, o])).values()].map((o) => ({ id: `ap-${o.grp}`, grp: o.grp, name: "Tehir", what: [o.ap.why, o.ap.land ? "Karada" : ""].filter(Boolean).join(" · ") || "Tehir", time: o.ap.land ? "AP/H" : "AP", at: Infinity }))
    )
    .slice(0, 4);
}
function ScOthers({ data, sel, today, now }) {
  const rows = otherGroups(data, sel, today, now);
  if (!rows.length) return null;
  return (
    <div className="sc-og">
      {rows.map((x) => (
        <div key={x.id}>
          <i style={{ background: groupColor(x.grp) || "rgba(255,255,255,.45)" }} aria-hidden="true" />
          <span>
            <b>{`${x.grp} · ${x.name}`}</b>
            <em>{x.what}</em>
          </span>
          <u>{x.time}</u>
        </div>
      ))}
    </div>
  );
}
// Sol alt sütun (Seyhun 2026-11-04 "sol alt köşeye; altta süre alanı, üstünde sıralama"): Canlı sağ üstte tek başına; sütunda en altta yarışın
// kartı, üstünde diğer gruplar ve grubun sporcuları / dönüş (sahne.css .sc-rcol column-reverse)
// Canlı rozetinin yanında görüntünün grubu (grp): drone ya da kamera bir gruba bağlıysa "Mavi grup"
function ScTop({ rep, on, grp = "", auto = false, card = null, logo = null, children }) {
  return (
    <>
      {/* sağ üst: Canlı (+ görüntünün grubu) ve hemen altında süre kartı (Seyhun 2026-11-04 "süre hepsi için geçerli, canlının altına") */}
      <div className="sc-tcol">
      {(on && (rep || auto || grp)) || logo ? (
        <div className="sc-tr">
          {/* uygulama içinde logo sağ üstte, Canlı altında; logoya dokununca geri (Seyhun 2026-11-06 "alttaki logoyu canlı kısmına al") */}
          {logo ? (
            <button type="button" className="sc-tlogo" aria-label="Geri" onClick={logo.back || undefined} disabled={!logo.back}>
              {/* kendi ekranımda canlı işareti yok (Seyhun 2026-11-06 "benim canlı yayın sekmemde yapmayalım") */}
              <VeloraGlyph size={40} />
              <small>Velora</small>
            </button>
          ) : null}
          {/* herkese açık ekranda "Canlı" yazısı yok: canlıyken alttaki Velora logosunun dairesi kırmızılaşıp beyazlaşır (sc-vl.live) */}
          {on && rep && !logo ? <span className="sc-live rep">Tekrar</span> : null}
          {on && !rep && auto && !grp ? <span className="sc-lgrp">Tekrar</span> : null}
          {on && !rep && grp ? (
            <span className="sc-lgrp">
              <i style={{ background: groupColor(grp) || "rgba(255,255,255,.6)" }} aria-hidden="true" />
              {`${grp} grup`}
            </span>
          ) : null}
        </div>
      ) : null}
      {card}
      </div>
      <div className="sc-rcol">{children}</div>
    </>
  );
}
// Tehir rozeti: sağ üstte Canlı + saatin altında; karada (dizi dışı) tehir bütün gruplar için, dizide çekildiyse o start
function ScAp({ t, plan, seq }) {
  const down = plan.status !== "ap";
  const counting = !down && !t.tx && /\d/.test(String(t.tm || ""));
  const why = plan.ap?.why || "";
  // çekilen tehir işareti (AP, AP üzeri H, AP üzeri 6…): bayrak düğmesindekiyle aynı bayraklar
  const s = signalOf(apSigId(plan));
  const line = down ? ["Start yakında", "Uyarı işareti bekleniyor"] : [s.hours ? "" : why || "Belirsiz", apPlace(plan), seq && t.who ? gWhat(t.who) || t.who.name : "Tüm gruplar"];
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
// kartta gösterilecek işaret (yoksa null)
function cardSig(data, today) {
  const sig = data.plan?.sig;
  const s = sig ? signalOf(sig.id) : null;
  if (!s || !sigOnCard(s)) return null;
  // tehir işaretleri (AP/H, AP 6 saat) saatin altındaki tehir rozetinde; tehir inince hiç gösterilmez
  if (s.kind === "ap" && !s.end) return null;
  if (new Date(Date.parse(sig.at) + 3 * 3600e3).toISOString().slice(0, 10) !== today) return null;
  return s;
}
function ScSig({ data, today, s: s0 = null }) {
  const s = s0 || cardSig(data, today);
  if (!s) return null;
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
  const gu = gustText(c);
  // elle ölçüm varken start'ta beklenen yazılmaz (Seyhun 2026-11-03 17:39: tahmin ile ölçüm çok farklı olabiliyor)
  const ew = c && big && data.plan?.at && !c?.man ? expWind(data.forecast, data.plan.at) : null;
  const ex = ew?.kn != null ? `start'ta ${expKn(ew)}` : "";
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
          {gu ? <div className="sc-gu">{cap(gu)}</div> : null}
          {ex ? <div className="sc-gx">{cap(ex)}</div> : null}
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
// Telefonda Rüzgâr (Seyhun 2026-11-05 "start bekleniyor yazısı aynı kalır, grafik aşağı doğru açılsın"): süre kartının altından açılan beklenen rüzgâr
function ScWindDrop({ data, now, at = "" }) {
  const rows = windAhead(data, now);
  if (rows.length < 2) return null;
  return (
    <div className="sc-ckx">
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
    </div>
  );
}
// Beklenen ve gerçekleşen rüzgâr (Seyhun 2026-11-06 "beklentiyi, yani grafiği ve gerçekleşeni de gösterelim; isteğe bağlı açalım"): kapalı gelir,
// dokununca bugünün saatleri: beklenen = tahmin (dolu alan), gerçekleşen = istasyon (beyaz çizgi) ve bizim ölçümlerimiz (mavi nokta), şimdi kesik çizgi
const istHour = (ms) => {
  const d = new Date(ms + 3 * 3600e3);
  return { day: d.toISOString().slice(0, 10), h: d.getUTCHours() + d.getUTCMinutes() / 60 };
};
// Tahminde önemli bir şey (Seyhun 2026-11-06 "ana sayfadaki gibi önemli bir şey varsa"): önümüzdeki 4 saatte rüzgâr 5 kn artar ya da azalırsa,
// 18 kn'u geçerse, sağanak 25 kn'u bulursa ya da yön 25° dönerse tek satır; yoksa tahmin hiç gösterilmez. Satıra dokununca grafik açılır.
function windTip(rows, c) {
  const nx = rows.slice(1, 5);
  if (!nx.length) return "";
  const base = c?.kn ?? rows[0].wind;
  const at = (r) => `${r.tm ? "Yarın " : ""}${r.hh}:00`;
  const up = nx.find((r) => r.wind >= base + 5 || (r.wind >= 18 && base < 18));
  if (up) return `${at(up)} rüzgâr ${up.wind} kn'a çıkıyor`;
  const gu = nx.find((r) => r.gust != null && r.gust >= 25 && !(c?.gust >= 25));
  if (gu) return `${at(gu)} sağanak ${gu.gust} kn`;
  const d0 = c?.dir ?? rows[0].dir;
  const tn = d0 == null ? null : nx.find((r) => r.dir != null && Math.abs(((r.dir - d0 + 540) % 360) - 180) >= 25);
  if (tn) {
    const d = ((tn.dir - d0 + 540) % 360) - 180;
    return `${at(tn)} rüzgâr ${Math.abs(Math.round(d))}° ${d > 0 ? "sağa" : "sola"} dönüyor (${dirShort(tn.dir)} ${Math.round(tn.dir)}°)`;
  }
  const dn = base >= 8 ? nx.find((r) => r.wind <= base - 5) : null;
  if (dn) return `${at(dn)} rüzgâr ${dn.wind} kn'a düşüyor`;
  return "";
}
// Tahmin tablosu (Seyhun 2026-11-06 "karma karışık; Windguru gibi gün gün, saat saat; yağmur burada mı çevrede mi nokta atışı"): uygulamanın
// ortak saat saat hava tablosu (HourTable; ana sayfa, hava sayfası, yarış havası aynı): bugün + yarın sütunları, gün adı ayırır, şimdiki saat
// çerçeveli, yağmur yarış yerinin mm'si, geçen saatlerde istasyonun ölçtüğü rüzgâr ayrı "Ölçülen" satırında, start saati çizgi.
const hourRows = (rows, day) =>
  (rows || []).filter((r) => r.wind != null).map((r) => ({ ...r, time: `${day}T${r.hh}:00`, day: +r.hh >= 7 && +r.hh <= 18 }));
function ScWindDay({ data, now }) {
  const [open, setOpen] = useState(false);
  const tip = windTip(windAhead(data, now), curWind(data, null, true, now));
  const today = istHour(now).day;
  const rows = hourRows(data.forecast?.rows, today);
  if (rows.length < 2) return null;
  const tom = new Date(Date.parse(`${today}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);
  const next = hourRows(data.forecast?.next, tom);
  const ah = windAhead(data, now).map((r) => r.wind);
  const calm = ah.length ? `Sonraki saatler ${Math.min(...ah)}–${Math.max(...ah)} kn` : "";
  const marks = data.plan?.at && data.plan?.day === today ? [{ at: data.plan.at, label: "Start" }] : [];
  return (
    <div className={`sc-wday${open ? " on" : ""}${tip ? "" : " calm"}`}>
      <button type="button" className="sc-wtg" aria-expanded={open} onClick={() => setOpen(!open)}>
        <i>Tahmin</i>
        <span>{tip || calm}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open ? (
        <div className="sc-wdb">
          <HourTable rows={rows} next={next.length ? next : null} date={today} obs={data.forecast?.obs || []} station={data.forecast?.station ? { name: data.forecast.station } : null} nowMs={now} marks={marks} flat />
        </div>
      ) : null}
    </div>
  );
}
// Parkur ve rüzgâr panelinin üstü (Seyhun 2026-11-06 "şu anki ölçümleri asıl göstermemiz lazım"; "önemli bilgiler daha net"): şimdi esen, büyük;
// yanında parkur sayıları bir kez (eksen, rüzgârın eksenden farkı, avantajlı uç); çizimde bu yazılar yok
function ScWindNow({ data, now, pk = null }) {
  const c = curWind(data, null, true, now);
  const ax = axisInfo(data);
  const g = ax ? null : guessAxis(data);
  const deg = ax ? ax.deg : g != null ? Math.round(g) : null;
  let bias = null;
  try {
    bias = lineBias(cleanCourse(data.course || {}));
  } catch {
    bias = null;
  }
  const sh = ax?.sh;
  const fx = [
    deg != null ? ["Eksen", `${deg}°`] : null,
    sh != null ? ["Fark", Math.abs(sh) < 1 ? "0°" : `${Math.abs(sh)}° ${sh > 0 ? "sağa" : "sola"}`] : null,
    bias?.end ? [bias.end === "pin" ? "Pin" : "Komite", `+${Math.round(bias.deg)}°`] : null,
  ].filter(Boolean);
  if (!c && !fx.length && !pk) return null;
  return (
    <div className={`sc-wnow${c?.man ? " man" : ""}`}>
      {c ? (
        <>
          <span className="ar">{gArrow(c.dir)}</span>
          <b>
            {c.kn}
            <small>kn</small>
          </b>
          <span className="tx">
            <strong>{dirText(c)}</strong>
            {gustText(c) ? <em>{cap(gustText(c))}</em> : null}
            <small>{c.by}</small>
          </span>
        </>
      ) : null}
      {fx.length || pk ? (
        <span className="fx">
          {fx.map(([k, v]) => (
            <span key={k}>
              <small>{k}</small>
              <b>{v}</b>
            </span>
          ))}
          {/* Parkur (Seyhun 2026-11-06 "yukarıda Eksen, Rüzgâr gibi parkur da; tıklayınca alan açılsın, seçeyim, kapansın") */}
          {pk ? (
            pk.onTap ? (
              <button type="button" className="pk" aria-expanded={pk.open} onClick={pk.onTap}>
                <small>Parkur</small>
                <b>{pk.name}</b>
              </button>
            ) : (
              <span>
                <small>Parkur</small>
                <b>{pk.name}</b>
              </span>
            )
          ) : null}
        </span>
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
      {gustText(c) ? <em>{gustText(c)}</em> : null}
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
// Bizim sporcular (Seyhun 2026-11-07 "bizim sporcularımız gruplarında en yukarıda"): kulübü Dikili olan
const isOur = (club) => /dikili/.test(String(club || "").toLocaleLowerCase("tr"));
// Gruplarda arama: ad, kulüp ya da yelken no; her kelime geçmeli
const grpHit = (x, q) => {
  const hay = [x.name, x.club, clubName(x.club), shortClub(x.club), x.sail].join(" ").toLocaleLowerCase("tr");
  return q.toLocaleLowerCase("tr").split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};
// Program paneli: Start (günün start sırası), Talimat (yarış talimatındaki program); yalnız dolu olan sekmeler. Gruplar Sporcular düğmesinde (ScAthPanel)
const PG_STATE = { done: "Bitti", now: "Yarışta", next: "Sıradaki" };
function ScProgPanel({ prog, ag }) {
  const tabs = [prog.length > 0 && ["st", "Start"], ag && ["ag", "Talimat"]].filter(Boolean);
  const [tab, setTab] = useState("");
  const on = tabs.some(([t]) => t === tab) ? tab : tabs[0]?.[0] || "";
  return (
    <div className="sc-pgl">
      <div className="sc-vph">
        <b>Program</b>
      </div>
      {tabs.length > 1 ? (
        <div className="sc-vtabs" role="tablist">
          {tabs.map(([t, n]) => (
            <button key={t} type="button" role="tab" aria-selected={on === t} className={on === t ? "on" : ""} onClick={() => setTab(t)}>
              {n}
            </button>
          ))}
        </div>
      ) : null}
      {on === "st" ? (
        <ul>
          {prog.map((x) => (
            <li key={x.key} className={x.state}>
              <span className="t">{x.at || "—"}</span>
              {x.grp ? <i style={{ background: groupColor(x.grp) || "#ffd23f" }} aria-hidden="true" /> : null}
              <b>{[x.grp, x.name].filter(Boolean).join(" · ")}</b>
              <small>{PG_STATE[x.state] || "Bekliyor"}</small>
            </li>
          ))}
        </ul>
      ) : on === "ag" ? (
        ag.mode === "day" ? (
          <ul>
            {ag.rows.map((x, i) => (
              <li key={i} className={x.state}>
                <span className="t">{x.at || "—"}</span>
                <b>{x.text}</b>
              </li>
            ))}
          </ul>
        ) : (
          ag.days.map((d) => (
            <Fragment key={d.day}>
              <p className="sc-pgd">{dayText(d.day)}</p>
              <ul>
                {d.rows.map((x, i) => (
                  <li key={i}>
                    <span className="t">{x.at || "—"}</span>
                    <b>{x.text}</b>
                  </li>
                ))}
              </ul>
            </Fragment>
          ))
        )
      ) : null}
    </div>
  );
}
// Sporcular (Seyhun 2026-11-09 "canlı sayfada sporcuların derecelerini ve o gün hangi grupta olduklarını görmek istiyorum"; Sıralama ve
// Gruplar tek düğme): sınıf sınıf genel sıra, yelken no, ad, kulüp, bugünkü grup, puan; sıralama yoksa kayıt listesi. Bizimkiler mavi.
// Grup rengi (Seyhun 2026-11-09 "yarın için açıklanan renk varsa açıklandığı zaman gösterelim"): açıklanmış en yeni günün grubu (bugün ya da sonrası)
function athGDay(data, day) {
  const all = data.groups || {};
  return Object.keys(all).filter((d) => d > day && Object.keys(groupMap(groupsOn(all, d))).length).sort().pop() || day;
}
// Kızlar / Junior / Bambino (Seyhun 2026-11-10 "kızları ayrı gösteriyorduk; bizim sporcuda kız varsa kızlardaki yeri gösterilmeli"):
// sporcunun kendi kategorisindeki yeri (onlyCat, yarış sayfasıyla aynı kural); hepsinde olan kategori (herkes Junior) yazılmaz
const KAT_IN = { Kız: "Kızlarda", Junior: "Juniorda", Bambino: "Bambinoda" };
const KAT_NAME = { Kız: "Kızlar", Junior: "Junior", Bambino: "Bambino" };
function athKat(b, sail) {
  return (b.catList || []).map((c) => {
    const x = onlyCat(b.all, c).find((y) => String(y.sail) === String(sail));
    return x ? { c, place: x.place } : null;
  }).filter(Boolean);
}
function scAth(data, day) {
  const gd = athGDay(data, day);
  const gm = groupMap(groupsOn(data.groups || {}, gd));
  const boards = scBoards(data);
  // son güncelleme: resmî sonuçta belgenin geliş anı (sınıf sınıf), geçicide son biten yarış
  const fat = new Map((data.fleets || []).map((f) => [f.cls || "", f.at || ""]));
  const fin = (data.starts || []).map((x) => x.fin || "").filter(Boolean).sort().pop() || "";
  const out = boards.map((b) => ({ cls: b.cls, at: (data.fleets || []).length ? fat.get(b.cls) || "" : fin, races: b.races, ra: b.ra || [], tag: b.tag || "", cats: b.catList || [], rows: b.all.map((r) => ({ p: r.p, sail: String(r.sail), name: r.name || "", club: r.club || "", sc: r.sc, sa: r.sa || r.sc, t: r.t ?? "", kat: athKat(b, r.sail) })) }));
  for (const e of data.entries || []) {
    const sail = String(e.sail || "");
    if (!sail) continue;
    let b = out.length === 1 && boards.length ? out[0] : out.find((x) => x.cls === (e.cls || ""));
    if (!b) out.push((b = { cls: e.cls || "", races: [], ra: [], cats: [], rows: [] }));
    if (!b.rows.some((r) => r.sail === sail)) b.rows.push({ p: "", sail, name: e.name || "", club: e.club || "", sc: [], sa: [], t: "", kat: [] });
  }
  return out
    .map((b) => ({ ...b, gd, rows: b.rows.map((r) => ({ ...r, g: gm[r.sail] || "", our: isOur(r.club) })) }))
    .map((b) => ({ ...b, rows: b.rows.filter((r) => r.p !== "").concat(b.rows.filter((r) => r.p === "").sort((x, y) => Number(x.sail) - Number(y.sail) || x.sail.localeCompare(y.sail))) }))
    .filter((b) => b.rows.length);
}
// sporcunun dereceleri gün gün (yeniden eskiye): yarış no → gün starts'tan, o günkü grubu günün listesinden
function athDays(data, b, r) {
  const by = new Map();
  b.races.forEach((n, i) => {
    const v = r.sc[i];
    if (!v) return;
    const st = (data.starts || []).find((s) => !s.void && s.n === n && (!s.cls || !b.cls || s.cls === b.cls));
    const day = st?.day || "";
    if (!by.has(day)) by.set(day, []);
    by.get(day).push({ n, v, g: day ? groupMap(groupsOn(data.groups || {}, day))[r.sail] || "" : "" });
  });
  return [...by.entries()].sort((x, y) => y[0].localeCompare(x[0])).map(([day, rows]) => ({ day, rows: rows.reverse() }));
}
const athDayName = (d, today) => (d === today ? "Bugün" : d === trDay(Date.parse(`${today}T12:00:00Z`) - 864e5) ? "Dün" : d === trDay(Date.parse(`${today}T12:00:00Z`) + 864e5) ? "Yarın" : dayText(d));
const GDot = ({ g }) => (g ? <i style={{ background: groupColor(g) || "#ffd23f" }} aria-hidden="true" /> : null);
const athAt = (at, today) => {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  const hm = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
  return `${trDay(d.getTime()) === today ? hm : `${dayText(trDay(d.getTime()))} ${hm}`} güncellendi`;
};
const athRank = (p) => (p ? `${p}${/^\d+$/.test(String(p)) ? "." : ""}` : "");
// Sonuçlar paneli (Seyhun 2026-11-09 örnek "sade liste" onaylandı, "sekme adı ve başlık Sonuçlar, yanında en son güncelleme ve +"): satırda sıra,
// ad, altında grup (açıklanmış en yeni gün; yarınki açıklanınca yalnız o) + yelken no + kulüp; sağda puan, altında yarış dereceleri
function ScAthPanel({ data, ath, day, onFull, res = false, onResult = null, resMsg = "" }) {
  const [ci, setCi] = useState(0);
  const [q, setQ] = useState("");
  const [f, setF] = useState(""); // "" hepsi, "our" bizimkiler, grup adı
  const [pick, setPick] = useState(null); // { cls, sail }
  const b = ath[Math.min(ci, ath.length - 1)];
  const head = (
    <>
      <div className="sc-vph">
        <b>Sonuçlar</b>
        {b ? <small>{[b.tag && b.tag !== "Sonuç" ? b.tag : b.ra?.length ? `${b.ra.length} yarış` : "", athAt(b.at, day)].filter(Boolean).join(" · ")}</small> : null}
        {onResult ? (
          <label className="sc-athadd" aria-label="Sonuç ekle">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
            <input type="file" accept="application/pdf,image/*" hidden onChange={(e) => (e.target.files?.[0] && onResult(e.target.files[0]), (e.target.value = ""))} />
          </label>
        ) : null}
      </div>
      {resMsg ? <p className="sc-athm">{resMsg}</p> : null}
    </>
  );
  if (!b)
    return (
      <div className="sc-ath">
        {head}
        <p className="sc-vno">Henüz sonuç yok</p>
      </div>
    );
  const pb = pick ? ath.find((x) => x.cls === pick.cls) : null;
  const pr = pb?.rows.find((x) => x.sail === pick.sail);
  if (pr) {
    const days = athDays(data, pb, pr);
    return (
      <div className="sc-ath one">
        <button type="button" className="sc-athb" onClick={() => setPick(null)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Sonuçlar
        </button>
        <h3 className={pr.our ? "our" : ""}>{pr.name || pr.sail}</h3>
        <p className="sc-athw">{[pr.sail, clubName(pr.club, 40), pb.cls].filter(Boolean).join(" · ")}</p>
        <ul className="sc-athkv">
          {pr.p ? <li><span>Genel sıra</span><b>{athRank(pr.p)}</b></li> : null}
          {(pr.kat || []).map((k) => <li key={k.c}><span>{KAT_IN[k.c] || k.c} sıra</span><b>{k.place}.</b></li>)}
          {pr.t !== "" ? <li><span>Puan</span><b>{pr.t}</b></li> : null}
          {pr.g ? <li><span>{athDayName(pb.gd, day)}</span><b><GDot g={pr.g} />{pr.g}</b></li> : null}
        </ul>
        {days.length ? (
          <>
            <p className="sc-athh">Dereceler</p>
            <ul className="sc-athkv">
              {days.flatMap((d) =>
                d.rows.map((x) => (
                  <li key={x.n}>
                    <span>{x.n}. yarış</span>
                    {d.day ? <small>{athDayName(d.day, day)}</small> : null}
                    <b>{x.v}</b>
                  </li>
                )),
              )}
            </ul>
          </>
        ) : null}
      </div>
    );
  }
  const ours = b.rows.filter((r) => r.our).length;
  const grs = [...new Set(b.rows.map((r) => r.g).filter(Boolean))].sort((x, y) => {
    const i = (g) => (GROUP_PICK.indexOf(g) < 0 ? 99 : GROUP_PICK.indexOf(g));
    return i(x) - i(y) || x.localeCompare(y, "tr");
  });
  const kats = b.cats || [];
  const fKat = f.startsWith("k:") && kats.includes(f.slice(2)) ? f.slice(2) : "";
  const fOn = fKat ? f : f === "our" ? (ours ? f : "") : grs.includes(f) ? f : "";
  // kategori seçiliyken sıra kendi içinde: Kızlar 1, 2, 3…
  const kp = (r) => (r.kat || []).find((k) => k.c === fKat)?.place;
  const rows = (fKat ? b.rows.filter((r) => kp(r)).map((r) => ({ ...r, p: kp(r) })).sort((x, y) => x.p - y.p) : b.rows).filter((r) => (fKat || !fOn || (fOn === "our" ? r.our : r.g === fOn)) && (!q.trim() || grpHit(r, q)));
  const hasP = b.rows.some((r) => r.p !== "");
  const gdName = athDayName(b.gd, day);
  return (
    <div className="sc-ath">
      {head}
      {ath.length > 1 ? (
        <div className="sc-vtabs" role="tablist">
          {ath.map((x, i) => (
            <button key={x.cls || i} type="button" role="tab" aria-selected={x === b} className={x === b ? "on" : ""} onClick={() => (setCi(i), setF(""))}>
              {x.cls || "Diğer"}
            </button>
          ))}
        </div>
      ) : null}
      <input className="sc-pgs" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara" aria-label="Sporcu ara" />
      {ours || grs.length || kats.length ? (
        <div className="sc-pgg">
          <button type="button" className={fOn === "" ? "on" : ""} aria-pressed={fOn === ""} onClick={() => setF("")}>
            Hepsi
          </button>
          {ours ? (
            <button type="button" className={fOn === "our" ? "on" : ""} aria-pressed={fOn === "our"} onClick={() => setF("our")}>
              Bizimkiler
            </button>
          ) : null}
          {kats.map((c) => (
            <button key={c} type="button" className={fOn === `k:${c}` ? "on" : ""} aria-pressed={fOn === `k:${c}`} onClick={() => setF(`k:${c}`)}>
              {KAT_NAME[c] || c}
            </button>
          ))}
          {grs.map((g) => (
            <button key={g} type="button" className={fOn === g ? "on" : ""} aria-pressed={fOn === g} onClick={() => setF(g)}>
              <GDot g={g} />
              {g}
            </button>
          ))}
        </div>
      ) : null}
      {rows.length ? (
        // Sonuç tablosu (Seyhun 2026-11-11 "geçici/kesin sonuç PDF'i formatında, daha ince, başlıklar olmadan; sadece sıralama"): Sıra, Grup,
        // No, Ad Soyad, Kulüp, yarışlar (atılan parantezde, soluk), Net; telefonda Grup ve Kulüp yok (grup adın yanında nokta), yarışlar kayar
        <div className="sc-atbw">
          <table className="sc-atb">
            <thead>
              <tr>
                {hasP ? <th>Sıra</th> : null}
                {grs.length ? <th className="w">{gdName === "Bugün" ? "Grup" : gdName}</th> : null}
                <th className="n">No</th>
                <th>Ad Soyad</th>
                <th className="w">Kulüp</th>
                {(b.ra || []).map((h, i) => <th key={i} className="n">{h}</th>)}
                {hasP ? <th className="n">Net</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sail} className={r.our ? "our" : ""} onClick={() => setPick({ cls: b.cls, sail: r.sail })}>
                  {hasP ? <td>{athRank(r.p)}</td> : null}
                  {grs.length ? <td className="w">{r.g ? <><GDot g={r.g} />{r.g}</> : ""}</td> : null}
                  <td className="n">{r.sail}</td>
                  <td className="nm">
                    {r.g ? <span className="pd"><GDot g={r.g} /></span> : null}
                    {r.name || r.sail}
                    {r.our && !fKat && r.kat?.length ? <em>{r.kat.map((k) => `${KAT_IN[k.c] || k.c} ${k.place}.`).join(" · ")}</em> : null}
                  </td>
                  <td className="w c">{clubName(r.club)}</td>
                  {(b.ra || []).map((_, i) => {
                    const v = (r.sa || [])[i] || "";
                    return <td key={i} className={`n${v.startsWith("(") ? " d" : ""}`}>{v}</td>;
                  })}
                  {hasP ? <td className="n nt">{r.t}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="sc-vno">Bulunamadı</p>
      )}
      {res ? (
        <button type="button" className="sc-vadd" onClick={() => onFull("race")}>
          Yarışın sonuçları
        </button>
      ) : null}
    </div>
  );
}
// Ekranda Bizimkiler kartı (Seyhun 2026-11-09 örnek onaylandı): bizim sporcuların genel sırası ve bugünkü grubu; dokununca Sporcular açılır
function ScOurs({ ath, onTap }) {
  const rows = ath.flatMap((b) => b.rows.filter((r) => r.our && r.p !== "")).slice(0, 5);
  if (!rows.length) return null;
  return (
    <button type="button" className="sc-ours" onClick={onTap}>
      <span className="h">Bizimkiler</span>
      {rows.map((r) => (
        <span key={r.sail} className="r">
          <b>{`${r.p}${/^\d+$/.test(String(r.p)) ? "." : ""}`}</b>
          {r.g ? <GDot g={r.g} /> : <i aria-hidden="true" />}
          <span>{r.name || r.sail}</span>
          <small>{r.t}</small>
        </span>
      ))}
    </button>
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
// Sol altta genel sıralamanın ilk 10'u (kartın sınıfı; yoksa ilk sınıf)
function ScGen({ data, who, now, onFull }) {
  const bs = scBoards(data);
  const b = bs.find((x) => who?.cls && x.cls === who.cls) || bs[0];
  if (!b?.all.length) return null;
  const cm = catMarks(b);
  const list = b.all.map((r) => ({ ...r, mk: cm.get(String(r.sail)) || [] }));
  const k = Math.floor(now / 1000 / SC_PAGE_S);
  const pg = scPaged(list, k, SC_TOP, SC_GEN, scCatPages(b));
  return (
    <button type="button" className="sc-rd" onClick={onFull ? () => onFull("all") : undefined}>
      <div className="sc-rdh">
        <span>{[b.cls || "Genel", "Genel sıra"].join(" · ")}</span>
        <span>{`${b.total} tekne`}</span>
      </div>
      <ScRows pg={pg} ranked />
    </button>
  );
}
// Sol alt liste satırları (Seyhun 2026-11-04 "ilk 5 hep sabit kalsın, alttakilerin animasyonu olsun; hep birlikte animasyon gözü bozuyor"):
// sayfa saati sahneden bağımsız (sahne değişince baştan başlamaz); ilk 5 hiç yeniden çizilmez; yalnız alttaki satırlar sayfa değişince sakin solarak gelir. Kulüp her satırda, yoksa "Kulüpsüz".
function ScRows({ pg, ranked }) {
  const { n, rows, top } = pg;
  return (
    <>
      <ol className="st">
        {rows.map((x, i) => {
          const low = n > 1 && i >= top;
          return (
            <li key={low ? `${pg.pg}-${i}-${x.sail}` : x.sail} className={`p${x.p ?? ""}${n > 1 && top && i === top ? " cut" : ""}${low ? " fl" : ""}`} style={low ? { animationDelay: `${(i - top) * 0.07}s` } : undefined}>
              {ranked ? <u>{x.p ?? ""}</u> : null}
              <b>{x.sail}</b>
              <em>{shortName(x.name) || ""}</em>
              <ScMk mk={x.mk} />
              <i className={`cl${shortClub(x.club) ? "" : " no"}`}>{shortClub(x.club) || "Kulüpsüz"}</i>
            </li>
          );
        })}
      </ol>
      {n > 1 ? (
        <div className="sc-rdm sc-rdp">
          <span>{pg.sub ? `${pg.sub} · ilk ${pg.ilk}` : `${pg.from}–${pg.to}`}</span>
          <ScPgs n={n} pg={pg.pg} k={pg.k} />
        </div>
      ) : null}
    </>
  );
}
// Kategori sayfaları (Seyhun 2026-11-04 "kızlar varsa kız ilk 5'i de görmek istiyorum"): ilk 5 genel sabit kalır, altta kızların ilk 5'i (K1–K5).
// catList'te olmayan kategori (herkes Junior) gösterilmez. only: yalnız bu yelkenler (grup listesi)
function scCatPages(b, only) {
  return (b?.catList || [])
    .map((c) => ({ sub: c === "Kız" ? "Kızlar" : c, rows: onlyCat(b.all, c).filter((x) => !only || only.has(String(x.sail))).slice(0, SC_TOP).map((x) => ({ ...x, p: `${c[0]}${x.place}`, mk: [] })) }))
    .filter((x) => x.rows.length);
}
// Genel sayfalar (ilk 5 sabit + akanlar) ardından kategori sayfaları
function scPaged(list, k, top, size, cats = []) {
  const n0 = scPages(list.length, top, size);
  const n = n0 + cats.length;
  const i = ((k % n) + n) % n;
  if (i < n0) return { ...scPageOf(list, i, top, size), n, pg: i, k, top: n > 1 ? top : 0, sub: "" };
  // ilk 5'teki kızlar zaten orada (çipte K1); altta kalan kızlar K sırasıyla, böylece kızların ilk 5'i birlikte görünür
  const c = cats[i - n0];
  const up = new Set(list.slice(0, top).map((x) => String(x.sail)));
  const rest = c.rows.filter((x) => !up.has(String(x.sail))).slice(0, Math.max(1, size - top));
  return { n, pg: i, k, top, rows: [...list.slice(0, top), ...rest], sub: c.sub, ilk: c.rows.length };
}
// kategori derecesi çipi (K3)
const ScMk = ({ mk }) =>
  mk?.length ? (
    <s className="mk">
      {mk.map((m) => (
        <span key={m} className={m[0] === "K" ? "k" : ""}>
          {m}
        </span>
      ))}
    </s>
  ) : null;
// Grup etiketi (süre kartıyla aynı renk)
function ScGrp({ g }) {
  if (!g) return null;
  const c = groupColor(g) || "#ffd23f";
  return (
    <b className="sc-ckg" style={{ background: c, color: inkOn(c) }}>
      {g}
    </b>
  );
}
function ScFleet({ data, sel, mode, now, who, today, onFull }) {
  const rd = mode === "race" ? scRound(data, sel) : null;
  if (rd) {
    const fresh = rd.t && now - rd.t < SC_ROUND_MS;
    return (
      <button type="button" className="sc-rd" onClick={onFull ? () => onFull("race") : undefined}>
        <div className="sc-rdh">
          <span>
            <ScGrp g={who?.grp} />
            {fresh ? `${rd.head} · az önce` : rd.head}
          </span>
          <span>{rd.tag || "Dönüş"}</span>
        </div>
        <ol>
          {rd.rows.slice(0, SC_FLEET_MAX).map((r, i) => (
            <li key={`${r.sail}${i}`}>
              <u>{r.p}</u>
              <b>{r.sail}</b>
              <em>{r.gap || r.name}</em>
            </li>
          ))}
        </ol>
        {rd.n > Math.min(rd.rows.length, SC_FLEET_MAX) ? <div className="sc-rdm">{`+${rd.n - Math.min(rd.rows.length, SC_FLEET_MAX)} tekne`}</div> : null}
      </button>
    );
  }
  return <ScGroup data={data} who={who} today={today} now={now} />;
}
// Grubun sporcuları (Seyhun 2026-11-04 "genel sıralamadaki derecesi de gösterilmeli; ilk beş sabit, sonrakiler ileriye doğru; sıralama yoksa
// baştan itibaren sırayla, tüm tekneler"): 03 genel sıralamayla aynı sayfa mantığı (scPageOf, ScPgs)
// kız / Junior / Bambino sporcunun kendi kategorisindeki derecesi: yelken → "K3" (hepsinde olan kategori catList'te yok, yazılmaz)
function catMarks(b) {
  const m = new Map();
  for (const c of b?.catList || []) for (const x of onlyCat(b.all, c)) m.set(String(x.sail), [...(m.get(String(x.sail)) || []), `${c[0]}${x.place}`]);
  return m;
}
function scGroupRows(data, who, today) {
  const boats = scBoats(data, who, today);
  if (!boats.length) return { list: [], ranked: false };
  const bs = scBoards(data);
  const b = bs.find((x) => who?.cls && x.cls === who.cls) || (bs.length === 1 ? bs[0] : null);
  const rk = new Map((b?.all || []).map((r) => [String(r.sail), r.p]));
  const cm = catMarks(b);
  const list = boats.map((x) => ({ ...x, p: rk.get(String(x.sail)) ?? null, mk: cm.get(String(x.sail)) || [] }));
  const ranked = list.some((x) => x.p != null);
  if (ranked) list.sort((a, c) => (a.p == null) - (c.p == null) || (Number(a.p) || 0) - (Number(c.p) || 0) || Number(a.sail) - Number(c.sail));
  return { list, ranked, cats: scCatPages(b, new Set(list.map((x) => String(x.sail)))) };
}
// Sağ sütunda üstte yarışın kartı varken yer azalır: sayfa boyu sütuna sığan satır sayısı kadar (ölçülür), ilk 5 yine sabit
function ScGroup({ data, who, today, now, slim = false }) {
  const [fit, setFit] = useState(SC_PAGE);
  const ref = useRef(null);
  const { list, ranked, cats } = scGroupRows(data, who, today);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const col = el.parentElement;
      const li = el.querySelector("li");
      if (!col || !li || getComputedStyle(col).display === "contents") return setFit(SC_PAGE);
      const used = [...col.children].filter((c) => c !== el).reduce((a, c) => a + c.getBoundingClientRect().height, 0);
      const gap = parseFloat(getComputedStyle(col).rowGap) || 0;
      const room = (col.parentElement?.clientHeight || 0) - 12 * (parseFloat(getComputedStyle(col).fontSize) || 16); // .sc-rcol max-height: 100% - 12em (sahne.css hafif panel)
      const head = [...el.children].filter((c) => c.tagName !== "OL").reduce((a, c) => a + c.getBoundingClientRect().height, 0) + (el.querySelector(".sc-rdp") ? 0 : 2.2 * (parseFloat(getComputedStyle(el).fontSize) || 16)); // başlık + sayfa satırı
      const rows = Math.floor((room - used - gap * (col.children.length - 1) - head - (parseFloat(getComputedStyle(el).marginTop) || 0)) / li.getBoundingClientRect().height);
      setFit(Math.max(SC_TOP + 2, Math.min(SC_FLEET_MAX, rows || SC_FLEET_MAX)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el.parentElement?.parentElement || el);
    return () => ro.disconnect();
  }, [list.length]);
  useEdge(ref, "--bx-l", (r) => r.right, slim);
  useEdge(ref, "--bx-b", (r) => window.innerHeight - r.top, slim);
  if (!list.length) return null;
  const top = ranked ? SC_TOP : 0;
  const k = Math.floor(now / 1000 / SC_PAGE_S);
  const pg = scPaged(list, k, top, slim ? Math.min(fit, SC_SLIM) : fit, ranked ? cats : []);
  return (
    <div className={`sc-rd${slim ? " slim" : ""}`} ref={ref} data-pg={k}>
      <div className="sc-rdh">
        <span>
          <ScGrp g={who?.grp} />
          {ranked ? "Genel sıra" : who?.grp ? "Tekneler" : who?.cls || "Tekneler"}
        </span>
        <span>{`${list.length} tekne`}</span>
      </div>
      <ScRows pg={pg} ranked={ranked} />
    </div>
  );
}
// 01: ortada tek kart; Süre · Program · Rüzgâr sırayla (start dizisi, tehir, abandone ve genel geride yalnız Süre)
function Sc01({ t, data, prog, now, today, lock, ap = false, only = "" }) {
  // Genel sıralama artık burada sekme değil, ayrıntılı 03 sahnesi araya girer (Seyhun 2026-11-04 "sıralamayı daha detaylı, uzun liste").
  // Tehirde Süre sekmesi yalnız tehir inişi sayılırken; tehir saatin altındaki rozette (ScAp)
  // only: Yayın › Ekran'da evreye atanan öğe (Süre, Program ya da Rüzgâr); sıra Yayın'da, kart kendi içinde dönmez
  const have0 = only ? [only] : [ap && t.tx ? "" : "time", prog.some((x) => x.state !== "done") ? "prog" : "", curWind(data, null, true, now) || windAhead(data, now).length >= 2 ? "wind" : ""].filter(Boolean);
  const have = have0.length ? have0 : ["time"];
  const k = only || (lock ? "time" : have[Math.floor(now / 1000 / SC_TAB) % have.length]);
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
// Süre kartı, sade (Seyhun 2026-11-04 "daha minimal; ilk starta yazısına gerek yok; geri sayım olduğunu hissettirelim, ileri geri farklı"):
// üstte tek satır yarış · sınıf · grup · start saati; büyük süre önünde − (geri) ya da + (ileri), geri sayım sarı-turuncu değil mavi tonda,
// ileri beyaz; altında dakikanın saniyeleri ince çubuk (geride erir, ileride dolar); bayrak, erken çıkan, işaret, rüzgâr birer satır
const SC_CK0 = new Map(); // geri sayımın bu ekranda ilk görülen kalan süresi (start başına; kart yeniden kurulunca kaybolmasın)
const SC_WIND = 20; // sn: rüzgâr bu kadar saniyede bir açılır
const SC_WON = 6; // sn: açık kalır
// Açılıp kapanan satır (Seyhun 2026-11-06 "her şeyi aynı anda göstermek zorunda değiliz; açılır kapanır olsun, animasyonlar güzel"):
// on olunca yukarıdan açılır, kapanırken son içeriği gösterir (useLast), boyu sıfıra iner
function ScXp({ on, children }) {
  return (
    <div className={`sc-xp${on ? " on" : ""}`} aria-hidden={on ? undefined : true}>
      <div>{children}</div>
    </div>
  );
}
// son dolu değer (satır kapanırken içi boşalmasın); değer içeriğine göre karşılaştırılır
function useLast(v) {
  const k = v == null ? null : JSON.stringify(v);
  const [st, setSt] = useState({ k, v });
  if (k != null && k !== st.k) setSt({ k, v });
  return v ?? st.v;
}
// kartın evresi: üstteki etiket ve renk (Seyhun 2026-11-06 "yarış öncesi, start öncesi, start sırası, starttan sonra, tehir, abandone… her birine göre")
function ckEvre(t, mode, fw, rem) {
  if (mode === "summary") return ["Gün bitti", ""];
  if (mode === "none") return null;
  if (t.flag === "FS") return ["Genel geri", "r"];
  if (mode === "ap" || t.flag === "AP") return ["Tehir", "r"];
  if (t.tone === "r") return ["Abandone", "r"];
  if (mode === "seq") return ["Start dizisi", "b"];
  if (mode === "race") return fw != null ? ["Finiş", "o"] : ["Yarışta", ""];
  if (mode === "between") return ["Bitti", ""];
  if (t.orange || (rem != null && rem <= 600)) return ["Start öncesi", "o"];
  return ["Yarış öncesi", ""];
}
// Süre kartı (Seyhun 2026-11-05/06, örnek /mnt/project-files/sure-gostergesi/evreler-ornek.html): kutusuz, sol üst köşeden içeri silinen gölge;
// üstte evre etiketi + grup · sınıf · yarış; büyük süre, yanında start saati; start dizisinde 5 · 4 · 1 · 0 basamakları; bayrak, erken çıkan,
// işaret, finiş penceresi gerekince açılır; rüzgâr, sıradaki, son dönüş tek satırda sırayla döner
function ScClock({ t, data, sel, mode, now, today, noWind = false, drop = null }) {
  const ea = mode === "race" && sel && now - Date.parse(sel.at) < 15 * 60e3 ? earlyOf(data, sel.id) : [];
  const num = !t.tx && /^\d{1,2}(:\d\d){1,2}$/.test(String(t.tm || ""));
  const up = mode === "race" || mode === "between";
  // geri sayım çubuğu sayacın tamamına göre erir: start dizisinde dizinin süresi, beklerken bu ekranın o start'a saymaya başladığı an
  const rem = num ? String(t.tm).split(":").reduce((a, x) => a * 60 + Number(x), 0) : null;
  const tk = `${t.at || ""}|${t.who?.cls || ""}|${t.who?.grp || ""}`;
  if (rem != null && !up && mode !== "seq" && !(SC_CK0.get(tk) >= rem)) SC_CK0.set(tk, rem);
  const dur = data.timer?.dur || 300;
  const tot = rem == null || up ? 0 : mode === "seq" ? Math.max(rem, dur) : SC_CK0.get(tk) || rem;
  const g = t.who?.grp || "";
  const gc = g ? groupColor(g) || "#ffd23f" : "";
  // kartın boyu sahneye yazılır (--sc-ckh): altındaki paneller (genel sıralama, parkur) onun altından başlar
  const ref = useRef(null);
  useEdge(ref, "--bx-t", (r) => r.bottom);
  useLayoutEffect(() => {
    const el = ref.current;
    const sc = el?.closest(".sc");
    if (!el || !sc) return undefined;
    const set = () => sc.style.setProperty("--sc-ckh", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    set();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(set) : null;
    ro?.observe(el);
    return () => {
      ro?.disconnect();
      sc.style.removeProperty("--sc-ckh");
    };
  }, []);
  const fw = mode === "race" && sel ? winLeft(sel, now) : null;
  const ev = ckEvre(t, mode, fw, up ? null : rem);
  const seq = mode === "seq" && num && dur >= 290 && dur <= 310; // 5 dakikalık dizi: basamaklı
  const st = seq ? (rem > 240 ? 0 : rem > 60 ? 1 : rem > 0 ? 2 : 3) : -1;
  const lfill = seq ? [(dur - rem) / (dur - 240), (240 - rem) / 180, (60 - rem) / 60, 1][st] : 0;
  const prep = t.pr || t.fl?.kind || "";
  const go = mode === "seq" && !num && /^start$/i.test(String(t.tm || ""));
  const sig = cardSig(data, today);
  const fwL = useLast(fw);
  const flL = useLast(t.fl && !seq ? t.fl : null);
  const eaL = useLast(ea.length ? ea.map((x) => ({ c: x.c, sail: x.sail })) : null);
  const sigL = useLast(sig ? sig.id || sig.short : null);
  // rüzgâr ara sıra açılır (Seyhun 2026-11-06 "rüzgâr zaten ara sıra açılıp gösterilsin"): SC_WIND sn'de bir SC_WON sn; dizide hiç
  const wl = noWind && !drop ? null : curWind(data, null, true, now);
  const wOn = !!wl && mode !== "seq" && !go && (now / 1000) % SC_WIND >= SC_WIND - SC_WON;
  const red = ev?.[1] === "r";
  const redL = useLast(red && t.flag ? { f: t.flag, n: ev[0] } : null);
  const tick = mode === "seq" && rem != null && rem <= 10 && rem > 0;
  return (
    <div ref={ref} className={`sc-ck ${up ? "up" : "dn"}${t.tone ? ` ${t.tone}` : ""}${red ? " red" : ""}`}>
      <div className="sc-ckm">
        {g && mode !== "summary" ? <span className="sc-ckgb" style={{ background: gc, color: gc }} aria-label={`${g} grup`} /> : null}
        <div key={num ? `n${up}` : String(t.tm)} className={`sc-ckt${num ? "" : " tx"}`}>
          {num ? <i aria-hidden="true">{up ? "+" : "−"}</i> : null}
          <b key={tick ? t.tm : "b"} className={tick ? "tk" : ""}>{t.tm}</b>
          {t.un ? <small>{t.un}</small> : null}
          {go ? <span className="sc-go" aria-hidden="true" /> : null}
        </div>
      </div>
      {seq ? (
        <div className="sc-lad" aria-hidden="true">
          {["cls", prep, prep, ""].map((f, i) => (
            <div key={i} className={i < st ? "done" : i === st ? "now" : ""}>
              {f ? <Flag kind={f} cls={t.who?.cls} grp={f === "cls" ? g : ""} down={i === 2} /> : <i className="sc-ladgo" />}
              <s style={i === st ? { width: `${Math.max(0, Math.min(1, lfill)) * 100}%` } : undefined} />
            </div>
          ))}
        </div>
      ) : tot > 0 ? (
        <div className="sc-ckb" aria-hidden="true">
          <u style={{ width: `${Math.min(100, (rem / tot) * 100)}%` }} />
        </div>
      ) : null}
      <ScXp on={fw != null}>
        <div className="sc-ckf">
          <span>Finiş penceresi</span>
          <b>{fwL != null ? `${Math.floor(fwL / 60)}:${String(fwL % 60).padStart(2, "0")}` : ""}</b>
          <i aria-hidden="true">
            <u style={{ width: `${Math.min(100, ((fwL || 0) / (FIN_WIN * 60)) * 100)}%` }} />
          </i>
        </div>
      </ScXp>
      <ScXp on={!!t.fl && !seq}>
        {flL ? (
          <div className="sc-fl">
            <Flag kind={flL.kind} down={flL.down} />
            <b>{flL.t}</b>
          </div>
        ) : null}
      </ScXp>
      <ScXp on={!!t.orange && !seq}>
        <div className="sc-fl">
          <i className="sc-of" aria-hidden="true" />
          <b>Turuncu bayrak</b>
        </div>
      </ScXp>
      <ScXp on={ea.length > 0}>
        {eaL ? (
          <div className="sc-ocs">
            <b>{eaL[0].c}</b>
            <span>{eaL.map((x) => `TUR ${x.sail}`).join(" · ")}</span>
          </div>
        ) : null}
      </ScXp>
      <ScXp on={!!sig}>{sigL ? <ScSig data={data} today={today} s={sig || signalOf(sigL)} /> : null}</ScXp>
      <ScXp on={red && !!t.flag}>
        {redL ? (
          <div className="sc-fl">
            <Flag kind={redL.f} />
            <b>{redL.n}</b>
          </div>
        ) : null}
      </ScXp>
      <ScXp on={wOn}>{wl ? <ScWindLine data={data} now={now} /> : null}</ScXp>
      {drop}
    </div>
  );
}
// col: kart sağ üst sütunda, Canlı'nın altında (start dizisi ve yarış)
function Sc02({ t, data, sel, mode, now, today, col = false }) {
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
      <div className={`sc-c2${col ? " col" : ""}`}>
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
const SC_SLIM = 8; // canlı konum haritası arkadayken grup listesi en çok bu kadar satır, dar (Seyhun 2026-11-05 "haritayı kapatıyor")
const SC_FLEET_MAX = 8; // sağ sütundaki grup listesi en çok bu kadar satır (Seyhun 2026-11-04 "göz yoruyor, arka planı kapatıyor")
const SC_PAGE_S = 8;
const scPages = (len, top = SC_TOP, size = SC_PAGE) => (len <= size ? 1 : Math.ceil((len - top) / (size - top)));
// Bir panelin ekrandaki yerini sayfaya yazar (canlı konum haritası panellerin arasındaki boş alana sığsın): .lv üstünde CSS değişkeni
function useEdge(ref, name, pick, on = true) {
  useLayoutEffect(() => {
    const el = ref.current;
    const lv = el?.closest(".lv");
    if (!on || !el || !lv) return undefined;
    const set = () => lv.style.setProperty(name, `${Math.round(pick(el.getBoundingClientRect()))}px`);
    set();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(set) : null;
    ro?.observe(el);
    window.addEventListener("resize", set);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", set);
      lv.style.removeProperty(name);
    };
  }, [on]);
}
// Sayfalı liste (03 genel sıralama ve sağdaki grup listesi aynı mantık): sıralama varsa ilk `top` (5) sabit + 6'şar akan,
// sıralama yoksa top = 0, baştan 11'er; hiçbir tekne atlanmaz. from/to ekranda "6–11" yazısı için.
function scPageOf(list, pg, top = SC_TOP, size = SC_PAGE) {
  const n = scPages(list.length, top, size);
  const step = size - top;
  if (n <= 1) return { n, rows: list.slice(0, size), from: 1, to: Math.min(list.length, size) };
  const p = ((pg % n) + n) % n;
  return { n, pg: p, rows: [...list.slice(0, top), ...list.slice(top + p * step, top + (p + 1) * step)], from: top + p * step + 1, to: Math.min(list.length, top + (p + 1) * step) };
}
// Sayfa çizgileri: dolan çizgi o sayfanın süresi
function ScPgs({ n, pg, k }) {
  return (
    <span className="sc-pgs">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={i === pg ? "on" : ""}>
          {i === pg ? <u key={k} style={{ animationDuration: `${SC_PAGE_S}s` }} /> : null}
        </i>
      ))}
    </span>
  );
}
// Genel sıralama sahnesi yalnız ilk 10 (Seyhun 2026-11-04 "genel sıralamada ilk 10 gösterilmeli"); tamamı dokununca (Tümü)
const SC_GEN = 10;
const SC_VIEW_S = 15; // izleyicinin Sıralama sekmesinde Oto açıksa sekme değişimi (sn)
function sc03Slides(data, sel, mode) {
  const rr = mode === "between" && sel?.fin ? raceRows(data, sel) : null;
  const out = rr?.rows.length ? [{ rr }] : [];
  for (const b of scBoards(data)) {
    out.push({ b, pg: 0, n: 1 });
    // kategori sayfası: kızlar (Junior, Bambino) kendi içinde ilk 10
    for (const cat of b.catList) out.push({ b, pg: 0, n: 1, cat });
  }
  return out;
}
const sc03Len = (data, sel, mode) => Math.max(15, sc03Slides(data, sel, mode).length * SC_PAGE_S);
function Sc03({ data, sel, mode, now, onFull, ctl = null }) {
  const [t0] = useState(now);
  const all = sc03Slides(data, sel, mode);
  // izleyici açtıysa (telefon › Sıralama): yarış sonucu sayfası yok, sekmeler (Genel, Kızlar…) elle ya da Oto ile; liste tam, kaydırılır
  const slides = ctl ? all.filter((x) => !x.rr) : all;
  if (!slides.length) return null;
  const k = ctl && !ctl.auto ? Math.min(ctl.tab, slides.length - 1) : Math.floor(Math.max(0, now - t0) / 1000 / (ctl ? SC_VIEW_S : SC_PAGE_S));
  const cur = slides[k % slides.length];
  if (cur.rr) {
    const rr = cur.rr;
    return (
      <button type="button" className="sc-board" onClick={onFull ? () => onFull("race") : undefined}>
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
  const { b, cat } = cur;
  const inCat = cat ? onlyCat(b.all, cat) : null;
  const lim = ctl ? Infinity : SC_GEN;
  const rows = cat ? inCat.slice(0, lim).map((r) => ({ ...r, p: r.place })) : b.all.slice(0, lim);
  const to = rows.length;
  const catName = (c) => (c === "Kız" ? "Kızlar" : c);
  // kız (ve Junior, Bambino) sporcunun kendi kategorisindeki derecesi (Seyhun 2026-11-04 "kızsa kızlar arasındaki derecesini de genel sıralamada
  // gösterelim; herkes Junior ise göstermiyoruz"): "K3"; hepsinde olan kategori catList'te yok
  const cm = catMarks(b);
  const marks = (r) => (cm.get(String(r.sail)) || []).filter((m) => !cat || m[0] !== cat[0]);
  const Box = ctl ? "div" : "button";
  const many = new Set(slides.map((x) => x.b.cls)).size > 1;
  const tabName = (x) => [many ? x.b.cls : "", x.cat ? catName(x.cat) : many ? "" : "Genel"].filter(Boolean).join(" · ");
  const pick = (i) => {
    ctl.setAuto(false);
    ctl.setTab(i);
  };
  return (
    <Box {...(ctl ? {} : { type: "button", onClick: onFull ? () => onFull("all") : undefined })} className={`sc-board wide${ctl ? " ctl" : ""}`}>
      <header>
        <b>Genel sıralama</b>
        <div>
          <strong>{[b.cls || "Genel", cat ? catName(cat) : ""].filter(Boolean).join(" · ")}</strong>
          <span>{b.tag}</span>
        </div>
      </header>
      {ctl ? (
        <div className="sc-tabs">
          {slides.map((x, i) => (
            <button key={`${x.b.cls}${x.cat || ""}`} type="button" className={i === k % slides.length ? "on" : ""} aria-pressed={i === k % slides.length} onClick={() => pick(i)}>
              {tabName(x)}
            </button>
          ))}
          {/* Oto düğmesi kalktı (Seyhun 2026-11-05 "ona gerek yok"): sekmeler yalnız elle */}
        </div>
      ) : null}
      <div className={ctl ? "sc-scr" : undefined} key={ctl ? `${b.cls}${cat || ""}` : undefined} onTouchStart={ctl?.auto ? () => ctl.setAuto(false) : undefined} onWheel={ctl?.auto ? () => ctl.setAuto(false) : undefined}>
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
            <tr key={`${r.sail}${i}`} className={`p${r.p}`}>
              <td className="r">{r.p}</td>
              <td className="sn">{r.sail}</td>
              <td className="n">
                {r.name || ""}
                {marks(r).map((m) => (
                  <em key={m} className={`sc-cat${m[0] === "K" ? " k" : ""}`}>
                    {m}
                  </em>
                ))}
                <small className={`sc-cl2${clubName(r.club) ? "" : " no"}`}>{clubName(r.club) || "Kulüpsüz"}</small>
              </td>
              <td className={`cl${clubName(r.club) ? "" : " no"}`}>
                <span>{clubName(r.club) || "Kulüpsüz"}</span>
              </td>
              {b.races.map((x, j) => (
                <td key={x} className={`y${/^\(.*\)$/.test(r.sc[j] || "") ? " x" : ""}`}>
                  {String(r.sc[j] || "").replace(/^\((.*)\)$/, "$1")}
                </td>
              ))}
              <td className="t">{r.t ?? ""}</td>
            </tr>
          ))}
          {Array.from({ length: !ctl && b.all.length > SC_GEN ? SC_GEN - rows.length : 0 }, (_, i) => (
            <tr key={`e${i}`} className="e" aria-hidden="true">
              <td colSpan={b.races.length + 5}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <footer>
        <span>{cat ? `${catName(cat)} · ${inCat.length} sporcu` : !ctl && b.total > to ? `İlk ${to} · ${b.total} tekne` : `${b.total} tekne`}</span>
        <span>{!ctl && scBoards(data).length > 1 ? scBoards(data).map((x) => x.cls).filter(Boolean).join(" · ") : ""}</span>
      </footer>
    </Box>
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
  // çizimde eksen / avantaj / rüzgâr yazısı yok, yanındaki kutularda bir kez (Seyhun 2026-11-06 "çok fazla tekrar")
  const svg = courseSvg(data, route, { W: 900, H: 760, bare: true });
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
  // TV düzeni (Seyhun 2026-11-04 "her zaman arkada video varmış gibi"): parkur tam ekran lacivert değil, solda tek cam panel; video görünür
  return (
    <div className="sc-cpn">
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
            <b>{[`${c.kn} kn`, dirText(c), gustText(c)].filter(Boolean).join(" · ")}</b>
          </section>
        ) : null}
      </div>
    </div>
  );
}
// Parkur seçimi (Seyhun 2026-11-06 "parkur seçimini canlı yayın sayfasında yapabilmeliyim; seçtiğimde kalsın; ilk baş en basit parkuru seçtim,
// bitti; çoklu parkurda sınıfa özel kalıcı"): üstte seçili parkur + Değiştir; açınca parkur şekilleri ve rota; "Sınıflara göre" ile sınıf
// çipleri, sınıfa dokununca o sınıfın parkuru seçilir (raceLive.cards: kartlar, sel, by "Sınıf|"). Yarış boyu kalır, Başlat o kartı yarışa yazar.
const crsClasses = (data) => {
  const out = [];
  const add = (c) => c && !out.includes(c) && out.push(c);
  (data.plan?.order || []).forEach((o) => add(o.cls));
  Object.values(data.rounds || {}).forEach((r) => add(r?.cls));
  Object.keys(cleanCourse(data.course || {}).by || {}).forEach((k) => add(k.split("|")[0]));
  return out.slice(0, 8);
};
// parkur şeklinin küçük çizimi (rüzgârsız, yazısız)
const crsMini = (data, type, route) => courseSvg({ ...data, course: { ...(data.course || {}), cards: [{ id: "A", type, route }], sel: "A", by: {} } }, route, { W: 360, H: 300, bare: true, sail: false, pre: `mn${type}` });
function ScCrsPick({ data, view, onView, onCards, onClose }) {
  const crs = cleanCourse(data.course || {});
  const [more, setMore] = useState(false);
  const cls = crsClasses(data);
  const own = (c) => !!crs.by[cardKey(c, "")];
  const card = view ? cardFor(crs, view, "") : selCard(crs);
  const [rt, setRt] = useState(null); // yazılan rota (null: kartınki)
  const split = cls.some(own);
  const put = (next) => onCards?.(cleanCards({ ...crs, ...next }));
  // bu kartı başka bir sınıf ya da Herkes de kullanıyor mu (kullanıyorsa sınıfa yeni kart açılır)
  const shared = (id) => (view ? crs.sel === id || cls.some((c) => c !== view && cardFor(crs, c, "").id === id) : false);
  const forClass = (type, route) => {
    const same = crs.cards.find((k) => k.type === type && routeText(k.route) === routeText(route));
    if (same) return put({ by: { ...crs.by, [cardKey(view, "")]: same.id } });
    const id = CARD_IDS.find((x) => !crs.cards.some((k) => k.id === x));
    if (!id) return;
    put({ cards: [...crs.cards, { id, type, route }], by: { ...crs.by, [cardKey(view, "")]: id } });
  };
  const setType = (t) => {
    // seçince alan kapanır (sınıflara göre bakılırken açık kalır, sıradaki sınıf seçilebilsin)
    if (!view) onClose?.();
    if (t === card.type) return;
    if (view && shared(card.id)) return forClass(t, card.route);
    put({ cards: crs.cards.map((k) => (k.id === card.id ? { ...k, type: t } : k)) });
  };
  const saveRt = () => {
    const r = cleanRoute(String(rt ?? "").replace(/fini[sş]/gi, "F").split(/[\s·›,>-]+/));
    setRt(null);
    if (r.length < 2 || routeText(r) === routeText(card.route)) return;
    if (r.at(-1) !== "F") r.push("F");
    if (view && shared(card.id)) return forClass(card.type, r);
    put({ cards: crs.cards.map((k) => (k.id === card.id ? { ...k, route: r } : k)) });
  };
  const toAll = () => put({ by: Object.fromEntries(Object.entries(crs.by).filter(([k]) => k.split("|")[0] !== view)) });
  return (
    <div className="sc-pk">
      {split || more ? (
        <div className="sc-pkc" role="tablist">
          {["", ...cls].map((c) => (
            <button key={c || "all"} type="button" role="tab" aria-selected={view === c} onClick={() => (setRt(null), onView(c))}>
              {c || (split ? "Diğerleri" : "Herkes")}
            </button>
          ))}
        </div>
      ) : null}
      <div className="sc-pkt">
        {Object.entries(CARD_TYPES).map(([t, n]) => (
          <button key={t} type="button" aria-pressed={card.type === t} onClick={() => setType(t)}>
            <i dangerouslySetInnerHTML={{ __html: crsMini(data, t, card.route) }} />
            <b>{n}</b>
          </button>
        ))}
      </div>
      <label className="sc-pkr">
        <small>Rota</small>
        <input value={rt ?? card.route.map((x) => (x === "F" ? "Finiş" : x)).join(" ")} inputMode="text" enterKeyHint="done" onChange={(e) => setRt(e.target.value)} onBlur={saveRt} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
      </label>
      {view && own(view) ? (
        <button type="button" className="sc-pkx" onClick={toAll}>
          {`${view} herkesle aynı olsun`}
        </button>
      ) : cls.length && !more && !split ? (
        <button type="button" className="sc-pkx" onClick={() => setMore(true)}>
          Sınıflara göre
        </button>
      ) : null}
    </div>
  );
}
// Telefon/tablet Parkur (Seyhun 2026-11-05 "rüzgâr gibi yukarıdan açılsın; rota, eksen daha iyi gösterilsin"): kartın altında çizim, altında
// rota adımları (Start › 1 › 2 › Finiş) ve iki kutu: eksen (derece + rüzgârın farkı), hat avantajı. Rüzgâr kartta zaten yazıyor, tekrar yok.
// Büyük parkur çizimi: sahnenin en-boyu panelin en-boyuna göre (dikey telefonda uzun, yatay iPad'de geniş), parkur alanı doldurur
function ScCourseBig({ data, route }) {
  const ref = useRef(null);
  const [ar, setAr] = useState(0.85);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const { width: w, height: h } = e.contentRect;
      if (w > 0 && h > 0) setAr(Math.round(Math.min(1.7, Math.max(0.5, h / w)) * 20) / 20);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const svg = courseSvg(data, route, { W: 900, H: Math.round(900 * ar), bare: true });
  return (
    <div className="sc-ckx crs bare">
      <div ref={ref} className="sc-cxd" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}
function ScCourseDrop({ data: data0, sel, mode, bare = false, view = null }) {
  const racing = mode === "race";
  // sınıfın parkuru seçiliyse (ScCrsPick) o kartın şekli ve rotası
  const vk = view ? cardFor(cleanCourse(data0.course || {}), view, "") : null;
  const data = vk ? { ...data0, course: { ...data0.course, sel: vk.id } } : data0;
  const route = vk ? vk.route : view === "" ? selCard(cleanCourse(data.course || {})).route : sceneRoute(data, racing ? sel : null, true, racing ? "race" : "wait");
  const svg = courseSvg(data, route, { W: 900, H: 760, bare });
  if (!svg) return null;
  // Parkur ve rüzgâr paneli (Seyhun 2026-11-06 "çok fazla tekrar; bir kere parkur büyük"): sayılar üstteki rüzgâr kartında, burada yalnız çizim
  if (bare) return <ScCourseBig data={data} route={route} />;
  const crs = cleanCourse(data.course || {});
  const card = selCard(crs);
  const ty = CARD_TYPES[card?.type] || "";
  let bias = null;
  try {
    bias = lineBias(crs);
  } catch {
    bias = null;
  }
  // eksen başlıkta (Seyhun 2026-11-05 "ekseni yukarıda başlık; elle girildiyse belirt"): kartta girilen eksen "Elle", yoksa rüzgârdan tahmin
  const ax = axisInfo(data);
  const g = ax ? null : guessAxis(data);
  const deg = ax ? ax.deg : g != null ? Math.round(g) : null;
  const sub = [ax?.sh != null ? shiftText(ax.sh) : "", [ty.split(" ")[0], card?.id ? `Kart ${card.id}` : ""].filter(Boolean).join(" · ")].filter(Boolean).join(" · ");
  return (
    <div className="sc-ckx crs">
      <div className="sc-cxh">
        {deg != null ? (
          <div>
            <small>Eksen</small>
            <b>{`${deg}° ${dirShort(deg)}`}</b>
            <i className={ax ? "m" : ""}>{ax ? "Elle girildi" : "Tahmin"}</i>
          </div>
        ) : (
          <div />
        )}
        {bias?.end ? <em>{`${bias.end === "pin" ? "Pin" : "Komite"} +${Math.round(bias.deg)}°`}</em> : null}
      </div>
      {sub ? <div className="sc-cxu">{sub}</div> : null}
      <div className="sc-cxd" dangerouslySetInnerHTML={{ __html: svg }} />
      {route.length ? <div className="sc-cxr">{["Start", ...route.map((m) => (m === "F" ? "Finiş" : markLabel(m)))].join("  ›  ")}</div> : null}
    </div>
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
                <b>{expKn(w)}</b>
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
// Evre ve o an gösterilen öğe (lib/raceRounds showPlan; Yayın › Ekran aynı işlevle bakar). Evrenin görüntüsü (evreScreen) önce seçilir,
// öğelerden verisi olmayan atlanır: Görüntü yalnız video varken (start ve yarışta fotoğraf üstünde de), Süre tehirde yalnız iniş sayılırken
// İzleyicinin seçebileceği görüntüler: gruba bağlı, bağlantısı olan kaynaklar (Yayın › kaynaklar, camBy "sınıf|grup" → kaynak); grubu
// olmayan bağlantılı kaynak adıyla (Drone 1)
function viewCams(data) {
  const list = sourcesOf(data.stream).filter((x) => x.url);
  const out = [];
  for (const [k, v] of Object.entries(data.camBy || {})) {
    const grp = k.split("|")[1] || "";
    if (!grp || !list.some((x) => x.id === v) || out.some((x) => x.grp === grp)) continue;
    out.push({ src: v, grp, name: grp });
  }
  for (const x of list) if (!out.some((y) => y.src === x.id)) out.push({ src: x.id, grp: "", name: x.name });
  return out;
}
// İzleyicinin seçebileceği canlı konum grupları (Seyhun 2026-11-05 "canlı konumları da butonlarla"): günün grupları renk sırasında;
// grup listesi yoksa tek "Tekneler"
function viewPos(data, today) {
  const gs = [...new Set(Object.values(groupMap(groupsOn(data.groups, today))))].filter(Boolean);
  const rank = (g) => (GROUP_PICK.indexOf(g) + 1 || 99);
  gs.sort((a, b) => rank(a) - rank(b));
  return gs.length ? gs.map((g) => ({ grp: g, name: g })) : (data.entries || []).length ? [{ grp: "", name: "Tekneler" }] : [];
}
// Start penceresi yalnız uygulamaya girilmiş telefonda yüklenir (Firebase izleyiciye gitmez)
const LiveStart = dynamic(() => import("./LiveStart"), { ssr: false });
// Telefonda alt şerit (Seyhun 2026-11-05): solda görüntü (Yayın = yayın odasının seçtiği, sonra grupların kamerası), sağda Sıralama,
// Sonuçlar, Rüzgâr, Parkur. Seçilen dolu; aynı düğmeye yeniden basınca yayının akışına döner. Geniş ekranda (TV) yok.
// Alt çubuk (Seyhun 2026-11-05 "kamera, konum, ekran gibi; parkur, rüzgâr, sıralama ayrı düğme; dokununca alttan yukarı açılsın,
// start alanına kadar gelsin"; örnek canli-tv/alt-cubuk-ornek.png onaylandı): tek sıra eşit düğme Kamera · Konum · Parkur · Rüzgâr ·
// Sıralama · Start (Start yalnız ana hesap). Dokunulanın içeriği çubuğun üstünde açılır, en çok süre kartının altına kadar; aynı düğme
// kapatır. Start penceresi (LiveStart) de aynı yerde (--vb-b, --vb-t). Yalnız telefon / dikey ekranda.
// Ekrandaki kendi videom (Seyhun 2026-11-06): ekranın düğmeleri kalkar, cihazın kendi video kontrolleri ve Kapat (LiveScreen .lv.mine)
// Kaynak seçimi (Seyhun 2026-11-06 "benim alanım ayrı, yayın alanı ayrı; yayın butonu ayrı olsun, benim manuel seçimim öncelikli";
// örnek canli-tv/kaynak-secimi/ornek.png onaylandı): çubuğun üstünde Benim | Yayın anahtarı ve "Ekranda: … ˄". Benim'de ekranda
// kendi seçimin (kamera, drone, telefon, grubun canlı konumu ya da kendi videon), seçmediysen yayınınki; Yayın'da izleyicilerin
// gördüğü. Seçim yalnız bu telefonda, yayına gitmez. "Ekranda"ya basınca "Ne izleyeyim?" paneli açılır (dikeyde alttan, yatayda
// sağdan kayarak); seçince kapanır. Alt çubukta yalnız Parkur · Rüzgâr · Sıralama · Video · Start; paneller açılıp kapanırken kayar.
const SHUT_MS = 190;
const FULL_VP = ["course", "wind", "rank", "prog", "ath"];
// Alt çubuğun simgeleri (Seyhun 2026-11-06 "butonları düzelt, daha güzel tasarım"): simge + kısa ad, Start mavi, Ayarlar yuvarlak çark
const bi = (d) => <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>;
const BAR_ICON = {
  course: bi(<><path d="M5 20l4-14 6 8 4-9" /><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="14" r="1.6" /><circle cx="19" cy="5" r="1.6" /></>),
  rank: bi(<><path d="M5 20v-6M12 20V6M19 20v-9" /></>),
  prog: bi(<><rect x="4" y="5" width="16" height="15" rx="2.5" /><path d="M4 10h16M9 3v4M15 3v4" /></>),
  ath: bi(<><circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><path d="M3 19c.6-3 2.6-5 5-5s4.4 2 5 5M11 19c.6-3 2.6-5 5-5s4.4 2 5 5" /></>),
  vid: bi(<><rect x="3" y="6" width="13" height="12" rx="2.5" /><path d="M16 10.5l5-3v9l-5-3" /></>),
  start: bi(<><circle cx="12" cy="13" r="7.5" /><path d="M12 9v4l2.5 2M10 2.5h4" /></>),
  mic: bi(<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" /></>),
  gear: bi(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" /></>),
  now: bi(<><circle cx="12" cy="12" r="3" /><path d="M5.6 5.6a9 9 0 000 12.8M18.4 5.6a9 9 0 010 12.8" /></>),
  ev: bi(<><path d="M4 7h10M4 17h6M18 7h2M14 17h6" /><circle cx="16" cy="7" r="2" /><circle cx="12" cy="17" r="2" /></>),
  src: bi(<><rect x="3" y="5" width="18" height="12" rx="2.5" /><path d="M8 21h8M12 17v4" /></>),
  txt: bi(<><path d="M5 6h14M12 6v13M9 19h6" /></>),
};
function ScView({ data, sel, mode, now, prog = [], cams, pos, cam, onCam, open, onOpen, rk = null, onFull, onStart = null, onWind = null, vidRef = null, myVid = "", ctl = null, hide = false, onHide, follow = false, onFollow = null, label = "", masaRef = null, onGive = null, airLabel = "", onAddSrc = null, boat = null, onMasa = null, masaTab = "", masaAyar = false, photos = [], defCam = "", onCards = null, onSrcMenu = null, onTalk = null, onResult = null, resMsg = "" }) {
  const [crsView, setCrsView] = useState(null); // Parkur panelinde bakılan sınıf (null: o anki yarışın parkuru, "": herkes)
  const [crsOpen, setCrsOpen] = useState(false); // üstteki Parkur kutusuna dokununca açılan seçim alanı
  // üstte yazan parkur: o anki / sıradaki yarışın sınıfınınki, yoksa seçili
  const pkCls = (sel && data.rounds?.[sel.id]?.cls) || (data.plan?.order || [])[0]?.cls || "";
  const pkCard = pkCls ? cardFor(cleanCourse(data.course || {}), pkCls, "") : selCard(cleanCourse(data.course || {}));
  const ref = useRef(null);
  const [shut, setShut] = useState(""); // kapanırken kayan panel (animasyon bitince kalkar)
  const dragRef = useRef(null);
  const rr = sel && (sel.fin || mode === "between") ? raceRows(data, sel) : null;
  const res = !!rr?.rows.length;
  const rank = scBoards(data).length > 0;
  const wind = windAhead(data, now).length >= 2;
  const nowW = !!curWind(data, null, true, now);
  const course = !!courseSvg(data, sceneRoute(data, mode === "race" ? sel : null, true, mode === "race" ? "race" : "wait"));
  const all = sourcesOf(data.stream); // Yayın › kaynaklar: kendi verdiğin adla (Start kamerası, Drone…)
  // kaynak yayında mı (raceLive.srcLive, açık Yayın sayfası YouTube'a bakıp yazar; 6 dk'dan eskisi yayın yok): kırmızı nokta
  const live = (id) => srcIsLive(data.srcLive, id, now);
  const off = all.filter((x) => !x.url); // bağlantısı olmayan kaynak: soluk
  const picks = !!onFollow && (cams.length > 0 || pos.length > 0 || off.length > 0 || !!vidRef);
  // Program düğmesi (Seyhun 2026-11-07 "canlı sayfasında grupları görebilmeliyim, programı görebilmeliyim"): start sırası, talimattaki
  // program (plan.agenda) ve günün grupları (entries/list.groups; siteden ya da elle her eklenişte güncellenir)
  const pgDay = seeDay(data, now);
  const pgAg = agendaView(data.plan?.agenda, pgDay, new Date(now + 3 * 3600e3).toISOString().slice(11, 16));
  const ath = useMemo(() => scAth(data, pgDay), [data, pgDay]);
  const btns = [
    // Parkur ve rüzgâr tek düğme (Seyhun 2026-11-06): üstte şu anki ölçüm, ortada büyük parkur, altta beklenen rüzgâr
    (course || onWind || wind || nowW) && ["course", "Parkur ve rüzgâr"],
    // Sporcular (Seyhun 2026-11-09): Sıralama ve Gruplar tek düğme; genel sıra, bugünkü grup, puan, dokununca dereceler
    (ath.length > 0 || onResult) && ["ath", "Sonuçlar"],
    (prog.length > 0 || pgAg) && ["prog", "Program"],
    vidRef && ["vid", "Video", !!myVid],
    onStart && ["start", "Start"],
  ].filter(Boolean);
  // Ekranda penceresinin sekmeleri (Seyhun 2026-11-06 "ekranda sekmesi karman çorman, daha organize"): Arka plan · Yayınlar · Konum · Videolarım
  const [sTab, setSTab] = useState("");
  // Yayınla aynı anahtarı (Seyhun 2026-11-06 "kocaman butona gerek yok, bir anahtar olsun"): açıkken ekran yayını izler, seçenekler gizli;
  // kapatınca sekmeler açılır, bir şey seçince kendi seçimin ekrana gelir. Kendi seçimin varken anahtar kapalı; açınca yayına döner.
  const synced = !cam && !myVid;
  const [free, setFree] = useState(false);
  const sameOn = synced && !free;
  const flip = () => (sameOn ? (setFree(false), onCam(defCam || "")) : (setFree(false), setSTab(""), onCam("")));
  const tabNow = sTab || (cam.startsWith("ph:") ? "bg" : cam.startsWith("b:") ? "pos" : "yy");
  const sTabs = [["bg", "Arka plan"], ["yy", "Yayınlar"], pos.length ? ["pos", "Konum"] : null, vidRef ? ["vid", "Videolarım"] : null].filter(Boolean);
  // kendi fotoğrafım bu cihazda kalır (küçültülmüş JPEG)
  const [myPh, setMyPh] = useState(() => {
    try {
      return localStorage.getItem("canli-arka") || "";
    } catch {
      return "";
    }
  });
  const addPh = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const img = new Image();
    const u = URL.createObjectURL(f);
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      const d = c.toDataURL("image/jpeg", 0.82);
      setMyPh(d);
      try {
        localStorage.setItem("canli-arka", d);
      } catch {}
      onCam(`ph:${d}`);
    };
    img.src = u;
  };
  const phList = [...(myPh ? [myPh] : []), ...photos];
  // Yayın'da çubukta yayının kendi düğmeleri (Seyhun 2026-11-06 "yayının butonları kendi butonları olsun"): yayın masasının bölümleri + Start
  const airBtns = follow && onMasa;
  // Ayarlar (Seyhun 2026-11-06 "bu ayarları kendi canlı yayın sekmemde de yapabilmeliyim; yuvarlak ayarlar butonu koy"): çarkla evre ayarları
  // Sesle (Seyhun 2026-11-09 "butonların olduğu yerde sesli buton; tıklayıp konuşup rüzgâr bilgisini vereyim, mesajla değişiklikler gösterilsin"):
  // yuvarlak mikrofon, Yayın › Parkur'daki sesle parkur penceresi (CourseTalk: rüzgâr, eksen, hat, rota, kart; yazılanlar listede)
  const talkB = onTalk ? [["talk", "Sesle"]] : [];
  const bar = airBtns ? [["m:now", "Şimdi"], ["m:ev", "Evreler"], ["m:src", "Kaynaklar"], ["m:txt", "Yazı"], ...(onStart ? [["start", "Start"]] : []), ...talkB] : [...btns, ...talkB, ...(onMasa ? [["m:ev", "Ayarlar"]] : [])];
  // açık panelin yeri: çubuğun üstü (--vb-b, alttan) ile süre kartının altı (--vb-t, üstten) arası
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const root = document.documentElement;
    const set = () => {
      const r = el.getBoundingClientRect();
      const ck = el.closest(".sc")?.querySelector(".sc-ck")?.getBoundingClientRect();
      const em = parseFloat(getComputedStyle(el).fontSize) || 16;
      root.style.setProperty("--vb-b", `${Math.round(window.innerHeight - r.top + em * 0.5)}px`);
      root.style.setProperty("--vb-t", `${Math.round((ck ? ck.bottom : r.top / 3) + em * 0.6)}px`);
      // yatayda çubuk üstte ortada: altı (--vb-d) ve iki yandaki süre kartı / Canlı'ya değmeyecek genişlik (--vb-s)
      const tr = el.closest(".sc")?.querySelector(".sc-tr")?.getBoundingClientRect();
      root.style.setProperty("--vb-d", `${Math.round(r.bottom)}px`);
      root.style.setProperty("--vb-s", `${Math.round(Math.max(ck ? ck.right : 0, tr ? window.innerWidth - tr.left : 0) + em)}px`);
    };
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    const ck = el.closest(".sc")?.querySelector(".sc-ck");
    if (ck) ro.observe(ck);
    const tr = el.closest(".sc")?.querySelector(".sc-tr");
    if (tr) ro.observe(tr);
    window.addEventListener("resize", set);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", set);
    };
  }, [btns.length, hide, picks]);
  useEffect(() => {
    if (!shut) return undefined;
    const t = setTimeout(() => setShut(""), SHUT_MS);
    return () => clearTimeout(t);
  }, [shut]);
  // boşluğa dokununca kapat (Seyhun 2026-11-06 "herhangi bir yere tıklayınca da kapansın"): açık panel varken ekranda çubuğun dışına
  // dokunmak yalnız paneli kapatır (alttaki şeye tıklanmaz); ekranın dışındaki pencereler (ölçüm ekle vb.) etkilenmez
  const openK = btns.some(([k]) => k === open) || open === "src" || open === "masa" ? open : "";
  useEffect(() => {
    if (!openK || openK === "start") return undefined;
    const down = (e) => {
      const el = ref.current;
      const sc = el?.closest(".lv") || el?.closest(".sc");
      if (!el || !sc || el.contains(e.target) || !sc.contains(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      const eat = (c) => (c.preventDefault(), c.stopPropagation());
      document.addEventListener("click", eat, { capture: true, once: true });
      setTimeout(() => document.removeEventListener("click", eat, { capture: true }), 600);
      setShut(openK);
      onOpen("");
    };
    document.addEventListener("pointerdown", down, true);
    return () => document.removeEventListener("pointerdown", down, true);
  }, [openK, onOpen]);
  if (!btns.length && !picks) return null;
  const on = btns.some(([k]) => k === open) || (open === "src" && picks) || (open === "masa" && masaRef) ? open : "";
  const ayarOn = on === "masa" && masaAyar;
  const isOn = (k) => (k.startsWith("m:") ? on === "masa" && masaTab === k.slice(2) && (k !== "m:ev" || airBtns || masaAyar) : on === k);
  const close = () => {
    if (on) setShut(on);
    onOpen("");
  };
  // aşağı çekerek kapat (Seyhun 2026-11-06 "aşağı çekerek kapatabilelim"): panelin içi en üstteyken parmak 80 px'ten fazla inerse kapanır
  const drag = {
    onTouchStart: (e) => {
      const el = e.currentTarget;
      const sc = e.target.closest?.(".sc-vp, .sc-board, .gr-wc, [data-scroll]");
      const top = el.scrollTop <= 0 && (!sc || sc === el || sc.scrollTop <= 0);
      dragRef.current = top ? { y: e.touches[0].clientY, x: e.touches[0].clientX, d: 0 } : null;
    },
    onTouchMove: (e) => {
      const g = dragRef.current;
      if (!g) return;
      const d = e.touches[0].clientY - g.y;
      if (Math.abs(e.touches[0].clientX - g.x) > Math.abs(d) && g.d === 0) return (dragRef.current = null);
      g.d = Math.max(0, d);
      e.currentTarget.style.translate = g.d ? `0 ${g.d}px` : "";
      e.currentTarget.style.transition = "none";
    },
    onTouchEnd: (e) => {
      const g = dragRef.current;
      dragRef.current = null;
      const el = e.currentTarget;
      el.style.transition = "";
      el.style.translate = "";
      if (g && g.d > 80) close();
    },
  };
  const tap = (k) => {
    if (on === k) return close();
    if (k === "start") return (onOpen("start"), onStart());
    if (k === "talk") return (close(), onTalk());
    onOpen(k);
  };
  const pick = (k) => {
    // seçili olana yeniden dokununca kalkar (Seyhun 2026-11-06 "seçili bir kaynak varsa tekrar tıklandığında kaldırılmalı"): yayın kapalı fotoğrafa döner, pencere açık kalır
    if (k === cam) return (onCam(defCam || ""), setFree(true));
    onCam(k);
    setFree(false);
    close();
  };
  const panel = (k) =>
    k === "src" ? (
      <>
        <div className="sc-vph">
          <b>Ekranda</b>
          <label className="sc-sw">
            Yayınla aynı
            <input type="checkbox" role="switch" checked={sameOn} onChange={flip} />
            <i aria-hidden="true" />
          </label>
        </div>
        {sameOn ? null : (<>
        <div className="sc-vtabs" role="tablist">
          {sTabs.map(([t, n]) => (
            <button key={t} type="button" role="tab" aria-selected={tabNow === t} className={tabNow === t ? "on" : ""} onClick={() => setSTab(t)}>
              {n}
            </button>
          ))}
        </div>
        {tabNow === "bg" ? (
          <>
            <div className="sc-vph2">
              {phList.map((u, i) => (
                <button key={`${i}${u.slice(-24)}`} type="button" className={`sc-vph1${cam === `ph:${u}` ? " on" : ""}`} aria-pressed={cam === `ph:${u}`} aria-label="Arka plan fotoğrafı" style={{ backgroundImage: `url(${u})` }} onClick={() => pick(`ph:${u}`)} />
              ))}
              <label className="sc-vph1 add">
                + Fotoğraf
                <input type="file" accept="image/*" onChange={addPh} hidden />
              </label>
            </div>
          </>
        ) : tabNow === "pos" ? (
          <>
            <div className="sc-vg">
              {pos.map((x) => (
                <button key={x.grp || "t"} type="button" className={`sc-vt${cam === `b:${x.grp}` ? " on" : ""}`} aria-pressed={cam === `b:${x.grp}`} onClick={() => pick(`b:${x.grp}`)}>
                  {x.grp ? <i style={{ background: groupColor(x.grp) || "#ffd23f" }} aria-hidden="true" /> : null}
                  {x.name}
                </button>
              ))}
            </div>
          </>
        ) : tabNow === "vid" ? (
          <>
            <button type="button" className={`sc-vt wide${myVid ? " on" : ""}`} onClick={() => onOpen("vid")}>
              {myVid ? "Videon ekranda · değiştir" : "Videolarından seç"}
            </button>
          </>
        ) : (
          <>
        {/* kategoriler (Seyhun 2026-11-06): Canlı yayınlar, Kanalımdaki canlılar, Etraftaki kameralar, YouTube videoları; boş olan görünmez */}
        {SRC_CATS.map(([c, title]) => {
          const list = all.filter((x) => srcCat(x) === c);
          if (!list.length) return null;
          return (
            <Fragment key={c}>
              <div className="sc-vshr">
                <h4 className="sc-vsh">{title}</h4>
              </div>
              {list.length ? <div className="sc-vg">
                {list.map((x) => {
                  const grp = cams.find((y) => y.src === x.id)?.grp || "";
                  // önizleme kartı (Seyhun 2026-11-06 "yazı küçük ve ince, asıl görüntüyü, önizlemeyi gösterelim"): YouTube küçük resmi, altında ince ad
                  const yid = ytId(x.url);
                  const th = (
                    <span className="sc-vth">
                      {/* eslint-disable-next-line @next/next/no-img-element -- YouTube küçük resmi */}
                      {yid ? <img src={`https://i.ytimg.com/vi/${yid}/mqdefault.jpg`} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.display = "none")} /> : null}
                      {live(x.id) ? <b className="sc-vlv" aria-label="yayında" /> : null}
                    </span>
                  );
                  const nm = (
                    <span className="sc-vtn">
                      {grp ? <i style={{ background: groupColor(grp) || "#ffd23f" }} aria-hidden="true" /> : null}
                      <span>{x.name}</span>
                      {x.url ? null : <small>bağlı değil</small>}
                    </span>
                  );
                  const t = x.url ? (
                    <button key={x.id} type="button" className={`sc-vt pv${cam === x.id ? " on" : ""}`} aria-pressed={cam === x.id} onClick={() => pick(x.id)}>
                      {th}
                      {nm}
                    </button>
                  ) : (
                    <button key={x.id} type="button" className="sc-vt pv off" disabled={!onSrcMenu} onClick={() => onSrcMenu?.(x.id)}>
                      {th}
                      {nm}
                    </button>
                  );
                  // ⋯ kaynağın detay sayfası (Seyhun 2026-11-06 örnek kaynak-detay; yalnız yöneten)
                  return onSrcMenu ? (
                    <span key={x.id} className="sc-vtw">
                      {t}
                      <button type="button" className="sc-vmore" aria-label={`${x.name} ayrıntıları`} onClick={() => onSrcMenu(x.id)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="19" cy="12" r="1.9" /></svg>
                      </button>
                    </span>
                  ) : t;
                })}
              </div> : null}
            </Fragment>
          );
        })}
        {/* tek "+ Ekle" (Seyhun 2026-11-06 örnek kaynaklar-sade): Kaynaklar sayfası ekleme menüsüyle açılır */}
        {onAddSrc ? (
          <button type="button" className="sc-vadd one" onClick={() => onAddSrc("menu")}>
            + Ekle
          </button>
        ) : null}
          </>
        )}
        </>)}
      </>
    ) : k === "masa" ? (
      // Yayın masası (LiveStart › LiveMasa buraya çizer; yalnız ana hesap, uygulama içinde)
      <div ref={masaRef} className="sc-masa" />
    ) : k === "prog" ? (
      // günün programı (Seyhun 2026-11-06 "varsa program butonumuzda olsun"): biten soluk, süren mavi, sıradaki sarı
      <ScProgPanel prog={prog} ag={pgAg} />
    ) : k === "ath" ? (
      <ScAthPanel data={data} ath={ath} day={pgDay} res={res} onFull={onFull} onResult={onResult} resMsg={resMsg} />
    ) : k === "vid" ? (
      // ana hesabın kendi videoları (LiveStart › LiveVideos buraya çizer; yalnız uygulama içinde)
      <div ref={vidRef} />
    ) : k === "course" ? (
      <>
        <ScWindNow data={data} now={now} pk={course || onCards ? { name: (CARD_TYPES[pkCard.type] || "").split(" ")[0], open: crsOpen, onTap: onCards ? () => (setCrsOpen(!crsOpen), setCrsView(null)) : null } : null} />
        {crsOpen && onCards ? <ScCrsPick data={data} view={crsView ?? ""} onView={setCrsView} onCards={onCards} onClose={() => (setCrsOpen(false), setCrsView(null))} /> : null}
        {course ? <ScCourseDrop data={data} sel={sel} mode={mode} bare view={crsOpen ? crsView : null} /> : <p className="sc-vno">Parkur yok</p>}
        <ScWindDay data={data} now={now} />
        {/* rüzgâr / eksen / hat ölçümü (Seyhun 2026-11-05 "rüzgâr ekleme parkurda olmalı, adı Ölçüm ekle") */}
        {onWind ? (
          <button type="button" className="sc-vadd" onClick={onWind}>
            + Ölçüm ekle
          </button>
        ) : null}
      </>
    ) : k === "rank" ? (
      <>
        {rank ? <div className="sc-ckx rk"><Sc03 data={data} sel={sel} mode={mode} now={now} onFull={onFull} ctl={rk} /></div> : null}
        {res ? (
          <button type="button" className="sc-vadd" onClick={() => onFull("race")}>
            Yarışın sonuçları
          </button>
        ) : null}
      </>
    ) : null;
  const body = on && on !== "start" ? panel(on) : null;
  const gone = !on && shut && shut !== "start" && shut !== "vid" && shut !== "masa" ? panel(shut) : null; // kapanış animasyonu (video paneli kendi yerine çizildiği için anında kalkar)
  // Gizle (Seyhun 2026-11-05 "arka planda video varken alt butonlar çok yer kaplıyor"): yalnız küçük "Düğmeler" kalır
  if (boat && !follow)
    return (
      <nav className="sc-vb bar bt" ref={ref} aria-label="Tekne konumu">
        <div className="sc-btop">
          {boat.onAir ? (
            <button type="button" className="sc-give" onClick={boat.onAir}>
              Yayına al
            </button>
          ) : boat.offAir ? (
            <button type="button" className="sc-give off" onClick={boat.offAir}>
              Yayından çıkar
            </button>
          ) : null}
          <button type="button" className="sc-bx" aria-label="Kapat" onClick={boat.onClose}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        {ctl}
      </nav>
    );
  if (hide)
    return (
      <nav className="sc-vb bar hid" ref={ref} aria-label="İzleyici seçimi">
        <button type="button" className="sc-vshow" aria-label="Düğmeleri göster" onClick={() => onHide?.(false)}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </nav>
    );
  return (
    <nav className={`sc-vb bar${picks ? " pk" : ""}`} ref={ref} aria-label="İzleyici seçimi">
      {/* Parkur, Rüzgâr, Sıralama, Program telefonda ve iPad'de tam ekran, tek X ile kapanır (Seyhun 2026-11-06; web ve Mac'te eskisi gibi) */}
      {body ? (
        <div className={`sc-vp ${on}${FULL_VP.includes(on) || ayarOn ? " full" : ""}${ayarOn ? " ayar" : ""}`} {...drag}>
          {FULL_VP.includes(on) || ayarOn ? (
            <button type="button" className="sc-vpx" aria-label="Kapat" onClick={close}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
            </button>
          ) : null}
          {body}
        </div>
      ) : gone ? <div className={`sc-vp ${shut} out`} aria-hidden="true" inert>{gone}</div> : null}
      {!body && ctl && !follow ? ctl : null}
      {!body && !ctl && !follow ? <ScOurs ath={ath} onTap={() => tap("ath")} /> : null}
      <div className="sc-vrow">
        {picks || onHide ? (
          <div className="sc-vtop">
            {picks ? (
              <>
                {/* Benim | Yayın yalnız yayın masası olan hesapta (Yayın'da çubuk masanın düğmeleri olur); başkasında fark yok, gösterilmez */}
                {masaRef ? <div className={`sc-seg${follow ? " y" : ""}`} role="group" aria-label="Ekranda ne olsun">
                  <button type="button" className={follow ? "" : "on"} aria-pressed={!follow} onClick={() => (onFollow(false), on === "masa" && close())}>
                    Benim
                  </button>
                  <button type="button" className={`yy${follow ? " on" : ""}`} aria-pressed={follow} onClick={() => (onFollow(true), on === "src" && close())}>
                    Yayın
                  </button>
                </div> : null}
                {!follow || !masaRef ? (
                  <>
                    <button type="button" className={`sc-now${on === "src" ? " on" : ""}`} aria-expanded={on === "src"} onClick={() => tap("src")}>
                      <span>Ekranda</span>
                      <b>{label}</b>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    {/* Yayına ver (Seyhun 2026-11-06 örnek yayin-masasi onaylandı): kendi ekranında baktığın izleyicilere de geçer */}
                    {onGive ? (
                      <button type="button" className="sc-give" onClick={onGive}>
                        Yayına ver
                      </button>
                    ) : null}
                  </>
                ) : (
                  <button type="button" className={`sc-now air${on === "masa" ? " on" : ""}`} aria-expanded={on === "masa"} onClick={() => tap("masa")}>
                    <span>Yayında</span>
                    <b>{airLabel || "Otomatik"}</b>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                )}
              </>
            ) : null}
            {onHide && !body && !bar.length ? (
              <button type="button" className="sc-vhide" aria-label="Düğmeleri gizle" onClick={() => (onOpen(""), onHide(true))}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            ) : null}
          </div>
        ) : null}
        {bar.length ? (
          <div className={`sc-vr2${airBtns ? " air" : ""}`}>
            {bar.map(([k, l, dot]) => {
              const gear = (!airBtns && k === "m:ev") || k === "talk";
              return (
                <button key={k} type="button" className={`${k === "start" ? "go" : ""}${gear ? " gear" : ""}${isOn(k) ? " on" : ""}`} aria-pressed={isOn(k)} aria-label={gear ? l : undefined} onClick={() => (k.startsWith("m:") ? (isOn(k) ? close() : onMasa(k.slice(2), gear)) : tap(k))}>
                  {BAR_ICON[k === "talk" ? "mic" : gear ? "gear" : k.replace("m:", "")] || null}
                  {gear ? null : <span>{k === "course" ? "Parkur" : l}</span>}
                  {dot ? <i aria-hidden="true" /> : null}
                </button>
              );
            })}
            {onHide && !body ? (
              <button type="button" className="gear hide" aria-label="Düğmeleri gizle" onClick={() => (onOpen(""), onHide(true))}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
function scPick({ data, sel, entry, cs, prog, today, now, mode, seqMode, fsLast }) {
  // Start öncesi: turuncu bayrak çekili ya da start'a 10 dk'dan az; Yayın'dan elle seçilen evre (courseShow.evre) üstüne yazar
  const soon = mode === "wait" && (orangeUp(data.plan, today) || (cs.rem != null && cs.rem > 0 && cs.rem <= 600));
  const vd = mode === "wait" || mode === "between" ? voidLast(data, today, now) : null;
  const evre = evreOf(mode, seqMode, soon, cleanCourseShow(data.courseShow).evre, { fs: /genel/i.test(vd?.void || ""), aban: /abandone|iptal/i.test(vd?.void || "") });
  const sd = { ...data, screen: evreScreen(data.screen, data.courseShow, evre) };
  const vid = ["live", "drone", "src", "rec", "boats"].includes(sd.screen?.kind);
  const t = scTime({ data: sd, sel, entry, cs, prog, today, now, mode, seqMode, fsLast });
  const ap = evre === "ap";
  const route = sceneRoute(sd, mode === "race" ? sel : null, true, mode === "race" ? "race" : "wait");
  const has = {
    video: vid || evre === "start" || evre === "race",
    time: !(ap && t.tx),
    prog: prog.some((x) => x.state !== "done"),
    wind: !!curWind(sd, null, true, now) || windAhead(sd, now).length >= 2,
    course: !!courseSvg(sd, route),
    rank: mode === "between" || scBoards(sd).length > 0,
    next: true,
  };
  const p = showPlan({ show: sd.courseShow, evre, has, now, dwell: { rank: sc03Len(sd, sel, mode), course: SCENE_T + 2 } });
  // kendiliğinden olacak evre (Yayın masası "elle seçildi · kendiliğinden … olurdu")
  const auto = evreOf(mode, seqMode, soon, "", { fs: /genel/i.test(vd?.void || ""), aban: /abandone|iptal/i.test(vd?.void || "") });
  return { ...p, sd, vid, evre, auto, has, sc: itemScene(p.item, sd.screen?.kind === "rec") };
}
function Sahne({ data, sel, entry, cs, prog, today, now, mode, seqMode, fsLast, sc, item = "", evre = "", onFull, bar = null, view = "", rk = null, past = false, still = false }) {
  const back = useInAppBack(); // uygulama içinden açıldıysa yarış adının başında geri oku
  // izleyicinin açtığı Rüzgâr / Sıralama / Parkur (Seyhun 2026-11-05 "yukarıdan açılsın"): süre kartının altından açılır, sahne değişmez
  const drop =
    view === "wind" ? <ScWindDrop data={data} now={now} at={(prog || []).find((x) => x.state === "next")?.at || ""} />
    : view === "rank" ? <div className="sc-ckx rk"><Sc03 data={data} sel={sel} mode={mode} now={now} onFull={onFull} ctl={rk} /></div>
    : view === "course" ? <ScCourseDrop data={data} sel={sel} mode={mode} />
    : null;
  const plan = data.plan;
  const r = data.race || {};
  const t = scTime({ data, sel, entry, cs, prog, today, now, mode, seqMode, fsLast });
  // Tehir (Seyhun 2026-11-04 "ortada kocaman değil, saatin altında; karada çekildiyse bütün gruplar için; ortada parkur, sıralama, rüzgâr devam")
  const ap = mode === "ap" || (mode === "seq" && seqMode === "ap");
  const lock = !ap && (mode === "seq" || t.tone === "r");
  // start dizisinde ve yarışta yarışın kartı sağ üstte (Görüntü; yarışta Program / Rüzgâr ortadayken de)
  // süre kartı her evrede Canlı'nın altında (ortadaki 01 Süre kartı ekrandayken yok, aynı bilgi iki yerde olmasın); tehirde rozet (ScAp)
  // TV düzeni: süre kartı hep sağ üstte; ortadaki "Süre" öğesi ayrıca bir şey göstermez (ortası görüntüye kalır)
  const colCard = !ap;
  const body =
    sc === "01" && item === "time" && !ap ? null
    : sc === "01" ? <Sc01 t={t} data={data} prog={prog} now={now} today={today} lock={lock} ap={ap} only={["time", "prog", "wind"].includes(item) ? item : ""} />
    : sc === "02" ? (colCard ? null : <Sc02 t={ap ? null : t} data={data} sel={sel} mode={mode} now={now} today={today} />)
    : sc === "03" ? <Sc03 data={data} sel={sel} mode={mode} now={now} onFull={onFull} ctl={rk} />
    : sc === "04" ? <Sc04 data={data} />
    : sc === "05" ? <Sc05 data={data} sel={sel} mode={mode} now={now} />
    : <Sc06 data={data} prog={prog} now={now} today={today} />;
  const live = !past && mode !== "none" && plan.status !== "done"; // geçmiş yarışta (?y=) Canlı rozeti yok
  // Evre bandı (Seyhun 2026-11-04 "TV show kıvamında; geçişler"): evre değişince altta 3 sn evrenin adı (sayfa ilk açılışında yok)
  const [bump, setBump] = useState({ e: evre, t: 0 });
  if (bump.e !== evre) setBump({ e: evre, t: now });
  const bumpOn = bump.t > 0 && now - bump.t < 3200;
  // Sol alt liste tek kural (Seyhun 2026-11-04 "hangi durumda ne zaman gösteriliyor, karışıklık var"): süre kartındaki grubun listesi;
  // start öncesinden yarış bitene kadar (tehir dahil) her öğede yerinde, yalnız ortada genel sıralama ya da parkur (sol yarıyı kaplar) varken yok; yarış öncesi ve sonrası yok
  // Yayın › Ekran'da evre başına seçilir (Grup ve sıra / Genel ilk 10 / Yok)
  const side = cleanCourseShow(data.courseShow).ev[evre]?.side || "off";
  const listOn = side !== "off" && sc !== "03" && sc !== "05";
  // canlı konumda bir grubun tekneleri ekrandayken (Seyhun 2026-11-04 "grubu gösterirken genel sıralamayı da solda altta"): sol altta o grubun
  // tekneleri ve genel sıralamadaki yerleri (Grup ve sıra; evrede Yok seçiliyse de)
  const bgrp = data.screen?.kind === "boats" ? data.screen.grp || "" : "";
  const bside = bgrp && sc !== "03" && sc !== "05";
  const lwho = bgrp ? { name: "", grp: bgrp, cls: (data.plan?.sets || []).find((x) => (x.grps || []).includes(bgrp))?.cls || t.who?.cls || entry?.cls || "" } : t.who || gWho(entry);
  // ekrandaki görüntünün grubu (yalnız video gösterilirken; tekrar ve tekne haritası değil)
  const liveGrps = (data.starts || []).filter((x) => x.day === today && !x.void && !x.fin).map((x) => x.grp || data.rounds?.[x.id]?.grp || "");
  const vEntry = { ...entry, cls: entry?.cls || "", grp: entry?.grp || sel?.grp || "" };
  const autoRep = !bgrp && autoOn(data, true, vEntry, today);
  const vOn = (mode === "seq" || mode === "race") && !!liveUrl(screenUrl(data.screen, data.stream), data.screen, data.stream, data.camBy, vEntry);
  const vgrp = vOn ? videoGroup(data.screen, data.stream, data.camBy, vEntry, liveGrps) : "";
  return (
    <div className={`sc s${sc}${bar ? " own" : ""}`} data-scene={sc}>
      <div className="sc-body" key={sc}>
        {body}
      </div>
      <ScTop rep={sc === "04"} on={live || sc === "04"} grp={vgrp || bgrp} auto={autoRep} logo={bar ? { back } : null} card={colCard ? <ScClock t={t} data={data} sel={sel} mode={mode} now={now} today={today} noWind={still || (sc === "01" && item === "wind")} drop={drop} /> : null}>
        {mode === "seq" || mode === "race" ? <ScOthers data={data} sel={sel} today={today} now={now} /> : null}
        {bside ? <ScGroup key={bgrp} data={data} who={lwho} today={today} now={now} slim /> : listOn ? side === "gen" || (!lwho?.grp && mode !== "race" && scBoards(data).length) ? <ScGen data={data} who={lwho} now={now} onFull={onFull} /> : <ScFleet data={data} sel={sel} mode={mode} now={now} who={lwho} today={today} onFull={onFull} /> : null}
      </ScTop>
      {bumpOn ? (
        <div className="sc-bump" key={bump.t} aria-hidden="true">
          <i />
          <b>{EVRE_NAME[evre] || ""}</b>
        </div>
      ) : null}
      {ap && sc !== "04" ? <ScAp t={t} plan={plan} seq={mode === "seq"} /> : null}
      {/* uygulama içinde yarış adı ve alttaki logo yok (Seyhun 2026-11-06 "ekranı iyi kullanamıyoruz"): düğmeler en altta */}
      {bar ? null : <div className="sc-name">
        {back ? (
          <button type="button" className="sc-back" aria-label="Geri" onClick={back}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
        <div className="sc-nt">
          <b className={(plan.title || r.name || "").length > 22 ? "lg" : ""}>{plan.title || r.name || "Yarış"}</b>
          {plan.sub ? <small>{plan.sub}</small> : null}
        </div>
        {/* Seyhun 2026-11-06 "Velora'nın alttaki beyaz kısmı yavaşça kırmızılaşıp beyazlaşsın": canlı işareti bu */}
        <span className={`sc-vl${live && sc !== "04" ? " live" : ""}`} {...(live && sc !== "04" ? { role: "img", "aria-label": "Canlı" } : {})}>
          <VeloraGlyph size={40} />
          <small>Velora</small>
        </span>
      </div>}
      {bar}
    </div>
  );
}


export function LiveScreen({ id, y = "" }) {
  const demoOn = id === "ornek";
  useVisit(id); // isimsiz ziyaret haberi (Ayarlar › Yayın)
  const real = useData(demoOn ? "" : id, y);
  const demo = useDemo(demoOn);
  const { data: data0, err, skew } = demoOn ? { data: demo.data, err: "", skew: real.skew } : real;
  const [list, setList] = useState(false);
  const [full, setFull] = useState(""); // "race" | "all": tam liste penceresi
  const [vCam, setVCam] = useState(""); // izleyicinin seçtiği kamera (kaynak id), boşsa yayının gösterdiği
  const [adm, setAdm] = useState(false); // ana hesap bu yarışın sahibi (LiveStart söyler)
  const [stOpen, setStOpen] = useState(false); // Start penceresi
  const [wdOpen, setWdOpen] = useState(false); // Ölçüm ekle penceresi (Parkur paneli)
  const [vidHost, setVidHost] = useState(null); // Video panelinde ana hesabın videolarının yeri
  const [masaHost, setMasaHost] = useState(null); // Yayın masasının yeri (Yayın › "Yayında" paneli)
  const [give, setGive] = useState(null); // Benim › Yayına ver isteği { s, n } (LiveStart yazar)
  const [boatX, setBoatX] = useState(""); // X ile bu ekranda kapatılan yayındaki tekne konumu ("b:<grup>")
  const [newList, setNewList] = useState(null); // tekne ekranında Yeni liste { file, n } (LiveStart okur, bugünün grupları olur)
  const [listMsg, setListMsg] = useState("");
  const onListed = useCallback((t) => setListMsg(t), []);
  const [masaAdd, setMasaAdd] = useState(null); // Ne izleyeyim? › + : masanın Kaynaklar'ında açılacak ekleme kutusu { c, n }
  const [myVid, setMyVid] = useState({ id: "", url: "" }); // yalnız bu cihazda arka planda oynayan kendi videom (canlı yayına gitmez)
  const [barHide, setBarHide] = useState(false); // alt düğmeler gizli
  const [follow, setFollow] = useState(false); // Yayın: izleyicilerin gördüğü (kendi seçimim beklemede kalır)
  const inApp = useInAppBack(); // uygulama içinden açıldı (link ile açılanda null)
  // Düğmeler, seçimler, listeye dokunma yalnız uygulama içinde "Ekrana aç" ile açılan ekranda (Seyhun 2026-11-05 "herkese açık linkte ve Yayın'daki
  // önizlemede kontrol olmayacak, sadece gösterilecek"); çerçevede (Yayın önizlemesi) hiç yok
  const top = useSyncExternalStore(noSub, () => window.self === window.top, () => false);
  const own = !!inApp && top;
  // kendi ekranım açılınca canlı yayın kendiliğinden açılmaz: arkada bulanık fotoğraf (Seyhun 2026-11-06 "canlı yayın direkt verilmesin");
  // Ekranda › Yayınla aynı ya da bir kaynak seçince yayın gelir, kapatınca anında bu fotoğrafa döner
  const [vInit, setVInit] = useState(false);
  if (own && !vInit) {
    setVInit(true);
    if (!vCam) setVCam(BG_DEF);
  }
  const locT = useLocalTimer(skew, id, own && !demoOn && !y, data0?.timer || null);
  // parkur seçimi (ScCrsPick): yazılana kadar ekranda hemen görünür; sunucudaki cardAt yenilenince sunucununki
  const [crsReq, setCrsReq] = useState(null); // { k: kartlar, n, at }
  const [resFile, setResFile] = useState(null); // Sporcular › "+": LiveStart sonucu yükler
  const [resMsg, setResMsg] = useState("");
  const onResDone = useCallback((t) => setResMsg(t), []);
  const [talkN, setTalkN] = useState(0); // Sesle düğmesi: LiveStart sesle parkur penceresini açar
  const crsOv = crsReq && data0 && !((data0.course?.cardAt || "") >= crsReq.at) ? crsReq.k : null;
  const data = useMemo(() => (data0 && (locT || crsOv) ? { ...data0, ...(locT ? { timer: locT } : {}), ...(crsOv ? { course: { ...data0.course, ...crsOv } } : {}) } : data0), [data0, locT, crsOv]);
  const [vTab, setVTab] = useState(""); // alt çubukta açık olan: cam, pos, course, wind, rank, start (boş = kapalı)
  const myRef = useRef(null); // arka plandaki kendi videom (oynat, geri al, baştan)
  const playMine = useCallback((vid, blob) => {
    setMyVid((o) => {
      if (o.url) URL.revokeObjectURL(o.url);
      return vid && blob ? { id: vid, url: URL.createObjectURL(blob) } : { id: "", url: "" };
    });
    if (vid) (setVTab(""), setFollow(false)); // ekrana verince video paneli kapanır (Seyhun 2026-11-05); "Videolar" ile yeniden açılır
  }, [setVTab]);
  // Yayın'a geçince kendi videom duraklar, Benim'e dönünce kaldığı yerden sürer
  useEffect(() => {
    const v = myRef.current;
    if (!v) return;
    if (follow) v.pause();
    else v.play().catch(() => {});
  }, [follow]);
  const warm = useSyncExternalStore(noSub, () => !!readWarmMe(), () => false); // bu telefonda uygulamaya girilmiş mi
  const onGiven = useCallback((ok) => ok && setVCam(""), []); // yayına verilince kendi seçimim yayınla aynı olur
  const addSrcAt = useCallback((c) => (setMasaAdd({ tab: "src", c, n: Date.now(), back: () => setVTab("src") }), setVTab("masa")), []);
  const masaAt = useCallback((t, ayar = false) => (setMasaAdd({ tab: t, c: "", n: Date.now(), bare: true, back: () => setVTab(""), ...(ayar ? { ayar: true } : {}) }), setVTab("masa")), []);
  // Ekranda › kaynağın ⋯: masanın kaynak detay sayfası açılır, X Ekranda'ya döner
  const srcMenu = useCallback((id) => (setMasaAdd({ tab: "src", c: "", n: Date.now(), bare: true, det: id, back: () => setVTab("src") }), setVTab("masa")), []);
  if (vTab !== "masa" && masaAdd) setMasaAdd(null); // masa kapanınca bir dahaki açılış Şimdi sekmesiyle
  const vView = ["rank", "wind", "course"].includes(vTab) ? vTab : ""; // izleyicinin açtığı Sıralama / Rüzgâr / Parkur
  const [rkTab, setRkTab] = useState(0); // izleyicinin Sıralama sekmesi (Genel, Kızlar…)
  const [rkAuto, setRkAuto] = useState(false); // Oto: sekmeler kendiliğinden geçer
  const nowMs = useNow(skew, own ? 250 : 1000); // evre ve bekleme sayacı için saat (sunucuyla eşlenmiş)
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
  const csel = phase === "race" ? sel : null;
  // sayaç başka grubun startını sayıyorsa (ekranda Sarı yarışta, Mavi geri sayımda) ekrandaki yarışın saati sayaçtan okunmaz
  const ctimer = phase === "race" && (!data.timer?.rid || !sel || data.timer.rid === sel.id) ? data.timer : null;
  const cs = clockState({ sel: csel, isCur, timer: ctimer, now: nowMs, entry, data, today });
  // Parkur: yarış öncesi (bekleme ya da start'a geri sayım) otomatik; açıkken arka plan bulanık (lv-bc.course)
  const counting = phase !== "summary" && ((cs.rem != null && cs.rem > 0) || cs.label === "Durdu");
  // Genel sıralama yarışta sağda, alttan yukarı sabit alanda, kaydırılır (Seyhun 2026-11-02 "genel sıralama varsa sağ tarafta")
  const prog = isCur ? dayProgram(data, today) : [];
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
  // Yayın grafiği (Seyhun 2026-11-03 14:41): canlı görünümde videolu ve videosuz aynı düzen
  const apDown = st !== "ap" && !!data.plan.warn && nowMs < Date.parse(data.plan.warn);
  const mode = !isCur ? "between" : phase === "summary" ? "summary" : seqMode ? "seq" : st === "ap" || apDown ? "ap" : racing ? "race" : between ? "between" : st === "none" && data.plan.day === today ? "none" : "wait";
  // evrenin görüntüsü ve sıradaki öğesi (Yayın › Ekran › evre)
  const pk = scPick({ data, sel, entry, cs, prog, today, now: nowMs, mode, seqMode, fsLast });
  // izleyicinin seçimi (Seyhun 2026-11-05 "kullanıcı seçebilsin"): kendi telefonunda grubun kamerası ve Sıralama / Rüzgâr / Parkur;
  // seçmezse yayın odasının gösterdiği
  const cams = viewCams(data);
  const pos = viewPos(data, today);
  // vCam: kaynak id (kamera) ya da "b:<grup>" (o grubun canlı konumu)
  const posOn = vCam.startsWith("b:") && pos.some((x) => `b:${x.grp}` === vCam);
  const camOn = posOn || cams.some((x) => x.src === vCam) ? vCam : "";
  // Arka plan fotoğrafı (Seyhun 2026-11-06 "yayını izlemek zorunda değilim; arka planda fotoğraf kalabilir, onu seçebilirim"): "ph:<adres>"
  const phOn = vCam.startsWith("ph:") ? vCam.slice(3) : "";
  // Benim (varsayılan): kendi seçimim öncelikli; Yayın: izleyicilerin gördüğü
  const mine = own && !follow;
  // yayından gelen tekne konumu X ile kapatıldıysa (yalnız bu ekranda, yayındaki değişene kadar) arkası boş kalır
  const airBoat = pk.sd.screen?.kind === "boats" ? `b:${pk.sd.screen.grp || ""}` : "";
  const sd = mine && phOn ? { ...pk.sd, screen: { kind: "" } } : mine && posOn ? { ...pk.sd, screen: { kind: "boats", grp: vCam.slice(2), zoom: 100 } } : mine && camOn ? { ...pk.sd, screen: { kind: "src", src: camOn } } : mine && airBoat && boatX === airBoat ? { ...pk.sd, screen: { kind: "" } } : pk.sd;
  const vid = mine && phOn && !myVid.url ? false : mine && (camOn || myVid.url) ? true : pk.vid;
  const onLabel = myVid.url ? "Videon" : vCam === BG_DEF ? "Yayın kapalı" : phOn ? "Fotoğraf" : posOn ? `${pos.find((x) => `b:${x.grp}` === vCam)?.name || "Tekneler"} konumu` : camOn ? sourcesOf(data.stream).find((x) => x.id === camOn)?.name || "Kamera" : "Yayınla aynı";
  const pickCam = (k) => (setVCam(k), myVid.url && playMine("", null));
  const bgPhotos = [BG_PHOTO, ...(data?.media || []).filter((m) => m.kind !== "video" && m.url).map((m) => m.url)].slice(0, 8);
  // Benim'de seçilen kaynak ya da konum yayındakinden farklıysa "Yayına ver" (yalnız ana hesap)
  const giveS = posOn ? { kind: "boats", grp: vCam.slice(2), zoom: 100 } : camOn ? { kind: "src", src: camOn } : null;
  const onAirS = data.screen || {};
  const given = !!giveS && onAirS.kind === giveS.kind && (giveS.kind === "src" ? onAirS.src === giveS.src : (onAirS.grp || "") === (giveS.grp || ""));
  const canGive = adm && inApp && !demoOn && mine && !!giveS && !given && !myVid.url;
  const doGive = () => setGive((g) => ({ s: { ...giveS, caption: onAirS.caption || "" }, n: (g?.n || 0) + 1 }));
  // Tekne konumu ekrandayken (Seyhun 2026-11-06 "alttaki butonlar kalksın; yukarıda X; yayına al / yayından çıkar buradan"): alt çubuk yerine
  // üstte Yayına al / Yayından çıkar + X, altta yalnız tekne şeridi (BoatCtl). X: kendi seçimimse yayınla aynıya döner, yayınınkiyse bu ekranda gizlenir.
  const boatOn = mine && sd.screen?.kind === "boats" && !myVid.url;
  // yayındaki görüntü evrenin atanmış görüntüsünden de gelebilir (pk.sd.screen); Yayından çıkar ikisini de keser
  const airScr0 = pk.sd.screen || {};
  const boatAdm = adm && inApp && !demoOn;
  const boatMode = boatOn
    ? {
        onClose: () => (posOn ? pickCam("") : setBoatX(airBoat)),
        onAir: boatAdm && canGive ? doGive : null,
        offAir: boatAdm && airScr0.kind === "boats" && (!posOn || given) ? () => (setBoatX(""), setGive((g) => ({ s: { kind: "", off: pk.evre, caption: onAirS.caption || "" }, n: (g?.n || 0) + 1 }))) : null,
      }
    : null;
  // Yayında ne var (Yayın modundaki düğme): kaynağın adı, canlı konum, kayıt, yoksa evrenin öğesi
  const airScr = pk.sd.screen || {};
  const airLabel = airScr.kind === "src" ? sourcesOf(data.stream).find((x) => x.id === airScr.src)?.name || "Kaynak" : airScr.kind === "boats" ? `${airScr.grp || "Tekneler"} konumu` : airScr.kind === "rec" ? "Kayıt" : airScr.kind === "live" ? "Grubun kamerası" : EVRE_NAME[pk.evre] || "Otomatik";
  const masaNow = { evre: pk.evre, auto: pk.auto, item: pk.item, next: pk.next, left: pk.left, pin: pk.pin, empty: pk.empty, has: pk.has };
  const vwOn = vView === "rank" ? scBoards(sd).length > 0 : vView === "course" ? !!courseSvg(sd, sceneRoute(sd, mode === "race" ? sel : null, true, mode === "race" ? "race" : "wait")) : vView === "wind" ? windAhead(sd, nowMs).length >= 2 : false;
  // Rüzgâr sahne değiştirmez: süre kartının altından grafik açılır
  // açılan bölüm kartın altında; ortada aynı şey ikinci kez çıkmasın
  const same = vwOn && ((vView === "rank" && pk.sc === "03") || (vView === "course" && pk.sc === "05") || (vView === "wind" && pk.sc === "01" && pk.item === "wind"));
  // geçmiş yarış (?y=, Seyhun 2026-11-05 eski düzen kalktı): o yarışın sıralaması
  // yayın kapalıyken / fotoğraf arkadayken ortada sahne dönmez (Seyhun 2026-11-06 "yayın kapalı olmasına rağmen arka planda rüzgâr dönüyor; rüzgâra
  // tıklayarak ulaşacağım"): yalnız süre kartı; Rüzgâr / Parkur / Sıralama alt çubuktan açılır
  const still = mine && !!phOn && !myVid.url;
  const { sc, item } = !isCur && scBoards(sd).length ? { sc: "03", item: "rank" } : same || still ? { sc: "01", item: "time" } : pk;
  const { evre } = pk;
  return (
    <div className={`lv lv-bc lv-grx${vid ? " video" : ""}${follow ? " fol" : ""}${myVid.url && !follow ? " mine" : ""}${vid && sd.screen?.pause ? " pause" : ""} ${phase}`}>
      <Backdrop data={sd} isCur={isCur} entry={entry} today={today} photo={mine ? phOn : ""} />
      {/* Kendi videom (Seyhun 2026-11-06 "videoyu gösterirken düğmeler kalkmalı, yalnız videonun kontrol paneli, iPad gibi"): ekranın
          düğmeleri, çubuğu ve kartları kalkar; video cihazın kendi oynatıcı kontrolleriyle (oynat, süre çubuğu, ses, tam ekran); Kapat ile canlı ekrana dönülür */}
      {myVid.url ? (
        <div className="lv-my">
          <video key={myVid.id} ref={myRef} src={myVid.url} autoPlay muted playsInline controls />
          {!follow ? (
            <button type="button" className="lv-myx" onClick={() => playMine("", null)}>
              Kapat
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="lv-page lv-ov">
        <Sahne data={sd} past={!isCur} sel={sel} entry={entry} cs={cs} prog={prog} today={today} now={nowMs} mode={mode} seqMode={seqMode} fsLast={fsLast} sc={sc} item={item} evre={evre} still={still} onFull={own ? setFull : null} bar={own ? <ScView data={data} sel={sel} mode={mode} now={nowMs} prog={prog} cams={cams} pos={pos} cam={phOn ? vCam : camOn} photos={bgPhotos} defCam={BG_DEF} onCam={pickCam} open={vTab} onOpen={setVTab} rk={vwOn && vView === "rank" ? { tab: rkTab, setTab: setRkTab, auto: rkAuto, setAuto: setRkAuto } : null} onFull={setFull} onStart={adm && !demoOn ? () => setStOpen(true) : null} onWind={adm && !demoOn ? () => setWdOpen(true) : null} vidRef={adm && inApp && !demoOn ? setVidHost : null} myVid={myVid.id} ctl={sd.screen?.kind === "boats" && !myVid.url ? <BoatCtl groups={pos} grp={sd.screen.grp || ""} onGrp={(g) => (setBoatX(""), pickCam(`b:${g}`))} onList={boatAdm ? (file) => (setListMsg("Okunuyor…"), setNewList((x) => ({ file, n: (x?.n || 0) + 1 }))) : null} listMsg={listMsg} /> : null} boat={boatMode} hide={barHide} onHide={setBarHide} follow={follow} onFollow={setFollow} label={onLabel} masaRef={adm && inApp && !demoOn ? setMasaHost : null} onGive={canGive ? doGive : null} airLabel={airLabel} onAddSrc={adm && inApp && !demoOn ? addSrcAt : null} onMasa={adm && inApp && !demoOn ? masaAt : null} masaTab={vTab === "masa" ? masaAdd?.tab || "now" : ""} masaAyar={vTab === "masa" && !!masaAdd?.ayar} onSrcMenu={adm && inApp && !demoOn ? srcMenu : null} onCards={(adm && inApp) || demoOn ? (k) => setCrsReq({ k, n: Date.now(), at: new Date().toISOString() }) : null} onTalk={adm && !demoOn ? () => setTalkN(Date.now()) : null} onResult={adm && inApp && !demoOn ? (file) => (setResMsg("Okunuyor…"), setResFile((x) => ({ file, n: (x?.n || 0) + 1 }))) : null} resMsg={resMsg} /> : null} />
        {warm && !demoOn && id ? <LiveStart raceId={id} open={stOpen && vTab === "start"} onClose={() => (setStOpen(false), setVTab(""))} onReady={setAdm} wind={wdOpen} onWindClose={() => setWdOpen(false)} vidHost={vTab === "vid" ? vidHost : null} playing={myVid.id} onPlay={playMine} stream={data.stream || null} auto={own} masaHost={vTab === "masa" ? masaHost : null} addCat={masaAdd} now={masaNow} pos={pos} give={give} onGiven={onGiven} list={newList} onListed={onListed} cards={crsReq} talkN={talkN} resFile={resFile} onResDone={onResDone} /> : null}
      </div>
      {demoOn ? <DemoBar ctl={demo.ctl} /> : null}
      {list ? <Races id={id} starts={starts} cur={data.cur} sel={sel} fleets={data.fleets} rounds={data.rounds} entries={data.entries} onClose={() => setList(false)} /> : null}
      {full ? <FullList kind={full} data={data} sel={sel} isCur={isCur} id={id} onClose={() => setFull("")} /> : null}
    </div>
  );
}
