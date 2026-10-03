"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { absentText, waPhone, waTo } from "@/lib/absent";

// Yoklamada "gelmedi" işaretlenenler: velilere haber. Uygulamada hesabı olan veliye tek dokunuşla bildirim,
// diğerlerine sporcu kartındaki veli telefonuyla WhatsApp (metin hazır gelir, gönderen sensin).
// absent: [sporcu]; members: ana hesabın kişileri (sporcu hesabı athleteId ile bağlı)
export function AbsentNotice({ absent, date, today, members }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState({}); // tarih -> true (bu oturumda bildirildi)
  const [busy, setBusy] = useState(false);
  if (!absent.length) return null;
  const linked = new Map(members.filter((m) => m.athleteId && m.status !== "left").map((m) => [m.athleteId, m.uid]));
  const ids = absent.map((a) => linked.get(a.id)).filter(Boolean);

  async function notify() {
    setBusy(true);
    try {
      const res = await authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "absent", date, ids }) });
      const d = await res.json().catch(() => ({}));
      setSent((p) => ({ ...p, [date]: true }));
      toast(d.parents ? `${d.parents} veliye bildirim gitti` : "Uygulamada bağlı veli yok ya da daha önce bildirildi");
    } catch {
      toast("Bildirim gönderilemedi");
    }
    setBusy(false);
  }

  return (
    <div className="mt-3 rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <Icon name="bell" className="size-5 shrink-0 text-rec" />
        <span className="min-w-0 flex-1 text-[0.9375rem] font-medium">
          {absent.length} sporcu gelmedi · velilere haber ver
        </span>
        <Icon name="chev" className={`size-4 text-mut transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-line px-4 pb-3">
          {ids.length > 0 && (
            <button type="button" disabled={busy || sent[date]} onClick={notify} className="mt-3 h-10 w-full rounded-xl bg-acc text-[0.875rem] font-semibold text-white active:scale-[.98] disabled:opacity-50">
              {sent[date] ? "Uygulamadaki velilere bildirildi" : busy ? "Gönderiliyor…" : `Uygulamadaki velilere bildir (${ids.length} sporcu)`}
            </button>
          )}
          <ul className="mt-2 divide-y divide-line">
            {absent.map((a) => {
              const phone = waPhone(a.parentPhone);
              return (
                <li key={a.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.875rem] font-medium">{a.studentName}</b>
                    <small className="block truncate text-[0.75rem] text-mut">{[a.parentName, linked.has(a.id) ? "uygulamada" : ""].filter(Boolean).join(" · ") || "Veli bilgisi yok"}</small>
                  </span>
                  {phone ? (
                    <a href={waTo(phone, absentText(a.studentName, date, today))} target="_blank" rel="noreferrer" className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold text-ok ring-1 ring-ok/30 active:scale-95">
                      <Icon name="whatsapp" className="size-4" /> WhatsApp
                    </a>
                  ) : (
                    <small className="shrink-0 text-[0.75rem] text-mut">telefon yok</small>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
