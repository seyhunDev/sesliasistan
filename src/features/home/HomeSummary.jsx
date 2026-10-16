"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { dayInfo, clubDues, clubFis, clubRace, duesLive, homeNotes, postsTile, readSum, saveSum } from "@/lib/homeTiles";
import { rel, todayStr } from "@/lib/utils/format";
import { useAdd } from "@/features/add/AddProvider";
import { useMoney } from "./TeamMoney";
import { CALM, SectionHead } from "./ui";
import { useOpenInvoices } from "@/features/invoices/openInvoices";
import { invoiceTile } from "@/lib/invoices";

// Ana sayfa › Kulüp / Özet (Seyhun 2026-10-16: "çok yer kaplıyor, toparlayalım"): tek sakin kart. Üstte Sıradaki yarış iki satır (ad + kalan gün;
// tarih · yer · sp. · eksik iş), altında iki sütun küçük kutular: Aidat · ay (ödeyen/sayı, %), Hesap, Fiş / Fatura, Instagram; tek kalan kutu tam genişlik.
// Yalnız bilgisi olan kutu görünür (clubDues, clubFis… homeTiles.js).
// Notlar ayrı bölüm: en çok 3 not (homeNotes), başlık ve altında "Sabit / tarih · ilk satır". Bellekteki notlardan, ek okuma yok.
// Aidat özeti açılışta okunur (2 okuma, duesLive); gönderi özeti o sayfa açılınca bu cihazda saklanır; banka mailleri useMoney; yarış raceHome.js.
// Okuması süren kutunun yerinde yanıp sönen iskelet (Tile skel, SkelRace); önbellekte bilgi varsa (aidat, gönderi, banka, aynı günün yarış ve faturası) hiç çıkmaz.
const WAIT = 8000;
export function HomeSummary({ title = "ÖZET", money, race, dues, posts, invoices, notes }) {
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
  const note = homeNotes(notes || [], 3);
  const anyWait = ["race", "dues", "inv", "bank"].some(skel);
  const club = raceCard || duesT || fisT || bankT || post || anyWait;
  if (!club && !note.total) return null;
  const mon = new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "short" }).replace(".", "");
  const show = (k) => (fade.has(k) ? "fade-in" : "");
  // Yarışın altındaki küçük kutular (iki sütun): yalnız bilgisi olan ya da okuması süren
  const tiles = [
    skel("dues")
      ? { key: "dues", skel: true }
      : duesT && { key: "dues", href: "/dues", k: `Aidat · ${mon}`, cls: show("dues"), v: duesT.big, sm: `%${Math.round((duesT.bar || 0) * 100)}`, note: duesT.warn ? duesT.sub : "", nw: true },
    skel("bank") ? { key: "bank", skel: true } : bankT && { key: "bank", href: "/mail", k: "Hesap", cls: show("bank"), v: bankT.big },
    skel("inv")
      ? { key: "inv", skel: true }
      : fisT && { key: "inv", href: "/receipts", k: "Fiş / Fatura", cls: show("inv"), v: fisT.big, warn: fisT.warn, note: fisT.sub || "", nw: fisT.warn },
    post && { key: "post", href: post.last?.id ? `/posts/${post.last.id}` : "/posts", k: "Instagram", v: postsTile(post).big, note: postsTile(post).sub },
  ].filter(Boolean);

  return (
    <>
      {club && (
        <section aria-labelledby="home-sum" aria-busy={busy}>
          <SectionHead id="home-sum" title={title}>
            {raceCard && (
              <Link href="/athletes/races" className="text-acc">
                Yarışlar ›
              </Link>
            )}
          </SectionHead>
          <div className={`overflow-hidden ${CALM}`}>
            {skel("race") ? <SkelRace /> : raceCard && <RaceRow r={raceCard} cls={show("race")} />}
            {tiles.length > 0 && (
              <ul className={`grid grid-cols-2 gap-px bg-line ${raceCard || skel("race") ? "border-t border-line" : ""}`}>
                {tiles.map((t, i) => (
                  <Tile key={t.key} {...t} wide={i === tiles.length - 1 && tiles.length % 2 === 1} />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
      {note.total > 0 && <NotesList list={note.list} total={note.total} />}
    </>
  );
}

// Küçük kutu: üstte ad, altında değer (ve küçük ek), en altta tek satır not; tek kalan kutu iki sütunu kaplar
function Tile({ href, k, v, sm, note, nw, warn, cls = "", skel, wide }) {
  const span = wide ? "col-span-2" : "";
  if (skel)
    return (
      <li aria-hidden="true" className={`bg-card px-3.5 py-2.5 ${span}`}>
        <span className="shimmer block h-3 w-16 rounded-full" />
        <span className="shimmer mt-2 block h-4 w-20 rounded-full" />
      </li>
    );
  return (
    <li className={`bg-card ${span} ${cls}`}>
      <Link href={href} className="block px-3.5 py-2.5">
        <small className="block truncate text-[0.75rem] text-mut">{k}</small>
        <b className={`block truncate font-medium tabular-nums ${warn ? "text-warn" : ""}`}>
          {v}
          {sm && <small className="ml-1 font-normal text-mut">{sm}</small>}
        </b>
        {note && <small className={`block truncate text-[0.75rem] ${nw ? "text-warn" : "text-mut"}`}>{note}</small>}
      </Link>
    </li>
  );
}

// Sıradaki yarış, iki satır: ad ve kalan gün hapı; altında "tarih · yer · 6 sp. · 2 iş eksik". Dokununca yarışın sayfası
function RaceRow({ r, cls }) {
  const sub = (r.sub || "").replace(/(\d+) sporcu\b/, "$1 sp.");
  return (
    <Link href={r.id ? `/athletes/races/${r.id}` : "/athletes/races"} className={`flex items-center gap-3 px-3.5 py-2.5 ${cls}`}>
      <span className="min-w-0 flex-1">
        <b className="block truncate font-medium">{r.title}</b>
        <small className="block truncate text-[0.8125rem] text-mut">
          {sub}
          {r.left > 0 && <span className="text-warn">{sub ? " · " : ""}{r.left} iş eksik</span>}
        </small>
      </span>
      <span className="shrink-0 rounded-full bg-accbg px-2 py-0.5 text-[0.8125rem] font-medium text-acc">{r.days != null ? `${r.days} gün` : r.when}</span>
    </Link>
  );
}

function SkelRace() {
  return (
    <div aria-hidden="true" className="px-3.5 py-3">
      <span className="shimmer block h-4 w-44 max-w-full rounded-full" />
      <span className="shimmer mt-2 block h-3 w-32 rounded-full" />
    </div>
  );
}

// Notlar: başlık + Tümü + ekle; her not başlığı ve altında "Sabit / tarih · ilk satır"
function NotesList({ list, total }) {
  const { openAdd } = useAdd();
  return (
    <section aria-labelledby="home-notes">
      <SectionHead id="home-notes" title="Notlar" count={total}>
        <Link href="/notes" className="text-acc">
          Tümü ›
        </Link>
        <button type="button" data-press aria-label="Not ekle" onClick={() => openAdd({ type: "note" })} className="raised grid size-7 place-items-center rounded-full text-acc">
          <Icon name="plus" className="size-4" />
        </button>
      </SectionHead>
      <ul className={`divide-y divide-line px-3.5 py-0.5 ${CALM}`}>
        {list.map((n) => {
          const when = n.pinned ? "Sabit" : n.createdAt ? rel((n.updatedAt || n.createdAt).slice(0, 10)) : "";
          const first = String(n.body && n.body !== n.title ? n.body : "").split("\n").find((x) => x.trim()) || "";
          const line = [when, first.trim()].filter(Boolean).join(" · ");
          return (
            <li key={n.id}>
              <button type="button" onClick={() => openAdd({ edit: { kind: "note", id: n.id } })} className="block w-full py-2.5 text-left">
                <b className="block truncate font-medium">{n.title || "Not"}</b>
                {line && <small className="block truncate text-[0.875rem] text-mut">{line}</small>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// Okuma sürerken satırın yerinde yanıp sönen çizgiler (.shimmer globals.css)
// Ana sayfanın en üstündeki hafta şeridi (başlıksız; Seyhun: "isim bile koymaya gerek yok"): bu haftanın 7 günü, günlüğü yazılan ✓, yazılmayan !, bugün koyu.
// Güne dokununca alttan pencere açılır (Seyhun: "fitness sayfasına gitmeye gerek yok, alttan bir yer açılsın"): o günün yelken
// antrenmanı (yoklama), yelken planı yoksa "Antrenman ekle, yoklamasını al", fitness yapan sporcular (dokununca hareketleri). dayInfo, homeTiles.js.
// Fitness olan günün altında turuncu, başka planı olan günün altında yeşil nokta (pencerede PLANLAR). Sırada kartının (SiradaCard.jsx) içinde çizilir.
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
      <div className="grid grid-cols-7 gap-1 px-2.5 pb-3 pt-1">
        {w.days.map((d) => {
          const fitOnly = !d.has && d.fit.length > 0;
          const st = fitOnly ? "fit" : d.state === "today" && !d.has ? "none" : d.state;
          const info = dayInfo(d, att, today);
          const what = [d.has ? "yelken" : "", d.fit.length ? `fitness: ${d.fit.map((f) => f.name).join(", ")}` : "", d.other.length ? `plan: ${d.other.map((p) => p.title || "Plan").join(", ")}` : ""].filter(Boolean).join(", ") || label[st];
          const inner = (
            <>
              <small className={`text-[0.6875rem] ${d.state === "today" ? "font-semibold text-fg" : "text-mut"}`}>{d.w}</small>
              <span className={`relative grid size-8 place-items-center rounded-full text-[0.8125rem] font-semibold tabular-nums ${DAY[st]} ${d.state === "today" && !d.has && !fitOnly ? "bg-acc text-white" : ""} ${d.state === "today" && fitOnly ? "ring-2" : ""}`}>
                {st === "done" ? <Icon name="check" className="size-4" /> : st === "miss" ? "!" : d.d}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {d.other.length > 0 && <span className="h-1.5 w-1.5 rounded-full bg-acc" />}
                {d.fit.length > 0 && <span className={`h-1.5 w-1.5 rounded-full ${d.fit.every((f) => f.st === "done") ? "bg-orange-500" : "bg-orange-400/70"}`} />}
              </span>
            </>
          );
          const cls = "flex flex-col items-center gap-1 rounded-xl py-0.5";
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
        <div className="space-y-4 pb-1">
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
            <section>
              <h3 className={head}>YELKEN</h3>
              <ul className="divide-y divide-line">
                {info.sail.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
                      <Icon name="trend" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{p.title || "Antrenman"}</b>
                      <small className="block truncate text-[0.8125rem] text-mut">{[p.time || "Tüm gün", p.place].filter(Boolean).join(" · ")}</small>
                    </span>
                    {info.attHref && (
                      <button type="button" data-press onClick={() => go(info.attHref)} className="shrink-0 rounded-full bg-acc px-3 py-1.5 text-[0.8125rem] font-semibold text-white">
                        Yoklama
                      </button>
                    )}
                  </li>
                ))}
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
