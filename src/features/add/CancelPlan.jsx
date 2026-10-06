"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { useChat } from "@/features/chat/ChatProvider";
import { GROUPS } from "@/lib/kinds";
import { CANCEL_REASONS, canCancel, cancelText, shareText } from "@/lib/cancelPlan";
import { todayStr } from "@/lib/utils/format";

// Plan ekranında, İşlemler › "İptal et" ile açılan form: "İptal et ve haber ver". Plan silinmez, "iptal" olur (geri alınabilir); plandaki kişilere bildirim gider,
// istenirse Sporcular/Ekip grubuna mesaj yazılır, WhatsApp'a da aynı metin paylaşılır.
export function CancelPlan({ rec, by, onClose }) {
  const { updateRecord } = useData();
  const chat = useChat();
  const toast = useToast();
  const today = todayStr();
  const [reason, setReason] = useState("wind");
  const [text, setText] = useState(() => cancelText(rec, "wind", today));
  const [touched, setTouched] = useState(false);
  const groups = (chat?.groupIds || []).filter((g) => g === "athletes" || g === "team");
  const [to, setTo] = useState(() => (groups.includes("athletes") ? ["athletes"] : []));
  const [busy, setBusy] = useState(false);

  if (!canCancel(rec, today)) return null;

  const pickReason = (r) => {
    setReason(r);
    if (!touched) setText(cancelText(rec, r, today));
  };
  const toggle = (g) => setTo((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));

  async function go() {
    const t = text.trim();
    if (!t) return toast("Haber metni boş");
    setBusy(true);
    await updateRecord("plan", rec.id, { status: "cancelled", cancelReason: reason, cancelledAt: new Date().toISOString() }, by);
    let ok = 0;
    for (const g of to) if (await chat.send(g, t, { create: { type: "team" } })) ok++;
    setBusy(false);
    onClose?.();
    toast(ok ? `Plan iptal edildi · ${to.map((g) => GROUPS[g].name).join(", ")} grubuna yazıldı` : "Plan iptal edildi");
  }

  return (
    <div className="mt-3 rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <p className="text-[0.9375rem] font-semibold">İptal et ve haber ver</p>
      <div className="mt-3 flex gap-2">
        {CANCEL_REASONS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => pickReason(k)} className={`rounded-full px-3 py-1.5 text-[0.875rem] font-medium active:scale-95 ${reason === k ? "bg-acc text-white" : "bg-bg"}`}>
            {l}
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setTouched(true);
        }}
        rows={3}
        className="mt-3 w-full resize-none rounded-xl bg-bg px-3 py-2.5 text-[0.9375rem] leading-snug outline-none"
      />
      {groups.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {groups.map((g) => (
            <button key={g} type="button" onClick={() => toggle(g)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] font-medium active:scale-95 ${to.includes(g) ? "bg-acc/15 text-acc ring-1 ring-acc/40" : "bg-bg text-mut"}`}>
              <Icon name={to.includes(g) ? "check" : GROUPS[g].icon} className="size-3.5" />
              {GROUPS[g].name} grubuna yaz
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-[0.8125rem] text-mut">Plandaki kişilere bildirim de gider. Hesabı olmayan velilere WhatsApp ile gönder.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} onClick={go} className="h-11 flex-1 rounded-full bg-rec text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-60">
          {busy ? "İptal ediliyor…" : "İptal et"}
        </button>
        <button type="button" onClick={() => shareText(text)} className="grid h-11 place-items-center rounded-full px-4 text-[0.9375rem] font-semibold ring-1 ring-line active:scale-[.98]">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="whatsapp" className="size-4" /> WhatsApp
          </span>
        </button>
        <button type="button" onClick={() => onClose?.()} aria-label="Vazgeç" className="grid size-11 place-items-center rounded-full text-mut active:scale-95">
          <Icon name="x" className="size-5" />
        </button>
      </div>
    </div>
  );
}
