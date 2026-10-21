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
import { rel, todayStr } from "@/lib/utils/format";
import { Loading } from "@/components/ui/Loader";

// Yoklama: gün seç, dokunarak işaretle ya da ana asistana söyle ("Ali, Zeynep geldi, Emre izinli, kalanlar gelmedi").
// Asistan bu ekranda yoklamayı ekrandaki güne yazar (setAttDay); kaydedince "sa-att-saved" ile ekran güncellenir.
// Her işaret kulüp projesine anında yazılır (kulüp uygulamasıyla aynı alan: attendance_YYYY."MM-DD").
// Sayfa (yeni tasarım 2026-10-21): lacivert üstte gün, sayılar, toplu işaret ve sınıflar; altta sporcular.
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
    const dt = new Date(`${date}T12:00:00`);
    const sub = `${dt.toLocaleDateString("tr-TR", { weekday: "short" })} ${dt.getDate()} ${dt.toLocaleDateString("tr-TR", { month: "short" })}`;
    const ok = data && !err;
    const pill0 = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.8125rem] font-semibold";
    return (
      <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
        <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Yoklama">
          <header className="flex items-center gap-2.5">
            <BackButton href="/athletes" />
            <div className="min-w-0 flex-1 leading-tight">
              <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Yoklama</h1>
              <p className="truncate text-[0.8125rem] text-white/65">{ok ? `${active.length} aktif sporcu` : "Kulüp verisi"}</p>
            </div>
            {ok && (
              <Link href="/athletes/attendance/report" data-press aria-label="Ay raporu" className="btn btn-round size-9">
                <Icon name="chart" className="size-4" />
              </Link>
            )}
            {ok && (
              <button type="button" onClick={() => setNames(true)} data-press aria-label="Ses adları" className="btn btn-round relative size-9">
                <Icon name="users" className="size-4" />
                {lack.length > 0 && <span className="absolute -right-1 -top-1 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-rec px-1 text-[0.625rem] font-semibold text-white">{lack.length}</span>}
              </button>
            )}
          </header>

          {ok && (
            <>
              <div className="mt-4 flex items-center gap-2">
                <button type="button" onClick={() => setDate(shift(date, -1))} data-press aria-label="Önceki gün" className="btn btn-round size-9">
                  <Icon name="back" className="size-4" />
                </button>
                <button type="button" onClick={() => setDate(today)} className="min-w-0 flex-1 text-center leading-tight">
                  <b className="block truncate text-[1.25rem] font-bold">{date === today ? "Bugün" : rel(date)}</b>
                  <small className="block truncate text-[0.8125rem] text-white/65">{date === today ? sub : "Bugüne dön"}</small>
                </button>
                <button type="button" onClick={() => setDate(shift(date, 1))} disabled={date >= today} data-press aria-label="Sonraki gün" className="btn btn-round size-9 disabled:opacity-30">
                  <Icon name="chev" className="size-4" />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {[["present", "Geldi"], ["absent", "Gelmedi"], ["excused", "İzinli"], [null, "Boş"]].map(([k, l]) => (
                  <div key={l} className="min-w-0">
                    <b className="block text-[1.5rem] font-bold tabular-nums leading-tight">{k ? n(k) : unmarked.length}</b>
                    <small className="block truncate text-[0.8125rem] text-white/65">{l}</small>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => bulk("present")} disabled={!list.length} data-press className="raised flex h-10 items-center justify-center rounded-xl border text-[0.9375rem] font-semibold disabled:opacity-40">
                  Hepsi geldi
                </button>
                <button type="button" onClick={() => bulk("absent")} disabled={!unmarked.length} data-press className="raised flex h-10 items-center justify-center rounded-xl border text-[0.9375rem] font-semibold disabled:opacity-40">
                  Kalanlar yok
                </button>
              </div>

              {usedClasses.length > 1 && (
                <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
                  {[{ id: "", name: "Tümü" }, ...usedClasses].map((c) => (
                    <button key={c.id || "all"} type="button" onClick={() => setCls(c.id)} aria-pressed={cls === c.id} data-press className={`${pill0} ${cls === c.id ? "border-white bg-white text-[#141938]" : "ck-glass text-white"}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        <div className="relative -mx-5 -mt-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
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
              <RollRows list={list} classes={classes} cls={cls} stateOf={stateOf} onTap={tap} />
              <AbsentNotice key={date} absent={list.filter((a) => stateOf(a) === "absent")} date={date} today={today} members={members} />
            </>
          )}
        </div>

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
