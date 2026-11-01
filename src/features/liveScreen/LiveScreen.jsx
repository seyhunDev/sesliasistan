"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { dirShort, momentRaceName, raceTime, raceTitle, seqState, seqSteps } from "@/lib/raceLive";
import { cardOf, cardSvg } from "@/lib/courseCard";
import { cleanCourse } from "@/lib/raceCourse";
import { manualFinish, markLabel, nowPos, officialFor, recTitle, sameSail, standings, whoBySail, whoOf, ytId } from "@/lib/raceRounds";
import { groupColor, onlyCat, provisional } from "@/lib/roundScore";
import "./liveScreen.css";

// Herkese açık canlı yarış ekranı (/canli/<yarış>, Seyhun 2026-11-01; örnek project-files/yaris-canli-ekran).
// Solda sayaç ve ekranda oynayan (canlı yayın ya da tekrar), ortada tek sıralama listesi (genel sıra, yelken, ad, kulüp, her şamandıradaki sırası),
// sağda rüzgâr ve parkur kartı. Grup grup yarışta (Mavi, Sarı…) startın grubu ve aynı yarışın diğer grupları; altta genel sıralama
// (geçici: grupların yarışları toplanır, Kızlar/Junior; resmî PDF gelince ondan). Resmî sonuç (PDF) gelince liste ondan dizilir, elle finişten farklıysa "Elle 6". Önceki yarışlar ?y=<start>.
const POLL = 4000;
const pad = (n) => String(n).padStart(2, "0");
const clockOf = (sec) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  return h ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
};
const hmOf = (iso) => (iso ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "");
const dayText = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");

function Mark() {
  return (
    <svg className="lv-logo" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="lvg" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#ff3d77" />
          <stop offset="1" stopColor="#ff9a4d" />
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="23" fill="url(#lvg)" />
      <path d="M20 54 C27 54 28 34 35 34 C43 34 42 70 50 70 C58 70 57 30 65 30 C72 30 73 50 80 50" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
    </svg>
  );
}

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
function Clock({ sel, isCur, timer, skew }) {
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
  return (
    <div className="lv-card lv-cd">
      <div className="lv-lab">
        <span>{label || "Sayaç"}</span>
        <span>{right}</span>
      </div>
      <div className="lv-clock">{value}</div>
      <div className="lv-seq">
        {steps.map((x, i) => (
          <div key={x.m} className={st[i]}>
            <b>{x.m}</b>
            {x.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function Media({ data, sel, starts, isCur }) {
  const [pick, setPick] = useState(null); // izleyicinin kendi seçtiği (ekrandakinin yerine)
  // canlı yarışta o günün çekimleri, önceki yarışta yalnız o yarışınkiler
  const items = useMemo(() => (data.media || []).filter((m) => (isCur ? (m.rid ? m.rid === sel?.id : m.at.slice(0, 10) === (sel?.day || data.day)) : m.rid === sel?.id)), [data.media, sel, data.day, isCur]);
  const scr = isCur ? data.screen || {} : {};
  const yt = ytId(data.stream?.url);
  const onScreen = scr.kind === "rec" ? (data.media || []).find((m) => m.id === scr.mid) : null;
  const show = pick || (scr.kind === "live" && yt ? { live: true } : onScreen);
  if (!show && !items.length) return null;
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
        <div className="lv-screen">
          {show.live ? (
            <iframe title="Canlı yayın" src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&playsinline=1&rel=0`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          ) : show.kind === "video" ? (
            <video key={show.id} src={show.url} poster={show.thumb || undefined} autoPlay muted playsInline controls loop={pick ? false : !!scr.loop} />
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
  if (!w) return null;
  return (
    <div className="lv-card lv-wind">
      <div className="lv-lab">
        <span>Rüzgâr</span>
        <span>{hmOf(w.at)}</span>
      </div>
      <div className="lv-wv">
        <b>{w.dir}°</b>
        <span>
          {dirShort(w.dir)}
          {w.kn != null ? ` · ${w.kn} kn` : ""}
        </span>
      </div>
      {w.gust ? <div className="lv-sub">Sağanak {w.gust} kn</div> : null}
    </div>
  );
}

function Course({ data, sel }) {
  const svg = useMemo(() => cardSvg(cardOf(cleanCourse(data.course || {}))), [data.course]);
  if (!svg) return null;
  return (
    <div className="lv-card lv-course">
      <div className="lv-lab">
        <span>Parkur</span>
        <span>{sel?.course || ""}</span>
      </div>
      <div className="lv-svg" dangerouslySetInnerHTML={{ __html: svg }} />
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
        ) : route.length ? (
          <span>Parkur {route.map((m) => (m === "F" ? "Finish" : m)).join(" · ")}</span>
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
      {!g && !st.length ? <div className="lv-empty">Henüz dönüş yok</div> : null}
    </div>
  );
}

// Genel sıralama: resmî sonuç (PDF) varsa ondan; yoksa geçici, bütün grupların yarışları toplanarak (lib/roundScore.js:
// grup içi sıra puan, eşitlikte birincilik sayısı, sonra son yarış). Kızlar ve Junior kendi içinde.
function Overall({ data }) {
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
  if (!prov.length) return null;
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
            {f.races.map((n) => (
              <th key={n} className="m">{`Y${n}`}</th>
            ))}
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
              {f.races.map((n) => (
                <td key={n} className="m">
                  {r.sc[n] ? (
                    <>
                      <Dot g={r.sc[n].grp} />
                      {r.sc[n].code || r.sc[n].pts}
                    </>
                  ) : (
                    ""
                  )}
                </td>
              ))}
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
  if (!data) {
    return (
      <div className="lv">
        <div className="lv-page">
          {err ? <div className="lv-msg">{err === "yok" ? "Bu yarışın canlı ekranı açık değil." : "Bağlanılamadı, yeniden deneniyor."}</div> : <div className="lv-msg lv-mut">Yükleniyor</div>}
        </div>
      </div>
    );
  }
  const starts = data.starts || [];
  const sel = (y && starts.find((x) => x.id === y)) || starts.find((x) => x.id === data.cur) || null;
  const isCur = !!sel && sel.id === data.cur;
  const title = sel ? raceTitle(sel) : data.race.name || "Yarış";
  const sub = [sel ? data.race.name : "", dayText(sel?.day || data.day), data.race.place].filter(Boolean).join(" · ");
  const ongoing = isCur && sel && !sel.fin && !sel.void;
  return (
    <div className="lv">
      <div className="lv-page">
        <header className="lv-head">
          <Mark />
          <div className="lv-ttl">
            <b>{title}</b>
            <span>{sub}</span>
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
        <div className="lv-grid">
          <div className="lv-stack lv-a">
            <Clock sel={sel} isCur={isCur} timer={data.timer} skew={skew} />
            <Media key={sel?.id || "x"} data={data} sel={sel} starts={starts} isCur={isCur} />
          </div>
          <div className="lv-stack lv-b">
            <Ranking key={sel?.id || "x"} data={data} sel={sel} isCur={isCur} id={id} />
            <Overall data={data} />
          </div>
          <div className="lv-stack lv-c">
            <Wind data={data} sel={sel} isCur={isCur} />
            <Course data={data} sel={sel} />
          </div>
        </div>
      </div>
      {list ? <Races id={id} starts={starts} cur={data.cur} sel={sel} fleets={data.fleets} rounds={data.rounds} onClose={() => setList(false)} /> : null}
    </div>
  );
}
