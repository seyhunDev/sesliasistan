"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { duesLive, duesTile, postsTile, raceTile, readSum, saveSum, trainingTile } from "@/lib/homeTiles";
import { todayStr } from "@/lib/utils/format";
import { useMoney } from "./TeamMoney";
import { BRAND } from "./HomeActions";
import { CARD, SectionHead, TAP } from "./ui";
import { useOpenInvoices } from "@/features/invoices/openInvoices";
import { invoiceTile } from "@/lib/invoices";

// Ana sayfa › ÖZET: kısa bilgi kartları, hepsi aynı boyda ve biçimde (simge + ad, büyük sayı, tek satır açıklama).
// Dokununca ilgili sayfa açılır. Dikkat isteyen kart (warn: bekleyen ödeme, eksik iş, yazılmamış günlük) kehribar çerçeve ve noktayla
// öne çıkar, diğerleri sade kalır; aidat kartında ödeyenlerin doluluk çubuğu (bar). Yalnız kişinin görebildiği kartlar çizilir; hiç kart yoksa bölüm görünmez.
// Aidat özeti açılışta okunur (2 okuma, duesLive); gönderi özeti o sayfa açılınca bu cihazda saklanır (homeTiles.js), banka mailleri
// eskiden de okunuyordu (useMoney), yarış raceHome.js'in okumasından, antrenman bellekteki planlardan.
// İlk açılışta okuması süren kartın yerinde aynı boyda yanıp sönen iskelet durur (Skeleton); bilgi gelince kart yumuşakça belirir.
// Önbellekte bilgi varsa iskelet hiç çıkmaz, son bilinen bilgi gösterilip gelen bilgiyle değişir: aidat, gönderi, banka (Firestore önbelleği),
// yarış ve açık faturalar (bugün bu cihazda görülen, sa-home-sum `race`/`inv`; ertesi gün "5 gün kaldı" yanlış olmasın diye yalnız aynı gün); en çok WAIT ms beklenir, sonra kart kendi boş hâliyle çizilir.
const WAIT = 8000;
const fisTile = (r, inv) => (!inv ? r : !r ? inv : { big: r.big, sub: `Fatura: ${inv.sub}`, warn: inv.warn });
export function HomeSummary({ money, race, dues, posts, training, plans, invoices }) {
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
  const skel = (k) => busy && wait[k] && [k, null];
  const cards = [
    skel("bank") || (money && m.bank && ["/mail", "chart", "Banka", m.bank, null, "bank"]),
    // Fiş ve fatura tek kart (sayfası da tek, sekmeli): büyük satır ayın fiş harcaması, açık fatura varsa alt satır onu söyler
    skel("inv") || ((money || inv) && ["/receipts", "receipt", "Fiş / Fatura", fisTile(money && m.receipts, inv), null, "inv"]),
    skel("dues") || (dues && ["/dues", "wallet", "Aidat", duesTile(sum.dues, ym), null, "dues"]),
    skel("race") || (race && ["/athletes/races", "flag", "Sıradaki yarış", raceTile(raceInfo.next, raceInfo.up), null, "race"]),
    training && ["/training", "trend", "Antrenman", trainingTile(plans, today)],
    posts && ["/posts", "instagram", "Instagram", postsTile(sum.posts), "instagram"],
  ].filter(Boolean);
  if (!cards.length) return null;

  return (
    <section aria-labelledby="home-sum" aria-busy={busy}>
      <SectionHead id="home-sum" title="ÖZET" />
      <ul className="grid grid-cols-2 gap-2.5">
        {cards.map(([href, icon, label, t, brand, k]) =>
          !icon ? (
            <Skeleton key={`s-${href}`} />
          ) : (
            <li key={href} className={fade.has(k) ? "fade-in" : undefined}>
              <Link
                href={href}
                aria-label={`${label}: ${t.big}, ${t.sub}`}
                className={`relative flex h-full min-h-[5.75rem] flex-col p-3.5 ${t.warn ? TAP.replace("ring-1 ring-line/70", "ring-2 ring-amber-500/45") : TAP}`}
              >
                <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-mut">
                  {brand ? (
                    <span className={`grid size-5 shrink-0 place-items-center rounded-md ${BRAND[brand]}`}>
                      <Icon name={icon} className="size-3.5" />
                    </span>
                  ) : (
                    <Icon name={icon} className="size-4 shrink-0 text-acc" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {t.warn ? <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-label="dikkat" /> : <Icon name="chev" className="size-3.5 shrink-0" />}
                </span>
                <b className="mt-auto truncate pt-2 text-[1.25rem] font-semibold leading-tight tabular-nums tracking-tight">{t.big}</b>
                {t.bar != null && (
                  <span className="my-1.5 block h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                    <span className={`block h-full rounded-full ${t.bar >= 1 ? "bg-ok" : "bg-acc"}`} style={{ width: `${Math.round(t.bar * 100)}%` }} />
                  </span>
                )}
                <small className={`truncate text-[0.8125rem] leading-snug ${t.warn ? "font-semibold text-amber-700" : "text-mut"}`}>{t.sub}</small>
              </Link>
            </li>
          ),
        )}
      </ul>
    </section>
  );
}

// Kartla aynı boy ve düzende iskelet: simge + ad, büyük sayı, açıklama satırı (renkler temaya göre, .shimmer globals.css)
function Skeleton() {
  return (
    <li aria-hidden="true" className={`flex min-h-[5.75rem] flex-col p-3.5 ${CARD}`}>
      <span className="flex items-center gap-1.5">
        <span className="shimmer size-4 shrink-0 rounded-md" />
        <span className="shimmer block h-3 w-16 rounded-full" />
      </span>
      <span className="shimmer mt-auto block h-5 w-24 rounded-full" />
      <span className="shimmer mt-2 block h-3 w-28 max-w-full rounded-full" />
    </li>
  );
}
