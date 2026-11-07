"use client";

// Yarış takip (Seyhun 2026-11-05 "yarış detay sayfasını yarış takip sayfasına çevirelim; duyurular, talimatlar, sonuçlar gösterilsin,
// yeni gelen varsa bildirim olsun ve gösterilsin"; örnek yaris-detay-sade/yaris-takip-ornek.png onaylı): yarış sayfasının ilk sekmesi.
// Siteden gelen belgeler (raceSite.js watchSiteDocs; işleme, görüldü yazma ve Geri al SiteDocs'ta kalır, "Tüm belgeler" altında)
// en üstte Günün özeti (Dün | Bugün), sonra Sonuçlar (bizim sporcuların sırası + sonuç belgeleri), Gruplar (renk listesi, final grupları),
// Duyurular (sporcu listesi, diğer),
// Talimatlar (talimat, ek talimat, program). Görülmemiş belge "Yeni"; bildirim (sunucu notifyDocs) bu sekmeyi açar (?sec=site).
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PdfViewer } from "@/components/ui/PdfViewer";
import { ListHead, Tag } from "@/components/ui/Row";
import { Seg } from "@/components/ui/Page";
import { todayStr } from "@/lib/utils/format";
import { windName } from "@/features/weather/weather";
import { loadLive } from "./raceLiveStore";
import { loadRaceDay } from "./raceWeather";
import { Icon } from "@/components/ui/Icon";
import { ourPlaces } from "@/lib/raceDay";
import { cleanSchedule, currentAmend, kindLabel, resultState, version } from "@/lib/siteDocs";
import { GROUP_PICK, groupColor } from "@/lib/roundScore";
import { siteDocBlob, watchEntryDoc, watchSiteDocs } from "./raceSite";

const RULES = ["notice", "amend", "program"];
const GROUPS = ["groups", "fleets"];
const when = (at) => {
  const d = new Date(`${String(at).slice(0, 10)}T12:00:00`);
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${String(at).slice(11, 16)}`.trim();
};
// "Optimist / 120 · Gümüş 5. · Junior 4."
const subOf = (x) => [x.n ? `${x.cls} / ${x.n}` : x.cls, x.grp && x.fp && `${x.grp} ${x.fp}.`, x.cp && `${x.cat} ${x.cp}.`, x.gp && `Kızlar ${x.gp}.`].filter(Boolean).join(" · ");

// Satırın sağındaki kısa işaret: sonuçta geçici/kesin, ek talimatta sürüm
const markOf = (d) => (d.kind === "results" ? ({ kesin: "kesin", gecici: "geçici" })[resultState(d.name)] || "" : d.kind === "amend" && version(d.name) ? `V${version(d.name)}` : "");

// Sporcu listesi grupları da getirdiyse (Optimist'te ilk günün grupları) Gruplar'da
const grpDoc = (d) => d.kind === "entries" && /grubu/.test(d.note || "");
export function trackGroups(docs) {
  const list = [...(docs || [])].sort((a, b) => String(b.at).localeCompare(String(a.at))); // yeni önce
  return {
    results: list.filter((d) => d.kind === "results"),
    groups: list.filter((d) => GROUPS.includes(d.kind) || grpDoc(d)),
    news: list.filter((d) => d.kind !== "results" && !RULES.includes(d.kind) && !GROUPS.includes(d.kind) && !grpDoc(d)),
    rules: list.filter((d) => RULES.includes(d.kind)),
  };
}

// cur: geçerli ek talimat (eskileri soluk, "eski"); alt satırda belgenin ne getirdiği (sunucunun notu: "İlk start 11:00 → 12:00", "45 teknenin grubu")
const dayName = (day) => new Date(`${day}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
// Gösterilecek grup günü: bugünün grubu, yoksa ilk gelecek gün, yoksa son gün
export function groupDay(groups, today) {
  const days = Object.keys(groups || {}).filter((d) => groups[d]?.length).sort();
  return days.includes(today) ? today : days.find((d) => d > today) || days.at(-1) || "";
}
// Günün grupları (Seyhun 2026-11-07 "gruplar açıklandı ama göremiyorum; her eklendiğinde güncellenmeli"): kayıt listesindeki grup
// listesi canlı (raceSite.watchEntryDoc); grup başına tekne sayısı, bizim sporcuların grubu
function GroupsNow({ e, chosen }) {
  const day = e ? groupDay(e.groups, todayStr()) : "";
  if (!day) return null;
  const list = e.groups[day];
  const count = {};
  for (const [, g] of list) count[g] = (count[g] || 0) + 1;
  const rank = (g) => GROUP_PICK.indexOf(g) + 1 || 99;
  const gs = Object.keys(count).sort((a, b) => rank(a) - rank(b));
  const bySail = new Map(list);
  const ours = chosen.map((a) => ({ id: a.id, name: a.studentName, g: bySail.get(String(a.sailNo || "").replace(/\D/g, "")) })).filter((x) => x.g);
  return (
    <>
      <div className="border-t border-line py-3 first:border-t-0">
        <small className="block text-[0.8125rem] text-mut">{dayName(day)} grupları · {list.length} tekne</small>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {gs.map((g) => (
            <span key={g} className="inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold">
              <i className="size-2.5 rounded-full" style={{ background: groupColor(g) || "currentColor" }} aria-hidden="true" />
              {g} <span className="font-normal text-mut tabular-nums">{count[g]}</span>
            </span>
          ))}
        </div>
      </div>
      {ours.map((x) => (
        <div key={x.id} className="flex min-h-[3rem] items-center gap-2 border-t border-line py-2">
          <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{x.name}</span>
          <i className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(x.g) || "currentColor" }} aria-hidden="true" />
          <b className="shrink-0 text-[0.9375rem] font-semibold">{x.g}</b>
        </div>
      ))}
    </>
  );
}
// Program (Seyhun 2026-11-07 "yarış talimatında program var, onu kullanalım"): talimat ve ek talimatlardan (race.notice.schedule),
// bugün ve sonrası; yarış bittiyse hepsi. Gün başına bir satır.
export function programDays(schedule, today) {
  const rows = cleanSchedule(schedule);
  const by = new Map();
  for (const r of rows) by.set(r.date, [...(by.get(r.date) || []), r]);
  const days = [...by.keys()].sort();
  const next = days.filter((d) => d >= today);
  return (next.length ? next : days).map((d) => [d, by.get(d).sort((a, b) => (a.time || "99").localeCompare(b.time || "99"))]);
}
function ProgramRows({ schedule }) {
  const today = todayStr();
  return programDays(schedule, today).map(([d, items]) => (
    <div key={d} className="flex gap-3 border-t border-line py-3 first:border-t-0">
      <span className={`w-[4.75rem] shrink-0 text-[0.8125rem] ${d === today ? "font-semibold text-acc" : "text-mut"}`}>{d === today ? "Bugün" : dayName(d)}</span>
      <span className="min-w-0 flex-1 text-[0.9375rem]">{items.map((x) => [x.time, x.title].filter(Boolean).join(" ")).join(" · ")}</span>
    </div>
  ));
}

function DocRows({ list, onOpen, cur = null }) {
  return list.map((d) => {
    const old = d.kind === "amend" && cur && d.id !== cur.id;
    const mark = old ? "eski" : markOf(d);
    return (
      <button key={d.id} type="button" data-press="row" onClick={() => onOpen(d)} className={`flex min-h-[3.5rem] w-full items-center gap-2 border-t border-line py-2 text-left first:border-t-0 ${old ? "opacity-55" : ""}`}>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{d.name}</b>
          <small className="block truncate text-[0.8125rem] text-mut">{[kindLabel(d.kind), when(d.at), d.state === "used" && d.note && d.note !== "Yarış ilanı" ? d.note : ""].filter(Boolean).join(" · ")}</small>
        </span>
        {!d.seen && <Tag tone="gen">Yeni</Tag>}
        {mark && <span className="shrink-0 rounded-full bg-bg px-2 py-0.5 text-[0.75rem] font-semibold text-mut">{mark}</span>}
        <Icon name="chev" className="size-4 shrink-0 text-mut/60" />
      </button>
    );
  });
}

const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
const dayOfIso = (iso) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
const dirOf = (degs) => {
  if (!degs.length) return "";
  const x = degs.reduce((a, d) => a + Math.cos((d * Math.PI) / 180), 0);
  const y = degs.reduce((a, d) => a + Math.sin((d * Math.PI) / 180), 0);
  return windName((Math.atan2(y, x) * 180) / Math.PI)[1];
};

// Günün özeti (Seyhun 2026-11-05 "ne zaman yarışlar başladı, kısa bir özet; dünün özeti, bugünün özeti; rüzgâr durumu"; örnek
// yaris-takip-ozet-ornek.png onaylı). Satırlar [ad, yazı]; olmayan satır yazılmaz.
// starts: raceLive.starts; wind: raceLive.wind (ölçülen); fc: o günün saatlik tahmini (ölçüm yoksa 10–17 arası); docs: siteden belgeler
export function daySummary({ day, starts = [], wind = [], fc = null, docs = [], results = null, places = [] }) {
  const lines = [];
  const races = starts.filter((x) => x.day === day && !x.void && x.at).sort((a, b) => a.at.localeCompare(b.at));
  if (races.length) lines.push(["Yarışlar", `${races.length} yarış · ilk start ${hm(races[0].at)}${races.length > 1 ? `, son ${hm(races.at(-1).at)}` : ""}`]);
  const ws = wind.filter((w) => w.at && w.kn != null && dayOfIso(w.at) === day);
  if (ws.length) {
    const k = ws.map((w) => +w.kn);
    const lo = Math.min(...k);
    const hi = Math.max(...k);
    lines.push(["Rüzgâr", [dirOf(ws.filter((w) => w.dir != null).map((w) => +w.dir)), `${lo === hi ? lo : `${lo}–${hi}`} kn`, `${ws.length} ölçüm`].filter(Boolean).join(" · ")]);
  } else if (fc?.length) {
    const hrs = fc.filter((h) => +h.hh >= 10 && +h.hh <= 17 && h.wind != null);
    if (hrs.length) {
      const lo = Math.round(Math.min(...hrs.map((h) => h.wind)));
      const hi = Math.round(Math.max(...hrs.map((h) => h.gust ?? h.wind)));
      lines.push(["Rüzgâr", [dirOf(hrs.filter((h) => h.dir != null).map((h) => h.dir)), `${lo}–${hi} kn`, "tahmin"].filter(Boolean).join(" · ")]);
    }
  }
  const g = docs.filter((d) => GROUPS.includes(d.kind) && String(d.at).slice(0, 10) === day);
  if (g.length) lines.push(["Gruplar", g.some((d) => d.kind === "fleets") ? "Altın · Gümüş · Bronz ayrıldı" : `Renk listesi açıklandı${g.length > 1 ? ` (${g.length})` : ""}`]);
  const rd = docs.filter((d) => d.kind === "results" && String(d.at).slice(0, 10) === day);
  if (rd.length) lines.push(["Sonuçlar", rd.map((d) => (resultState(d.name) === "kesin" ? "Kesin sonuç" : "Geçici sonuç")).filter((x, i, a) => a.indexOf(x) === i).join(" · ") + " geldi"]);
  if (results?.day === day && places.length) lines.push(["Bizimkiler", places.slice(0, 4).map((x) => `${x.name.split(" ")[0]} ${x.place}.${x.row?.grp && x.row?.fp ? ` (${x.row.grp} ${x.row.fp}.)` : ""}`).join(" · ")]);
  return lines;
}

function DaySummary({ orgId, race, docs, places }) {
  const today = todayStr();
  const yest = new Date(Date.parse(`${today}T12:00:00`) - 864e5).toLocaleDateString("sv-SE");
  const [which, setWhich] = useState("today");
  const day = which === "today" ? today : yest;
  const [live, setLive] = useState(null);
  const [fc, setFc] = useState({});
  useEffect(() => {
    let on = true;
    loadLive(orgId, race.id).then((l) => on && setLive(l), () => on && setLive({ starts: [], wind: [] }));
    return () => void (on = false);
  }, [orgId, race.id]);
  useEffect(() => {
    if (fc[day] !== undefined) return;
    let on = true;
    loadRaceDay(race, day).then((d) => on && setFc((p) => ({ ...p, [day]: d.rows || null })), () => on && setFc((p) => ({ ...p, [day]: null })));
    return () => void (on = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, race.id]);
  const lines = live ? daySummary({ day, starts: live.starts, wind: live.wind, fc: fc[day], docs: docs || [], results: race.results, places }) : null;
  return (
    <section className="mt-6" aria-label="Günün özeti">
      <ListHead title="Günün özeti" />
      <Seg value={which} onChange={setWhich} options={[["yest", "Dün"], ["today", "Bugün"]]} className="mb-2" />
      <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card px-3.5">
        {!lines ? (
          <p className="py-3.5 text-[0.9375rem] text-mut">Yükleniyor…</p>
        ) : !lines.length ? (
          <p className="py-3.5 text-[0.9375rem] text-mut">{which === "today" ? "Bugün henüz bir şey yok" : "Dün bir şey yok"}</p>
        ) : (
          lines.map(([k, v]) => (
            <div key={k} className="flex gap-3 border-t border-line py-3 first:border-t-0">
              <span className="w-[4.75rem] shrink-0 text-[0.8125rem] text-mut">{k}</span>
              <span className="min-w-0 flex-1 text-[0.9375rem]">{v}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export function RaceTrack({ orgId, race, chosen = [], more = null }) {
  const [docs, setDocs] = useState(null);
  const [view, setView] = useState(null);
  const [all, setAll] = useState(false);
  useEffect(() => watchSiteDocs(orgId, race.id, setDocs, () => setDocs((d) => d || [])), [orgId, race.id]);
  const [ent, setEnt] = useState(null);
  useEffect(() => watchEntryDoc(orgId, race.id, setEnt, () => setEnt({ rows: [], groups: {} })), [orgId, race.id]);
  const hasGroups = !!(ent && groupDay(ent.groups, todayStr()));
  const load = useCallback(() => siteDocBlob(race.id, view), [race.id, view]);
  const close = useCallback(() => setView(null), []);
  const g = trackGroups(docs);
  const places = ourPlaces(race.results, chosen);
  const box = "overflow-hidden rounded-[1.25rem] border border-line bg-card px-3.5";
  const empty = (t) => <p className="py-3.5 text-[0.9375rem] text-mut">{docs ? t : "Yükleniyor…"}</p>;
  return (
    <div className="track-cols">
      {/* iPad yatay ve Mac'te iki sütun (globals.css track-cols): solda özet ve sonuçlar, sağda gruplar, duyurular, talimatlar */}
      <div>
      <DaySummary orgId={orgId} race={race} docs={docs} places={places} />
      <section className="mt-6" aria-label="Sonuçlar">
        <ListHead title="Sonuçlar" count={g.results.length} />
        <div className={box}>
          {places.map((x) => (
            <div key={x.id} className="flex min-h-[3.5rem] items-center gap-3 border-t border-line py-2 first:border-t-0">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{x.name}</b>
                {x.row?.cls && <small className="block truncate text-[0.8125rem] text-mut">{subOf(x.row)}</small>}
              </span>
              <b className="shrink-0 text-[1.375rem] font-bold tabular-nums">{x.place}.</b>
            </div>
          ))}
          <DocRows list={g.results} onOpen={setView} />
          {!places.length && !g.results.length && empty("Henüz sonuç yok")}
        </div>
      </section>
      </div>
      <div>
      <section className="mt-6" aria-label="Gruplar">
        <ListHead title="Gruplar" />
        <div className={box}>
          <GroupsNow e={ent} chosen={chosen} />
          <DocRows list={g.groups} onOpen={setView} />
          {!g.groups.length && !hasGroups && empty("Henüz grup açıklanmadı")}
        </div>
      </section>
{/* duyuru yoksa bölüm görünmez (sporcu listesi ve sınıflanmayan belgeler) */}
      {(!docs || g.news.length > 0) && (
              <section className="mt-6" aria-label="Duyurular">
          <ListHead title="Duyurular" count={g.news.length} />
          <div className={box}>
            <DocRows list={g.news} onOpen={setView} />
            {!g.news.length && empty("Henüz duyuru yok")}
          </div>
        </section>
      )}
      {cleanSchedule(race.notice?.schedule).length > 0 && (
        <section className="mt-6" aria-label="Program">
          <ListHead title="Program" />
          <div className={box}>
            <ProgramRows schedule={race.notice.schedule} />
          </div>
        </section>
      )}
      <section className="mt-6" aria-label="Talimatlar">
        <ListHead title="Talimatlar" count={g.rules.length} />
        <div className={box}>
          <DocRows list={g.rules} onOpen={setView} cur={currentAmend(g.rules)} />
          {!g.rules.length && empty("Henüz talimat yok")}
        </div>
      </section>
      {/* Belgelerin tamamı ve işlemleri (Geri al, Yeniden işle, Şimdi bak, İzlemeyi bırak): SiteDocs, özellik kaybolmasın */}
      {more && (
        <>
          <button type="button" aria-expanded={all} onClick={() => setAll((v) => !v)} data-press className="btn btn-text btn-sm mt-3 w-full">
            {all ? "Kapat" : "Tüm belgeler ve işlemler"}
          </button>
          <div hidden={!all}>{more}</div>
        </>
      )}
      </div>
      {view && createPortal(<PdfViewer title={view.name} load={load} onClose={close} />, document.body)}
    </div>
  );
}
