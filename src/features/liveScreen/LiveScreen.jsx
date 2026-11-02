"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apText, dirShort, livePhase, planLabel, planStartMs, raceTime, raceTitle, seqState, seqSteps } from "@/lib/raceLive";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { cleanCourse } from "@/lib/raceCourse";
import { manualFinish, markLabel, markName, nowPos, officialFor, prepName, sameSail, shortClub, shortName, standings, whoBySail, whoOf, ytSrc } from "@/lib/raceRounds";
import { groupColor, onlyCat, provisional } from "@/lib/roundScore";
import "./liveScreen.css";

// Herkese açık canlı yarış ekranı (/canli/<yarış>, Seyhun 2026-11-01; yayın görünümü 2026-11-02 SailGP örneği, project-files/samandira-donus/yayin4).
// Arka plan tam ekran: ekranda canlı yayın ya da tekrar varsa video, yoksa deniz zemini. Üstüne köşelerde ince paneller (Backdrop, Panel…):
// sol üst günün yarışının sıralaması (sıra, yelken, kısa ad, kulüp kısaltması; dokununca şamandıra şamandıra tam tablo), üst orta yarış adı + mesaj
// ("Şu an 2. şamandıra · Son geçen 305 E. Kara", tehir), sağ üst parkur, sol alt rüzgâr, alt orta sayaç ve bayraklar, sağ alt sıradaki start + genel ilk 5.
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
  return null;
}


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
const routeOf = (data, sel) => {
  const route = data.rounds?.[sel?.id]?.route || [];
  return route.length ? route.map((m) => (m === "F" ? "Finish" : m)).join(" · ") : sel?.course || "";
};

// Zemin (Seyhun 2026-11-01 "koyuluktan açıklığa, yarış parkuru havası"): üstte açık deniz mavisi, altta koyu lacivert; arkada soluk bir
// parkur (şamandıralar, kesik rota, start hattı) ve dalga dokusu. Yazılar öne çıksın diye hepsi çok soluk.
// Zemin: açıktan koyuya deniz, çok soluk dalga deseni; parkur çizgisi kaldırıldı (Seyhun 2026-11-01 "dandik parkur gibi")
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
    </div>
  );
}


// sağanak, 3 saatte bir saat ve yön, start saati işaretli, şimdi beyaz çizgi
function WindDay({ fc, now, at }) {
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
  const atRow = at ? rows.find((r) => r.hh === at.slice(0, 2)) : null;
  const lo = Math.min(...rows.map((r) => r.wind));
  const hi = Math.max(...rows.map((r) => r.wind));
  return (
    <div className="lv-fc">
      <div className="lv-lab">
        <span>Günün tahmini</span>
        <span>{atRow ? `Start'ta ${dirShort(atRow.dir)} ${atRow.wind} kn, sağanak ${atRow.gust ?? atRow.wind}` : `${lo}–${hi} kn`}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        {[5, 10, 15, 20, 25, 30].filter((v) => v < top && (top <= 30 || v % 10 === 0)).map((v) => (
          <line key={v} x1="0" x2={W} y1={y(v)} y2={y(v)} stroke="#fff" strokeOpacity=".1" />
        ))}
        <path d={area} fill="#fff" fillOpacity=".22" />
        <path d={line("wind")} fill="none" stroke="#fff" strokeWidth="2.5" strokeLinejoin="round" />
        <path d={line("gust")} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1.5" strokeDasharray="5 5" strokeLinejoin="round" />
        {startX != null ? <line x1={startX} x2={startX} y1={T - 8} y2={H - B} stroke="var(--lv-acc)" strokeWidth="2.5" /> : null}
        {nowX != null ? <line x1={nowX} x2={nowX} y1={T - 8} y2={H - B} stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" /> : null}
        {rows.map((r, i) =>
          +r.hh % 3 === 0 ? (
            <g key={r.hh}>
              <text x={x(i)} y={H - 6} fill="#fff" fillOpacity=".7" fontSize="13" textAnchor="middle">{`${+r.hh}`}</text>
              <text x={x(i)} y={y(r.wind) - 10} fill="#fff" fontSize="13" fontWeight="700" textAnchor="middle">{r.wind}</text>
              <g transform={`translate(${x(i)} 12) rotate(${r.dir ?? 0})`}>
                <path d="M0 -6 L4 4 L0 2 L-4 4 Z" fill="#fff" fillOpacity=".8" />
              </g>
            </g>
          ) : null,
        )}
      </svg>
      <div className="lv-sumt">
        <span>Dolu çizgi rüzgâr · kesik çizgi sağanak</span>
        {at ? <span className="lv-acc">{`Start ${at}`}</span> : null}
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
  return (
    <>
      <Sea />
      {st && show ? (
        <div className={`lv-bg ${st}`} aria-hidden="true">
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
const RANK_MAX = 10;

// Sol üst: günün yarışının sıralaması (SailGP listesi gibi kısa satırlar); dokununca tam tablo (şamandıra şamandıra sıralar)
function RankPanel({ data, sel, isCur, id, onAll }) {
  const entry = data.rounds?.[sel?.id] || { route: [], legs: [] };
  const who = whoMap(data);
  const st = standings(entry);
  const g = sel?.n ? officialFor(data.fleets, sel.n, manualFinish(entry))[0] : null;
  const pos = nowPos(entry);
  const route = entry.route || [];
  const last = isCur && pos >= 0 ? entry.legs[pos].at(-1) : "";
  const rows = g
    ? g.rows.map((r) => ({ p: r.place || r.code, sail: r.sail.replace(/^\D+/, "") || r.sail, name: r.name, club: r.club }))
    : st.map((x, i) => {
        const w = whoOf(who, x.sail);
        return { p: i + 1, sail: x.sail, name: w?.name || "", club: w?.club || "", isNew: x.sail === last };
      });
  const leg = g ? "Resmî" : pos >= 0 ? (route[pos] === "F" && pos === route.length - 1 ? "Finish" : `${markName(route[pos])} · ${pos + 1}/${route.length}`) : route.length ? route.map(markLabel).join(" · ") : "";
  return (
    <Panel cls="lv-rankp" head={<><Dot g={entry.grp} />{[entry.grp ? `${entry.grp} grup` : "", sel ? raceTitle(sel) : "Sıralama"].filter(Boolean).join(" · ")}</>} right={leg} onClick={rows.length ? onAll : undefined} label="Tam sıralama">
      {rows.length ? (
        <ol className="lv-rl">
          {rows.slice(0, RANK_MAX).map((r) => (
            <li key={`${r.sail}${r.name}`} className={r.isNew ? "new" : ""}>
              <b>{r.p}</b>
              <i>{r.sail}</i>
              <span>{shortName(r.name) || ""}</span>
              <em>{shortClub(r.club)}</em>
            </li>
          ))}
        </ol>
      ) : (
        <div className="lv-pe">{isCur ? "İlk şamandıra dönüşüyle sıralama burada başlar" : "Dönüş yazılmadı"}</div>
      )}
      {rows.length > RANK_MAX ? <div className="lv-pm">{`+${rows.length - RANK_MAX} tekne · Tümü`}</div> : null}
      <Siblings data={data} sel={sel} id={id} />
    </Panel>
  );
}

// Bekleme evresinde sol üst: bugünün startları (sıra, sınıf, grup, ilk startın saati) ve kaç tekne / sınıf / grup
function PlanPanel({ data, today }) {
  const plan = data.plan;
  const entries = data.entries || [];
  const classes = [...new Set(entries.map((e) => e.cls).filter(Boolean))];
  const planDay = plan.status === "done" && plan.next ? plan.next.day : plan.day || today;
  const grpList = (data.groups?.[planDay] || []).map((x) => x[1]);
  const groups = [...new Set((grpList.length ? grpList : plan.order.map((o) => o.grp)).filter(Boolean))];
  const at = plan.status === "done" && plan.next ? plan.next.at : plan.at;
  const nextDay = planDay && planDay > today;
  const chips = [entries.length ? `${entries.length} tekne` : "", classes.length > 1 ? `${classes.length} sınıf` : classes[0] || "", groups.length ? `${groups.length} grup` : ""].filter(Boolean);
  if (!plan.order.length && !chips.length) return null;
  return (
    <Panel cls="lv-rankp" head={nextDay ? `${dayText(planDay)} startları` : "Bugünün startları"} right={plan.order.length ? `${plan.order.length} start` : ""}>
      {plan.order.length ? (
        <ol className="lv-rl">
          {plan.order.map((o, i) => (
            <li key={`${i}-${o.cls}-${o.grp}`} className="w">
              <b>{i + 1}</b>
              <span>
                <Dot g={o.grp} />
                {planLabel(o) || "Start"}
              </span>
              <em>{i === 0 && at ? at : ""}</em>
            </li>
          ))}
        </ol>
      ) : (
        <div className="lv-pe">Start sırası henüz yazılmadı</div>
      )}
      {chips.length ? <div className="lv-pm">{chips.join(" · ")}</div> : null}
    </Panel>
  );
}

// Üst orta: yarış adı, yer ve tarih; altında mesaj şeridi (yarışta sınıf · grup · kaçıncı yarış ve "Şu an 2. şamandıra · Son geçen 305 E. Kara";
// beklemede ilk start ya da tehir; gün sonunda özet)
function MsgStrip({ data, sel, isCur, id, phase, today, ongoing, starts, onList }) {
  const plan = data.plan;
  const entry = sel ? data.rounds?.[sel.id] : null;
  const route = entry?.route || [];
  const pos = entry ? nowPos(entry) : -1;
  const last = isCur && pos >= 0 ? entry.legs[pos].at(-1) : "";
  const who = last ? whoOf(whoMap(data), last) : null;
  let line = "";
  let note = "";
  if (phase === "race") {
    line = sel ? [entry?.cls || "", entry?.grp ? `${entry.grp} grup` : "", raceTitle(sel)].filter(Boolean).join(" · ") : plan.order[0] ? `Sıradaki start · ${planLabel(plan.order[0])}` : "Yarış günü";
    note = pos >= 0 ? `${pos === route.length - 1 && route[pos] === "F" ? "Finish" : `Şu an ${markName(route[pos])}`} · Son geçen ${last}${who?.name ? ` ${shortName(who.name)}` : ""}` : sel?.fin ? "Yarış bitti" : "";
  } else if (phase === "wait") {
    const planDay = plan.status === "done" && plan.next ? plan.next.day : plan.day || today;
    const at = plan.status === "done" && plan.next ? plan.next.at : plan.at;
    const nextDay = planDay > today;
    if (plan.status === "none" && plan.day === today) line = "Bugün yarış yok";
    else if (plan.status === "ap") line = `Start ertelendi · ${apText(plan)}`;
    else line = at ? `${nextDay ? dayText(planDay) : "Bugün"} ilk start ${at}` : "Start saati henüz belli değil";
    note = plan.status === "ap" ? "" : plan.order.length ? `${plan.order.length} start` : "";
  } else {
    const races = starts.filter((x) => x.day === (plan.day || today) && !x.void);
    line = `${dayText(plan.day || today)} · Gün bitti · ${races.length} yarış`;
    note = plan.next?.at ? `Yarın ilk start ${plan.next.at}` : "";
  }
  return (
    <div className="lv-msg2">
      <div className="lv-msgh">
        <Link href="/canli" className="lv-back" aria-label="Yarışlar">
          ‹
        </Link>
        <b>{data.race.name || "Yarış"}</b>
        <span>{[data.race.place, dayText(sel?.day || data.day || today)].filter(Boolean).join(" · ")}</span>
        {ongoing ? <span className="lv-live">Canlı</span> : null}
        {!isCur && data.cur ? (
          <Link href={`/canli/${id}`} className="lv-btn on">
            Canlı yarış
          </Link>
        ) : null}
        {starts.length > 1 || (!isCur && starts.length) ? (
          <button type="button" className="lv-btn" onClick={onList}>
            Önceki yarışlar
          </button>
        ) : null}
      </div>
      <div className={`lv-msgb${plan.status === "ap" && phase === "wait" ? " ap" : ""}`}>
        <b>{line}</b>
        {note ? <span>{note}</span> : null}
      </div>
    </div>
  );
}

// Sağ üst: parkur (günün ölçümlerinden, lib/courseCard.js), başlıkta rota; dokununca büyük. Ölçüm yoksa panel yok (video temiz kalsın).
function CoursePanel({ data, route }) {
  const svg = useMemo(() => cardSvg(cardOf(cleanCourse(data.course || {})), { navy: true }), [data.course]);
  const [big, setBig] = useState(false);
  const st = useFade(!!svg);
  if (!st) return null;
  return (
    <>
      <Panel cls={`lv-coursep ${st}`} head="Parkur" right={route} onClick={() => setBig(true)} label="Parkuru büyüt">
        <div className="lv-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      </Panel>
      {big ? (
        <div className="lv-pop lv-big" onClick={() => setBig(false)} role="dialog" aria-label="Parkur">
          <div className="lv-cflat" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      ) : null}
    </>
  );
}

// Sol alt: rüzgâr. Yarışta son ölçüm (ok, derece, yön, hız, sağanak); beklemede günün tahmini grafiği (WindDay); gün sonunda günün ölçümleri çizgi.
function WindPanel({ data, sel, isCur, phase, now, today }) {
  const obs = (data.course?.obs || []).filter((o) => o.kind === "wind").map((o) => ({ at: o.at, dir: o.deg, kn: o.kn, gust: null }));
  const upto = !isCur && sel ? sel.fin || sel.at : "";
  const all = [...(data.wind || []), ...obs].filter((x) => x.dir != null && (!upto || x.at <= upto)).sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const w = !isCur && sel?.dir != null ? { at: sel.at, dir: sel.dir, kn: sel.kn, gust: null } : all.at(-1);
  const plan = data.plan;
  const at = plan.status === "done" && plan.next ? "" : plan.at;
  const kns = all.map((x) => x.kn).filter((k) => k != null);
  const W = 600;
  const H = 110;
  const t0 = all.length ? Date.parse(all[0].at) : 0;
  const t1 = all.length ? Date.parse(all.at(-1).at) : 1;
  const kmax = Math.max(1, ...kns);
  const pts = all.filter((x) => x.kn != null).map((x) => `${t1 > t0 ? ((Date.parse(x.at) - t0) / (t1 - t0)) * W : W / 2},${H - (x.kn / kmax) * (H - 10)}`);
  const head = w ? (
    <span className="lv-wv">
      <span className="lv-arrow" aria-hidden="true">
        <svg viewBox="0 0 40 40" style={{ transform: `rotate(${w.dir}deg)` }}>
          <path d="M20 4 L27 22 L20 17 L13 22 Z" fill="#fff" />
          <line x1="20" y1="17" x2="20" y2="36" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </span>
      <b>{`${w.dir}°`}</b>
      <span>{`${dirShort(w.dir)}${w.kn != null ? ` · ${w.kn} kn` : ""}${w.gust ? ` · sağanak ${w.gust}` : ""}`}</span>
    </span>
  ) : null;
  const showFc = phase === "wait" && (data.forecast?.rows || []).length > 0;
  const showLine = phase === "summary" && pts.length > 1;
  const st = useFade(!!w || showFc);
  if (!st) return null;
  return (
    <Panel cls={`lv-windp${showFc ? " fc" : ""} ${st}`} head="Rüzgâr" right={w ? hmOf(w.at) : data.forecast?.place ? `Tahmin · ${data.forecast.place}` : ""}>
      {head}
      {showFc ? <WindDay fc={data.forecast} now={now} at={at} /> : null}
      {showLine ? (
        <div className="lv-sumw">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
            <polyline points={pts.join(" ")} fill="none" stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
          </svg>
          <div className="lv-sumt">
            <span>{hmOf(all[0].at)}</span>
            <span>{kns.length ? `${Math.min(...kns)}–${Math.max(...kns)} kn` : ""}</span>
            <span>{hmOf(all.at(-1).at)}</span>
          </div>
        </div>
      ) : null}
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

// Sağ alt: sıradaki start (yarışta), altında genel sıralamanın ilk beşi (gün sonunda genel sol üstte, yarışlar ortada)
function SidePanel({ data, phase, today, onAll }) {
  const plan = data.plan;
  const up = phase === "race" ? plan.order : [];
  return (
    <div className="lv-side">
      {up.length ? (
        <Panel cls="lv-nextp" head="Sıradaki start" right={up.length > 1 ? `+${up.length - 1}` : ""}>
          <b>
            <Dot g={up[0].grp} />
            {planLabel(up[0]) || "Start"}
          </b>
          {up.length > 1 ? <span>{`sonra ${up.slice(1, 3).map(planLabel).join(" · ")}`}</span> : null}
        </Panel>
      ) : null}
      {phase !== "summary" ? <OverallPanel data={data} onAll={onAll} /> : null}
    </div>
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
      <div className="lv-sumbig">
        <b>{races.length}</b>
        <span>
          {races.length === 1 ? "yarış yapıldı" : "yarış yapıldı"}
          <small>{[dayText(day), data.race.name].filter(Boolean).join(" · ")}</small>
        </span>
      </div>
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
                    {[e?.cls, e?.grp].filter(Boolean).join(" · ") || "Yarış"}
                  </b>
                  <span>{raceTitle(x)}</span>
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
                  <div className="lv-pe">{x.fin ? raceTime(x) || "Bitti" : hmOf(x.at)}</div>
                )}
              </div>
            );
          })}
        </div>
      ) : null}
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
  const { data, err, skew } = useData(id, y);
  const [list, setList] = useState(false);
  const [full, setFull] = useState(""); // "race" | "all": tam liste penceresi
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
  const entry = sel ? data.rounds?.[sel.id] : null;
  const ongoing = isCur && sel && !sel.fin && !sel.void;
  // Evre (lib/raceLive.js livePhase): bekleme (start saatine geri sayım) · yarış (sayaç ya da bugünkü start) · gün özeti
  const today = trDay(nowMs);
  const phase = isCur ? livePhase({ plan: data.plan, starts, timer: data.timer, today, now: nowMs }) : "race";
  const hasVideo = isCur && (data.screen?.kind === "live" || data.screen?.kind === "rec");
  const hasCourse = (data.course?.obs || []).length > 0;
  // Yayın görünümü (Seyhun 2026-11-02): arka plan tam ekran video ya da deniz; köşelerde paneller, alt ortada sayaç.
  // Düzen durumları (video / course / pause / evre) sınıf olarak: videosuzken sayaç ortada büyük, video gelince alta kayar (CSS geçişi);
  // parkur ve rüzgâr panelleri girip çıkarken solar (useFade); duraklatılınca görüntü kalır, önünde "Yayına ara verildi".
  return (
    <div className={`lv lv-bc${hasVideo ? " video" : ""}${hasCourse ? " course" : ""}${hasVideo && data.screen?.pause ? " pause" : ""} ${phase}`}>
      <Backdrop data={data} isCur={isCur} />
      <div className="lv-page lv-ov">
        <MsgStrip data={data} sel={sel} isCur={isCur} id={id} phase={phase} today={today} ongoing={ongoing} starts={starts} onList={() => setList(true)} />
        {phase === "wait" ? <PlanPanel data={data} today={today} /> : phase === "summary" ? <OverallPanel data={data} n={RANK_MAX} cls="lv-rankp" onAll={() => setFull("all")} /> : <RankPanel data={data} sel={sel} isCur={isCur} id={id} onAll={() => setFull("race")} />}
        <CoursePanel data={data} route={routeOf(data, sel)} />
        <WindPanel data={data} sel={sel} isCur={isCur} phase={phase} now={nowMs} today={today} />
        {phase === "summary" ? <SummaryHero data={data} today={today} /> : null}
        <Clock sel={phase === "race" ? sel : null} isCur={isCur} timer={phase === "race" ? data.timer : null} skew={skew} entry={entry} data={data} today={today} />
        <SidePanel data={data} phase={phase} today={today} onAll={() => setFull("all")} />
      </div>
      {list ? <Races id={id} starts={starts} cur={data.cur} sel={sel} fleets={data.fleets} rounds={data.rounds} onClose={() => setList(false)} /> : null}
      {full ? <FullList kind={full} data={data} sel={sel} isCur={isCur} id={id} onClose={() => setFull("")} /> : null}
    </div>
  );
}
