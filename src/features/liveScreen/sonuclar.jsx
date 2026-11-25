"use client";
// Canlı ekranın Sonuçlar, Gruplar ve Program panelleri (Seyhun 2026-11-19 "Yönet'te ve ekranda da gösterelim"): tek bileşen; canlı ekran
// (LiveScreen) ve Bilgi Yönet aynısını kullanır. Veri /api/canli yanıtı (data). Açık zemin: .sc-res sarmalı (sahne.css)
import { Fragment, useCallback, useEffect, useState } from "react";
import { cleanPlan } from "@/lib/raceLive";
import { GROUP_PICK, catsOf, groupColor, groupMap, groupsOn, onlyCat, provisional } from "@/lib/roundScore";
import { clubName, shortClub, whoBySail } from "@/lib/raceRounds";
import { dayProgram } from "./program";
import "./sahne.css";

const trDay = (ms) => new Date(ms + 3 * 3600e3).toISOString().slice(0, 10); // Türkiye günü (sunucudaki gibi)
const dayText = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");
export const SC_RANK = 10;

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
// Ekranın günü: akşam "yeni güne geç" saatinden sonra yarın (sunucu data.see)
export const canliDay = (data, ms = Date.now()) => (data?.see && data.see > trDay(ms) ? data.see : trDay(ms));

// O günün yarışı (Seyhun 2026-11-19 Bilgi Yönet ve sporcu ekranı): canlı ekranı açık yarışlardan bugün süren, yoksa en yakını; veri /api/canli
// (herkese açık, sunucu okur; sporcu ekranı girişsiz). ms aralıkla tazelenir, sekme gizliyken sormaz
export function useCanliRace(on = true, ms = 60e3) {
  const [st, setSt] = useState({ id: "", data: null });
  const [n, setN] = useState(0);
  const reload = useCallback(() => setN((x) => x + 1), []);
  useEffect(() => {
    if (!on) return undefined;
    let live = true;
    let t = 0;
    let id = "";
    const load = async () => {
      clearTimeout(t);
      try {
        if (!document.hidden) {
          if (!id) {
            const j = await (await fetch("/api/canli", { cache: "no-store" })).json().catch(() => ({}));
            const list = Array.isArray(j?.list) ? j.list : [];
            id = (list.find((x) => x.today) || list[0])?.id || "";
          }
          if (id) {
            const res = await fetch(`/api/canli?id=${encodeURIComponent(id)}`, { cache: "no-store" });
            const j = await res.json().catch(() => ({}));
            if (live && res.ok && j?.race) setSt({ id, data: fillData(j) });
          }
        }
      } catch {}
      if (live) t = setTimeout(load, ms);
    };
    load();
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [on, ms, n]);
  return { ...st, reload };
}

// genel sıralama: resmî (PDF) ya da geçici; sınıf sınıf, yarış yarış puanlar
export function scBoards(data) {
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
// Bizim sporcular (Seyhun 2026-11-07 "bizim sporcularımız gruplarında en yukarıda"): kulübü Dikili olan
export const isOur = (club) => /dikili/.test(String(club || "").toLocaleLowerCase("tr"));
// Gruplarda arama: ad, kulüp ya da yelken no; her kelime geçmeli
export const grpHit = (x, q) => {
  const hay = [x.name, x.club, clubName(x.club), shortClub(x.club), x.sail].join(" ").toLocaleLowerCase("tr");
  return q.toLocaleLowerCase("tr").split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
};
// Program paneli: Start (günün start sırası), Talimat (yarış talimatındaki program); yalnız dolu olan sekmeler. Gruplar Sporcular düğmesinde (ScAthPanel)
export const PG_STATE = { done: "Bitti", now: "Yarışta", next: "Sıradaki" };
export function ScProgPanel({ prog, ag }) {
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
export function athGDay(data, day) {
  const all = data.groups || {};
  return Object.keys(all).filter((d) => d > day && Object.keys(groupMap(groupsOn(all, d))).length).sort().pop() || day;
}
// Kızlar / Junior / Bambino (Seyhun 2026-11-10 "kızları ayrı gösteriyorduk; bizim sporcuda kız varsa kızlardaki yeri gösterilmeli"):
// sporcunun kendi kategorisindeki yeri (onlyCat, yarış sayfasıyla aynı kural); hepsinde olan kategori (herkes Junior) yazılmaz
export const KAT_IN = { Kız: "Kızlarda", Junior: "Juniorda", Bambino: "Bambinoda" };
export const KAT_NAME = { Kız: "Kızlar", Junior: "Junior", Bambino: "Bambino" };
export function athKat(b, sail) {
  return (b.catList || []).map((c) => {
    const x = onlyCat(b.all, c).find((y) => String(y.sail) === String(sail));
    return x ? { c, place: x.place } : null;
  }).filter(Boolean);
}
export function scAth(data, day) {
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
export function athDays(data, b, r) {
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
export const athDayName = (d, today) => (d === today ? "Bugün" : d === trDay(Date.parse(`${today}T12:00:00Z`) - 864e5) ? "Dün" : d === trDay(Date.parse(`${today}T12:00:00Z`) + 864e5) ? "Yarın" : dayText(d));
export const GDot = ({ g }) => (g ? <i style={{ background: groupColor(g) || "#ffd23f" }} aria-hidden="true" /> : null);
export const athAt = (at, today) => {
  if (!at) return "";
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return "";
  const hm = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
  return `${trDay(d.getTime()) === today ? hm : `${dayText(trDay(d.getTime()))} ${hm}`} güncellendi`;
};
export const athRank = (p) => (p ? `${p}${/^\d+$/.test(String(p)) ? "." : ""}` : "");
// Sonuçlar paneli (Seyhun 2026-11-09 örnek "sade liste" onaylandı, "sekme adı ve başlık Sonuçlar, yanında en son güncelleme ve +"): satırda sıra,
// ad, altında grup (açıklanmış en yeni gün; yarınki açıklanınca yalnız o) + yelken no + kulüp; sağda puan, altında yarış dereceleri
export function ScAthPanel({ data, ath, day, onFull, res = false, onResult = null, resMsg = "" }) {
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
                <th>Ad Soyad</th>
                {(b.ra || []).map((h, i) => <th key={i} className="n">{h}</th>)}
                {hasP ? <th className="n">Net</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sail} className={r.our ? "our" : ""} onClick={() => setPick({ cls: b.cls, sail: r.sail })}>
                  {hasP ? <td className="p">{athRank(r.p)}</td> : null}
                  {/* ad; altında küçük ve ince grup · yelken no · kulüp (Seyhun 2026-11-19 "ismin altında küçük, ince; çok uzunsa …") */}
                  <td className="nm">
                    <b>
                      {r.name || r.sail}
                      {r.our && !fKat && r.kat?.length ? <em>{r.kat.map((k) => `${KAT_IN[k.c] || k.c} ${k.place}.`).join(" · ")}</em> : null}
                    </b>
                    <small>
                      {r.g ? <GDot g={r.g} /> : null}
                      {[r.g && (gdName === "Bugün" ? r.g : `${gdName} ${r.g}`), r.sail, clubName(r.club, 60)].filter(Boolean).join(" · ")}
                    </small>
                  </td>
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

// Gruplar (Seyhun 2026-11-19 örnek "Yönet › Gruplar"): açıklanmış en yeni günün (yarınki açıklanınca yarın) grupları; renk seçilir,
// üstte bizimkiler (her biri kendi grubunun rengiyle), altta seçili grubun listesi
export function ScGrpPanel({ data, day }) {
  const ath = scAth(data, day);
  const [ci, setCi] = useState(0);
  const [g0, setG] = useState("");
  const b = ath[Math.min(ci, ath.length - 1)];
  const rows = b ? b.rows.filter((r) => r.g) : [];
  const grs = [...new Set(rows.map((r) => r.g))].sort((x, y) => {
    const i = (g) => (GROUP_PICK.indexOf(g) < 0 ? 99 : GROUP_PICK.indexOf(g));
    return i(x) - i(y) || x.localeCompare(y, "tr");
  });
  const g = grs.includes(g0) ? g0 : grs[0] || "";
  const ours = rows.filter((r) => r.our);
  const list = rows.filter((r) => r.g === g && !r.our).sort((x, y) => Number(x.sail) - Number(y.sail) || x.sail.localeCompare(y.sail));
  const one = (r) => (
    <li key={r.sail} className={r.our ? "our" : ""}>
      <span className="t">{r.sail}</span>
      <GDot g={r.g} />
      <b>{r.name || r.sail}</b>
      <small>{clubName(r.club, 24)}</small>
    </li>
  );
  return (
    <div className="sc-pgl sc-grl">
      <div className="sc-vph">
        <b>Gruplar</b>
        {b && grs.length ? <small>{`${athDayName(b.gd, day)}${b.gd !== day ? ` · ${dayText(b.gd)}` : ""}`}</small> : null}
      </div>
      {ath.length > 1 ? (
        <div className="sc-vtabs" role="tablist">
          {ath.map((x, i) => (
            <button key={x.cls || i} type="button" role="tab" aria-selected={x === b} className={x === b ? "on" : ""} onClick={() => setCi(i)}>
              {x.cls || "Diğer"}
            </button>
          ))}
        </div>
      ) : null}
      {!grs.length ? (
        <p className="sc-vno">Gruplar henüz açıklanmadı</p>
      ) : (
        <>
          <div className="sc-pgg">
            {grs.map((x) => (
              <button key={x} type="button" className={x === g ? "on" : ""} aria-pressed={x === g} onClick={() => setG(x)}>
                <GDot g={x} />
                {x}
                <small>{rows.filter((r) => r.g === x).length}</small>
              </button>
            ))}
          </div>
          {ours.length ? (
            <>
              <p className="sc-pgd">Bizimkiler</p>
              <ul className="bt">{ours.map(one)}</ul>
            </>
          ) : null}
          <p className="sc-pgd">{`${g} grup`}</p>
          <ul className="bt">{list.map(one)}</ul>
        </>
      )}
    </div>
  );
}

// Sporcunun kendi satırı (Seyhun 2026-11-19 örnek, Bilgi sporcu ekranı): yelken numarasıyla genel sıra / kaç kişi, açıklanmış en yeni günün
// grubu ve o grubun sıradaki start saati (bugün yarış yoksa boş)
const digits = (v) => String(v || "").replace(/\D+/g, "");
export function mineOf(data, sail, ms) {
  const want = digits(sail) || String(sail || "").trim();
  if (!data || !want) return null;
  const day = canliDay(data, ms);
  for (const b of scAth(data, day)) {
    const r = b.rows.find((x) => (digits(x.sail) || x.sail) === want);
    if (!r) continue;
    const nx = r.g && b.gd === day ? dayProgram(data, day).find((x) => x.grp === r.g && (x.state === "next" || x.state === "now") && x.at) : null;
    return { p: r.p, n: b.rows.filter((x) => x.p !== "").length, g: r.g, gday: r.g ? athDayName(b.gd, day) : "", at: nx?.at || "", now: nx?.state === "now" };
  }
  return null;
}
