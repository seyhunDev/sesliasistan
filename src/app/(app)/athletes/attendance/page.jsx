"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { useDock } from "@/features/home/TabBar";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { mirrorChanges } from "@/features/athletes/mirror";
import { AbsentNotice } from "@/features/athletes/AbsentNotice";
import { canSeeAthletes } from "@/features/athletes/access";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { byId, isActive, loadAthletes, message, saveAttendance, useDikili } from "@/features/athletes/data";
import { aliasesOf, generate, missing, useNameIndex } from "@/features/athletes/names";
import { NamesSheet } from "@/features/athletes/NamesSheet";
import { useSpeech } from "@/hooks/useSpeech";
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
import { Loader, Loading } from "@/components/ui/Loader";
import { ListeningOverlay } from "@/features/add/Stage";

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

async function askAI(payload) {
  const res = await authFetch("/api/attendance", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Yoklama anlaşılamadı");
  return data; // { date, marks, others, unknown, message }
}

// Yoklama: gün seç, dokunarak işaretle ya da söyle ("Ali, Zeynep geldi, Emre izinli, kalanlar gelmedi").
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
  const params = useSearchParams();
  const router = useRouter();
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [cls, setCls] = useState("");
  const [local, setLocal] = useState({}); // "tarih|id" -> durum | null (bu oturumda yapılan işaretler)
  const { members, myUid } = useData(); // uygulamada hesabı olan sporcuların yoklama kopyası için
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null); // yapay zeka önerisi
  const said = useRef(false);
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

  async function run(text) {
    if (!list.length) return toast("Önce sporcular yüklensin");
    setBusy(true);
    try {
      const r = await askAI({
        text,
        today,
        athletes: list.map((a) => ({ id: a.id, name: a.studentName, cls: classes[a.currentClassId] || "", aliases: aliasesOf(idx, a.id) })),
        notes: idx.notes || [],
      });
      const changes = {};
      r.marks.forEach((m) => (changes[m.id] = m.state === "clear" ? null : m.state));
      if (r.others) list.forEach((a) => !(a.id in changes) && (changes[a.id] = r.others));
      if (!Object.keys(changes).length) toast(r.message || (r.unknown?.length ? `Bulamadım: ${r.unknown.join(", ")}` : "Kimseyi işaretleyemedim"));
      else setPreview({ ...r, changes });
    } catch (e) {
      toast(e.message);
    }
    setBusy(false);
  }

  const sp = useSpeech({ onFinal: (t) => run(t), onFail: (m) => toast(m), names: list.map((a) => a.studentName).slice(0, 60) });
  const listening = sp.status === "listening";

  // Asistandan gelindiyse ("yoklama: Ali ve Zeynep geldi") söyleneni bir kez işle
  const say = params.get("say");
  useEffect(() => {
    if (!say || said.current || !data || err) return;
    said.current = true;
    router.replace("/athletes/attendance");
    run(say);
  });

  // Alt çubuk: yazılan ve söylenen doğrudan yoklamaya gider
  const ready = !!data && !err;
  useDock({ onSend: ready ? run : null, onMic: ready ? () => sp.start({ autoStop: 6000 }) : null });

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

          {busy && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card px-4 py-4 text-[0.875rem] text-mut">
              <Loader size="sm" /> Söylediğin işleniyor…
            </div>
          )}

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
          <p className="mt-3 text-center text-[0.75rem] text-mut">Söyle: “Ali, Zeynep geldi, Emre izinli, kalanlar gelmedi”</p>
        </>
      )}

      <ListeningOverlay sp={sp} hint="Kim geldi, kim gelmedi? Ör. “Ali ve Zeynep geldi”" onCancel={sp.cancel} onSend={() => sp.stop("send")} />

      <NamesSheet open={names} onClose={() => setNames(false)} idx={idx} save={save} athletes={active} classes={classes} />
      <Preview p={preview} athletes={active} onClose={() => setPreview(null)} onSave={(p) => {
        setPreview(null);
        setDate(p.date);
        apply(p.date, p.changes, "Yoklama kaydedildi");
      }} />
    </main>
  );
}

// Yapay zekanın anladığı: duruma göre gruplu; onaylayınca kaydedilir
function Preview({ p, athletes, onClose, onSave }) {
  const name = Object.fromEntries(athletes.map((a) => [a.id, a.studentName]));
  const groups = p ? [...Object.keys(ST), null].map((s) => [s, Object.keys(p.changes).filter((id) => p.changes[id] === s)]).filter(([, ids]) => ids.length) : [];
  return (
    <Sheet open={!!p} onClose={onClose} title="Yoklama önizleme">
      {p && (
        <>
          <p className="-mt-1 text-[0.875rem] text-mut">
            <span className="font-medium capitalize text-fg">{dayLabel(p.date)}</span>
            {p.message ? ` · ${p.message}` : ""}
          </p>
          <div className="mt-3 space-y-3">
            {groups.map(([s, ids]) => (
              <div key={s || "clear"} className="rounded-2xl bg-bg px-4 py-3">
                <b className={`text-[0.8125rem] font-semibold ${s ? ST[s].tone : "text-mut"}`}>
                  {s ? ST[s].label : "İşareti kaldır"} · {ids.length}
                </b>
                <p className="mt-1 text-[0.875rem] leading-relaxed">{ids.map((id) => name[id]).join(", ")}</p>
              </div>
            ))}
            {p.unknown?.length > 0 && (
              <p className="rounded-2xl bg-amber-500/10 px-4 py-3 text-[0.8125rem] text-amber-700">Eşleştiremediklerim: {p.unknown.join(", ")}</p>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 pb-2">
            <button onClick={onClose} className="h-12 rounded-xl bg-bg text-[0.9375rem] font-semibold">Vazgeç</button>
            <button onClick={() => onSave(p)} className="h-12 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98]">Kaydet</button>
          </div>
        </>
      )}
    </Sheet>
  );
}
