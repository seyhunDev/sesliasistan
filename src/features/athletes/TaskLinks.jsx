"use client";

// İşe göre düğmeler (Seyhun 2026-11-13): "Online kaydı yap" → TYF Yelken Bilgi Sistemi'ni aç; "Kesin kayıt formlarını teslim et" →
// antrenör kayıt ve katılım bildirim formları tek PDF: Gönder (paylaş) · Yazdır. Telefonda satırın altında, genişte sağda.
import { buttonClass } from "@/components/ui/buttonClass";

export const TYF_URL = "https://portal.tyf.org.tr/login";
export const FORM_DOCS = ["coach", "entry"];
export const FORM_NAMES = "Antrenör kayıt formu · Katılım bildirim formu";
const fold = (s) => String(s || "").toLocaleLowerCase("tr-TR");
export const isOnline = (label) => /online\s*kay/.test(fold(label));
export const isFinal = (label) => /kesin\s*kay/.test(fold(label));

export function TaskLinks({ label, abroad, busy, onSend, onPrint }) {
  const box = "order-last flex basis-full gap-2 pb-3 pl-10 pr-3 sm:order-none sm:basis-auto sm:mt-1.5 sm:p-0";
  if (isOnline(label) && !abroad)
    return (
      <span className={box}>
        <a href={TYF_URL} target="_blank" rel="noreferrer" data-press className={`${buttonClass({ variant: "primary", size: "sm", full: false })} no-underline`}>
          Aç
        </a>
      </span>
    );
  if (isFinal(label) && !abroad)
    return (
      <span className={box}>
        <button type="button" onClick={onSend} disabled={busy} data-press className={`${buttonClass({ variant: "secondary", size: "sm", full: false })} flex-1 sm:flex-none`}>
          {busy === "send" ? "Hazırlanıyor…" : "Gönder"}
        </button>
        <button type="button" onClick={onPrint} disabled={busy} data-press className={`${buttonClass({ variant: "primary", size: "sm", full: false })} flex-1 sm:flex-none`}>
          {busy === "print" ? "Hazırlanıyor…" : "Yazdır"}
        </button>
      </span>
    );
  return null;
}
