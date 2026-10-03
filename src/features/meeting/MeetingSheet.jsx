"use client";

import { useEffect, useRef, useState } from "react";
import { Screen } from "@/components/ui/Screen";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useMeetingRecorder } from "@/hooks/useMeetingRecorder";
import { useData } from "@/features/data/DataProvider";
import { dmId, sendErrorText, useChat } from "@/features/chat/ChatProvider";
import { GROUPS } from "@/lib/kinds";
import { clock, onlyTalk, recipientOf, summaryText } from "@/lib/meeting/result";
import { deleteMeeting, listMeetings, saveMeeting } from "@/lib/meeting/store";
import { toWav16k } from "@/lib/speech/wav";
import { summarizeMeeting, transcribeChunk } from "@/services/meetingService";
import { Loader } from "@/components/ui/Loader";

const mmss = clock;
const stamp = () => Date.now();
const when = (t) => new Date(t).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Toplantıyı işle: eksik parçaları çevir, tüm metni yapay zekaya gönder. Yapay zeka yoksa cihazda saklı kalır.
// who: { people (çalışan adları, sorumlu için), contacts (mesaj kişileri) }
async function processMeeting(m, who) {
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
    const result = await summarizeMeeting(text, who);
    await deleteMeeting(m.id);
    return { result, text };
  } catch (e) {
    await saveMeeting({ ...m, status: "sum" });
    return { saved: "sum", text, error: e.message };
  }
}


const TYPE = { plan: "Plan", task: "Görev", note: "Not" };

// Toplantı modu: kullanıcı bitirene kadar dinler, yazıya çevirir; bitince tüm metin yapay zekaya gider.
// Çıkanlar (sorumlulu görevler, planlar, gönderilecek mesajlar, başlıklı özet) önce gösterilir; kayıtlar onaylanınca
// kaydedilir (kayıt ekranı), mesajlar tek tek "Gönder" ile gider (kendiliğinden gönderilmez).
export function MeetingSheet({ open, onClose }) {
  const toast = useToast();
  const { openAdd } = useAdd();
  const { members = [], isStaff } = useData();
  const { people: chatPeople = [], send: chatSend, uid: myUid, groupIds = [] } = useChat() || {};
  const rec = useMeetingRecorder({ onFail: (m) => toast(m), onNotice: (m) => toast(m) });
  const [view, setView] = useState("home"); // home | rec | work | result | saved
  const [work, setWork] = useState("");
  const [out, setOut] = useState(null); // { result, text } | { saved, text, error }
  const [msgs, setMsgs] = useState([]); // [{ to, text, dest, state: "" | "sending" | "sent" }]
  const [pending, setPending] = useState([]);
  const listRef = useRef(null);
  const live = useRef(null); // kayıt sürerken cihaza yazılan toplantı: { id, startedAt }

  const contacts = chatPeople.filter((p) => p.uid && p.uid !== myUid && p.name).map((p) => ({ name: p.name, uid: p.uid }));
  const groups = Object.fromEntries(groupIds.filter((g) => GROUPS[g]).map((g) => [g, GROUPS[g].name]));
  const who = { people: isStaff ? [] : members.map((m) => m.name).filter(Boolean), contacts: [...contacts.map((c) => c.name), ...Object.values(groups)] };

  const refresh = () => listMeetings().then(setPending);
  useEffect(() => {
    if (open && view === "home") refresh();
  }, [open, view]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [rec.parts]);
  // Her parçadan sonra şimdiye kadarki kayıt cihaza yazılır: uygulama kapanırsa "Bekleyen toplantılar"da kalır
  const snapshot = rec.snapshot;
  useEffect(() => {
    const m = live.current;
    const snap = rec.parts.length && m && snapshot();
    if (snap) saveMeeting({ ...m, ...snap, status: "stt", cut: true }).catch(() => {});
  }, [rec.parts, snapshot]);

  async function begin() {
    if (!(await rec.start())) return;
    live.current = { id: `m${Date.now()}`, startedAt: Date.now() };
    setView("rec");
  }

  async function finish() {
    setView("work");
    setWork("Son parçalar yazıya çevriliyor…");
    const r = await rec.stop();
    const t = stamp();
    const id = live.current?.id || `m${t}`;
    live.current = null;
    if (!r) return setView("home");
    const m = { id, startedAt: t - r.sec * 1000, sec: r.sec, parts: r.parts, status: "stt" };
    await saveMeeting(m).catch(() => {}); // önce güvene al
    await run(m);
  }

  function abort() {
    if (!window.confirm("Kayıt silinsin mi? Şimdiye kadar konuşulanlar kaybolur.")) return;
    const id = live.current?.id;
    live.current = null;
    rec.cancel();
    if (id) deleteMeeting(id).catch(() => {});
    setView("home");
  }

  async function run(m) {
    setView("work");
    setWork("Yapay zeka konuşmayı inceliyor…");
    try {
      const o = await processMeeting(m, who);
      setOut(o);
      setMsgs((o.result?.messages || []).map((x) => ({ ...x, dest: recipientOf(x.to, contacts, groups), state: "" })));
      setView(o.result ? "result" : "saved");
      navigator.vibrate?.([10, 40, 10]);
    } catch (e) {
      toast(e.message);
      setView("home");
    }
  }

  async function sendMsg(i) {
    const x = msgs[i];
    if (!x?.dest || !x.text.trim() || x.state) return;
    const setState = (state) => setMsgs((l) => l.map((y, k) => (k === i ? { ...y, state } : y)));
    setState("sending");
    const d = x.dest;
    const ok = d.group
      ? await chatSend?.(d.group, x.text, { create: { type: "team" } })
      : await chatSend?.(dmId(myUid, d.uid), x.text, { create: { type: "dm", members: [myUid, d.uid].sort() } });
    setState(ok ? "sent" : "");
    toast(ok ? `Mesaj gönderildi · ${d.name}` : `Mesaj gönderilemedi. ${sendErrorText()}`);
  }

  // Gönderilmemiş mesaj varsa ekrandan çıkmadan sorulur
  const unsentOk = () => {
    const n = msgs.filter((m) => m.state !== "sent").length;
    return !n || window.confirm(`${n} mesaj gönderilmedi. Yine de devam edilsin mi?`);
  };

  function toDrafts() {
    if (!unsentOk()) return;
    const r = out.result;
    const note = { type: "note", title: `Toplantı: ${r.title}`, body: summaryText(r), date: "", endDate: "", time: "", place: "", link: false, cat: "Toplantı" };
    const items = onlyTalk(r) ? [note] : [note, ...r.items];
    const said = onlyTalk(r) ? "Toplantının özetini not olarak hazırladım, kontrol edip kaydedebilirsin." : r.message || "Toplantıdan çıkan işleri hazırladım, kontrol edip kaydedebilirsin.";
    close(true);
    openAdd({ prefill: { text: `Toplantı: ${r.title}`, items, message: said, engine: "ai" } });
  }

  function asNote(text, title = "Toplantı metni") {
    if (view === "result" && !unsentOk()) return;
    close(true);
    openAdd({ prefill: { text: title, items: [{ type: "note", title, body: text, date: "", endDate: "", time: "", place: "", link: false, cat: "Toplantı" }], message: "Toplantı metnini not olarak hazırladım.", engine: "local" } });
  }

  function close(force) {
    if (rec.status === "rec" || rec.status === "paused") return toast("Önce kaydı bitir ya da vazgeç");
    if (force !== true && view === "result" && !unsentOk()) return;
    setView("home");
    setOut(null);
    setMsgs([]);
    onClose();
  }

  const btn = "flex h-12 items-center justify-center gap-2 rounded-xl text-base font-semibold transition active:scale-[.98]";
  const paused = rec.status === "paused";
  const r = out?.result;

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
              <p className="mt-1 text-[0.875rem] text-mut">Sen bitirene kadar dinlerim. Bitince kimin ne yapacağını, gönderilecek mesajları, planları ve başlıklı özeti çıkarırım; sen onaylayınca kaydederim. Telefonu toplantı boyunca bu ekranda açık bırak.</p>
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
                        <p className="text-[0.8125rem] text-mut">{m.cut ? "Kayıt yarıda kaldı, o ana kadarki kısım saklı" : m.status === "stt" ? "Ses yazıya çevrilemedi, kayıt saklı" : "Metin hazır, özet çıkarılamadı"}</p>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <button onClick={() => run({ ...m, cut: false })} className="rounded-full bg-acc px-3.5 py-1.5 text-[0.8125rem] font-semibold text-white active:scale-95">Özetle</button>
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
              <p className={`flex items-center justify-center gap-2 text-[0.8125rem] font-semibold ${paused ? "text-amber-700" : "text-rec"}`}>
                {paused ? "Dinleme durdu" : <><i className="rec-dot" /> Dinliyorum</>}
              </p>
              <p className="mt-2 text-[2.75rem] font-bold tabular-nums leading-none">{mmss(rec.elapsed)}</p>
              <p className="mt-1.5 text-[0.8125rem] text-mut">{paused ? "Mikrofon kesildi. Şimdiye kadarki kısım saklı." : "Sen bitirene kadar dinlerim"}</p>
              {paused ? (
                <button onClick={rec.resume} className={`${btn} mt-4 w-full bg-acc text-white`}>
                  <Icon name="mic" className="size-5" /> Dinlemeye devam et
                </button>
              ) : (
                <div className="mt-4 flex h-8 items-center justify-center gap-1" aria-hidden="true">
                  {Array.from({ length: 16 }, (_, i) => (
                    <span key={i} className="w-1.5 rounded-full bg-acc/70 transition-[height] duration-150" style={{ height: `${Math.max(4, rec.level * 32 * (0.5 + Math.abs(Math.sin(i + rec.elapsed / 300))))}px` }} />
                  ))}
                </div>
              )}
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
              <button onClick={abort} className={`${btn} flex-1 border border-line bg-card`}>Vazgeç</button>
              <button onClick={finish} className={`${btn} flex-[1.6] bg-acc text-white`}>
                <Icon name="stop" className="size-4" /> Bitir ve çıkar
              </button>
            </div>
          </div>
        )}

        {view === "work" && (
          <div className="fade-in flex flex-col items-center py-16 text-center">
            <Loader size="lg" />
            <p className="mt-4 text-[1rem] font-semibold">{work}</p>
            <p className="mt-1 text-[0.8125rem] text-mut">Uzun toplantıda biraz sürebilir.</p>
          </div>
        )}

        {view === "result" && r && (
          <div className="fade-in space-y-4">
            {r.message && <p className="px-1 text-[0.9375rem] text-mut">{r.message}</p>}

            {r.items.length > 0 && (
              <div className="rounded-2xl border border-line bg-card p-4">
                <p className="text-[0.8125rem] font-semibold text-mut">Görevler ve planlar · {r.items.length}</p>
                <ul className="mt-2 space-y-2 text-[0.9375rem]">
                  {r.items.map((it, i) => (
                    <li key={i} className="flex items-baseline gap-2">
                      <span className="w-12 shrink-0 text-[0.75rem] font-semibold text-acc">{TYPE[it.type]}</span>
                      <span className="min-w-0 flex-1">
                        {it.title}
                        {it.date && <span className="text-mut"> · {it.date}{it.time ? ` ${it.time}` : ""}</span>}
                        {it.assignTo?.length > 0 && <span className="block text-[0.8125rem] font-medium text-acc">Sorumlu: {it.assignTo.join(", ")}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {msgs.length > 0 && (
              <div className="rounded-2xl border border-line bg-card p-4">
                <p className="text-[0.8125rem] font-semibold text-mut">Gönderilecek mesajlar · {msgs.length}</p>
                <ul className="mt-2 space-y-3">
                  {msgs.map((m, i) => (
                    <li key={i} className="rounded-xl bg-bg p-3">
                      <p className="flex items-center gap-1.5 text-[0.875rem] font-semibold">
                        <Icon name="chat" className="size-4 text-acc" />
                        {m.dest?.name || m.to}
                        {!m.dest && <span className="font-normal text-amber-700">· uygulamada bulunamadı</span>}
                      </p>
                      <textarea
                        value={m.text}
                        disabled={!!m.state}
                        onChange={(e) => setMsgs((l) => l.map((y, k) => (k === i ? { ...y, text: e.target.value } : y)))}
                        rows={3}
                        className="mt-2 w-full resize-none rounded-lg bg-card p-2.5 text-[0.9375rem] leading-snug ring-1 ring-line disabled:opacity-70"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        {m.dest ? (
                          m.state === "sent" ? (
                            <span className="flex items-center gap-1 text-[0.8125rem] font-semibold text-emerald-700"><Icon name="check" className="size-4" /> Gönderildi</span>
                          ) : (
                            <>
                              <button onClick={() => setMsgs((l) => l.filter((_, k) => k !== i))} disabled={!!m.state} className="rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-mut active:scale-95">Gönderme</button>
                              <button onClick={() => sendMsg(i)} disabled={!!m.state} className="rounded-full bg-acc px-3.5 py-1.5 text-[0.8125rem] font-semibold text-white active:scale-95 disabled:opacity-60">{m.state === "sending" ? "Gönderiliyor…" : "Gönder"}</button>
                            </>
                          )
                        ) : (
                          <>
                            <button onClick={() => setMsgs((l) => l.filter((_, k) => k !== i))} className="rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold text-mut active:scale-95">Kaldır</button>
                            <button onClick={() => navigator.clipboard?.writeText(m.text).then(() => toast("Mesaj kopyalandı"), () => {})} className="rounded-full border border-line px-3.5 py-1.5 text-[0.8125rem] font-semibold active:scale-95">Kopyala</button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-2xl border border-line bg-card p-4">
              <p className="text-[0.8125rem] font-semibold text-mut">Özet</p>
              <p className="mt-1 text-[1.0625rem] font-semibold">{r.title}</p>
              {r.sections.map((sec, i) => (
                <div key={i} className="mt-3">
                  {sec.heading && <p className="text-[0.9375rem] font-semibold">{sec.heading}</p>}
                  <ul className="mt-1 space-y-1 text-[0.9375rem] leading-relaxed">
                    {sec.points.map((p, k) => (
                      <li key={k} className="flex gap-2"><span className="text-mut">•</span><span className="min-w-0 flex-1">{p}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
              {r.decisions.length > 0 && (
                <div className="mt-3">
                  <p className="text-[0.9375rem] font-semibold">Kararlar</p>
                  <ul className="mt-1 space-y-1.5 text-[0.9375rem]">
                    {r.decisions.map((d, i) => (
                      <li key={i} className="flex gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-emerald-600" />{d}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button onClick={toDrafts} className={`${btn} w-full bg-acc text-white`}>
              {onlyTalk(r) ? "Özeti not olarak kaydet" : "Görevleri ve özeti onayla, kaydet"}
            </button>
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
