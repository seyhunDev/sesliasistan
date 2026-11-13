"use client";

// Metindeki telefon ve adres (Seyhun 2026-11-13 "telefon numarası paylaşılıyorsa ara butonu; adres paylaşılıyorsa tıklanıp Google Map'te
// açabilmeliyiz"): metinde telefon varsa "Ara" (tel:), adres gibi görünüyorsa "Harita" (Google Haritalar araması). Ortak düğme görünümü.
import { buttonClass } from "@/components/ui/buttonClass";

const PHONE = /(?:\+?90[\s-]?)?\(?0?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g;
const ADDR = /\b(mah(alle(si)?)?\.?|cad(de(si)?)?\.?|sok(ak|ağı)?\.?|bulvar(ı)?|blv\.?|no\s*[:.]?\s*\d|otel(i)?|hotel|marina|kulüb(ü)?)\b/i;

export const phonesIn = (t) => [...new Set((String(t || "").match(PHONE) || []).map((p) => p.replace(/[^\d+]/g, "")).filter((p) => p.replace(/\D/g, "").length >= 10))];
export const looksAddress = (t) => ADDR.test(String(t || ""));

export function ContactLinks({ text, place = "", className = "" }) {
  const tels = phonesIn(text);
  const addr = looksAddress(text);
  if (!tels.length && !addr) return null;
  // Haritada aranan: metnin telefonsuz hali (+ yarışın yeri)
  const q = [String(text).replace(PHONE, "").replace(/\s+/g, " ").trim(), place].filter(Boolean).join(", ");
  const btn = `${buttonClass({ variant: "secondary", size: "sm", full: false })} no-underline`;
  return (
    <span className={`mt-2 flex flex-wrap gap-2 ${className}`}>
      {tels.slice(0, 2).map((p) => (
        <a key={p} href={`tel:${p}`} data-press className={btn}>
          Ara{tels.length > 1 ? ` ${p.slice(-4)}` : ""}
        </a>
      ))}
      {addr && (
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`} target="_blank" rel="noreferrer" data-press className={btn}>
          Harita
        </a>
      )}
    </span>
  );
}
