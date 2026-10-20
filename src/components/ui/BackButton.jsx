"use client";

import { BackLink } from "./BackLink";
import { Icon } from "./Icon";
import { buttonClass } from "./buttonClass";

// Ortak geri düğmesi (Seyhun, 2026-10-20): her sayfada aynı kabarık yuvarlak düğme. `href` verilirse gelinen sayfaya döner
// (BackLink, kenardan kaydırarak geri de bunu okur); `onClick` verilirse sayfa içi geri (alt ekrandan çıkış).
// Dokunma alanı çevresiyle birlikte daha geniş (before:), küçük düğme zor tutturuluyordu.
export function BackButton({ href, onClick, label = "Geri", className = "" }) {
  const cls = `${buttonClass({ variant: "back" })} relative before:absolute before:-inset-x-3 before:-inset-y-2 before:content-[''] ${className}`;
  const icon = <Icon name="back" className="size-5" />;
  if (href !== undefined) {
    return <BackLink href={href} onClick={onClick} aria-label={label} data-press className={cls}>{icon}</BackLink>;
  }
  return <button type="button" onClick={onClick} aria-label={label} data-press className={cls}>{icon}</button>;
}
