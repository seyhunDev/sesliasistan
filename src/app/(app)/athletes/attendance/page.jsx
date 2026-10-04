"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { mirrorChanges } from "@/features/athletes/mirror";
import { AbsentNotice } from "@/features/athletes/AbsentNotice";
import { canSeeAthletes } from "@/features/athletes/access";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { byId, isActive, loadAthletes, message, saveAttendance, useDikili } from "@/features/athletes/data";
import { generate, missing, useNameIndex } from "@/features/athletes/names";
import { setAttDay } from "@/features/athletes/assistAttendance";
import { NamesSheet } from "@/features/athletes/NamesSheet";
import { todayStr } from "@/lib/utils/format";
import { Loading } from "@/components/ui/Loader";

const ST = {
  present: { label: "Geldi", short: "Geldi", on: "bg-ok text-white", tone: "text-ok" },
  absent: { label: "Gelmedi", short: "Yok", on: "bg-rec text-white", tone: "text-rec" },
  excused: { label: "İzinli", short: "İzin", on: "bg-amber-500 text-white", tone: "text-amber-600" },
};
const shift = (d, n) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + n);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};
const dayLabel = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

// Yoklama: gün seç, dokunarak işaretle ya da ana asistana söyle ("Ali, Zeynep geldi, Emre izinli, kalanlar gelmedi").
// Asistan bu sayfada yoklamayı ekrandaki güne yazar (setAttDay); kaydedince "sa-att-saved" ile sayfa güncellenir.
// Her işaret kulüp projesine anında yazılır (kulüp uygulamasıyla aynı alan: attendance_YYYY."MM-DD").
export default function AttendancePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed) return null;
  return (
    <Suspense>
      <Roll />
    </Suspense>
  );
}

function Roll() {
  const toast = useToast();
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [cls, setCls] = useState("");
  const [local, setLocal] = useState({}); // "tarih|id" -> durum | null (bu oturumda yapılan işaretler)
  const { members, myUid } = useData(); // uygulamada hesabı olan sporcuların yoklama kopyası için
  const { idx, save } = useNameIndex();
  const [names, setNames] = useState(false); // ses adları penceresi
  const [prep, setPrep] = useState(false);

  const classes = byId(data?.classes);
  const active = (data?.athletes || []).filter(isActive);
  const usedClasses = (data?.classes || []).filter((c) => active.some((a) => a.currentClassId === c.id));
  const list = active.filter((a) => !cls || a.currentClassId === cls).sort((a, b) => a.studentName.localeCompare(b.studentName, "tr"));
  const lack = missing(idx, active);
  async function prepare() {
    setPrep(true);
    try {
      await save(await generate(idx, active, classes, lack));
      toast("Ses adları hazır");
    } catch (e) {
      toast(e.message);
    }
    setPrep(false);
  }
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

  const count = (s) => list.filter((a) => stateOf(a) === s).length;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Yoklama" sub={data && !err ? `${list.length} aktif sporcu` : "Kulüp verisi"} back="/athletes">
        {data && !err && (
          <Link href="/athletes/attendance/report" aria-label="Ay raporu" className="grid size-10 place-items-center rounded-full bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-90">
            <Icon name="chart" className="size-5" />
          </Link>
        )}
        {data && !err && (
          <button onClick={() => setNames(true)} aria-label="Ses adları" className="grid size-10 place-items-center rounded-full bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-90">
            <Icon name="users" className="size-5" />
          </button>
        )}
      </PageHeader>

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
        <>
          {/* Ses adları hazır değilse: bir kez yapay zekayla hazırla (adlar karışmasın) */}
          {lack.length > 0 && (
            <div className="mb-3 rounded-2xl bg-acc/10 px-4 py-3">
              <p className="text-[0.8125rem] leading-snug">
                <b className="font-semibold">{lack.length} sporcunun ses adları hazır değil.</b> Yapay zeka adları bir kez inceleyip söylenişleri ve karışabilecekleri (ör. Deniz / Aren Deniz) ayırsın; sesli yoklama daha doğru olur.
              </p>
              <button onClick={prepare} disabled={prep} className="mt-2 h-9 rounded-lg bg-acc px-4 text-[0.8125rem] font-semibold text-white disabled:opacity-50">
                {prep ? "Hazırlanıyor…" : "Hazırla"}
              </button>
            </div>
          )}

          {/* Gün */}
          <div className="mt-1 flex items-center gap-2 rounded-2xl bg-card p-1.5 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
            <button onClick={() => setDate((d) => shift(d, -1))} aria-label="Önceki gün" className="grid size-10 place-items-center rounded-xl active:bg-bg">
              <Icon name="back" className="size-5" />
            </button>
            <button onClick={() => setDate(today)} className="min-w-0 flex-1 text-center">
              <b className="block truncate text-[0.9375rem] font-semibold capitalize">{dayLabel(date)}</b>
              <small className={`text-[0.75rem] ${date === today ? "text-acc" : "text-mut"}`}>{date === today ? "Bugün" : "Bugüne dön"}</small>
            </button>
            <button onClick={() => setDate((d) => shift(d, 1))} disabled={date >= today} aria-label="Sonraki gün" className="grid size-10 place-items-center rounded-xl active:bg-bg disabled:opacity-30">
              <Icon name="chev" className="size-5" />
            </button>
          </div>

          {/* Sınıf */}
          {usedClasses.length > 1 && (
            <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
              {[{ id: "", name: "Tümü" }, ...usedClasses].map((c) => (
                <button
                  key={c.id || "all"}
                  onClick={() => setCls(c.id)}
                  className={`h-8 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-medium transition active:scale-95 ${cls === c.id ? "bg-acc text-white" : "bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* Özet + toplu */}
          <div className="mt-3 flex items-center gap-3 px-1 text-[0.8125rem]">
            <span className="text-ok">{count("present")} geldi</span>
            <span className="text-rec">{count("absent")} yok</span>
            <span className="text-amber-600">{count("excused")} izinli</span>
            <span className="text-mut">{unmarked.length} boş</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button onClick={() => bulk("present")} disabled={!list.length} className="h-10 rounded-xl bg-card text-[0.875rem] font-semibold text-ok shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-[.98] disabled:opacity-40">
              Hepsi geldi
            </button>
            <button onClick={() => bulk("absent")} disabled={!unmarked.length} className="h-10 rounded-xl bg-card text-[0.875rem] font-semibold text-rec shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-[.98] disabled:opacity-40">
              Kalanlar gelmedi
            </button>
          </div>

          <AbsentNotice key={date} absent={list.filter((a) => stateOf(a) === "absent")} date={date} today={today} members={members} />

          {/* Sporcular */}
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
            {list.map((a) => {
              const s = stateOf(a);
              return (
                <li key={a.id} className="flex items-center gap-2 py-2 pl-4 pr-2">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-medium">{a.studentName}</b>
                    {!cls && classes[a.currentClassId] && <small className="block truncate text-[0.75rem] text-mut">{classes[a.currentClassId]}</small>}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    {Object.entries(ST).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => tap(a, k)}
                        aria-pressed={s === k}
                        className={`h-9 w-[3.375rem] rounded-lg text-[0.8125rem] font-semibold transition active:scale-95 ${s === k ? v.on : "bg-bg text-mut"}`}
                      >
                        {v.short}
                      </button>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-center text-[0.75rem] text-mut">Asistana söyle: “Ali, Zeynep geldi, Emre izinli, kalanlar gelmedi”</p>
        </>
      )}

      <NamesSheet open={names} onClose={() => setNames(false)} idx={idx} save={save} athletes={active} classes={classes} />
    </main>
  );
}
