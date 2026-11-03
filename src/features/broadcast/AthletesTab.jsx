"use client";

import { useEffect, useMemo, useState } from "react";
import { card } from "@/components/ui/Page";
import { COLORS, groupColor, groupOf, groupsOn } from "@/lib/roundScore";
import { entryClasses } from "@/lib/roundSay";
import { fleetsOf } from "@/lib/sharedRace";
import { sheetMatch } from "@/lib/resultSheet";
import { loadSheets } from "@/features/athletes/raceLiveStore";

// Yayın › Sporcu (Seyhun 2026-11-03 16:30, örnek parkur-katilimci/ornek.png onaylandı 16:49): yarışın grupları (+ ekle, × çıkar),
// sporcu listesi, gün gün grup listesi (final listesi sonraki günlere geçer, lib/roundScore groupsOn) ve sonuçlar tek yerde.
// Yükleme Kayıt listesi penceresinden (EntriesView: sporcu ve grup listesi) ve sonuç sayfasından (/sonuclar) yapılır; Dönüşler buradaki listeyi kullanır.
const FINAL = ["Altın", "Gümüş", "Bronz", "Zümrüt"];
const ELIM = COLORS.map(([n]) => n);
const isFinal = (g) => FINAL.includes(g);
const dayShort = (d) => {
  const [, m, g] = String(d).split("-").map(Number);
  return g ? `${g} ${["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"][m - 1]}` : d;
};
const counts = (list) => {
  const n = {};
  for (const x of Array.isArray(list) ? list : Object.entries(list || {})) {
    const g = groupOf(Array.isArray(x) ? x[1] : "");
    if (g) n[g] = (n[g] || 0) + 1;
  }
  return n;
};
const order = (g) => (isFinal(g) ? 100 + FINAL.indexOf(g) : ELIM.indexOf(g));

export function AthletesTab({ orgId, raceId, plan, onSets, entries, groups, today, days = [] }) {
  const [adding, setAdding] = useState(""); // "<sınıf>|e" ya da "<sınıf>|f": o sınıfa grup ekleme açık
  const [day, setDay] = useState(today);
  const [sheets, setSheets] = useState([]);
  const [q, setQ] = useState("");
  const [only, setOnly] = useState(""); // listede yalnız bu grup
  useEffect(() => {
    let on = true;
    loadSheets(orgId, raceId).then((s) => on && setSheets(s), () => {});
    return () => {
      on = false;
    };
  }, [orgId, raceId]);

  const sets = plan.sets || [];
  const put = (cls, grps) => onSets(sets.map((x) => (x.cls === cls ? { ...x, grps: [...new Set(grps)].sort((a, b) => order(a) - order(b)) } : x)));

  const classes = useMemo(() => entryClasses(entries), [entries]);
  const girls = entries.filter((r) => r.sex === "K").length;
  const clubs = new Set(entries.map((r) => r.club).filter(Boolean)).size;

  // grup listesi olan günler + bugün + yarışın günleri (en çok 7)
  const dayList = useMemo(() => [...new Set([...Object.keys(groups || {}), ...days, today])].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(-7), [groups, days, today]);
  const pick = dayList.includes(day) ? day : today;
  const own = !!groups?.[pick];
  const list = groupsOn(groups, pick);
  const cn = counts(list);
  const total = Object.values(cn).reduce((a, b) => a + b, 0);
  const cnOrder = Object.keys(cn).sort((a, b) => order(a) - order(b));
  // sporcular (Seyhun 2026-11-03 19:53 "neden sporcular gösterilmiyor"): seçili günün grubuyla, ara + grup süzgeci
  const gm = Object.fromEntries((Array.isArray(list) ? list : Object.entries(list || {})).map((x) => [String(x[0]), groupOf(x[1] || "")]));
  const fil = cn[only] ? only : "";
  const shown = entries.filter((r) => (!fil || gm[r.sail] === fil) && sheetMatch(r, q)).sort((a, b) => Number(a.sail) - Number(b.sail));
  const multi = classes.length > 1;

  // sonuçlar: belgeler gün gün (yükleme günü), hangi gruplar ve kaç yarış
  const resDays = useMemo(() => {
    const by = {};
    for (const sh of sheets) {
      const d = String(sh.at || "").slice(0, 10);
      const rows = (sh.fleets || []).flatMap((f) => f.rows || []);
      const x = (by[d] ||= { d, grps: new Set(), races: 0, n: 0 });
      rows.forEach((r) => r.grp && x.grps.add(r.grp));
      x.races = Math.max(x.races, ...rows.map((r) => (r.r || []).length), 0);
      x.n += rows.length;
    }
    return Object.values(by).sort((a, b) => b.d.localeCompare(a.d));
  }, [sheets]);
  const overall = useMemo(() => fleetsOf(sheets).reduce((n, f) => n + f.rows.length, 0), [sheets]);

  const chip = "flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-[var(--chip)] pl-2.5 pr-1 text-[0.875rem] font-semibold";
  const dot = (g) => <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupColor(g) || "var(--mut)" }} aria-hidden="true" />;
  const groupRow = (cls, grps, fin) => {
    const mine = grps.filter((g) => isFinal(g) === fin);
    const k = `${cls}|${fin ? "f" : "e"}`;
    const free = (fin ? FINAL : ELIM).filter((g) => !grps.includes(g));
    return (
      <div key={k} className="border-b border-line px-4 py-2.5 last:border-b-0">
        <p className="text-[0.9375rem] font-semibold">
          {fin ? "Final" : "Eleme"}
          <span className="ml-2 text-[0.8125rem] font-semibold text-mut">{fin ? "Sonraki günlerde aynı kalır" : "Her gün değişir"}</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mine.map((g) => (
            <span key={g} className={chip}>
              {dot(g)}
              {g}
              <button type="button" aria-label={`${g} grubunu çıkar`} onClick={() => put(cls, grps.filter((x) => x !== g))} className="grid size-6 place-items-center rounded-full bg-[var(--deep)] text-[0.875rem] text-mut active:scale-90">
                ×
              </button>
            </span>
          ))}
          {free.length ? (
            <button type="button" onClick={() => setAdding(adding === k ? "" : k)} aria-expanded={adding === k} className="h-8 rounded-full border border-dashed border-[rgba(255,61,119,0.55)] px-3 text-[0.875rem] font-semibold text-[#ff8ab0] active:scale-95">
              + Grup
            </button>
          ) : null}
        </div>
        {adding === k ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {free.map((g) => (
              <button key={g} type="button" onClick={() => (put(cls, [...grps, g]), setAdding(""))} className={`${chip} pr-3 active:scale-95`}>
                {dot(g)}
                {g}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      {sets.map((x) => (
        <section key={x.cls}>
          <div className="mb-1.5 flex justify-between px-1 text-[0.8125rem] font-semibold text-mut">
            <span>Gruplar</span>
            <span>{x.cls}</span>
          </div>
          <div className={`${card} overflow-hidden`}>
            {groupRow(x.cls, x.grps || [], false)}
            {groupRow(x.cls, x.grps || [], true)}
          </div>
        </section>
      ))}
      <section>
        <div className="mb-1.5 px-1 text-[0.8125rem] font-semibold text-mut">Sporcu listesi</div>
        <div className={`${card} px-4 py-3`}>
          <p className="text-[1rem] font-semibold">{entries.length ? `${entries.length} sporcu` : "Liste yok"}</p>
          <p className="text-[0.8125rem] font-semibold text-mut">{entries.length ? [classes.map((c) => c.cls || "Sınıfsız").join(", "), girls ? `${girls} kız` : "", clubs ? `${clubs} kulüp` : ""].filter(Boolean).join(" · ") : "PDF, fotoğraf ya da Excel yükle"}</p>
        </div>
      </section>
      <section>
        <div className="mb-1.5 flex justify-between px-1 text-[0.8125rem] font-semibold text-mut">
          <span>Günün grupları</span>
          <span>Renk listesi</span>
        </div>
        <div className={`${card} overflow-hidden`}>
          <div className="flex gap-1.5 px-3 pb-1 pt-3">
            {dayList.map((d) => {
              const has = !!groups?.[d];
              const carried = !has && groupsOn(groups, d).length;
              const fin = has && Object.keys(counts(groups[d])).every(isFinal);
              return (
                <button key={d} type="button" onClick={() => setDay(d)} aria-pressed={d === pick} className={`min-w-0 flex-1 rounded-[0.6875rem] border py-1.5 text-center ${d === pick ? "border-[var(--acc)] bg-[var(--accbg)]" : "border-transparent bg-[var(--chip)]"}`}>
                  <b className="block text-[0.8125rem]">{dayShort(d)}</b>
                  <small className={`block text-[0.625rem] font-semibold ${has ? "text-ok" : "text-mut"}`}>{has ? (fin ? "Final" : "✓") : carried ? "Önceki" : "—"}</small>
                </button>
              );
            })}
          </div>
          {total ? (
            <div className="mx-4 mb-1 mt-2 flex h-2 gap-0.5 overflow-hidden rounded">
              {cnOrder.map((g) => (
                <span key={g} style={{ flex: cn[g], background: groupColor(g) }} />
              ))}
            </div>
          ) : null}
          <p className="px-4 pb-3 pt-1.5 text-[0.9375rem] font-semibold">{total ? cnOrder.map((g) => `${g} ${cn[g]}`).join(" · ") : "Bu gün için grup listesi yok"}</p>
          {total && !own ? <p className="-mt-2 px-4 pb-3 text-[0.8125rem] font-semibold text-mut">Önceki günün final listesi geçerli</p> : null}
        </div>
      </section>
      {entries.length ? (
        <section>
          <div className="mb-1.5 flex justify-between px-1 text-[0.8125rem] font-semibold text-mut">
            <span>Sporcular</span>
            <span>{`${shown.length}${fil || q ? ` / ${entries.length}` : ""}`}</span>
          </div>
          <div className={`${card} overflow-hidden`}>
            <div className="space-y-2 border-b border-line px-3 py-2.5">
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: no, ad, kulüp" className="h-10 w-full rounded-[0.75rem] border border-line bg-[var(--deep)] px-3 text-[0.9375rem] outline-none" />
              {cnOrder.length ? (
                <div className="flex gap-1.5 overflow-x-auto">
                  <button type="button" onClick={() => setOnly("")} aria-pressed={!fil} className={`${chip} pr-3 ${!fil ? "!border-[var(--acc)] !bg-[var(--accbg)]" : ""}`}>
                    Hepsi
                  </button>
                  {cnOrder.map((g) => (
                    <button key={g} type="button" onClick={() => setOnly(fil === g ? "" : g)} aria-pressed={fil === g} className={`${chip} pr-3 ${fil === g ? "!border-[var(--acc)] !bg-[var(--accbg)]" : ""}`}>
                      {dot(g)}
                      {`${g} ${cn[g]}`}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {shown.map((r) => (
              <div key={`${r.cls}|${r.sail}`} className="flex items-center gap-3 border-b border-line px-4 py-2 last:border-b-0">
                <span className="w-12 shrink-0 text-[1rem] font-semibold tabular-nums">{r.sail}</span>
                {gm[r.sail] ? dot(gm[r.sail]) : <span className="size-2.5 shrink-0" />}
                <span className="min-w-0 flex-1 leading-tight">
                  <b className="block truncate text-[0.9375rem] font-semibold">{r.name || "–"}</b>
                  <span className="block truncate text-[0.8125rem] text-mut">{[r.club, r.born, r.sex === "K" ? "Kız" : "", multi ? r.cls : ""].filter(Boolean).join(" · ")}</span>
                </span>
              </div>
            ))}
            {!shown.length ? <p className="px-4 py-3 text-[0.875rem] text-mut">Bulunamadı</p> : null}
          </div>
        </section>
      ) : null}
      <section>
        <div className="mb-1.5 flex justify-between px-1 text-[0.8125rem] font-semibold text-mut">
          <span>Sonuçlar</span>
          <span>Her gün yenisi eskisinin yerine</span>
        </div>
        <div className={`${card} overflow-hidden`}>
          {resDays.length ? (
            resDays.map((x) => (
              <div key={x.d} className="flex items-center gap-2 border-b border-line px-4 py-2.5 last:border-b-0">
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem]">{`${dayShort(x.d)}${x.races ? ` · ${x.races} yarış` : ""}`}</b>
                  <span className="block text-[0.8125rem] font-semibold text-mut">{`${x.n} sporcu`}</span>
                </span>
                {[...x.grps].sort((a, b) => order(a) - order(b)).map((g) => (
                  <span key={g} className="rounded-md bg-[rgba(52,196,124,0.14)] px-1.5 py-0.5 text-[0.6875rem] font-bold text-[#7fe3ae]">
                    {g}
                  </span>
                ))}
              </div>
            ))
          ) : (
            <p className="px-4 py-3 text-[0.875rem] text-mut">Sonuç yok</p>
          )}
          {overall ? <p className="border-t border-line px-4 py-2.5 text-[0.875rem] font-semibold">{`Genel sıralama · ${overall} sporcu`}</p> : null}
        </div>
      </section>
    </>
  );
}
