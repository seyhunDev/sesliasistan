"use client";

import { Fragment, useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { dayInfo, needsLog, planTone, clubDues, clubFis, clubRace, duesLive, postsTile, readSum, saveSum } from "@/lib/homeTiles";
import { todayStr } from "@/lib/utils/format";
import { useAdd } from "@/features/add/AddProvider";
import { useMoney } from "./TeamMoney";
import { SectionHead } from "./ui";
import { FadeImg } from "@/components/ui/FadeImg";
import { NotesWidget, PageChips, WHead, WIDGET } from "./HomeWidgets";
import { useOpenInvoices } from "@/features/invoices/openInvoices";
import { invoiceTile } from "@/lib/invoices";

// Ana sayfa › Kulüp / Özet canlı alanları (Seyhun 2026-10-17: "kısa yolları güzel tasarımla ayrı ayrı alanlar yapalım"; örnek 7-canli-alanlar-notlar.png):
// iki sütunlu ızgara; önce tam genişlik alanlar (lead: Sporcular, Fitness; HomeWidgets.jsx), sonra kare alanlar: Sıradaki yarış, Aidat (halka),
// Fiş / Fatura, Hesap (bakiye çizgisi); tek kalan kare iki sütunu kaplar. Sonra Notlar, tail (Mesajlar, Toplantı) ve Instagram (son üç gönderi).
// Yalnız bilgisi olan alan görünür (clubDues, clubFis… homeTiles.js). Alanlar yalnız ilgili sayfayı açar.
// Aidat özeti açılışta okunur (2 okuma, duesLive); gönderi özeti o sayfa açılınca bu cihazda saklanır; banka mailleri useMoney; yarış raceHome.js.
// Okuması süren alanın yerinde yanıp sönen iskelet (SkelWidget); önbellekte bilgi varsa (aidat, gönderi, banka, aynı günün yarış ve faturası) hiç çıkmaz.
const WAIT = 8000;
export function HomeSummary({ title = "ÖZET", money, race, dues, posts, invoices, notes, lead, tail, pages = [], hide = [] }) {
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
  const duesT = dues && !skel("dues") && clubDues(sum.dues, ym);
  const fisT = (money || invoices) && !skel("inv") && clubFis(inv, money && m.receipts);
  const bankT = money && !skel("bank") && m.bank;
  const post = posts && sum.posts?.count ? sum.posts : null;
  const mon = new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", {
    month: "long",
  });
  const show = (k) => (fade.has(k) ? "fade-in" : "");
  // Kare alanlar (iki sütun): yalnız bilgisi olan ya da okuması süren; tek kalan sonuncu iki sütunu kaplar
  const squares = [
    skel("race")
      ? { key: "race", skel: true }
      : raceCard && {
          key: "race",
          el: (w) => <RaceWidget r={raceCard} cls={`${show("race")} ${w}`} />,
        },
    skel("dues")
      ? { key: "dues", skel: true }
      : duesT && {
          key: "dues",
          el: (w) => <DuesWidget t={duesT} mon={mon} cls={`${show("dues")} ${w}`} />,
        },
    skel("bank")
      ? { key: "bank", skel: true }
      : bankT && {
          key: "bank",
          el: (w) => <BankWidget b={bankT} cls={`${show("bank")} ${w}`} />,
        },
  ].filter(Boolean);
  // Fiş / Fatura: kare değil, en altta ince tam genişlik satır
  const fis = skel("inv") ? { key: "inv", skel: true } : fisT && { key: "inv", el: () => <FisWidget t={fisT} spend={invoices && inv && money ? m.receipts : null} cls={show("inv")} /> };
  // Dizilim (Seyhun 2026-10-19: "boşluğu kullanıp aidat ve hesabı yan yana, ince"): yarış tam genişlik (eksik işlerin adıyla), altında aidat ve
  // hesap yan yana ince kartlar; tek kalan iki sütunu kaplar
  const pair = squares.filter((t) => t.key !== "race");
  const span = (t) => (t.key === "race" || pair.length === 1 ? "col-span-2 min-h-0" : "min-h-0");

  // Alttaki sayfa düğmeleri: alanı görünen sayfa (yarış, aidat, fiş, hesap, Instagram) tekrar düğme olmaz; alanı yoksa düğme kalır
  const shown = {
    race: "/athletes/races",
    dues: "/dues",
    inv: "/receipts",
    bank: "/mail",
  };
  const gone = [...hide, ...[...squares, fis].filter(Boolean).map((t) => shown[t.key]), ...(post ? ["/posts"] : [])];

  return (
    <>
      <section aria-labelledby="home-sum" aria-busy={busy}>
        <SectionHead id="home-sum" title={title} />
        <div className="grid grid-cols-2 gap-2.5">
          {lead}
          {squares.map((t) => (t.skel ? <SkelWidget key={t.key} cls={span(t)} /> : <Fragment key={t.key}>{t.el(span(t))}</Fragment>))}
          {fis && (fis.skel ? <SkelWidget cls="col-span-2 min-h-0" /> : fis.el())}
          <NotesWidget notes={notes} />
          {tail}
          {post && <PostsWidget post={post} />}
        </div>
      </section>
      <PageChips groups={pages} hide={gone} />
    </>
  );
}

// Tam genişlik: sıradaki yarış (ad, tarih · yer · sporcu, sağda büyük kalan gün, eksik iş sayısı ve ilk üç eksik işin adı). Dokununca yarışın sayfası;
// sağ üstte "Tümü ›" Yarışlar sayfası (Seyhun 2026-10-18: "yarışlara ana sayfadan ulaşamıyoruz"),
// altta "Multimedyayı aç" yarış günü sayfasını açar (Seyhun 2026-10-18: "ana sayfadan ilgili yarışın multimedya sayfasına ulaşabilirim")
function RaceWidget({ r, cls }) {
  const sub = r.sub || "";
  return (
    <div className={`${WIDGET} ${cls}`}>
      <WHead
        tone="sp"
        title="Sıradaki yarış"
        right={
          <Link href="/athletes/races" className="text-acc">
            Tümü ›
          </Link>
        }
      />
      <Link href={r.id ? `/athletes/races/${r.id}` : "/athletes/races"} className="flex flex-1 flex-col">
        <span className="mt-2 flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <b className="block text-[0.96875rem] font-semibold">{r.title}</b>
            <small className="block text-[0.8125rem] text-mut">{sub}</small>
          </span>
          <span className="shrink-0 text-[1.75rem] font-semibold leading-none tracking-[-.02em] tabular-nums">
            {r.days != null ? r.days : r.when}
            {r.days != null && <span className="ml-1 text-[0.9375rem] font-medium">gün</span>}
          </span>
        </span>
        {r.left > 0 && (
          <span className="mt-2.5 block">
            <small className="block text-[0.78125rem] font-semibold text-warn">{r.left} iş eksik</small>
            {r.steps?.map((x) => (
              <small key={x} className="mt-1 flex items-start gap-1.5 text-[0.8125rem] leading-snug">
                <span aria-hidden="true" className="mt-[0.4rem] size-1.5 shrink-0 rounded-full bg-warn" />
                <span className="line-clamp-2 min-w-0">{x}</span>
              </small>
            ))}
          </span>
        )}
      </Link>
      {r.id && (
        <Link href={`/athletes/races/${r.id}/media`} data-press className="acc-btn mt-3 flex h-11 items-center justify-center gap-1.5 rounded-2xl text-[0.9375rem] font-semibold">
          Multimedyayı aç
          <Icon name="chev" className="size-4" />
        </Link>
      )}
    </div>
  );
}

// Kare alan: bu ayın aidatı (ödeyenlerin halkası, 9/14, ödemeyen ya da onay bekleyen). Dokununca Aidatlar
function DuesWidget({ t, mon, cls }) {
  const [paid, count] = t.big.split("/");
  return (
    <Link href="/dues" className={`${WIDGET} ${cls}`}>
      <WHead tone="st" title={`Aidat · ${mon}`} />
      <span className="mt-2 flex items-center gap-2.5">
        <Ring p={t.bar || 0} label={`%${Math.round((t.bar || 0) * 100)}`} />
        <span className="min-w-0">
          <b className="block text-[1.5rem] font-semibold leading-tight tabular-nums">
            {paid}
            <span className="text-[1rem] text-mut">/{count}</span>
          </b>
          <small className={`block text-[0.8125rem] leading-snug ${t.warn ? "text-warn" : "text-mut"}`}>{t.sub}</small>
        </span>
      </span>
    </Link>
  );
}

// Kare alan: fiş / fatura (ödenmemiş fatura sayısı ve tutarı, yoksa ayın fiş harcaması; altında ayın harcaması). Dokununca Fiş / Fatura
function FisWidget({ t, spend, cls }) {
  return (
    <Link href="/receipts" className={`col-span-2 flex items-center gap-3 overflow-hidden rounded-2xl bg-card px-3.5 py-3 text-left ${cls}`}>
      <span className="shrink-0">
        <WHead tone="fa" title="Fiş / Fatura" />
      </span>
      <span className="ml-auto min-w-0 text-right">
        <b className={`block truncate text-[0.9375rem] font-semibold tabular-nums ${t.warn ? "text-warn" : ""}`}>{[t.big, t.sub].filter(Boolean).join(" · ")}</b>
        {spend && (
          <small className="block truncate text-[0.78125rem] text-mut">
            {spend.sub}: {spend.big}
          </small>
        )}
      </span>
    </Link>
  );
}

// Kare alan: Hesap (Seyhun 2026-10-18: "kasadaki nakit ön planda, banka küçük, çok detaya gerek yok"): büyük kasa (kasa yoksa banka), altında
// "Kasada nakit", en altta küçük "Banka … ₺" (useMoney). Dokununca Hesaplar
function BankWidget({ b, cls }) {
  return (
    <Link href="/mail" className={`${WIDGET} ${cls}`}>
      <WHead tone="st" title="Hesap" />
      <b className="mt-2 block truncate text-[1.5rem] font-semibold leading-tight tracking-[-.02em] tabular-nums">{b.big}</b>
      {b.label && <small className="block truncate text-[0.8125rem] text-mut">{b.label}</small>}
      {b.sub && <small className="mt-auto block truncate pt-2 text-[0.8125rem] tabular-nums text-fg2">{b.sub}</small>}
    </Link>
  );
}

function Ring({ p, label }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 52 52" aria-hidden="true" className="size-11 shrink-0">
      <circle cx="26" cy="26" r={r} fill="none" className="stroke-line" strokeWidth="6" />
      <circle cx="26" cy="26" r={r} fill="none" className="stroke-acc" strokeWidth="6" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} transform="rotate(-90 26 26)" />
      <text x="26" y="27" textAnchor="middle" dominantBaseline="middle" className="fill-fg text-[0.6875rem] font-bold">
        {label}
      </text>
    </svg>
  );
}

function SkelWidget({ cls }) {
  return (
    <div aria-hidden="true" className={`${WIDGET} ${cls}`}>
      <span className="shimmer block h-3 w-20 rounded-full" />
      <span className="shimmer mt-3 block h-6 w-24 rounded-full" />
      <span className="shimmer mt-2 block h-3 w-28 rounded-full" />
    </div>
  );
}

// Tam genişlik: Instagram (gönderi sayısı, sonuncusu ne zaman; son üç gönderinin görseli, dokununca o gönderi). Görsel yoksa yalnız yazı
function PostsWidget({ post }) {
  const t = postsTile(post);
  const recent = (post.recent?.length ? post.recent : post.last ? [post.last] : []).filter((x) => x?.id && x.thumb).slice(0, 3);
  return (
    <div className={`${WIDGET} col-span-2 min-h-0`}>
      <WHead
        tone="ve"
        title="Instagram"
        count={t.big}
        right={
          <Link href="/posts" className="text-acc">
            Tümü ›
          </Link>
        }
      />
      {t.sub && <small className="mt-0.5 block text-[0.8125rem] text-mut">{t.sub}</small>}
      {recent.length > 0 && (
        <span className="mt-2.5 grid grid-cols-3 gap-2">
          {recent.map((x) => (
            <Link key={x.id} href={`/posts/${x.id}`} aria-label="Gönderiyi aç" className="relative block aspect-[4/5] overflow-hidden rounded-[0.625rem] bg-line">
              <FadeImg src={x.thumb} className="size-full object-cover" />
            </Link>
          ))}
        </span>
      )}
    </div>
  );
}

// Okuma sürerken satırın yerinde yanıp sönen çizgiler (.shimmer globals.css)
// Ana sayfanın gün şeridi (başlıksız; Seyhun: "isim bile koymaya gerek yok"): dünden başlayan üç haftalık günler (bugün ikinci sırada, kaydırılır), günlüğü yazılan ✓, yazılmayan !, bugün yeşil daire (Seyhun: "kırmızı yapmayalım").
// Güne dokununca alttan pencere açılır (Seyhun: "fitness sayfasına gitmeye gerek yok, alttan bir yer açılsın"): o günün yelken
// antrenmanı (yoklama), yelken planı yoksa "Antrenman ekle, yoklamasını al", fitness yapan sporcular (dokununca hareketleri). dayInfo, homeTiles.js.
// Fitness olan günün altında turuncu, başka planı olan günün altında plan türünün renginde nokta (planTone; pencerede PLANLAR). Kendi gruplu kartında, SiradaCard.jsx çizer.
export function WeekStrip({ w, att, today }) {
  const [pick, setPick] = useState(null); // Dokunulan gün: pencere
  const DAY = {
    done: "bg-accbg text-acc",
    miss: "bg-warnbg text-warn",
    today: "bg-acc text-white",
    plan: "ring-[1.5px] ring-acc text-acc",
    none: "text-mut",
    fit: "bg-orange-500/12 text-orange-700 ring-1 ring-orange-500/50 dark:text-orange-300",
  };
  const label = { done: "yapıldı", miss: "günlük yok", today: "bugün", plan: "planlı", none: "antrenman yok", fit: "fitness" };
  return (
    <>
      {/* Kaydırılan şerit (Seyhun: "iki hafta daha gidebilmeliyim, sonra Tümü"): dünden başlar, her gün kartın yedide biri, gün gün durur; ayın 1'inde gün adı yerine ay adı; en sonda Tümü (Takvim) */}
      <div className="flex snap-x snap-mandatory scroll-px-2.5 overflow-x-auto px-2.5 [scrollbar-width:none]">
        {w.days.map((d, i) => {
          const fitOnly = !d.has && d.fit.length > 0;
          const st = fitOnly ? "fit" : d.state === "today" && !d.has ? "none" : d.state;
          const info = dayInfo(d, att, today);
          const what = [d.has ? "yelken" : "", d.fit.length ? `fitness: ${d.fit.map((f) => f.name).join(", ")}` : "", d.other.length ? `plan: ${d.other.map((p) => p.title || "Plan").join(", ")}` : ""].filter(Boolean).join(", ") || label[st];
          const mon = d.d === 1 && i > 0 ? new Date(`${d.date}T12:00`).toLocaleDateString("tr-TR", { month: "short" }).replace(".", "") : "";
          const tones = [...new Set(d.other.map(planTone))].slice(0, 2);
          const inner = (
            <>
              <small className={`text-[0.6875rem] font-medium capitalize ${mon ? "font-semibold text-acc" : d.state === "today" ? "font-semibold text-acc" : "text-mut"}`}>{mon || d.w}</small>
              <span className={`relative grid size-[2.125rem] place-items-center rounded-full text-[0.9375rem] font-semibold tabular-nums ${DAY[st]} ${d.state === "today" && !d.has && !fitOnly ? DAY.today : ""} ${d.state === "today" && fitOnly ? "ring-2" : ""}`}>
                {st === "done" ? <Icon name="check" className="size-4" /> : st === "miss" ? "!" : d.d}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {tones.map((t) => (
                  <span key={t} className={`tone-${t} tone-bar h-1.5 w-1.5 rounded-full`} />
                ))}
                {d.fit.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${d.fit.every((f) => f.st === "done") ? "bg-orange-500" : "bg-orange-400/70"}`} />}
              </span>
            </>
          );
          const cls = `flex w-[calc((min(100vw,30rem)-3.25rem)/7)] shrink-0 flex-col items-center gap-1 snap-start rounded-xl py-0.5`;
          return info.tap ? (
            <button key={d.date} type="button" data-press onClick={() => setPick(d)} aria-label={`${d.d} ${d.w}: ${what}`} className={cls}>
              {inner}
            </button>
          ) : (
            <span key={d.date} aria-hidden="true" className={cls} title={what}>
              {inner}
            </span>
          );
        })}
        <Link href="/calendar" className="ml-1 shrink-0 snap-end self-center rounded-full bg-accbg px-3.5 py-1.5 text-[0.8125rem] font-semibold text-acc">
          Tümü ›
        </Link>
      </div>
      <DayPick day={pick} att={att} today={today} onClose={() => setPick(null)} />
    </>
  );
}

// Günün penceresi: YELKEN (planlar, Yoklamayı aç; plan yoksa Antrenman ekle, yoklamasını al) ve FİTNESS (sporcu satırları;
// dokununca o sporcunun o günkü planı açılır).
const FIT_ST = { done: ["Yaptı", "bg-acc/12 text-acc"], missed: ["Yapmadı", "bg-rec/12 text-rec"], skip: ["Atladı", "bg-line text-mut"] };
export function DayPick({ day, att, today, onClose }) {
  const { saveDrafts } = useData();
  const { profile } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { openAdd } = useAdd();
  const [busy, setBusy] = useState(false);
  const info = day ? dayInfo(day, att, today) : { sail: [], fit: [], other: [] };
  const title = day ? new Date(`${day.date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }) : "";
  const head = "mb-1 text-[0.75rem] font-bold tracking-[.06em] text-mut";
  const go = (href) => {
    onClose();
    router.push(href);
  };
  // Yelken planı yok: "Antrenman" planı açılır, gün geldiyse yoklama sayfası açılır
  const addPlan = async () => {
    if (busy || !day) return;
    setBusy(true);
    const r = await saveDrafts([{ type: "plan", title: "Antrenman", cat: "Antrenman", date: day.date, time: "", place: "", assignees: [] }], { source: "manual", by: profile?.uid });
    setBusy(false);
    if (r?.error) return toast("Antrenman eklenemedi.");
    if (info.attHref) go(info.attHref);
    else {
      toast(r?.queued ? "Antrenman eklendi, bağlantı gelince gönderilecek." : "Antrenman eklendi.");
      onClose();
    }
  };
  return (
    <Sheet open={!!day} onClose={onClose} title={title}>
      {day && (
        <div className="flex flex-col gap-4 pb-1">
          {info.other.length > 0 && (
            <section>
              <h3 className={head}>PLANLAR</h3>
              <ul className="divide-y divide-line">
                {info.other.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { onClose(); openAdd({ edit: { kind: "plan", id: p.id } }); }} className="flex w-full items-center gap-3 py-2.5 text-left">
                      <span className="w-14 shrink-0 whitespace-nowrap text-[0.8125rem] font-semibold tabular-nums text-acc">{p.time || "Tüm gün"}</span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[0.9375rem] font-semibold">{p.title || "Plan"}</b>
                        {p.place ? <small className="block truncate text-[0.8125rem] text-mut">{p.place}</small> : null}
                      </span>
                      <Icon name="chev" className="size-4 shrink-0 text-mut" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {att || info.sail.length ? (
            <section className={day.state === "miss" ? "order-first" : ""}>
              <h3 className={head}>YELKEN</h3>
              <ul className="divide-y divide-line">
                {info.sail.map((p) => {
                  // Şeritteki ünlemin sebebi (Seyhun 2026-10-18: "tıklanınca sebebini göstersin"): günü geçmiş, günlüğü yazılmamış antrenman
                  const noLog = needsLog(p, today);
                  return (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${noLog ? "bg-warnbg text-[1.0625rem] font-bold text-warn" : "bg-acc/10 text-acc"}`}>
                      {noLog ? "!" : <Icon name="trend" className="size-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{p.title || "Antrenman"}</b>
                      <small className="block truncate text-[0.8125rem] text-mut">{[p.time || "Tüm gün", p.place].filter(Boolean).join(" · ")}</small>
                      {noLog && <small className="block truncate text-[0.8125rem] font-medium text-warn">Antrenman günlüğü yazılmadı</small>}
                    </span>
                    {noLog ? (
                      <button type="button" data-press onClick={() => { onClose(); openAdd({ edit: { kind: "plan", id: p.id } }); }} className="shrink-0 rounded-full bg-acc px-3 py-1.5 text-[0.8125rem] font-semibold text-white">
                        Günlük yaz
                      </button>
                    ) : info.attHref && (
                      <button type="button" data-press onClick={() => go(info.attHref)} className="shrink-0 rounded-full bg-acc px-3 py-1.5 text-[0.8125rem] font-semibold text-white">
                        Yoklama
                      </button>
                    )}
                  </li>
                  );
                })}
              </ul>
              {info.add && (
                <>
                  <button type="button" data-press disabled={busy} onClick={addPlan} className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-acc py-3 text-[0.9375rem] font-semibold text-white disabled:opacity-60">
                    <Icon name="plus" className="size-4" />
                    {busy ? "Ekleniyor…" : info.attHref ? "Antrenman ekle, yoklamasını al" : "Antrenman ekle"}
                  </button>
                  {info.attHref && (
                    <button type="button" onClick={() => go(info.attHref)} className="mt-2 block w-full text-center text-[0.8125rem] font-semibold text-acc">
                      Plan eklemeden yalnız yoklama al
                    </button>
                  )}
                </>
              )}
            </section>
          ) : null}
          {info.fit.length > 0 && (
            <section>
              <h3 className={head}>FİTNESS · {info.fit.length} kişi</h3>
              <ul className="divide-y divide-line">
                {info.fit.map((f) => (
                  <FitRow key={f.id || f.name} f={f} onOpen={f.plan?.id ? () => { onClose(); openAdd({ edit: { kind: "plan", id: f.plan.id } }); } : null} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
}

// Fitness satırı: baş harf, ad, antrenman, durum; dokununca o günkü plan açılır (Antrenmana başla orada)
function FitRow({ f, onOpen }) {
  const [t, c] = FIT_ST[f.st] || [f.plan?.time || "Bekliyor", "bg-bg text-mut"];
  const fit = f.plan?.fit || {};
  const ini = f.mine ? "Sen" : f.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toLocaleUpperCase("tr-TR");
  return (
    <li>
      <button type="button" onClick={onOpen || undefined} disabled={!onOpen} className="flex w-full items-center gap-3 py-2.5 text-left">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-orange-500/12 text-[0.8125rem] font-bold text-orange-700 dark:text-orange-300">{ini}</span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{f.mine ? "Senin antrenmanın" : f.name}</b>
          <small className="block truncate text-[0.8125rem] text-mut">{fit.name || f.plan?.title || "Antrenman"}</small>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${c}`}>{t}</span>
        <Icon name="chev" className="size-4 shrink-0 text-mut" />
      </button>
    </li>
  );
}
