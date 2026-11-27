"use client";

import { useState } from "react";
import { doc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { deleteDoc, setDoc } from "@/lib/firebase/write";
import { Sheet } from "@/components/ui/Sheet";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { PLACES, SPORTS, labelOf } from "@/lib/fitness/model";
import { withLib } from "@/lib/fitness/library";
import { cleanHazir, hazirOzet } from "@/lib/fitness/ortak";
import { TEMPLATES } from "@/lib/fitness/templates";
import { useOrtak } from "./useOrtak";

// Hazır programlar (Seyhun 2026-11-27, örnek onaylı): Velora'nın hazırladığı programlar herkese kart kart; "Programıma ekle"
// Program ekle › Hazır program'ı o program seçili açar (saat Tam gün / Saat seç). Velora sahibi kendi programlarından birini
// "+ Programımdan ekle" ile yayınlar (orgs/{org}/fitHazir), kaldırabilir; yeni program herkeste kendiliğinden görünür.
const photoOf = (t, lib) => {
  for (const d of t.prog?.days || [])
    for (const it of d.items || []) {
      const m = (withLib(it, lib)?.media || []).find((x) => x.kind === "photo" && x.url && x.g !== "m");
      if (m) return m.url;
    }
  return "";
};

// Yayınlanacak kayıt (programın kişiye ait alanları cleanHazir ile atılır)
const hazirOf = (p, id) => cleanHazir({ title: p.title, sub: p.note ? p.note.slice(0, 160) : "", sport: p.sport || "", prog: p, at: Date.now() }, id);

function Kart({ t, lib, onPick, onDrop }) {
  const o = hazirOzet(t);
  const foto = photoOf(t, lib);
  return (
    <div className="overflow-hidden rounded-[1.375rem] border border-line bg-card">
      <div className="relative flex h-40 items-end bg-[#2a2f24] p-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {foto && <img src={foto} alt="" className="absolute inset-0 size-full object-cover" />}
        <span className="absolute inset-0 bg-gradient-to-b from-transparent from-30% to-black/85" />
        {t.sport && <span className="absolute right-3 top-3 rounded-[0.625rem] bg-acc px-2 py-0.5 text-[0.75rem] font-extrabold uppercase text-[#111]">{labelOf(SPORTS, t.sport) || t.sport}</span>}
        <b className="fs-c relative text-[1.875rem]">{t.title}</b>
      </div>
      <div className="space-y-2.5 p-3.5">
        <div className="grid grid-cols-3 gap-2">
          {[
            [o.weeks, "hafta"],
            [o.days, "gün"],
            [labelOf(PLACES, o.place) || "–", "yer"],
          ].map(([v, l]) => (
            <span key={l} className="rounded-xl bg-fill px-2.5 py-2">
              <b className="block truncate text-[1.0625rem]">{v}</b>
              <small className="text-[0.75rem] text-mut">{l}</small>
            </span>
          ))}
        </div>
        {t.sub && <p className="text-[0.875rem] leading-snug text-fg2">{t.sub}</p>}
        <button type="button" onClick={() => onPick(t)} data-press className="btn btn-primary w-full">
          Programıma ekle
        </button>
        {onDrop && (
          <button type="button" onClick={() => onDrop(t)} className="block w-full py-1 text-center text-[0.8125rem] font-semibold text-mut">
            Hazır programlardan kaldır
          </button>
        )}
      </div>
    </div>
  );
}

export function HazirProgramlar({ open, onClose, onPick, orgId, mine = [] }) {
  const ortak = useOrtak();
  const ask = useConfirm();
  const toast = useToast();
  const [sec, setSec] = useState(false);
  const yayinla = async (p) => {
    const id = `p-${p.id}`;
    const v = hazirOf(p, id);
    if (!v) return toast("Programda antrenman yok");
    try {
      await setDoc(doc(db, "orgs", orgId, "fitHazir", id), { title: v.title, sub: v.sub, sport: v.sport, prog: v.prog, at: v.at });
      setSec(false);
      await ortak.yenile();
      toast("Hazır programlara eklendi");
    } catch {
      toast("Eklenemedi, tekrar dene");
    }
  };
  const kaldir = (t) =>
    ask({
      title: `${t.title} hazır programlardan kaldırılsın mı?`,
      text: "Senin programın silinmez; yalnız herkesin listesinden çıkar.",
      yes: "Kaldır",
      run: async () => {
        await deleteDoc(doc(db, "orgs", orgId, "fitHazir", t.id));
        await ortak.yenile();
      },
    });
  const yayinda = new Set(ortak.published.map((t) => t.id));
  return (
    <Sheet open={open} onClose={onClose} title="Hazır programlar" big>
      <p className="mb-3 text-[0.875rem] text-mut">Velora&apos;nın hazırladığı programlar. Seç, saatini ayarla, programına eklensin.</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {ortak.hazir.map((t) => (
          <Kart key={t.id} t={t} lib={ortak.lib} onPick={onPick} onDrop={ortak.velora && !TEMPLATES.some((x) => x.id === t.id) ? kaldir : null} />
        ))}
      </div>
      {ortak.velora && (
        <div className="mt-4">
          <button type="button" onClick={() => setSec(!sec)} aria-expanded={sec} className="h-11 text-[0.9375rem] font-semibold text-acc">
            + Programımdan ekle
          </button>
          {sec && (
            <div className="fs-list divide-y divide-line">
              {mine.filter((p) => p.days?.length).map((p) => (
                <button key={p.id} type="button" disabled={yayinda.has(`p-${p.id}`)} onClick={() => yayinla(p)} className="flex min-h-[3.25rem] w-full items-center justify-between gap-2 px-3.5 text-left disabled:opacity-50">
                  <span className="min-w-0 truncate text-[0.9375rem]">{p.title}</span>
                  <span className="shrink-0 text-[0.8125rem] font-semibold text-acc">{yayinda.has(`p-${p.id}`) ? "Eklendi" : "Ekle"}</span>
                </button>
              ))}
              {!mine.length && <p className="px-3.5 py-4 text-[0.875rem] text-mut">Henüz programın yok.</p>}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
