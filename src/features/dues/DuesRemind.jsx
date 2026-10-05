"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { waPhone, waTo } from "@/lib/absent";
import { remindText } from "@/lib/duesRemind";
import { money } from "@/lib/bankSheet";

const TL = (n) => `${money(n).replace(/,00$/, "")} TL`;
const when = (iso) => new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });

// Aidat hatırlatması (Aidatlar sayfası, son ödeme günü geçince): bu ay ödemeyenlerin velilerine. Uygulamada hesabı olan
// veliye tek dokunuşla bildirim, diğerlerine veli telefonuyla hazır WhatsApp metni (gönderen sensin). Hatırlatılanlar
// ay kaydına yazılır (reminded), her cihazda "hatırlatıldı" görünür.
// list: unpaidOf(...) · members: ana hesabın kişileri (sporcu hesabı athleteId ile bağlı) · reminded: { sporcuId: ISO }
export function DuesRemind({ list, ym, dueDay, members, reminded = {}, onMark }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!list.length) return null;
  const linked = new Map(members.filter((m) => m.athleteId && m.status !== "left").map((m) => [m.athleteId, m.uid]));
  const inApp = list.filter((x) => linked.has(x.a.id) && !reminded[x.a.id]);
  const done = list.filter((x) => reminded[x.a.id]).length;

  async function notify() {
    setBusy(true);
    try {
      const res = await authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "dues", ym, ids: inApp.map((x) => linked.get(x.a.id)) }) });
      const d = await res.json().catch(() => ({}));
      onMark(inApp.map((x) => x.a.id));
      toast(d.parents ? `${d.parents} veliye hatırlatma gitti` : "Uygulamada bağlı veli yok ya da bu ay hatırlatıldı");
    } catch {
      toast("Hatırlatma gönderilemedi");
    }
    setBusy(false);
  }

  return (
    <div className="mt-2 rounded-2xl bg-rec/10">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <Icon name="bell" className="size-5 shrink-0 text-rec" />
        <span className="min-w-0 flex-1">
          <b className="block text-[0.9375rem] font-semibold">{list.length} sporcu ödemedi · velilere hatırlat</b>
          <small className="text-[0.8125rem] text-mut">Son ödeme günü {dueDay} {new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long" })}{done ? ` · ${done} hatırlatıldı` : ""}</small>
        </span>
        <Icon name="chev" className={`size-4 text-mut transition ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-line px-4 pb-3">
          {inApp.length > 0 && (
            <button type="button" disabled={busy} onClick={notify} className="mt-3 h-10 w-full rounded-xl bg-acc text-[0.875rem] font-semibold text-white active:scale-[.98] disabled:opacity-50">
              {busy ? "Gönderiliyor…" : `Uygulamadaki velilere bildir (${inApp.length} sporcu)`}
            </button>
          )}
          <ul className="mt-2 divide-y divide-line">
            {list.map((x) => {
              const phone = waPhone(x.a.parentPhone);
              const at = reminded[x.a.id];
              return (
                <li key={x.a.id} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.875rem] font-medium">{x.a.studentName}</b>
                    <small className="block truncate text-[0.75rem] text-mut">
                      {[x.state === "part" ? `${TL(x.rest)} eksik` : TL(x.fee), x.a.parentName, linked.has(x.a.id) ? "uygulamada" : "", at ? `hatırlatıldı ${when(at)}` : ""].filter(Boolean).join(" · ")}
                    </small>
                  </span>
                  {phone ? (
                    <a href={waTo(phone, remindText(x, ym))} target="_blank" rel="noreferrer" onClick={() => onMark([x.a.id])} className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold active:scale-95 ${at ? "text-mut ring-1 ring-line" : "text-ok ring-1 ring-ok/30"}`}>
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
