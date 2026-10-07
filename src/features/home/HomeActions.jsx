"use client";

import { useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase/clientApp";
import { SHORTCUT_MAX, linkKey, shortcutsOf, toggleShortcut } from "@/lib/homeTiles";
import { SectionHead, TAP } from "./ui";

// Marka renkleri: yalnız tanınan sosyal medya düğmesinde (Instagram simgesi ve renk geçişi); diğerleri uygulamanın yeşil simgesi
export const BRAND = {
  instagram: "bg-[linear-gradient(45deg,#f9a03a_0%,#e9583f_30%,#d62f6c_60%,#a23ab6_100%)] text-white",
};

const cls = `relative flex h-[5.25rem] w-full flex-col items-center justify-center gap-1.5 px-0.5 text-center ${TAP}`;
function Body({ icon, label, brand }) {
  return (
    <>
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${BRAND[brand] || "bg-acc/10 text-acc"}`}>
        <Icon name={icon} className="size-5" />
      </span>
      <span className="w-full truncate whitespace-nowrap text-[0.8125rem] font-semibold leading-tight tracking-[-0.01em]">{label}</span>
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

// Ana sayfa › KISAYOLLAR: en çok 6 aynı tip düğme (yuvarlak simge + tek satır ad, 3 sütun), altında "Tüm sayfalar":
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
      <ul className="grid grid-cols-3 gap-2">
        {short.map((a) => (
          <li key={linkKey(a)}>
            <Tile a={a} />
          </li>
        ))}
      </ul>
      {total > short.length && (
        <button type="button" onClick={() => setOpen(true)} className={`mt-2 flex w-full items-center justify-between px-4 py-3 text-[0.9375rem] font-semibold ${TAP}`}>
          <span className="flex items-center gap-2.5">
            <Icon name="more" className="size-5 text-acc" />
            Tüm sayfalar
          </span>
          <span className="flex items-center gap-1 text-[0.8125rem] font-normal text-mut">
            {total}
            <Icon name="chev" className="size-3.5" />
          </span>
        </button>
      )}

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
              <ul className="grid grid-cols-3 gap-2">
                {g.items.map((a) => {
                  const on = keys.includes(linkKey(a));
                  return (
                    <li key={linkKey(a)}>
                      {edit ? (
                        <button type="button" onClick={() => toggle(a)} aria-pressed={on} className={`${cls} ${on ? "ring-2 ring-acc" : "opacity-70"}`}>
                          <Body {...a} />
                          {on && (
                            <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-acc text-white">
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
