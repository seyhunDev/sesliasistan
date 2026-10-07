"use client";

import { useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase/clientApp";
import { SHORTCUT_MAX, linkKey, shortcutsOf, toggleShortcut } from "@/lib/homeTiles";
import { CARD, SectionHead } from "./ui";

// Marka renkleri: yalnız tanınan sosyal medya düğmesinde (Instagram simgesi ve renk geçişi); diğerleri uygulamanın yeşil simgesi
export const BRAND = {
  instagram: "bg-[linear-gradient(45deg,#f9a03a_0%,#e9583f_30%,#d62f6c_60%,#a23ab6_100%)] text-white",
};

// Düğme: üstte yuvarlatılmış kare simge (kart görünümünde), altında tek satır ad; kutu yok, simgeler ızgarada nefes alır
const cls = "relative flex w-full flex-col items-center gap-2 text-center transition active:scale-95";
function Body({ icon, label, brand, on }) {
  return (
    <>
      <span className={`grid size-[3.75rem] shrink-0 place-items-center ${on ? CARD.replace("ring-1 ring-line/70", "ring-2 ring-acc") : CARD} ${BRAND[brand] || "text-acc"}`}>
        <Icon name={icon} className="size-6" />
      </span>
      <span className="w-full truncate whitespace-nowrap text-[0.8125rem] font-medium leading-tight tracking-[-0.01em]">{label}</span>
    </>
  );
}
function Tile({ a, onGo }) {
  if (a.href)
    return (
      <Link href={a.href} onClick={onGo} className={cls}>
        <Body {...a} />
      </Link>
    );
  return (
    <button type="button" onClick={() => (onGo?.(), a.onClick?.())} className={cls}>
      <Body {...a} />
    </button>
  );
}

// Ana sayfa › KISAYOLLAR: 4 sütunda en çok 7 düğme (simge + tek satır ad), sonuncu "Tümü":
// alttan açılan pencerede bütün sayfalar gruplu (Günlük, Kulüp, Yönetim, Sosyal). Pencerede "Kısayolları düzenle" ile
// düğmelere dokunarak kısayol seçilir (users/{uid}.homeLinks). Sayı/rozet yok; bilgi ÖZET ve SENİN İÇİN'de. groups: homeActions() (homeTiles.js).
export function HomeActions({ groups }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [full, setFull] = useState(false);
  if (!groups.length) return null;
  const short = shortcutsOf(groups, profile?.homeLinks);
  const keys = short.map(linkKey);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const close = () => {
    setOpen(false);
    setEdit(false);
    setFull(false);
  };
  const toggle = (a) => {
    const next = toggleShortcut(keys, linkKey(a));
    if (!next) return setFull(true);
    setFull(false);
    if (profile?.uid) updateDoc(doc(db, "users", profile.uid), { homeLinks: next }).catch(() => {});
  };

  return (
    <nav aria-labelledby="home-act">
      <SectionHead id="home-act" title="KISAYOLLAR" />
      <ul className="grid grid-cols-4 gap-x-1.5 gap-y-4">
        {short.map((a) => (
          <li key={linkKey(a)}>
            <Tile a={a} />
          </li>
        ))}
        {total > short.length && (
          <li>
            <Tile a={{ id: "all", icon: "more", label: "Tümü", onClick: () => setOpen(true) }} />
          </li>
        )}
      </ul>
      <Sheet open={open} onClose={close} title="Tüm sayfalar">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1">
            <p className="text-[0.8125rem] text-mut">
              {edit ? `Ana sayfada görünecekleri seç (en çok ${SHORTCUT_MAX}).` : "Ana sayfada yalnız kısayollar görünür."}
            </p>
            <button type="button" onClick={() => (setEdit(!edit), setFull(false))} className="shrink-0 rounded-full bg-acc/10 px-3 py-1.5 text-[0.8125rem] font-semibold text-acc active:scale-95">
              {edit ? "Bitti" : "Kısayolları düzenle"}
            </button>
          </div>
          {full && <p className="px-1 text-[0.8125rem] font-semibold text-amber-700">En çok {SHORTCUT_MAX} kısayol olur; önce birini çıkar.</p>}
          {groups.map((g) => (
            <section key={g.title} aria-label={g.title}>
              <h3 className="mb-2 px-1 text-[0.8125rem] font-semibold text-fg/70">{g.title}</h3>
              <ul className="grid grid-cols-4 gap-x-1.5 gap-y-4">
                {g.items.map((a) => {
                  const on = keys.includes(linkKey(a));
                  return (
                    <li key={linkKey(a)}>
                      {edit ? (
                        <button type="button" onClick={() => toggle(a)} aria-pressed={on} className={`${cls} ${on ? "" : "opacity-60"}`}>
                          <Body {...a} on={on} />
                          {on && (
                            <span className="absolute right-1 top-0 grid size-5 place-items-center rounded-full bg-acc text-white">
                              <Icon name="check" className="size-3" />
                            </span>
                          )}
                        </button>
                      ) : (
                        <Tile a={a} onGo={close} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </Sheet>
    </nav>
  );
}
