"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { logLine } from "@/lib/trainingLog";
import { todayStr } from "@/lib/utils/format";
import { askLog, saveLog } from "./logAi";
import { Missing } from "./LogDetails";

// Antrenman günlüğü sayfasında: anlat → yapay zeka günlüğü çıkarır, günün antrenman planına yazar
// (o gün antrenman yoksa yeni plan açılır). Tarih anlatılmadıysa sorulur; diğer eksikler kaydı durdurmaz, "Eksik" olarak görünür.
export function LogComposer({ by, onOpen }) {
  const data = useData();
  const toast = useToast();
  const today = todayStr();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ask, setAsk] = useState(null); // tarih bekleyen sonuç { time, log }
  const [date, setDate] = useState(today);
  const [done, setDone] = useState(null); // { id, log, date }

  async function store(r) {
    const s = await saveLog(data, r, by);
    if (s.error) return setErr(s.error);
    setDone({ ...s, date: r.date });
    setText("");
    setAsk(null);
    toast(s.fresh ? "Günlük kaydedildi, antrenman takvime eklendi" : "Günlük kaydedildi");
  }

  async function go() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setErr("");
    setDone(null);
    try {
      const r = await askLog({ text });
      if (!r.log) setErr("Anlatılanda günlüğe yazılacak bilgi bulamadım. Rüzgârı, çalışılanları ya da nasıl geçtiğini yaz.");
      else if (!r.date) setAsk(r);
      else await store(r);
    } catch (e) {
      setErr(e.message || "Günlük çıkarılamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-3 rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <p className="flex items-center gap-2 text-[0.9375rem] font-semibold">
        <Icon name="spark" className="size-4 text-acc" />
        Yapay zekayla yaz
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Anlat: Dün 14 knot poyrazda start ve tramola çalıştık, 2 saat sürdü, Ali ve Ayşe geldi, çok iyi geçti…"
        className="mt-2 w-full resize-none rounded-xl bg-bg px-3 py-2.5 text-[0.9375rem] leading-snug outline-none"
      />
      {ask ? (
        <div className="mt-2 rounded-xl bg-bg p-3">
          <p className="text-[0.875rem] font-medium">Hangi günün antrenmanı?</p>
          <div className="mt-2 flex gap-2">
            <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="h-10 flex-1 rounded-xl bg-card px-3 text-[0.9375rem] outline-none" />
            <button type="button" disabled={!date || date > today} onClick={() => store({ ...ask, date })} className="h-10 rounded-full bg-acc px-4 text-[0.875rem] font-semibold text-white active:scale-95 disabled:opacity-40">
              Kaydet
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={go} disabled={busy || !text.trim()} className="mt-2 h-11 w-full rounded-full bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-40">
          {busy ? "Yazılıyor…" : "Günlüğe yaz"}
        </button>
      )}
      {err && <p className="mt-2 text-[0.8125rem] text-red-600">{err}</p>}
      {done && (
        <button type="button" onClick={() => done.id && onOpen?.(done.id)} className="mt-2 block w-full rounded-xl bg-bg px-3 py-2.5 text-left active:opacity-60">
          <b className="block text-[0.875rem] font-medium">Kaydedildi{done.fresh ? " (yeni antrenman)" : ""}</b>
          {logLine(done.log) && <small className="block text-[0.8125rem] text-mut">{logLine(done.log)}</small>}
          <Missing log={done.log} />
          <small className="mt-0.5 block text-[0.75rem] font-semibold text-acc">Aç, eksikleri tamamla</small>
        </button>
      )}
    </section>
  );
}
