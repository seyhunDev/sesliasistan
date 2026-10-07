"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useBirthday } from "@/features/birthdays/BirthdayProvider";
import { useData } from "@/features/data/DataProvider";
import { birthdaysOn, nextBirthday } from "@/lib/agenda";
import { addDays, todayStr } from "@/lib/utils/format";
import { CARD } from "./ui";

// Kapatılanlar bu cihazda o gün gizli kalır
const hideKey = () => `sa-bday-${todayStr()}`;
function readHidden() {
  try {
    return JSON.parse(localStorage.getItem(hideKey()) || "[]");
  } catch {
    return [];
  }
}

// Türkiye numarası WhatsApp biçimine: "0532 123 45 67" / "532…" / "+90 532…" → "905321234567"
export function waNumber(phone) {
  let d = String(phone || "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `90${d.slice(1)}`;
  else if (d.length === 10 && d.startsWith("5")) d = `90${d}`;
  return d;
}

function IconBtn({ icon, label, href, onClick, tone = "" }) {
  const cls = `grid size-8 shrink-0 place-items-center rounded-full transition active:scale-90 ${tone || "text-mut active:bg-bg"}`;
  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" aria-label={label} className={cls}>
      <Icon name={icon} className="size-[1.125rem]" />
    </a>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} className={cls}>
      <Icon name={icon} className="size-[1.125rem]" />
    </button>
  );
}

// Ana sayfada sade doğum günü satırı: bugün ve yarın (kişiye özel liste).
// Her satırda WhatsApp (hazır tebrik), ara, ayarlar (düzenle) ve ✕ (bugün gizle). Telefon yoksa ayarlardan eklenir.
export function BirthdayStrip() {
  const { birthdays } = useData();
  const { openBirthday } = useBirthday();
  const toast = useToast();
  const [hidden, setHidden] = useState(() => (typeof window === "undefined" ? [] : readHidden()));
  const today = todayStr();
  const tomorrow = addDays(1);
  const rows = [
    ...birthdaysOn(birthdays, today).map((b) => ({ b, day: today })),
    ...birthdaysOn(birthdays, tomorrow).map((b) => ({ b, day: tomorrow })),
  ].filter(({ b, day }) => !hidden.includes(`${b.id}:${day}`));
  if (!rows.length) return null;

  const hide = (id) => {
    const next = [...hidden, id];
    setHidden(next);
    try {
      localStorage.setItem(hideKey(), JSON.stringify(next));
    } catch {
      /* gizli pencere: yalnızca bu oturumda gizli */
    }
  };
  const needPhone = (b) => {
    toast(`${b.name} için telefon ekle`);
    openBirthday({ edit: b.id });
  };

  return (
    <section aria-label="Doğum günleri" className={`divide-y divide-line overflow-hidden ${CARD}`}>
      {rows.map(({ b, day }) => {
        const isToday = day === today;
        const age = nextBirthday(b, day).age;
        const wa = waNumber(b.phone);
        const msg = encodeURIComponent(`İyi ki doğdun ${b.name.split(" ")[0]}! 🎂 Nice mutlu yıllara.`);
        return (
          <div key={`${b.id}:${day}`} className="flex items-center gap-1 py-1.5 pl-3.5 pr-1.5">
            <Icon name="cake" className={`mr-1.5 size-4 shrink-0 ${isToday ? "text-pink-600" : "text-mut"}`} />
            <p className="min-w-0 flex-1 leading-tight">
              <b className="block truncate text-[0.8125rem] font-semibold">{b.name}</b>
              <small className={`block truncate text-[0.6875rem] ${isToday ? "text-pink-600" : "text-mut"}`}>
                {isToday ? "Bugün doğum günü" : "Yarın doğum günü"}
                {age ? ` · ${age} yaş` : ""}
              </small>
            </p>
            {wa ? (
              <IconBtn icon="whatsapp" label={`${b.name} için WhatsApp`} href={`https://wa.me/${wa}?text=${msg}`} tone="text-[#1f9d55] active:bg-bg" />
            ) : (
              <IconBtn icon="whatsapp" label="WhatsApp için telefon ekle" onClick={() => needPhone(b)} />
            )}
            {wa ? <IconBtn icon="phone" label={`${b.name} ara`} href={`tel:+${wa}`} tone="text-acc active:bg-bg" /> : <IconBtn icon="phone" label="Aramak için telefon ekle" onClick={() => needPhone(b)} />}
            <IconBtn icon="sliders" label="Doğum günü ayarları" onClick={() => openBirthday({ edit: b.id })} />
            <IconBtn icon="x" label="Bugün gizle" onClick={() => hide(`${b.id}:${day}`)} />
          </div>
        );
      })}
    </section>
  );
}
