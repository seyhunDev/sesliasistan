"use client";

import { useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { RowList, Row } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { lineDetail, minutesLeft } from "../order";
import { distanceKm } from "../address";
import { PLACES, placeById, useSettings, useToday, saveSettings, acceptOrder, rejectOrder, giveToCourier } from "../store";
import { Img, tl } from "./Img";
import { StatusTag, Switch, useNow, useRemembered, withLive } from "./AdminView";

// Velora Yemek › Restoran ekranı (örnek D): başka cihazdan açılır, hangi restoran olduğu telefonda hatırlanır.
// Yeni: Reddet / Onayla · N dk. Hazırlanan: Kuryeye ver (kurye seçilir). Yolda: kurye ve kalan dakika.
const KEY = "yemek-panel";
const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const km = (k) => (Number.isFinite(k) ? (k < 1 ? `${Math.round(k * 1000)} m` : `${k.toFixed(1).replace(".", ",")} km`) : "");

export function PanelView({ orgId }) {
  const [placeId, pick] = useRemembered(KEY);
  if (placeId === null) return null;
  const place = placeById(placeId);
  if (!place) return <PickPlace onPick={pick} />;
  return <Panel orgId={orgId} place={place} onChange={() => pick("")} />;
}

function PickPlace({ onPick }) {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <header className="flex items-center gap-2.5">
          <BackButton href="/yemek/yonetim" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[0.8125rem] text-white/65">Restoran ekranı</p>
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Hangi restoran?</h1>
          </div>
        </header>
      </section>
      <div className="relative -mx-5 -mt-6 min-h-[50vh] rounded-t-[1.75rem] bg-bg px-5 pt-5">
        <RowList>
          {PLACES.map((p) => (
            <Row key={p.id} onClick={() => onPick(p.id)} lead={<Img src={p.cover} w={160} className="size-11 shrink-0 rounded-xl" />} title={p.name} sub={p.cuisines.join(", ")} />
          ))}
        </RowList>
      </div>
    </main>
  );
}

function Panel({ orgId, place, onChange }) {
  const toast = useToast();
  const settings = useSettings(orgId);
  const today = useToday(orgId);
  const now = useNow();
  const [tab, setTab] = useState("new");
  const [give, setGive] = useState(null); // kuryeye verilecek sipariş
  const [busy, setBusy] = useState("");
  const mine = withLive(today, now).filter((o) => o.placeId === place.id);
  const groups = {
    new: mine.filter((o) => o.live.status === "sent"),
    cook: mine.filter((o) => ["accepted", "preparing"].includes(o.live.status)),
    road: mine.filter((o) => o.live.status === "onTheWay"),
  };
  const off = !!settings?.closed?.[place.id];
  const couriers = settings?.couriers || [];
  const run = async (id, fn) => {
    setBusy(id);
    try {
      await fn();
    } catch {
      toast("Olmadı, yeniden dene");
    }
    setBusy("");
  };

  const tabs = [["new", "Yeni", groups.new.length], ["cook", "Hazırlanan", groups.cook.length], ["road", "Yolda", groups.road.length]];
  const shown = groups[tab];
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Restoran ekranı">
        <header className="flex items-center gap-2.5">
          <BackButton href="/yemek/yonetim" />
          <Img src={place.cover} w={160} className="size-11 shrink-0 rounded-xl" />
          <button type="button" onClick={onChange} className="min-w-0 flex-1 text-left leading-tight">
            <p className="truncate text-[0.8125rem] text-white/65">Restoran · değiştir</p>
            <h1 className="truncate text-[1.25rem] font-bold tracking-[-.02em]">{place.name}</h1>
          </button>
          <Switch on={!off} label="Sipariş alıyor" onChange={() => saveSettings(orgId, { closed: { ...(settings?.closed || {}), [place.id]: !off } }).catch(() => toast("Kaydedilemedi"))} />
        </header>
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {tabs.map(([k, n, c]) => (
            <button key={k} type="button" data-press aria-pressed={tab === k} onClick={() => setTab(k)} className={`raised flex h-[3.25rem] flex-col items-start justify-center rounded-2xl border px-3 leading-tight ${tab === k ? "ck-sel" : ""}`}>
              <b className="text-[0.9375rem] font-semibold">{n}</b>
              <small className="text-[0.75rem] opacity-75">{c} sipariş</small>
            </button>
          ))}
        </div>
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-4 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {today && !shown.length && <p className="pt-6 text-center text-[0.9375rem] text-mut">{tab === "new" ? "Yeni sipariş yok" : tab === "cook" ? "Hazırlanan yok" : "Yolda sipariş yok"}</p>}
        {shown.map((o) => (
          <section key={o.id} className={`overflow-hidden rounded-[1.25rem] border bg-card ${tab === "new" ? "border-acc" : "border-line"}`}>
            <div className="flex items-center gap-3 border-b border-line px-3.5 py-2.5">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{o.customer || "Müşteri"} · {o.address?.name} {km(distanceKm(place.pos, o.address?.pos)) && `· ${km(distanceKm(place.pos, o.address?.pos))}`}</b>
                <small className="block truncate text-[0.8125rem] text-mut">{hm(o.at)} · {o.pay === "kapıda-nakit" ? "Kapıda nakit" : "Kapıda kart"} · {tl(o.total)}{o.demo ? " · deneme" : ""}</small>
              </span>
              <StatusTag status={o.live.status} extra={o.live.status === "onTheWay" ? `${minutesLeft(o.live.eta, new Date(now))} dk` : ""} />
            </div>
            <div className="px-3.5">
              {o.lines.map((l, i) => {
                const it = place.menu.flatMap((c) => c.items).find((x) => x.id === l.itemId);
                return (
                  <div key={i} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                    <Img src={it?.photo} w={160} className="size-11 shrink-0 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{l.qty}× {l.name}</b>
                      {lineDetail(l) && <small className="block truncate text-[0.8125rem] text-mut">{lineDetail(l)}</small>}
                    </span>
                  </div>
                );
              })}
            </div>
            {o.address?.text && <p className="border-t border-line px-3.5 py-2 text-[0.8125rem] text-mut">{o.address.text}{o.address.note ? ` · ${o.address.note}` : ""}</p>}
            {tab !== "road" && (
              <div className="grid grid-cols-[1fr_1.7fr] gap-2 border-t border-line p-2.5">
                {tab === "new" ? (
                  <>
                    <Button variant="secondary" disabled={!!busy} onClick={() => window.confirm("Sipariş reddedilsin mi?") && run(o.id, () => rejectOrder(orgId, o))}>Reddet</Button>
                    <Button loading={busy === o.id} onClick={() => run(o.id, () => acceptOrder(orgId, o, place))}>Onayla · {place.prepMin} dk</Button>
                  </>
                ) : (
                  <>
                    <span />
                    <Button loading={busy === o.id} onClick={() => setGive(o)}>Kuryeye ver</Button>
                  </>
                )}
              </div>
            )}
            {tab === "road" && o.courier && (
              <p className="border-t border-line px-3.5 py-2.5 text-[0.875rem] font-semibold">Kurye: {o.courier.name}</p>
            )}
          </section>
        ))}
      </div>

      <Sheet open={!!give} onClose={() => setGive(null)} title="Hangi kurye?">
        <div className="space-y-3 pb-2">
          {couriers.length ? (
            <RowList>
              {couriers.map((c) => (
                <Row key={c.id} title={c.name} sub={c.phone} onClick={() => { const o = give; setGive(null); run(o.id, () => giveToCourier(orgId, o, place, c)); }} />
              ))}
            </RowList>
          ) : (
            <p className="py-2 text-center text-[0.9375rem] text-mut">Kurye yok · Yönetim › Kuryeler</p>
          )}
        </div>
      </Sheet>
    </main>
  );
}
