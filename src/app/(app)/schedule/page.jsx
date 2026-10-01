"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Empty, Hero, HeroLabel, Label, card } from "@/components/ui/Page";
import { useNow } from "@/hooks/useNow";
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
import { Loader } from "@/components/ui/Loader";
import { ListeningOverlay } from "@/features/add/Stage";

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
  const now = useNow();
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

  const nowHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todays = lessons.filter((l) => l.day === today).sort(byTime);
  const cur = todays.find((l) => l.start <= nowHM && (l.end || l.start) > nowHM);
  const nxt = todays.find((l) => l.start > nowHM);
  const max = Math.max(1, ...counts);
  const live = (l) => day === today && l.start <= nowHM && (l.end || l.start) > nowHM;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Ders programı" sub={lessons.length ? `Haftada ${lessons.length} ders` : "Henüz ders yok"} />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />

      {/* Üst: bugün şu an / sıradaki ders, altında haftanın günleri (ders yoğunluğu çubuğu; dokununca o gün) */}
      <Hero className="mt-2">
        <HeroLabel>BUGÜN · {DAYS[today - 1].toLocaleUpperCase("tr-TR")}</HeroLabel>
        {cur || nxt ? (
          <button type="button" onClick={() => setEdit(cur || nxt)} className="mt-1.5 flex w-full items-center gap-3 text-left">
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[1.375rem] font-semibold leading-tight tracking-tight">{(cur || nxt).title}</b>
              <small className="block truncate text-[0.8125rem] text-white/80">{[span(cur || nxt), (cur || nxt).place, (cur || nxt).teacher].filter(Boolean).join(" · ")}</small>
            </span>
            <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-[0.75rem] font-semibold">{cur ? "Şu an" : "Sıradaki"}</span>
          </button>
        ) : (
          <p className="mt-1.5 text-[0.9375rem] text-white/85">{todays.length ? "Bugünün dersleri bitti." : "Bugün ders yok."}</p>
        )}
        <div className="mt-4 grid grid-cols-7 gap-1">
          {SHORT.map((s, i) => {
            const on = day === i + 1;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setDay(i + 1)}
                aria-pressed={on}
                aria-label={`${DAYS[i]}: ${counts[i]} ders`}
                className={`flex flex-col items-center rounded-2xl pb-2 pt-1.5 transition active:scale-95 ${on ? "bg-white text-[#2c5163]" : "bg-white/10"}`}
              >
                <span className="flex h-7 items-end">
                  <i className={`block w-2 rounded-full ${on ? "bg-[#2c5163]" : "bg-white/70"}`} style={{ height: `${counts[i] ? Math.max(5, (counts[i] / max) * 28) : 3}px` }} />
                </span>
                <span className={`mt-1 text-[0.75rem] font-semibold ${on ? "" : i + 1 === today ? "text-white" : "text-white/75"}`}>{s}</span>
                <span className={`text-[0.625rem] tabular-nums ${on ? "text-[#2c5163]/70" : "text-white/60"}`}>{counts[i] || "–"}</span>
              </button>
            );
          })}
        </div>
      </Hero>

      {/* O günün dersleri */}
      <Label right={list.length ? `${list.length} ders` : ""}>
        <span className={day === today ? "text-acc" : ""}>
          {DAYS[day - 1].toLocaleUpperCase("tr-TR")}
          {day === today ? " · BUGÜN" : ""}
        </span>
      </Label>
      {busy ? (
        <div className={`${card} flex items-center gap-3 px-4 py-5 text-[0.875rem] text-mut`}>
          <Loader size="sm" />
          {busy === "photo" ? "Fotoğraftaki program okunuyor…" : "Ders programı hazırlanıyor…"}
        </div>
      ) : list.length ? (
        <ul className={`${card} divide-y divide-line overflow-hidden`}>
          {list.map((l) => (
            <li key={l.id}>
              <button onClick={() => setEdit(l)} className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg ${live(l) ? "bg-acc/5" : ""}`}>
                <span className="w-14 shrink-0 whitespace-nowrap">
                  <b className="block text-[0.9375rem] font-bold tabular-nums">{l.start}</b>
                  <small className="block text-[0.6875rem] tabular-nums text-mut">{l.end || ""}</small>
                </span>
                <span className={`h-8 w-[3px] shrink-0 rounded-full ${live(l) ? "bg-acc" : "bg-line"}`} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-semibold">{l.title}</b>
                  {(l.place || l.teacher) && <small className="block truncate text-[0.75rem] text-mut">{[l.place, l.teacher].filter(Boolean).join(" · ")}</small>}
                </span>
                {live(l) ? <span className="shrink-0 rounded-full bg-acc/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-acc">şu an</span> : <Icon name="chev" className="size-4 shrink-0 text-mut/70" />}
              </button>
            </li>
          ))}
        </ul>
      ) : lessons.length ? (
        <Empty icon="book" title="Bu gün ders yok" />
      ) : (
        /* Hiç ders yok: üç yol */
        <div className="space-y-2">
          <Way icon="camera" title="Fotoğrafını çek" sub="Ders programının fotoğrafından çıkarırım" onClick={pickPhoto} />
          <Way icon="mic" title="Söyle ya da yaz" sub="“Pazartesi 9’da matematik, 10:30’da fizik…”" onClick={listen} />
          <Way icon="plus" title="Tek tek ekle" sub="Ders, gün ve saatleri kendin gir" onClick={newLesson} />
        </div>
      )}

      <ListeningOverlay sp={sp} hint="Dersleri, günleri ve saatleri söyle" onCancel={sp.cancel} onSend={() => sp.stop("send")} />

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
    <button onClick={onClick} className={`${card} flex w-full items-center gap-3 px-4 py-3.5 text-left active:scale-[.99]`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0">
        <b className="block text-[0.9375rem] font-semibold">{title}</b>
        <small className="block truncate text-[0.8125rem] text-mut">{sub}</small>
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
          <label className="mb-1.5 block text-[0.8125rem] font-medium text-mut">{isNew ? "Günler (birden çok seçebilirsin)" : "Gün"}</label>
          <div className="grid grid-cols-7 gap-1">
            {SHORT.map((s, i) => {
              const d = i + 1;
              const on = isNew ? days.includes(d) : f.day === d;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => (isNew ? setDays((x) => (x.includes(d) ? (x.length > 1 ? x.filter((y) => y !== d) : x) : [...x, d].sort())) : set({ day: d }))}
                  className={`rounded-xl py-2 text-[0.8125rem] font-medium transition active:scale-95 ${on ? "bg-acc text-white" : "bg-bg text-fg"}`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex-1">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-mut">Başlangıç</span>
            <input type="time" value={f.start} onChange={(e) => set({ start: e.target.value })} className={`${field} tabular-nums`} />
          </label>
          <label className="flex-1">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-mut">Bitiş</span>
            <input type="time" value={f.end} onChange={(e) => set({ end: e.target.value })} className={`${field} tabular-nums`} />
          </label>
        </div>
        <div className="flex gap-2">
          <input value={f.place} onChange={(e) => set({ place: e.target.value })} placeholder="Derslik" className={field} />
          <input value={f.teacher} onChange={(e) => set({ teacher: e.target.value })} placeholder="Öğretmen" autoCapitalize="words" className={field} />
        </div>
        <div className="flex gap-2.5 pt-1">
          {onDelete && (
            <button type="button" onClick={onDelete} className="h-12 flex-1 rounded-xl border border-line bg-card text-[0.9375rem] font-semibold text-rec active:scale-[.98]">
              Sil
            </button>
          )}
          <button type="button" onClick={save} disabled={!String(f.title || "").trim() || !f.start} className="h-12 flex-[1.6] rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-40">
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
          <Icon name="x" className="size-[1.125rem]" />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
        <div className="flex items-start gap-2.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-acc text-white"><Icon name="spark" className="size-3.5" /></span>
          <p className="rounded-2xl rounded-tl-md bg-card px-3.5 py-2.5 text-[0.9375rem] leading-snug ring-1 ring-line">{data.message}</p>
        </div>
        {byDay.map((g) => (
          <section key={g.name} className="mt-5">
            <h3 className="px-1 text-[0.8125rem] font-semibold text-mut">{g.name}</h3>
            <ul className="mt-1.5 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
              {g.items.map((l) => (
                <li key={l._k} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-[5.75rem] shrink-0 text-[0.8125rem] font-semibold tabular-nums text-acc">{span(l)}</span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-medium">{l.title}</b>
                    {(l.place || l.teacher) && <small className="block truncate text-[0.8125rem] text-mut">{[l.place, l.teacher].filter(Boolean).join(" · ")}</small>}
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
          <label className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 text-[0.875rem]">
            <span>
              <b className="block font-medium">Eski programı değiştir</b>
              <small className="text-mut">Kapalıysa bu dersler mevcut programa eklenir</small>
            </span>
            <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} className="size-5 accent-[var(--acc)]" />
          </label>
        )}
      </div>
      <footer className="flex shrink-0 gap-2.5 bg-bg px-5 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
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
