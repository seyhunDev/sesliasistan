"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { clubDues, clubFis, clubRace, duesLive, homeNotes, postsTile, readSum, saveSum, trainingWeek } from "@/lib/homeTiles";
import { money } from "@/lib/bankSheet";
import { rel, todayStr } from "@/lib/utils/format";
import { useAdd } from "@/features/add/AddProvider";
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
// Yarışın altında Notlar kartı (Seyhun: "notları da ana ekranda görebilmeliyim, kulüp kısmına"): en çok 3 not, önce sabitlenenler
// sonra en yeni (homeNotes); Tümü › Notlar sayfası, + Not ekle; nota dokununca not açılır. Not yoksa kart görünmez. Bellekteki notlardan, ek okuma yok.
// Aidat özeti açılışta okunur (2 okuma, duesLive); gönderi özeti o sayfa açılınca bu cihazda saklanır (homeTiles.js), banka mailleri
// eskiden de okunuyordu (useMoney), yarış raceHome.js'in okumasından, antrenman bellekteki planlardan.
// İlk açılışta okuması süren kartın yerinde aynı boyda yanıp sönen iskelet durur (Skeleton); bilgi gelince kart yumuşakça belirir.
// Önbellekte bilgi varsa iskelet hiç çıkmaz, son bilinen bilgi gösterilip gelen bilgiyle değişir: aidat, gönderi, banka (Firestore önbelleği),
// yarış ve açık faturalar (bugün bu cihazda görülen, sa-home-sum `race`/`inv`; ertesi gün "5 gün kaldı" yanlış olmasın diye yalnız aynı gün); en çok WAIT ms beklenir, sonra kart kendi boş hâliyle çizilir.
const WAIT = 8000;
export function HomeSummary({ title = "ÖZET", money, race, dues, posts, training, plans, invoices, notes }) {
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
  // Sıra: dikkat isteyebilenler (aidat, fatura) önce; Antrenman ve Instagram altta tam genişlik kendi kartlarında
  const tiles = [
    skel("dues") ? ["dues"] : dues && ["/dues", "wallet", "Aidat", clubDues(sum.dues, ym), "dues"],
    skel("inv") ? ["inv"] : (money || invoices) && ["/receipts", "receipt", "Fiş / Fatura", clubFis(inv, money && m.receipts), "inv"],
    skel("bank") ? ["bank"] : money && ["/mail", "wallet", "Hesaplar", m.bank, "bank"],
  ].filter((x) => x && (x.length === 1 || x[3]));
  const week = training ? trainingWeek(plans || [], today) : null;
  const post = posts && sum.posts?.count ? sum.posts : null;
  const raceWait = skel("race");
  const note = homeNotes(notes || [], 3);
  if (!raceCard && !raceWait && !tiles.length && !note.total && !week && !post) return null;

  return (
    <section aria-labelledby="home-sum" aria-busy={busy}>
      <SectionHead id="home-sum" title={title} />
      <div className="space-y-3">
        {raceWait ? <Skeleton wide /> : raceCard && <RaceCard r={raceCard} fade={fade.has("race")} />}
        {note.total > 0 && <NotesCard list={note.list} total={note.total} />}
        {tiles.length > 0 && (
          <ul className="grid grid-cols-2 gap-3">
            {tiles.map(([href, icon, label, t, k], i) => {
              const wide = tiles.length % 2 === 1 && i === tiles.length - 1 ? "col-span-2" : "";
              if (!icon) return <Skeleton key={`s-${href}`} className={wide} />;
              return (
                <li key={href} className={`${wide} ${fade.has(k) ? "fade-in" : ""}`}>
                  <Link href={href} data-press aria-label={`${label}: ${t.big}, ${t.sub}`} className={`flex h-full flex-col px-4 pb-3.5 pt-3.5 ${CARD}`}>
                    <span className="flex items-center gap-2.5">
                      <span className={`grid size-8 shrink-0 place-items-center rounded-[0.625rem] ${t.warn ? WARN_BG : "bg-acc/10 text-acc"}`}>
                        <Icon name={icon} className="size-[1.125rem]" />
                      </span>
                      <b className="min-w-0 truncate text-[0.9375rem] font-semibold">{label}</b>
                    </span>
                    {k === "dues" ? <DuesBody t={t} /> : k === "bank" ? <BankBody t={t} /> : <PlainBody t={t} />}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {week && <TrainingCard w={week} />}
        {post && <PostsCard p={post} />}
      </div>
    </section>
  );
}

const WARN_BG = "bg-amber-500/12 text-amber-700 dark:text-amber-300";
const WARN_TX = "text-amber-700 dark:text-amber-300";

function PlainBody({ t }) {
  return (
    <>
      <b className="mt-2.5 block truncate text-[1.375rem] font-bold leading-tight tabular-nums tracking-tight">{t.big}</b>
      <small className={`mt-0.5 block truncate text-[0.8125rem] leading-snug ${t.warn ? `font-semibold ${WARN_TX}` : "text-mut"}`}>{t.sub}</small>
    </>
  );
}

// Aidat: solda yüzde halkası, yanında "18/30 ödedi"; altta hap: onay bekleyen (kehribar) ya da ödemeyen sayısı
function DuesBody({ t }) {
  const pct = Math.round((t.bar || 0) * 100);
  const r = 15.5;
  const c = 2 * Math.PI * r;
  return (
    <>
      <span className="mt-2.5 flex items-center gap-2.5">
        <span className="relative grid size-11 shrink-0 place-items-center" aria-hidden="true">
          <svg viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
            <circle cx="18" cy="18" r={r} fill="none" stroke="var(--line)" strokeWidth="3.5" />
            <circle cx="18" cy="18" r={r} fill="none" stroke="var(--acc)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(c * pct) / 100} ${c}`} />
          </svg>
          <b className="text-[0.6875rem] font-bold tabular-nums">%{pct}</b>
        </span>
        <span className="min-w-0 leading-tight">
          <b className="block text-[1.375rem] font-bold tabular-nums tracking-tight">{t.big}</b>
          <small className="block text-[0.75rem] text-mut">ödedi</small>
        </span>
      </span>
      <span
        className={`mt-2.5 inline-flex max-w-full items-center gap-1 self-start truncate rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${t.warn ? WARN_BG : "bg-line/60 text-mut"}`}
      >
        <span className="truncate">{t.sub}</span>
        {t.warn && <Icon name="chev" className="size-3 shrink-0" />}
      </span>
    </>
  );
}

// Hesaplar: bakiye, son 7 özetin küçük çizgi grafiği, altta değişim (artış yeşil ▲, azalış kırmızı ▼)
function BankBody({ t }) {
  const s = t.spark || [];
  const up = (t.diff || 0) >= 0;
  let path = "";
  let area = "";
  if (s.length > 1) {
    const lo = Math.min(...s);
    const hi = Math.max(...s);
    const pts = s.map((v, i) => [(i / (s.length - 1)) * 100, hi === lo ? 14 : 26 - ((v - lo) / (hi - lo)) * 22]);
    path = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    area = `${path} L100 30 L0 30 Z`;
  }
  const col = up ? "var(--acc)" : "var(--rec)";
  return (
    <>
      <b className="mt-2.5 block truncate text-[1.25rem] font-bold leading-tight tabular-nums tracking-tight">{t.big}</b>
      {path ? (
        <>
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-1.5 block h-7 w-full" aria-hidden="true">
            <path d={area} fill={col} opacity=".12" />
            <path d={path} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <small className={`mt-1 block truncate text-[0.75rem] font-semibold tabular-nums ${up ? "text-acc" : "text-rose-600 dark:text-rose-400"}`}>
            {up ? "▲ +" : "▼ "}
            {money(t.diff)} {t.cur} <span className="font-normal text-mut">· son 7 özet</span>
          </small>
        </>
      ) : (
        <small className="mt-0.5 block truncate text-[0.8125rem] leading-snug text-mut">{t.sub}</small>
      )}
    </>
  );
}

// Antrenman (tam genişlik): bu haftanın 7 günü, günlüğü yazılan ✓, yazılmayan !, bugün koyu; altta ayın özeti
function TrainingCard({ w }) {
  const DAY = {
    done: "bg-acc text-white",
    miss: "bg-amber-500/15 text-amber-700 ring-1 ring-amber-500/50 dark:text-amber-300",
    today: "bg-fg text-bg",
    plan: "ring-[1.5px] ring-acc text-acc",
    none: "bg-line/60 text-mut",
  };
  const label = { done: "yapıldı", miss: "günlük yok", today: "bugün", plan: "planlı", none: "antrenman yok" };
  return (
    <Link href="/training" data-press aria-label={`Antrenman: bu hafta ${w.done}/${w.planned}, bu ay ${w.total} antrenman${w.missing ? `, ${w.missing} günlük yazılmadı` : ""}`} className={`block px-4 pb-3.5 pt-3.5 ${CARD}`}>
      <span className="flex items-center gap-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-[0.625rem] ${w.missing ? WARN_BG : "bg-acc/10 text-acc"}`}>
          <Icon name="trend" className="size-[1.125rem]" />
        </span>
        <b className="text-[0.9375rem] font-semibold">Antrenman</b>
        <small className="text-[0.8125rem] text-mut">bu hafta</small>
        {w.planned > 0 && <b className="text-[0.8125rem] font-semibold tabular-nums">{w.done}/{w.planned}</b>}
        <span className={`ml-auto flex items-center gap-0.5 text-[0.8125rem] font-semibold ${w.missing ? WARN_TX : "text-acc"}`}>
          {w.missing ? "Günlük yaz" : "Tümü"}
          <Icon name="chev" className="size-3.5" />
        </span>
      </span>
      <span className="mt-3 grid grid-cols-7 gap-1" aria-hidden="true">
        {w.days.map((d) => {
          const st = d.state === "today" && !d.has ? "none" : d.state;
          return (
            <span key={d.date} className="flex flex-col items-center gap-1" title={label[st]}>
              <small className={`text-[0.6875rem] ${d.state === "today" ? "font-bold text-fg" : "text-mut"}`}>{d.w}</small>
              <span className={`grid size-8 place-items-center rounded-full text-[0.8125rem] font-semibold tabular-nums ${DAY[st]} ${d.state === "today" && !d.has ? "ring-[1.5px] ring-fg" : ""}`}>
                {st === "done" ? <Icon name="check" className="size-4" /> : st === "miss" ? "!" : d.d}
              </span>
            </span>
          );
        })}
      </span>
      <small className="mt-3 block truncate border-t border-line pt-2.5 text-[0.8125rem] text-mut">
        Bu ay <b className="font-semibold text-fg">{w.total}</b> antrenman
        {w.avgWind != null && ` · ortalama ${w.avgWind} kn rüzgâr`}
        {w.missing > 0 && <span className={`font-semibold ${WARN_TX}`}> · {w.missing} günlük yazılmadı</span>}
      </small>
    </Link>
  );
}

// Instagram (tam genişlik): son gönderinin küçük görseli, başlığı ve ne zaman; Yeni gönderi ve Aç
function PostsCard({ p }) {
  const last = p.last || {};
  const when = postsTile(p).sub;
  return (
    <div className={`flex gap-3.5 p-3 ${CARD}`}>
      <Link href={last.id ? `/posts/${last.id}` : "/posts"} data-press aria-label={`Son gönderi: ${last.title || "gönderi"}`} className="block size-[6.5rem] shrink-0 overflow-hidden rounded-xl">
        {last.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={last.thumb} alt="" className="size-full object-cover" />
        ) : (
          <span className={`grid size-full place-items-center ${BRAND.instagram}`}>
            <Icon name="instagram" className="size-9" />
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <span className="flex items-center gap-2">
          <span className={`grid size-6 shrink-0 place-items-center rounded-md ${BRAND.instagram}`}>
            <Icon name="instagram" className="size-3.5" />
          </span>
          <small className="text-[0.75rem] font-bold tracking-[.06em] text-mut">SON GÖNDERİ</small>
        </span>
        <b className="mt-1 line-clamp-2 text-[0.9375rem] font-semibold leading-snug">{last.title || "Gönderi"}</b>
        <small className="block truncate text-[0.8125rem] text-mut">
          {when} · toplam {p.count}
        </small>
        <span className="mt-auto flex gap-2 pt-2">
          <Link href="/posts/new" data-press className="flex items-center gap-1 rounded-full bg-acc px-3 py-1.5 text-[0.8125rem] font-semibold text-white">
            <Icon name="plus" className="size-3.5" />
            Yeni gönderi
          </Link>
          <Link href="/posts" data-press className="rounded-full bg-acc/10 px-3 py-1.5 text-[0.8125rem] font-semibold text-acc">
            Tümü
          </Link>
        </span>
      </div>
    </div>
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

// Notlar: başlık satırı (simge, ad, sayı, Tümü), en çok 3 not (sabitliye yıldız, diğerlerine gri çizgi; altında "Sabit" ya da tarih · ilk satır), en altta + Not ekle
function NotesCard({ list, total }) {
  const { openAdd } = useAdd();
  return (
    <div className={`overflow-hidden ${CARD}`}>
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-[0.625rem] bg-acc/10 text-acc">
          <Icon name="note" className="size-[1.125rem]" />
        </span>
        <b className="text-[0.9375rem] font-semibold">Notlar</b>
        <span className="text-[0.8125rem] font-semibold tabular-nums text-mut">{total}</span>
        <Link href="/notes" className="ml-auto flex items-center gap-0.5 text-[0.8125rem] font-semibold text-acc">
          Tümü
          <Icon name="chev" className="size-3.5" />
        </Link>
      </div>
      <ul>
        {list.map((n) => {
          const text = n.body && n.body !== n.title ? n.body.replace(/\s+/g, " ") : "";
          const when = n.pinned ? "Sabit" : n.createdAt ? rel(n.createdAt.slice(0, 10)) : "";
          return (
            <li key={n.id} className="border-t border-line">
              <button type="button" onClick={() => openAdd({ edit: { kind: "note", id: n.id } })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
                {n.pinned ? (
                  <Icon name="star" className="size-3.5 shrink-0 fill-current text-amber-500" />
                ) : (
                  <span aria-hidden="true" className="mx-[0.3125rem] h-7 w-1 shrink-0 rounded-full bg-line" />
                )}
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-semibold">{n.title || "Not"}</b>
                  {(when || text) && (
                    <small className="block truncate text-[0.8125rem] text-mut">
                      {when}
                      {when && text && " · "}
                      {text}
                    </small>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => openAdd({ type: "note" })} className="flex w-full items-center gap-1.5 border-t border-line px-4 py-2.5 text-[0.875rem] font-semibold text-acc">
        <Icon name="plus" className="size-4" />
        Not ekle
      </button>
    </div>
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
