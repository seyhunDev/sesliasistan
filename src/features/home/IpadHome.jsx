"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAdd } from "@/features/add/AddProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { useData } from "@/features/data/DataProvider";
import { dayHours } from "@/features/weather/weather";
import { DayCell, H0, H1, HavaPanel, cap, pad, useWidth } from "@/features/weather/WxPanel";
import { useNow } from "@/hooks/useNow";
import { isTraining } from "@/lib/trainingLog";
import { attHref, dayPlans, planTone } from "@/lib/homeTiles";
import { initials, todayStr } from "@/lib/utils/format";
import { InboxBell } from "./Inbox";
import { BirthdayBadge } from "./PeopleStrip";
import { useWide as useSide } from "./SideNav";

// iPad ana sayfa (Seyhun 2026-11-11 "A · Zaman şeridi", örnek ana-sayfa/sade-2026-11/ipad.html; "minimal ama teknolojik, fütüristik"):
// baştan sona lacivert (.navy), ince çizgili paneller, rakamlar Space Grotesk (--font-num).
// Üstte tarih, saat, + Ekle, zil, Ayarlar. Hava paneli (ortak HavaPanel, weather/WxPanel.jsx; hava sayfasıyla aynı, ölçülen rüzgârla): solda pusula (şimdiki rüzgâr, sağanak, yön), sağda seçili günün saat saat rüzgâr eğrisi
// ve her 3 saatin rüzgârı, göğü, sıcaklığı. Takvim paneli (hava ile ayrı; Seyhun "iç içe girmesin"): seçili günün planları kendi saat çizgisinde,
// altında 7 gün; her günde gök, en düşük/en yüksek, gün içi rüzgâr eğrisi, rüzgâr aralığı + yön, yağış (mm · %), planlar.
// Bir güne dokununca hava eğrisi ve plan çizgisi o güne geçer. Sağ sütun (side): yarış şeridi, Bekleyen, Kulüp ve hesaba göre kartlar.
// Hava, Hava sayfasında seçilen yerin (getPlace) verisi. Telefonda da bu (Seyhun 2026-11-12 "birleştir"): paneller alt alta, günler yana kayar,
// planlarda yalnız başlama saati; düzen globals.css (max-width 47.99rem).
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hOf = (t) => (t && /^\d{1,2}:\d{2}/.test(t) ? +t.slice(0, t.indexOf(":")) + +t.slice(t.indexOf(":") + 1, t.indexOf(":") + 3) / 60 : null);

export function IpadHome({ weather, inbox, onInbox, side }) {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const router = useRouter();
  const now = useNow(30000);
  const sideNav = useSide();
  const today = todayStr();
  const [sel, setSel] = useState(today);
  const { w, err, refresh } = weather;
  const days = useMemo(() => {
    const base = new Date(`${today}T12:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      return ymd(d);
    });
  }, [today]);
  const date = days.includes(sel) ? sel : today;
  const isToday = date === today;
  const rows = dayHours(w, date);
  const nowH = now.getHours() + now.getMinutes() / 60;
  const goWeather = () => (w ? router.push("/weather") : refresh(true));
  const dname = isToday ? "Bugün" : cap(new Date(`${date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric" }));

  return (
    <main className="iph navy" data-home-ipad>
      <header className="iph-hd">
        <h1 className="iph-date">
          <b>{new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}</b>
          <small>{cap(new Date().toLocaleDateString("tr-TR", { weekday: "long" }))}</small>
        </h1>
        <span className="iph-clock num" aria-label="Saat">
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </span>
        <button type="button" data-press onClick={() => openAdd()} className="iph-add">
          + Ekle
        </button>
        {!sideNav && side.all}
        <BirthdayBadge />
        <InboxBell inbox={inbox} onOpen={onInbox} />
        <Link href="/settings" aria-label="Ayarlar" className="iph-me">
          {initials(profile?.name)}
        </Link>
      </header>

      <HavaPanel w={w} err={err} refresh={refresh} date={date} today={today} rows={rows} nowH={nowH} onOpen={goWeather} />

      <section className="iph-pn iph-cal" aria-label="Takvim">
        <DayLane date={date} today={today} nowH={isToday ? nowH : null} dname={dname} />
        <div className="iph-wk">
          {days.map((d) => (
            <DayCell key={d} date={d} today={today} w={w} plans={plans} on={d === date} nowH={d === today ? nowH : null} onSel={() => setSel(d)} />
          ))}
        </div>
      </section>

      <aside className="iph-side">{side.body}</aside>
    </main>
  );
}

// Seçili günün planları kendi saat çizgisinde (havadan ayrı): blok = saat aralığı, renk = plan türü; saatsiz plan solda "Gün boyu"
function DayLane({ date, today, nowH, dname }) {
  const { plans } = useData();
  const { profile } = useAuth();
  const { open } = usePlanOpen();
  const list = dayPlans(plans, date);
  const timed = list.filter((p) => hOf(p.time) != null);
  const allDay = list.filter((p) => hOf(p.time) == null);
  const pct = (h) => `${((Math.min(Math.max(h, H0), H1) - H0) / (H1 - H0)) * 100}%`;
  const sail = list.find(isTraining);
  const att = sail && canSeeAthletes(profile?.email);
  // Üst üste binen bloklar alt alta (iki sıra); bloğun en az genişliği de sayılır (telefonda 5.5rem, iPad'de 7.5rem)
  const [ref, W] = useWidth();
  const minH = W ? ((W < 500 ? 88 : 120) / W) * (H1 - H0) : 0;
  const lanes = [];
  const placed = timed.map((p) => {
    const s = hOf(p.time);
    const e = Math.max(hOf(p.endTime) ?? s + (p.durationMin ? p.durationMin / 60 : isTraining(p) ? 2 : 1), s + 0.75);
    let lane = lanes.findIndex((end) => end <= s);
    if (lane < 0) lane = lanes.push(0) - 1;
    lanes[lane] = Math.max(e, s + minH);
    return { p, s, e, lane: Math.min(lane, 1) };
  });
  return (
    <div>
      <div className="iph-pt">
        Takvim · {dname}
        <span className="flex-1" />
        {allDay.map((p) => (
          <button key={p.id} type="button" onClick={() => open(p)} className={`iph-chip tone-${planTone(p)}`}>
            {p.title || "Plan"}
          </button>
        ))}
        {att && (
          <Link href={attHref(date, today) || "/athletes/attendance"} data-press className="iph-mini">
            Yoklama
          </Link>
        )}
        {sail && (
          <Link href={`/training/day?id=${sail.id}`} data-press className="iph-mini iph-mini-on">
            Süre
          </Link>
        )}
      </div>
      <div ref={ref} className="iph-lane" style={placed.some((x) => x.lane) ? { height: "7.35rem" } : undefined}>
        {placed.map(({ p, s, e, lane }) => (
          <button
            key={p.id}
            type="button"
            data-press
            onClick={() => open(p)}
            className={`iph-blk tone-${planTone(p)}`}
            style={{ left: pct(s), width: `calc(${pct(e)} - ${pct(s)})`, top: lane ? "2.6rem" : 0 }}
          >
            <b className="truncate">{p.title || "Plan"}</b>
            <small className="num">
              {p.time}
              {p.endTime && <span className="iph-end">–{p.endTime}</span>}
            </small>
          </button>
        ))}
        {!list.length && <span className="absolute inset-x-0 top-5 text-center text-[0.8125rem] font-semibold text-[#4f6389]">Plan yok</span>}
        <div className="iph-axis">
          {[6, 9, 12, 15, 18, 21, 24].map((h) => (
            <span key={h} style={{ left: pct(h) }}>
              {pad(h % 24)}
            </span>
          ))}
          {nowH != null && nowH >= H0 && <i className="iph-nowl" style={{ left: pct(nowH) }} />}
        </div>
      </div>
    </div>
  );
}

// Sağ sütundaki "Bekleyen" (zil penceresindeki "Senin için" listesinin ilk satırları)
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
