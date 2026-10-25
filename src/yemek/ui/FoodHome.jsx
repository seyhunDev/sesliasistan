"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/buttonClass";
import { ListHead, RowList, Row, SkelRow } from "@/components/ui/Row";
import { isOpenAt, makeLine } from "../order";
import { pickAddress } from "../address";
import { suggest, parseAsk } from "../suggest";
import { liveView } from "../demo";
import { minutesLeft, STATUS_NAMES, isOpenOrder } from "../order";
import { PLACES, placeById, useFood, useOrder, herePos, writeCart, openNow } from "../store";
import { Img, tl, rating } from "./Img";
import { FoodSettings } from "./FoodSettings";

// Alışveriş › Yemek (müşteri; Seyhun 2026-10-22 "Ne yiyelim" örneği A): lacivertte arama ve fotoğraflı mutfaklar,
// altta açık sipariş, "Sana göre" (öneri kuralları, src/yemek/suggest.js), son siparişler (Aynısı) ve restoranlar.
// ⋯ = Yemek ayarların (adresler, ödeme, önceki siparişler); yönetim Velora Food'da.
const CUISINES = [
  ["pizza", "Pizza", "pizzaPep"], ["burger", "Burger", "burger"], ["ev yemeği", "Ev yemeği", "stew"], ["sushi", "Sushi", "sushi"],
  ["döner", "Döner", "doner"], ["balık", "Balık", "fish"], ["tatlı", "Tatlı", "cake"], ["kahvaltı", "Kahvaltı", "breakfast"],
];
const day = (iso) => {
  const d = new Date(iso), t = new Date();
  const diff = Math.round((new Date(t.toDateString()) - new Date(d.toDateString())) / 86400000);
  return diff === 0 ? "Bugün" : diff === 1 ? "Dün" : `${d.toLocaleDateString("tr-TR", { weekday: "short" })} ${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`;
};

export function FoodHome({ orgId, tabs }) {
  const router = useRouter();
  const food = useFood(orgId);
  const [cuisine, setCuisine] = useState("");
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const [pos, setPos] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    herePos().then(setPos);
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const addr = food ? pickAddress(food.me.addresses || [], pos, food.me.lastAddressId) : null;
  const where = addr?.address ? `${addr.address.name}${addr.why === "near" ? " · konumuna göre" : ""}` : "Adres seçilmedi";
  const ask = useMemo(() => (q.trim() ? parseAsk(q, PLACES) : { cuisine: cuisine || undefined }), [q, cuisine]);
  const picks = useMemo(() => (food ? suggest({ places: PLACES, history: food.history, ask, now, pos: addr?.address?.pos, n: 5, closed: food.settings?.closed }) : []), [food, ask, addr?.address?.pos]); // eslint-disable-line react-hooks/exhaustive-deps
  const needle = q.trim().toLocaleLowerCase("tr");
  const places = PLACES.filter((p) => (!cuisine || p.cuisines.includes(cuisine)) && (!needle || [p.name, ...p.cuisines, ...p.menu.flatMap((c) => c.items.map((i) => i.name))].some((s) => s.toLocaleLowerCase("tr").includes(needle))))
    .sort((a, b) => openNow(b, food?.settings) - openNow(a, food?.settings));
  // Deneme siparişinin durumu saatten hesaplanır (kayıtta "sent" kalmış olabilir)
  const live = (food?.history || []).map((o) => ({ ...o, status: o.status === "cancelled" ? o.status : liveView(o, placeById(o.placeId), now).status }));
  const open = live.find(isOpenOrder);
  // Geçmiş oturumda bir kez okunur; açık sipariş ayrıca canlı dinlenir ki restoran/kurye ilerletince burada da görünsün
  // (Seyhun 2026-10-24: teslim edilmiş sipariş "10 dk" diye kalıyordu). Teslim olunca dinleme biter.
  useOrder(orgId, open?.id);
  const past = live.filter((o) => o.status === "delivered").slice(0, 3);

  function again(o) {
    const place = placeById(o.placeId);
    if (!place) return;
    const items = place.menu.flatMap((c) => c.items);
    const lines = o.lines.map((l) => { const it = items.find((i) => i.id === l.itemId); return it && makeLine(it, { qty: l.qty, picks: l.picks, note: l.note }); }).filter(Boolean);
    writeCart({ placeId: place.id, lines });
    router.push(`/yemek/${place.id}?sepet=1`);
  }

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Yemek">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Ne yiyelim?</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{food ? where : "…"}</p>
          </div>
          <button type="button" onClick={() => setMenu(true)} aria-label="Yemek ayarların" data-press className={buttonClass({ variant: "back" })}>
            <Icon name="more" className="size-5" />
          </button>
        </header>
        {tabs}
        <label className="ck-glass mt-3 flex h-11 items-center gap-2 rounded-xl px-3.5">
          <Icon name="search" className="size-4 shrink-0 text-white/60" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Yemek ya da restoran ara" enterKeyHint="search" className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-white outline-none placeholder:text-white/55" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Temizle" className="text-white/60"><Icon name="x" className="size-4" /></button>}
        </label>
        <div className="-mx-5 mt-3.5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {CUISINES.map(([k, name, photo]) => (
            <button key={k} type="button" onClick={() => setCuisine((c) => (c === k ? "" : k))} aria-pressed={cuisine === k} className="flex w-16 shrink-0 flex-col items-center gap-1.5 active:scale-95">
              <Img src={photo} w={160} className={`size-14 rounded-full ring-2 ${cuisine === k ? "ring-[#67e8f9]" : "ring-white/20"}`} />
              <span className={`w-full truncate text-center text-[0.75rem] font-semibold ${cuisine === k ? "text-white" : "text-white/75"}`}>{name}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {open && <OpenOrder order={open} now={now} />}

        <section>
          <ListHead title={q ? "Bulunanlar" : "Sana göre"} />
          {!food ? (
            <RowList><SkelRow /><SkelRow /></RowList>
          ) : picks.length ? (
            <div className="-mx-5 flex snap-x scroll-px-5 gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
              {picks.map((c) => (
                <Link key={c.item.id} href={`/yemek/${c.place.id}?urun=${c.item.id}`} data-press className="w-[14.5rem] shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-line bg-card">
                  <Img src={c.item.photo} w={480} alt={c.item.name} className="h-[8.5rem] w-full" />
                  <span className="block px-3 pb-3 pt-2.5">
                    <b className="block truncate text-[0.9375rem] font-semibold">{c.item.name}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">{c.place.name} · {c.min} dk · {tl(c.price)}</small>
                    <span className="mt-1.5 inline-block max-w-full truncate rounded-md bg-accbg px-1.5 py-0.5 text-[0.75rem] font-semibold text-acc">{c.why}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-1 text-[0.875rem] text-mut">Şu an uygun yer yok.</p>
          )}
        </section>

        {past.length > 0 && !q && (
          <section>
            <ListHead title="Son siparişler" />
            <RowList>
              {past.map((o) => (
                <div key={o.id} className="flex min-h-[3.5rem] items-center gap-3 border-t border-line py-2.5 first:border-t-0">
                  <Link href={`/yemek/siparis/${o.id}`} className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{o.placeName} · {o.lines.map((l) => l.name).join(", ")}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">
                      {day(o.at)} · {o.address?.name || ""} · {tl(o.total)}{o.rating ? ` · ★${o.rating}` : ""}{o.review ? ` "${o.review}"` : ""}
                    </small>
                  </Link>
                  <button type="button" onClick={() => again(o)} data-press className="btn btn-secondary btn-sm shrink-0">Aynısı</button>
                </div>
              ))}
            </RowList>
          </section>
        )}

        <section>
          <ListHead title="Restoranlar" count={places.length} />
          <div className="space-y-3">
            {places.map((p) => {
              const on = openNow(p, food?.settings);
              return (
                <Link key={p.id} href={`/yemek/${p.id}`} data-press className={`block overflow-hidden rounded-[1.25rem] border border-line bg-card ${on ? "" : "opacity-60"}`}>
                  <span className="relative block">
                    <Img src={p.cover} w={800} alt={p.name} className="h-[7.5rem] w-full" />
                    <span className="absolute left-2.5 top-2.5 rounded-lg bg-white px-2 py-0.5 text-[0.75rem] font-bold text-deep">{on ? `${p.prepMin + 10} dk` : isOpenAt(p) ? "Kapalı" : `Kapalı · ${p.hours[0]}`}</span>
                  </span>
                  <span className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold">{p.name}</b>
                      <small className="block truncate text-[0.8125rem] text-mut">{p.cuisines.map(cap).join(", ")} · Min {tl(p.minOrder)} · {p.fee ? `Teslim ${tl(p.fee)}` : "Teslim ücretsiz"}</small>
                    </span>
                    <span className="shrink-0 text-[0.9375rem] font-bold">★ {rating(p.rating)}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <FoodSettings open={menu} onClose={() => setMenu(false)} orgId={orgId} food={food} orders={live} day={day} onAgain={again} />
    </main>
  );
}

const cap = (s) => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);

// Açık sipariş: en üstte tek satır, dokununca takip
function OpenOrder({ order, now }) {
  const place = placeById(order.placeId);
  const v = liveView(order, place, now);
  return (
    <section>
      <ListHead title="Siparişin" />
      <RowList>
        <Row
          href={`/yemek/siparis/${order.id}`}
          lead={<Img src={place?.cover} w={160} className="size-11 shrink-0 rounded-xl" />}
          title={`${order.placeName} · ${STATUS_NAMES[v.status]}`}
          sub={order.lines.map((l) => l.name).join(", ")}
          right={`${minutesLeft(v.eta, new Date(now))} dk`}
        />
      </RowList>
    </section>
  );
}
