"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { mirrorChanges } from "@/features/athletes/mirror";
import { AbsentNotice } from "@/features/athletes/AbsentNotice";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { byId, isActive, loadAthletes, message, saveAttendance, useDikili } from "@/features/athletes/data";
import { missing, useNameIndex } from "@/features/athletes/names";
import { RollRows, RollView, ST, shift } from "@/features/athletes/RollView";
import { setAttDay } from "@/features/athletes/assistAttendance";
import { NamesSheet } from "@/features/athletes/NamesSheet";
import { todayStr } from "@/lib/utils/format";
import { Loading } from "@/components/ui/Loader";
import { Sheet } from "@/components/ui/Sheet";

// Yoklama: gün seç, dokunarak işaretle ya da ana asistana söyle ("Ali, Zeynep geldi, Emre izinli, kalanlar gelmedi").
// Asistan bu ekranda yoklamayı ekrandaki güne yazar (setAttDay); kaydedince "sa-att-saved" ile ekran güncellenir.
// Her işaret kulüp projesine anında yazılır (kulüp uygulamasıyla aynı alan: attendance_YYYY."MM-DD").
// Sayfa (Seyhun 2026-10-22 "sade yoklama"): baştan sona lacivert; üstte geri, başlık, ⋯; son 7 gün kutuları (ana sayfadaki gibi),
// tek ince özet çizgisi, sporcular. Hepsi geldi, Kalanlar yok, sınıflar, ay raporu ve ses adları ⋯ penceresinde.
// inSheet: antrenman sayfasındaki pencerede (başlık ve ses adları yok, gün dışarıdan); onSaved(gün, değişiklikler)
export function RollPanel({ inSheet = false, day = "", onSaved }) {
  const toast = useToast();
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const today = todayStr();
  const gun = useSearchParams().get("gun"); // bildirimden: o günün yoklaması (?gun=YYYY-MM-DD)
  const [date, setDate] = useState(() => (/^\d{4}-\d{2}-\d{2}$/.test(day || gun || "") && (day || gun) <= today ? day || gun : today));
  const [cls, setCls] = useState("");
  const [local, setLocal] = useState({}); // "tarih|id" -> durum | null (bu oturumda yapılan işaretler)
  const { members, myUid } = useData(); // uygulamada hesabı olan sporcuların yoklama kopyası için
  const { idx, save } = useNameIndex();
  const [names, setNames] = useState(false); // ses adları penceresi
  const [menu, setMenu] = useState(false); // ⋯ penceresi: toplu işaret, sınıf, ay raporu, ses adları

  const classes = byId(data?.classes);
  const active = (data?.athletes || []).filter(isActive);
  const usedClasses = (data?.classes || []).filter((c) => active.some((a) => a.currentClassId === c.id));
  const list = active.filter((a) => !cls || a.currentClassId === cls).sort((a, b) => a.studentName.localeCompare(b.studentName, "tr"));
  const lack = missing(idx, active);
  const stateOf = (a, d = date) => {
    const k = `${d}|${a.id}`;
    return k in local ? local[k] : a.att?.[d.slice(0, 4)]?.[d.slice(5)] || null;
  };

  // changes: { id: durum | null }
  async function apply(d, changes, note) {
    const keys = Object.keys(changes);
    if (!keys.length) return;
    const prev = local;
    setLocal((l) => ({ ...l, ...Object.fromEntries(keys.map((id) => [`${d}|${id}`, changes[id]])) }));
    try {
      await saveAttendance(d, changes);
      mirrorChanges(myUid, members, d, changes); // sporcu kendi yoklamasını uygulamada görsün
      onSaved?.(d, changes);
      if (note) toast(note);
    } catch (e) {
      setLocal(prev);
      toast(message(e));
    }
  }
  const tap = (a, s) => apply(date, { [a.id]: stateOf(a) === s ? null : s });
  const unmarked = list.filter((a) => !stateOf(a));
  const bulk = (s) => {
    const target = s === "present" ? list : unmarked;
    apply(date, Object.fromEntries(target.map((a) => [a.id, s])), `${target.length} sporcu: ${ST[s].label.toLocaleLowerCase("tr-TR")}`);
  };

  // Ana asistan gün söylenmezse ekrandaki güne, sınıf seçiliyse yalnız o sınıfa yazar
  useEffect(() => {
    setAttDay(date, cls);
    return () => setAttDay("");
  }, [date, cls]);
  // Ana asistan yoklamayı kaydedince (ya da geri alınca) ekran o güne geçer ve işaretler görünür
  useEffect(() => {
    const on = (e) => {
      const { date: d, changes } = e.detail || {};
      if (!d || !changes) return;
      setLocal((l) => ({ ...l, ...Object.fromEntries(Object.keys(changes).map((id) => [`${d}|${id}`, changes[id]])) }));
      setDate(d);
    };
    window.addEventListener("sa-att-saved", on);
    return () => window.removeEventListener("sa-att-saved", on);
  }, []);

  if (!inSheet) {
    const n = (k) => list.filter((a) => stateOf(a) === k).length;
    const ok = data && !err;
    const done = list.length - unmarked.length;
    const pct = (k) => `${list.length ? (n(k) / list.length) * 100 : 0}%`;
    // Son 7 gün (bugün sağda); bildirimden daha eski bir gün açıldıysa şerit o günü de gösterir
    const last = date < shift(today, -6) ? shift(date, 3) : today;
    const days = Array.from({ length: 7 }, (_, i) => shift(last, i - 6));
    const marked = (d) => active.some((a) => stateOf(a, d));
    const pill0 = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.8125rem] font-semibold";
    const glass = "ck-glass shadow-[0_2px_0_rgba(0,0,0,.35)] data-[pressed]:translate-y-px";
    const close = (f) => () => {
      setMenu(false);
      f();
    };
    return (
      <main data-theme="dark" className="navy page-navy mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
        <section className="ck -mx-5 px-5 pb-5 pt-[calc(0.75rem+env(safe-area-inset-top))]" style={{ background: "radial-gradient(120% 70% at 88% 0%, rgba(34, 211, 238, .38), transparent 62%)" }} aria-label="Yoklama">
          <header className="flex items-center gap-2.5">
            <BackButton href="/athletes" />
            <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">Yoklama</h1>
            {ok && (
              <button type="button" onClick={() => setMenu(true)} data-press aria-label="Yoklama seçenekleri" className="btn btn-round relative size-10">
                <Icon name="more" className="size-5" />
                {lack.length > 0 && <span className="absolute -right-1 -top-1 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-rec px-1 text-[0.625rem] font-semibold text-white">{lack.length}</span>}
              </button>
            )}
          </header>

          {ok && (
            <nav aria-label="Günler" className="mt-4 grid grid-cols-7 gap-1">
              {days.map((d) => {
                const dt = new Date(`${d}T12:00:00`);
                const on = d === date;
                return (
                  <button key={d} type="button" data-press disabled={d > today} aria-pressed={on} onClick={() => setDate(d)} className={`raised flex flex-col items-center gap-1 rounded-2xl py-2 disabled:opacity-30 ${on ? "act-main" : ""}`}>
                    <small className={`text-[0.75rem] font-semibold capitalize ${on ? "" : "text-white/60"}`}>{d === today ? "Bugün" : dt.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "")}</small>
                    <b className="text-[1.375rem] font-bold leading-none tracking-[-.03em] tabular-nums">{dt.getDate()}</b>
                    <span className={`size-1.5 rounded-full ${marked(d) ? "bg-ok" : ""}`} />
                  </button>
                );
              })}
            </nav>
          )}
        </section>

        {err?.code === "permission-denied" ? (
          <DikiliLogin denied={!!user} onDone={reload} />
        ) : err ? (
          <button onClick={reload} className="w-full rounded-[1.25rem] border border-line bg-card px-4 py-4 text-left text-[0.875rem]">
            <b className="block font-semibold text-rec">{err.text}</b>
            <span className="text-mut">Tekrar denemek için dokun</span>
          </button>
        ) : !data ? (
          <Loading label="Sporcular yükleniyor" />
        ) : (
          <>
            <div className="mb-2.5 flex items-center gap-2.5 px-0.5 text-[0.875rem] text-mut">
              <span className="shrink-0">
                <b className="font-semibold tabular-nums text-fg">{done}</b> / {list.length} işaretli{cls && ` · ${classes[cls] || ""}`}
              </span>
              <span className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10" aria-hidden>
                <span className="h-full bg-ok" style={{ width: pct("present") }} />
                <span className="h-full bg-rec" style={{ width: pct("absent") }} />
                <span className="h-full bg-amber-500" style={{ width: pct("excused") }} />
              </span>
            </div>
            <RollRows list={list} classes={classes} cls={cls} stateOf={stateOf} onTap={tap} />
            <AbsentNotice key={date} absent={list.filter((a) => stateOf(a) === "absent")} date={date} today={today} members={members} />
          </>
        )}

        <Sheet navy open={menu} onClose={() => setMenu(false)} title="Yoklama seçenekleri">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={close(() => bulk("present"))} disabled={!list.length} data-press className={`${glass} h-11 rounded-xl text-[0.9375rem] font-semibold disabled:opacity-40`}>
              Hepsi geldi
            </button>
            <button type="button" onClick={close(() => bulk("absent"))} disabled={!unmarked.length} data-press className={`${glass} h-11 rounded-xl text-[0.9375rem] font-semibold disabled:opacity-40`}>
              Kalanlar yok
            </button>
          </div>
          {usedClasses.length > 1 && (
            <>
              <p className="mb-2 mt-4 px-0.5 text-[0.75rem] font-semibold uppercase tracking-wide text-mut">Sınıf</p>
              <div className="flex flex-wrap gap-2">
                {[{ id: "", name: "Tümü" }, ...usedClasses].map((c) => (
                  <button key={c.id || "all"} type="button" onClick={close(() => setCls(c.id))} aria-pressed={cls === c.id} data-press className={`${pill0} ${cls === c.id ? "border-white bg-white text-[#11203a]" : "ck-glass text-white"}`}>
                    {c.name}
                  </button>
                ))}
              </div>
            </>
          )}
          <ul className="mt-4 divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">
            <li>
              <Link href="/athletes/attendance/report" data-press className="flex items-center gap-2 px-4 py-3.5 text-[0.9375rem] font-semibold">
                <span className="flex-1">Ay raporu</span>
                <Icon name="chev" className="size-4 text-mut" />
              </Link>
            </li>
            <li>
              <button type="button" onClick={close(() => setNames(true))} data-press className="flex w-full items-center gap-2 px-4 py-3.5 text-left text-[0.9375rem] font-semibold">
                <span className="flex-1">Ses adları</span>
                {lack.length > 0 && <span className="rounded-full bg-rec px-2 py-0.5 text-[0.75rem] font-semibold text-white">{lack.length} eksik</span>}
                <Icon name="chev" className="size-4 text-mut" />
              </button>
            </li>
          </ul>
        </Sheet>

        <NamesSheet open={names} onClose={() => setNames(false)} idx={idx} save={save} athletes={active} classes={classes} />
      </main>
    );
  }

  return (
    <main className="pb-2">
      {err?.code === "permission-denied" ? (
        <DikiliLogin denied={!!user} onDone={reload} />
      ) : err ? (
        <button onClick={reload} className="mt-4 w-full rounded-2xl bg-card px-4 py-4 text-left text-[0.875rem]">
          <b className="block font-semibold text-rec">{err.text}</b>
          <span className="text-mut">Tekrar denemek için dokun</span>
        </button>
      ) : !data ? (
        <Loading label="Sporcular yükleniyor" />
      ) : (
        <RollView
          date={date}
          today={today}
          onDate={setDate}
          list={list}
          classes={classes}
          usedClasses={usedClasses}
          cls={cls}
          onCls={setCls}
          stateOf={stateOf}
          onTap={tap}
          onBulk={bulk}
          after={<AbsentNotice key={date} absent={list.filter((a) => stateOf(a) === "absent")} date={date} today={today} members={members} />}
        />
      )}
    </main>
  );
}
