"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ListHead, RowList, Row, SkelRow } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { STATUSES, STATUS_NAMES, lineDetail, minutesLeft } from "../order";
import { liveView } from "../demo";
import { PLACES, placeById, useSettings, useToday, saveSettings, setStatus } from "../store";
import { Img, tl } from "./Img";

// Velora Yemek › Yönetim (Seyhun, admin; örnek C): lacivertte bugünün sayıları, Siparişler / Restoranlar / Kuryeler,
// deneme modu. Restoranı Yönetim'den kapatmak saatlere bakmadan sipariş almayı durdurur.
export const TONE = { sent: "n", accepted: "n", preparing: "h", onTheWay: "y", delivered: "ok", cancelled: "x" };
const TONES = { n: "bg-[#ecebfa] text-[#4b40b8]", h: "bg-warnbg text-warn", y: "bg-accbg text-acc", ok: "bg-[#e3efe7] text-ok", x: "bg-line text-mut" };
export function StatusTag({ status, extra }) {
  return <span className={`shrink-0 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[0.75rem] font-bold ${TONES[TONE[status]]}`}>{STATUS_NAMES[status] === "Gönderildi" ? "Yeni" : STATUS_NAMES[status]}{extra ? ` ${extra}` : ""}</span>;
}
const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

// Deneme siparişleri ve kalan dakikalar için saat (20 sn'de bir)
export function useNow(ms = 20000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

// Bu cihazda seçilen restoran / kurye (localStorage). İlk çizimde null (henüz okunmadı).
export function useRemembered(key) {
  const [val, setVal] = useState(null);
  useEffect(() => {
    const read = () => {
      try {
        setVal(localStorage.getItem(key) || "");
      } catch {
        setVal("");
      }
    };
    read();
  }, [key]);
  const set = (v) => {
    try {
      localStorage.setItem(key, v);
    } catch {}
    setVal(v);
  };
  return [val, set];
}

// Siparişin ekrandaki hali (deneme siparişi saatten ilerler)
export function withLive(list, now) {
  return (list || []).map((o) => ({ ...o, live: liveView(o, placeById(o.placeId), now) }));
}

export function AdminView({ orgId }) {
  const settings = useSettings(orgId);
  const today = useToday(orgId);
  const toast = useToast();
  const [tab, setTab] = useState("orders");
  const [sel, setSel] = useState(null); // durumu değiştirilecek siparişin id'si
  const now = useNow();
  const list = withLive(today, now);
  const open = list.filter((o) => !["delivered", "cancelled"].includes(o.live.status));
  const done = list.filter((o) => ["delivered", "cancelled"].includes(o.live.status));
  const revenue = list.filter((o) => o.live.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0);
  const onWay = open.filter((o) => o.live.status === "onTheWay").length;
  const demo = settings?.demo !== false;
  const couriers = settings?.couriers || [];
  const save = (patch) => saveSettings(orgId, patch).catch(() => toast("Kaydedilemedi"));

  const tabs = [["orders", "Siparişler", `${open.length} açık`], ["places", "Restoranlar", String(PLACES.length)], ["couriers", "Kuryeler", couriers.length ? `${couriers.length} kişi` : "Yok"]];
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Yönetim">
        <header className="flex items-center gap-2.5">
          <BackButton href="/shopping?tab=yemek" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[0.8125rem] text-white/65">Velora Yemek</p>
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Yönetim</h1>
          </div>
          <button type="button" data-press aria-pressed={demo} onClick={() => save({ demo: !demo })} className={`raised h-9 shrink-0 rounded-full border px-3 text-[0.8125rem] font-semibold ${demo ? "ck-sel" : ""}`}>
            Deneme modu {demo ? "açık" : "kapalı"}
          </button>
        </header>
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {[[String(list.filter((o) => o.live.status !== "cancelled").length), "Bugün sipariş"], [tl(revenue), "Ciro"], [String(onWay), "Yolda"]].map(([v, n]) => (
            <div key={n} className="ck-glass rounded-2xl px-3 py-2.5">
              <b className="block truncate text-[1.375rem] font-bold leading-tight tabular-nums">{today ? v : "…"}</b>
              <span className="block truncate text-[0.75rem] font-semibold text-white/65">{n}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {tabs.map(([k, n, sub]) => (
            <button key={k} type="button" data-press aria-pressed={tab === k} onClick={() => setTab(k)} className={`raised flex h-[3.25rem] flex-col items-start justify-center rounded-2xl border px-3 leading-tight ${tab === k ? "ck-sel" : ""}`}>
              <b className="text-[0.9375rem] font-semibold">{n}</b>
              <small className="text-[0.75rem] opacity-75">{sub}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {tab === "orders" && (
          <>
            <section>
              <ListHead title="Açık siparişler" count={open.length} />
              <RowList>
                {!today && <SkelRow />}
                {today && !open.length && <p className="py-4 text-center text-[0.875rem] text-mut">Açık sipariş yok</p>}
                {open.map((o) => <OrderRow key={o.id} o={o} now={now} onOpen={() => setSel(o.id)} />)}
              </RowList>
            </section>
            {done.length > 0 && (
              <section>
                <ListHead title="Bugün biten" count={done.length} />
                <RowList>{done.map((o) => <OrderRow key={o.id} o={o} now={now} onOpen={() => setSel(o.id)} />)}</RowList>
              </section>
            )}
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/yemek/panel" data-press className="btn btn-secondary w-full">Restoran ekranı</Link>
              <Link href="/yemek/kurye" data-press className="btn btn-secondary w-full">Kurye ekranı</Link>
            </div>
          </>
        )}

        {tab === "places" && (
          <section>
            <ListHead title="Restoranlar" count={PLACES.length} />
            <RowList>
              {PLACES.map((p) => {
                const off = !!settings?.closed?.[p.id];
                const n = list.filter((o) => o.placeId === p.id && o.live.status !== "cancelled").length;
                return (
                  <div key={p.id} className="flex min-h-[3.5rem] items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                    <Img src={p.cover} w={160} className="size-11 shrink-0 rounded-xl" />
                    <Link href={`/yemek/${p.id}`} className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{p.name}</b>
                      <small className="block truncate text-[0.8125rem] text-mut">{p.menu.reduce((a, c) => a + c.items.length, 0)} ürün · {p.hours.join("–")}{n ? ` · bugün ${n} sipariş` : ""}</small>
                    </Link>
                    <Switch on={!off} label={`${p.name} sipariş alıyor`} onChange={() => save({ closed: { ...(settings?.closed || {}), [p.id]: !off } })} />
                  </div>
                );
              })}
            </RowList>
          </section>
        )}

        {tab === "couriers" && <Couriers couriers={couriers} save={save} />}
      </div>
      <OrderSheet orgId={orgId} o={list.find((x) => x.id === sel)} onClose={() => setSel(null)} />
    </main>
  );
}

function OrderRow({ o, now, onOpen }) {
  const place = placeById(o.placeId);
  const left = o.live.status === "onTheWay" ? `${minutesLeft(o.live.eta, new Date(now))} dk` : "";
  return (
    <Row
      onClick={onOpen}
      lead={<Img src={o.lines?.[0] && place?.menu.flatMap((c) => c.items).find((i) => i.id === o.lines[0].itemId)?.photo} w={160} className="size-11 shrink-0 rounded-xl" />}
      title={`${o.customer || "Müşteri"} · ${o.placeName}`}
      sub={`${hm(o.at)} · ${tl(o.total)}${o.courier?.name ? ` · ${o.courier.name}` : ""}${o.demo ? " · deneme" : ""}`}
      right={<StatusTag status={o.live.status} extra={left} />}
      chev={false}
    />
  );
}

// Sipariş ayrıntısı ve elle durum değiştirme (Yönetim)
function OrderSheet({ orgId, o, onClose }) {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const change = async (st) => {
    setBusy(st);
    try {
      await setStatus(orgId, o, st);
    } catch {
      toast("Kaydedilemedi");
    }
    setBusy("");
  };
  return (
    <Sheet open={!!o} onClose={onClose} title={o ? `${o.customer || "Müşteri"} · ${o.placeName}` : ""}>
      {o && (
        <div className="space-y-4 pb-2">
          <div className="overflow-hidden rounded-[1.25rem] border border-line bg-bg px-3.5">
            {o.lines.map((l, i) => (
              <div key={i} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.9375rem] font-semibold">{l.qty}× {l.name}</b>
                  {lineDetail(l) && <small className="block truncate text-[0.8125rem] text-mut">{lineDetail(l)}</small>}
                </span>
                <b className="shrink-0 tabular-nums">{tl(l.unit * l.qty)}</b>
              </div>
            ))}
            <div className="flex justify-between border-t border-line py-2.5 font-bold"><span>Toplam</span><span className="tabular-nums">{tl(o.total)}</span></div>
          </div>
          <p className="px-1 text-[0.875rem] text-mut">{hm(o.at)} · {o.address?.name} · {o.address?.text}</p>
          <div className="grid grid-cols-2 gap-2">
            {[...STATUSES, "cancelled"].map((st) => (
              <button key={st} type="button" data-press aria-pressed={o.live.status === st} disabled={!!busy || o.live.status === st} onClick={() => change(st)}
                className={`h-11 rounded-xl border text-[0.875rem] font-semibold ${o.live.status === st ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`}>
                {busy === st ? "…" : STATUS_NAMES[st]}
              </button>
            ))}
          </div>
          <Link href={`/yemek/siparis/${o.id}`} data-press className="btn btn-secondary w-full">Takip ekranı</Link>
        </div>
      )}
    </Sheet>
  );
}

export function Switch({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? "bg-acc" : "bg-line"}`}>
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-[left] ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

function Couriers({ couriers, save }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const add = () => {
    if (!name.trim()) return;
    save({ couriers: [...couriers, { id: `k${Date.now().toString(36)}`, name: name.trim(), phone: phone.trim() }] });
    setName("");
    setPhone("");
  };
  return (
    <section className="space-y-3">
      <div>
        <ListHead title="Kuryeler" count={couriers.length} />
        <RowList>
          {!couriers.length && <p className="py-4 text-center text-[0.875rem] text-mut">Kurye yok</p>}
          {couriers.map((c) => (
            <div key={c.id} className="flex min-h-[3.5rem] items-center gap-3 border-t border-line py-2.5 first:border-t-0">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accbg text-[0.875rem] font-bold text-acc">{c.name.slice(0, 2).toLocaleUpperCase("tr")}</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{c.name}</b>
                {c.phone && <small className="block truncate text-[0.8125rem] text-mut">{c.phone}</small>}
              </span>
              <button type="button" aria-label={`${c.name} sil`} onClick={() => window.confirm(`${c.name} silinsin mi?`) && save({ couriers: couriers.filter((x) => x.id !== c.id) })} data-press className="btn btn-icon btn-sm text-mut">
                <Icon name="trash" className="size-4" />
              </button>
            </div>
          ))}
        </RowList>
      </div>
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad" maxLength={30} className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-3.5 text-base outline-none focus:border-acc" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" inputMode="tel" maxLength={20} className="h-11 w-32 rounded-xl border border-line bg-card px-3.5 text-base outline-none focus:border-acc" />
      </div>
      <Button disabled={!name.trim()} onClick={add}>Kurye ekle</Button>
    </section>
  );
}
