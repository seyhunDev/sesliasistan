"use client";

import { useState } from "react";
import Link from "next/link";
import { doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase/clientApp";
import { SHORTCUT_MAX, findActions, linkKey, shortcutsOf, toggleShortcut } from "@/lib/homeTiles";
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

// Tüm sayfalar penceresinde grup renkleri (simge kutusu ve başlık noktası)
const TONES = {
  Günlük: { dot: "bg-[#2f7d6b]", box: "bg-[#2f7d6b]/10 text-[#2f7d6b] dark:text-[#6fc3ad]" },
  Kulüp: { dot: "bg-[#3a6ea5]", box: "bg-[#3a6ea5]/10 text-[#3a6ea5] dark:text-[#8db4e0]" },
  Yönetim: { dot: "bg-[#b07a1f]", box: "bg-[#b07a1f]/10 text-[#b07a1f] dark:text-[#e0b467]" },
  Sosyal: { dot: "bg-[#c2456e]", box: "bg-[#c2456e]/10 text-[#c2456e] dark:text-[#e88aa8]" },
};
const toneOf = (g) => TONES[g] || TONES.Günlük;

// Sayfa satırı: solda renkli simge kutusu, ad + kısa açıklama (dokununca sayfa açılır), sağda ana sayfa düğmesi (+ / ✓)
function Row({ a, group, on, onGo, onToggle }) {
  const main = (
    <>
      <span className={`grid size-[2.375rem] shrink-0 place-items-center rounded-xl ${BRAND[a.brand] || toneOf(group).box}`}>
        <Icon name={a.icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.9375rem] font-semibold leading-tight">{a.label}</span>
        {a.sub && <span className="mt-0.5 block truncate text-[0.8125rem] leading-tight text-mut">{a.sub}</span>}
      </span>
    </>
  );
  const rowCls = "flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left";
  return (
    <li className="flex items-center gap-2 px-3.5">
      {a.href ? (
        <Link href={a.href} onClick={onGo} className={rowCls}>
          {main}
        </Link>
      ) : (
        <button type="button" onClick={() => (onGo?.(), a.onClick?.())} className={rowCls}>
          {main}
        </button>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={on}
        aria-label={on ? `${a.label} ana sayfadan çıkar` : `${a.label} ana sayfaya ekle`}
        className={`grid size-[1.875rem] shrink-0 place-items-center rounded-full ${on ? "bg-acc text-white" : "text-mut ring-1 ring-line"}`}
      >
        <Icon name={on ? "check" : "plus"} className="size-4" />
      </button>
    </li>
  );
}

// Ana sayfa › KISAYOLLAR: 4 sütunda en çok 7 düğme (simge + tek satır ad), sonuncu "Tümü".
// "Tümü" penceresi: üstte arama, "ANA SAYFADA n/7" kısayol çipleri (× ile çıkar), altında gruplar (Günlük, Kulüp, Yönetim, Sosyal)
// satır satır: simge, ad, kısa açıklama, sağda + / ✓ (ana sayfaya ekle/çıkar, users/{uid}.homeLinks). Satıra dokununca sayfa açılır.
// groups: homeActions() (homeTiles.js).
export function HomeActions({ groups }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [full, setFull] = useState(false);
  if (!groups.length) return null;
  const short = shortcutsOf(groups, profile?.homeLinks);
  const keys = short.map(linkKey);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const groupOf = (a) => groups.find((g) => g.items.some((b) => linkKey(b) === linkKey(a)))?.title;
  const found = q.trim() ? findActions(groups, q) : null;
  const close = () => {
    setOpen(false);
    setQ("");
    setFull(false);
  };
  const toggle = (a) => {
    const next = toggleShortcut(keys, linkKey(a));
    if (!next) return setFull(true);
    setFull(false);
    if (profile?.uid) updateDoc(doc(db, "users", profile.uid), { homeLinks: next }).catch(() => {});
  };
  const row = (a, group) => <Row key={linkKey(a)} a={a} group={group} on={keys.includes(linkKey(a))} onGo={close} onToggle={() => toggle(a)} />;
  const list = "divide-y divide-line/70 overflow-hidden rounded-2xl bg-card ring-1 ring-line/70";
  const head = "mb-2 flex items-center gap-2 px-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] text-mut";

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
        <div className="space-y-5">
          <label className="flex items-center gap-2 rounded-2xl bg-card px-3.5 py-2.5 ring-1 ring-line/70">
            <Icon name="search" className="size-4 shrink-0 text-mut" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Sayfa ara…"
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut"
            />
          </label>
          {full && <p className="px-1 text-[0.8125rem] font-semibold text-amber-700 dark:text-amber-300">En çok {SHORTCUT_MAX} kısayol olur; önce birini çıkar.</p>}
          {found ? (
            <section aria-label="Arama sonuçları">
              <h3 className={head}>{found.length} SONUÇ</h3>
              {found.length ? <ul className={list}>{found.map((a) => row(a, a.group))}</ul> : <p className="px-1 text-[0.875rem] text-mut">Bu adda sayfa yok.</p>}
            </section>
          ) : (
            <>
              <section aria-label="Ana sayfada">
                <h3 className={head}>
                  ANA SAYFADA <span className="text-fg/60">{short.length}/{SHORTCUT_MAX}</span>
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {short.map((a) => (
                    <li key={linkKey(a)} className="flex items-center gap-1.5 rounded-full bg-card py-1 pl-1 pr-1.5 ring-1 ring-line/70">
                      <span className={`grid size-6 place-items-center rounded-full ${BRAND[a.brand] || toneOf(groupOf(a)).box}`}>
                        <Icon name={a.icon} className="size-3.5" />
                      </span>
                      <span className="text-[0.8125rem] font-medium">{a.label}</span>
                      <button type="button" onClick={() => toggle(a)} aria-label={`${a.label} ana sayfadan çıkar`} className="grid size-5 place-items-center rounded-full text-mut">
                        <Icon name="x" className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 px-1 text-[0.8125rem] text-mut">Bir sayfayı ana sayfaya almak için yanındaki +&apos;ya dokun.</p>
              </section>
              {groups.map((g) => (
                <section key={g.title} aria-label={g.title}>
                  <h3 className={head}>
                    <span className={`size-2 rounded-full ${toneOf(g.title).dot}`} />
                    {g.title}
                  </h3>
                  <ul className={list}>{g.items.map((a) => row(a, g.title))}</ul>
                </section>
              ))}
            </>
          )}
        </div>
      </Sheet>
    </nav>
  );
}
