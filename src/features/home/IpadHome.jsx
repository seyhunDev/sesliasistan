"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAdd } from "@/features/add/AddProvider";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { useData } from "@/features/data/DataProvider";
import { dayHours } from "@/features/weather/weather";
import { DayCell, H0, H1, HavaPanel, cap, pad } from "@/features/weather/WxPanel";
import { useNow } from "@/hooks/useNow";
import { antYonet, isTraining } from "@/lib/trainingLog";
import { attHref, dayPlans, planTone } from "@/lib/homeTiles";
import { initials, todayStr } from "@/lib/utils/format";
import { InboxBell } from "./Inbox";
import { BirthdayBadge } from "./PeopleStrip";
import { useWide as useSide } from "./SideNav";
import { ScrollBar } from "@/components/ui/ScrollBar";

// iPad ana sayfa (Seyhun 2026-11-11 "A · Zaman şeridi", örnek ana-sayfa/sade-2026-11/ipad.html; "minimal ama teknolojik, fütüristik"):
// açık tema (.acik; Seyhun 2026-11-22 "Apple beyazı, beyaz ve gri tonlar"; örnek acik-ana-sayfa.html): beyaz kartlar, gri yazılar, tek vurgu mavi; rakamlar Space Grotesk (--font-num).
// Üstte tarih, saat, + Ekle, zil, Ayarlar. Hava paneli (ortak HavaPanel, weather/WxPanel.jsx; hava sayfasıyla aynı, ölçülen rüzgârla): üstte şimdiki rüzgâr (ok + derece, sağanak), altında kenardan kenara seçili günün saat saat rüzgârı, en altta tek satır yağış
// ve her 3 saatin rüzgârı, göğü, sıcaklığı. Takvim paneli (hava ile ayrı; Seyhun "iç içe girmesin"): seçili günün planları kendi saat çizgisinde,
// altında 7 gün; her günde gök, en düşük/en yüksek, gün içi rüzgâr eğrisi, rüzgâr aralığı + yön, yağış (mm · %), planlar.
// Bir güne dokununca hava eğrisi ve plan çizgisi o güne geçer. Sağ sütun (side): yarış şeridi, Bekleyen, Kulüp ve hesaba göre kartlar.
// Hava, Hava sayfasında seçilen yerin (getPlace) verisi. Telefonda da bu (Seyhun 2026-11-12 "birleştir"): paneller alt alta, günler yana kayar,
// planlarda yalnız başlama saati; düzen globals.css (max-width 47.99rem).
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hOf = (t) => (t && /^\d{1,2}:\d{2}/.test(t) ? +t.slice(0, t.indexOf(":")) + +t.slice(t.indexOf(":") + 1, t.indexOf(":") + 3) / 60 : null);

export function IpadHome({ weather, inbox, onInbox, side, can = {} }) {
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
    <main className="iph acik" data-home-ipad>
      <ScrollBar title={new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}>
        <button type="button" data-press onClick={() => openAdd()} tabIndex={-1} className="btn btn-primary btn-sm">
          + Ekle
        </button>
      </ScrollBar>
      <header className="iph-hd">
        <h1 className="iph-date">
          <b>{new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long" })}</b>
          <small>{cap(new Date().toLocaleDateString("tr-TR", { weekday: "long" }))}</small>
        </h1>
        <span className="iph-clock num" aria-label="Saat">
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </span>
        <button type="button" data-press onClick={() => openAdd()} className="btn btn-primary btn-sm">
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
      {side.lead /* Hava'nın altında tam genişlik (normal kullanıcı ve sporcuda bugünün fitness antrenmanı) */}

      <section className="iph-pn iph-cal" aria-label="Takvim">
        <DayLane date={date} today={today} nowH={isToday ? nowH : null} dname={dname} can={can} />
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
// üstte ince saat şeridi (plan = gri çizgi, süren plan koyu, kırmızı çizgi şimdi), altında planlar tek satır (Seyhun 2026-11-22 "rüzgârı göstermeyelim,
// yazı ikinci satıra geçmesin"): saat · renkli nokta · başlık · yer. Saatsiz plan "Gün boyu". Satıra dokununca plan açılır.
function DayLane({ date, today, nowH, dname, can }) {
  const { plans } = useData();
  const { open } = usePlanOpen();
  const list = dayPlans(plans, date);
  const timed = list.filter((p) => hOf(p.time) != null);
  const sorted = [...timed.sort((x, y) => hOf(x.time) - hOf(y.time)), ...list.filter((p) => hOf(p.time) == null)];
  const pct = (h) => `${((Math.min(Math.max(h, H0), H1) - H0) / (H1 - H0)) * 100}%`;
  const end = (p) => Math.max(hOf(p.endTime) ?? hOf(p.time) + (p.durationMin ? p.durationMin / 60 : isTraining(p) ? 2 : 1), hOf(p.time) + 0.5);
  const sail = list.find(isTraining);
  const att = sail && can.yoklama; // can: hesap görünümü (OwnerHome HomeFrame; "… gibi gör"de o hesabınki)
  // Şu an süren plan (bugün, başlangıç ile bitiş arası): satır açık gri zeminli, şeritte koyu
  const live = (p) => nowH != null && hOf(p.time) != null && nowH >= hOf(p.time) && nowH < end(p);
  const n = sorted.length;
  return (
    <div>
      <div className="iph-pt">
        Takvim · {dname}
        <span className="flex-1" />
        {att && (
          <Link href={attHref(date, today) || "/athletes/attendance"} data-press className="btn btn-secondary btn-sm">
            Yoklama
          </Link>
        )}
        {/* Yönet: ana hesap ve antrenör (Seyhun 2026-11-24); diğer hesaplarda yok */}
        {sail && can.yonet && (
          <Link href={antYonet(sail)} data-press className="btn btn-primary btn-sm">
            Yönet
          </Link>
        )}
      </div>
      <div className="iph-strip" aria-hidden="true">
        {timed.map((p) => (
          <i key={p.id} className={`iph-sbar tone-${planTone(p)} ${live(p) ? "iph-sbar-on" : ""}`} style={{ left: pct(hOf(p.time)), width: `calc(${pct(end(p))} - ${pct(hOf(p.time))})` }} />
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
      {!n && <p className="py-3 text-center text-[0.8125rem] font-semibold text-mut">Plan yok</p>}
      {n > 0 && (
        <div className="iph-pls">
          {sorted.map((p) => (
            <button key={p.id} type="button" data-press onClick={() => open(p)} className={`iph-pl tone-${planTone(p)} ${live(p) ? "iph-pl-now" : ""}`}>
              <span className="num iph-pl-t">{p.time || "Gün boyu"}</span>
              <i className="iph-pl-d" />
              <b>{p.title || "Plan"}</b>
              {p.place && <small>{p.place}</small>}
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
