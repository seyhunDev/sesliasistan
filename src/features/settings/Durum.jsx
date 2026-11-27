"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { buttonClass } from "@/components/ui/buttonClass";
import { Sheet } from "@/components/ui/Sheet";
import { authFetch } from "@/lib/authFetch";
import { spendOf } from "@/lib/aiPrice";
import { SERVICE_LINKS, monthName, servicesOf, ttsUsage, usageRows } from "@/lib/aiUsage";
import { SERVER, levelOf, snapshot, subscribe } from "@/lib/energyMeter";
import { readOpens } from "@/lib/openTime";
import { lastDays } from "@/lib/visitStats";
import { DeviceDataRow, measureDevice } from "./DeviceData";
import { EnergyRow } from "./Energy";
import { SpendList } from "./Spend";
import { readBudget } from "./Usage";
import { Group, Mini, Row } from "./ui";

// Ayarlar › Durum (ana hesap; Sahne + grafikler, örnek project-files/ayarlar-sade/sahne-grafik/ornek.html, Seyhun 2026-11-26 "yap"):
// büyük Harcama kartı (bütçe halkası, gün gün çubuk, servis şeridi, Ayrıntı · Fatura), Açılış (son açılışlar çizgisi), Telefonda
// (video/evrak/uygulama şeridi), İstekler (en çok 3 iş), Enerji (son ölçüm; ayrı "Ölçüm" bölümü kalktı), Canlı yayın (30 gün gün gün).
// Telefonda 2 sütun, dik iPad ve üstünde 4 sütun (Harcama 2×2). Sayfa açılınca bir kez okunur.
const sec = (ms) => (ms / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
const n0 = (n) => Math.round(Number(n) || 0).toLocaleString("tr-TR");
const CARD = "flex min-w-0 flex-col gap-1.5 rounded-[1.25rem] border border-line bg-card p-3.5 text-left";

// /api/usage?ai=1 bir kez okunur; Durum ve Seslendirme kotası satırı aynı cevabı kullanır (bir dakika saklanır)
let usageAt = 0;
let usageP = null;
export function useUsage() {
  const [j, setJ] = useState(null);
  useEffect(() => {
    let on = true;
    if (!usageP || Date.now() - usageAt > 60e3) {
      usageAt = Date.now();
      usageP = authFetch("/api/usage?ai=1")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
    }
    usageP.then((x) => on && setJ(x));
    return () => {
      on = false;
    };
  }, []);
  return j;
}

function Head({ label, right }) {
  return (
    <span className="flex items-baseline justify-between gap-2 text-[0.75rem] font-semibold text-mut">
      <span className="truncate">{label}</span>
      {right && <span className="shrink-0 tabular-nums">{right}</span>}
    </span>
  );
}

function Big({ value, unit, size = "text-[2rem]" }) {
  return (
    <span className="block truncate">
      <b className={`sahne-t tabular-nums ${size}`}>{value ?? "–"}</b>
      {unit && <span className="ml-1 text-[0.75rem] font-semibold text-mut">{unit}</span>}
    </span>
  );
}

function Tile({ onClick, href, className = "", children }) {
  const cls = `${CARD} ${className}`;
  if (href)
    return (
      <Link href={href} data-press className={cls}>
        {children}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" data-press onClick={onClick} className={cls}>
        {children}
      </button>
    );
  return <div className={cls}>{children}</div>;
}

// Renkli tek şerit (parçalar oranında) ve altında küçük açıklama
function Stack({ parts }) {
  const on = parts.filter((p) => p.v > 0);
  if (!on.length) return null;
  return (
    <span className="flex h-2 gap-[2px] overflow-hidden rounded-full" aria-hidden="true">
      {on.map((p) => (
        <i key={p.k} className="h-full" style={{ flex: p.v, background: p.c }} />
      ))}
    </span>
  );
}
function Legend({ parts }) {
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5 text-[0.6875rem] text-mut">
      {parts.map((p) => (
        <span key={p.k} className="whitespace-nowrap">
          {p.c && <i className="mr-1 inline-block size-2 rounded-[2px] align-[0px]" style={{ background: p.c }} />}
          {p.k} {p.t && <b className="font-semibold text-fg2">{p.t}</b>}
        </span>
      ))}
    </span>
  );
}

// Bütçe halkası: harcanan yüzde
function Ring({ pct }) {
  const r = 24;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 60 60" className="size-[3.75rem] shrink-0" aria-label={`Bütçenin %${pct}'i`}>
      <circle cx="30" cy="30" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
      <circle
        cx="30"
        cy="30"
        r={r}
        fill="none"
        stroke={pct >= 100 ? "var(--warn)" : "var(--acc)"}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(c * p) / 100} ${c}`}
        transform="rotate(-90 30 30)"
      />
      <text x="30" y="34.5" textAnchor="middle" fill="var(--fg)" fontSize="13" fontWeight="700" className="tabular-nums">
        %{pct}
      </text>
    </svg>
  );
}

// Bu ayın günleri: bugün limon, kesik çizgi günlük ortalama bütçe
function Bars({ days, today, budget }) {
  const last = Number(String(today).slice(8, 10)) || 0;
  if (!last) return null;
  const by = new Map(days);
  const vals = Array.from({ length: last }, (_, i) => by.get(i + 1) || 0);
  const perDay = budget > 0 ? budget / 30 : 0;
  const max = Math.max(...vals, perDay, 0.01) * 1.1;
  return (
    <span className="relative flex h-12 items-end gap-[2px]" aria-hidden="true">
      {vals.map((v, i) => (
        <i key={i} className={`flex-1 rounded-[1px] ${i === last - 1 ? "bg-acc" : "bg-mut/35"}`} style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />
      ))}
      {perDay > 0 && <span className="absolute inset-x-0 border-t border-dashed border-warn/80" style={{ bottom: `${(perDay / max) * 100}%` }} />}
    </span>
  );
}

// Son açılışlar (eskiden yeniye): alanlı çizgi, son nokta limon
function Spark({ vals }) {
  if (vals.length < 2) return null;
  const W = 120;
  const H = 32;
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const span = max - min || 1;
  const pts = vals.map((v, i) => [(i * (W - 4)) / (vals.length - 1) + 2, H - 4 - ((v - min) / span) * (H - 8)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-8 w-full" aria-hidden="true">
      <path d={`${d} L${lx} ${H} L${pts[0][0]} ${H}Z`} fill="#60a5fa" fillOpacity="0.14" />
      <path d={d} fill="none" stroke="#60a5fa" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.6" fill="var(--acc)" />
    </svg>
  );
}

// Canlı yayın: son 30 gün, gün başına kişi
function DayBars({ vals }) {
  const max = Math.max(...vals, 1);
  return (
    <span className="flex h-8 min-w-0 flex-1 items-end gap-[2px]" aria-hidden="true">
      {vals.map((v, i) => (
        <i key={i} className={`flex-1 rounded-[1px] ${v ? "bg-[#60a5fa]" : "bg-line"}`} style={{ height: `${v ? Math.max(8, (v / max) * 100) : 6}%` }} />
      ))}
    </span>
  );
}

function HBars({ rows }) {
  const max = Math.max(...rows.map((r) => r[1]), 1);
  return (
    <span className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 text-[0.6875rem] text-mut">
      {rows.map(([k, n]) => (
        <span key={k} className="contents">
          <span className="max-w-[5.5rem] truncate">{k}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-fill">
            <i className="block h-full rounded-full bg-[#60a5fa]" style={{ width: `${(n / max) * 100}%` }} />
          </span>
          <b className="font-semibold tabular-nums text-fg2">{n0(n)}</b>
        </span>
      ))}
    </span>
  );
}

const short = (name) => name.replace(/^Google (.)/, (_, c) => c.toLocaleUpperCase("tr-TR"));
const SVC_C = { gemini: "var(--acc)", tts: "#60a5fa" };
const DEV_C = ["#60a5fa", "#a78bfa", "var(--acc)", "#52525b"];

export function Durum() {
  const j = useUsage();
  const [dev, setDev] = useState(null);
  const [yayin, setYayin] = useState(null);
  const [opens] = useState(() => (typeof window === "undefined" ? [] : readOpens()));
  const [budget] = useState(() => (typeof window === "undefined" ? 250 : readBudget()));
  const energy = useSyncExternalStore(subscribe, snapshot, () => SERVER);
  const [sheet, setSheet] = useState("");
  useEffect(() => {
    let on = true;
    authFetch("/api/canli-iz?days=30")
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => on && x?.total && setYayin(x.total))
      .catch(() => {});
    measureDevice()
      .then((d) => on && setDev(d))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);

  const sp = j ? spendOf(j.ai?.month, j.today || "", j.rate) : null;
  const svc = j ? servicesOf(j) : null;
  const pct = svc && budget > 0 ? Math.round((svc.total / budget) * 100) : null;
  const month = j?.today ? monthName(j.today.slice(0, 7)).split(" ")[0] : "";
  // Servis şeridi: tutarı olanlar renkli; Gemini görselleri ayrı parça değil, Gemini'nin içinde
  const svcParts = svc ? svc.rows.filter((r) => r.tl > 0).map((r, i) => ({ k: short(r.name), v: r.tl, c: SVC_C[r.id] || ["#a78bfa", "#f472b6"][i % 2], t: `${n0(r.tl)} ₺` })) : [];
  const svcRest = svc ? svc.rows.filter((r) => !(r.tl > 0)).map((r) => ({ k: short(r.name), t: r.tl == null ? "–" : r.free ? "Ücretsiz" : "0 ₺" })) : [];
  const req = usageRows(j?.ai?.month);
  const tts = ttsUsage(j?.ai?.month);
  const avg = opens.length ? opens.reduce((a, x) => a + x.ms, 0) / opens.length : 0;
  const devParts = dev
    ? [
        { k: "Video", v: dev.mediaBytes + dev.pendBytes },
        { k: "Evrak", v: dev.docBytes + dev.extraBytes },
        { k: "Uygulama", v: dev.appBytes },
        { k: "Diğer", v: Math.max(0, dev.total - dev.mediaBytes - dev.pendBytes - dev.docBytes - dev.extraBytes - dev.appBytes) },
      ].map((p, i) => ({ ...p, c: DEV_C[i] }))
    : [];
  const byDay = new Map((yayin?.days || []).map((d) => [d.day, d.people]));
  const days30 = lastDays(30)
    .reverse()
    .map((d) => byDay.get(d) || 0);
  const e = energy.last;

  return (
    <section aria-label="Durum" className="[column-span:all]">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
        <div className={`${CARD} col-span-2 md:row-span-2`}>
          <Head label={`Harcama${month ? ` · ${month}` : ""}`} right={budget > 0 ? `bütçe ${n0(budget)} ₺` : ""} />
          <span className="flex items-center gap-3">
            <Big value={svc ? n0(svc.total) : null} unit="TL" size="text-[3rem]" />
            {pct != null && budget > 0 && (
              <span className="ml-auto">
                <Ring pct={pct} />
              </span>
            )}
          </span>
          {sp && <Bars days={sp.days} today={j.today} budget={budget} />}
          <Stack parts={svcParts} />
          {svc && <Legend parts={[...svcParts, ...svcRest]} />}
          <span className="mt-auto flex gap-2 pt-1">
            <Button variant="secondary" size="sm" onClick={() => setSheet("ai")}>
              Ayrıntı
            </Button>
            <a href={SERVICE_LINKS.gemini} target="_blank" rel="noreferrer" data-press className={buttonClass({ variant: "secondary", size: "sm" })}>
              Fatura
            </a>
          </span>
        </div>

        <Tile>
          <Head label="Açılış" right={opens.length > 1 ? `ort. ${sec(avg)}` : ""} />
          <Big value={opens.length ? sec(opens[0].ms) : null} unit="sn" />
          <Spark vals={opens.map((x) => x.ms).reverse()} />
        </Tile>
        <Tile onClick={() => setSheet("veri")}>
          <Head label="Telefonda" />
          <Big value={dev ? n0(dev.total / 1048576) : null} unit="MB" />
          {dev?.total >= 1048576 && <Stack parts={devParts} />}
          {dev && <Legend parts={devParts.filter((p) => p.v > 0 && p.k !== "Diğer")} />}
        </Tile>
        <Tile onClick={() => setSheet("ai")}>
          <Head label={`İstekler${month ? ` · ${month}` : ""}`} />
          <Big value={j ? n0(req.total) : null} />
          {req.rows.length > 0 && <HBars rows={req.rows.slice(0, 3)} />}
          {!req.rows.length && tts.chars > 0 && <span className="text-[0.75rem] text-mut">Seslendirme %{tts.pct}</span>}
        </Tile>
        <Tile onClick={() => setSheet("enerji")}>
          <Head label="Enerji" right={e?.at ? new Date(e.at).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : ""} />
          <Big value={energy.running ? `${energy.left}` : e ? `%${e.cpu.toLocaleString("tr-TR")}` : null} unit={energy.running ? "sn" : e ? "işlemci" : ""} />
          {e && !energy.running && (
            <span className="h-1.5 overflow-hidden rounded-full bg-fill">
              <i className={`block h-full rounded-full ${e.cpu < 3 ? "bg-acc" : e.cpu < 10 ? "bg-[#60a5fa]" : "bg-warn"}`} style={{ width: `${Math.max(3, Math.min(100, e.cpu))}%` }} />
            </span>
          )}
          <span className="truncate text-[0.75rem] text-mut">{energy.running ? "Ölçülüyor" : e ? levelOf(e.cpu) : "Ölç"}</span>
        </Tile>

        <Tile href="/settings/yayin" className="col-span-2 md:col-span-4">
          <Head label="Canlı yayın · 30 gün" right={yayin?.live ? `Şu an ${yayin.live} kişi` : ""} />
          <span className="flex items-end gap-3">
            <Big value={yayin ? n0(yayin.people) : null} unit="kişi" />
            {yayin && <DayBars vals={days30} />}
          </span>
        </Tile>
      </div>

      <Sheet open={sheet === "ai"} onClose={() => setSheet("")} title="Harcamalar">
        <SpendList data={j} />
      </Sheet>
      <Sheet open={sheet === "enerji"} onClose={() => setSheet("")} title="Enerji">
        <Group>
          <EnergyRow />
        </Group>
      </Sheet>
      <DeviceDataRow sheetOpen={sheet === "veri"} onClose={() => setSheet("")} />
    </section>
  );
}

// Ses ve asistan › Seslendirme kotası: Google seslendirmenin aylık ücretsiz 1 milyon harfinin ne kadarı kullanıldı
export function TtsQuotaRow() {
  const j = useUsage();
  const t = ttsUsage(j?.ai?.month);
  if (!j || !(j.keys?.googleTts || t.chars > 0)) return null;
  return <Row title="Seslendirme kotası" sub={`%${t.pct}`} right={<Mini pct={t.pct} />} />;
}
