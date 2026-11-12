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
import { DayCell, H0, H1, HavaPanel, cap, pad, windColor } from "@/features/weather/WxPanel";
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
        <DayLane date={date} today={today} nowH={isToday ? nowH : null} dname={dname} rows={rows} />
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

// Seçili günün planları (Seyhun 2026-11-12 "kart biraz daha geniş… planın başlığını en azından görmek istiyorum"; örnek ana-sayfa/sade-2026-11/takvim.html):
// üstte ince saat şeridi (plan = renkli çizgi, kırmızı çizgi şimdi), altında kartlar. 1 plan tam genişlik büyük kart, 2 plan yan yana,
// 3 ve fazlası alt alta satır (saat · başlık · yer · o saatin rüzgârı). Saatsiz plan "Gün boyu". Karta dokununca plan açılır.
function DayLane({ date, today, nowH, dname, rows }) {
  const { plans } = useData();
  const { profile } = useAuth();
  const { open } = usePlanOpen();
  const list = dayPlans(plans, date);
  const timed = list.filter((p) => hOf(p.time) != null);
  const sorted = [...timed.sort((x, y) => hOf(x.time) - hOf(y.time)), ...list.filter((p) => hOf(p.time) == null)];
  const pct = (h) => `${((Math.min(Math.max(h, H0), H1) - H0) / (H1 - H0)) * 100}%`;
  const end = (p) => Math.max(hOf(p.endTime) ?? hOf(p.time) + (p.durationMin ? p.durationMin / 60 : isTraining(p) ? 2 : 1), hOf(p.time) + 0.5);
  const sail = list.find(isTraining);
  const att = sail && canSeeAthletes(profile?.email);
  // Planın saatindeki rüzgâr (tahmin): "12–17" + yön
  const wx = (p) => {
    const h = hOf(p.time);
    const r = h != null && (rows || []).find((x) => +x.hh === Math.floor(h));
    return r && r.wind != null ? r : null;
  };
  const time = (p) => (p.time ? `${p.time}${p.endTime ? `–${p.endTime}` : ""}` : "Gün boyu");
  const Wind = ({ r, big }) =>
    r ? (
      <span className={`iph-pw num ${big ? "iph-pw-big" : ""}`} style={{ color: windColor((r.wind + (r.gust ?? r.wind)) / 2) }}>
        <span>
          {Math.round(r.wind)}–{Math.round(r.gust ?? r.wind)}
          {big ? " kn" : ""}
        </span>
        {r.dir != null && (
          <svg viewBox="-7 -7 14 14" className="size-3" style={{ transform: `rotate(${r.dir + 180}deg)` }} aria-hidden="true">
            <path d="M0 -6 L4 4 L0 2 L-4 4Z" fill="#cfdcf5" />
          </svg>
        )}
      </span>
    ) : null;
  const n = sorted.length;
  return (
    <div>
      <div className="iph-pt">
        Takvim · {dname}
        <span className="flex-1" />
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
      <div className="iph-strip" aria-hidden="true">
        {timed.map((p) => (
          <i key={p.id} className={`iph-sbar tone-${planTone(p)}`} style={{ left: pct(hOf(p.time)), width: `calc(${pct(end(p))} - ${pct(hOf(p.time))})` }} />
        ))}
        <div className="iph-axis">
          {[6, 9, 12, 15, 18, 21, 24].map((h) => (
            <span key={h} style={{ left: pct(h) }}>
              {pad(h % 24)}
            </span>
          ))}
        </div>
        {nowH != null && nowH >= H0 && <i className="iph-nowl" style={{ left: pct(nowH) }} />}
      </div>
      {!n && <p className="py-3 text-center text-[0.8125rem] font-semibold text-[#4f6389]">Plan yok</p>}
      {n > 0 && n < 3 && (
        <div className={`iph-cards ${n === 2 ? "iph-cards-2" : ""}`}>
          {sorted.map((p) => (
            <button key={p.id} type="button" data-press onClick={() => open(p)} className={`iph-pc tone-${planTone(p)} ${n === 1 ? "iph-pc-1" : ""}`}>
              <b>{p.title || "Plan"}</b>
              <small className="num">
                {time(p)}
                {p.place ? ` · ${p.place}` : ""}
              </small>
              <Wind r={wx(p)} big />
            </button>
          ))}
        </div>
      )}
      {n >= 3 && (
        <div className="iph-cards">
          {sorted.map((p) => (
            <button key={p.id} type="button" data-press onClick={() => open(p)} className={`iph-pr tone-${planTone(p)}`}>
              <span className="num iph-pr-t">{p.time || "Gün boyu"}</span>
              <span className="min-w-0">
                <b>{p.title || "Plan"}</b>
                {p.place && <small>{p.place}</small>}
              </span>
              <Wind r={wx(p)} />
            </button>
          ))}
        </div>
      )}
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
