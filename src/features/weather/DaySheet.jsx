"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useNow } from "@/hooks/useNow";
import { PLACE, compareLinks, dayHours, getPlace, nowOf, placeLabel, sky, skyBand, windLevel, windName } from "./weather";
import { todayStr } from "@/lib/utils/format";
import { Col, WindArrow } from "./parts";
import { WindMapView } from "./WindMap";
import { useWindObs } from "./useWindObs";

const YMD = new Intl.DateTimeFormat("en-CA", { timeZone: PLACE.tz });
const HOUR = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: PLACE.tz });
const HM = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: PLACE.tz });

// Saatlik rüzgâr grafiği: dolu alan = rüzgâr, kesikli = sağanak; 7/17/22 kn çizgileri yelken eşikleri.
// Parmakla sürükleyince seçilen saatin değerleri üstte yazar. Bugünde "şimdi" noktası şu anki dakikaya göre çizginin üstünde durur.
// mini: ana sayfadaki küçük hâli (alçak, dokunuşla seçim yok; dokununca pencere açılır).
// İki hâlde de üstte her saat rüzgârın estiği yöne bakan ok (17 kn ve üstü turuncu) ve altında gökyüzü şeridi
// (Seyhun: "rüzgâr ya da sağanak artış azalışlarında ne taraftan geldiğini, hava açık mı kapalı mı görmek istiyorum").
// marks: ölçülen rüzgâr (yarış multimedya sayfası; elle ya da ileride cihazdan) [{ i: saat sırası (kesirli), kn }]: içi boş yuvarlak.
// obs: istasyonun gerçekleşen rüzgârı, saat sırasına göre (obs[i] = { wind, gust } ya da boş). Tahmin bütün gün kendi çizgisinde kesintisiz gider,
// ölçülen onun arkasında mavi gölge olarak gelir (Seyhun: "tahmin kendi çizgisinde devam etsin, gerçekleşen arkadan gölge gibi gelsin, kırılma olmasın").
const W = 340, L = 22, R = 6; // grafik genişliği ve sol/sağ boşluk (saat simgeleri de buna göre dizilir)
export const OBS = "#3f74ad";
function WindChart({ rows, sel, onSel, nowAt = -1, mini = false, marks = [], obs = [] }) {
  const H = mini ? 110 : 182, T = 40, B = 16;
  const n = rows.length;
  const got = obs.map((o, i) => o && { i, ...o }).filter(Boolean);
  const top = Math.max(15, Math.ceil((Math.max(...rows.map((h) => h.gust), ...marks.map((m) => m.kn), ...got.map((o) => o.gust ?? o.wind)) + 2) / 5) * 5);
  const x = (i) => L + (i * (W - L - R)) / Math.max(1, n - 1);
  const y = (v) => T + (1 - v / top) * (H - T - B);
  const path = (pts) => pts.map(([i, v], k) => `${k ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const line = (k) => path(rows.map((h, i) => [i, h[k]]));
  const area = `${line("wind")}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const oLine = path(got.map((o) => [o.i, o.wind]));
  const pick = (e) => {
    const b = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - b.left) / b.width) * W;
    onSel(Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1)))));
  };
  const s = rows[sel];
  // Şimdi: saatler arası doğrusal ara değer (14:30 → 14 ile 15'in ortası)
  const nowI = Math.floor(nowAt);
  const nowV = nowAt >= 0 && rows[nowI] ? rows[nowI].wind + ((rows[nowI + 1]?.wind ?? rows[nowI].wind) - rows[nowI].wind) * (nowAt - nowI) : null;
  const nx = nowV != null ? L + (nowAt * (W - L - R)) / Math.max(1, n - 1) : 0;
  const ny = nowV != null ? y(nowV) : 0;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full select-none ${mini ? "pointer-events-none" : "touch-pan-y"}`}
      onPointerDown={mini ? undefined : pick}
      onPointerMove={mini ? undefined : pick}
      onTouchStart={mini ? undefined : (e) => e.stopPropagation()}
      role="img"
      aria-label="Saatlik rüzgâr grafiği"
    >
      {[7, 17, 22].filter((v) => v < top).map((v) => (
        <g key={v} className="text-mut">
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity=".25" strokeDasharray="2 3" />
          <text x={L - 4} y={y(v) + 3} textAnchor="end" fontSize="9" fill="currentColor">{v}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className="text-line" stroke="currentColor" />
      {rows.map((h, i) => (
        <path
          key={`a${h.time}`}
          d="M0,-5.5L0,5.5M-3.2,2.3L0,5.5L3.2,2.3"
          transform={`translate(${x(i).toFixed(1)},12) rotate(${(((obs[i]?.dir ?? h.dir ?? 0) + 180) % 360).toFixed(0)})`}
          fill="none"
          stroke={h.wind >= 17 ? "#d9822b" : "#2f8f76"}
          strokeWidth={i === sel ? 2 : 1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {rows.map((h, i) => {
        const half = (W - L - R) / Math.max(1, n - 1) / 2;
        const a = Math.max(L, x(i) - half), b = Math.min(W - R, x(i) + half);
        return <rect key={`s${h.time}`} x={a.toFixed(1)} y="24" width={(b - a + 0.4).toFixed(1)} height="7" fill={skyBand(h.code, h.rain)} />;
      })}
      {rows.map((h, i) =>
        +h.hh % 6 === 0 ? (
          <text key={h.time} x={x(i)} y={H - 4} textAnchor="middle" fontSize="9" className="fill-mut">{h.hh}</text>
        ) : null,
      )}
      <path d={area} className="text-acc" fill="currentColor" fillOpacity=".14" />
      {got.length > 0 && (
        <g>
          {got.length > 1 && <path d={`${oLine}L${x(got[got.length - 1].i)},${y(0)}L${x(got[0].i)},${y(0)}Z`} fill={OBS} fillOpacity=".22" />}
          {got.length > 1 ? (
            <path d={oLine} fill="none" stroke={OBS} strokeOpacity=".7" strokeWidth="1.25" strokeLinejoin="round" />
          ) : (
            <circle cx={x(got[0].i)} cy={y(got[0].wind)} r="3" fill={OBS} fillOpacity=".7" />
          )}
        </g>
      )}
      <path d={line("wind")} className="text-acc" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d={line("gust")} className="text-mut" fill="none" stroke="currentColor" strokeWidth="1.25" strokeDasharray="3 3" />
      {s && !mini && (
        <g>
          <line x1={x(sel)} x2={x(sel)} y1={T} y2={y(0)} className="text-fg" stroke="currentColor" strokeOpacity=".3" />
          <circle cx={x(sel)} cy={y(s.gust)} r="2.5" className="fill-mut" />
          <circle cx={x(sel)} cy={y(s.wind)} r="3.5" className="fill-acc stroke-card" strokeWidth="1.5" />
          {obs[sel] && <circle cx={x(sel)} cy={y(obs[sel].wind)} r="3.5" fill={OBS} className="stroke-card" strokeWidth="1.5" />}
        </g>
      )}
      {marks.map((m, k) => (
        <circle key={`m${k}`} cx={(L + (m.i * (W - L - R)) / Math.max(1, n - 1)).toFixed(1)} cy={y(m.kn).toFixed(1)} r="3.6" className="fill-card stroke-fg" strokeWidth="1.6" />
      ))}
      {nowV != null && (
        <g className="text-rec">
          <line x1={nx} x2={nx} y1={ny} y2={y(0)} stroke="currentColor" strokeOpacity=".45" strokeDasharray="2 2" />
          <circle cx={nx} cy={ny} r="8" fill="currentColor" fillOpacity=".18" />
          <circle cx={nx} cy={ny} r="4.5" fill="currentColor" className="stroke-card" strokeWidth="2" />
          <text x={Math.min(W - R - 12, Math.max(L + 12, nx))} y={Math.max(T + 7, ny - 11)} textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">şimdi</text>
        </g>
      )}
    </svg>
  );
}

// Ana sayfadaki bugünün rüzgâr grafiği (Seyhun: "ana sayfadaki hava alanında o grafiği gösterelim, hangi saatteysek orada nokta").
// Şu anki dakikaya göre kırmızı "şimdi" noktası; üstte hava penceresindeki gibi saatlik yön okları ve gökyüzü şeridi
// (Seyhun: "hava durumu sayfasındaki gibi yap"; eski üç saatlik simge satırı bu şerit gelince kalktı). Dokununca üstteki sarmalayıcı hava penceresini açar.
// Yakında istasyon varsa (Dikili) geçmiş saatlerde ölçülen rüzgâr tahminin arkasında mavi gölge.
export function TodayWind({ rows }) {
  const now = useNow();
  const today = YMD.format(now);
  const ob = useWindObs(getPlace(), today, today);
  if (!rows?.length) return null;
  const i = rows.findIndex((h) => h.hh === HOUR.format(now));
  const nowAt = i >= 0 ? Math.min(rows.length - 1, i + now.getMinutes() / 60) : -1;
  const obs = rows.map((h) => ob?.rows?.find((o) => o.hh === h.hh));
  return <WindChart rows={rows} sel={-1} onSel={() => {}} nowAt={nowAt} mini obs={obs} />;
}

// Seçili saatin rüzgârı, rüzgâr haritasındaki kutu düzeninde: büyük sayı, kn, yön oku, yön adı; altında ölçülen/tahmin ve sağanak
function Reading({ label, kn, dir, gust, color }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl bg-bg px-3 py-2">
      <span className="block text-[0.6875rem] font-semibold" style={color ? { color } : undefined}>{label}</span>
      <span className="mt-0.5 flex items-center gap-1.5">
        <b className={`text-[1.375rem] font-bold leading-none tabular-nums ${color ? "" : windLevel(kn).tone}`} style={color ? { color } : undefined}>{kn}</b>
        <span className="text-[0.6875rem] font-semibold text-mut">kn</span>
        {dir != null && <WindArrow deg={dir} className="size-4" />}
        {dir != null && <b className="truncate text-[0.8125rem] font-semibold">{windName(dir)[0]}</b>}
      </span>
      {gust != null && <span className="mt-0.5 block text-[0.6875rem] text-mut tabular-nums">sağanak {gust}</span>}
    </div>
  );
}

// Bir günün detayı: özet, rüzgâr grafiği, 3 saatte bir hava. `cur` (şu anki hava) verilirse bugünün özeti şimdiki değerlerle yazılır.
// at: { lat, lon } verilirse yakında (10 km) istasyon varsa gerçekleşen rüzgâr da çizilir (useWindObs).
export function DayDetail({ date, rows, info, cur, marks = [], place = "", at = null }) {
  const now = useNow();
  const isToday = YMD.format(now) === date;
  const ob = useWindObs(at, date, YMD.format(now));
  const obs = rows.map((h) => ob?.rows?.find((o) => o.hh === h.hh));
  const last = ob?.rows?.[ob.rows.length - 1];
  const nowIdx = isToday ? rows.findIndex((h) => h.hh === HOUR.format(now)) : -1;
  const nowAt = nowIdx >= 0 ? Math.min(rows.length - 1, nowIdx + now.getMinutes() / 60) : -1;
  const peak = rows.reduce((a, h) => (h.wind > a.wind ? h : a), rows[0]);
  // Dokunulmadıkça seçili saat şimdiyi izler (sayfa saatlerce açık kalsa da), grafikte ayrı yeşil çizgi çıkmaz: işaret kırmızı "şimdi" noktası.
  // Parmakla saat seçilince o saat kalır; "Şimdi" düğmesi yeniden izlemeye döndürür (Seyhun: "şimdiyle neden o çizgi farklı yerde?").
  const [pick, setPick] = useState(null);
  const follow = pick == null && nowIdx >= 0;
  const sel = pick ?? (nowIdx >= 0 ? nowIdx : rows.indexOf(peak));
  const s = rows[sel] || peak;
  const min = Math.min(...rows.map((h) => h.t));
  const max = Math.max(...rows.map((h) => h.t));
  const code = info?.code ?? peak.code;
  const got = [...marks].reverse().find((m) => m.hh === s.hh); // seçili saatte ölçülen (son kayıt)
  const o = obs[sel]; // seçili saatte istasyonun ölçtüğü

  return (
    <div className="pb-2">
      {place && <p className="mb-2 truncate text-[0.875rem] font-semibold">{place}</p>}
      {/* Özet: bugünde şimdiki hava büyük, yanında gün içi en düşük–en yüksek ve şimdiki rüzgâr */}
      {isToday && cur ? (
        <div className="flex items-center gap-3">
          <Icon name={sky(cur.code, cur.day).icon} className="size-11 shrink-0 text-acc" />
          <div className="min-w-0 flex-1">
            <p className="text-[2rem] font-semibold leading-none tabular-nums">{cur.t}°</p>
            <p className="mt-1 text-[0.8125rem] text-mut">{sky(cur.code, cur.day).label} · <span className="tabular-nums">{min}–{max}°</span></p>
          </div>
          <div className="shrink-0 text-right">
            <p className={`text-[1.125rem] font-semibold leading-none tabular-nums ${windLevel(cur.wind).tone}`}>{cur.wind} kn</p>
            <p className="mt-1 text-[0.75rem] text-mut tabular-nums">{windName(cur.dir)[0]} · sağanak {cur.gust}</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Icon name={sky(code).icon} className="size-8 shrink-0 text-acc" />
          <div className="min-w-0">
            <p className="text-[1.25rem] font-semibold leading-tight tabular-nums">{min}–{max}°</p>
            <p className="text-[0.8125rem] text-mut">{sky(code).label}</p>
          </div>
        </div>
      )}

      {/* Seçili saat: saat, hava; altında rüzgâr haritasındaki gibi kutular (Seyhun: "o tasarımı başlıkta kullanalım, ölçülen ve tahmin net görünsün") */}
      <div className="mt-4 flex min-h-7 items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[0.8125rem] tabular-nums">
          <span className="font-semibold">{s.hh}:00</span>
          <span className="text-mut"> · {s.t}° · {sky(s.code, s.day).label}{s.rain != null && s.rain >= 10 ? ` · yağmur %${s.rain}` : ""}</span>
        </p>
        {/* Grafikte gezindikten sonra tek dokunuşla şimdiye dönüş (Seyhun: "sonra şimdiye gitmesini istiyorum") */}
        {nowIdx >= 0 && !follow && (
          <button type="button" onClick={() => setPick(null)} className="shrink-0 rounded-full bg-rec/10 px-3 py-1 text-[0.75rem] font-semibold text-rec active:scale-95">
            Şimdi
          </button>
        )}
      </div>
      <div className="mt-1.5 flex gap-2">
        {o && <Reading label="Ölçülen" kn={o.wind} dir={o.dir ?? s.dir} gust={o.gust} color={OBS} />}
        {!o && got && <Reading label="Ölçülen" kn={got.kn} dir={s.dir} color={OBS} />}
        <Reading label="Tahmin" kn={s.wind} dir={s.dir} gust={s.gust} />
      </div>
      <div className="mt-1">
        <WindChart rows={rows} sel={follow ? -1 : sel} onSel={setPick} nowAt={nowAt} marks={marks} obs={obs} />
      </div>
      {ob?.station && (
        <p className="text-[0.6875rem] text-mut tabular-nums">
          {ob.station.near
            ? `Ölçüm: ${ob.station.name} istasyonu · ${String(ob.station.km).replace(".", ",")} km · ${last ? `son ${HM.format(new Date(last.at))}` : "henüz veri yok"}`
            : `Yakında ölçüm istasyonu yok (en yakını ${Math.round(ob.station.km)} km); yalnız tahmin`}
        </p>
      )}
      <p className="flex items-center justify-end gap-2 text-[0.6875rem] text-mut">
        {last && <><span className="inline-block h-2 w-3 rounded-sm" style={{ background: OBS, opacity: 0.45 }} /> ölçülen</>}
        <span className="inline-block h-0.5 w-3 rounded bg-acc" /> {last ? "tahmin" : "rüzgâr"}
        <span className="inline-block w-3 border-t border-dashed border-mut" /> sağanak
        {nowIdx >= 0 && <><span className="inline-block size-2 rounded-full bg-rec" /> şimdi</>}
        {marks.length > 0 && <><span className="inline-block size-2 rounded-full border border-fg" /> ölçülen</>}
        <span>· parmağınla kaydır</span>
      </p>
      <p className="mt-1 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[0.6875rem] text-mut">
        {[["#e9b949", "açık"], ["#f1d37e", "az bulutlu"], ["#c9cfd6", "parçalı"], ["#8f98a3", "kapalı"], ["#4f7fae", "yağmur"]].map(([c, t]) => (
          <span key={t} className="flex items-center gap-1"><span className="inline-block h-1.5 w-3 rounded-sm" style={{ background: c }} />{t}</span>
        ))}
      </p>

      {/* 3 saatte bir */}
      <div className="mt-3 grid grid-cols-8 gap-0.5 border-t border-line pt-2.5">
        {rows.filter((h) => +h.hh % 3 === 0).map((h) => (
          <Col key={h.time} label={h.hh} icon={sky(h.code, h.day).icon} temp={h.t} wind={h.wind} gust={h.gust} dir={h.dir} />
        ))}
      </div>
      <p className="mt-3 text-center text-[0.6875rem] text-mut">rüzgâr knot · yelken: 7–16 kn uygun, 17–21 sert, 22+ riskli</p>
    </div>
  );
}

const SHORT = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: PLACE.tz });
const ago = (ms) => {
  const m = Math.round((Date.now() - ms) / 60000);
  return m < 2 ? "az önce" : m < 60 ? `${m} dk önce` : `${Math.round(m / 60)} sa önce`;
};

// Hava detayı: önce seçili günün özeti ve rüzgâr grafiği (bugün açılır), altında gün seçici, rüzgâr haritası, kaynak
export function WeatherDetail({ w, refresh, busy }) {
  // Veri dünden kaldıysa (gece yarısını geçti, yenileme gelmedi) gün listesi bugünden başlar
  const now = todayStr();
  const all = [{ date: w.today?.date, code: w.today?.code, min: w.today?.min, max: w.today?.max, wind: w.today?.wind }, ...(w.days || [])].filter((d) => d.date && d.date >= now);
  const days = all.length ? all : [{ date: w.today?.date, code: w.today?.code, min: w.today?.min, max: w.today?.max, wind: w.today?.wind }];
  const today = days[0].date;
  const [sel, setSel] = useState(today);
  const rows = dayHours(w, sel) || [];
  const info = days.find((d) => d.date === sel);
  const place = getPlace();
  const links = compareLinks(place);
  const [about, setAbout] = useState(false);
  const [cmp, setCmp] = useState(false);
  return (
    <div>
      <div>{rows.length ? <DayDetail key={sel} date={sel} rows={rows} info={info} cur={sel === today ? nowOf(w) : null} at={place} /> : <p className="py-6 text-center text-[0.875rem] text-mut">Bu günün saatlik verisi yok.</p>}</div>

      {/* Gün seçici: bugün + 5 gün */}
      <div className="-mx-1 mt-2 grid grid-cols-6 gap-1 border-t border-line pt-3">
        {days.map((d, i) => {
          const on = d.date === sel;
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => setSel(d.date)}
              aria-pressed={on}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-0.5 py-2 text-center transition active:scale-95 ${on ? "bg-deep text-white" : "bg-bg"}`}
            >
              <span className={`text-[0.6875rem] font-semibold ${on ? "text-white/80" : "text-mut"}`}>{i === 0 ? "Bugün" : SHORT.format(new Date(`${d.date}T12:00:00`))}</span>
              <Icon name={sky(d.code).icon} className={`size-5 ${on ? "" : "text-acc"}`} />
              <span className="text-[0.8125rem] font-semibold tabular-nums">{d.max}°</span>
              <span className={`text-[0.6875rem] tabular-nums ${on ? "text-white/75" : "text-mut"}`}>{d.min}°</span>
              <span className={`text-[0.6875rem] font-semibold tabular-nums ${on ? "text-white" : windLevel(d.wind).tone}`}>{d.wind} kn</span>
            </button>
          );
        })}
      </div>

      {/* Rüzgâr haritası: seçili gün; ↗ tam sayfayı açar */}
      <div className="mt-3">
        <WindMapView embed date={sel} />
      </div>

      {/* Kaynak: tek satır. "Karşılaştır" MGM ve Windy'yi, "i" kaynak ayrıntısını açar */}
      <div className="mt-2 rounded-2xl bg-bg px-3.5 py-2 text-[0.75rem] leading-snug text-mut">
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate">
            <b className="font-semibold text-fg">{placeLabel(place)}</b> · {ago(w.at)}
          </span>
          <button
            type="button"
            onClick={() => setCmp((v) => !v)}
            aria-expanded={cmp}
            className={`h-8 rounded-full px-3 font-semibold ring-1 ${cmp ? "bg-acc text-white ring-acc" : "bg-card text-acc ring-line"}`}
          >
            Karşılaştır
          </button>
          <button
            type="button"
            onClick={() => setAbout((v) => !v)}
            aria-label="Kaynak"
            aria-expanded={about}
            className={`grid size-8 place-items-center rounded-full text-[0.875rem] font-bold italic ring-1 ${about ? "bg-acc text-white ring-acc" : "bg-card text-acc ring-line"}`}
          >
            i
          </button>
          <button type="button" onClick={() => refresh(true)} disabled={busy} aria-label="Yenile" className="grid size-8 place-items-center rounded-full bg-card text-acc ring-1 ring-line disabled:opacity-50">
            <Icon name="load" className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
          </button>
        </div>
        {cmp && (
          <p className="mt-2 flex gap-2 border-t border-line pt-2">
            <a href={links.mgm} target="_blank" rel="noopener noreferrer" className="flex h-8 flex-1 items-center justify-center rounded-full bg-card font-semibold text-acc ring-1 ring-line">
              MGM
            </a>
            <a href={links.windy} target="_blank" rel="noopener noreferrer" className="flex h-8 flex-1 items-center justify-center rounded-full bg-card font-semibold text-acc ring-1 ring-line">
              Windy
            </a>
          </p>
        )}
        {about && (
          <p className="mt-2 border-t border-line pt-2">
            Kaynak: Open-Meteo (ECMWF, ICON, GFS gibi resmi meteoroloji modellerinin birleşimi)
            {w.model?.elevation != null ? ` · model noktası ${w.model.lat?.toFixed(2)}, ${w.model.lon?.toFixed(2)} (${Math.round(w.model.elevation)} m)` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
