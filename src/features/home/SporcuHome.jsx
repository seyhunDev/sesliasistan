"use client";

import "./sporcu.css";
import Link from "next/link";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useHesap } from "@/features/auth/useHesap";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { monthOf, useMyAttendance } from "@/features/athletes/myAttendance";
import { daysTo, upcoming, useMyRaces } from "@/features/athletes/myRaces";
import { markStart } from "@/features/fitness/guideVoice";
import { liveHead } from "@/features/liveScreen/fonts";
import { PaidNotice } from "@/features/receipts/Payment";
import { useWeather } from "@/features/weather/useWeather";
import { dayHours, nowOf, windName } from "@/features/weather/weather";
import { WindArrow } from "@/features/weather/WxPanel";
import { useNow } from "@/hooks/useNow";
import { athleteNext, statusOf } from "@/lib/fitness/model";
import { chunkStats, dueChunks } from "@/lib/englishChunkStudy";
import { DECK_KEY, cachedDeck } from "@/lib/englishWords";
import { dayPlans } from "@/lib/homeTiles";
import { isTraining } from "@/lib/trainingLog";
import { initials, todayStr } from "@/lib/utils/format";
import { InboxBell, InboxSheet, useInbox } from "./Inbox";
import { HomeGrid } from "./HomeGrid";
import { usePages } from "./usePages";
import { Waiting } from "./IpadHome";
import { DersCard } from "./DersCard";

// SPORCU ANA SAYFASI · "Sahne" (Seyhun 2026-11-25 "tamamen farklı, profesyonel, modern"; A seçti; örnek velora-tarama/sporcu-ana-yeni.html):
// Fitness Sahne ile aynı dil: koyu zemin, dar dev başlıklar (Barlow Condensed), tek vurgu limon sarısı. Telefon önce; iPad'de iki sütun (sporcu.css).
// Sıra: selam · tek satır hava (şimdi + antrenman saatinde) · BUGÜN dev kartı (bugünkü antrenman; Tekne ekranı düğmesi) · Fitness ve İngilizce
// kartları (yan yana kayar) · kayıtlı yarış (yalnız sporcunun yazılı olduğu, kaç gün kaldı; /api/my-races) · kutular: Velora Sailing, Ders programı,
// Yoklamam, Görevler · Bekleyen. Olmayan şey çizilmez (fitness yoksa kart yok, kayıtlı yarış yoksa yarış yok). Asistan yok.
const pad = (n) => String(n).padStart(2, "0");
const noSub = () => () => {};
const readDeck = () => {
  try {
    return localStorage.getItem(DECK_KEY) || "";
  } catch {
    return "";
  }
};
const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function SporcuHome() {
  const inbox = useInbox();
  const setSheet = inbox.setOpen;
  // Gidecek sayfası olmayan bildirime dokununca (/?bildirim=1) zil penceresi açılır
  useEffect(() => {
    if (!/[?&]bildirim=1/.test(window.location.search)) return;
    setSheet(true);
    window.history.replaceState(null, "", "/");
  }, [setSheet]);
  useEffect(() => {
    document.body.classList.add("sh-body");
    return () => document.body.classList.remove("sh-body");
  }, []);
  return (
    <>
      <main data-theme="dark" className={`sh ${liveHead.variable}`} data-home-sporcu>
        <Top inbox={inbox} onInbox={() => setSheet(true)} />
        <div className="sh-grid">
          <div className="sh-col">
            <Hello />
            <Today />
            <RaceCard />
          </div>
          <div className="sh-col">
            <div className="sh-row">
              <FitCard />
              <EnCard />
            </div>
            <Tiles />
            <Waiting inbox={inbox} onAll={() => setSheet(true)} />
            <PaidNotice />
          </div>
        </div>
      </main>
      <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
    </>
  );
}

function Top({ inbox, onInbox }) {
  const { profile } = useHesap();
  const { openAdd } = useAdd();
  const pages = usePages();
  const d = new Date();
  return (
    <header className="sh-top">
      <span className="sh-date">{d.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</span>
      <button type="button" data-press onClick={() => openAdd()} className="sh-pill">
        + Ekle
      </button>
      <HomeGrid pages={pages} />
      <InboxBell inbox={inbox} onOpen={onInbox} />
      <Link href="/settings" aria-label="Ayarlar" className="sh-me">
        {initials(profile?.name)}
      </Link>
    </header>
  );
}

// Selam ve tek satır hava (şimdi; bugün antrenman varsa onun saatindeki rüzgâr). Dokununca Hava sayfası.
function Hello() {
  const { profile } = useHesap();
  const { w } = useWeather();
  const now = useNow(60000);
  const tr = useTraining(now);
  const n = nowOf(w);
  const at = tr?.time && dayHours(w, todayStr())?.find((r) => r.hh === tr.time.slice(0, 2));
  const first = (profile?.name || "").trim().split(/\s+/)[0];
  return (
    <>
      <h1 className="sh-hi sh-c">
        {now.getHours() < 12 ? "Günaydın" : now.getHours() < 18 ? "Selam" : "İyi akşamlar"}
        {first ? <em> {first}</em> : null}
      </h1>
      {n && (
        <Link href="/weather" className="sh-wx" aria-label="Hava">
          <WindArrow dir={n.dir} size={16} color="#fff" />
          <b className="num">{Math.round(n.wind ?? 0)} kn</b>
          {n.dir != null && <span>{windName(n.dir)}</span>}
          <i />
          <b className="num">{Math.round(n.t ?? 0)}°</b>
          {at && tr.time > hm(now) && (
            <>
              <i />
              <span>
                {tr.time.slice(0, 5)}{"'te "}<b className="num">{Math.round(at.wind ?? 0)} kn</b>
              </span>
            </>
          )}
        </Link>
      )}
    </>
  );
}

// Bugünün antrenmanı (fitness hariç): sürmekte ya da sıradaki; yoksa bugünün ilk antrenmanı
function useTraining(now) {
  const { plans } = useData();
  const today = todayStr();
  return useMemo(() => {
    const day = dayPlans(plans, today).filter((p) => !p.fit && isTraining(p));
    const t = hm(now);
    return day.find((p) => !p.time || (p.endTime || "") > t || p.time >= t) || day.at(-1) || null;
  }, [plans, today, now]);
}

// BUGÜN dev kartı: antrenman varsa adı, saati, rüzgârı, süresi; yoksa "Serbest gün". Sağ altta Tekne ekranı (/bilgi).
function Today() {
  const now = useNow(60000);
  const tr = useTraining(now);
  const { w } = useWeather();
  const { open } = usePlanOpen();
  const at = tr?.time && dayHours(w, todayStr())?.find((r) => r.hh === tr.time.slice(0, 2));
  const dur = tr?.durationMin ? (tr.durationMin >= 60 ? `${Math.round((tr.durationMin / 60) * 10) / 10} sa` : `${tr.durationMin} dk`) : "";
  return (
    <section className="sh-hero" aria-label="Bugün">
      <svg className="sh-sail" viewBox="0 0 60 80" aria-hidden="true">
        <path d="M30 4 L30 62 L6 62 Z" fill="#ffffff22" />
        <path d="M33 10 L33 62 L54 62 Z" fill="#d4ff3a55" />
        <path d="M4 66 H56 L48 74 H12 Z" fill="#ffffff33" />
      </svg>
      {tr ? (
        <button type="button" onClick={() => open(tr)} className="sh-hero-in">
          <span className="sh-k sh-lime">BUGÜN{tr.time ? ` · ${tr.time.slice(0, 5)}` : ""} · ANTRENMAN</span>
          <span className="sh-c sh-hero-t">{tr.title || "Antrenman"}</span>
          <span className="sh-meta">
            {at && (
              <span>
                Rüzgâr<b className="num">{Math.round(at.wind ?? 0)} kn</b>
              </span>
            )}
            {dur && (
              <span>
                Süre<b className="num">{dur}</b>
              </span>
            )}
            {tr.place && (
              <span>
                Yer<b>{tr.place}</b>
              </span>
            )}
          </span>
        </button>
      ) : (
        <div className="sh-hero-in">
          <span className="sh-k sh-lime">BUGÜN</span>
          <span className="sh-c sh-hero-t">Serbest gün</span>
          <span className="sh-meta">
            <span>Start sayacı · pusula · parkur</span>
          </span>
        </div>
      )}
      <Link href="/bilgi" data-press className="sh-go">
        Tekne ekranı
      </Link>
    </section>
  );
}

// Bugünün fitness antrenmanı (antrenörün hazırladığı): Başla doğrudan adım adım ekranı açar (TodayFit ile aynı)
function FitCard() {
  const { profile } = useHesap();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const today = todayStr();
  const n = athleteNext(plans, profile?.uid, today);
  if (!n?.today) return null;
  const p = n.plan;
  const st = statusOf(p, today);
  const fin = st === "done" || st === "skip";
  const k = (p.fit?.items || []).length;
  const go = () => {
    if (!fin) markStart(p.id);
    openAdd({ edit: { kind: "plan", id: p.id } });
  };
  return (
    <button type="button" data-press onClick={go} className="sh-card sh-fit">
      <span className="sh-k">FITNESS · {fin ? (st === "done" ? "YAPILDI" : "ATLANDI") : `BUGÜN${p.time ? ` · ${p.time.slice(0, 5)}` : ""}`}</span>
      <span className="sh-c sh-card-t">{p.fit?.name || p.title}</span>
      <span>
        <small>{[k ? `${k} hareket` : "", fin ? "Sonucu aç" : "Başla"].filter(Boolean).join(" · ")}</small>
        <span className="sh-bar">
          <i style={{ width: fin ? "100%" : "0%" }} />
        </span>
      </span>
    </button>
  );
}

// İngilizce (Seyhun 2026-11-25 "sporcu da İngilizce'ye gidebilsin, kartı olsun"): seri, bugün tekrar edilecek kalıp; dokununca İngilizce.
// Sporcunun destesi kendi cihazında (wordData: ana hesap dışındakiler localStorage), ana hesabın destesine karışmaz.
function EnCard() {
  const raw = useSyncExternalStore(noSub, readDeck, () => null); // sunucuda yok; cihazda deste metni
  const s = useMemo(() => {
    if (raw === null) return null;
    const deck = cachedDeck();
    const today = todayStr();
    return { ...chunkStats(deck, today), due: dueChunks(deck, today).length };
  }, [raw]);
  const started = s && s.known + s.study > 0;
  const pct = s && s.total ? Math.round(((s.known + s.study * 0.5) / s.total) * 100) : 0;
  return (
    <Link href="/english" data-press className="sh-card sh-en">
      <span className="sh-k">İNGİLİZCE{s?.days ? ` · ${s.days} GÜN SERİ` : ""}</span>
      <span className="sh-c sh-card-t">{started ? (s.due ? `Bugün ${s.due} kalıp` : "Yeni kalıp") : "Kalıplarla başla"}</span>
      <span>
        <small>{started ? `${s.known} öğrenildi · Çalış` : "Konuşarak öğren · Çalış"}</small>
        <span className="sh-bar">
          <i style={{ width: `${pct}%` }} />
        </span>
      </span>
    </Link>
  );
}

// Kayıtlı yarış (en yakını): yalnız sporcunun yazılı olduğu yarışlar; dokununca Yarışlarım
function RaceCard() {
  const races = useMyRaces();
  const r = upcoming(races)[0];
  if (!r) return null;
  const n = daysTo(r);
  return (
    <Link href="/my-races" data-press className="sh-race">
      <span className="sh-c sh-race-n">{n < 0 ? "ŞİMDİ" : n === 0 ? "BUGÜN" : n}</span>
      <span className="min-w-0 flex-1">
        <b>{n > 0 ? `gün sonra · ${r.name}` : r.name}</b>
        <small>{["Kayıtlısın", r.place, r.who?.length ? r.who.join(", ") : ""].filter(Boolean).join(" · ")}</small>
      </span>
    </Link>
  );
}

function Tiles() {
  const h = useHesap();
  const router = useRouter();
  const { tasks, myUid } = useData();
  const { recs } = useMyAttendance(h.kind);
  const m = recs?.[0] ? monthOf(recs[0]) : null;
  const open = (tasks || []).filter((t) => !t.done && !t.doneBy?.[myUid]).length;
  return (
    <div className="sh-tiles">
      <button type="button" data-press onClick={() => router.push("/sailing")} className="sh-tile sh-sailing">
        <span className="sh-k">Velora Sailing</span>
        <b className="sh-t">Aç</b>
        <small className="sh-s">Taktik · kural senaryoları</small>
      </button>
      <DersCard tile />
      <Link href="/my-attendance" data-press className="sh-tile">
        <span className="sh-k">{h.kind === "parent" ? "Yoklama" : "Yoklamam"}</span>
        <b className="sh-t num">{m?.rate != null ? `%${m.rate}` : "—"}</b>
        <small className="sh-s">{m?.rate != null ? `Bu ay · ${m.present} geldi` : "Bu ay kayıt yok"}</small>
      </Link>
      <Link href="/tasks" data-press className="sh-tile">
        <span className="sh-k">Görevler</span>
        <b className="sh-t num">{open}</b>
        <small className="sh-s">{open ? "bekliyor" : "hepsi tamam"}</small>
      </Link>
    </div>
  );
}
