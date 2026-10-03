"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { KINDS } from "./eventModel";

const area =
  "mt-1.5 min-h-[5.5rem] w-full resize-none rounded-xl border border-transparent bg-bg px-3.5 py-3 text-base text-fg outline-none transition placeholder:text-mut/70 focus:border-acc focus:bg-card";

// Etkinliğin temel bilgileri: tür, ad, yer, tarih, kişi (yeni etkinlikte ve "Bilgileri düzenle"de)
export function InfoFields({ v, set }) {
  const up = (k) => (e) => set({ ...v, [k]: e.target.value });
  return (
    <div className="space-y-3.5">
      <div>
        <span className="text-[0.8125rem] font-medium text-mut">Tür</span>
        <div className="-mx-5 mt-1.5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
          {KINDS.map(([k, label, icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => set({ ...v, kind: k })}
              aria-pressed={v.kind === k}
              className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold transition active:scale-95 ${v.kind === k ? "bg-deep text-white" : "bg-card text-fg ring-1 ring-line"}`}
            >
              <Icon name={icon} className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>
      <Field label="Ad" value={v.title} onChange={up("title")} placeholder="Kaz Dağları kampı" maxLength={80} />
      <Field label="Nerede" value={v.place} onChange={up("place")} placeholder="Bilmiyorsan boş bırak, yer önerilsin" maxLength={80} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Başlangıç" type="date" value={v.startDate} onChange={up("startDate")} />
        <Field label="Bitiş" type="date" value={v.endDate} min={v.startDate || undefined} onChange={up("endDate")} />
      </div>
      <Field label="Kaç kişi" type="number" inputMode="numeric" min={0} max={500} value={v.people || ""} onChange={(e) => set({ ...v, people: Math.max(0, Math.min(500, parseInt(e.target.value, 10) || 0)) })} placeholder="4" />
    </div>
  );
}

// Yeni etkinlik: bilgiler + "ne planlıyorsun" → yapay zekayla hazırla ya da boş oluştur.
// Boş bırakılan bilgiler için yapay zeka genel bir değerlendirme yapar (yer/mevsim önerir).
export function EventForm({ start, onAi, onBlank }) {
  const [v, setV] = useState(start);
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const run = async (kind) => {
    setErr("");
    setBusy(kind);
    try {
      await (kind === "ai" ? onAi(v, idea) : onBlank(v, idea));
    } catch (e) {
      setErr(e?.message || "Olmadı, tekrar dene.");
      setBusy("");
    }
  };

  return (
    <div className="mt-2 space-y-4 pb-6">
      <InfoFields v={v} set={setV} />
      <label className="block">
        <span className="text-[0.8125rem] font-medium text-mut">Ne planlıyorsun? (isteğe bağlı)</span>
        <textarea value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={1500} className={area} placeholder="Çocuklarla 2 gece çadır kampı, deniz kenarı olsun; bütçe kişi başı 3 bin civarı" />
      </label>
      {err && <p className="text-center text-[0.875rem] text-rec">{err}</p>}
      <Button onClick={() => run("ai")} loading={busy === "ai"} disabled={!!busy}>
        <Icon name="zap" className="size-5" />
        Yapay zekayla hazırla
      </Button>
      {busy === "ai" && <p className="-mt-2 text-center text-[0.8125rem] text-mut">İhtiyaç listesi, bütçe ve yapılacaklar hazırlanıyor…</p>}
      <Button variant="ghost" onClick={() => run("blank")} loading={busy === "blank"} disabled={!!busy || !v.title.trim()}>
        Boş oluştur
      </Button>
      <p className="text-center text-[0.75rem] leading-snug text-mut">Yer ya da tarih boşsa genel bir plan yapılır. Listeleri sonra elle değiştirebilirsin.</p>
    </div>
  );
}
