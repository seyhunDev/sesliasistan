"use client";

import { useState } from "react";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { AddButton } from "@/components/ui/AddButton";
import { Row, RowList } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { RollPanel } from "@/features/athletes/RollPanel";
import { NewAthlete } from "@/features/athletes/NewAthlete";
import { TrainingLog } from "@/features/add/TrainingLog";
import { isActive, loadAthletes, saveAttendance, useDikili } from "@/features/athletes/data";
import { mirrorChanges } from "@/features/athletes/mirror";
import { pickPlan } from "@/lib/trainingLog";
import { antField, antOzet } from "@/lib/antKayit";
import { todayStr } from "@/lib/utils/format";
import { markKanalPlan } from "./bilgiStore";

// Yönet'te antrenman (Seyhun 2026-11-23, örnek antrenman-yonet/ornek.html onaylandı "Yap"): antrenman sayfası kalktı, antrenmanın ekranı
// burası. Soldaki Antrenman düğmesi: Yoklama (sporcular, + Sporcu), Günlük, start sayısı ve "Antrenman olarak kaydet". Kanal kapanınca
// da kaydetme özeti sorulur. Kaydedince o günün antrenman planına (yoksa açılır) saat, katılanlar, start sayısı ve kanal yazılır,
// kanala katılıp sporcuya eşlenenler yoklamada "geldi" olur, sonra Günlük açılır. Asistanda "antrenmanı kaydet" aynı işi yapar.
const dayText = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" });

// view: "ant" | "kaydet" | "" ; k: kanal kaydı { id, name, at, end, starts, plan } ; boats: bilgiTekne ; ant: Yönet'e gelinen plan id
export function AntrenmanSheets({ org, view, onView, k, boats, ant = "", onEnd = null }) {
  const { plans, updateRecord, saveDrafts, members, myUid } = useData();
  const { profile } = useAuth();
  const toast = useToast();
  const { data, reload } = useDikili("list", loadAthletes);
  const [inner, setInner] = useState(""); // roll | log | add
  const [logId, setLogId] = useState("");
  const [busy, setBusy] = useState(false);
  const [att, setAtt] = useState({}); // bu pencerede değişen yoklama { id: durum | null }
  const today = todayStr();
  const by = { name: profile?.name ?? "Kullanıcı" };
  const active = (data?.athletes || []).filter(isActive);
  const plan = (k?.plan && plans.find((p) => p.id === k.plan)) || (ant && plans.find((p) => p.id === ant)) || pickPlan(plans, today);
  const day = plan?.date || today;
  const stateOf = (a) => (a.id in att ? att[a.id] : a.att?.[day.slice(0, 4)]?.[day.slice(5)] || null);
  const came = active.filter((a) => stateOf(a) === "present").length;
  const starts = new Set((k?.starts || []).filter(Number.isFinite)).size;
  const o = k ? antOzet({ kanal: k, boats, athletes: active }) : null;
  const logRec = plans.find((p) => p.id === logId);

  async function save() {
    if (!o || busy) return;
    setBusy(true);
    let id = plan?.date === o.date ? plan.id : "";
    if (!id) {
      const r = await saveDrafts([{ type: "plan", title: k?.name || "Antrenman", cat: "Antrenman", date: o.date, time: o.time, endTime: o.endTime, place: "", assignees: [] }], { source: "manual", by: profile?.uid });
      id = r?.ids?.find((x) => x[0] === "plan")?.[1] || "";
    }
    if (!id) {
      setBusy(false);
      return toast("Kaydedilemedi. İnterneti kontrol et.");
    }
    const p = plans.find((x) => x.id === id);
    await updateRecord("plan", id, { ant: antField(o), ...(p?.time ? {} : { time: o.time }), ...(p?.endTime ? {} : { endTime: o.endTime }) }, by);
    if (k?.id) markKanalPlan(org, k.id, id);
    const ch = Object.fromEntries(o.present.filter((x) => !stateOf({ id: x, att: active.find((a) => a.id === x)?.att })).map((x) => [x, "present"]));
    if (Object.keys(ch).length && o.date === day) {
      try {
        await saveAttendance(o.date, ch);
        mirrorChanges(myUid, members, o.date, ch);
        setAtt((m) => ({ ...m, ...ch }));
      } catch {}
    }
    setBusy(false);
    toast("Antrenman kaydedildi");
    setLogId(id);
    onView("");
    setInner("log");
  }

  // Günü bitir (Seyhun 2026-11-28): tek pencere; önce kanal kapanır, sonra kaydedilir
  async function endSave(keep) {
    if (busy || !onEnd) return;
    setBusy(true);
    const ok = await onEnd();
    setBusy(false);
    if (!ok) return;
    if (keep) await save();
    else onView("");
  }

  return (
    <>
      <Sheet
        open={view === "bitir"}
        onClose={() => onView("")}
        title="Günü bitir"
        footer={<SheetActions cancel="Yalnız bitir" onCancel={() => endSave(false)} yes="Bitir ve kaydet" onYes={() => endSave(true)} disabled={busy || !o} />}
      >
        <p className="mb-3 text-mut">Sporcuların ekranı durur. Antrenman, katılanlar ve start sayısıyla kaydedilir.</p>
        {o && (
          <RowList>
            <Row title="Saat" right={`${o.time}–${o.endTime}`} />
            <Row title="Katılanlar" sub={o.crew.join(", ") || "Kanala kimse katılmadı"} right={o.crew.length} />
            <Row title="Start" right={o.starts} />
          </RowList>
        )}
      </Sheet>
      <Sheet open={view === "ant"} onClose={() => onView("")} title="Antrenman" footer={<Button full onClick={() => onView("kaydet")} disabled={!k}>Antrenman olarak kaydet</Button>}>
        <p className="-mt-1 mb-2 text-[0.8125rem] text-mut">
          {dayText(day)}
          {k?.at ? ` · ${o?.time}'den beri` : ""}
        </p>
        <RowList>
          <Row title="Yoklama" right={active.length ? (came ? `${came} geldi` : "Al") : "Sporcu yok"} onClick={() => setInner("roll")} />
          <Row title="Günlük" right={plan?.log ? "Yazıldı" : "Yazılmadı"} warn={!plan?.log} onClick={() => (plan ? (setLogId(plan.id), setInner("log")) : onView("kaydet"))} />
          <Row title="Start" right={starts} />
        </RowList>
        <div className="mt-3 flex justify-end">
          <AddButton onClick={() => setInner("add")}>Sporcu</AddButton>
        </div>
      </Sheet>

      <Sheet open={view === "kaydet"} onClose={() => onView("")} title="Antrenman olarak kaydet?" footer={<SheetActions cancel="Kaydetme" onCancel={() => onView("")} onYes={save} disabled={busy || !o} />}>
        {o && (
          <RowList>
            <Row title="Gün" right={dayText(o.date)} />
            <Row title="Saat" right={`${o.time}–${o.endTime}`} />
            <Row title="Katılanlar" sub={o.crew.join(", ") || "Kanala kimse katılmadı"} right={o.crew.length} />
            <Row title="Start" right={o.starts} />
            <Row title="Tekne izi" right="Kayıtlı" />
          </RowList>
        )}
      </Sheet>

      <Sheet open={inner === "roll"} onClose={() => setInner("")} title="Yoklama" top>
        {inner === "roll" &&
          (active.length || !data ? (
            <RollPanel inSheet day={day} onSaved={(d, ch) => d === day && setAtt((m) => ({ ...m, ...ch }))} />
          ) : (
            <div className="py-6 text-center">
              <p className="mb-3 text-mut">Sporcu yok</p>
              <AddButton onClick={() => setInner("add")}>Sporcu</AddButton>
            </div>
          ))}
      </Sheet>

      <Sheet open={inner === "log"} onClose={() => setInner("")} title="Günlük" top>
        {inner === "log" && logRec && <TrainingLog rec={logRec} by={by} startOpen onDone={() => setInner("")} />}
      </Sheet>

      <NewAthlete
        open={inner === "add"}
        onClose={() => setInner("")}
        onSaved={() => (setInner(""), reload())}
        names={{ classes: data?.classes || [], coaches: data?.coaches || [] }}
        athletes={data?.athletes || []}
      />
    </>
  );
}
