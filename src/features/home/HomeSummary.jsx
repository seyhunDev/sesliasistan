"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { clubDues, clubFis, clubPosts, clubRace, clubTraining, duesLive, readSum, saveSum } from "@/lib/homeTiles";
import { todayStr } from "@/lib/utils/format";
import { useMoney } from "./TeamMoney";
import { BRAND } from "./HomeActions";
import { CARD, SectionHead } from "./ui";
import { useOpenInvoices } from "@/features/invoices/openInvoices";
import { invoiceTile } from "@/lib/invoices";

// Ana sayfa › KULÜP / ÖZET: yalnız bilgisi olan kartlar görünür (Seyhun: "ne varsa onlar gösterilsin, yoksa gösterilmesin").
// Üstte tam genişlik "Sıradaki yarış" kartı (ad, tarih, sporcu, eksik iş, kalan gün); altında iki sütun küçük kartlar:
// Aidat (ödemeyen/onay bekleyen varsa), Fiş / Fatura (ödenmemiş fatura ya da bu ay fiş varsa), Banka, Antrenman (bu ay varsa),
// Instagram (gönderi varsa). Bilgisi biten kart kendiliğinden gizlenir (clubDues, clubFis… homeTiles.js). Dikkat isteyen kart (warn)
// kehribar simge ve yazıyla öne çıkar. Hiç kart yoksa bölüm görünmez.
// Aidat özeti açılışta okunur (2 okuma, duesLive); gönderi özeti o sayfa açılınca bu cihazda saklanır (homeTiles.js), banka mailleri
// eskiden de okunuyordu (useMoney), yarış raceHome.js'in okumasından, antrenman bellekteki planlardan.
// İlk açılışta okuması süren kartın yerinde aynı boyda yanıp sönen iskelet durur (Skeleton); bilgi gelince kart yumuşakça belirir.
// Önbellekte bilgi varsa iskelet hiç çıkmaz, son bilinen bilgi gösterilip gelen bilgiyle değişir: aidat, gönderi, banka (Firestore önbelleği),
// yarış ve açık faturalar (bugün bu cihazda görülen, sa-home-sum `race`/`inv`; ertesi gün "5 gün kaldı" yanlış olmasın diye yalnız aynı gün); en çok WAIT ms beklenir, sonra kart kendi boş hâliyle çizilir.
const WAIT = 8000;
export function HomeSummary({ title = "ÖZET", money, race, dues, posts, training, plans, invoices }) {
  const m = useMoney();
  const [sum, setSum] = useState(readSum);
  const [duesGot, setDuesGot] = useState(false);
  const [late, setLate] = useState(false);
  const today = todayStr();
  const orgId = useAuth().profile?.orgId;
  const ym = today.slice(0, 7);
  // Ödenmemiş faturalar (ana hesap): yalnız açık olanlar okunur; hiç yoksa kart çıkmaz
  const openInv = useOpenInvoices(orgId, !!invoices);
  // Yarış ve fatura kartı: gelen bilgi bu cihazda saklanır, sonraki açılışta okuma bitene kadar o gösterilir (aynı gün)
  const oldInv = sum.inv?.day === today ? sum.inv : null;
  const oldRace = sum.race?.day === today ? sum.race : null;
  const inv = openInv ? invoiceTile(openInv, today) : oldInv?.tile || null;
  const raceNow = race && !race.loading ? { up: race.up, next: race.next } : null;
  const raceInfo = raceNow || oldRace || { up: 0, next: null };
  const invKey = openInv && JSON.stringify(inv);
  const raceKey = raceNow && JSON.stringify(raceNow);
  useEffect(() => {
    if (invKey) saveSum("inv", { day: today, tile: JSON.parse(invKey) });
  }, [invKey, today]);
  useEffect(() => {
    if (raceKey) saveSum("race", { day: today, ...JSON.parse(raceKey) });
  }, [raceKey, today]);
  // Aidat kartı: açılışta ve uygulamaya dönünce bu ayın aidat kaydı okunur (kart Aidatlar sayfası açılmadan da güncel)
  useEffect(() => {
    if (!dues || !orgId) return;
    let live = true;
    const load = () =>
      Promise.all([getDoc(doc(db, "orgs", orgId, "dues", "settings")), getDoc(doc(db, "orgs", orgId, "dues", ym))])
        .then(([c, m]) => {
          if (!live) return;
          setDuesGot(true);
          const next = duesLive(c.data(), m.data(), ym, readSum().dues);
          if (!next) return;
          saveSum("dues", next);
          setSum((p) => ({ ...p, dues: next }));
        })
        .catch(() => live && setDuesGot(true));
    load();
    const onShow = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onShow);
    return () => {
      live = false;
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [dues, orgId, ym]);
  // Okuması süren kartlar (önbellekte bilgisi olmayan)
  const wait = {
    bank: money && m.loading,
    inv: invoices && !!orgId && openInv === null && !oldInv,
    dues: dues && !!orgId && sum.dues?.ym !== ym && !duesGot,
    race: race && race.loading && !oldRace,
  };
  const busy = !late && Object.values(wait).some(Boolean);
  // Açılışta iskeletle başlayan kartlar: bilgi gelince belirerek açılır (diğerleri olduğu gibi)
  const [fade] = useState(() => new Set(Object.keys(wait).filter((k) => wait[k])));
  useEffect(() => {
    if (!busy) return;
    const t = setTimeout(() => setLate(true), WAIT);
    return () => clearTimeout(t);
  }, [busy]);
  const skel = (k) => busy && wait[k];
  const raceCard = race && !skel("race") && clubRace(raceInfo.next);
  // Sıra: dikkat isteyebilenler (aidat, fatura) önce
  const tiles = [
    skel("dues") ? ["dues"] : dues && ["/dues", "wallet", "Aidat", clubDues(sum.dues, ym), "dues"],
    skel("inv") ? ["inv"] : (money || invoices) && ["/receipts", "receipt", "Fiş / Fatura", clubFis(inv, money && m.receipts), "inv"],
    skel("bank") ? ["bank"] : money && ["/mail", "wallet", "Banka", m.bank, "bank"],
    training && ["/training", "trend", "Antrenman", clubTraining(plans, today)],
    posts && ["/posts", "instagram", "Instagram", clubPosts(sum.posts), null, "instagram"],
  ].filter((x) => x && (x.length === 1 || x[3]));
  const raceWait = skel("race");
  if (!raceCard && !raceWait && !tiles.length) return null;

  return (
    <section aria-labelledby="home-sum" aria-busy={busy}>
      <SectionHead id="home-sum" title={title} />
      <div className="space-y-3">
        {raceWait ? <Skeleton wide /> : raceCard && <RaceCard r={raceCard} fade={fade.has("race")} />}
        {tiles.length > 0 && (
          <ul className="grid grid-cols-2 gap-3">
            {tiles.map(([href, icon, label, t, k, brand], i) => {
              const wide = tiles.length % 2 === 1 && i === tiles.length - 1 ? "col-span-2" : "";
              if (!icon) return <Skeleton key={`s-${href}`} className={wide} />;
              return (
                <li key={href} className={`${wide} ${fade.has(k) ? "fade-in" : ""}`}>
                  <Link href={href} aria-label={`${label}: ${t.big}, ${t.sub}`} className={`flex h-full flex-col px-4 pb-3.5 pt-3.5 ${CARD}`}>
                    <span className="flex items-center gap-2.5">
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-[0.625rem] ${brand ? BRAND[brand] : t.warn ? "bg-amber-500/12 text-amber-700 dark:text-amber-300" : "bg-acc/10 text-acc"}`}
                      >
                        <Icon name={icon} className="size-[1.125rem]" />
                      </span>
                      <b className="min-w-0 truncate text-[0.9375rem] font-semibold">{label}</b>
                    </span>
                    <b className="mt-2.5 block truncate text-[1.375rem] font-bold leading-tight tabular-nums tracking-tight">{t.big}</b>
                    <small className={`mt-0.5 block truncate text-[0.8125rem] leading-snug ${t.warn ? "font-semibold text-amber-700 dark:text-amber-300" : "text-mut"}`}>{t.sub}</small>
                    {t.bar != null && (
                      <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
                        <span className="block h-full rounded-full bg-acc" style={{ width: `${Math.round(t.bar * 100)}%` }} />
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

// Sıradaki yarış: tam genişlik kart, dokununca o yarışın sayfası (eski önbellekte id yoksa Yarışlar); solda bayrak, ortada ad ve "tarih · sporcu · eksik iş", sağda büyük kalan gün
function RaceCard({ r, fade }) {
  return (
    <Link
      href={r.id ? `/athletes/races/${r.id}` : "/athletes/races"}
      aria-label={`Sıradaki yarış: ${r.title}, ${r.days != null ? `${r.days} gün kaldı` : r.when}`}
      className={`flex items-center gap-3.5 py-3.5 pl-4 pr-5 ${CARD} ${fade ? "fade-in" : ""}`}
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${r.left ? "bg-amber-500/12 text-amber-700 dark:text-amber-300" : "bg-acc/10 text-acc"}`}>
        <Icon name="flag" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <small className="block text-[0.6875rem] font-bold tracking-[.08em] text-acc">SIRADAKİ YARIŞ</small>
        <b className="block truncate text-[1.0625rem] font-semibold leading-snug">{r.title}</b>
        <small className="block truncate text-[0.8125rem] leading-snug text-mut">
          {r.sub}
          {r.sub && " · "}
          <span className={r.left ? "font-semibold text-amber-700 dark:text-amber-300" : ""}>{r.left ? `${r.left} iş eksik` : "hazır"}</span>
        </small>
      </span>
      {r.days != null ? (
        <span className="shrink-0 text-center leading-none">
          <b className="block text-[1.875rem] font-bold tabular-nums tracking-tight">{r.days}</b>
          <small className="text-[0.75rem] font-semibold text-mut">gün</small>
        </span>
      ) : (
        <b className="shrink-0 text-[1.0625rem] font-bold text-acc">{r.when}</b>
      )}
    </Link>
  );
}

// Kartla aynı boy ve düzende iskelet (renkler temaya göre, .shimmer globals.css); wide: yarış kartı
function Skeleton({ wide, className = "" }) {
  if (wide)
    return (
      <div aria-hidden="true" className={`flex items-center gap-3.5 py-3.5 pl-4 pr-5 ${CARD}`}>
        <span className="shimmer size-11 shrink-0 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="shimmer block h-3 w-24 rounded-full" />
          <span className="shimmer mt-2 block h-4 w-36 max-w-full rounded-full" />
          <span className="shimmer mt-2 block h-3 w-44 max-w-full rounded-full" />
        </span>
        <span className="shimmer block h-8 w-8 rounded-lg" />
      </div>
    );
  return (
    <li aria-hidden="true" className={`px-4 py-3.5 ${CARD} ${className}`}>
      <span className="flex items-center gap-2.5">
        <span className="shimmer size-8 shrink-0 rounded-[0.625rem]" />
        <span className="shimmer block h-3.5 w-16 rounded-full" />
      </span>
      <span className="shimmer mt-3 block h-5 w-20 rounded-full" />
      <span className="shimmer mt-2 block h-3 w-28 max-w-full rounded-full" />
    </li>
  );
}
