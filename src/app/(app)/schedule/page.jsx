"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Screen } from "@/components/ui/Screen";
import { Sheet } from "@/components/ui/Sheet";
import { BarButton, VoiceTextBar } from "@/components/ui/VoiceTextBar";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { useSpeech } from "@/hooks/useSpeech";
import { authFetch } from "@/lib/authFetch";
import { weekdayOf } from "@/lib/agenda";
import { compressImage } from "@/lib/image";
import { cap, todayStr } from "@/lib/utils/format";

const DAYS = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
const SHORT = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
const field = "h-12 w-full rounded-xl bg-bg px-3.5 text-base text-fg outline-none focus:bg-card focus:ring-1 focus:ring-acc";
const byTime = (a, b) => (a.start || "").localeCompare(b.start || "");
const span = (l) => (l.end ? `${l.start}–${l.end}` : l.start);

async function askAI(payload) {
  const res = await authFetch("/api/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ders programı çıkarılamadı");
  return data; // { lessons, message }
}

// Ders programı: haftalık tekrarlanan dersler. Ekleme: tek tek, yazarak/konuşarak ya da fotoğrafla (yapay zeka önizler, sen kaydedersin).
export default function SchedulePage() {
  const { lessons, saveLessons, updateLesson, removeWithUndo, myUid } = useData();
  const toast = useToast();
  const [day, setDay] = useState(() => weekdayOf(todayStr()));
  const [edit, setEdit] = useState(null); // { id? , ...ders } | null
  const [preview, setPreview] = useState(null); // { lessons, message } | null
  const [busy, setBusy] = useState(""); // "photo" | "text" | ""
  const fileRef = useRef(null);
  const mine = lessons.filter((l) => l.createdByUid === myUid);

  async function run(payload, kind) {
    setBusy(kind);
    try {
      const r = await askAI({ ...payload, current: mine.map(({ title, day: d, start, end, place, teacher }) => ({ title, day: d, start, end, place, teacher })) });
      if (!r.lessons.length) toast(r.message || "Ders bulamadım");
      else setPreview(r);
    } catch (e) {
      toast(e.message);
    }
    setBusy("");
  }

  const sp = useSpeech({ onFinal: (tx) => run({ text: tx }, "text"), onFail: (m) => toast(m) });
  const listening = sp.status === "listening";

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const img = await compressImage(file, 1800, 0.8); // tablo yazıları okunabilsin
      run({ image: img.base64, mimeType: img.mimeType }, "photo");
    } catch (err) {
      toast(err.message || "Fotoğraf açılamadı");
    }
  }

  function pickPhoto() {
    fileRef.current?.click();
  }
  const newLesson = () => setEdit({ title: "", day, start: "09:00", end: "09:45", place: "", teacher: "" });
  const listen = () => sp.start({ autoStop: 6000 });

  const list = lessons.filter((l) => l.day === day).sort(byTime);
  const counts = SHORT.map((_, i) => lessons.filter((l) => l.day === i + 1).length);
  const today = weekdayOf(todayStr());

  return (
    <main className="mx-auto max-w-[480px] px-5 pb-[calc(120px+env(safe-area-inset-bottom))]">
      <PageHeader title="Ders programı" sub={lessons.length ? `Haftada ${lessons.length} ders` : "Henüz ders yok"} />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />

      {/* Günler */}
      <div className="mt-1 grid grid-cols-7 gap-1 rounded-2xl bg-card p-1 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        {SHORT.map((s, i) => {
          const on = day === i + 1;
          return (
            <button
              key={s}
              onClick={() => setDay(i + 1)}
              className={`flex flex-col items-center rounded-xl py-2 text-[13px] font-medium transition ${on ? "bg-acc text-white" : i + 1 === today ? "text-acc" : "text-fg"}`}
            >
              {s}
              <span className={`mt-0.5 text-[11px] tabular-nums ${on ? "text-white/80" : "text-mut"}`}>{counts[i] || "·"}</span>
            </button>
          );
        })}
      </div>

      {/* O günün dersleri */}
      <h2 className="mt-5 px-1 text-[17px] font-semibold tracking-tight">
        {DAYS[day - 1]}
        {day === today && <span className="ml-2 text-[13px] font-medium text-acc">Bugün</span>}
      </h2>
      {busy ? (
        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-card px-4 py-5 text-[14px] text-mut">
          <Icon name="load" className="size-5 animate-spin text-acc" />
          {busy === "photo" ? "Fotoğraftaki program okunuyor…" : "Ders programı hazırlanıyor…"}
        </div>
      ) : list.length ? (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
          {list.map((l) => (
            <li key={l.id}>
              <button onClick={() => setEdit(l)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                <span className="w-[92px] shrink-0 text-[13px] font-semibold tabular-nums text-acc">{span(l)}</span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[15px] font-medium">{l.title}</b>
                  {(l.place || l.teacher) && <small className="block truncate text-[13px] text-mut">{[l.place, l.teacher].filter(Boolean).join(" · ")}</small>}
                </span>
                <Icon name="chev" className="size-4 shrink-0 text-mut/70" />
              </button>
            </li>
          ))}
        </ul>
      ) : lessons.length ? (
        <p className="mt-2 rounded-2xl bg-card px-4 py-5 text-center text-[14px] text-mut">Bu gün ders yok.</p>
      ) : (
        /* Hiç ders yok: üç yol */
        <div className="mt-2 space-y-2">
          <Way icon="camera" title="Fotoğrafını çek" sub="Ders programının fotoğrafından çıkarırım" onClick={pickPhoto} />
          <Way icon="mic" title="Söyle ya da yaz" sub="“Pazartesi 9’da matematik, 10:30’da fizik…”" onClick={listen} />
          <Way icon="plus" title="Tek tek ekle" sub="Ders, gün ve saatleri kendin gir" onClick={newLesson} />
        </div>
      )}

      {listening && (
        <div className="fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-[448px] items-center gap-3 rounded-2xl bg-fg px-4 py-3 text-white shadow-lg">
          <span className="size-2.5 animate-pulse rounded-full bg-rec" />
          <span className="min-w-0 flex-1 truncate text-[14px]">{`${sp.finalText || ""}${sp.interim || ""}` || "Dinliyorum… dersleri, günleri ve saatleri söyle"}</span>
          <button onClick={() => sp.stop("send")} className="rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold">Bitti</button>
        </div>
      )}

      <VoiceTextBar
        placeholder="ör. salı 13:00 fizik B-204"
        onMic={listen}
        onSend={(t) => run({ text: t }, "text")}
        leading={
          <>
            <BarButton icon="plus" label="Ders ekle" onClick={newLesson} />
            <BarButton icon="camera" label="Fotoğraftan ekle" onClick={pickPhoto} />
          </>
        }
      />

      {edit && (
        <LessonSheet
          lesson={edit}
          onClose={() => setEdit(null)}
          onSave={(l, days) => {
            if (edit.id) updateLesson(edit.id, l);
            else saveLessons(days.map((d) => ({ ...l, day: d })));
            toast(edit.id ? "Ders güncellendi" : days.length > 1 ? `${days.length} güne eklendi` : "Ders eklendi");
            setEdit(null);
          }}
          onDelete={
            edit.id
              ? () => {
                removeWithUndo("lesson", edit.id);
                setEdit(null);
              }
              : null
          }
        />
      )}

      <Screen open={!!preview} onClose={() => setPreview(null)} title="Ders programı önizleme">
        {preview && (
          <Preview
            data={preview}
            hasOld={mine.length > 0}
            onClose={() => setPreview(null)}
            onSave={(list, replace) => {
              const n = saveLessons(list, { replace });
              toast(`${n} ders kaydedildi`);
              setPreview(null);
            }}
          />
        )}
      </Screen>
    </main>
  );
}

// Boş programda ekleme yollarından biri
function Way({ icon, title, sub, onClick }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3.5 text-left shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-[.99]">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0">
        <b className="block text-[15px] font-semibold">{title}</b>
        <small className="block truncate text-[13px] text-mut">{sub}</small>
      </span>
    </button>
  );
}

// Tek ders: ekle (birden çok gün seçilebilir) ya da düzenle
function LessonSheet({ lesson, onClose, onSave, onDelete }) {
  const [f, setF] = useState(lesson);
  const [days, setDays] = useState([lesson.day]);
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const isNew = !lesson.id;
  function save() {
    const title = cap(String(f.title || "").trim());
    if (!title) return;
    if (!f.start) return;
    onSave({ title, start: f.start, end: f.end && f.end > f.start ? f.end : "", place: f.place.trim(), teacher: f.teacher.trim(), ...(isNew ? {} : { day: f.day }) }, isNew ? days : [f.day]);
  }
  return (
    <Sheet open onClose={onClose} title={isNew ? "Ders ekle" : "Ders"}>
      <div className="space-y-3.5 pb-2">
        <input value={f.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ders adı, ör. Matematik" autoCapitalize="words" className={field} autoFocus={isNew} />
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-mut">{isNew ? "Günler (birden çok seçebilirsin)" : "Gün"}</label>
          <div className="grid grid-cols-7 gap-1">
            {SHORT.map((s, i) => {
              const d = i + 1;
              const on = isNew ? days.includes(d) : f.day === d;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => (isNew ? setDays((x) => (x.includes(d) ? (x.length > 1 ? x.filter((y) => y !== d) : x) : [...x, d].sort())) : set({ day: d }))}
                  className={`rounded-xl py-2 text-[13px] font-medium transition active:scale-95 ${on ? "bg-acc text-white" : "bg-bg text-fg"}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex-1">
            <span className="mb-1.5 block text-[13px] font-medium text-mut">Başlangıç</span>
            <input type="time" value={f.start} onChange={(e) => set({ start: e.target.value })} className={`${field} tabular-nums`} />
          </label>
          <label className="flex-1">
            <span className="mb-1.5 block text-[13px] font-medium text-mut">Bitiş</span>
            <input type="time" value={f.end} onChange={(e) => set({ end: e.target.value })} className={`${field} tabular-nums`} />
          </label>
        </div>
        <div className="flex gap-2">
          <input value={f.place} onChange={(e) => set({ place: e.target.value })} placeholder="Derslik" className={field} />
          <input value={f.teacher} onChange={(e) => set({ teacher: e.target.value })} placeholder="Öğretmen" autoCapitalize="words" className={field} />
        </div>
        <div className="flex gap-2.5 pt-1">
          {onDelete && (
            <button type="button" onClick={onDelete} className="h-12 flex-1 rounded-xl border border-line bg-card text-[15px] font-semibold text-rec active:scale-[.98]">
              Sil
            </button>
          )}
          <button type="button" onClick={save} disabled={!String(f.title || "").trim() || !f.start} className="h-12 flex-[1.6] rounded-xl bg-acc text-[15px] font-semibold text-white active:scale-[.98] disabled:opacity-40">
            Kaydet
          </button>
        </div>
      </div>
    </Sheet>
  );
}

// Yapay zekanın çıkardığı program: gün gün liste, istemediğin dersi çıkar, sonra kaydet
function Preview({ data, hasOld, onClose, onSave }) {
  const [list, setList] = useState(data.lessons.map((l, i) => ({ ...l, _k: i })));
  const [replace, setReplace] = useState(hasOld);
  const byDay = DAYS.map((name, i) => ({ name, items: list.filter((l) => l.day === i + 1).sort(byTime) })).filter((g) => g.items.length);
  return (
    <>
      <header className="flex shrink-0 items-center justify-between px-5 py-3">
        <h2 className="text-xl font-bold tracking-tight">Önizleme</h2>
        <button onClick={onClose} aria-label="Kapat" className="grid size-9 place-items-center rounded-full bg-card text-mut ring-1 ring-line active:scale-90">
          <Icon name="x" className="size-[18px]" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        <div className="flex items-start gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-acc text-white"><Icon name="spark" className="size-3.5" /></span>
          <p className="rounded-2xl rounded-tl-md bg-card px-3.5 py-2.5 text-[15px] leading-snug ring-1 ring-line">{data.message}</p>
        </div>
        {byDay.map((g) => (
          <section key={g.name} className="mt-5">
            <h3 className="px-1 text-[13px] font-semibold text-mut">{g.name}</h3>
            <ul className="mt-1.5 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
              {g.items.map((l) => (
                <li key={l._k} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-[92px] shrink-0 text-[13px] font-semibold tabular-nums text-acc">{span(l)}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[15px] font-medium">{l.title}</b>
                    {(l.place || l.teacher) && <small className="block truncate text-[13px] text-mut">{[l.place, l.teacher].filter(Boolean).join(" · ")}</small>}
                  </span>
                  <button onClick={() => setList((x) => x.filter((y) => y._k !== l._k))} aria-label="Çıkar" className="grid size-8 shrink-0 place-items-center rounded-full text-mut active:bg-bg">
                    <Icon name="x" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {hasOld && (
          <label className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-[14px]">
            <span>
              <b className="block font-medium">Eski programı değiştir</b>
              <small className="text-mut">Kapalıysa bu dersler mevcut programa eklenir</small>
            </span>
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-5 accent-[var(--acc)]" />
          </label>
        )}
      </div>
      <footer className="flex shrink-0 gap-2.5 bg-bg px-5 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">
        <button
          onClick={() => onSave(list.map(({ _k, ...l }) => l), replace)}
          disabled={!list.length}
          className="h-12 flex-1 rounded-xl bg-acc text-base font-semibold text-white active:scale-[.98] disabled:opacity-40"
        >
          Kaydet ({list.length} ders)
        </button>
      </footer>
    </>
  );
}
