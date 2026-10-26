"use client";

import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { useWindObs } from "@/features/weather/useWindObs";
import { OBS } from "@/features/weather/DaySheet";
import { PLACE, getPlace, kn, sky } from "@/features/weather/weather";

const YMD = new Intl.DateTimeFormat("en-CA", { timeZone: PLACE.tz });
const HOUR = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: PLACE.tz });

// Ana sayfanın lacivert üst kısmındaki bugünün rüzgâr grafiği (Seyhun 2026-10-21: "rüzgâr grafiği benim için önemli: sağanak, normal rüzgâr,
// yön, hava durumu; hangi saatte ne olduğunu net bilmem gerek"; onaylanan örnek ana-sayfa/futuristik/c2-kokpit-ruzgar.png).
// Dolu mor alan rüzgâr, açık mor alan ve kesik çizgi sağanak; üstte 2 saatte bir yön oku (rüzgârın estiği yöne bakar, 17 kn ve üstü turuncu),
// altında 3 saatte bir saat, gökyüzü, sıcaklık ve "rüzgâr–sağanak" kn. Kırmızı "şimdi" noktası dakikaya göre saatler arasında durur.
// Yakında istasyon varsa geçmiş saatlerde ölçülen rüzgâr mavi gölge + kesik mavi sağanak; o saatlerin altındaki yazı da ölçülen "rüzgâr–sağanak" (mavi).
// Ayrı "en sert sağanak" yazısı yok (Seyhun 2026-10-24: rüzgâr ve sağanak tek yerde, "2–4 kn").
// Açılışta grafik soldan sağa 0,9 sn'de çizilir (globals.css .ck-draw); hareket azaltılmışsa çizilmeden gelir. Hava sayfasındaki grafik (WindChart) değişmez.
const W = 340, L = 6, R = 22, T = 26, H = 132, B = 4;
// far: istasyon 10 km'den uzakta da (100 km'ye kadar) ölçüm çizilir (yarış sayfası; Seyhun 2026-10-26: "yarışın olduğu yerdeki gerçekleşmiş rüzgârı göremiyorum")
export function CockpitWind({ rows, date, place = null, far = false }) {
  const now = useNow();
  const today = YMD.format(now);
  const day = date || today;
  const ob = useWindObs(place || getPlace(), day, today, far); // place: başka yerin grafiği (yarış sayfası); yoksa hava yeri
  if (!rows?.length) return null;
  const n = rows.length;
  const obs = rows.map((h) => ob?.rows?.find((o) => o.hh === h.hh));
  const got = obs.map((o, i) => o && { i, ...o }).filter(Boolean);
  const top = Math.max(15, Math.ceil((Math.max(...rows.map((h) => h.gust), ...got.map((o) => o.gust ?? o.wind)) + 2) / 5) * 5);
  const x = (i) => L + (i * (W - L - R)) / Math.max(1, n - 1);
  const y = (v) => T + (1 - v / top) * (H - T - B);
  const path = (pts) => pts.map(([i, v], k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const close = (d, a, b) => `${d}L${x(b)},${y(0)}L${x(a)},${y(0)}Z`;
  const wind = path(rows.map((h, i) => [i, h.wind]));
  const gust = path(rows.map((h, i) => [i, h.gust]));
  const oLine = path(got.map((o) => [o.i, o.wind]));
  const oGust = path(got.filter((o) => o.gust != null).map((o) => [o.i, o.gust]));
  // Şimdi: saatler arası doğrusal ara değer (14:30 → 14 ile 15'in ortası)
  const hi = day === today ? rows.findIndex((h) => h.hh === HOUR.format(now)) : -1;
  const nowAt = hi >= 0 ? Math.min(n - 1, hi + now.getMinutes() / 60) : -1;
  const ni = Math.floor(nowAt);
  const nowV = nowAt >= 0 ? rows[ni].wind + ((rows[ni + 1]?.wind ?? rows[ni].wind) - rows[ni].wind) * (nowAt - ni) : null;
  const ticks = [5, 10, 15, 20, 25, 30].filter((v) => v < top);
  return (
    <div className="ck-wind">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Bugünün saatlik rüzgâr grafiği">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.08)" />
            <text x={W - 2} y={y(v) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,.5)">{v}</text>
          </g>
        ))}
        {rows.map((h, i) =>
          i % 2 === 0 ? (
            <path
              key={`a${h.time}`}
              // Ok aşağı (güneye) bakar; meteoroloji yönü "geldiği yön" olduğu için yönün kendisi kadar döndürülür (kuzeyden esen → güneye bakan ok)
              d="M0,-5.5L0,5.5M-3.2,2.3L0,5.5L3.2,2.3"
              transform={`translate(${x(i).toFixed(1)},10) rotate(${((obs[i]?.dir ?? h.dir ?? 0) % 360).toFixed(0)})`}
              fill="none"
              stroke={(obs[i]?.wind ?? h.wind) >= 17 ? "#f4a64a" : obs[i] ? "#9cc3ee" : "#fff"}
              strokeOpacity={got.length && !obs[i] ? 0.55 : 1}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null,
        )}
        <g className="ck-draw">
          <path d={close(gust, 0, n - 1)} fill="#67e8f9" fillOpacity=".26" />
          <path d={close(wind, 0, n - 1)} fill="#67e8f9" fillOpacity=".92" />
          <path d={gust} fill="none" stroke="#c4b5fd" strokeWidth="1.3" strokeDasharray="3 3" />
          {got.length > 1 && <path d={close(oLine, got[0].i, got[got.length - 1].i)} fill={OBS} fillOpacity=".55" />}
          {got.length > 1 && <path d={oLine} fill="none" stroke="#9cc3ee" strokeWidth="1.3" />}
          {oGust && <path d={oGust} fill="none" stroke="#9cc3ee" strokeWidth="1.3" strokeDasharray="3 3" />}
        </g>
        {nowV != null && (
          <g>
            <line x1={x(nowAt)} x2={x(nowAt)} y1={T - 6} y2={y(0)} stroke="#ff6b6b" strokeWidth="1.3" strokeDasharray="2 2" />
            <circle cx={x(nowAt)} cy={y(nowV)} r="9" fill="#ff6b6b" className="ck-pulse" />
            <circle cx={x(nowAt)} cy={y(nowV)} r="4.5" fill="#ff6b6b" stroke="#11203a" strokeWidth="2" />
          </g>
        )}
      </svg>
      {/* 3 saatte bir: saat, gökyüzü, sıcaklık, "rüzgâr-sağanak" (kn, ölçülen de aynı biçimde); grafikteki saatin tam altında */}
      <div className="relative mt-1.5 h-[4.6rem]">
        {rows.map((h, k) => {
          if (+h.hh % 3) return null;
          const s = sky(h.code, h.day);
          const o = obs[k]; // geçmiş saatte ölçülen varsa onu yaz (mavi), yoksa tahmin
          return (
            <span key={h.time} className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-[3px] leading-none tabular-nums" style={{ left: `${(x(k) / W) * 100}%` }}>
              <span className="text-[0.6875rem] font-semibold text-white/55">{h.hh}</span>
              <Icon name={s.icon} className={`size-[1.05rem] ${CK_SKY[s.icon] || "text-white/80"}`} />
              <span className="text-[0.75rem] font-semibold">{h.t}°</span>
              <span className={`whitespace-nowrap text-[0.6875rem] font-bold ${o ? "text-[#9cc3ee]" : ""}`}>{kn(o ? o.wind : h.wind, o ? o.gust : h.gust)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// Lacivert zeminde gökyüzü simgelerinin rengi
const CK_SKY = { sun: "text-amber-300", cloudSun: "text-amber-200", moon: "text-indigo-200", cloud: "text-slate-300", fog: "text-slate-300", rain: "text-sky-300", snow: "text-sky-100", storm: "text-amber-300" };
