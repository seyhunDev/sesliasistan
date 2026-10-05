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

// Yeni etkinlik: bilgiler + not → oluştur. Planı (ihtiyaç listesi, bütçe, işler) etkinlik ekranındaki
// "Yapay zekayla hazırla" düğmesi ya da ana asistan ("kamp planı yap") hazırlar; formda ayrı yapay zeka kutusu yok.
export function EventForm({ start, onBlank }) {
  const [v, setV] = useState(start);
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const run = async () => {
    setErr("");
    setBusy("blank");
    try {
      await onBlank(v, idea);
    } catch (e) {
      setErr(e?.message || "Olmadı, tekrar dene.");
      setBusy("");
    }
  };

  return (
    <div className="mt-2 space-y-4 pb-6">
      <InfoFields v={v} set={setV} />
      <label className="block">
        <span className="text-[0.8125rem] font-medium text-mut">Not (isteğe bağlı)</span>
        <textarea value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={1500} className={area} placeholder="Çocuklarla 2 gece çadır kampı, deniz kenarı olsun; bütçe kişi başı 3 bin civarı" />
      </label>
      {err && <p className="text-center text-[0.875rem] text-rec">{err}</p>}
      <Button onClick={run} loading={!!busy} disabled={!!busy || !v.title.trim()}>
        Oluştur
      </Button>
      <p className="text-center text-[0.75rem] leading-snug text-mut">İhtiyaç listesi, bütçe ve yapılacakları sonra etkinlik ekranında “Yapay zekayla hazırla” ile ya da asistana söyleyerek hazırlatabilirsin.</p>
    </div>
  );
}
