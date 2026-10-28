"use client";

import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { useWindObs } from "@/features/weather/useWindObs";
import { useRainRadar } from "@/features/weather/useRainRadar";
import { rainLine } from "@/features/weather/rainLine";
import { PLACE, getPlace, kn, sky } from "@/features/weather/weather";

const YMD = new Intl.DateTimeFormat("en-CA", { timeZone: PLACE.tz });
const HOUR = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: PLACE.tz });
const RADAR_MM = [0, 0.5, 2, 5]; // radar şiddeti → yaklaşık mm/sa (çubuk boyu için)

// Ana sayfanın lacivert üst kısmındaki bugünün rüzgâr grafiği (Seyhun 2026-10-21: "rüzgâr grafiği benim için önemli: sağanak, normal rüzgâr,
// yön, hava durumu; hangi saatte ne olduğunu net bilmem gerek"; onaylanan örnek ana-sayfa/futuristik/c2-kokpit-ruzgar.png).
// Dolu mor alan rüzgâr, açık mor alan ve kesik çizgi sağanak; üstte 2 saatte bir yön oku (rüzgârın estiği yöne bakar, 17 kn ve üstü turuncu),
// altında 3 saatte bir saat, gökyüzü, sıcaklık ve "rüzgâr–sağanak" kn. Kırmızı "şimdi" noktası dakikaya göre saatler arasında durur.
// Yakında istasyon varsa geçmiş saatlerde ölçülen rüzgâr noktalı beyaz çizgi + ince beyaz kesik sağanak; o saatlerin altındaki yazı da ölçülen "rüzgâr–sağanak".
// Ayrı "en sert sağanak" yazısı yok (Seyhun 2026-10-24: rüzgâr ve sağanak tek yerde, "2–4 kn").
// Açılışta grafik soldan sağa 0,9 sn'de çizilir (globals.css .ck-draw); hareket azaltılmışsa çizilmeden gelir. Hava sayfasındaki grafik (WindChart) değişmez.
const W = 340, L = 6, R = 22, T = 26, H = 132, B = 4;
// far: istasyon 10 km'den uzakta da (100 km'ye kadar) ölçüm çizilir (yarış sayfası; Seyhun 2026-10-26: "yarışın olduğu yerdeki gerçekleşmiş rüzgârı göremiyorum")
export function CockpitWind({ rows, date, place = null, far = false }) {
  const now = useNow();
  const today = YMD.format(now);
  const day = date || today;
  const ob = useWindObs(place || getPlace(), day, today, far); // place: başka yerin grafiği (yarış sayfası); yoksa hava yeri
  const radar = useRainRadar(day === today ? place || getPlace() : null); // yalnız bugün
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
  // Ölçülen ve tahmin (Seyhun 2026-10-27 "A · Ölçülen beyaz çizgi": "tahmin zaten baştan sona var, ölçülen bulunduğumuz saate kadar; daha net ayıralım"):
  // tahmin bütün gün dolu renkli alan; ölçülen (rüzgâr ve yağmur) şimdiye kadar üstüne binen noktalı BEYAZ çizgi, ölçülen sağanak ince beyaz kesik çizgi.
  // Yağmur (Seyhun 2026-10-28 "A · Saat saat çubuk": "orası çok karışık, daha sade ve doğru"): rüzgârın altında her saatte ince çubuk;
  // şimdiye kadar BEYAZ (yağan: son 2 saat radar, öncesi istasyon raporunun saatlik ortalaması), sonrası MAVİ (tahmin, mm/sa). Boy şiddet,
  // ölçek yazısı yok; yalnız en yüksek tahmin çubuğunun üstünde sayı. Üstte tek satır özet (rainLine): "8 mm yağdı · 16–18 arası kuvvetli,
  // 12 mm bekleniyor"; kuvvetli yağış (saatte 4 mm+) beklenirse özet kehribar (ayrı uyarı kutusu yok).
  // Altta TEK SATIR açıklama (Rüzgâr · Sağanak · Ölçülen · Yağmur · Yağan; yalnız grafikte olanlar).
  const spans = obsRain(ob?.rows, rows);
  const fc = rows.map((h) => (h.mm >= 0.1 ? h.mm : 0));
  const oSum = Math.round(spans.reduce((t, q) => t + q.mm, 0) * 10) / 10;
  // Radar (son 2 saat, 10 dakikada bir şiddet 1 hafif · 2 orta · 3 kuvvetli; mm değil): o saatin en şiddetlisi, yaklaşık mm/sa'e çevrilir
  const radH = {};
  for (const f of radar?.frames || []) {
    const k = rows.findIndex((h) => h.hh === HOUR.format(new Date(f.at)));
    if (k >= 0) radH[k] = Math.max(radH[k] ?? 0, Math.max(0, Math.min(3, f.level | 0)));
  }
  // Yağan (şimdiye kadar): radar varsa o saat radar, yoksa istasyon raporunun saatlik ortalaması; ikisi de yoksa o saat tahmin gösterilir
  const fell = rows.map((_, i) => {
    if (nowAt < 0 || i > nowAt) return null;
    if (radH[i] != null) return RADAR_MM[radH[i]];
    const sp = spans.find((q) => i >= q.a && i <= q.b);
    return sp ? sp.mm / (sp.b - sp.a + 1) : null;
  });
  const bars = rows.map((_, i) => (fell[i] != null ? { v: fell[i], fell: true } : { v: fc[i], fell: false }));
  const wetFc = fc.some(Boolean);
  const wet = bars.some((q) => q.v >= 0.1) || oSum >= 0.1;
  const rain = wet ? rainLine(rows, fc, nowAt, oSum, radH) : null;
  const BH = 40, BB = 38;
  const bmax = Math.max(4, ...bars.map((q) => q.v));
  const bh = (v) => Math.max(1.5, (v / bmax) * 30);
  const bw = (x(1) - x(0)) * 0.62;
  const pk = bars.reduce((m, q, i) => (!q.fell && q.v >= 0.1 && (nowAt < 0 || i > nowAt) && (m < 0 || q.v > bars[m].v) ? i : m), -1); // en yüksek tahmin saati
  const lx = (v) => Math.min(W - R - 8, Math.max(L + 8, v)); // yazı kenardan taşmasın
  const legend = [
    ["Rüzgâr", <i key="w" className="inline-block h-2.5 w-3.5 rounded-[3px] bg-[#67e8f9]" />],
    ["Sağanak", <i key="g" className="inline-block w-3.5 border-t-2 border-dashed border-[#c4b5fd]" />],
    got.length > 1 && ["Ölçülen", <i key="o" className="inline-block w-3.5 border-t-2 border-white" />],
    wet && wetFc && ["Yağmur", <i key="r" className="inline-block h-2.5 w-1.5 rounded-[2px] bg-[#60a5fa]" />],
    wet && bars.some((q) => q.fell && q.v >= 0.1) && ["Yağan", <i key="y" className="inline-block h-2.5 w-1.5 rounded-[2px] bg-white" />],
  ].filter(Boolean);
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
              stroke={(obs[i]?.wind ?? h.wind) >= 17 ? "#f4a64a" : "#fff"}
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
          {oGust && <path d={oGust} fill="none" stroke="#fff" strokeWidth="1.2" strokeDasharray="2 2.5" />}
          {got.length > 1 && <path d={oLine} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" data-kind="olculen" />}
          {got.length > 1 && got.map((o) => <circle key={`d${o.i}`} cx={x(o.i).toFixed(1)} cy={y(o.wind).toFixed(1)} r="2.2" fill="#fff" />)}
        </g>
        {nowV != null && (
          <g>
            <line x1={x(nowAt)} x2={x(nowAt)} y1={T - 6} y2={y(0)} stroke="#ff6b6b" strokeWidth="1.3" strokeDasharray="2 2" />
            <circle cx={x(nowAt)} cy={y(nowV)} r="9" fill="#ff6b6b" className="ck-pulse" />
            <circle cx={x(nowAt)} cy={y(nowV)} r="4.5" fill="#ff6b6b" stroke="#11203a" strokeWidth="2" />
          </g>
        )}
      </svg>
      {wet && (
        <>
          <p className="mt-1 flex items-baseline gap-2 text-[0.8125rem] font-semibold" aria-label="Yağmur özeti">
            <span className="shrink-0">Yağmur</span>
            <span className={`min-w-0 truncate font-medium ${rain.hot ? "text-[#e3b46c]" : "text-white/65"}`}>{rain.text}</span>
          </p>
          <svg viewBox={`0 0 ${W} ${BH}`} className="mt-0.5 block w-full" role="img" aria-label="Saatlik yağış">
            <g data-kind="tahmin">
              {bars.map((q, i) => (!q.fell && q.v >= 0.1 ? <rect key={i} x={(x(i) - bw / 2).toFixed(1)} y={(BB - bh(q.v)).toFixed(1)} width={bw.toFixed(1)} height={bh(q.v).toFixed(1)} rx="1.5" fill="#60a5fa" /> : null))}
            </g>
            <g data-kind="olculen">
              {bars.map((q, i) => (q.fell && q.v >= 0.1 ? <rect key={i} x={(x(i) - bw / 2).toFixed(1)} y={(BB - bh(q.v)).toFixed(1)} width={bw.toFixed(1)} height={bh(q.v).toFixed(1)} rx="1.5" fill="#fff" /> : null))}
            </g>
            {pk >= 0 && bars[pk].v >= 0.1 && (
              <text x={lx(x(pk)).toFixed(1)} y={(BB - bh(bars[pk].v) - 3).toFixed(1)} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{bars[pk].v >= 1 ? Math.round(bars[pk].v) : "<1"}</text>
            )}
            <line x1={L} x2={W - R} y1={BB} y2={BB} stroke="rgba(255,255,255,.15)" />
            {nowAt >= 0 && <line x1={x(nowAt)} x2={x(nowAt)} y1="2" y2={BB} stroke="#ff6b6b" strokeWidth="1.3" strokeDasharray="2 2" />}
          </svg>
        </>
      )}
      {/* 3 saatte bir: saat, gökyüzü, sıcaklık, "rüzgâr-sağanak" (kn, ölçülen de aynı biçimde); grafikteki saatin tam altında */}
      <div className="relative mt-1.5 h-[4.6rem]">
        {rows.map((h, k) => {
          if (+h.hh % 3) return null;
          const s = sky(h.code, h.day);
          const o = obs[k]; // geçmiş saatte ölçülen varsa onu yaz (beyaz), yoksa tahmin (soluk)
          return (
            <span key={h.time} className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-[3px] leading-none tabular-nums" style={{ left: `${(x(k) / W) * 100}%` }}>
              <span className="text-[0.6875rem] font-semibold text-white/55">{h.hh}</span>
              <Icon name={s.icon} className={`size-[1.05rem] ${CK_SKY[s.icon] || "text-white/80"}`} />
              <span className="text-[0.75rem] font-semibold">{h.t}°</span>
              <span className={`whitespace-nowrap text-[0.6875rem] font-bold ${got.length && !o ? "text-white/70" : ""}`}>{kn(o ? o.wind : h.wind, o ? o.gust : h.gust)}</span>
            </span>
          );
        })}
      </div>
      <p className="mt-1 flex flex-nowrap gap-2.5 whitespace-nowrap text-[0.6875rem] text-white/70" aria-label="Grafik açıklaması">
        {legend.map(([t, i]) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            {i}
            {t}
          </span>
        ))}
      </p>
    </div>
  );
}

// Ölçülen yağış kutuları: istasyon satırlarındaki rain { mm, h } (raporun saatinde biten h saat) → grafikte [a, b] saat aralığı ve mm.
// Kısa süreli rapor önce yerleşir; üst üste binen uzun süreli rapor atlanır.
function obsRain(obs, rows) {
  const at = (hh) => rows.findIndex((r) => r.hh === hh);
  const list = (obs || [])
    .filter((o) => o.rain && o.rain.mm != null && o.rain.h > 0)
    .map((o) => {
      const end = at(o.hh);
      return end < 0 ? null : { a: Math.max(0, end - o.rain.h), b: end - 1, mm: o.rain.mm, h: o.rain.h };
    })
    .filter((sp) => sp && sp.b >= sp.a)
    .sort((p, q) => p.h - q.h);
  const out = [];
  for (const sp of list) if (!out.some((o) => sp.a <= o.b && o.a <= sp.b)) out.push(sp);
  return out.sort((p, q) => p.a - q.a);
}

// Lacivert zeminde gökyüzü simgelerinin rengi
const CK_SKY = { sun: "text-amber-300", cloudSun: "text-amber-200", moon: "text-indigo-200", cloud: "text-slate-300", fog: "text-slate-300", rain: "text-sky-300", snow: "text-sky-100", storm: "text-amber-300" };
