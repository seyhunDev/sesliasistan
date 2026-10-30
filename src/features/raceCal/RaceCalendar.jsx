"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { loadSharedAll } from "@/features/athletes/sharedRaces";
import { calendarOf, classesOf } from "@/lib/sharedRace";
import { todayStr } from "@/lib/utils/format";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { loadRaces } from "@/features/athletes/races";
import { RaceSwitch } from "./RaceSwitch";

// Yarış takvimi (Seyhun 2026-10-28, örnek /mnt/project-files/yaris-tasarim/takvim/ornek.png): ortak yarışlar (sharedRaces) herkese açık.
// Lacivert üstte başlık, arama, Yaklaşan | Geçmiş; altta ay ay yarışlar. Dokununca /races/{id} (bilgi, talimat, sonuçlar).
const MONTHS = ["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"];
const WD = ["PAZ", "PZT", "SAL", "ÇAR", "PER", "CUM", "CMT"];
const MON = ["OCA", "ŞUB", "MAR", "NİS", "MAY", "HAZ", "TEM", "AĞU", "EYL", "EKİ", "KAS", "ARA"];
const day = (s) => new Date(`${s}T12:00:00`);
const diff = (s, today) => Math.round((day(s) - day(today)) / 864e5);
const monthOf = (s) => {
  const d = day(s.startDate);
  return d.getFullYear() === new Date().getFullYear() ? MONTHS[d.getMonth()] : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};
const byMonth = (list) => list.reduce((g, s) => (g.at(-1)?.[0] === monthOf(s) ? g.at(-1)[1].push(s) : g.push([monthOf(s), [s]]), g), []);
export const placeOf = (s) => [s.district, s.city].filter(Boolean).join(", ");
// Sağdaki kısa süre: "10 gün", "Yarın", "Bugün", "Sürüyor", uzaksa "2 ay"
function soon(s, today) {
  const a = diff(s.startDate, today);
  if (a > 59) return `${Math.round(a / 30)} ay`;
  if (a > 1) return `${a} gün`;
  return a === 1 ? "Yarın" : a === 0 ? "Bugün" : "Sürüyor";
}

function CalRow({ s, past, today, onOpen }) {
  const a = day(s.startDate);
  const b = s.endDate && s.endDate !== s.startDate ? day(s.endDate) : null;
  const classes = classesOf(s.notice).join(", ");
  return (
    <Row
      onClick={() => onOpen(s)}
      lead={
        <span className={`flex h-12 min-w-11 shrink-0 flex-col items-center justify-center rounded-[0.8rem] px-1.5 ${past ? "bg-bg text-mut" : "bg-accbg text-acc"}`}>
          <b className="whitespace-nowrap text-[1.0625rem] font-bold leading-none tabular-nums">
            {a.getDate()}
            {b && <span className="text-[0.8125rem] font-semibold">–{b.getDate()}</span>}
          </b>
          <small className="mt-1 text-[0.625rem] font-bold tracking-[.08em]">{past ? MON[a.getMonth()] : WD[a.getDay()]}</small>
        </span>
      }
      title={s.name}
      sub={[placeOf(s), classes].filter(Boolean).join(" · ")}
      right={past ? null : soon(s, today)}
    />
  );
}

export function RaceCalendar() {
  const router = useRouter();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("up");
  // Kulüp hesabında Kulübüm | Takvim; kulübe eklenmiş ortak yarış kulübün yarış sayfasını açar
  const { profile } = useAuth();
  const club = canSeeAthletes(profile?.email) && profile?.orgId ? profile.orgId : "";
  const [mine, setMine] = useState({});
  useEffect(() => {
    if (!club) return;
    loadRaces(club).then((l) => setMine(Object.fromEntries(l.filter((r) => r.shared).map((r) => [r.shared, r.id]))), () => {});
  }, [club]);
  useEffect(() => {
    loadSharedAll().then(setList, (e) => (setList([]), setError(e?.code === "permission-denied" ? "Yarış takvimi açılamadı." : "Yarışlar alınamadı.")));
  }, []);
  const today = todayStr();
  const cal = useMemo(() => calendarOf(list, today, q), [list, today, q]);
  const all = useMemo(() => calendarOf(list, today), [list, today]);
  const shown = tab === "up" ? cal.up : cal.past;
  const open = (s) => router.push(mine[s.id] ? `/athletes/races/${mine[s.id]}` : `/races/${s.id}`);
  const pill = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.875rem] font-semibold";

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Yarış takvimi">
        <header className="flex items-center gap-2.5">
          <BackButton href={club ? "/athletes" : "/"} />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{club ? "Yarışlar" : "Yarış takvimi"}</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{!list ? "Yükleniyor…" : [`${all.up.length} yaklaşan`, `${all.past.length} geçmiş`].join(" · ")}</p>
          </div>
        </header>
        {club && <RaceSwitch on="cal" />}
        <label className="ck-glass mt-3.5 flex h-11 items-center gap-2 rounded-xl px-3">
          <Icon name="search" className="size-[1.125rem] shrink-0 text-white/55" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Yarış, yer ya da sınıf ara" enterKeyHint="search" className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-white outline-none placeholder:text-white/55" />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Temizle" className="text-white/60">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </label>
        <div className="mt-3 flex gap-2">
          {[["up", "Yaklaşan"], ["past", "Geçmiş"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} data-press className={`${pill} ${tab === k ? "border-white bg-white text-[#11203a]" : "ck-glass text-white"}`}>
              {l}
            </button>
          ))}
        </div>
      </section>
      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {error && <p className="text-center text-[0.875rem] text-rec">{error}</p>}
        {!list && <Loading label="Yarışlar yükleniyor" />}
        {list && !shown.length && !error && <p className="pt-4 text-center text-[0.875rem] text-mut">{q ? "Bulunamadı" : tab === "up" ? "Yaklaşan yarış yok" : "Geçmiş yarış yok"}</p>}
        {byMonth(shown).map(([m, l]) => (
          <section key={m}>
            <ListHead title={m} count={l.length} />
            <RowList>
              {l.map((s) => (
                <CalRow key={s.id} s={s} past={tab === "past"} today={today} onOpen={open} />
              ))}
            </RowList>
          </section>
        ))}
      </div>
    </main>
  );
}
