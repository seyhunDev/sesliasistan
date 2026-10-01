"use client";

import { useEffect, useRef, useState } from "react";
import { Screen } from "@/components/ui/Screen";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdd } from "@/features/add/AddProvider";
import { MEETING_MAX_MS, useMeetingRecorder } from "@/hooks/useMeetingRecorder";
import { deleteMeeting, listMeetings, saveMeeting } from "@/lib/meeting/store";
import { toWav16k } from "@/lib/speech/wav";
import { summarizeMeeting, transcribeChunk } from "@/services/meetingService";
import { Loader } from "@/components/ui/Loader";

const mmss = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const when = (t) => new Date(t).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Toplantıyı işle: eksik parçaları çevir, özetle. Yapay zeka yoksa cihazda saklı kalır.
async function processMeeting(m) {
  let failed = false;
  for (const p of m.parts) {
    if (p.text == null && p.blob) {
      try {
        p.text = await transcribeChunk(await toWav16k(p.blob));
        p.blob = null;
      } catch {
        failed = true;
      }
    }
  }
  const text = m.parts.map((p) => p.text).filter(Boolean).join(" ").trim();
  if (failed) {
    await saveMeeting({ ...m, status: "stt" });
    return { saved: "stt", text };
  }
  if (text.length < 20) {
    await deleteMeeting(m.id);
    throw new Error("Konuşma algılanmadı, kayıt silindi.");
  }
  try {
    const result = await summarizeMeeting(text);
    await deleteMeeting(m.id);
    return { result, text };
  } catch (e) {
    await saveMeeting({ ...m, status: "sum" });
    return { saved: "sum", text, error: e.message };
  }
}

// Toplantı modu: en fazla 15 dk dinler, yazıya çevirir, yapay zekayla özet + eylem planı çıkarır
export function MeetingSheet({ open, onClose }) {
  const toast = useToast();
  const { openAdd } = useAdd();
  const rec = useMeetingRecorder({ onFail: (m) => toast(m) });
  const [view, setView] = useState("home"); // home | rec | work | result | saved
  const [work, setWork] = useState("");
  const [out, setOut] = useState(null); // { result, text } | { saved, text, error }
  const [pending, setPending] = useState([]);
  const listRef = useRef(null);

  const refresh = () => listMeetings().then(setPending);
  useEffect(() => {
    if (open && view === "home") refresh();
  }, [open, view]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [rec.parts]);

  async function begin() {
    if (await rec.start()) setView("rec");
  }

  async function finish() {
    setView("work");
    setWork("Son parçalar yazıya çevriliyor…");
    const r = await rec.stop();
    if (!r) return setView("home");
    const m = { id: `m${Date.now()}`, startedAt: Date.now() - r.sec * 1000, sec: r.sec, parts: r.parts, status: "stt" };
    await saveMeeting(m).catch(() => {}); // önce güvene al
    await run(m);
  }

  async function run(m) {
    setView("work");
    setWork("Yapay zeka özetliyor…");
    try {
      const o = await processMeeting(m);
      setOut(o);
      setView(o.result ? "result" : "saved");
      navigator.vibrate?.([10, 40, 10]);
    } catch (e) {
      toast(e.message);
      setView("home");
    }
  }

  function toDrafts() {
    const r = out.result;
    const body = [r.summary, r.decisions.length ? `Kararlar:\n${r.decisions.map((d) => `- ${d}`).join("\n")}` : ""].filter(Boolean).join("\n\n");
    const note = { type: "note", title: `Toplantı: ${r.title}`, body, date: "", endDate: "", time: "", place: "", link: false, cat: "Toplantı" };
    close();
    openAdd({ prefill: { text: `Toplantı: ${r.title}`, items: [note, ...r.items], message: r.message || "Toplantı özetini ve çıkan işleri hazırladım, kontrol edip kaydedebilirsin.", engine: "ai" } });
  }

  function asNote(text, title = "Toplantı metni") {
    close();
    openAdd({ prefill: { text: title, items: [{ type: "note", title, body: text, date: "", endDate: "", time: "", place: "", link: false, cat: "Toplantı" }], message: "Toplantı metnini not olarak hazırladım.", engine: "local" } });
  }

  function close() {
    if (rec.status === "rec") return toast("Önce kaydı bitir ya da vazgeç");
    setView("home");
    setOut(null);
    onClose();
  }

  const left = Math.max(0, MEETING_MAX_MS - rec.elapsed);
  const pct = Math.min(100, (rec.elapsed / MEETING_MAX_MS) * 100);
  const btn = "flex h-12 items-center justify-center gap-2 rounded-xl text-base font-semibold transition active:scale-[.98]";

  return (
    <Screen open={open} onClose={close} title="Toplantı modu">
      <header className="flex shrink-0 items-center justify-between px-5 py-3">
        <h2 className="text-xl font-bold tracking-tight">Toplantı modu</h2>
        <button onClick={close} aria-label="Kapat" className="grid size-9 place-items-center rounded-full bg-card text-mut ring-1 ring-line transition active:scale-90">
          <Icon name="x" className="size-[1.125rem]" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6">
        {view === "home" && (
          <div className="fade-in">
            <div className="rounded-2xl border border-line bg-card p-5 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-acc/10 text-acc">
                <Icon name="users" className="size-8" />
              </span>
              <p className="mt-3 text-[1.0625rem] font-semibold">Toplantıyı dinleyeyim</p>
              <p className="mt-1 text-[0.875rem] text-mut">En fazla 15 dakika. Bitince özet, kararlar ve yapılacak işleri çıkarırım. Yapay zekaya ulaşamazsam kaydı bu cihazda saklarım.</p>
              <button onClick={begin} className={`${btn} mt-5 w-full bg-acc text-white`}>
                <Icon name="mic" className="size-5" /> Kaydı başlat
              </button>
            </div>

            {pending.length > 0 && (
              <section className="mt-6">
                <h3 className="px-1 text-[0.8125rem] font-semibold text-mut">Bekleyen toplantılar</h3>
                <ul className="mt-2 space-y-2">
                  {pending.map((m) => {
                    const text = m.parts.map((p) => p.text).filter(Boolean).join(" ");
                    return (
                      <li key={m.id} className="rounded-2xl border border-line bg-card p-3.5">
                        <p className="text-[0.9375rem] font-medium">{when(m.startedAt)} · {mmss(m.sec * 1000)}</p>
                        <p className="text-[0.8125rem] text-mut">{m.status === "stt" ? "Ses yazıya çevrilemedi, kayıt saklı" : "Metin hazır, özet çıkarılamadı"}</p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <button onClick={() => run(m)} className="rounded-full bg-acc px-3.5 py-1.5 text-[0.8125rem] font-semibold text-white active:scale-95">Özetle</button>
                          {text && <button onClick={() => asNote(text)} className="rounded-full border border-line px-3.5 py-1.5 text-[0.8125rem] font-semibold active:scale-95">Not olarak kaydet</button>}
                          <button onClick={() => deleteMeeting(m.id).then(refresh)} className="rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-rec active:scale-95">Sil</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}

        {view === "rec" && (
          <div className="fade-in flex min-h-full flex-col">
            <div className="rounded-2xl border border-line bg-card p-5 text-center">
              <p className="flex items-center justify-center gap-2 text-[0.8125rem] font-semibold text-rec">
                <i className="rec-dot" /> Kaydediliyor
              </p>
              <p className="mt-2 text-[2.75rem] font-bold tabular-nums leading-none">{mmss(rec.elapsed)}</p>
              <p className="mt-1.5 text-[0.8125rem] tabular-nums text-mut">Kalan {mmss(left)}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-bg">
                <div className="h-full rounded-full bg-acc transition-[width] duration-300" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-4 flex h-8 items-center justify-center gap-1" aria-hidden="true">
                {Array.from({ length: 16 }, (_, i) => (
                  <span key={i} className="w-1.5 rounded-full bg-acc/70 transition-[height] duration-150" style={{ height: `${Math.max(4, rec.level * 32 * (0.5 + Math.abs(Math.sin(i + rec.elapsed / 300))))}px` }} />
                ))}
              </div>
            </div>

            <h3 className="mt-5 px-1 text-[0.8125rem] font-semibold text-mut">Metin (dakikada bir güncellenir)</h3>
            <div ref={listRef} className="mt-2 max-h-[34vh] min-h-24 overflow-y-auto rounded-2xl border border-line bg-card p-3.5 text-[0.9375rem] leading-relaxed">
              {rec.parts.length === 0 && <p className="text-mut">İlk dakika bitince metin burada görünecek…</p>}
              {rec.parts.map((p, i) => (
                <p key={i} className={p.state === "ok" ? "" : "text-mut"}>
                  {p.state === "ok" ? p.text || "…" : p.state === "wait" ? "Yazıya çevriliyor…" : "Bu bölüm çevrilemedi, ses saklanıyor."}
                </p>
              ))}
            </div>

            <div className="mt-auto flex gap-2.5 pt-5">
              <button onClick={() => { rec.cancel(); setView("home"); }} className={`${btn} flex-1 border border-line bg-card`}>Vazgeç</button>
              <button onClick={finish} className={`${btn} flex-[1.6] bg-acc text-white`}>
                <Icon name="stop" className="size-4" /> Bitir ve özetle
              </button>
            </div>
          </div>
        )}

        {view === "work" && (
          <div className="fade-in flex flex-col items-center py-16 text-center">
            <Loader size="lg" />
            <p className="mt-4 text-[1rem] font-semibold">{work}</p>
            <p className="mt-1 text-[0.8125rem] text-mut">Bu birkaç saniye sürebilir.</p>
          </div>
        )}

        {view === "result" && out?.result && (
          <div className="fade-in space-y-4">
            <div className="rounded-2xl border border-line bg-card p-4">
              <p className="text-[0.8125rem] font-semibold text-mut">Özet</p>
              <p className="mt-1 text-[1.0625rem] font-semibold">{out.result.title}</p>
              <p className="mt-2 whitespace-pre-line text-[0.9375rem] leading-relaxed">{out.result.summary}</p>
            </div>
            {out.result.decisions.length > 0 && (
              <div className="rounded-2xl border border-line bg-card p-4">
                <p className="text-[0.8125rem] font-semibold text-mut">Kararlar</p>
                <ul className="mt-2 space-y-1.5 text-[0.9375rem]">
                  {out.result.decisions.map((d, i) => (
                    <li key={i} className="flex gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-emerald-600" />{d}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="rounded-2xl border border-line bg-card p-4">
              <p className="text-[0.8125rem] font-semibold text-mut">Eylem planı · {out.result.items.length}</p>
              {out.result.items.length ? (
                <ul className="mt-2 space-y-1.5 text-[0.9375rem]">
                  {out.result.items.map((it, i) => (
                    <li key={i} className="flex items-baseline gap-2">
                      <span className="w-12 shrink-0 text-[0.75rem] font-semibold text-acc">{{ plan: "Plan", task: "Görev", note: "Not" }[it.type]}</span>
                      <span className="min-w-0 flex-1">{it.title}{it.date && <span className="text-mut"> · {it.date}{it.time ? ` ${it.time}` : ""}</span>}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[0.875rem] text-mut">Yapılacak iş çıkmadı.</p>
              )}
            </div>
            <button onClick={toDrafts} className={`${btn} w-full bg-acc text-white`}>Özeti ve işleri kaydetmeye hazırla</button>
            <button onClick={() => asNote(out.text)} className="h-11 w-full text-[0.9375rem] font-semibold text-mut active:text-fg">Yalnızca tam metni not olarak kaydet</button>
          </div>
        )}

        {view === "saved" && out && (
          <div className="fade-in py-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-100 text-amber-800">
              <Icon name="alert" className="size-7" />
            </span>
            <p className="mt-3 text-[1.0625rem] font-semibold">Kayıt bu cihazda saklandı</p>
            <p className="mx-auto mt-1 max-w-[20rem] text-[0.875rem] text-mut">
              {out.saved === "stt" ? "Sesin bir kısmı yazıya çevrilemedi." : `Özet çıkarılamadı${out.error ? ` (${out.error})` : ""}.`} Toplantı modunda “Bekleyen toplantılar”dan tekrar özetleyebilirsin.
            </p>
            <div className="mx-auto mt-5 flex max-w-[20rem] flex-col gap-2">
              {out.text && <button onClick={() => asNote(out.text)} className={`${btn} border border-line bg-card`}>Metni şimdi not olarak kaydet</button>}
              <button onClick={() => setView("home")} className={`${btn} bg-acc text-white`}>Tamam</button>
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}
