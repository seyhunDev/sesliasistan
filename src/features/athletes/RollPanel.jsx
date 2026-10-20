"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { mirrorChanges } from "@/features/athletes/mirror";
import { AbsentNotice } from "@/features/athletes/AbsentNotice";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { byId, isActive, loadAthletes, message, saveAttendance, useDikili } from "@/features/athletes/data";
import { missing, useNameIndex } from "@/features/athletes/names";
import { RollView, ST } from "@/features/athletes/RollView";
import { setAttDay } from "@/features/athletes/assistAttendance";
import { NamesSheet } from "@/features/athletes/NamesSheet";
import { todayStr } from "@/lib/utils/format";
import { Loading } from "@/components/ui/Loader";

// Yoklama: gün seç, dokunarak işaretle ya da ana asistana söyle ("Ali, Zeynep geldi, Emre izinli, kalanlar gelmedi").
// Asistan bu ekranda yoklamayı ekrandaki güne yazar (setAttDay); kaydedince "sa-att-saved" ile ekran güncellenir.
// Her işaret kulüp projesine anında yazılır (kulüp uygulamasıyla aynı alan: attendance_YYYY."MM-DD").
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

  return (
    <main className={inSheet ? "pb-2" : "mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]"}>
      {!inSheet && <PageHeader title="Yoklama" sub={data && !err ? `${list.length} aktif sporcu` : "Kulüp verisi"} back="/athletes">
        {data && !err && (
          <Link href="/athletes/attendance/report" data-press aria-label="Ay raporu" className="raised grid size-10 place-items-center !rounded-full text-acc">
            <Icon name="chart" className="size-5" />
          </Link>
        )}
        {data && !err && (
          <button onClick={() => setNames(true)} data-press aria-label="Ses adları" className="raised relative grid size-10 place-items-center !rounded-full text-acc">
            <Icon name="users" className="size-5" />
            {lack.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-rec px-1 text-[0.625rem] font-semibold text-white">{lack.length}</span>}
          </button>
        )}
      </PageHeader>}

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

      {!inSheet && <NamesSheet open={names} onClose={() => setNames(false)} idx={idx} save={save} athletes={active} classes={classes} />}
    </main>
  );
}
