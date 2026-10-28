"use client";

import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { useWindObs } from "@/features/weather/useWindObs";
import { useRainRadar } from "@/features/weather/useRainRadar";
import { PLACE, getPlace, heavyRain, kn, sky } from "@/features/weather/weather";

const YMD = new Intl.DateTimeFormat("en-CA", { timeZone: PLACE.tz });
const HOUR = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: PLACE.tz });
const MIN = new Intl.DateTimeFormat("en-GB", { minute: "2-digit", timeZone: PLACE.tz });
const RADAR = ["", "#7dd3fc", "#38bdf8", "#818cf8"]; // hafif · orta · kuvvetli
const RADAR_TX = ["", "hafif", "orta", "kuvvetli"];

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
  // Yağmur grafiği (aynı gün "yağmuru da grafik yapalım, kaç mm olduğunu gösterelim"): rüzgârın altında mavi alan (saatlik mm, sağda mm ölçeği),
  // en yüksek saatte "N mm/sa"; ölçülen yağmur istasyon raporundan (çoğunlukla 3/6 saatlik toplam, o saatlere bölünür) beyaz çizgi + "N mm geldi".
  // Saatte 4 mm ve üstü beklenirse grafiğin üstünde kehribar uyarı satırı (gerçek uyarı). Eski önbellekte mm yoksa yağmur grafiği çıkmaz.
  // Altta TEK SATIR açıklama (Rüzgâr · Sağanak · Yağmur · Ölçülen; yalnız grafikte olanlar).
  const heavy = heavyRain(rows);
  const spans = obsRain(ob?.rows, rows);
  const fc = rows.map((h) => (h.mm >= 0.1 ? h.mm : 0));
  const om = rows.map((_, i) => {
    const sp = spans.find((q) => i >= q.a && i <= q.b);
    return sp ? sp.mm / (sp.b - sp.a + 1) : null;
  });
  const oFrom = spans.length ? spans[0].a : -1, oTo = spans.length ? spans[spans.length - 1].b : -1;
  const oPts = oFrom < 0 ? [] : rows.map((_, i) => i).filter((i) => i >= oFrom && i <= oTo).map((i) => [i, om[i] ?? 0]);
  const oSum = Math.round(spans.reduce((t, q) => t + q.mm, 0) * 10) / 10;
  const wetFc = fc.some(Boolean);
  // Radar (Seyhun 2026-10-28 "Evet, böyle yap": istasyon yağışı saatlerce geriden geliyordu): son 2 saat, 10 dakikada bir dolu kutu,
  // boyu ve rengi şiddet (1 hafif, 2 orta, 3 kuvvetli; mm değil). İstasyonun ölçtüğü yağmur olduğu gibi kalır.
  const rad = (radar?.frames || [])
    .map((f) => {
      const d = new Date(f.at);
      const k = rows.findIndex((h) => h.hh === HOUR.format(d));
      return k < 0 ? null : { at: k + +MIN.format(d) / 60, level: Math.max(0, Math.min(3, f.level | 0)) };
    })
    .filter((f) => f && f.level > 0);
  const radTop = rad.reduce((m, f) => Math.max(m, f.level), 0);
  const wet = wetFc || oSum >= 0.1 || rad.length > 0;
  const RH = 84, RT = 16, RB = 3;
  const rmax = Math.max(4, ...fc, ...oPts.map((q) => q[1]));
  const ry = (v) => RT + (1 - v / rmax) * (RH - RT - RB);
  const rTicks = (rmax > 10 ? [5, 10, 15, 20, 30] : [2, 4, 6, 8, 10]).filter((v) => v < rmax);
  const rPath = (pts) => pts.map(([i, v], k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${ry(v).toFixed(1)}`).join("");
  const fLine = rPath(fc.map((v, i) => [i, v]));
  const pk = fc.indexOf(Math.max(...fc));
  const oTop = oPts.reduce((m, q) => (q[1] > m[1] ? q : m), [oFrom, 0]);
  const lx = (v) => Math.min(W - R - 26, Math.max(L + 26, v)); // yazı kenardan taşmasın
  const mmTxt = (v) => (v >= 1 ? String(Math.round(v)) : "<1");
  const legend = [
    ["Rüzgâr", <i key="w" className="inline-block h-2.5 w-3.5 rounded-[3px] bg-[#67e8f9]" />],
    ["Sağanak", <i key="g" className="inline-block w-3.5 border-t-2 border-dashed border-[#c4b5fd]" />],
    wetFc && ["Yağmur", <i key="r" className="inline-block h-2.5 w-3.5 rounded-[3px] bg-[#3b82f6]" />],
    (got.length > 1 || oSum >= 0.1) && ["Ölçülen", <i key="o" className="inline-block w-3.5 border-t-2 border-white" />],
    rad.length > 0 && ["Radar", <i key="rd" className="inline-block h-2.5 w-1.5 rounded-[2px] bg-[#38bdf8]" />],
  ].filter(Boolean);
  return (
    <div className="ck-wind">
      {heavy && (
        <p className="mb-2 flex items-start gap-2 rounded-xl bg-[rgba(227,180,108,.13)] px-3 py-2 text-[0.8125rem] font-semibold text-[#e3b46c]">
          <span className="mt-[0.35rem] size-2 shrink-0 rounded-full bg-[#e3b46c]" />
          <span>Kuvvetli yağış {heavy.from}–{heavy.to} · günde {heavy.total} mm</span>
        </p>
      )}
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
        <svg viewBox={`0 0 ${W} ${RH}`} className="mt-1 block w-full" role="img" aria-label="Saatlik yağış, mm">
          {rTicks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={ry(v)} y2={ry(v)} stroke="rgba(255,255,255,.08)" />
              <text x={W - 2} y={ry(v) + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,.5)">{v}</text>
            </g>
          ))}
          <text x={W - 2} y="9" textAnchor="end" fontSize="9" fill="rgba(255,255,255,.5)">mm</text>
          {wetFc && (
            <g data-kind="tahmin">
              <path d={`${fLine}L${x(n - 1)},${ry(0)}L${x(0)},${ry(0)}Z`} fill="#3b82f6" fillOpacity=".75" />
              <path d={fLine} fill="none" stroke="#60a5fa" strokeWidth="1.4" strokeLinejoin="round" />
              <text x={lx(x(pk)).toFixed(1)} y={(ry(fc[pk]) - 4).toFixed(1)} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{mmTxt(fc[pk])} mm/sa</text>
            </g>
          )}
          <line x1={L} x2={W - R} y1={ry(0)} y2={ry(0)} stroke="rgba(255,255,255,.15)" />
          {oPts.length > 0 && (
            <g data-kind="olculen">
              <path d={rPath(oPts)} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
              {oPts.map(([i, v]) => <circle key={`r${i}`} cx={x(i).toFixed(1)} cy={ry(v).toFixed(1)} r="2.2" fill="#fff" />)}
              {oSum >= 0.1 && <text x={lx(x(oTop[0])).toFixed(1)} y={(ry(oTop[1]) - 6).toFixed(1)} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{mmTxt(oSum)} mm geldi</text>}
            </g>
          )}
          {rad.length > 0 && (
            <g data-kind="radar">
              {rad.map((f) => {
                const bw = (x(1) - x(0)) / 6;
                const hgt = f.level * 14;
                return <rect key={f.at} x={(x(f.at) - bw / 2).toFixed(1)} y={(ry(0) - hgt).toFixed(1)} width={(bw + 0.3).toFixed(1)} height={hgt} fill={RADAR[f.level]} stroke="#0f1f38" strokeOpacity=".35" strokeWidth=".3" />;
              })}
              <text x={lx(x((rad[0].at + rad[rad.length - 1].at) / 2)).toFixed(1)} y={(ry(0) - 3 * 14 - 4).toFixed(1)} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">
                radar · {RADAR_TX[radTop]}
              </text>
            </g>
          )}
          {nowAt >= 0 && <line x1={x(nowAt)} x2={x(nowAt)} y1="4" y2={ry(0)} stroke="#ff6b6b" strokeWidth="1.3" strokeDasharray="2 2" />}
        </svg>
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
