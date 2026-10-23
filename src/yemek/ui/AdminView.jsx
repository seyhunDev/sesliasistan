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
import { VEHICLES } from "../route";
import { PLACES, placeById, useSettings, useToday, saveSettings, setStatus } from "../store";
import { courierState, sortCouriers } from "../couriers";
import { orderNo } from "../qr";
import { Img, tl } from "./Img";
import { CourierMap } from "./CourierMap";
import { kuryeApi } from "../courierApi";

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

  const tabs = [["orders", "Siparişler", `${open.length} açık`], ["places", "Restoranlar", String(PLACES.length)], ["couriers", "Kuryeler", couriers.length ? `${couriers.filter((c) => !courierState(c, list).busy).length} müsait` : "Yok"]];
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

        {tab === "couriers" && <Couriers couriers={couriers} orders={list} demo={demo} save={save} signup={!!settings?.signup} />}
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

// Durum seçilince gösterilen onay (Seyhun 2026-10-23): simge, hareket (globals.css yst-*), yazı
const DONE_ICON = { sent: "arrow", accepted: "check", preparing: "flame", onTheWay: "nav", delivered: "checks", cancelled: "x" };
const DONE_SAY = { sent: "Gönderildi", accepted: "Onaylandı", preparing: "Hazırlanıyor", onTheWay: "Yola çıktı", delivered: "Teslim edildi", cancelled: "İptal edildi" };
const DONE_TONE = { delivered: "bg-ok/15 text-ok", cancelled: "bg-rec/10 text-rec" };

// Sipariş ayrıntısı ve elle durum değiştirme (Yönetim)
function OrderSheet({ orgId, o, onClose }) {
  const toast = useToast();
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState(""); // seçilen durum kaydedildi: onay hareketi, sonra pencere kapanır
  const change = async (st) => {
    setBusy(st);
    try {
      await setStatus(orgId, o, st);
      setDone(st);
      setTimeout(() => {
        setDone("");
        onClose();
      }, 1100);
    } catch {
      toast("Kaydedilemedi");
    }
    setBusy("");
  };
  return (
    <Sheet open={!!o} onClose={onClose} title={o ? `${o.customer || "Müşteri"} · ${o.placeName}` : ""}>
      {o && done && (
        <div className="grid place-items-center gap-3 py-10" role="status">
          <span className={`yst-ring grid size-20 place-items-center rounded-full ${DONE_TONE[done] || "bg-accbg text-acc"}`}>
            <Icon name={DONE_ICON[done] || "check"} className={`yst-${done} size-9`} />
          </span>
          <b className="text-[1.125rem] font-bold">{DONE_SAY[done] || STATUS_NAMES[done]}</b>
        </div>
      )}
      {o && !done && (
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

// Kuryeler: haritada yerleri, listede müsait / siparişte (siparişteki kurye "Kuryeye ver"de seçilemez).
// Deneme modunda Dikili'de 6 deneme kuryesi yüklenebilir ya da kaldırılabilir.
function Couriers({ couriers, orders, demo, save, signup }) {
  const toast = useToast();
  const [wait, setWait] = useState(false);
  // Kurye kaydı (giriş ekranında "Kurye olarak kayıt ol"): sunucu açar/kapar; kayıtlı kurye silinince hesabı da kapanır
  const flip = async () => {
    setWait(true);
    try {
      await kuryeApi("signup", { open: !signup });
    } catch (e) {
      toast(e.message);
    }
    setWait(false);
  };
  const pass = async (c) => {
    const p = window.prompt(`${c.name} için yeni şifre (en az 6 karakter)`);
    if (!p) return;
    try {
      const r = await kuryeApi("password", { id: c.id, password: p });
      toast(`Kullanıcı adı ${r.login}, şifre kaydedildi`);
    } catch (e) {
      toast(e.message);
    }
  };
  // Deneme kuryeleri gerçek hesap olarak açılır (kullanıcı adları listede, şifre burada verilir)
  const demoFlip = async () => {
    const password = hasDemo ? "" : window.prompt("Deneme kuryelerinin şifresi (en az 6 karakter)");
    if (!hasDemo && !password) return;
    setWait(true);
    try {
      await kuryeApi("demo", { on: !hasDemo, password });
      toast(hasDemo ? "Deneme kuryeleri kaldırıldı" : "Deneme kuryeleri eklendi");
    } catch (e) {
      toast(e.message);
    }
    setWait(false);
  };
  const drop = (c) => {
    if (!window.confirm(`${c.name} silinsin mi?`)) return;
    if (c.account) kuryeApi("remove", { id: c.id }).catch((e) => toast(e.message));
    else save({ couriers: couriers.filter((x) => x.id !== c.id) });
  };
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vehicle, setVehicle] = useState("motor");
  const add = () => {
    if (!name.trim()) return;
    save({ couriers: [...couriers, { id: `k${Date.now().toString(36)}`, name: name.trim(), phone: phone.trim(), vehicle }] });
    setName("");
    setPhone("");
  };
  const shown = sortCouriers(couriers, orders);
  const hasDemo = couriers.some((c) => c.demo);
  return (
    <section className="space-y-3">
      {couriers.length > 0 && <CourierMap couriers={shown} places={PLACES} />}
      <div>
        <ListHead title="Kuryeler" count={couriers.length} />
        <RowList>
          {!couriers.length && <p className="py-4 text-center text-[0.875rem] text-mut">Kurye yok</p>}
          {shown.map((c) => (
            <div key={c.id} className="flex min-h-[3.5rem] items-center gap-3 border-t border-line py-2.5 first:border-t-0">
              <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[0.875rem] font-bold ${c.busy ? "bg-deep text-white" : "bg-accbg text-acc"}`}>{c.name.slice(0, 2).toLocaleUpperCase("tr")}</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{c.name}</b>
                <small className="block truncate text-[0.8125rem] text-mut">{c.busy ? `Siparişte${c.order ? ` · ${c.order.placeName} #${orderNo(c.order.id)}` : ""}` : [c.account && (c.login || "Hesaplı"), VEHICLES[c.vehicle || "motor"], c.phone].filter(Boolean).join(" · ")}</small>
              </span>
              <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.75rem] font-bold ${c.busy ? "bg-line text-mut" : "bg-accbg text-acc"}`}>{c.busy ? "Siparişte" : "Müsait"}</span>
              {c.account && <button type="button" onClick={() => pass(c)} className="shrink-0 text-[0.8125rem] font-semibold text-acc">Şifre</button>}
              <button type="button" aria-label={`${c.name} sil`} onClick={() => drop(c)} data-press className="btn btn-icon btn-sm text-mut">
                <Icon name="trash" className="size-4" />
              </button>
            </div>
          ))}
        </RowList>
      </div>
      <div className="flex min-h-[3.5rem] items-center gap-3 rounded-[1.25rem] border border-line bg-card px-3.5 py-2.5">
        <span className="min-w-0 flex-1">
          <b className="block text-[0.9375rem] font-semibold">Kurye kaydı</b>
          {signup && <small className="block truncate text-[0.8125rem] text-mut">sesliasistan.netlify.app/kurye-kayit</small>}
        </span>
        <Switch on={signup} onChange={wait ? undefined : flip} label="Kurye kaydı" />
      </div>
      {demo && (
        <Button variant="secondary" loading={wait} onClick={demoFlip}>
          {hasDemo ? "Deneme kuryelerini kaldır" : "Deneme kuryeleri ekle"}
        </Button>
      )}
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad" maxLength={30} className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-3.5 text-base outline-none focus:border-acc" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" inputMode="tel" maxLength={20} className="h-11 w-32 rounded-xl border border-line bg-card px-3.5 text-base outline-none focus:border-acc" />
      </div>
      <div className="flex gap-2">
        {Object.entries(VEHICLES).map(([k, n]) => (
          <button key={k} type="button" aria-pressed={vehicle === k} onClick={() => setVehicle(k)} data-press
            className={`h-11 flex-1 rounded-xl border text-[0.875rem] font-semibold ${vehicle === k ? "border-acc bg-accbg text-acc" : "border-line bg-card"}`}>{n}</button>
        ))}
      </div>
      <Button disabled={!name.trim()} onClick={add}>Kurye ekle</Button>
    </section>
  );
}
