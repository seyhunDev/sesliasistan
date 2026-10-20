"use client";

import { Icon } from "@/components/ui/Icon";
import { loginMessage, waPhone } from "@/lib/kinds";
import { summaryRows } from "./assistPerson";

// Asistanda yeni kişi kartı: bilgiler, mükerrer uyarısı ve onay düğmeleri.
// p: { draft, step: "ask" | "confirm" | "saved" | "undo" | "account" | "opening" | "opened", dups?, uid?, acc?: { login, password } }
export function PersonCard({ p, onSave, onEdit, onCancel, onAccount, onUndo }) {
  const { draft, step, dups = [] } = p;
  const saved = !["ask", "confirm"].includes(step);
  const head = { ask: "bilgi bekleniyor", confirm: "onay bekliyor", undo: "silme onayı", account: "hesap onayı", opening: "hesap açılıyor", opened: "hesap açıldı" }[step] || "kaydedildi";
  const acc = p.acc;
  const wa = acc && waPhone(draft.phone);
  return (
    <div className="fade-in mt-3 overflow-hidden rounded-2xl ring-1 ring-acc/30">
      <p className="flex items-center justify-between bg-acc/[.06] px-3 py-2 text-[0.75rem] font-semibold uppercase tracking-wide text-acc">
        <span className="flex items-center gap-1.5">
          <Icon name="user" className="size-3.5" /> Yeni kişi
        </span>
        <span>{head}</span>
      </p>
      <dl className="divide-y divide-line">
        {summaryRows(draft).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 px-3 py-2 text-[0.875rem]">
            <dt className="shrink-0 text-mut">{k}</dt>
            <dd className={`truncate text-right ${v === "—" ? "text-mut" : "font-semibold"}`}>{v}</dd>
          </div>
        ))}
      </dl>
      {acc && (step === "account" || step === "opening" || step === "opened") && (
        <div className="border-t border-line bg-bg px-3 py-2.5 text-[0.9375rem]">
          <p className="text-[0.75rem] text-mut">{step === "opened" ? "Giriş bilgileri — kişiye ilet:" : "Açılacak hesap:"}</p>
          <p className="mt-0.5">
            Giriş: <b className="font-semibold">{acc.login}</b>
          </p>
          <p>
            Şifre: <b className="font-semibold tabular-nums">{acc.password}</b>
          </p>
        </div>
      )}
      {dups.length > 0 && !saved && (
        <div className="border-t border-line bg-amber-50 px-3 py-2.5 text-[0.8125rem] leading-snug text-amber-900">
          <b className="flex items-center gap-1.5 font-semibold">
            <Icon name="alert" className="size-4" /> Listede benzer kişi var
          </b>
          <ul className="mt-1 space-y-0.5">
            {dups.map((d) => (
              <li key={d.person.uid}>
                {d.person.name} · {d.why}
                {d.left ? " · silinmiş" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {step !== "ask" && step !== "opening" && (
        <div className="flex flex-wrap gap-1.5 border-t border-line p-2">
          {step === "confirm" && (
            <>
              <button type="button" onClick={onSave} className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl text-[0.8125rem] font-semibold text-white active:scale-[.98] ${dups.length ? "bg-amber-700" : "bg-acc"}`}>
                <Icon name="check" className="size-4" /> {dups.length ? "Yine de kaydet" : "Kaydet"}
              </button>
              <button type="button" onClick={onEdit} data-press className="btn btn-secondary btn-sm text-acc">
                Düzenle
              </button>
              <button type="button" onClick={onCancel} data-press className="btn btn-text btn-sm text-mut">
                Vazgeç
              </button>
            </>
          )}
          {step === "saved" && (
            <>
              <button type="button" onClick={onAccount} data-press className="btn btn-primary btn-sm flex-1">
                Hesap aç
              </button>
              <button type="button" onClick={onEdit} data-press className="btn btn-secondary btn-sm text-acc">
                Kişiyi aç
              </button>
              <button type="button" onClick={onUndo} data-press className="btn btn-danger btn-sm">
                Geri al
              </button>
            </>
          )}
          {step === "account" && (
            <>
              <button type="button" onClick={onAccount} data-press className="btn btn-primary btn-sm flex-1">
                <Icon name="check" className="size-4" /> Hesabı aç
              </button>
              <button type="button" onClick={onCancel} data-press className="btn btn-text btn-sm text-mut">
                Vazgeç
              </button>
            </>
          )}
          {step === "opened" && (
            <>
              <a
                href={`https://wa.me/${wa}?text=${encodeURIComponent(loginMessage({ name: draft.name, login: acc.login, password: acc.password, site: typeof location !== "undefined" ? location.origin : "" }))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25d366] text-[0.8125rem] font-semibold text-white active:scale-[.98]"
              >
                <Icon name="whatsapp" className="size-4" /> WhatsApp ile gönder
              </a>
              <button type="button" onClick={onEdit} data-press className="btn btn-secondary btn-sm text-acc">
                Kişiyi aç
              </button>
            </>
          )}
          {step === "undo" && (
            <>
              <button type="button" onClick={onUndo} data-press className="btn btn-danger btn-sm flex-1">
                <Icon name="trash" className="size-4" /> Sil
              </button>
              <button type="button" onClick={onCancel} data-press className="btn btn-secondary btn-sm text-acc">
                Vazgeç
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
