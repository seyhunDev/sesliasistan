"use client";

import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { RowList, Row } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { minutesLeft } from "../order";
import { distanceM } from "../address";
import { placeById, useSettings, useToday, deliverOrder, courierAt, giveToCourier, saveSettings } from "../store";
import { orderNo, pickupOf, PICKUP_SAY } from "../qr";
import { ScanSheet } from "./ScanSheet";
import { tl } from "./Img";
import { TrackMap } from "./TrackMap";
import { photoUrl } from "../photo";
import { useNow, useRemembered, withLive } from "./AdminView";
import { kuryeApi } from "../courierApi";
import { logout } from "@/lib/auth";

// Velora Yemek › Kurye ekranı (başka telefondan açılır; kurye bu cihazda hatırlanır). Yoldaki siparişleri gösterir;
// "Kare kod okut": restoranın fişindeki ya da ekranındaki kod okutulup "Teslim al" denince sipariş bu kuryeye verilir (Yolda).
// sipariş varken telefonun konumu siparişe yazılır (en sık 10 sn'de bir, en az 25 m yer değişince), ekran açık tutulur.
const KEY = "yemek-kurye";
const STEP_MS = 10000;
const STEP_M = 25;

export function CourierView({ orgId }) {
  const settings = useSettings(orgId);
  const [cid, pick] = useRemembered(KEY);
  if (cid === null || !settings) return null;
  const courier = (settings.couriers || []).find((c) => c.id === cid);
  if (!courier) return <PickCourier couriers={settings.couriers || []} onPick={pick} />;
  return <Courier orgId={orgId} courier={courier} couriers={settings.couriers || []} onChange={() => pick("")} />;
}

// Kendi hesabıyla giren kurye (role "courier"): uygulamada yalnız bu ekran var. Yazmalar sunucudan (/api/kurye).
export function CourierSelf({ profile }) {
  const settings = useSettings(profile.courierOf);
  if (!settings) return null;
  const courier = (settings.couriers || []).find((c) => c.id === profile.uid);
  const out = () => window.confirm("Çıkış yapılsın mı?") && logout();
  if (!courier) {
    return (
      <main className="mx-auto max-w-[30rem] px-5">
        <Top title={profile.name} sub="Kurye · çıkış" onSub={out} self />
        <p className="pt-10 text-center text-[0.9375rem] text-mut">Kurye kaydın kaldırılmış</p>
      </main>
    );
  }
  return <Courier orgId={profile.courierOf} courier={courier} couriers={settings.couriers || []} onChange={out} self />;
}

function Top({ title, sub, onSub, pill, self }) {
  return (
    <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Kurye ekranı">
      <header className="flex items-center gap-2.5">
        {!self && <BackButton href="/yemek/yonetim" />}
        <button type="button" onClick={onSub} disabled={!onSub} className="min-w-0 flex-1 text-left leading-tight">
          <p className="truncate text-[0.8125rem] text-white/65">{sub}</p>
          <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{title}</h1>
        </button>
        {pill}
      </header>
    </section>
  );
}

function PickCourier({ couriers, onPick }) {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <Top title="Hangi kurye?" sub="Kurye ekranı" />
      <div className="relative -mx-5 -mt-6 min-h-[50vh] rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {couriers.length ? (
          <RowList>
            {couriers.map((c) => <Row key={c.id} title={c.name} sub={c.phone} onClick={() => onPick(c.id)} />)}
          </RowList>
        ) : (
          <p className="pt-6 text-center text-[0.9375rem] text-mut">Kurye yok · Yönetim › Kuryeler</p>
        )}
      </div>
    </main>
  );
}

// Kurye ekranı açıkken telefonun yeri kuryenin kaydına da yazılır (en sık dakikada bir, 100 m yer değişince):
// en yakın müsait kurye bundan bulunur
const HERE_MS = 60000;
const HERE_M = 100;

function Courier({ orgId, courier, couriers, onChange, self }) {
  const toast = useToast();
  const today = useToday(orgId);
  const now = useNow();
  const [busy, setBusy] = useState("");
  const [gps, setGps] = useState(""); // "" | "on" | "off"
  const [scan, setScan] = useState(null); // null | "cam" | { o, why } okutulan sipariş
  const all = withLive(today, now);
  const mine = all.filter((o) => o.live.status === "onTheWay" && o.courier?.id === courier.id);
  const given = all.filter((o) => ["sent", "accepted", "preparing"].includes(o.live.status) && o.courier?.id === courier.id);
  const ids = mine.map((o) => o.id).join(",");
  const last = useRef(null); // { pos, t }

  // Kuryenin yeri (müsait kurye seçimi için)
  const here = useRef(courier.pos ? { pos: courier.pos, t: 0 } : null);
  const list = useRef(couriers);
  useEffect(() => {
    list.current = couriers;
  });
  useEffect(() => {
    if (courier.demo || !navigator.geolocation) return;
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const pos = { lat: +p.coords.latitude.toFixed(5), lng: +p.coords.longitude.toFixed(5) };
        const h = here.current;
        if (h && (Date.now() - h.t < HERE_MS || distanceM(h.pos, pos) < HERE_M)) return;
        here.current = { pos, t: Date.now() };
        (self ? kuryeApi("pos", { pos, here: true })
          : saveSettings(orgId, { couriers: list.current.map((c) => (c.id === courier.id ? { ...c, pos, at: new Date().toISOString() } : c)) })).catch(() => {});
      },
      () => {},
      { maximumAge: 30000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [orgId, courier.id, courier.demo, self]);

  // Konum paylaşımı: yalnız yolda sipariş varken
  useEffect(() => {
    if (!ids || !navigator.geolocation) return;
    const list = ids.split(",");
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        setGps("on");
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        const l = last.current;
        if (l && Date.now() - l.t < STEP_MS) return;
        if (l && distanceM(l.pos, pos) < STEP_M) return;
        last.current = { pos, t: Date.now() };
        if (self) kuryeApi("pos", { pos, ids: list }).catch(() => {});
        else list.forEach((id) => courierAt(orgId, id, pos).catch(() => {}));
      },
      () => setGps("off"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    let lock = null;
    navigator.wakeLock?.request("screen").then((w) => (lock = w)).catch(() => {});
    return () => {
      navigator.geolocation.clearWatch(watch);
      lock?.release?.().catch(() => {});
    };
  }, [ids, orgId, self]);

  const done = async (o) => {
    setBusy(o.id);
    try {
      await (self ? kuryeApi("deliver", { id: o.id }) : deliverOrder(orgId, o));
      toast("Teslim edildi");
    } catch (e) {
      toast(self && e?.message ? e.message : "Olmadı, yeniden dene");
    }
    setBusy("");
  };

  const take = async (o) => {
    setBusy(o.id);
    try {
      await (self ? kuryeApi("pickup", { id: o.id }) : giveToCourier(orgId, o, placeById(o.placeId), courier));
      setScan(null);
      toast("Sipariş sende, yola çıkabilirsin");
    } catch (e) {
      toast(self && e?.message ? e.message : "Olmadı, yeniden dene");
    }
    setBusy("");
  };

  const pill = ids ? (
    <span className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ${gps === "off" ? "bg-warnbg text-warn" : "ck-glass"}`}>{gps === "off" ? "Konum kapalı" : "Konum açık"}</span>
  ) : null;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <Top title={courier.name} sub={self ? "Kurye · çıkış" : "Kurye · değiştir"} onSub={onChange} pill={pill} self={self} />
      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-4 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        <Button onClick={() => setScan("cam")}>Kare kod okut</Button>
        {given.length > 0 && (
          <RowList>
            {given.map((o) => (
              <Row key={o.id} title={`${o.placeName} · #${orderNo(o.id)}`} sub={`Restorana git · ${o.customer || "Müşteri"} · ${o.address?.name || ""}`} right={o.live.status === "sent" ? "Yeni" : "Hazırlanıyor"} />
            ))}
          </RowList>
        )}
        {today && !mine.length && !given.length && <p className="pt-6 text-center text-[0.9375rem] text-mut">Yolda sipariş yok</p>}
        {mine.map((o) => {
          const place = placeById(o.placeId);
          const to = o.address?.pos;
          const nav = to ? `https://maps.apple.com/?daddr=${to.lat},${to.lng}&dirflg=d` : "";
          return (
            <section key={o.id} className="space-y-3">
              <TrackMap from={place?.pos} to={to} courier={o.live.courier} route={o.route} f={o.live.f} photo={place?.cover && photoUrl(place.cover, 120)} />
              <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card">
                <div className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{o.customer || "Müşteri"} · {o.address?.name}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">{o.placeName} · {o.pay === "kapıda-nakit" ? "Nakit" : "Kart"} {tl(o.total)}</small>
                  </span>
                  <b className="shrink-0 text-[1.125rem] font-bold tabular-nums">{minutesLeft(o.live.eta, new Date(now))} dk</b>
                </div>
                {o.address?.text && <p className="border-t border-line px-3.5 py-2 text-[0.875rem]">{o.address.text}{o.address.note ? ` · ${o.address.note}` : ""}</p>}
                <div className="flex gap-2 border-t border-line p-2.5 [&>*]:flex-1">
                  {o.phone && <a href={`tel:${o.phone}`} data-press className="btn btn-secondary w-full">Ara</a>}
                  {nav && <a href={nav} target="_blank" rel="noreferrer" data-press className="btn btn-secondary w-full">Yol tarifi</a>}
                  <Button loading={busy === o.id} onClick={() => done(o)}>Teslim</Button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      <ScanSheet open={!!scan} onClose={() => setScan(null)} onCode={(text) => setScan(pickupOf(all, text))}>
        {scan && scan !== "cam" && <Picked scan={scan} busy={busy} onTake={take} onAgain={() => setScan("cam")} onClose={() => setScan(null)} />}
      </ScanSheet>
    </main>
  );
}

// Okutulan sipariş: verilebiliyorsa özeti ve "Teslim al"; değilse nedeni ve "Yeniden okut"
function Picked({ scan: { o, why }, busy, onTake, onAgain, onClose }) {
  if (why !== "ok") {
    return (
      <div className="space-y-4 pb-2">
        <p className="py-6 text-center text-[1rem] font-semibold">{PICKUP_SAY[why]}</p>
        <div className="grid grid-cols-[1fr_1.7fr] gap-2.5">
          <Button variant="secondary" onClick={onClose}>Kapat</Button>
          <Button onClick={onAgain}>Yeniden okut</Button>
        </div>
      </div>
    );
  }
  const n = o.lines.reduce((a, l) => a + l.qty, 0);
  return (
    <div className="space-y-4 pb-2">
      <div className="overflow-hidden rounded-[1.25rem] border border-line bg-bg">
        <div className="flex items-center gap-3 px-3.5 py-2.5">
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[0.9375rem] font-semibold">{o.placeName} · #{orderNo(o.id)}</b>
            <small className="block truncate text-[0.8125rem] text-mut">{n} ürün · {o.pay === "kapıda-nakit" ? "Nakit" : "Kart"} {tl(o.total)}</small>
          </span>
        </div>
        <p className="border-t border-line px-3.5 py-2 text-[0.875rem]"><b className="font-semibold">{o.customer || "Müşteri"} · {o.address?.name}</b>{o.address?.text ? ` · ${o.address.text}` : ""}</p>
      </div>
      <div className="grid grid-cols-[1fr_1.7fr] gap-2.5">
        <Button variant="secondary" onClick={onClose}>Vazgeç</Button>
        <Button loading={busy === o.id} onClick={() => onTake(o)}>Teslim al</Button>
      </div>
    </div>
  );
}
