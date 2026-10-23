"use client";

import { useEffect, useRef, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { RowList, Row } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { minutesLeft } from "../order";
import { distanceM } from "../address";
import { placeById, useSettings, useToday, deliverOrder, courierAt } from "../store";
import { tl } from "./Img";
import { TrackMap } from "./TrackMap";
import { useNow, useRemembered, withLive } from "./AdminView";

// Velora Yemek › Kurye ekranı (başka telefondan açılır; kurye bu cihazda hatırlanır). Yoldaki siparişleri gösterir;
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
  return <Courier orgId={orgId} courier={courier} onChange={() => pick("")} />;
}

function Top({ title, sub, onSub, pill }) {
  return (
    <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Kurye ekranı">
      <header className="flex items-center gap-2.5">
        <BackButton href="/yemek/yonetim" />
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

function Courier({ orgId, courier, onChange }) {
  const toast = useToast();
  const today = useToday(orgId);
  const now = useNow();
  const [busy, setBusy] = useState("");
  const [gps, setGps] = useState(""); // "" | "on" | "off"
  const mine = withLive(today, now).filter((o) => o.live.status === "onTheWay" && o.courier?.id === courier.id);
  const ids = mine.map((o) => o.id).join(",");
  const last = useRef(null); // { pos, t }

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
        list.forEach((id) => courierAt(orgId, id, pos).catch(() => {}));
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
  }, [ids, orgId]);

  const done = async (o) => {
    setBusy(o.id);
    try {
      await deliverOrder(orgId, o);
      toast("Teslim edildi");
    } catch {
      toast("Olmadı, yeniden dene");
    }
    setBusy("");
  };

  const pill = ids ? (
    <span className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ${gps === "off" ? "bg-warnbg text-warn" : "ck-glass"}`}>{gps === "off" ? "Konum kapalı" : "Konum açık"}</span>
  ) : null;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <Top title={courier.name} sub="Kurye · değiştir" onSub={onChange} pill={pill} />
      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-4 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {today && !mine.length && <p className="pt-6 text-center text-[0.9375rem] text-mut">Yolda sipariş yok</p>}
        {mine.map((o) => {
          const place = placeById(o.placeId);
          const to = o.address?.pos;
          const nav = to ? `https://maps.apple.com/?daddr=${to.lat},${to.lng}&dirflg=d` : "";
          return (
            <section key={o.id} className="space-y-3">
              <TrackMap from={place?.pos} to={to} courier={o.live.courier?.pos} />
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
    </main>
  );
}
