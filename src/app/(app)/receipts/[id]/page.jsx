"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Tile } from "@/components/dashboard/Row";
import { useData } from "@/features/data/DataProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { PayBox } from "@/features/receipts/Payment";
import { DOC, TLk, catOf, mismatch, totalOf } from "@/lib/receipts";
import { fdate, rel } from "@/lib/utils/format";
import { Loading } from "@/components/ui/Loader";

const btn = "inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-card px-3 text-sm font-semibold transition active:scale-95";

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
  const { receipts, loading, loadReceiptImage } = useData();
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
        <Link href="/receipts" className={btn}><Icon name="back" className="size-[1.125rem]" /> Fişler</Link>
        {loading ? <Loading /> : <p className="mt-12 text-center text-mut">Fiş bulunamadı.</p>}
      </main>
    );
  }

  const t = r.totals || { gross: 0, vat: 0, net: 0, byRate: [] };
  const total = totalOf(r);
  const bad = mismatch(r);
  const c = catOf(r.cat);
  const conf = r.conf;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <div className="flex items-center justify-between py-1.5">
        <Link href="/receipts" className={btn}><Icon name="back" className="size-[1.125rem]" /> Fişler</Link>
        <button onClick={() => openReceipt({ edit: r.id })} className={btn}><Icon name="edit" className="size-[1.125rem]" /> Düzenle</button>
      </div>

      {/* Başlık kartı */}
      <div className="mt-3 rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center gap-3">
          <Tile icon={c.icon} />
          <b className="min-w-0 flex-1 truncate text-[1.0625rem] font-semibold">{r.merchant || "İsimsiz"}</b>
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
        {bad && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[0.875rem] font-semibold text-amber-800">
            <Icon name="alert" className="size-4" /> Kalemler {TLk(t.gross)}, fişte {TLk(r.declared)}
          </div>
        )}
      </div>

      <PayBox r={r} />

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
        <Kv k="Kaynak" v={r.src === "photo" ? "Fotoğraf + AI" : "Elle"} />
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
