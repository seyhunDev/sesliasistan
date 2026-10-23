"use client";

import { Button } from "@/components/ui/Button";
import { ListHead, RowList, Row } from "@/components/ui/Row";
import { Img } from "./Img";

// Kurye ana sayfası (Seyhun 2026-10-23): lacivertte kuryenin adı, durumu ve bugünün sayıları; altta Kare kod okut,
// Yolda (harita + müşteri + Teslim), Sırada (restorana gidilecekler), Bugün teslim. Yalnız görünüm; veri CourierView'dan.
// active: [{ id, title, sub, left, address, phone, nav, map, busy }]  next: [{ id, title, sub, right, photo }]  done: [{ id, title, sub, at }]
export function CourierBoard({ name, busy, gps, onOut, outLabel = "Çıkış", onScan, onDone, active = [], next = [], done = [], head }) {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Kurye">
        <header className="flex items-center gap-3">
          {head}
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white/12 text-[0.9375rem] font-bold">{name.slice(0, 2).toLocaleUpperCase("tr")}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[0.8125rem] text-white/65">{gps === "off" ? "Konum kapalı" : "Kurye"}</p>
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{name}</h1>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ${busy ? "ck-glass" : "bg-[#67e8f9] text-[#11203a]"}`}>{busy ? "Siparişte" : "Müsait"}</span>
          {onOut && <button type="button" onClick={onOut} className="shrink-0 text-[0.8125rem] font-semibold text-white/65">{outLabel}</button>}
        </header>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {[["Yolda", active.length], ["Sırada", next.length], ["Teslim", done.length]].map(([k, n]) => (
            <div key={k} className="ck-glass rounded-2xl px-3 py-2.5">
              <b className="block text-[1.75rem] font-extrabold leading-none tabular-nums">{n}</b>
              <small className="mt-1 block text-[0.8125rem] font-semibold text-white/65">{k}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        <Button onClick={onScan}>Kare kod okut</Button>

        {active.length > 0 && (
          <section className="space-y-3">
            <ListHead title="Yolda" />
            {active.map((a) => (
              <div key={a.id} className="overflow-hidden rounded-[1.25rem] border border-line bg-card">
                {a.map}
                <div className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{a.title}</b>
                    <small className="block truncate text-[0.8125rem] text-mut">{a.sub}</small>
                  </span>
                  <b className="shrink-0 text-[1.375rem] font-extrabold tabular-nums">{a.left} dk</b>
                </div>
                {a.address && <p className="border-t border-line px-3.5 py-2 text-[0.875rem]">{a.address}</p>}
                <div className="flex gap-2 border-t border-line p-2.5 [&>*]:flex-1">
                  {a.phone && <a href={`tel:${a.phone}`} data-press className="btn btn-secondary w-full">Ara</a>}
                  {a.nav && <a href={a.nav} target="_blank" rel="noreferrer" data-press className="btn btn-secondary w-full">Yol tarifi</a>}
                  <Button loading={a.busy} onClick={() => onDone(a.id)}>Teslim</Button>
                </div>
              </div>
            ))}
          </section>
        )}

        {next.length > 0 && (
          <section>
            <ListHead title="Sırada" count={next.length} />
            <RowList>
              {next.map((n) => (
                <Row key={n.id} lead={<Img src={n.photo} w={120} className="size-11 shrink-0 rounded-xl" />} title={n.title} sub={n.sub} right={<span className="text-[0.8125rem] font-semibold text-acc">{n.right}</span>} />
              ))}
            </RowList>
          </section>
        )}

        {!active.length && !next.length && <p className="py-4 text-center text-[0.9375rem] text-mut">Şu an sipariş yok</p>}

        {done.length > 0 && (
          <section>
            <ListHead title="Bugün teslim" count={done.length} />
            <RowList>
              {done.map((d) => <Row key={d.id} title={d.title} sub={d.sub} right={<span className="text-[0.8125rem] font-semibold text-mut">{d.at}</span>} />)}
            </RowList>
          </section>
        )}
      </div>
    </main>
  );
}
