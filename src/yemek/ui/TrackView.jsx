"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { ListHead, RowList, Row } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { STATUS_NAMES, lineDetail, minutesLeft } from "../order";
import { liveView } from "../demo";
import { placeById, useOrder, patchOrder } from "../store";
import { tl } from "./Img";
import { photoUrl } from "../photo";
import { VEHICLES, roadMin } from "../route";
import { TrackMap } from "./TrackMap";

// Sipariş takibi (örnek 6-7): lacivertte büyük kalan süre ve 4 adım; yolda iken haritada kurye;
// sipariş, adım adım saatler; teslimden sonra puan (1-5) ve not. Deneme modunda durum kendiliğinden ilerler (demo.js).
const STEPS = [["accepted", "Onaylandı"], ["preparing", "Hazırlanıyor"], ["onTheWay", "Yolda"], ["delivered", "Teslim"]];
const hm = (iso) => new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const PAY = { "kapıda-kart": "Kapıda kart", "kapıda-nakit": "Kapıda nakit" };

export function TrackView({ orgId, id }) {
  const order = useOrder(orgId, id);
  const toast = useToast();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 4000);
    return () => clearInterval(t);
  }, []);
  // Deneme siparişi teslim saatine gelince kayda da "teslim edildi" yazılır (geçmiş ve öneri bunu okur)
  const demoDone = order?.demo && order.status !== "delivered" && order.status !== "cancelled" && liveView(order, placeById(order.placeId), now).status === "delivered";
  useEffect(() => {
    if (demoDone) patchOrder(orgId, order.id, { status: "delivered", times: liveView(order, placeById(order.placeId)).times }).catch(() => {});
  }, [demoDone]); // eslint-disable-line react-hooks/exhaustive-deps
  if (order === null) return <Loading label="Sipariş yükleniyor" />;
  if (order === false) return <p className="p-10 text-center text-mut">Sipariş bulunamadı.</p>;

  const place = placeById(order.placeId);
  const v = liveView(order, place, now);
  const step = ["sent", ...STEPS.map((s) => s[0])].indexOf(v.status);
  const done = v.status === "delivered", cancelled = v.status === "cancelled";
  const left = minutesLeft(v.eta, new Date(now));

  async function cancel() {
    if (!window.confirm("Sipariş iptal edilsin mi?")) return;
    try {
      await patchOrder(orgId, order.id, { status: "cancelled", times: { ...v.times, cancelled: new Date().toISOString() } });
    } catch {
      toast("İptal edilemedi");
    }
  }

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Sipariş">
        <header className="flex items-center gap-2.5">
          <BackButton href="/shopping?tab=yemek" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[0.8125rem] text-white/65">{order.placeName} · {order.address?.name}</p>
            <h1 className="truncate text-[2.5rem] font-extrabold leading-none tracking-[-.03em] tabular-nums">
              {cancelled ? "İptal" : done ? "Teslim edildi" : `${left} dk`}
            </h1>
          </div>
        </header>
        {!cancelled && (
          <>
            <div className="mt-4 grid grid-cols-4 gap-1">
              {STEPS.map(([k], i) => <span key={k} className={`h-1.5 rounded-full ${i < step ? "bg-[#67e8f9]" : "bg-white/20"}`} />)}
            </div>
            <div className="mt-1.5 grid grid-cols-4 gap-1 text-[0.6875rem] font-semibold text-white/60">
              {STEPS.map(([k, n], i) => <span key={k} className={`truncate ${i === step - 1 ? "text-white" : ""}`}>{k === "onTheWay" && v.courier && i === step - 1 ? `Yolda · ${v.courier.name}` : n}</span>)}
            </div>
          </>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {!done && !cancelled && (
          <TrackMap from={place?.pos} to={order.address?.pos} courier={v.courier} route={order.route} photo={place?.cover && photoUrl(place.cover, 120)} f={v.f}
            info={v.courier ? `${v.courier.name} · ${VEHICLES[v.courier.vehicle || "motor"]}${order.route ? ` · ${String(order.route.km).replace(".", ",")} km` : ""}` : `Hazırlık ${place?.prepMin || 20} dk · Yol ${roadMin(order, place)} dk`} />
        )}

        {done && <Rate order={order} orgId={orgId} />}

        <section>
          <ListHead title="Sipariş" />
          <RowList>
            {order.lines.map((l, i) => <Row key={i} title={`${l.qty > 1 ? `${l.qty}× ` : ""}${l.name}`} sub={lineDetail(l)} right={tl(l.unit * l.qty)} />)}
            <Row title={`Toplam · ${PAY[order.pay] || ""}`} right={tl(order.total)} />
          </RowList>
        </section>

        <section>
          <ListHead title="Adım adım" />
          <RowList>
            {[...(cancelled ? ["cancelled"] : []), ...["delivered", "onTheWay", "preparing", "accepted", "sent"].filter((s) => v.times[s])].map((s) => (
              <Row key={s} title={STATUS_NAMES[s]} right={<span className="text-[0.8125rem] font-semibold text-mut">{hm(v.times[s] || order.times?.[s])}</span>} />
            ))}
          </RowList>
          {order.demo && <p className="mt-1.5 px-1 text-[0.75rem] text-mut">Deneme modu</p>}
        </section>

        {!done && !cancelled && (
          <div className="grid grid-cols-2 gap-2.5">
            <Button variant="secondary" disabled={step > 1} onClick={cancel}>İptal et</Button>
            <a href={`tel:${(place?.phone || "").replace(/\s/g, "")}`} data-press className="btn btn-secondary w-full"><Icon name="phone" className="size-4" /> Restoranı ara</a>
          </div>
        )}
      </div>
    </main>
  );
}

// Teslimden sonra: "Nasıldı?" yıldızlar + kısa not (öneriler bunu okur: 4-5 öne, "bir daha alma" geri)
function Rate({ order, orgId }) {
  const toast = useToast();
  const [stars, setStars] = useState(order.rating || 0);
  const [note, setNote] = useState(order.review || "");
  const [saved, setSaved] = useState(!!order.rating);
  async function save(n = stars) {
    try {
      await patchOrder(orgId, order.id, { rating: n, review: note.trim() });
      setSaved(true);
      toast("Kaydedildi");
    } catch {
      toast("Kaydedilemedi");
    }
  }
  return (
    <section>
      <ListHead title="Nasıldı?" />
      <div className="space-y-3 rounded-[1.25rem] border border-line bg-card p-3.5">
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} yıldız`} onClick={() => (setStars(n), setSaved(false))} data-press className="grid size-12 place-items-center">
              <Icon name="star" className={`size-8 ${n <= stars ? "fill-[#c99a2e] text-[#c99a2e]" : "text-line"}`} />
            </button>
          ))}
        </div>
        <input value={note} onChange={(e) => (setNote(e.target.value), setSaved(false))} placeholder="Not (ör. biraz geç geldi)" maxLength={120}
          className="h-11 w-full rounded-xl border border-line bg-bg px-3.5 text-base outline-none focus:border-acc" />
        {!saved && <Button disabled={!stars} onClick={() => save()}>Kaydet</Button>}
      </div>
    </section>
  );
}
