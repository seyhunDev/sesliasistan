"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { DURUM, UCRETSIZ, kalanOf, paketGecerli } from "@/lib/paket";
import { paketGetir } from "./paketApi";

// Paket sayacı (örnek: "Paketim · 15 sporcu", "11 / 15", "4 hak kaldı", limon çubuk); sınırsızda "Sınırsız"
export function PaketSayac({ count, limit, paket }) {
  const sinirsiz = limit === Infinity;
  const kalan = kalanOf(count, limit);
  const ad = sinirsiz ? "Sınırsız" : limit === UCRETSIZ ? `Ücretsiz · ${UCRETSIZ} sporcu` : `${limit} sporcu`;
  const bitis = paket?.until ? new Date(`${paket.until}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" }) : "";
  return (
    <div className="space-y-2 rounded-[1.25rem] bg-card p-4">
      <p className="text-[0.75rem] font-extrabold uppercase tracking-[0.1em] text-mut">Paketim · {ad}</p>
      <div className="flex items-baseline justify-between gap-3">
        <b className="sahne-t text-[1.9rem] tabular-nums">{sinirsiz ? count : `${count} / ${limit}`}</b>
        <span className="text-[0.875rem] text-mut">{sinirsiz ? "sporcu" : kalan ? `${kalan} hak kaldı` : "Hak doldu"}</span>
      </div>
      {!sinirsiz && (
        <div className="h-1.5 overflow-hidden rounded-full bg-[#1f1f22]">
          <i className="block h-full rounded-full bg-acc" style={{ width: `${Math.min(100, Math.round((count / limit) * 100))}%` }} />
        </div>
      )}
      {bitis && <p className="text-[0.8125rem] text-mut">{bitis} tarihine kadar</p>}
    </div>
  );
}

// Ayarlar'da paket kartı (yalnız ana hesap): dokununca Paketim sayfası. Bekleyen istek varsa altında durumu.
export function PaketKart() {
  const { profile } = useAuth();
  const [v, setV] = useState(null);
  useEffect(() => {
    let on = true;
    paketGetir().then((x) => on && setV(x), () => {});
    return () => {
      on = false;
    };
  }, []);
  if (!profile || profile.role !== "owner" || !v) return null;
  const limit = v.limit == null ? Infinity : v.limit;
  return (
    <Link href="/settings/paket" className="block active:opacity-80" aria-label="Paketim">
      <PaketSayac count={v.count} limit={limit} paket={v.paket && paketGecerli(v.paket) ? v.paket : null} />
      {v.istek && <p className="mt-2 px-1 text-[0.8125rem] font-semibold text-acc">{DURUM[v.istek.durum] || DURUM.bekliyor}</p>}
    </Link>
  );
}
