"use client";

import "./sporcu.css";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useHesap } from "@/features/auth/useHesap";
import { useBilgiDoc } from "@/features/bilgi/bilgiStore";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { monthOf, useMyAttendance } from "@/features/athletes/myAttendance";
import { daysTo, upcoming, useMyRaces } from "@/features/athletes/myRaces";
import { markStart } from "@/features/fitness/guideVoice";
import { liveHead } from "@/features/liveScreen/fonts";
import { useWeather } from "@/features/weather/useWeather";
import { dayHours, nowOf, windName } from "@/features/weather/weather";
import { WindArrow } from "@/features/weather/WxPanel";
import { useNow } from "@/hooks/useNow";
import { athleteNext, statusOf } from "@/lib/fitness/model";
import { chunkStats, dueChunks } from "@/lib/englishChunkStudy";
import { DECK_KEY, cachedDeck } from "@/lib/englishWords";
import { dayPlans } from "@/lib/homeTiles";
import { isTraining } from "@/lib/trainingLog";
import { todayStr } from "@/lib/utils/format";
import { InboxSheet, useInbox } from "./Inbox";
import { DersCard } from "./DersCard";
import { SahneTop, SporcuAdd, SporcuMenu } from "./SporcuMenu";
import { SporcuHava } from "./SahneHome";

// SPORCU ANA SAYFASI · "Sahne" (Seyhun 2026-11-25 "tamamen farklı, profesyonel, modern"; A seçti; örnek velora-tarama/sporcu-ana-yeni.html):
// Fitness Sahne ile aynı dil: koyu zemin, dar dev başlıklar (Barlow Condensed), tek vurgu limon sarısı. Telefon önce; iPad'de iki sütun (sporcu.css).
// Günün sırası, bugün ne varsa o üstte (Seyhun 2026-11-25 "fitness varsa fitness öncelikli"; "serbest günde tekne ekranına gerek yok"):
// · fitness varsa en üstte fitness dev kartı; antrenman da varsa hemen altında antrenman dev kartı (içinde Tekne ekranı)
// · yalnız antrenman varsa en üstte antrenman kartı (içinde Tekne ekranı)
// · ikisi de yoksa (serbest gün) dev kart ve Tekne ekranı hiç yok; yarış/İngilizce/kutular yukarı çıkar
// Sonra kayıtlı yarış kendi kartında (kaç gün kaldı büyük; /api/my-races), İngilizce yatay kart, kutular. Bekleyen yok (Seyhun 2026-11-25 "zaten takvim var").
// Üst çubuk: ☰ menü · tarih · ＋ · zil · profil, hepsi aynı yuvarlak düğme; menü ve + Ekle koyu (SporcuMenu.jsx). Asistan yok.
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
const durText = (m) => (!m ? "" : m >= 60 ? `${Math.round((m / 60) * 10) / 10} sa` : `${m} dk`);

export function SporcuHome() {
  const inbox = useInbox();
  const setSheet = inbox.setOpen;
  const [menu, setMenu] = useState(false);
  const [add, setAdd] = useState(false);
  const now = useNow(60000);
  const tr = useTraining(now);
  const fit = useTodayFit();
  // Yönet'te gün başlatıldıysa (kanal açık) Tekne ekranı her gün görünür (Seyhun 2026-11-25 "bugün antrenman olmadığı için katılma düğmesi
  // gözükmüyor"): antrenman kartında "Katıl", antrenman yoksa en üstte ayrı Katıl kartı. Kanal kapanınca kaybolur.
  const { profile } = useAuth();
  const kanal = useBilgiDoc(profile?.orgId || "", "ekran")?.kanal;
  const live = kanal?.open ? kanal : null;
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
        <SahneTop inbox={inbox} onInbox={() => setSheet(true)} onMenu={() => setMenu(true)} onAdd={() => setAdd(true)} />
        <Hello tr={tr} now={now} />
        <div className="sh-grid">
          <SporcuHava />
          <div className="sh-col">
            {live && !tr && <LiveHero kanal={live} />}
            {fit && <FitHero fit={fit} />}
            {tr && <Today tr={tr} live={!!live} />}
            <RaceCard />
          </div>
          <div className="sh-col">
            <EnCard />
            <Tiles />
          </div>
        </div>
      </main>
      <InboxSheet inbox={inbox} open={inbox.open} onClose={() => setSheet(false)} />
      <SporcuMenu open={menu} onClose={() => setMenu(false)} />
      <SporcuAdd open={add} onClose={() => setAdd(false)} />
    </>
  );
}

// Selam ve tek satır hava (şimdi; bugün antrenman varsa onun saatindeki rüzgâr). Dokununca Hava sayfası.
function Hello({ tr, now }) {
  const { profile } = useHesap();
  const { w } = useWeather();
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
                {tr.time.slice(0, 5)}
                {"'te "}
                <b className="num">{Math.round(at.wind ?? 0)} kn</b>
              </span>
            </>
          )}
        </Link>
      )}
    </>
  );
}

// Bugünün antrenmanı (fitness hariç): sürmekte ya da sıradaki; yoksa bugünün son antrenmanı
function useTraining(now) {
  const { plans } = useData();
  const today = todayStr();
  return useMemo(() => {
    const day = dayPlans(plans, today).filter((p) => !p.fit && isTraining(p));
    const t = hm(now);
    return day.find((p) => !p.time || (p.endTime || "") > t || p.time >= t) || day.at(-1) || null;
  }, [plans, today, now]);
}

// Bugünün fitness antrenmanı (antrenörün hazırladığı): { p, fin, st, n (hareket), sets, go }; Başla doğrudan adım adım ekranı açar
export function useTodayFit() {
  const { profile } = useHesap();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const today = todayStr();
  const nx = athleteNext(plans, profile?.uid, today);
  if (!nx?.today) return null;
  const p = nx.plan;
  const st = statusOf(p, today);
  const fin = st === "done" || st === "skip";
  const items = p.fit?.items || [];
  return {
    p,
    st,
    fin,
    n: items.length,
    sets: items.reduce((s, it) => s + (+it.sets || 0), 0),
    go: () => {
      if (!fin) markStart(p.id);
      openAdd({ edit: { kind: "plan", id: p.id } });
    },
  };
}
const fitKey = (f) => (f.fin ? (f.st === "done" ? "YAPILDI" : "ATLANDI") : `BUGÜN${f.p.time ? ` · ${f.p.time.slice(0, 5)}` : ""}`);

// Antrenman dev kartı: adı, saati, rüzgârı, süresi, yeri. Sağ altta Tekne ekranı (/bilgi).
function Today({ tr, live }) {
  const { w } = useWeather();
  const { open } = usePlanOpen();
  const at = tr.time && dayHours(w, todayStr())?.find((r) => r.hh === tr.time.slice(0, 2));
  return (
    <section className="sh-hero" aria-label="Bugün">
      <svg className="sh-sail" viewBox="0 0 60 80" aria-hidden="true">
        <path d="M30 4 L30 62 L6 62 Z" fill="#ffffff22" />
        <path d="M33 10 L33 62 L54 62 Z" fill="#d4ff3a55" />
        <path d="M4 66 H56 L48 74 H12 Z" fill="#ffffff33" />
      </svg>
      <button type="button" onClick={() => open(tr)} className="sh-hero-in">
        <span className="sh-k sh-lime">BUGÜN{tr.time ? ` · ${tr.time.slice(0, 5)}` : ""} · ANTRENMAN</span>
        <span className="sh-c sh-hero-t">{tr.title || "Antrenman"}</span>
        <span className="sh-meta">
          {at && (
            <span>
              Rüzgâr<b className="num">{Math.round(at.wind ?? 0)} kn</b>
            </span>
          )}
          {/* Süre yazılmaz, yalnız başlama saati (Seyhun 2026-11-25 "süreyi yazmayalım, 15:00 kalsın sadece") */}
          {tr.time && (
            <span>
              Saat<b className="num">{tr.time.slice(0, 5)}</b>
            </span>
          )}
          {tr.place && (
            <span>
              Yer<b>{tr.place}</b>
            </span>
          )}
        </span>
      </button>
      <Link href="/bilgi" data-press className="sh-go" data-live={live ? "1" : undefined}>
        {live ? "Katıl" : "Tekne ekranı"}
      </Link>
    </section>
  );
}

// Antrenman planı olmayan günde Yönet günü başlattıysa: en üstte Katıl kartı (Tekne ekranı)
function LiveHero({ kanal }) {
  return (
    <section className="sh-hero sh-live" aria-label="Tekne ekranı açık">
      <Link href="/bilgi" className="sh-hero-in">
        <span className="sh-k sh-lime">ŞİMDİ · TEKNE EKRANI</span>
        <span className="sh-c sh-hero-t">{kanal.name || "Antrenman"}</span>
      </Link>
      <Link href="/bilgi" data-press className="sh-go" data-live="1">
        Katıl
      </Link>
    </section>
  );
}

// Bugün fitness varsa en üstte: fitness dev kartı (turuncu), hareket şeridi, Başla
function FitHero({ fit }) {
  const dur = durText(fit.p.durationMin);
  return (
    <section className="sh-hero sh-fhero" aria-label="Bugünün fitness antrenmanı">
      <svg className="sh-dumb" viewBox="0 0 60 30" aria-hidden="true">
        <rect x="4" y="6" width="8" height="18" rx="2" fill="#ff7a1a66" />
        <rect x="48" y="6" width="8" height="18" rx="2" fill="#ff7a1a66" />
        <rect x="12" y="13" width="36" height="4" rx="2" fill="#ffffff44" />
      </svg>
      <button type="button" onClick={fit.go} className="sh-hero-in">
        <span className="sh-k sh-orange">{fitKey(fit)} · FITNESS</span>
        <span className="sh-c sh-hero-t">{fit.p.fit?.name || fit.p.title}</span>
        <span className="sh-meta">
          {fit.n > 0 && (
            <span>
              Hareket<b className="num">{fit.n}</b>
            </span>
          )}
          {dur && (
            <span>
              Süre<b className="num">{dur}</b>
            </span>
          )}
          {fit.sets > 0 && (
            <span>
              Set<b className="num">{fit.sets}</b>
            </span>
          )}
        </span>
        {fit.n > 0 && (
          <span className="sh-strip" aria-hidden="true">
            {Array.from({ length: Math.min(fit.n, 8) }, (_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </span>
        )}
      </button>
      <button type="button" data-press onClick={fit.go} className="sh-go sh-go-fit">
        {fit.fin ? "Sonuç" : "Başla"}
      </button>
    </section>
  );
}

// Antrenman da varsa: fitness yatay tek kart
export function FitWide({ fit }) {
  return (
    <button type="button" data-press onClick={fit.go} className="sh-wide sh-fit">
      <span className="min-w-0 flex-1">
        <span className="sh-k">FITNESS · {fitKey(fit)}</span>
        <span className="sh-c sh-wide-t">{fit.p.fit?.name || fit.p.title}</span>
        <small>{[fit.n ? `${fit.n} hareket` : "", durText(fit.p.durationMin)].filter(Boolean).join(" · ")}</small>
      </span>
      <span className="sh-wide-b">{fit.fin ? "Sonuç" : "Başla"}</span>
    </button>
  );
}

// İngilizce yatay kart (Seyhun 2026-11-25 "sporcu da İngilizce'ye gidebilsin, kartı olsun"): seri, bugün tekrar edilecek kalıp; dokununca İngilizce.
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
  return (
    <Link href="/english" data-press className="sh-wide sh-en">
      <span className="min-w-0 flex-1">
        <span className="sh-k">İNGİLİZCE{s?.days ? ` · ${s.days} GÜN SERİ` : ""}</span>
        <b className="sh-wide-l">{started ? (s.due ? `Bugün ${s.due} kalıp` : "Yeni kalıp") : "Kalıplarla başla"}</b>
        <small>{started ? `${s.known} öğrenildi · konuşarak çalış` : "Konuşarak çalış"}</small>
      </span>
      <span className="sh-wide-b">Çalış</span>
    </Link>
  );
}

// Kayıtlı yarış (en yakını) kendi kartında: kaç gün kaldı büyük, adı, tarihi, yeri; dokununca Yarışlarım
const DAY = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long" });
function RaceCard() {
  const races = useMyRaces();
  const r = upcoming(races)[0];
  if (!r) return null;
  const n = daysTo(r);
  const a = new Date(`${r.startDate}T12:00`);
  const b = new Date(`${r.endDate || r.startDate}T12:00`);
  const dates = r.endDate && r.endDate !== r.startDate ? (a.getMonth() === b.getMonth() ? `${a.getDate()}–${DAY.format(b)}` : `${DAY.format(a)} – ${DAY.format(b)}`) : DAY.format(a);
  return (
    <Link href="/my-races" data-press className="sh-race">
      <svg className="sh-flag" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 21V4h11l-1.5 4L16 12H7v9" fill="#d4ff3a" />
      </svg>
      <span className="sh-c sh-race-n">
        {n < 0 ? "ŞİMDİ" : n === 0 ? "BUGÜN" : n}
        {n > 0 && <small>GÜN KALDI</small>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="sh-k sh-lime">{n < 0 ? "YARIŞ SÜRÜYOR" : "YARIŞA KAYITLISIN"}</span>
        <span className="sh-c sh-race-t">{r.name}</span>
        <small>{[dates, r.place, r.who?.length ? r.who.join(", ") : ""].filter(Boolean).join(" · ")}</small>
      </span>
    </Link>
  );
}

export function SailingTile() {
  return (
    <Link href="/sailing" data-press className="sh-tile sh-sailing">
      <span className="sh-k">Velora Sailing</span>
      <b className="sh-t">Aç</b>
      <small className="sh-s">Taktik · kural senaryoları</small>
    </Link>
  );
}

function Tiles() {
  const h = useHesap();
  const { tasks, myUid } = useData();
  const { recs } = useMyAttendance(h.kind);
  const m = recs?.[0] ? monthOf(recs[0]) : null;
  const open = (tasks || []).filter((t) => !t.done && !t.doneBy?.[myUid]).length;
  return (
    <div className="sh-tiles">
      <SailingTile />
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
