"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { NoticeDetails } from "@/features/athletes/NoticeView";
import { addToClub, loadShared, loadSharedSheets } from "@/features/athletes/sharedRaces";
import { filtersOf, fleetsOf, rankView, shortRange } from "@/lib/sharedRace";
import { todayStr } from "@/lib/utils/format";
import { placeOf } from "./RaceCalendar";

// Ortak yarışın sayfası (/races/{id}, herkes görür): lacivertte ad, yer · tarih, kalan gün, Talimat (PDF) ve Sonuçlar;
// altta talimattan okunan bilgiler (program, son tarihler, ücretler…). Kulüp hesabında altta "Kulübüme ekle" (yarış kulübün
// Yarışlar listesine gelir, sporcular orada eklenir). Sonuçlar: sınıf, Junior/Bambino, Kızlar ve arama (ad, kulüp, yelken no).
const diff = (s, today) => Math.round((new Date(`${s}T12:00:00`) - new Date(`${today}T12:00:00`)) / 864e5);
const pill = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.875rem] font-semibold";

export function SharedRaceView({ id, club }) {
  const router = useRouter();
  const toast = useToast();
  const [s, setS] = useState(undefined);
  const [sheets, setSheets] = useState(null);
  const [view, setView] = useState("info");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    loadShared(id, true).then(setS, () => setS(null));
    loadSharedSheets(id).then(setSheets, () => setSheets([]));
  }, [id]);
  const today = todayStr();

  if (view === "results" && s) return <Results s={s} sheets={sheets || []} onBack={() => setView("info")} />;

  const left = s?.startDate ? diff(s.startDate, today) : null;
  const ended = s && diff(s.endDate || s.startDate, today) < 0;
  const add = async () => {
    setBusy(true);
    try {
      const rid = await addToClub({ orgId: club.orgId, uid: club.uid, shared: s, today });
      router.push(`/athletes/races/${rid}`);
    } catch {
      toast("Eklenemedi");
      setBusy(false);
    }
  };
  const btn = "raised flex h-11 items-center justify-center rounded-xl border text-[0.9375rem] font-semibold";

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(8rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label={s?.name || "Yarış"}>
        <header className="flex items-center gap-2.5">
          <BackButton href="/races" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{s?.name || "Yarış"}</h1>
            {s && <p className="truncate text-[0.8125rem] text-white/65">{[placeOf(s), shortRange(s.startDate, s.endDate)].filter(Boolean).join(" · ")}</p>}
          </div>
        </header>
        {s && (
          <>
            <p className="mt-4 flex items-baseline gap-2">
              {left > 1 ? (
                <>
                  <b className="text-[2.75rem] font-bold leading-none tracking-[-.04em] tabular-nums">{left}</b>
                  <span className="text-[1rem] font-semibold text-white/75">gün kaldı</span>
                </>
              ) : (
                <b className="text-[2rem] font-bold leading-none tracking-tight">{ended ? "Bitti" : left === 1 ? "Yarın" : left === 0 ? "Bugün" : "Sürüyor"}</b>
              )}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {s.noticeFile?.url ? (
                <a href={s.noticeFile.url} target="_blank" rel="noreferrer" data-press className={btn}>
                  Talimat
                </a>
              ) : (
                <span className={`${btn} opacity-45`}>Talimat yok</span>
              )}
              <button type="button" onClick={() => setView("results")} disabled={!sheets?.length} data-press className={`${btn} disabled:opacity-45`}>
                {sheets?.length || sheets === null ? "Sonuçlar" : "Sonuç yok"}
              </button>
            </div>
          </>
        )}
      </section>
      <div className="relative -mx-5 -mt-6 rounded-t-[1.75rem] bg-bg px-5 pt-1">
        {s === undefined && <Loading label="Yarış yükleniyor" />}
        {s === null && <p className="pt-6 text-center text-[0.875rem] text-mut">Yarış bulunamadı.</p>}
        {s && (s.notice ? <NoticeDetails n={s.notice} /> : <p className="pt-6 text-center text-[0.875rem] text-mut">Talimat bilgisi henüz yok.</p>)}
      </div>
      {s && club && !ended && (
        <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-[30rem] px-5">
          <Button onClick={add} loading={busy} full>
            Kulübüme ekle
          </Button>
        </div>
      )}
    </main>
  );
}

function Results({ s, sheets, onBack }) {
  const fleets = useMemo(() => fleetsOf(sheets), [sheets]);
  const [cls, setCls] = useState(fleets[0]?.cls || "");
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const fleet = fleets.find((f) => f.cls === cls) || fleets[0];
  const filters = filtersOf(fleet);
  const rows = rankView(fleet, filter, q);
  const files = sheets.map((x) => x.file).filter((f) => f?.url);
  const chips = [...fleets.map((f) => ["c", f.cls]), ...filters.map((f) => ["f", f])];

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Sonuçlar">
        <header className="flex items-center gap-2.5">
          <BackButton onClick={onBack} />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Sonuçlar</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{[s.name, shortRange(s.startDate, s.endDate)].join(" · ")}</p>
          </div>
        </header>
        <label className="ck-glass mt-3.5 flex h-11 items-center gap-2 rounded-xl px-3">
          <Icon name="search" className="size-[1.125rem] shrink-0 text-white/55" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, kulüp ya da yelken no" enterKeyHint="search" className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-white outline-none placeholder:text-white/55" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Temizle" className="text-white/60">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </label>
        {chips.length > 1 && (
          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
            {chips.map(([k, v]) => {
              const on = k === "c" ? fleet?.cls === v && !filter : filter === v;
              return (
                <button key={k + v} type="button" onClick={() => (k === "c" ? (setCls(v), setFilter("")) : setFilter(on ? "" : v))} aria-pressed={on} data-press className={`${pill} ${on ? "border-white bg-white text-[#11203a]" : "ck-glass text-white"}`}>
                  {v}
                </button>
              );
            })}
          </div>
        )}
      </section>
      <div className="relative -mx-5 -mt-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {!rows.length ? (
          <p className="pt-4 text-center text-[0.875rem] text-mut">{q ? "Bulunamadı" : "Sonuç yok"}</p>
        ) : (
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {rows.map((r) => (
              <li key={`${r.place}-${r.name}`} className="flex min-h-11 items-center gap-2.5 px-4 py-2 text-[0.9375rem]">
                <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-mut">{r.place}.</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate font-medium">{r.name}</b>
                  {r.sail && <small className="block truncate text-[0.75rem] text-mut">{r.sail}</small>}
                </span>
                <span className="max-w-[40%] shrink-0 truncate text-[0.8125rem] text-mut">{r.club}</span>
              </li>
            ))}
          </ul>
        )}
        {fleet && (
          <div className="mt-2 flex items-center justify-between px-1 text-[0.8125rem]">
            <span className="text-mut">{fleet.rows.length} sporcu</span>
            {files.map((f, i) => (
              <a key={f.id} href={f.url} target="_blank" rel="noreferrer" className="font-semibold text-acc">
                Sonuç PDF&apos;i{files.length > 1 ? ` ${i + 1}` : ""}
              </a>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
