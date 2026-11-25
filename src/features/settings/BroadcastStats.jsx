"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { BackButton } from "@/components/ui/BackButton";
import { Seg } from "@/components/ui/Page";
import { Button } from "@/components/ui/Button";
import { buttonClass } from "@/components/ui/buttonClass";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { authFetch } from "@/lib/authFetch";
import { ensurePublic, liveUrl } from "@/features/liveScreen/liveActions";
import { raceGroups } from "@/lib/visitStats";

// Ayarlar › Yayın (Seyhun 2026-11-02, örnek /mnt/project-files/yayin-takip/ornek.png): herkese açık /canli sayfalarının
// ziyaretleri (şu an, ziyaretçi, ortalama kalma, geri gelen) ve yarışların yayın durumu (Yayında / Yaklaşan / Biten).
// Yarışa dokununca o yarışın ayrıntısı: saat saat, ne yaptılar, nereden, cihaz ve şehir. Veri /api/canli-iz (Netlify Blobs).

const dayText = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");
const when = (r) => (r.endDate && r.endDate !== r.startDate ? `${dayText(r.startDate)} – ${dayText(r.endDate)}` : dayText(r.startDate));
const daysTo = (d, today) => Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 864e5);
const durText = (s) => (s >= 60 ? [Math.round(s / 60), "dk"] : [s || 0, "sn"]);
const hm = (ms) => new Date(ms).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });

function useStats(days, race) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    try {
      const res = await authFetch(`/api/canli-iz?days=${days}${race ? `&race=${encodeURIComponent(race)}` : ""}`);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Okunamadı.");
      setData(j);
      setErr("");
    } catch (e) {
      setErr(e.message || "Okunamadı.");
    }
  }, [days, race]);
  useEffect(() => {
    let t = 0;
    let on = true;
    const tick = () => load().finally(() => on && (t = setTimeout(tick, 30e3)));
    tick();
    return () => {
      on = false;
      clearTimeout(t);
    };
  }, [load]);
  return { data, err, reload: load };
}

const Head = ({ children, right }) => (
  <h2 className="mb-1.5 mt-5 flex items-center justify-between px-4 text-[0.875rem] font-semibold text-mut">
    <span>{children}</span>
    {right}
  </h2>
);
const List = ({ children }) => <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">{children}</div>;

function Tile({ label, value, unit, live }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-mut">
        {live && <span className="size-2 rounded-full bg-rec" />}
        {label}
      </p>
      <p className="truncate">
        <span className={`text-[1.5rem] font-bold tabular-nums ${live ? "text-acc" : ""}`}>{value}</span>
        {unit && <span className="ml-1 text-[0.8125rem] font-semibold text-mut">{unit}</span>}
      </p>
    </div>
  );
}

function Tiles({ v, peak }) {
  if (!v) return <div className="grid grid-cols-2 gap-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-[4.6rem] animate-pulse rounded-2xl border border-line bg-card" />)}</div>;
  const [d, u] = durText(v.avg);
  return (
    <div className="grid grid-cols-2 gap-2">
      <Tile label="Şu an" value={v.live} unit="kişi" live />
      <Tile label="Ziyaretçi" value={v.people} unit="kişi" />
      <Tile label="Ort. kalma" value={d} unit={u} />
      {peak ? <Tile label="En kalabalık" value={v.peak.n} unit={v.peak.at ? hm(v.peak.at) : ""} /> : <Tile label="Geri gelen" value={v.ret} unit="%" />}
    </div>
  );
}

function Tag({ kind, children }) {
  const cls = kind === "live" ? "bg-rec/10 text-rec" : kind === "acc" ? "bg-accbg text-acc" : "bg-line/70 text-mut";
  return <span className={`mr-1 rounded-md px-1.5 py-px text-[0.75rem] font-semibold ${cls}`}>{children}</span>;
}

function RaceRow({ r, stat, today, onOpen, onPublish, busy }) {
  const left = daysTo(r.startDate, today);
  const sub = [];
  let tag = null;
  if (r.pub && r.live) tag = <Tag kind="live">Canlı</Tag>;
  else if (r.pub && r.startDate <= today && r.endDate >= today) tag = <Tag kind="acc">{r.status === "done" ? "Gün bitti" : r.status === "ap" ? "Ertelendi" : "Yayında"}</Tag>;
  else if (r.pub && left > 0) tag = <Tag kind="acc">Link açık</Tag>;
  else if (!r.pub && r.endDate >= today) tag = <Tag>Yayın yok</Tag>;
  if (r.endDate < today) sub.push(when(r), r.pub ? "" : "yayınlanmadı");
  else if (left > 0) sub.push(when(r), `${left} gün`);
  else sub.push(r.races ? `${r.races}. yarış` : when(r), r.pub ? (r.yt ? "YouTube bağlı" : "YouTube yok") : "");
  const canOpen = r.pub || stat;
  const body = (
    <>
      <span className="min-w-0 flex-1 py-2">
        <span className="block truncate text-[1rem] font-semibold">{r.name || "Yarış"}</span>
        <span className="block truncate text-[0.8125rem] font-medium text-mut">
          {tag}
          {sub.filter(Boolean).join(" · ")}
        </span>
      </span>
      {stat ? (
        <span className="shrink-0 text-right text-[0.9375rem] font-semibold tabular-nums">
          {stat.people}
          <span className="block text-[0.75rem] font-medium text-mut">{stat.live ? `${stat.live} şu an` : "kişi"}</span>
        </span>
      ) : !r.pub && r.endDate >= today ? null : (
        <span className="shrink-0 text-mut">–</span>
      )}
    </>
  );
  return (
    <div className="flex items-center gap-2.5 px-4">
      {canOpen ? (
        <button type="button" onClick={() => onOpen(r)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left active:opacity-70">
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2.5">{body}</div>
      )}
      {!r.pub && r.endDate >= today && (
        <Button variant="secondary" size="sm" full={false} loading={busy} onClick={() => onPublish(r)}>
          Yayına aç
        </Button>
      )}
    </div>
  );
}

function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((x) => x.n));
  return (
    <List>
      <div className="flex h-[4.5rem] items-end gap-[3px] px-4 pt-3">
        {rows.map((x) => (
          <i key={x.k} className={`flex-1 rounded-t-[3px] bg-acc ${x.n ? "opacity-85" : "opacity-15"}`} style={{ height: `${Math.max(4, (x.n / max) * 100)}%` }} title={`${x.k}: ${x.n}`} />
        ))}
      </div>
      <div className="flex justify-between border-0 px-4 pb-2.5 pt-1 text-[0.6875rem] text-mut tabular-nums">
        {rows.filter((_, i) => i % Math.ceil(rows.length / 5 || 1) === 0).map((x) => (
          <span key={x.k}>{x.k}</span>
        ))}
      </div>
    </List>
  );
}

function PctList({ rows, bar }) {
  if (!rows.length) return <List><p className="px-4 py-3 text-[0.9375rem] text-mut">Henüz yok</p></List>;
  return (
    <List>
      {rows.map((x) => (
        <div key={x.name} className="flex items-center gap-3 px-4 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-semibold">{x.name}</span>
            {bar && (
              <span className="mt-1.5 block h-1.5 rounded-full bg-line/70">
                <i className="block h-1.5 rounded-full bg-acc" style={{ width: `${x.pct}%` }} />
              </span>
            )}
          </span>
          <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">%{x.pct}</span>
        </div>
      ))}
    </List>
  );
}

const inline = (rows) => rows.map((x) => `${x.name} %${x.pct}`).join(" · ");

function RaceDetail({ r, onBack }) {
  const [days, setDays] = useState(1);
  const { data, err } = useStats(days === 0 ? 30 : 1, r.id === "_" ? "_" : r.id);
  const toast = useToast();
  const v = data?.race;
  const [allCities, setAllCities] = useState(false);
  const hours = v ? v.hr.map((n, i) => ({ k: String(i).padStart(2, "0"), n })).slice(7, 23) : [];
  const perDay = v ? v.days.map((x) => ({ k: dayText(x.day), n: x.people })) : [];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(r.id === "_" ? `${location.origin}/canli` : liveUrl(r.id));
      toast("Link kopyalandı");
    } catch {
      toast("Kopyalanamadı");
    }
  };
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-10 -mx-5 flex items-center gap-2.5 bg-bg/90 px-4 pb-2.5 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
        <BackButton onClick={onBack} className="-my-0.5" />
        <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-semibold leading-tight tracking-tight">{r.name}</h1>
      </div>
      <Seg className="mb-3" value={days} onChange={setDays} options={[[1, "Bugün"], [0, "Tüm günler"]]} />
      {err && !v && <p className="px-4 py-3 text-[0.9375rem] text-rec">{err}</p>}
      <Tiles v={v} peak />
      {v && (
        <>
          <Head>{days === 1 ? "Saat saat" : "Gün gün"}</Head>
          {days === 1 ? <Bars rows={hours} /> : perDay.length ? <Bars rows={perDay} /> : <PctList rows={[]} />}
          <Head>Ne yaptılar</Head>
          <PctList rows={v.acts} bar />
          <Head>Nereden</Head>
          <PctList rows={v.refs} />
          <Head>Cihaz ve şehir</Head>
          <List>
            <p className="truncate px-4 py-2.5 text-[0.9375rem] font-semibold">{v.devs.length ? inline(v.devs) : "Henüz yok"}</p>
            {v.cities.length > 0 && (
              <button type="button" onClick={() => setAllCities((x) => !x)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
                <span className={`min-w-0 flex-1 text-[0.9375rem] font-semibold ${allCities ? "" : "truncate"}`}>{inline(allCities ? v.cities : v.cities.slice(0, 3))}</span>
                {v.cities.length > 3 && <span className="shrink-0 text-[0.9375rem] font-semibold text-acc">{allCities ? "Kapat" : "Tümü ›"}</span>}
              </button>
            )}
          </List>
        </>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={copy}>
          Linki kopyala
        </Button>
        {r.id === "_" ? (
          <Link href="/canli" data-press className={buttonClass({ variant: "primary" })}>
            Sayfayı aç
          </Link>
        ) : (
          <Link href={`/athletes/races/${r.id}/yayin`} data-press className={buttonClass({ variant: "primary" })}>
            Yayın masası
          </Link>
        )}
      </div>
    </main>
  );
}

export function BroadcastStats() {
  const { profile } = useAuth();
  const [days, setDays] = useState(1);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState("");
  const [morePast, setMorePast] = useState(false);
  const { data, err, reload } = useStats(days, "");
  const toast = useToast();
  if (profile && profile.role !== "owner") return null;
  if (open) return <RaceDetail r={open} onBack={() => setOpen(null)} />;
  const today = data?.today || "";
  const g = raceGroups(data?.list || [], today);
  const stat = (id) => data?.races?.[id];
  const publish = async (r) => {
    setBusy(r.id);
    try {
      await ensurePublic(r.id);
      toast("Yayına açıldı");
      await reload();
    } catch (e) {
      toast(e.message || "Açılamadı");
    } finally {
      setBusy("");
    }
  };
  const row = (r) => <RaceRow key={r.id} r={r} stat={stat(r.id)} today={today} onOpen={setOpen} onPublish={publish} busy={busy === r.id} />;
  const past = morePast ? g.past : g.past.slice(0, 5);
  const home = stat("_");
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Yayın" back="/settings" />
      <Seg className="mb-3" value={days} onChange={setDays} options={[[1, "Bugün"], [7, "7 gün"], [30, "30 gün"]]} />
      {err && !data && <p className="px-4 py-3 text-[0.9375rem] text-rec">{err}</p>}
      <Tiles v={data?.total} />
      {!data ? (
        <div className="mt-5 h-40 animate-pulse rounded-2xl border border-line bg-card" />
      ) : (
        <>
          {g.now.length > 0 && (
            <>
              <Head>Yayında</Head>
              <List>{g.now.map(row)}</List>
            </>
          )}
          {g.soon.length > 0 && (
            <>
              <Head>Yaklaşan</Head>
              <List>{g.soon.map(row)}</List>
            </>
          )}
          {g.past.length > 0 && (
            <>
              <Head right={g.past.length > 5 && <button type="button" className="font-semibold text-acc" onClick={() => setMorePast((x) => !x)}>{morePast ? "Kapat" : "Tümü ›"}</button>}>Biten</Head>
              <List>{past.map(row)}</List>
            </>
          )}
          {home && (
            <>
              <Head>Genel sayfa</Head>
              <List>
                <div className="px-4">
                  <button type="button" onClick={() => setOpen({ id: "_", name: "Genel sayfa" })} className="flex w-full items-center gap-2.5 py-2 text-left active:opacity-70">
                    <span className="min-w-0 flex-1 truncate text-[1rem] font-semibold">Canlı yarışlar listesi</span>
                    <span className="shrink-0 text-right text-[0.9375rem] font-semibold tabular-nums">
                      {home.people}
                      <span className="block text-[0.75rem] font-medium text-mut">kişi</span>
                    </span>
                  </button>
                </div>
              </List>
            </>
          )}
        </>
      )}
    </main>
  );
}
