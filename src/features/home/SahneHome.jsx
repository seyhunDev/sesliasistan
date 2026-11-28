"use client";

import "./sporcu.css";
import "./pano.css";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useHesap } from "@/features/auth/useHesap";
import { isVeloraAdmin } from "@/lib/hesapGorunum";
import { useData } from "@/features/data/DataProvider";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { useRaceHome } from "@/features/athletes/raceHome";
import { useOpenInvoices } from "@/features/invoices/openInvoices";
import { liveHead } from "@/features/liveScreen/fonts";
import { useWeather } from "@/features/weather/useWeather";
import { dayHours, dirDeg, nowOf, windName } from "@/features/weather/weather";
import { SkyIcon, WindArrow, WindChart, rainText, useObsRows } from "@/features/weather/WxPanel";
import { useNow } from "@/hooks/useNow";
import { invoiceTile } from "@/lib/invoices";
import { isFit } from "@/lib/fitness/model";
import { canReceipts } from "@/lib/kinds";
import { attHref, clubDues, dayPlans, dayWeather, duesLive, fitDays, fitWeek, lastTraining, liveRace, planTone, readSum, saveSum } from "@/lib/homeTiles";
import { isTraining } from "@/lib/trainingLog";
import { todayStr } from "@/lib/utils/format";
import { InboxSheet, useInbox } from "./Inbox";
import { RaceLive } from "./RaceLive";
import { loadAthletes } from "@/features/athletes/data";
import { useMoney } from "./TeamMoney";
import { FitWide, useTodayFit } from "./SporcuHome";
import { ADDS, BIG, SahneTop, SporcuAdd, SporcuMenu } from "./SporcuMenu";
import { Vitrin } from "./Vitrin";
import { useAdd } from "@/features/add/AddProvider";

// ANA HESAP ve NORMAL KULLANICI ana sayfası · "Sahne" (Seyhun 2026-11-25 "benim ana sayfamı da normal kullanıcınınkini de bu sporcu gibi yapalım,
// selamlama olmasın"; örnek velora-tarama/ana-normal-sahne.html). Sporcu sayfasıyla aynı koyu dil (sporcu.css), aynı üst çubuk, menü ve + Ekle.
// Üstte Hava (dev rüzgâr, limon ölçülen, beyaz kesik tahmin, 3 saatlik aralıklar, yağış satırı), küçük gün şeridi, seçili günün planları.
// Ana hesapta altında Kulüp kokpiti (yarış, yoklama, fitness, aidat, hesaplar, Tekne ekranı, Velora Sailing) ve Bekleyen;
// normal kullanıcıda antrenörse Yönet kartı, fitness yatay kart, Bekleyen. Asistan küresi alt çubukta / sol menüde, olduğu gibi.
// YÖNETİM PANELİ (Seyhun 2026-11-28, örnek yonetim-paneli/ornek.html): main.sh.pro (pano.css) lacivert + tek mavi vurgu, üstte özet kutuları (Ozet),
// Velora Sailing ve Yönet görselli vitrin kartı (Vitrin.jsx; kulüp kutularından çıktı). Sporcu sayfası değişmedi.
// Telefon tek sütun; dik iPad'de hava tam genişlik, altında iki sütun; yatay iPad'de solda hava, günler, planlar, sağda kulüp (sporcu.css .sh-g3).
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hOf = (t) => (t && /^\d{1,2}:\d{2}/.test(t) ? +t.split(":")[0] + +t.split(":")[1].slice(0, 2) / 60 : null);

// Ana hesabın büyük kutuları (menü) ve + Ekle seçenekleri; normal kullanıcınınki aşağıda
const OWNER_BIG = (athletes) => [
  BIG[0],
  athletes ? { href: "/athletes", label: "Sporcular", sub: "Liste · yoklama · yarış", cls: "shm-blue" } : BIG[2],
  { ...BIG[1], sub: "Sporcuların programı" },
  BIG[3],
];
const NORMAL_BIG = (coach) => [coach ? { href: "/bilgi/yonet", label: "Yönet", sub: "Sporcularım", cls: "shm-blue" } : BIG[0], BIG[1], BIG[2], BIG[3]];
const addsFor = (kind) => [...ADDS.slice(0, 3), canReceipts(kind) ? { href: "/receipts", label: "Fiş", sub: "Fiş · fatura", icon: "receipt", cls: "shm-a-blue" } : ADDS[3]];

// Ortak çerçeve: koyu sahne, üst çubuk, menü, + Ekle, zil penceresi; children(inbox, onInbox)
function SahneFrame({ big, children }) {
  const h = useHesap();
  const inbox = useInbox();
  const setSheet = inbox.setOpen;
  const [menu, setMenu] = useState(false);
  const [add, setAdd] = useState(false);
  // Gidecek sayfası olmayan bildirime dokununca (/?bildirim=1) zil penceresi açılır, bildirimin tam metni orada
  useEffect(() => {
    if (!/[?&]bildirim=1/.test(window.location.search)) return;
    setSheet(true);
    window.history.replaceState(null, "", "/");
  }, [setSheet]);
  useEffect(() => {
    document.body.classList.add("sh-body", "sh-pro");
    return () => document.body.classList.remove("sh-body", "sh-pro");
  }, []);
  const onInbox = () => setSheet(true);
  return (
    <>
      <main data-theme="dark" className={`sh pro ${liveHead.variable}`} data-home-sahne>
        <SahneTop inbox={inbox} onInbox={onInbox} onMenu={() => setMenu(true)} onAdd={() => setAdd(true)} />
        {children(inbox, onInbox)}
      </main>
      <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
      <SporcuMenu open={menu} onClose={() => setMenu(false)} big={big} />
      <SporcuAdd open={add} onClose={() => setAdd(false)} adds={addsFor(h.kind)} />
    </>
  );
}

// Üç alan: a hava, b günler ve planlar, c hesaba göre kartlar
// iPad düzeni (Seyhun 2026-11-25 "yap", örnek velora-tarama/ana-ipad-duzen.html): telefonda hava, günler, planlar, sağ sütun, Bekleyen;
// dik iPad'de hava ve 7 gün tam genişlik, altında solda planlar + Bekleyen, sağda kartlar; yatayda solda hava, günler, planlar, sağda kartlar + Bekleyen.
// Bekleyen iki yerde çizilir, ekran genişliğine göre biri görünür (sporcu.css .sh-wl / .sh-wr).
function Layout({ side, inbox, onInbox, vitrin }) {
  const now = useNow(30000);
  const today = todayStr();
  const [sel, setSel] = useState(today);
  const days = useMemo(() => {
    const base = new Date(`${today}T12:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return ymd(d);
    });
  }, [today]);
  const date = days.includes(sel) ? sel : today;
  const nowH = now.getHours() + now.getMinutes() / 60;
  return (
    <div className="sh-g3">
      <div className="sh-o">
        <Ozet today={today} inbox={inbox} />
      </div>
      <div className="sh-f">{vitrin}</div>
      <div className="sh-a">
        <SahneHava date={date} today={today} nowH={nowH} />
      </div>
      <div className="sh-d">
        <Days days={days} date={date} today={today} onSel={setSel} />
      </div>
      <div className="sh-b">
        <BugunHead date={date} today={today} />
        <Plans date={date} nowH={date === today ? nowH : null} />
        <div className="sh-wl">
          <Waiting inbox={inbox} onAll={onInbox} />
        </div>
      </div>
      <div className="sh-c3">
        {side}
        <div className="sh-wr">
          <Waiting inbox={inbox} onAll={onInbox} />
        </div>
      </div>
    </div>
  );
}

// ÖZET (yönetim paneli, Seyhun 2026-11-28 örnek yonetim-paneli/ornek.html): bugünkü plan sayısı, bekleyen iş, sıradaki yarışa kalan gün.
// Telefonda yalnız ana hesapta ilk ikisi (pano.css); bilgisi olmayan kutu çizilmez (yarış yalnız sporcusu olan hesapta).
function Ozet({ today, inbox }) {
  const { plans } = useData();
  const h = useHesap();
  const race = useRaceHome();
  const n = dayPlans(plans, today).length;
  const wait = inbox.list?.length || 0;
  const r = h.athletes ? (race.open || []).filter((x) => x?.startDate && (x.endDate || x.startDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0] : null;
  const left = r ? Math.max(0, Math.round((Date.parse(`${r.startDate}T12:00`) - Date.parse(`${today}T12:00`)) / 864e5)) : null;
  return (
    <div className={`sh-oz ${h.owner ? "sh-oz-own" : ""}`}>
      <span className="sh-ozk">
        <small>Bugün</small>
        <b className="num">
          {n} <em>plan</em>
        </b>
      </span>
      {r && (
        <Link href={`/athletes/races/${r.id}`} className="sh-ozk sh-ozk-on">
          <small>Yaklaşan yarış</small>
          <b className="num">{left === 0 ? "Bugün" : <>{left} <em>gün</em></>}</b>
        </Link>
      )}
      <span className="sh-ozk">
        <small>Bekleyen</small>
        <b className="num">
          {wait} <em>iş</em>
        </b>
      </span>
    </div>
  );
}

// iPad "Bugün" kartının başlığı (telefonda gizli): seçili gün ve plan sayısı
function BugunHead({ date, today }) {
  const { plans } = useData();
  const n = dayPlans(plans, date).length;
  const day = date === today ? "Bugün" : new Date(`${date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long" });
  return (
    <span className="sh-bh">
      {day.toLocaleUpperCase("tr-TR")}
      <span className="flex-1" />
      {n > 0 && <em className="num">{n} PLAN</em>}
    </span>
  );
}

// HAVA (Sahne): üstte ölçülen ya da tahmin rüzgâr dev rakamla, ok, adı ve derece, sağanak; sağda sıcaklık ve gün aralığı.
// Altında ortak rüzgâr eğrisi (WindChart; renkleri sporcu.css .sh-wxp: ölçülen limon, tahmin beyaz kesik) ve 3 saatlik aralıklar; en altta tek satır yağış.
// Dokununca Hava sayfası.
function SahneHava({ date, today, nowH }) {
  const { w, err, refresh } = useWeather();
  const router = useRouter();
  const isToday = date === today;
  const rows = dayHours(w, date);
  const n = nowOf(w);
  const dw = dayWeather(w, rows, date);
  const nowObs = useObsRows(today, today);
  const day = useObsRows(date, today);
  const last = nowObs.rows.at(-1);
  const real = last && new Date().getHours() - +last.hh <= 2 ? last : null;
  const cur = n && (real ? { ...n, wind: Math.round(real.wind), gust: real.gust != null ? Math.round(real.gust) : n.gust, dir: real.dir ?? n.dir } : n);
  const rain = rainText(rows, isToday ? nowH : -1, null);
  const open = () => (w ? router.push("/weather") : refresh(true));
  const dname = isToday ? "" : new Date(`${date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric" });
  return (
    <section className="sh-wxp" aria-label="Hava">
      <button type="button" onClick={open} className="sh-wx-now" aria-label="Hava ayrıntısı">
        {cur ? (
          <>
            <span className="sh-wx-live">
              {real ? <i /> : null}
              {real ? `ÖLÇÜLEN ${real.hh}:00` : "TAHMİN"}
              {dname ? ` · ${dname}` : ""}
            </span>
            <span className="sh-wx-row">
              <WindArrow dir={cur.dir} size={34} color="var(--sh-lime)" className="sh-wx-ar" />
              <b className="sh-c sh-wx-big">
                {Math.round(cur.wind ?? 0)}
                <small>KN</small>
              </b>
              <span className="sh-wx-info">
                <b>
                  {windName(cur.dir)?.[0] || ""} {dirDeg(cur.dir)}
                </b>
                <span>sağanak {Math.round(cur.gust ?? cur.wind ?? 0)}</span>
              </span>
              <span className="sh-wx-t">
                <b className="num">{cur.t}°</b>
                <small className="num">
                  <SkyIcon code={cur.code} day={cur.day} size="size-4" />
                  {dw ? `${dw.min}° / ${dw.max}°` : ""}
                </small>
              </span>
            </span>
          </>
        ) : (
          <span className="sh-wx-wait">{err ? "Hava alınamadı · dokun, yenile" : "Hava yükleniyor…"}</span>
        )}
      </button>
      <WindChart rows={rows} nowH={isToday ? nowH : null} onOpen={open} obs={day.rows} />
      {rain && <p className="sh-wx-rain">Yağış · {rain}</p>}
    </section>
  );
}

// Gün şeridi: 7 gün (telefonda yana kayar), gün adı, tarih, gündüzün rüzgârı dört çubukta, en düşük–en yüksek kn. Dokununca hava ve planlar o güne geçer.
function Days({ days, date, today, onSel }) {
  const { w } = useWeather();
  return (
    <div className="sh-days" role="tablist" aria-label="Günler">
      {days.map((d) => {
        const rows = (dayHours(w, d) || []).filter((r) => r.hh >= "06" && r.hh <= "21");
        const ws = rows.map((r) => r.wind ?? 0);
        const bars = [6, 10, 14, 18].map((h) => Math.max(0, ...rows.filter((r) => +r.hh >= h && +r.hh < h + 4).map((r) => r.wind ?? 0)));
        const top = Math.max(15, ...bars);
        const x = new Date(`${d}T12:00`);
        return (
          <button key={d} type="button" role="tab" aria-selected={d === date} data-press onClick={() => onSel(d)} className={`sh-day ${d === date ? "sh-day-on" : ""}`}>
            {d === today ? "BUGÜN" : x.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "").toLocaleUpperCase("tr-TR")}
            <b>{x.getDate()}</b>
            {rows.length > 0 && (
              <span className="sh-day-w" aria-hidden="true">
                {bars.map((v, i) => (
                  <i key={i} style={{ height: `${Math.max(12, (v / top) * 100)}%` }} />
                ))}
              </span>
            )}
            <span className="num">{ws.length ? `${Math.round(Math.min(...ws))}–${Math.round(Math.max(...ws))} kn` : "—"}</span>
          </button>
        );
      })}
    </div>
  );
}

// Seçili günün planları: saat, tür rengi, başlık, yer ya da kişi sayısı; şu an süren plan limon zeminli. Dokununca plan açılır.
// Ana hesapta fitness planı Fitness sayfasında o günün sporcularıyla açılır (Seyhun 2026-11-25 "fitness'a basınca benim fitness'ıma gidiyor, yanlış;
// benimkine de fitness sayfasına gitmeli"); diğer hesaplarda plan kendisi açılır.
function Plans({ date, nowH }) {
  const { plans } = useData();
  const { open: openPlan } = usePlanOpen();
  const { openAdd } = useAdd();
  const { owner } = useHesap();
  const router = useRouter();
  const open = (p) => (owner && isFit(p) ? router.push(`/fitness?sporcular=1&gun=${date}`) : openPlan(p));
  const list = dayPlans(plans, date);
  const end = (p) => Math.max(hOf(p.endTime) ?? hOf(p.time) + (p.durationMin ? p.durationMin / 60 : isTraining(p) ? 2 : 1), hOf(p.time) + 0.5);
  const live = (p) => nowH != null && hOf(p.time) != null && nowH >= hOf(p.time) && nowH < end(p);
  if (!list.length)
    return (
      <p className="sh-noplan">
        Plan yok
        <button type="button" data-press onClick={() => openAdd({ type: "plan" })} className="sh-noplan-add">
          + Plan
        </button>
      </p>
    );
  return (
    <div className="sh-plans">
      {list.map((p) => {
        const n = p.people?.length || 0;
        return (
          <button key={p.id} type="button" data-press onClick={() => open(p)} className={`sh-pl tone-${planTone(p)} ${live(p) ? "sh-pl-now" : ""}`}>
            <span className="num sh-pl-t">{p.time ? p.time.slice(0, 5) : "Gün boyu"}</span>
            <i />
            <b>{p.title || "Plan"}</b>
            <small>{p.place || (n > 1 ? `${n} kişi` : "")}</small>
          </button>
        );
      })}
    </div>
  );
}

// Sporcu ana sayfasında iPad'de (dik ve yatay) Hava kutusu grafiğiyle ve 7 gün (Seyhun 2026-11-27): ortak SahneHava + Days, ana sayfadakiyle aynı.
// Telefonda gizli (sporcu.css .sh-ipwx): orada selamın altındaki tek satır hava, dokununca Hava sayfası.
export function SporcuHava() {
  const now = useNow(30000);
  const today = todayStr();
  const [sel, setSel] = useState(today);
  const days = useMemo(() => {
    const base = new Date(`${today}T12:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return ymd(d);
    });
  }, [today]);
  const date = days.includes(sel) ? sel : today;
  const nowH = now.getHours() + now.getMinutes() / 60;
  return (
    <div className="sh-ipwx">
      <SahneHava date={date} today={today} nowH={date === today ? nowH : null} />
      <Days days={days} date={date} today={today} onSel={setSel} />
    </div>
  );
}

// ─── ANA HESAP ───
export function OwnerSahne() {
  const h = useHesap();
  return (
    <SahneFrame big={OWNER_BIG(h.athletes)}>
      {(inbox, onInbox) => (
        <Layout inbox={inbox} onInbox={onInbox} side={<Kokpit />} vitrin={<Vitrin yonet={h.owner || h.coach} profile={h.profile} />} />
      )}
    </SahneFrame>
  );
}

// Kulüp kokpiti: süren yarış (canlı satır) ya da sıradaki yarışın geri sayımı; kutular: yoklama, fitness bu hafta, aidat, hesaplar.
// Bilgisi olmayan kutu çizilmez; hiç kutu yoksa KULÜP başlığı da görünmez (pano.css). Yönet ve Velora Sailing üstte vitrin kartı (Vitrin.jsx, 2026-11-28).
function Kokpit() {
  const h = useHesap();
  const { plans, members, fitOthers } = useData();
  const race = useRaceHome();
  const today = todayStr();
  const fit = useMemo(() => fitDays(plans, fitOthers || [], members, h.profile?.uid), [plans, fitOthers, members, h.profile?.uid]);
  const fw = fitWeek(fit, today);
  const sport = !!h.athletes;
  const live = sport && liveRace(race.open, today);
  return (
    <>
      <span className="sh-sec">KULÜP</span>
      <div className="sh-tiles">
        {sport && <div className="sh-span">{live ? <div className="sh-rl">{<RaceLive open={race.open} />}</div> : <NextRace open={race.open} today={today} />}</div>}
        {sport && <AttTile today={today} />}
        {fw.n > 0 && (
          <Link href={`/fitness?sporcular=1&gun=${today}`} data-press className="sh-tile">
            <span className="sh-k">Fitness · bu hafta</span>
            <b className="sh-c sh-kn">
              {fw.done}/{fw.n}
            </b>
            <span className="sh-bar">
              <i style={{ width: `${Math.round((fw.done / fw.n) * 100)}%` }} />
            </span>
          </Link>
        )}
        {sport && <DuesTile />}
        {isVeloraAdmin(h.profile?.email) && <MoneyTile />}
      </div>
    </>
  );
}

// Sıradaki yarış: kaç gün kaldı büyük, adı, tarih · yer · sporcu sayısı; dokununca yarışın sayfası
const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
function NextRace({ open, today }) {
  const r = (open || []).filter((x) => x?.startDate && (x.endDate || x.startDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  if (!r) return null;
  const n = Math.round((Date.parse(`${r.startDate}T12:00`) - Date.parse(`${today}T12:00`)) / 864e5);
  const a = new Date(`${r.startDate}T12:00`);
  const b = new Date(`${r.endDate || r.startDate}T12:00`);
  const dates = r.endDate && r.endDate !== r.startDate ? (a.getMonth() === b.getMonth() ? `${a.getDate()}–${DAY.format(b)}` : `${DAY.format(a)} – ${DAY.format(b)}`) : DAY.format(a);
  return (
    <Link href={`/athletes/races/${r.id}`} data-press className="sh-race">
      <span className="sh-c sh-race-n">
        {n <= 0 ? "BUGÜN" : n}
        {n > 0 && <small>GÜN KALDI</small>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="sh-k sh-lime">SIRADAKİ YARIŞ</span>
        <span className="sh-c sh-race-t">{r.name || "Yarış"}</span>
        <small>{[dates, r.place, r.count ? `${r.count} sporcu` : ""].filter(Boolean).join(" · ")}</small>
      </span>
    </Link>
  );
}

// Yoklama: bugün alındıysa gelen sayısı; bugün antrenman var ama alınmadıysa "—" ve saati; yoksa son yoklamalı gün
function AttTile({ today }) {
  const { plans } = useData();
  const train = useLastTraining(plans, today);
  const tr = dayPlans(plans, today).find(isTraining);
  const got = train?.date === today;
  if (!got && !tr && !train) return null;
  const href = got || tr ? attHref(today, today) : `/athletes/attendance?gun=${train.date}`;
  return (
    <Link href={href} data-press className="sh-tile">
      <span className="sh-k">{got || tr ? "Yoklama · bugün" : `Yoklama · ${train.when}`}</span>
      <b className="sh-c sh-kn">{got || !tr ? train.n : "—"}</b>
      <small className="sh-s">{got || !tr ? "kişi geldi" : tr.time ? `${tr.time.slice(0, 5)}'te alınacak` : "alınacak"}</small>
    </Link>
  );
}

// Aidat: bu ay ödemeyen sayısı (onay bekleyen varsa o); herkes ödediyse çizilmez. Açılışta bu ayın aidat kaydı okunur (2 okuma, HomeSummary gibi)
function DuesTile() {
  const orgId = useHesap().profile?.orgId;
  const today = todayStr();
  const ym = today.slice(0, 7);
  const [sum, setSum] = useState(() => readSum().dues || null);
  useEffect(() => {
    if (!orgId) return;
    let live = true;
    Promise.all([getDoc(doc(db, "orgs", orgId, "dues", "settings")), getDoc(doc(db, "orgs", orgId, "dues", ym))])
      .then(([c, m]) => {
        const next = duesLive(c.data(), m.data(), ym, readSum().dues);
        if (!live || !next) return;
        saveSum("dues", next);
        setSum(next);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [orgId, ym]);
  const t = clubDues(sum, ym);
  if (!t) return null;
  const left = Math.max(0, sum.count - sum.paidCount);
  const mon = new Date(`${ym}-15T12:00`).toLocaleDateString("tr-TR", { month: "long" });
  return (
    <Link href="/dues" data-press className="sh-tile">
      <span className="sh-k">Aidat · {mon}</span>
      <b className="sh-c sh-kn">{sum.pending > 0 ? sum.pending : left}</b>
      <small className="sh-s">{sum.pending > 0 ? "onay bekliyor" : "ödemedi"}</small>
    </Link>
  );
}

// Hesaplar: kasa (yoksa banka) ve açık fatura sayısı; banka/kasa bilgisi yoksa yalnız açık faturalar
function MoneyTile() {
  const m = useMoney();
  const orgId = useHesap().profile?.orgId;
  const list = useOpenInvoices(orgId, true);
  const inv = list ? invoiceTile(list, todayStr()) : null;
  const nInv = inv ? parseInt(inv.sub, 10) || 1 : 0;
  // Büyük rakam banka + nakit toplamı, altında nakit ayrıca (Seyhun 2026-11-25 "sadece nakit değil, banka artı nakit toplam; altta nakit ayrıca")
  if (m.bank) {
    const tl = (n) => `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(Math.round(n || 0))} ₺`;
    const total = (m.bank.bankTL || 0) + (m.bank.kasa || 0);
    return (
      <Link href="/mail" data-press className="sh-tile">
        <span className="sh-k">Hesaplar · toplam</span>
        <b className="sh-c sh-kn num">{tl(total)}</b>
        <small className="sh-s">
          Nakit {tl(m.bank.kasa)}
          {nInv > 0 && <span className={inv?.warn ? "sh-warn" : ""}> · {nInv} açık fatura</span>}
        </small>
      </Link>
    );
  }
  if (!inv) return null;
  return (
    <Link href="/receipts" data-press className="sh-tile">
      <span className="sh-k">Fatura</span>
      <b className="sh-c sh-kn">{nInv}</b>
      <small className={`sh-s ${inv.warn ? "sh-warn" : ""}`}>açık · {inv.big}</small>
    </Link>
  );
}

// ─── NORMAL KULLANICI ───
// Vitrin (2026-11-28): herkeste Velora Sailing, çalışanda Yönet (kendi alanı) görselli kart. Fitness varsa yatay kart, Bekleyen.
export function NormalSahne() {
  const h = useHesap();
  const fit = useTodayFit();
  return (
    <SahneFrame big={NORMAL_BIG(h.coach)}>
      {(inbox, onInbox) => (
        <Layout
          side={fit ? <FitWide fit={fit} /> : null}
          vitrin={<Vitrin yonet={h.coach} profile={h.profile} />}
          inbox={inbox}
          onInbox={onInbox}
        />
      )}
    </SahneFrame>
  );
}

// "Bekleyen" (zil penceresindeki "Senin için" listesinin ilk satırları; eski IpadHome.jsx'ten taşındı)
export function Waiting({ inbox, onAll }) {
  const list = inbox.list || [];
  if (!list.length) return null;
  return (
    <section className="iph-pn" aria-label="Bekleyen">
      <span className="iph-pt">
        Bekleyen<span className="flex-1" />
        <button type="button" onClick={onAll} className="num">
          {list.length}
        </button>
      </span>
      {list.slice(0, 4).map((x) => (
        <button key={x.id} type="button" data-press onClick={x.onOpen} className="iph-row">
          <span className="min-w-0 flex-1">
            <b className="block truncate">{x.title}</b>
            {x.sub && <small className="block truncate">{x.sub}</small>}
          </span>
          {x.time && <span className="shrink-0 text-[0.75rem] text-mut">{x.time}</span>}
        </button>
      ))}
    </section>
  );
}

// Son yoklamalı antrenman (Kulüp › Yoklama kutusu): kulüp verisinden (loadAthletes, oturumda 3 dk saklanır); son sonuç bu cihazda tutulur
export function useLastTraining(plans, today) {
  const [t, setT] = useState(() => readSum().train || null);
  useEffect(() => {
    let live = true;
    loadAthletes()
      .then(({ athletes }) => {
        if (!live) return;
        const next = lastTraining(athletes, plans, today);
        saveSum("train", next);
        setT(next);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [plans, today]);
  return t;
}
