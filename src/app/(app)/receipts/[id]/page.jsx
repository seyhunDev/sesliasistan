"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { buttonClass } from "@/components/ui/buttonClass";
import { useParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Tile } from "@/components/dashboard/Row";
import { useData } from "@/features/data/DataProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { PayBox } from "@/features/receipts/Payment";
import { DOC, TLk, catOf, checkWhy, noText, totalOf } from "@/lib/receipts";
import { fdate, rel } from "@/lib/utils/format";
import { Loading } from "@/components/ui/Loader";

const btn = buttonClass({ variant: "secondary", size: "sm", full: false });

function Sec({ title, children }) {
  return (
    <>
      <h4 className="mb-2 mt-6 px-1 text-[0.8125rem] font-medium text-mut">{title}</h4>
      <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">{children}</div>
    </>
  );
}
function Kv({ k, v, sub, strong }) {
  if (v === "" || v == null) return null;
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5 text-[0.9375rem]">
      <span className="min-w-0 text-mut">
        {k}
        {sub && <small className="block text-[0.8125rem]">{sub}</small>}
      </span>
      <b className={`text-right tabular-nums ${strong ? "text-base font-bold text-fg" : "font-semibold"}`}>{v}</b>
    </div>
  );
}

export default function ReceiptDetailPage() {
  const { id } = useParams();
  const { receipts, loading, loadReceiptImage, isStaff, setReceiptScope, setReceiptChecked } = useData();
  const { openReceipt } = useReceipt();
  const [img, setImg] = useState(null);
  const [zoom, setZoom] = useState(false);
  const r = receipts.find((x) => x.id === id);

  useEffect(() => {
    setImg(null);
    if (r?.hasImage) loadReceiptImage(id).then(setImg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, r?.hasImage, r?.updatedAt]);

  if (!r) {
    return (
      <main className="mx-auto max-w-[30rem] px-5 pt-4">
        <BackButton href="/receipts" label="Fişler" />
        {loading ? <Loading /> : <p className="mt-12 text-center text-mut">Fiş bulunamadı.</p>}
      </main>
    );
  }

  const t = r.totals || { gross: 0, vat: 0, net: 0, byRate: [] };
  const total = totalOf(r);
  const why = checkWhy(r); // kontrol bekliyorsa nedeni
  const c = catOf(r.cat);
  const conf = r.conf;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between py-1.5">
        <BackButton href="/receipts" label="Fişler" />
        <button onClick={() => openReceipt({ edit: r.id })} data-press className={btn}><Icon name="edit" className="size-[1.125rem]" /> Düzenle</button>
      </div>

      {/* Başlık kartı */}
      <div className="mt-3 rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center gap-3">
          <Tile icon={c.icon} />
          <span className="min-w-0 flex-1">
            <b className="block truncate text-[1.0625rem] font-semibold">{r.merchant || "İsimsiz"}</b>
            <small className="block text-[0.8125rem] text-mut">
              Fiş no <b className="font-mono font-bold text-acc">{noText(r.no) || "bekleniyor"}</b>
            </small>
          </span>
          {img && (
            <button onClick={() => setZoom(true)} aria-label="Fotoğrafı büyüt" className="shrink-0">
              <img src={img} alt="Fiş" className="size-12 rounded-lg object-cover ring-1 ring-line" />
            </button>
          )}
        </div>
        <div className="mt-2 text-[1.75rem] font-bold tracking-tight tabular-nums">{TLk(total)}</div>
        <p className="text-[0.875rem] text-mut">
          {[rel(r.date), r.time, r.cat, r.pay].filter(Boolean).join(" · ")}
        </p>
        {why && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.875rem] font-semibold text-amber-800">
            <Icon name="alert" className="size-4 shrink-0" />
            <span className="min-w-0 flex-1">{why}</span>
            <button type="button" onClick={() => setReceiptChecked(r.id)} className="h-9 shrink-0 rounded-full bg-card px-3.5 text-[0.8125rem] font-semibold text-acc">
              Doğru
            </button>
          </div>
        )}
      </div>

      <PayBox r={r} />

      {/* Kişisel / Kulüp: tek dokunuş. Garanti fişinde o kartın sonraki harcamaları da böyle gelir. */}
      {!isStaff && (
        <div className="mt-3 flex rounded-xl bg-bg p-[0.1875rem]" role="tablist" aria-label="Kimin harcaması">
          {[["club", "Kulüp"], ["personal", "Kişisel"]].map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={(r.scope || "club") === v} onClick={() => setReceiptScope(r.id, v)} className={`flex-1 rounded-[0.625rem] py-2 text-sm font-semibold transition ${(r.scope || "club") === v ? "bg-card text-fg shadow-sm" : "text-mut"}`}>
              {l}
            </button>
          ))}
        </div>
      )}

      <Sec title={`Kalemler (${(r.items || []).length})`}>
        {(r.items || []).map((i, k) => (
          <Kv key={k} k={i.n} sub={`${String(i.q).replace(".", ",")} × ${TLk(i.u)} · %${i.r}`} v={TLk(Math.round(i.q * i.u))} />
        ))}
      </Sec>

      <Sec title="KDV">
        {(t.byRate || []).map((b) => (
          <Kv key={b.r} k={`%${b.r}`} sub={`Matrah ${TLk(b.base)}`} v={TLk(b.vat)} />
        ))}
        <Kv k="KDV hariç" v={TLk(t.net)} />
        <Kv k="Toplam" v={TLk(total)} strong />
      </Sec>

      <Sec title="Belge">
        <Kv k="Tür" v={DOC[r.docType]} />
        <Kv k="Tarih" v={fdate(r.date)} />
        <Kv k="Belge no" v={r.docNo} />
        <Kv k="Vergi no" v={r.taxId} />
        <Kv k="Adres" v={r.address} />
        <Kv k="Not" v={r.note} />
      </Sec>

      <Sec title="Kayıt">
        <Kv k="Ekleyen" v={r.createdBy?.name} />
        <Kv k="Kaynak" v={r.src === "garanti" ? `Garanti maili${r.card ? ` · kart ·${r.card}` : ""}` : r.src === "photo" ? "Fotoğraf + AI" : "Elle"} />
        <Kv k="AI güveni" v={conf ? `%${Math.round((Object.values(conf).reduce((a, b) => a + b, 0) / Object.values(conf).length) * 100)}` : ""} />
        <Kv k="Eklendi" v={r.createdAt ? new Date(r.createdAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : ""} />
        <Kv k="Güncellendi" v={r.updatedAt ? `${new Date(r.updatedAt).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}${r.updatedBy?.name ? ` · ${r.updatedBy.name}` : ""}` : ""} />
      </Sec>

      {zoom && img && (
        <button onClick={() => setZoom(false)} className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4" aria-label="Kapat">
          <img src={img} alt="Fiş" className="max-h-full max-w-full rounded-lg" />
        </button>
      )}
    </main>
  );
}
