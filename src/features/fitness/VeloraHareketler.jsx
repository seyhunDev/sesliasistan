"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { fold } from "@/lib/fitness/exercises";
import { libList } from "@/lib/fitness/library";
import { Big, Thumb, Viewer } from "./ExerciseMedia";
import { useOrtak } from "./useOrtak";

// Hareketler, Velora sahibi olmayan hesapta (Seyhun 2026-11-27, örnek onaylı): Velora'nın hareketleri salt okunur (fotoğraf,
// animasyon, açıklama; düzenleme, silme, yükleme yok) ve "Benim" sekmesi kişinin kendi hareketleri (Hareketler kütüphanesi, onMine).
export function VeloraHareketler({ open, onClose, onMine, mineCount = 0 }) {
  const ortak = useOrtak();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(null);
  const [view, setView] = useState(null);
  const all = libList(ortak.lib).filter((e) => e.media?.length || e.how);
  const f = fold(q);
  const list = f ? all.filter((e) => fold(e.name).includes(f)) : all;
  const first = (e) => (e.media || []).find((m) => m.a) || (e.media || []).find((m) => m.g !== "m") || e.media?.[0];
  return (
    <Sheet open={open} onClose={() => (setSel(null), onClose())} title="Hareketler" big>
      {sel ? (
        <div>
          <button type="button" onClick={() => setSel(null)} className="flex h-10 items-center gap-1 text-[0.9375rem] font-semibold text-acc">
            <Icon name="chev" className="size-4 rotate-180" />
            Velora hareketleri
          </button>
          <h2 className="mt-1 text-[1.5rem] font-semibold leading-tight">{sel.name}</h2>
          <div className="mt-3 space-y-3">
            {(sel.media || []).map((m) => (
              <Big key={m.id} orgId={ortak.org} m={m} onOpen={setView} />
            ))}
          </div>
          {sel.how && <p className="mt-3 text-[0.9375rem] leading-snug text-fg2">{sel.how}</p>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 rounded-xl bg-fill p-[3px]">
            <button type="button" aria-pressed="true" className="h-10 rounded-[0.625rem] bg-acc text-[0.9375rem] font-bold text-[#111]">
              {`Velora · ${all.length}`}
            </button>
            <button type="button" aria-pressed="false" onClick={onMine} className="h-10 rounded-[0.625rem] text-[0.9375rem] text-mut">
              {`Benim · ${mineCount}`}
            </button>
          </div>
          <label className="mt-3 flex items-center gap-2 rounded-xl bg-fill px-3">
            <Icon name="search" className="size-4 text-mut" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Hareket ara" className="h-11 w-full min-w-0 bg-transparent text-[0.9375rem] outline-none" />
          </label>
          {!ortak.lib ? (
            <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className="shimmer block h-40 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {list.map((e) => {
                const m = first(e);
                return (
                  <div key={e.key} className="overflow-hidden rounded-2xl border border-line bg-card">
                    <span className="block h-32">{m ? <Thumb orgId={ortak.org} m={m} onOpen={() => setSel(e)} big /> : <span className="block size-full bg-fill" />}</span>
                    <button type="button" onClick={() => setSel(e)} className="block w-full truncate px-2.5 py-2 text-left text-[0.875rem] font-semibold">
                      {e.name}
                    </button>
                  </div>
                );
              })}
              {!list.length && <p className="col-span-full py-6 text-center text-[0.875rem] text-mut">Bulunamadı</p>}
            </div>
          )}
        </>
      )}
      {view && <Viewer orgId={ortak.org} m={view} onClose={() => setView(null)} />}
    </Sheet>
  );
}
