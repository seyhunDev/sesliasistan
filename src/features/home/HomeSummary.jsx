"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { clubDues, clubFis, clubRace, duesLive, postsTile, readSum, saveSum } from "@/lib/homeTiles";
import { todayStr } from "@/lib/utils/format";
import { useMoney } from "./TeamMoney";
import { FadeImg } from "@/components/ui/FadeImg";
import { NotesWidget, WHead, WIDGET, useMessagesRow } from "./HomeWidgets";
import { ListHead, Row, RowList, SkelRow } from "@/components/ui/Row";
import { Bar } from "@/components/ui/Gauge";
import { useOpenInvoices } from "@/features/invoices/openInvoices";
import { invoiceTile } from "@/lib/invoices";

// Ana sayfa › Kulüp / Özet (2026-10-21 kokpit tasarımı "C"; önceki ızgara 2026-10-17): tek listede satırlar (Row): Aidat, Hesap, Fiş / Fatura,
// Mesajlar (tail={false} ile kapanır); altında Instagram (son üç gönderi). lead: listenin başına eklenecek satırlar.
// Yalnız bilgisi olan alan görünür (clubDues, clubFis… homeTiles.js). Alanlar yalnız ilgili sayfayı açar.
// Aidat özeti açılışta okunur (2 okuma, duesLive); gönderi özeti o sayfa açılınca bu cihazda saklanır; banka mailleri useMoney; yarış raceHome.js.
// Okuması süren alanın yerinde yanıp sönen iskelet satırı (SkelRow); önbellekte bilgi varsa (aidat, gönderi, banka, aynı günün yarış ve faturası) hiç çıkmaz.
const WAIT = 8000;
export function HomeSummary({ title = "ÖZET", money, race, dues, posts, invoices, notes, lead, tail }) {
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
  // Kulüp listesi (2026-10-21 kokpit tasarımı): her bilgi bir satır, aynı biçimde (Row): Aidat (oran çubuğu + 18/30), Hesap (kasa, altında banka),
  // Fiş / Fatura, Mesajlar. Okuması süren satırın yerinde iskelet (SkelRow). Sıradaki yarış verilirse eski tam genişlik kartı listenin üstünde.
  const msg = useMessagesRow();
  const rows = [
    skel("dues") ? <SkelRow key="dues" /> : duesT && <DuesRow key="dues" t={duesT} mon={mon} />,
    skel("bank") ? <SkelRow key="bank" /> : bankT && <Row key="bank" href="/mail" title="Hesap" sub={[bankT.label, bankT.sub].filter(Boolean).join(" · ")} right={bankT.big} />,
    skel("inv") ? <SkelRow key="inv" /> : fisT && <FisRow key="inv" t={fisT} spend={invoices && inv && money ? m.receipts : null} />,
    tail !== false && msg,
  ].filter(Boolean);

  return (
    <>
      {skel("race") ? null : raceCard && <RaceWidget r={raceCard} cls={show("race")} />}
      {(rows.length > 0 || lead) && (
        <section aria-labelledby="home-sum" aria-busy={busy}>
          <ListHead id="home-sum" title={title} />
          <RowList>
            {lead}
            {rows}
          </RowList>
        </section>
      )}
      {notes && <NotesWidget notes={notes} />}
      {post && <PostsWidget post={post} />}
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

// Aidat satırı: bu ayın aidatı (ödeyen/toplam, oran çubuğu; altında ödemeyen ya da onay bekleyen). Dokununca Aidatlar
function DuesRow({ t, mon }) {
  const [paid, count] = t.big.split("/");
  return (
    <Row
      href="/dues"
      title={`Aidat · ${mon}`}
      sub={t.sub}
      warn={t.warn}
      right={
        <span className="flex items-center gap-2.5">
          <Bar p={t.bar} />
          <span>
            {paid}
            <span className="font-medium text-mut">/{count}</span>
          </span>
        </span>
      }
    />
  );
}

// Fiş / Fatura satırı: ödenmemiş fatura sayısı ve tutarı, yoksa ayın fiş harcaması; altında ayın harcaması. Dokununca Fiş / Fatura
function FisRow({ t, spend }) {
  return <Row href="/receipts" title="Fiş / Fatura" sub={[t.sub, spend && `${spend.sub}: ${spend.big}`].filter(Boolean).join(" · ")} warn={t.warn} right={t.big} />;
}

// Tam genişlik: Instagram (gönderi sayısı, sonuncusu ne zaman; son üç gönderinin görseli, dokununca o gönderi). Görsel yoksa yalnız yazı
function PostsWidget({ post }) {
  const t = postsTile(post);
  const recent = (post.recent?.length ? post.recent : post.last ? [post.last] : []).filter((x) => x?.id && x.thumb).slice(0, 3);
  return (
    <section aria-label="Instagram">
      <ListHead title="Instagram" count={t.big} href="/posts" />
      {recent.length > 0 ? (
        <span className="grid grid-cols-3 gap-2">
          {recent.map((x) => (
            <Link key={x.id} href={`/posts/${x.id}`} aria-label="Gönderiyi aç" className="relative block aspect-[4/5] overflow-hidden rounded-[0.875rem] bg-line">
              <FadeImg src={x.thumb} className="size-full object-cover" />
            </Link>
          ))}
        </span>
      ) : (
        <RowList>
          <Row href="/posts" title="Gönderiler" sub={t.sub} />
        </RowList>
      )}
    </section>
  );
}
