"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dirShort, livePhase, momentRaceName, planLabel, planStartMs, raceTime, raceTitle, seqState, seqSteps } from "@/lib/raceLive";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { cleanCourse } from "@/lib/raceCourse";
import { manualFinish, markLabel, markName, nowPos, officialFor, prepName, recTitle, sameSail, standings, whoBySail, whoOf, ytSrc } from "@/lib/raceRounds";
import { groupColor, onlyCat, provisional } from "@/lib/roundScore";
import "./liveScreen.css";

// Herkese açık canlı yarış ekranı (/canli/<yarış>, Seyhun 2026-11-01; yayın görünümü, örnek project-files/samandira-donus/yayin).
// Koyu deniz zemini; parkur kartı (günün ölçümlerinden, lib/courseCard.js; yeni parkur girilince yenisi) arkada soluk; solda sayaç, rüzgâr ve
// ekranda oynayan (canlı yayın ya da tekrar), ortada "şu an hangi şamandıra", sağda tek sıralama listesi (sıra, yelken, ad, kulüp, her şamandıradaki sırası). Grup grup yarışta (Mavi, Sarı…) startın grubu ve aynı yarışın diğer grupları; altta genel sıralama
// (geçici: grupların yarışları toplanır, Kızlar/Junior; resmî PDF gelince ondan). Resmî sonuç (PDF) gelince liste ondan dizilir, elle finişten farklıysa "Elle 6". Önceki yarışlar ?y=<start>.
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

// Logo kaldırıldı (Seyhun 2026-11-01 "herkese açık sayfadaki logoyu da kaldır"); başlık en solda
function useData(id, y) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const skew = useRef(0);
  useEffect(() => {
    let on = true;
    let t = 0;
    const load = async () => {
      clearTimeout(t);
      if (document.hidden) return (t = setTimeout(load, POLL));
      try {
        const res = await fetch(`/api/canli?id=${encodeURIComponent(id)}${y ? `&y=${encodeURIComponent(y)}` : ""}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        if (!on) return;
        if (res.ok) {
          skew.current = (j.now || Date.now()) - Date.now();
          setData(j);
          setErr("");
        } else setErr(j.error || "fail");
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

function useNow(skew, ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now + (skew.current || 0);
}

// Sayaç: start öncesi geri sayım, startan sonra geçen süre, bitince yarışın süresi
// Start dizisindeki bayraklar (Seyhun 2026-11-01): Uyarı'da sınıf bayrağı (Optimist, ILCA 4…), Hazırlık'ta seçilen bayrak (P, I, Z, U, Kara).
// Son dakikada hazırlık bayrağı iner (soluklaşır), startla sınıf bayrağı iner.
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
  return null;
}

function Clock({ sel, isCur, timer, skew, entry }) {
  const now = useNow(skew);
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
  }
  const steps = seqSteps(timer?.dur || 300);
  const st = rem == null ? steps.map(() => (sel?.at && !sel.void ? "done" : "")) : seqState(steps, rem, true);
  if (rem === 0 || (rem == null && sel?.at && !sel.void)) st[st.length - 1] = "now";
  const cls = entry?.cls || "";
  const prep = entry?.prep || "";
  const started = rem === 0 || (rem == null && !!sel?.at && !sel.void);
  const lastMin = started || (rem != null && rem <= 60);
  const flagOf = (x) => {
    if (x.name === "Uyarı" && cls) return { kind: "cls", cls, down: started, name: cls };
    if (x.name === "Hazırlık" && prep) return { kind: prep, down: lastMin, name: prepName(prep) };
    return null;
  };
  return (
    <div className="lv-card lv-cd">
      <div className="lv-lab">
        <span>{label || "Start bekleniyor"}</span>
        <span>{right}</span>
      </div>
      <div className="lv-clock">{value}</div>
      <div className="lv-seq">
        {steps.map((x, i) => (
          <div key={x.m} className={st[i]}>
            <b>{x.m}</b>
            {x.name}
            {flagOf(x) ? (
              <>
                <Flag {...flagOf(x)} />
                <small className={flagOf(x).down ? "down" : ""}>{flagOf(x).name}</small>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function Media({ data, sel, starts, isCur }) {
  const [pick, setPick] = useState(null); // izleyicinin kendi seçtiği (ekrandakinin yerine)
  const [tallId, setTallId] = useState(""); // boyu eninden uzun (dikey) olduğu oynarken anlaşılan video
  // canlı yarışta o günün çekimleri, önceki yarışta yalnız o yarışınkiler
  const items = useMemo(() => (data.media || []).filter((m) => (isCur ? (m.rid ? m.rid === sel?.id : m.at.slice(0, 10) === (sel?.day || data.day)) : m.rid === sel?.id)), [data.media, sel, data.day, isCur]);
  const scr = isCur ? data.screen || {} : {};
  const yt = ytSrc(data.stream?.url);
  const onScreen = scr.kind === "rec" ? (data.media || []).find((m) => m.id === scr.mid) : null;
  const show = pick || (scr.kind === "live" && yt ? { live: true } : onScreen);
  if (!show && !items.length) return null;
  // Dikey video dikey kutuda tam boy, yatay 16:9 (Seyhun 2026-11-01): kayıttaki en boy, yoksa oynarken ölçülen
  const tall = !!show && !show.live && (show.w && show.h ? show.h > show.w : tallId === show.id);
  const nameOf = (m) => momentRaceName(m, starts);
  return (
    <div className="lv-card lv-media">
      <div className="lv-lab">
        {show?.live ? (
          <span className="lv-row">
            <span className="lv-tag rec">Canlı</span>Canlı yayın
          </span>
        ) : show ? (
          <span className="lv-row lv-trunc">
            <span className="lv-tag">Tekrar</span>
            <span className="lv-trunc">{recTitle(show, nameOf(show))}</span>
          </span>
        ) : (
          <span>Galeri</span>
        )}
        {pick ? (
          <button type="button" className="lv-link" onClick={() => setPick(null)}>
            Ekrana dön
          </button>
        ) : (
          <span>{!show?.live && show && scr.loop ? "Döngü" : ""}</span>
        )}
      </div>
      {show && (
        <div className={`lv-screen${tall ? " tall" : ""}`}>
          {show.live ? (
            <iframe title="Canlı yayın" src={yt} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          ) : show.kind === "video" ? (
            <video key={show.id} src={show.url} poster={show.thumb || undefined} autoPlay muted playsInline controls loop={pick ? false : !!scr.loop} onLoadedMetadata={(e) => e.currentTarget.videoHeight > e.currentTarget.videoWidth && setTallId(show.id)} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={show.url} alt="" />
          )}
        </div>
      )}
      {items.length > 0 && (
        <div className="lv-thumbs">
          {items
            .slice(-8)
            .reverse()
            .map((m) => (
              <button key={m.id} type="button" className={(pick || onScreen)?.id === m.id ? "sel" : ""} onClick={() => setPick(m)} aria-label={recTitle(m, nameOf(m))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.thumb || m.kind === "photo" ? <img src={m.thumb || m.url} alt="" loading="lazy" /> : <span />}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

function Wind({ data, sel, isCur }) {
  const obs = (data.course?.obs || []).filter((o) => o.kind === "wind").map((o) => ({ at: o.at, dir: o.deg, kn: o.kn, gust: null }));
  // önceki yarışta startındaki rüzgâr (yoksa o güne kadarki son kayıt)
  const upto = !isCur && sel ? sel.fin || sel.at : "";
  const w = !isCur && sel?.dir != null ? { at: sel.at, dir: sel.dir, kn: sel.kn, gust: null } : [...(data.wind || []), ...obs].filter((x) => x.dir != null && (!upto || x.at <= upto)).sort((a, b) => String(a.at).localeCompare(String(b.at))).at(-1);
  if (!w)
    return (
      <div className="lv-card lv-wind">
        <div className="lv-wv">
          <b className="lv-dim">–</b>
          <span>Rüzgâr henüz girilmedi</span>
        </div>
      </div>
    );
  return (
    <div className="lv-card lv-wind">
      <span className="lv-arrow" aria-hidden="true">
        <svg viewBox="0 0 40 40" style={{ transform: `rotate(${w.dir}deg)` }}>
          <path d="M20 4 L27 22 L20 17 L13 22 Z" fill="#fff" />
          <line x1="20" y1="17" x2="20" y2="36" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <div className="lv-wv">
        <b>{w.dir}°</b>
        <span>
          {dirShort(w.dir)}
          {w.kn != null ? ` · ${w.kn} kn` : ""}
          {w.gust ? ` · sağanak ${w.gust}` : ""}
        </span>
      </div>
      <div className="lv-lab">
        <span>Rüzgâr</span>
        <span>{hmOf(w.at)}</span>
      </div>
    </div>
  );
}

// Parkur kartı: uygulamadaki Parkur sekmesiyle aynı çizim (günün ölçümleri); küçük kart, dokununca tam ekran büyük (Seyhun 2026-11-01)
function Course({ data, route }) {
  const svg = useMemo(() => cardSvg(cardOf(cleanCourse(data.course || {})), { navy: true }), [data.course]);
  const [big, setBig] = useState(false);
  if (!svg)
    return (
      <div className="lv-card lv-course">
        <div className="lv-lab">
          <span>Parkur</span>
          <span>{route}</span>
        </div>
        <div className="lv-wait">Parkur ölçümü girilince burada çizilir</div>
      </div>
    );
  return (
    <>
      <button type="button" className="lv-card lv-course" onClick={() => setBig(true)} aria-label="Parkuru büyüt">
        <div className="lv-lab">
          <span>Parkur</span>
          <span>{route}</span>
        </div>
        <div className="lv-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      </button>
      {big ? (
        <div className="lv-pop lv-big" onClick={() => setBig(false)} role="dialog" aria-label="Parkur">
          <div className="lv-card lv-bigc">
            <div className="lv-lab">
              <span>Parkur</span>
              <span>{route}</span>
            </div>
            <div className="lv-svg" dangerouslySetInnerHTML={{ __html: svg }} />
          </div>
        </div>
      ) : null}
    </>
  );
}

// Sıralamanın üstünde canlı yarışta "Şu an 2. şamandıra · Son geçen 305 Ece Kara"; parkur sırası kartın başlığında (routeOf)
const routeOf = (data, sel) => {
  const route = data.rounds?.[sel?.id]?.route || [];
  return route.length ? route.map((m) => (m === "F" ? "Finish" : m)).join(" · ") : sel?.course || "";
};
function Now({ data, sel, isCur }) {
  const entry = data.rounds?.[sel?.id];
  const route = entry?.route || [];
  const pos = entry ? nowPos(entry) : -1;
  const last = pos >= 0 ? entry.legs[pos].at(-1) : "";
  const who = whoOf({ ...whoBySail(data.fleets), ...Object.fromEntries((data.entries || []).map((r) => [r.sail, { name: r.name, club: r.club }])) }, last);
  if (!(isCur && pos >= 0)) return null;
  return (
    <div className="lv-card lv-now">
      <b>{pos === route.length - 1 && route[pos] === "F" ? "Finish" : `Şu an ${markName(route[pos])}`}</b>
      <span>{`Son geçen ${last}${who?.name ? ` ${who.name}` : ""}`}</span>
    </div>
  );
}

// Zemin (Seyhun 2026-11-01 "koyuluktan açıklığa, yarış parkuru havası"): üstte açık deniz mavisi, altta koyu lacivert; arkada soluk bir
// parkur (şamandıralar, kesik rota, start hattı) ve dalga dokusu. Yazılar öne çıksın diye hepsi çok soluk.
export function Sea() {
  return (
    <div className="lv-sea" aria-hidden="true">
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
      <svg className="lv-track" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
        <g fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="3">
          <polyline points="800,610 1180,150 420,330 1180,150 800,610" strokeDasharray="10 14" />
          <line x1="560" y1="640" x2="1040" y2="580" strokeWidth="5" strokeDasharray="16 12" />
        </g>
        <g fill="#fff" fillOpacity=".14">
          <circle cx="1180" cy="150" r="22" />
          <circle cx="420" cy="330" r="18" />
          <circle cx="800" cy="610" r="18" />
          <circle cx="1040" cy="580" r="12" />
          <path d="M540 652 L560 616 L584 652 Z" />
        </g>
      </svg>
    </div>
  );
}

// Bekleme evresi (Seyhun 2026-11-01 "start saati belirleyeceğim, herkese açık sayfada geri sayım olmalı"): ilk start'a geri sayım, yarış adı, yer,
// tekne / sınıf / grup sayısı, start sırası, erteleme ya da "bugün yarış yok" mesajı. Yanında genel sıralama (önceki günlerden sonuç varsa).
function Waiting({ data, now, today, starts }) {
  const plan = data.plan;
  const ms = planStartMs(plan, today);
  const entries = data.entries || [];
  const classes = [...new Set(entries.map((e) => e.cls).filter(Boolean))];
  const planDay = plan.status === "done" && plan.next ? plan.next.day : plan.day || today;
  const grpList = (data.groups?.[planDay] || []).map((x) => x[1]);
  const groups = [...new Set((grpList.length ? grpList : plan.order.map((o) => o.grp)).filter(Boolean))];
  const nextDay = planDay && planDay > today;
  const at = plan.status === "done" && plan.next ? plan.next.at : plan.at;
  let label = "Start bekleniyor";
  let value = "";
  let note = "";
  if (plan.status === "none" && plan.day === today) {
    label = "Bugün yarış yok";
    if (ms && ms > now) {
      value = clockOf((ms - now) / 1000);
      note = `${nextDay ? "Yarın" : dayText(planDay)} ilk start ${at}`;
    }
  } else if (ms) {
    label = ms > now ? (nextDay ? "Yarın ilk start'a" : "İlk start'a") : "Start bekleniyor";
    value = ms > now ? clockOf((ms - now) / 1000) : "";
    note = `${nextDay ? dayText(planDay) : "Bugün"} ${at}${plan.status === "ap" ? " · Start ertelendi" : ""}`;
  } else if (plan.status === "ap") label = "Start ertelendi";
  const chips = [entries.length ? `${entries.length} tekne` : "", classes.length > 1 ? `${classes.length} sınıf` : classes[0] || "", groups.length ? `${groups.length} grup` : ""].filter(Boolean);
  // Kartsız, ortada (Seyhun 2026-11-01): büyük geri sayım ekranın ortasında, altında küçük "Bugün 11:00"; yanda yalnız ekranda bir yayın
  // ya da genel sıralama varsa kart (boş "Genel sıralama" çizilmez)
  const side = data.screen?.kind || hasOverall(data);
  return (
    <div className={`lv-waitgrid${side ? "" : " one"}`}>
      <div className="lv-waitc">
        <div className="lv-waitl">{label}</div>
        <div className={`lv-clock${value ? "" : " lv-dim"}`}>{value || "--:--"}</div>
        {note ? <div className="lv-waitn">{note}</div> : null}
        {chips.length ? (
          <div className="lv-chips lv-waitchips">
            {chips.map((c) => (
              <span key={c} className="lv-btn">
                {c}
              </span>
            ))}
          </div>
        ) : null}
        {plan.order.length ? (
          <div className="lv-order">
            <div className="lv-lab">
              <span>Start sırası</span>
            </div>
            {plan.order.map((o, i) => (
              <div key={`${i}-${o.cls}-${o.grp}`} className="lv-r">
                <b>
                  {`${i + 1}. `}
                  <Dot g={o.grp} />
                  {planLabel(o)}
                </b>
                <span>{i === 0 && at && !nextDay ? at : ""}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
      {side ? (
        <div className="lv-stack lv-waitall">
          <Media key="wait" data={data} sel={null} starts={starts} isCur />
          <Overall data={data} hideEmpty />
        </div>
      ) : null}
    </div>
  );
}
// Genel sıralamada gösterilecek bir şey var mı (resmî PDF ya da bitmiş yarışlardan geçici)
function hasOverall(data) {
  if ((data.fleets || []).some((f) => f.rows?.some((r) => r.pts != null && r.pts !== ""))) return true;
  const year = +String(data.race?.startDate || "").slice(0, 4) || new Date().getFullYear();
  try {
    return provisional({ starts: data.starts || [], rounds: data.rounds || {}, entries: data.entries || [], groups: data.groups || {}, who: whoBySail(data.fleets), year }).length > 0;
  } catch {
    return false;
  }
}

// Gün özeti (gün bitince, ertesi gün ekran yeni güne geçene kadar): kaç yarış yapıldı, her yarışın birincisi, rüzgâr grafiği, genel sıralama
function Summary({ data, today }) {
  const plan = data.plan;
  const day = plan.day || today;
  const races = (data.starts || []).filter((x) => x.day === day && !x.void);
  const who = { ...whoBySail(data.fleets), ...Object.fromEntries((data.entries || []).map((r) => [r.sail, { name: r.name, club: r.club }])) };
  const wind = (data.wind || []).filter((w) => w.dir != null).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const kns = wind.map((w) => w.kn).filter((k) => k != null);
  const W = 600;
  const H = 120;
  const t0 = wind.length ? Date.parse(wind[0].at) : 0;
  const t1 = wind.length ? Date.parse(wind.at(-1).at) : 1;
  const kmax = Math.max(1, ...kns);
  const pts = wind.filter((w) => w.kn != null).map((w) => `${t1 > t0 ? ((Date.parse(w.at) - t0) / (t1 - t0)) * W : W / 2},${H - (w.kn / kmax) * (H - 10)}`);
  return (
    <div className="lv-waitgrid">
      <div className="lv-card lv-sum">
        <div className="lv-lab">
          <span>{`${dayText(day)} · Gün özeti`}</span>
          <span>{plan.next?.at ? `Yarın ilk start ${plan.next.at}` : ""}</span>
        </div>
        <div className="lv-sumn">
          <b>{races.length}</b>
          <span>yarış yapıldı</span>
        </div>
        {races.map((x) => {
          const e = data.rounds?.[x.id];
          const first = e ? standings(e)[0] : null;
          const w = first ? whoOf(who, first.sail) : null;
          return (
            <div key={x.id} className="lv-r">
              <b>
                <Dot g={e?.grp} />
                {[e?.cls, e?.grp, raceTitle(x)].filter(Boolean).join(" · ")}
              </b>
              <span>{first ? `1. ${first.sail}${w?.name ? ` ${w.name}` : ""}` : x.fin ? raceTime(x) || "Bitti" : hmOf(x.at)}</span>
            </div>
          );
        })}
        {wind.length ? (
          <div className="lv-sumw">
            <div className="lv-lab">
              <span>Rüzgâr</span>
              <span>{kns.length ? `${Math.min(...kns)}–${Math.max(...kns)} kn · ${dirShort(wind[0].dir)} → ${dirShort(wind.at(-1).dir)}` : dirShort(wind.at(-1).dir)}</span>
            </div>
            {pts.length > 1 ? (
              <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
                <polyline points={pts.join(" ")} fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
              </svg>
            ) : null}
            <div className="lv-sumt">
              <span>{hmOf(wind[0].at)}</span>
              <span>{hmOf(wind.at(-1).at)}</span>
            </div>
          </div>
        ) : null}
      </div>
      <div className="lv-stack lv-waitall">
        <Overall data={data} hideEmpty />
      </div>
    </div>
  );
}

const Dot = ({ g }) => (g ? <span className="lv-dot" style={{ background: groupColor(g) || "var(--lv-mut)" }} aria-hidden="true" /> : null);

// Aynı yarışın diğer grupları (Mavi 3. yarış, Sarı 3. yarış…): aynı gün, aynı yarış numarası
function Siblings({ data, sel, id }) {
  const sib = (data.starts || []).filter((x) => !x.void && x.day === sel?.day && x.n === sel?.n && data.rounds?.[x.id]?.grp);
  if (sib.length < 2) return null;
  return (
    <span className="lv-chips">
      {sib.map((x) => {
        const g = data.rounds[x.id].grp;
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

function Races({ id, starts, cur, sel, fleets, rounds, onClose }) {
  const list = [...starts].reverse();
  return (
    <div className="lv-pop" role="dialog" aria-label="Yarışlar" onClick={onClose}>
      <div className="lv-card lv-list" onClick={(e) => e.stopPropagation()}>
        <div className="lv-lab">
          <span>Yarışlar</span>
          <button type="button" className="lv-link" onClick={onClose}>
            Kapat
          </button>
        </div>
        {list.map((s) => {
          const off = officialFor(fleets, s.n).length > 0;
          const state = s.id === cur ? "Canlı" : s.void ? s.void : off ? "Resmî sonuç" : s.fin ? "Bitti" : "";
          return (
            <Link key={s.id} href={s.id === cur ? `/canli/${id}` : `/canli/${id}?y=${s.id}`} className={`lv-r${s.id === sel?.id ? " sel" : ""}`} onClick={onClose}>
              <b>
                {raceTitle(s)}
                {rounds?.[s.id]?.grp ? ` · ${rounds[s.id].grp}` : ""}
              </b>
              <span>
                {dayText(s.day)} · {hmOf(s.at)}
                {state ? ` · ${state}` : ""}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function LiveScreen({ id, y = "" }) {
  const { data, err, skew } = useData(id, y);
  const [list, setList] = useState(false);
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
  // Canlı görünüm: önceki yarış seçilmediyse (henüz start kaydı yokken de sayaç ve ekrandaki yayın görünür; Seyhun 2026-11-01 "süre başlattım gösterilmiyor")
  const isCur = !y || (!!sel && sel.id === data.cur);
  // Başlıkta sınıf, grup ve kaçıncı yarış (Seyhun 2026-11-01): "Optimist · Mavi grup · 3. yarış"
  const entry = sel ? data.rounds?.[sel.id] : null;
  const grp = entry?.grp || "";
  const title = sel ? [entry?.cls || "", grp ? `${grp} grup` : "", raceTitle(sel)].filter(Boolean).join(" · ") : data.race.name || "Yarış";
  const sub = [sel ? data.race.name : "", dayText(sel?.day || data.day), data.race.place].filter(Boolean).join(" · ");
  const ongoing = isCur && sel && !sel.fin && !sel.void;
  // Evre (lib/raceLive.js livePhase): bekleme (start saatine geri sayım) · yarış (sayaç ya da bugünkü start) · gün özeti
  const today = trDay(nowMs);
  const phase = isCur ? livePhase({ plan: data.plan, starts, timer: data.timer, today, now: nowMs }) : "race";
  const head = phase === "race" ? title : data.race.name || "Yarış";
  const headSub = phase === "race" ? sub : [dayText(today), data.race.place].filter(Boolean).join(" · ");
  // yarış evresinde sıradaki startlar (Yayın sayfası Başlat'ta yapılan startı program sırasından düşer)
  const upcoming = phase === "race" ? data.plan.order : [];
  return (
    <div className="lv">
      <Sea />
      <div className="lv-page">
        <header className="lv-head">
          {/* ince geri bağlantısı: açık yarışların listesine (Seyhun 2026-11-01 "göze batmayan bir geri") */}
          <Link href="/canli" className="lv-back" aria-label="Yarışlar">
            ‹
          </Link>
          <div className="lv-ttl">
            <b>{head}</b>
            <span>{headSub}</span>
          </div>
          {ongoing ? <span className="lv-live">Canlı</span> : null}
          {!isCur && data.cur ? (
            <Link href={`/canli/${id}`} className="lv-btn on">
              Canlı yarış
            </Link>
          ) : null}
          {starts.length > 1 || (!isCur && starts.length) ? (
            <button type="button" className="lv-btn" onClick={() => setList(true)}>
              Önceki yarışlar
            </button>
          ) : null}
        </header>
        {/* Üç sütun (Seyhun 2026-11-01 "geneli her zaman göstermek istiyorum"): solda sayaç, rüzgâr tek satır, (ekrandaki video), parkur
            sütunun sonuna kadar büyük; ortada günün yarışının sıralaması; sağda genel sıralama hep görünür, biraz küçük */}
        {phase === "wait" ? (
          <Waiting data={data} now={nowMs} today={today} starts={starts} />
        ) : phase === "summary" ? (
          <Summary data={data} today={today} />
        ) : (
          <div className="lv-grid">
            <div className="lv-stack lv-a">
              <Clock sel={sel} isCur={isCur} timer={data.timer} skew={skew} entry={entry} />
              {upcoming.length ? (
                <div className="lv-card lv-next">
                  <span>Sıradaki start</span>
                  <b>
                    <Dot g={upcoming[0].grp} />
                    {planLabel(upcoming[0])}
                  </b>
                  {upcoming.length > 1 ? <span>{`sonra ${upcoming.slice(1).map(planLabel).join(" · ")}`}</span> : null}
                </div>
              ) : null}
              <Wind data={data} sel={sel} isCur={isCur} />
              <Media key={sel?.id || "x"} data={data} sel={sel} starts={starts} isCur={isCur} />
              <Course data={data} route={routeOf(data, sel)} />
            </div>
            <div className="lv-stack lv-b">
              <Now data={data} sel={sel} isCur={isCur} />
              <Ranking key={sel?.id || "x"} data={data} sel={sel} isCur={isCur} id={id} />
            </div>
            <div className="lv-stack lv-c">
              <Overall data={data} />
            </div>
          </div>
        )}
      </div>
      {list ? <Races id={id} starts={starts} cur={data.cur} sel={sel} fleets={data.fleets} rounds={data.rounds} onClose={() => setList(false)} /> : null}
    </div>
  );
}
