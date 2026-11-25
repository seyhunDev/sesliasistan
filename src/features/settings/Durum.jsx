"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { authFetch } from "@/lib/authFetch";
import { spendOf } from "@/lib/aiPrice";
import { readOpens } from "@/lib/openTime";
import { DeviceDataRow } from "./DeviceData";
import { UsageRow, readBudget } from "./Usage";
import { Group } from "./ui";

// Ayarlar › Durum (ana hesap; örnek velora-tarama/ayarlar.html, 2026-11-25): yapay zeka harcaması (gün gün çubuk), açılış süresi,
// telefondaki veri ve canlı yayın ziyaretleri dört kartta. Eski ayrı satırlar (Yapay zeka kullanımı, Açılış süresi, Telefondaki veriler,
// Yayın) kartlara taşındı; karta dokununca ayrıntı penceresi (yayında Yayın sayfası) açılır. Sayfa açılınca bir kez okunur.
const sec = (ms) => (ms / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
const n0 = (n) => Math.round(Number(n) || 0).toLocaleString("tr-TR");

function Tile({ label, value, unit, sub, onClick, href, children }) {
  const body = (
    <>
      <span className="text-[0.75rem] font-semibold text-mut">{label}</span>
      <span className="mt-1 block truncate">
        <b className="text-[1.75rem] font-bold leading-none tabular-nums">{value ?? "–"}</b>
        {unit && <span className="ml-1 text-[0.8125rem] font-semibold text-mut">{unit}</span>}
      </span>
      {children}
      {sub && <span className="mt-1 block truncate text-[0.75rem] text-mut">{sub}</span>}
    </>
  );
  const cls = "flex min-h-[6.5rem] min-w-0 flex-col justify-between rounded-[1.25rem] border border-line bg-card p-3.5 text-left";
  if (href)
    return (
      <Link href={href} data-press className={cls}>
        {body}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" data-press onClick={onClick} className={cls}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}

// Bu ayın günleri: harcanan gün çubuk, bütçe çizgisi günlük ortalama bütçe
function Bars({ days, today, budget }) {
  const last = Number(String(today).slice(8, 10)) || 0;
  if (!last) return null;
  const by = new Map(days);
  const vals = Array.from({ length: last }, (_, i) => by.get(i + 1) || 0);
  const perDay = budget > 0 ? budget / 30 : 0;
  const max = Math.max(...vals, perDay, 0.01);
  return (
    <span className="relative mt-2 flex h-6 items-end gap-[2px]" aria-hidden="true">
      {vals.map((v, i) => (
        <i key={i} className={`flex-1 rounded-[1px] ${i === last - 1 ? "bg-acc" : "bg-mut/40"}`} style={{ height: `${Math.max(6, (v / max) * 100)}%` }} />
      ))}
      {perDay > 0 && <span className="absolute inset-x-0 border-t border-dashed border-warn/70" style={{ bottom: `${(perDay / max) * 100}%` }} />}
    </span>
  );
}

export function Durum() {
  const [ai, setAi] = useState(null);
  const [mb, setMb] = useState(null);
  const [yayin, setYayin] = useState(null);
  const [opens] = useState(() => (typeof window === "undefined" ? [] : readOpens()));
  const [budget] = useState(() => (typeof window === "undefined" ? 250 : readBudget()));
  const [sheet, setSheet] = useState("");
  useEffect(() => {
    let on = true;
    authFetch("/api/usage?ai=1")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => on && j && setAi({ ...spendOf(j.ai?.month, j.today || "", j.rate), today: j.today || "", raw: j }))
      .catch(() => {});
    authFetch("/api/canli-iz?days=30")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => on && j?.total && setYayin(j.total))
      .catch(() => {});
    navigator.storage
      ?.estimate?.()
      .then((e) => on && e?.usage != null && setMb(e.usage / 1048576))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);
  const pct = ai && budget > 0 ? Math.round((ai.month / budget) * 100) : null;
  const avg = opens.length ? opens.reduce((a, x) => a + x.ms, 0) / opens.length : 0;
  return (
    <section aria-label="Durum">
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <Tile label="Yapay zeka · bu ay" value={ai ? n0(ai.month) : null} unit="TL" sub={pct != null ? `%${pct} · bütçe ${n0(budget)}` : ""} onClick={() => setSheet("ai")}>
          {ai && <Bars days={ai.days} today={ai.today} budget={budget} />}
        </Tile>
        <Tile label="Açılış" value={opens.length ? sec(opens[0].ms) : null} unit="sn" sub={opens.length > 1 ? `Ortalama ${sec(avg)} sn` : ""} />
        <Tile label="Telefonda" value={mb != null ? n0(mb) : null} unit="MB" onClick={() => setSheet("veri")} />
        <Tile label="Canlı yayın · 30 gün" value={yayin ? n0(yayin.people) : null} unit="kişi" sub={yayin?.live ? `Şu an ${yayin.live} kişi izliyor` : ""} href="/settings/yayin" />
      </div>
      <Sheet open={sheet === "ai"} onClose={() => setSheet("")} title="Yapay zeka">
        <Group>
          <UsageRow data={ai?.raw || null} />
        </Group>
      </Sheet>
      <DeviceDataRow sheetOpen={sheet === "veri"} onClose={() => setSheet("")} />
    </section>
  );
}
