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
import { todayStr } from "@/lib/utils/format";
import { windName } from "@/features/weather/weather";
import { loadLive } from "./raceLiveStore";
import { loadRaceDay } from "./raceWeather";
import { Icon } from "@/components/ui/Icon";
import { ourPlaces } from "@/lib/raceDay";
import { changedRows, cleanSchedule, currentAmend, kindLabel, latestNews, resultState, rowKey, version } from "@/lib/siteDocs";
import { GROUP_PICK, groupColor } from "@/lib/roundScore";
import { ResultCards, ResultsAdd } from "./ResultCards";
import { saveDocState, siteDocBlob, watchEntryDoc, watchSiteDocs } from "./raceSite";

const RULES = ["notice", "amend", "program"];
const GROUPS = ["groups", "fleets"];
const when = (at) => {
  const d = new Date(`${String(at).slice(0, 10)}T12:00:00`);
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} ${String(at).slice(11, 16)}`.trim();
};
// "Optimist / 120 · Gümüş 5. · Junior 4."

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
// Gösterilecek grup günleri (Seyhun 2026-11-09 "yarın için açıklanan renk varsa yarını beklemeyelim, açıklandığı zaman gösterelim"):
// bugün ve açıklanmışsa sonraki gün (yarın Altın/Gümüş/Bronz ya da yine renkler olabilir); ikisi de yoksa son açıklanan gün
export function groupDays(groups, today) {
  const days = Object.keys(groups || {}).filter((d) => groups[d]?.length).sort();
  // Yarının grubu açıklanınca bugününki gösterilmez (Seyhun 2026-11-09 "yarın açıklandıysa artık bugünün grubunu göstermeyelim")
  const up = days.filter((d) => d >= today);
  return up.length ? up.slice(0, 2).slice(-1) : days.slice(-1);
}
const tomorrowOf = (today) => new Date(Date.parse(`${today}T12:00:00`) + 864e5).toLocaleDateString("sv-SE");
// Grup gününün etiketi: bugünse boş, yarınsa "Yarın", değilse kısa tarih
const dayTag = (d, today) => (d === today ? "" : d === tomorrowOf(today) ? "Yarın" : new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }));
// Günün grupları (Seyhun 2026-11-07 "gruplar açıklandı ama göremiyorum; her eklendiğinde güncellenmeli"): kayıt listesindeki grup
// listesi canlı (raceSite.watchEntryDoc); grup başına tekne sayısı, bizim sporcuların grubu
// Takip yeni tasarım (Seyhun 2026-11-09): tek renk çubuğu (grup başına pay) ve altında grup adı + tekne sayısı
function GroupsNow({ e, day }) {
  const rank = (g) => GROUP_PICK.indexOf(g) + 1 || 99;
  const list = e?.groups?.[day] || [];
  const count = {};
  for (const [, g] of list) count[g] = (count[g] || 0) + 1;
  const gs = Object.keys(count).sort((a, b) => rank(a) - rank(b));
  return (
    <>
      <div className="tk-bar" aria-hidden="true">
        {gs.map((g) => (
          <i key={g} style={{ flex: count[g], "--g": groupColor(g) || "var(--mut)" }} />
        ))}
      </div>
      <div className="tk-leg">
        {gs.map((g) => (
          <span key={g} style={{ "--g": groupColor(g) || "var(--mut)" }}>
            {g} <em>{count[g]}</em>
          </span>
        ))}
      </div>
    </>
  );
}
// Bizim sporcuların grupları (kayıt listesindeki günlerin grupları, yelken numarasıyla): { sporcu id: [[gün etiketi, grup], …] };
// bugünün etiketi boş, yarınınki "Yarın" (açıklanınca hemen)
export function ourGroups(e, chosen, today = todayStr()) {
  const days = groupDays(e?.groups, today).map((d) => [dayTag(d, today), new Map(e.groups[d])]);
  if (!days.length) return {};
  return Object.fromEntries(
    chosen
      .map((a) => {
        const sail = String(a.sailNo || "").replace(/\D/g, "");
        return [a.id, days.map(([t, m]) => [t, m.get(sail)]).filter(([, g]) => g)];
      })
      .filter(([, l]) => l.length),
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
// Takip yeni tasarım (Seyhun 2026-11-09 "program çok kötü gösteriyor"): gün seçici (Bugün · Yarın · 11 Kas), saat solda, iş sağda.
// changed: son talimatın değiştirdiği satırlar (siteDocs changedRows; "gün|başlık" → eski saat); Okudum'a kadar yeni saat mavi, eski altında üstü çizili
function ProgramRows({ schedule, changed = {} }) {
  const today = todayStr();
  const days = programDays(schedule, today);
  const [pick, setPick] = useState("");
  const sel = days.find(([d]) => d === pick) || days[0];
  if (!sel) return null;
  const label = (d) => (d === today ? "Bugün" : d === tomorrowOf(today) ? "Yarın" : new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }));
  return (
    <>
      {days.length > 1 && (
        <div className="tk-days" role="tablist">
          {days.map(([d, items]) => (
            <button key={d} type="button" role="tab" aria-selected={d === sel[0]} onClick={() => setPick(d)} data-press className={items.some((x) => rowKey(x) in changed) ? "tk-ch" : ""}>
              {label(d)}
            </button>
          ))}
        </div>
      )}
      <div className="tk-rows">
        {sel[1].map((x) => {
          const k = rowKey(x);
          const old = changed[k];
          return (
            <div key={k + x.time} className={`tk-ev ${k in changed ? "tk-new" : ""}`}>
              <time>
                {x.time || "–"}
                {old && old !== "saatsiz" && <s>{old}</s>}
              </time>
              <span>{x.title}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function DocRows({ list, onOpen, cur = null }) {
  return list.map((d) => {
    const old = d.kind === "amend" && cur && d.id !== cur.id;
    const mark = old ? "eski" : markOf(d);
    return (
      <button key={d.id} type="button" data-press="row" onClick={() => onOpen(d)} className={`flex min-h-[3.5rem] w-full items-center gap-2.5 border-t border-line py-2 text-left first:border-t-0 ${old ? "opacity-55" : ""}`}>
        {/* yeni belge solda mavi nokta (Takip yeni tasarım) */}
        <i className={`size-[0.4375rem] shrink-0 rounded-full ${d.seen ? "" : "bg-acc"}`} aria-label={d.seen ? undefined : "Yeni"} />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{d.name}</b>
          <small className="block truncate text-[0.8125rem] text-mut">{[kindLabel(d.kind), when(d.at), d.state === "used" && d.note && d.note !== "Yarış ilanı" ? d.note : ""].filter(Boolean).join(" · ")}</small>
        </span>
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

// view: "track" (Takip: Sporcularımız, bugünün grupları, program, yeni belgeler) ya da "docs" (Belgeler sekmesi: hepsi ve işlemler);
// onAll: Takip'teki "Tüm belgeler" Belgeler sekmesini açar (Seyhun 2026-11-09 sade öneri)
export function RaceTrack({ orgId, race, chosen = [], more = null, onResultsFile = null, view: mode = "track", onAll = null }) {
  // Elle sonuç ekleme (Seyhun 2026-11-08; 2026-11-09 başlıktaki "+", ResultsAdd): siteye gelmeyen sonuç PDF'i, siteden gelenle aynı yol (page.jsx importFile)
  const [docs, setDocs] = useState(null);
  const [view, setView] = useState(null);
  const [all, setAll] = useState(false);
  const [resOpen, setResOpen] = useState(false);
  useEffect(() => watchSiteDocs(orgId, race.id, setDocs, () => setDocs((d) => d || [])), [orgId, race.id]);
  const [ent, setEnt] = useState(null);
  useEffect(() => watchEntryDoc(orgId, race.id, setEnt, () => setEnt({ rows: [], groups: {} })), [orgId, race.id]);
  const hasGroups = groupDays(ent?.groups, todayStr()).length > 0;
  const load = useCallback(() => siteDocBlob(race.id, view), [race.id, view]);
  const close = useCallback(() => setView(null), [setView]);
  const g = trackGroups(docs);
  const places = ourPlaces(race.results, chosen);
  const box = "overflow-hidden rounded-[1.25rem] border border-line bg-card px-3.5";
  const empty = (t) => <p className="py-3.5 text-[0.9375rem] text-mut">{docs ? t : "Yükleniyor…"}</p>;
  // Belgeler tek kartta (sade, 2026-11-08): talimat, ek talimat, program, duyuru, grup belgesi; yeni gelenler ve son üçü açık, gerisi "Diğer N belge"
  const papers = [...g.rules, ...g.news, ...g.groups].sort((a, b) => Number(!!a.seen) - Number(!!b.seen) || String(b.at).localeCompare(String(a.at)));
  const state = g.results.length ? (resultState(g.results[0].name) === "kesin" ? "Kesin" : "Geçici") : "";
  const raceN = Math.max(0, ...Object.values(race.results?.rows || {}).map((x) => x?.r?.length || 0));
  const row = "flex min-h-[3.5rem] w-full items-center gap-2 border-t border-line py-2 text-left first:border-t-0";
  const grpOf = ourGroups(ent, chosen);
  const noRes = chosen.filter((a) => grpOf[a.id] && !places.some((x) => x.id === a.id));
  const unseen = papers.filter((d) => !d.seen);
  const docsMore = (
    <>
      {/* Belgelerin tamamı ve işlemleri (Geri al, Yeniden işle, Şimdi bak, İzlemeyi bırak): SiteDocs, özellik kaybolmasın */}
      {more && (
        <button type="button" aria-expanded={all} onClick={() => setAll((v) => !v)} data-press="row" className={`${row} font-semibold text-acc`}>
          <span className="min-w-0 flex-1">{all ? "Kapat" : "Belge işlemleri"}</span>
        </button>
      )}
    </>
  );
  if (mode === "docs")
    return (
      <div>
        <section className="mt-5" aria-label="Belgeler">
          <ListHead title="Belgeler" count={papers.length + g.results.length} />
          <div className={box}>
            <DocRows list={[...papers, ...g.results].sort((a, b) => Number(!!a.seen) - Number(!!b.seen) || String(b.at).localeCompare(String(a.at)))} onOpen={setView} cur={currentAmend(g.rules)} />
            {!papers.length && !g.results.length && empty("Henüz belge yok")}
            {docsMore}
          </div>
          {more && <div hidden={!all}>{more}</div>}
        </section>
        {view && createPortal(<PdfViewer title={view.name} load={load} onClose={close} />, document.body)}
      </div>
    );
  // En son gelen belge (Seyhun 2026-11-09 "en son gelen bilgi yukarıda, okudum butonu"; Takip yeni tasarım onaylı): ne değiştiği, Aç · Okudum.
  // Okunana kadar Program'da değişen saatler işaretli (ek talimatın sakladığı eski program ile şimdiki)
  const news = docs ? latestNews(docs, race, todayStr()) : null;
  const changed = news?.kind === "amend" && news.undo?.notice ? changedRows(news.undo.notice.schedule, race.notice?.schedule) : {};
  const grpDay = groupDays(ent?.groups, todayStr())[0] || "";
  const grpN = grpDay ? ent.groups[grpDay].length : 0;
  const grpLabel = grpDay === todayStr() ? "Bugün gruplar" : grpDay === tomorrowOf(todayStr()) ? "Yarın gruplar" : `${dayName(grpDay)} gruplar`;
  return (
    <div className="tk">
      {news && (
        <section className="tk-news mt-5" aria-label="Son belge">
          <div className="min-w-0 flex-1">
            <small>
              {[kindLabel(news.kind), version(news.name) ? `${version(news.name)}` : ""].filter(Boolean).join(" ").toLocaleUpperCase("tr-TR")}
              <span> · {when(news.at)}</span>
            </small>
            <p>{news.state === "used" && news.note ? news.note : news.name}</p>
          </div>
          <div className="tk-news-b">
            <button type="button" onClick={() => setView(news)} data-press className="btn rz-soft">
              Aç
            </button>
            <button type="button" onClick={() => saveDocState(orgId, race.id, news.id, { read: true, seen: true }).catch(() => {})} data-press className="btn btn-primary">
              Okudum
            </button>
          </div>
        </section>
      )}
      {/* Takip yeni tasarım (Seyhun 2026-11-09 "profesyonel, modern, minimal, sade"; örnek takip-*.png onaylı): kutu yok, bölümler ince
          çizgiyle; solda (telefonda üstte) Sporcularımız, yanında Program, Gruplar, Belgeler */}
      <div className="track-cols track-main">
        <section className="mt-6" aria-label="Sporcularımız">
          <ListHead title={["Sporcularımız", state, raceN && `${raceN} yarış`].filter(Boolean).join(" · ")} action={<ResultsAdd onFile={onResultsFile} />} />
          <div className="tk-box">
            <ResultCards list={places} groups={grpOf} rest={noRes.map((a) => ({ id: a.id, name: a.studentName }))} />
            {!places.length && !noRes.length && !g.results.length && empty("Henüz sonuç yok")}
            {g.results.length > 0 && (
              <button type="button" aria-expanded={resOpen} onClick={() => setResOpen((v) => !v)} data-press="row" className={row}>
                <span className="min-w-0 flex-1 text-[0.9375rem] text-mut">Sonuç belgeleri · {g.results.length}</span>
                {g.results.some((d) => !d.seen) && <Tag tone="gen">Yeni</Tag>}
                <Icon name="chev" className={`size-4 shrink-0 text-mut/60 transition ${resOpen ? "-rotate-90" : "rotate-90"}`} />
              </button>
            )}
            {resOpen && <DocRows list={g.results} onOpen={setView} />}
          </div>
        </section>
        <div>
          {cleanSchedule(race.notice?.schedule).length > 0 && (
            <section className="mt-6" aria-label="Program">
              <ListHead title="Program" />
              <ProgramRows schedule={race.notice.schedule} changed={changed} />
            </section>
          )}
          {hasGroups && (
            <section className="mt-6" aria-label="Gruplar">
              <ListHead title={grpLabel} action={<span className="text-[0.8125rem] text-mut tabular-nums">{grpN} tekne</span>} />
              <GroupsNow e={ent} day={grpDay} />
            </section>
          )}
          <section className="mt-6" aria-label="Belgeler">
            <ListHead title="Belgeler" />
            <div className="tk-box">
              <DocRows list={papers.slice(0, Math.max(4, unseen.length))} onOpen={setView} cur={currentAmend(g.rules)} />
              {!papers.length && empty("Henüz belge yok")}
              {!onAll && docsMore}
            </div>
            {onAll && papers.length > 0 && (
              <button type="button" onClick={onAll} data-press className="tk-all">
                Tüm belgeler
              </button>
            )}
            {!onAll && more && <div hidden={!all}>{more}</div>}
          </section>
        </div>
      </div>
      {view && createPortal(<PdfViewer title={view.name} load={load} onClose={close} />, document.body)}
    </div>
  );
}
