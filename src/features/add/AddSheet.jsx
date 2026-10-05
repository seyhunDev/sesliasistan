"use client";

import { doneOf } from "@/lib/doneWords";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Screen } from "@/components/ui/Screen";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useTts } from "@/features/speech/TtsProvider";
import { SpeakToggle } from "@/features/speech/SpeakToggle";
import { useAssistant } from "@/features/assistant/AssistantProvider";
import { addDays, rel, todayStr } from "@/lib/utils/format";
import { labelFromItems } from "@/lib/brain/model";
import { ackState, assigneesOf, lockedFor, unseenNotes } from "@/lib/people";
import { assigneeHints, assigneesInText, namesToUids, uidsToNames } from "@/lib/names";
import { record } from "@/lib/brain/store";
import { spokenDay, spokenTime } from "@/lib/utils/speak";
import { DraftCard } from "./DraftCard";
import { AssignedView, Replies, ReplyComposer, recordFocus } from "./Assigned";
import { EditCard } from "./EditCard";
import { ItemCard } from "./ItemCard";
import { Thread } from "./Thread";
import { applyRepeat, repeatLabel } from "@/lib/repeat";
import { CancelPlan } from "./CancelPlan";
import { TrainingLog } from "./TrainingLog";
import { TaskInvoice } from "@/features/invoices/TaskInvoice";
import { canLog } from "@/lib/trainingLog";
import { blank, check, firstNeed, fresh, tidy, toPatch } from "./drafts";

const TIME_CHIPS = [["Sabah 09:00", "09:00"], ["Öğleden sonra 14:00", "14:00"], ["Akşam 18:00", "18:00"]];

const EDIT_TITLE = { plan: "Plan", task: "Görev", note: "Not" };
const NEW_TITLE = { plan: "Yeni plan", task: "Yeni görev", note: "Yeni not" };
const MANUAL = [["plan", "Plan", "cal"], ["task", "Görev", "task"], ["note", "Not", "note"]];

const fromRecord = (kind, r) => ({
  ...(kind === "plan"
    ? { ...blank("plan"), title: r.title, date: r.date, endDate: r.endDate || "", time: r.time || "", allDay: r.allDay ?? !r.time, place: r.place || "", cat: r.cat }
    : kind === "task"
      ? { ...blank("task"), title: r.title, date: r.due || "", cat: r.cat }
      : { ...blank("note"), title: r.title, body: r.body, cat: r.cat }),
  assignees: assigneesOf(r),
});

// "bugün", "dün" küçük; diğer tarihler olduğu gibi ("27 Eyl Paz")
const relLow = (isoStr) => {
  const t = rel(isoStr.slice(0, 10));
  return /^(Bugün|Dün|Yarın)$/.test(t) ? t.toLocaleLowerCase("tr-TR") : t;
};

// Düzenlemede değişiklik var mı: kaydedilecek alanlar + sorumlular
const editKey = (d) => JSON.stringify([toPatch(d), [...(d.assignees || [])].sort()]);


export function AddSheet({ open, onClose, seed }) {
  const toast = useToast();
  const tts = useTts();
  const { stop: stopTts } = tts;
  const { profile } = useAuth();
  const { plans, tasks, notes, saveDrafts, updateRecord, removeWithUndo, deleteSeries, toggleTask, members, isStaff, nameOf, markSeen, setViewing, myUid, setMyDone, addReply } = useData();
  const { openAssistant } = useAssistant();
  const router = useRouter();
  const [drafts, setDrafts] = useState([]);
  const [voice, setVoice] = useState(false);
  const [heard, setHeard] = useState(""); // asistanın taslağı doğuran cümlesi (öğrenme kaydı için)
  const [reply, setReply] = useState({ engine: "", message: "" });
  const [turns, setTurns] = useState([]); // konuşma: { role: "user" | "assistant", text, chip? }
  const [whoAsk, setWhoAsk] = useState(null); // aynı adlı birden çok kişi: { said, options: [ad] } → "Hangi Ali?"
  const [ask, setAsk] = useState(null); // bekleyen soru: { idx, kind: "date" | "time" }
  const [pickAssign, setPickAssign] = useState(null); // kaydetmeden önce sorumlu sorusu: null | seçilen uid'ler
  const orig = useRef(""); // düzenlemede açılıştaki hâl (değişiklik var mı?)
  const scrollRef = useRef(null);
  const startedFor = useRef(null); // geliştirme modunda (Strict Mode) açılış iki kez çalışmasın

  // Çalışan adları (ana hesap): asistanın hazırladığı taslakta sorumlu cümleden bulunur
  const staffNames = !isStaff ? members.map((m) => m.name).filter(Boolean) : [];

  const edit = seed?.edit;
  const by = { name: profile?.name ?? "Kullanıcı" };
  const [seriesAsk, setSeriesAsk] = useState(null); // tekrarlayan planı silme: ikinci dokunuşta onay (kayıt kimliği)
  const rec = edit ? ({ plan: plans, task: tasks, note: notes }[edit.kind] || []).find((x) => x.id === edit.id) : null;
  const linkedPlan = rec?.planId ? plans.find((p) => p.id === rec.planId)?.title : "";
  // Çalışan, başkasının verdiği kaydı değiştiremez: salt okunur görünüm + tamamladım + not
  const locked = !!edit && lockedFor(rec, myUid, isStaff);
  const hasThread = !!rec && (assigneesOf(rec).some((u) => u !== rec.createdByUid) || !!rec.replies);
  const plan = drafts.find((d) => d.type === "plan");
  // Ana hesap her kayda sorumlu çalışan(lar) seçebilir; çalışanın eklediği kayıt yine onda kalır
  const canAssign = !isStaff && members.length > 0;
  // Ana hesapta her zaman dizi (çalışan yoksa boş: kartta "Çalışan ekle" bağlantısı çıkar); çalışanda null
  const assign = !isStaff ? members : null;
  const addStaff = () => {
    shut();
    router.push("/staff");
  };
  // Yapay zekanın verdiği sorumlu adlarını çalışan kimliklerine çevirir (atama yetkisi yoksa yok sayılır)
  // Yapay zeka sorumlu vermediyse kullanıcının kendi cümlesinden bulunur ("Ali'nin benzin alma görevi", "Ali'ye ver", "Ali alsın")
  const withAssignees = ({ assignTo, ...x }, text = "") => {
    if (!canAssign) return x;
    const names = Array.isArray(assignTo) && assignTo.length ? assignTo : assigneesInText(text, staffNames);
    if (names.length) return { ...x, assignees: namesToUids(names, members) };
    return Array.isArray(assignTo) ? { ...x, assignees: [] } : x;
  };
  const manual = !edit && turns.length === 0 && drafts.length > 0; // konuşmadan, elle ekleme
  const dirty = !!edit && !!drafts[0] && editKey(drafts[0]) !== orig.current;
  const recMeta = rec
    ? [
      rec.createdByUid ? (nameOf(rec.createdByUid) === "Sen" ? "Sen ekledin" : `${nameOf(rec.createdByUid) || "Başkası"} ekledi`) : "",
      rec.createdAt ? relLow(rec.createdAt) : "",
      rec.updatedAt ? `düzenlendi ${relLow(rec.updatedAt)}` : "",
    ].filter(Boolean).join(" · ")
    : "";
  const title = edit ? EDIT_TITLE[edit.kind] : manual && drafts.length === 1 ? NEW_TITLE[drafts[0].type] : "Yeni kayıt";
  const chat = turns.length > 0;

  const scrollToReply = () =>
    setTimeout(() => scrollRef.current?.querySelector("[data-last-reply]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);

  // ---- Hızlı cevap düğmeleri: yapay zekayı beklemeden kartı hemen günceller ----
  function pickChip(kind, value) {
    if (!ask) return;
    const i = ask.idx;
    tts.stop();
    let label;
    let said;
    let next = drafts.map((d, k) => {
      if (k !== i) return d;
      if (kind === "time") return value === "allday" ? { ...d, time: "", allDay: true } : { ...d, time: value, allDay: false };
      return { ...d, date: value };
    });
    if (kind === "time") {
      label = value === "allday" ? "Tüm gün" : `Saat ${value}`;
      said = value === "allday" ? "Tamam, tüm gün olarak ekliyorum. Saati istersen sonra kartta ekleyebilirsin." : `Tamam, saati ${spokenTime(value)} yaptım.`;
    } else {
      label = value === todayStr() ? "Bugün" : "Yarın";
      said = `Tamam, günü ${spokenDay(value)} yaptım.`;
    }
    const need = firstNeed(next);
    if (need) {
      said += need.kind === "time" ? " Saat kaçta olsun?" : " Hangi gün olsun?";
      next = next.map((d, k) => (k === need.idx ? { ...d, _asked: true } : d));
    } else said += " Hazırsa oluşturabilirsin.";
    setDrafts(next);
    setAsk(need);
    setReply((r) => ({ ...r, message: said }));
    setTurns((p) => [...p, { role: "user", text: label, chip: true }, { role: "assistant", text: said }]);
    tts.maybeSpeak(said);
    scrollToReply();
    navigator.vibrate?.(8);
  }

  // Asistan yeni kayıt niyetini çözdüyse taslak kartlarla ve yanıtla açılır; eksik bilgiyi burada tamamlarsın
  // Cümlede aynı ada sahip birden çok kişi geçtiyse ve sorumlu seçilemediyse kullanıcıya sor
  function askWhich(text, items) {
    if (!canAssign) return;
    const amb = assigneeHints(text, staffNames).ambiguous[0];
    setWhoAsk(amb && items.some((d) => !d.assignees?.length) ? amb : null);
  }
  function pickWhich(name) {
    const uid = members.find((m) => m.name === name)?.uid;
    if (uid) setDrafts((ds) => ds.map((d) => (d.assignees?.length ? d : { ...d, assignees: [uid], _general: false })));
    setWhoAsk(null);
  }

  function startPrefill(pf) {
    let next = applyRepeat(pf.items, pf.text || "", todayStr()).map((x) => withAssignees(x, pf.text)).map(fresh);
    askWhich(pf.text, next);
    const need = firstNeed(next);
    if (need) next = next.map((d, i) => (i === need.idx ? { ...d, _asked: true } : d));
    setDrafts(next);
    setAsk(need);
    setHeard(pf.text);
    setTurns([{ role: "user", text: pf.text }, ...(pf.message ? [{ role: "assistant", text: pf.message }] : [])]);
    setReply({ engine: pf.engine || "", message: pf.message || "" });
    if (pf.message) {
      const isQuestion = pf.message.trim().includes("?");
      if (need || isQuestion) tts.maybeSpeak(pf.message);
    }
  }

  // Kayıt açıkken: gelen mesajlar hemen "görüldü" olur (ana sayfada ve simgedeki sayıda birikmez) ve
  // sunucuya "bu konuşmadayım" bilgisi gider (bu kayıttaki yeni mesaj için telefona bildirim gelmez)
  const viewKey = open && edit && rec ? `${edit.kind}-${edit.id}` : "";
  const unseen = rec && open ? unseenNotes(rec, myUid).length : 0;
  useEffect(() => {
    if (unseen && viewKey && document.visibilityState === "visible") markSeen(edit.kind, edit.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unseen, viewKey]);
  useEffect(() => {
    if (!viewKey) return;
    const beat = () => setViewing(document.visibilityState === "visible" ? viewKey : null);
    beat();
    const t = setInterval(() => document.visibilityState === "visible" && beat(), 30e3);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", beat);
      setViewing(null);
    };
  }, [viewKey, setViewing]);

  // Ekran kapanınca ses, dinleme ve bekleyen istek durur
  useEffect(() => {
    if (!open) {
      stopTts();
      startedFor.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Her açılışta sıfırla; başlangıç metni varsa otomatik yapay zekaya gönder
  useEffect(() => {
    if (!open) return;
    if (startedFor.current === seed?.id) return;
    startedFor.current = seed?.id;
    setHeard("");
    setTurns([]);
    setAsk(null);
    setPickAssign(null);
    setReply({ engine: "", message: "" });
    setVoice(!!seed?.voice);
    if (edit) {
      const list = { plan: plans, task: tasks, note: notes }[edit.kind] || [];
      const r = list.find((x) => x.id === edit.id);
      const d0 = r ? fromRecord(edit.kind, r) : null;
      if (r) markSeen(edit.kind, edit.id); // başkası eklediyse: "görüldü"
      orig.current = d0 ? editKey(d0) : "";
      setDrafts(d0 ? [d0] : []);
      return;
    }
    setDrafts(seed?.type ? [{ ...blank(seed.type), ...(seed.date ? { date: seed.date } : {}) }] : []); // takvimden: seçili gün hazır gelir
    if (seed?.prefill) startPrefill(seed.prefill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed?.id]);

  const update = (i, patch) => setDrafts((p) => p.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  const remove = (i) => setDrafts((p) => p.filter((_, k) => k !== i));
  const changeType = (i, type) => update(i, { type, ...(type === "note" && !drafts[i].body ? { body: drafts[i].title } : {}) });

  const shut = () => onClose();
  // Yazarak/konuşarak ekleme ana asistanla: bu ekran kapanır, asistan dinlemeye başlar (kayıt ekranının kendi asistanı yok)
  const toAssistant = () => {
    onClose();
    openAssistant({ listen: true });
  };

  // Kaydet: sorumlusu olmayan kayıt varsa önce "Sorumlu eklemek ister misin?" sorulur (ana hesap, çalışan varken).
  // Yapay zeka görevliyi anlamadıysa buradan elle seçilir.
  async function create() {
    if (!drafts.length) return toast("Aşağıdan ekle ya da asistana söyle");
    for (const d of drafts) {
      const e = check(d);
      if (e) return toast(e);
    }
    if (canAssign && drafts.some((d) => !d.assignees?.length && !d._general)) {
      setPickAssign([]);
      navigator.vibrate?.(8);
      return;
    }
    finishCreate(drafts);
  }

  // pick: sorumlu sorusunda seçilenler; yalnızca sorumlusu olmayan kayıtlara eklenir
  function saveWith(pick) {
    setPickAssign(null);
    finishCreate(drafts.map((d) => (!d.assignees?.length && !d._general && pick.length ? { ...d, assignees: pick } : d)));
  }

  async function finishCreate(list) {
    const noTime = list.some((d) => d.type === "plan" && !d.time && !d.endDate && !d.allDay);
    const r = await saveDrafts(list.map(tidy), { source: voice ? "voice" : "manual", by });
    if (!r || (r.plans + r.tasks + r.notes === 0)) return toast("Kayıt sırasında hata oluştu");
    // Kullanıcının onayladığı sonuç: en değerli öğrenme örneği (ilk söylediği cümle + kaydettiği türler)
    const said = turns.find((t) => t.role === "user" && !t.chip)?.text || heard;
    if (said) record(said, labelFromItems(list), "user");
    const parts = [];
    if (r.plans) parts.push(`${r.plans} plan${r.weeks ? ` (${r.weeks} hafta)` : ""}`);
    if (r.tasks) parts.push(`${r.tasks} görev`);
    if (r.notes) parts.push(`${r.notes} not`);
    const who = uidsToNames([...new Set(list.flatMap((d) => d.assignees || []))], members).map((n) => n.split(" ")[0]);
    toast(`${parts.join(", ")} ${r.queued ? "sıraya alındı, internet gelince kaydedilecek" : "kaydedildi"}${who.length ? ` · ${who.join(", ")}` : ""}${noTime ? " · saat yok, tüm gün" : ""}`);
    navigator.vibrate?.([10, 40, 10]);
    onClose();
  }

  function saveEdit() {
    const d = drafts[0];
    const e = d ? check(d) : "Kayıt bulunamadı";
    if (e) return toast(e);
    updateRecord(edit.kind, edit.id, { ...toPatch(d), ...(canAssign ? { assignees: d.assignees || [] } : {}) }, by);
    toast("Güncellendi");
    onClose();
  }

  // Tek dokunuşla siler; bildirimdeki "Geri al" ile 5 sn içinde geri alınabilir
  function removeRecord() {
    removeWithUndo(edit.kind, edit.id);
    onClose();
  }

  // Kayıt ekranında ana asistan (alttaki kubbe) bu kaydı bilerek çalışır: değiştir, ertele, tamamla, sil, birine yaz.
  // Kubbe TabBar'da; açık kaydı olayla öğrenir ve bu ekranın üstünde görünür. Alttaki boşluk kubbe kadar (--rec-h).
  const recDock = open && !!edit && !!rec;
  const baseFocus = recDock ? recordFocus(edit.kind, rec, nameOf, myUid) : null;
  // Günlüğü yazılabilen antrenman planı: kubbedeki örnekler günlük üzerine (asistan bu plana yazar)
  const recFocus = baseFocus && edit.kind === "plan" && canLog(rec, todayStr()) ? { ...baseFocus, log: true } : baseFocus;
  const focusKey = recFocus ? JSON.stringify([recFocus, edit.kind, locked]) : "";
  useEffect(() => {
    if (!focusKey) return;
    const [focus, kind, ro] = JSON.parse(focusKey);
    const examples = ro
      ? ["Bunu tamamladım", "Bu konuşmayı özetle", "Ana hesaba hazır olduğunu yaz"]
      : focus.log
        ? ["Günlüğe yaz: 12 knot poyraz, start çalıştık", "Çok iyi geçti, 90 dakika sürdü", "Saatini 10 yap"]
        : [kind === "task" ? "Bu görevi tamamla" : kind === "plan" ? "Saatini 10 yap" : "Bundan görev çıkar", "Yarına ertele", "Ali'ye bununla ilgili yaz"];
    const say = (detail) => window.dispatchEvent(new CustomEvent("sa-record-focus", { detail }));
    say({ focus, examples });
    return () => say(null);
  }, [focusKey]);

  // Kayıt başka yerden (ana asistan, başka cihaz) değişince elle değişiklik yoksa ekrandaki bilgiler güncellenir; silinirse ekran kapanır
  const recKey = edit && rec ? editKey(fromRecord(edit.kind, rec)) : "";
  const seenFor = useRef(null);
  useEffect(() => {
    if (!open || !edit) return;
    if (!rec) {
      if (seenFor.current === seed?.id) onClose();
      return;
    }
    seenFor.current = seed?.id;
    if (recKey === orig.current || dirty) return;
    orig.current = recKey;
    setDrafts([fromRecord(edit.kind, rec)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed?.id, recKey]);
  const padB = recDock ? "pb-3" : "pb-[calc(0.75rem+env(safe-area-inset-bottom))]";
  const primary = "h-12 flex-[1.6] rounded-xl bg-acc text-base font-semibold text-white transition active:scale-[.98] disabled:opacity-40";

  const askObj = ask
    ? {
      chips:
        ask.kind === "time"
          ? [...TIME_CHIPS.map(([l, v]) => ({ label: l, onPick: () => pickChip("time", v) })), { label: "Tüm gün", onPick: () => pickChip("time", "allday") }]
          : [{ label: "Bugün", onPick: () => pickChip("date", todayStr()) }, { label: "Yarın", onPick: () => pickChip("date", addDays(1)) }],
      hint: ask.kind === "time" ? "Cevap vermezsen tüm gün olarak eklerim." : "",
    }
    : null;

  return (
    <Screen voice open={open} onClose={shut} title={title}>
      {/* Üst çubuk (sabit) */}
      <header className="flex shrink-0 items-center justify-between px-5 py-3">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <div className="flex items-center gap-2">
          {edit && locked ? null : edit ? (
            <button onClick={removeRecord} aria-label="Sil" className="grid size-9 place-items-center rounded-full text-rec transition active:scale-90 active:bg-rec/10">
              <Icon name="trash" className="size-5" />
            </button>
          ) : (
            <SpeakToggle />
          )}
          <button onClick={shut} aria-label="Kapat" className="grid size-9 place-items-center rounded-full bg-card text-mut ring-1 ring-line transition active:scale-90">
            <Icon name="x" className="size-[1.125rem]" />
          </button>
        </div>
      </header>

      {/* İçerik (kayar) */}
      <div ref={scrollRef} data-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        {edit && locked && rec ? (
          <AssignedView
            kind={edit.kind}
            rec={rec}
            planTitle={linkedPlan}
            myUid={myUid}
            nameOf={nameOf}
            onDone={(on) => {
              setMyDone(edit.kind, edit.id, on);
              toast(on ? doneOf(edit.kind).toast : "Geri alındı");
            }}
            onReply={(t) => {
              addReply(edit.kind, edit.id, t);
              toast("Mesaj gönderildi");
            }}
            docked
          />
        ) : edit ? (
          <>
            {drafts[0] && (
              <EditCard
                d={drafts[0]}
                meta={recMeta}
                planTitle={linkedPlan}
                done={!!rec?.done}
                onToggleDone={() => {
                  toggleTask(edit.id);
                  toast(rec?.done ? "Görev yeniden açıldı" : "Görev yapıldı");
                }}
                assign={assign}
                onAddStaff={addStaff}
                onChange={(patch) => update(0, patch)}
                acks={
                  rec && !isStaff
                    ? assigneesOf(rec)
                      .filter((u) => u !== rec.createdByUid)
                      .map((u) => ({ uid: u, name: nameOf(u) || "Kişi", ...ackState(rec, u) }))
                    : []
                }
              />
            )}
            {/* Mesajlar (atananlar ve ana hesap) + asistan: değiştir ya da mesajı yazdır */}
            {edit.kind === "plan" && rec && !locked && <CancelPlan key={rec.id} rec={rec} by={by} start={!!edit.cancel} />}
            {edit.kind === "plan" && rec && !locked && <TrainingLog key={`log-${rec.id}`} rec={rec} by={by} />}
            {edit.kind === "task" && rec?.invoice && <TaskInvoice inv={rec.invoice} owner={!isStaff} />}
            {edit.kind === "plan" && rec?.seriesId && (
              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
                <Icon name="repeat" className="size-5 shrink-0 text-mut" />
                <span className="min-w-0 flex-1 text-[0.875rem] leading-snug">
                  <b className="block font-semibold">{repeatLabel(rec.repeat?.until)}</b>
                  <span className="text-mut">Değişiklik yalnız bu haftaya uygulanır.</span>
                </span>
                {!isStaff && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (seriesAsk !== rec.id) return setSeriesAsk(rec.id);
                      const n = await deleteSeries(rec.seriesId, rec.date);
                      setSeriesAsk(null);
                      if (n) {
                        toast(`${n} haftalık plan silindi`);
                        onClose();
                      }
                    }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold transition active:scale-95 ${seriesAsk === rec.id ? "bg-rec text-white" : "text-rec ring-1 ring-rec/30"}`}
                  >
                    {seriesAsk === rec.id ? "Emin misin? Sil" : "Bu ve sonrakileri sil"}
                  </button>
                )}
              </div>
            )}
            {hasThread && <Replies key={rec.id} rec={rec} myUid={myUid} nameOf={nameOf} onSend={(t) => addReply(edit.kind, edit.id, t)} placeholder="Mesaj yaz…" docked />}
            <div className="mt-3" />
          </>
        ) : (
          <>
            {manual ? (
              /* Elle ekleme: yalnızca form */
              <>
                {drafts.map((d, i) => (
                  <div key={d._id} className={i ? "mt-6" : ""}>
                    <DraftCard d={d} index={i} plan={plan} bare noRemove={drafts.length === 1} assign={assign} onAddStaff={addStaff} onChange={update} onType={changeType} onRemove={remove} />
                  </div>
                ))}
                <button onClick={() => setDrafts((p) => [...p, blank(drafts[drafts.length - 1].type)])} className="mx-auto mt-5 block text-[0.875rem] font-medium text-mut transition active:opacity-50">
                  + Bir kayıt daha
                </button>
              </>
            ) : !chat ? (
              /* Başlangıç: elle ekleme için üç sade düğme; yazarak/konuşarak ekleme ana asistanla */
              <div className="pt-6">
                <p className="px-1 text-[1.375rem] font-semibold leading-snug tracking-tight">Ne eklemek istersin?</p>
                <p className="mt-1 px-1 text-[0.875rem] text-mut">Asistana söyle; plan, görev ya da not olarak o ayırır.</p>
                <button type="button" onClick={toAssistant} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white transition active:scale-[.98]">
                  <Icon name="mic" className="size-5" />
                  Asistana söyle
                </button>
                <div className="mt-8 flex items-center gap-2 px-1">
                  <span className="mr-1 text-[0.8125rem] text-mut">Elle ekle</span>
                  {MANUAL.map(([t, l, ic]) => (
                    <button
                      key={t}
                      onClick={() => setDrafts([blank(t)])}
                      className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-[0.875rem] font-medium shadow-[0_1px_3px_rgba(38,40,44,.07)] transition active:scale-95"
                    >
                      <Icon name={ic} className="size-4 text-acc" />
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Konuşma: mesajlar + kaydedilecekler + altta yazı alanı */
              <>
                <Thread turns={turns} engine={reply.engine} tts={tts} ask={askObj} canFix={false} />
                {whoAsk && (
                  <div className="fade-in mt-4 rounded-2xl bg-card px-4 py-3.5 ring-1 ring-line">
                    <b className="block text-[0.9375rem] font-semibold">Birden fazla {whoAsk.said} var, hangisi?</b>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {whoAsk.options.map((n) => (
                        <button key={n} type="button" onClick={() => pickWhich(n)} className="rounded-full bg-acc/10 px-3.5 py-1.5 text-[0.9375rem] font-medium text-acc transition active:scale-95">
                          {n}
                        </button>
                      ))}
                      <button type="button" onClick={() => setWhoAsk(null)} className="rounded-full px-3 py-1.5 text-[0.875rem] text-mut">
                        Hiçbiri
                      </button>
                    </div>
                  </div>
                )}
                <section className="mt-6">
                  {drafts.length > 0 && <h3 className="px-1 text-[0.8125rem] font-medium text-mut">Kaydedilecek · {drafts.length}</h3>}
                  {drafts.length > 0 && (
                    <div className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
                      {drafts.map((d, i) => (
                        <ItemCard key={d._id} d={d} index={i} plan={plan} assign={assign} onAddStaff={addStaff} onChange={update} onType={changeType} onRemove={remove} />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>

      {/* Alt butonlar (sabit). Kayıt ekranının kendi asistanı yok: değişiklik için alttaki ana asistan kubbesi (recDock) */}
      {edit && rec && (locked || hasThread) ? (
        /* Mesajlaşma: yazma alanı altta sabit (WhatsApp gibi); değişiklik varsa üstünde Kaydet */
        <footer data-pagebar className={`shrink-0 border-t border-line bg-bg px-4 pt-2.5 ${recDock ? "pb-2.5" : "pb-[calc(0.625rem+env(safe-area-inset-bottom))]"}`}>
          {!locked && dirty && (
            <button onClick={saveEdit} className="mb-2.5 h-11 w-full rounded-xl bg-acc text-[0.9375rem] font-semibold text-white transition active:scale-[.98]">
              Değişikliği kaydet
            </button>
          )}
          <ReplyComposer
            onSend={(t) => {
              addReply(edit.kind, edit.id, t);
              if (locked) toast("Mesaj gönderildi");
            }}
            placeholder={locked ? "Ana hesaba mesaj yaz…" : "Mesaj yaz…"}
            kind={edit.kind}
            rec={rec}
            nameOf={nameOf}
            myUid={myUid}
            orb={false}
          />
        </footer>
      ) : !locked && (edit || drafts.length > 0) && (
        <footer data-pagebar className={`flex shrink-0 gap-2.5 bg-bg px-5 pt-3 ${padB}`}>
          {edit ? (
            <button onClick={saveEdit} disabled={!dirty} className={`${primary} flex-1`}>
              {dirty ? "Kaydet" : "Değişiklik yok"}
            </button>
          ) : pickAssign ? (
            <AssignAsk
              members={members}
              pick={pickAssign}
              count={drafts.filter((d) => !d.assignees?.length && !d._general).length}
              total={drafts.length}
              onPick={setPickAssign}
              onSave={saveWith}
              onBack={() => setPickAssign(null)}
            />
          ) : (
            <button onClick={create} className={`${primary} flex-1`}>
              {drafts.length > 1 ? `Kaydet (${drafts.length})` : "Kaydet"}
            </button>
          )}
        </footer>
      )}
      {recDock && <div aria-hidden="true" className="shrink-0" style={{ height: "var(--rec-h, 0px)" }} />}
    </Screen>
  );
}

// Kaydetmeden önce: "Sorumlu eklemek ister misin?" Çalışan seçilirse sorumlusu olmayan kayıtlara eklenir.
function AssignAsk({ members, pick, count, total, onPick, onSave, onBack }) {
  const toggle = (uid) => onPick(pick.includes(uid) ? pick.filter((u) => u !== uid) : [...pick, uid]);
  const names = pick.map((u) => members.find((m) => m.uid === u)?.name.split(" ")[0]).filter(Boolean);
  return (
    <div className="animate-pop w-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <b className="block text-[1rem] font-semibold tracking-tight">Sorumlu eklemek ister misin?</b>
          <small className="text-[0.8125rem] text-mut">
            {total > 1 && count < total ? `Sorumlusu olmayan ${count} kayda eklenir.` : total > 1 ? `${total} kaydın hepsine eklenir.` : "Birden fazla kişi seçebilirsin."}
          </small>
        </div>
        <button type="button" onClick={onBack} aria-label="Geri" className="grid size-8 shrink-0 place-items-center rounded-full text-mut active:bg-line">
          <Icon name="x" className="size-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {members.map((m) => {
          const on = pick.includes(m.uid);
          return (
            <button
              key={m.uid}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(m.uid)}
              className={`inline-flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3.5 text-[0.9375rem] font-medium transition active:scale-95 ${on ? "bg-acc text-white" : "bg-card text-fg ring-1 ring-line"}`}
            >
              <span className={`grid size-7 place-items-center rounded-full text-[0.75rem] font-semibold ${on ? "bg-white/20" : "bg-acc/10 text-acc"}`}>
                {on ? <Icon name="check" className="size-4" /> : (m.name || "?")[0]}
              </span>
              {m.name}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex gap-2.5">
        <button type="button" onClick={() => onSave([])} className="h-12 flex-1 whitespace-nowrap rounded-xl border border-line bg-card px-2 text-[0.9375rem] font-semibold transition active:scale-[.98]">
          Sorumlusuz kaydet
        </button>
        <button
          type="button"
          onClick={() => onSave(pick)}
          disabled={!pick.length}
          className="h-12 min-w-0 flex-1 truncate rounded-xl bg-acc px-3 text-[0.9375rem] font-semibold text-white transition active:scale-[.98] disabled:opacity-40"
        >
          {names.length ? `${names.join(", ")} ile kaydet` : "Kişi seç"}
        </button>
      </div>
    </div>
  );
}
