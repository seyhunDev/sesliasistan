"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { exById, fold } from "@/lib/fitness/exercises";
import { libAdd, libList } from "@/lib/fitness/library";
import { ExerciseMedia } from "./ExerciseMedia";
import { ExercisePicker } from "./ExercisePicker";
import { YtEdit } from "./YtVideo";
import { saveLib } from "./fitnessData";
import { useFitLib } from "./useFitLib";

// Hareketler: kulübün hareket kütüphanesi (programlarda geçen her hareket bir kez, numarasıyla). Harekete eklenen
// fotoğraf, video ve YouTube bağlantısı o hareketin geçtiği bütün programlarda ve sporcuların antrenmanlarında görünür.
export function ExerciseLibrary({ open, onClose, orgId }) {
  const { lib, setMedia } = useFitLib();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState("");
  const [pick, setPick] = useState(false);
  const list = libList(lib, q);
  const e = sel ? list.find((x) => x.key === sel) || libList(lib).find((x) => x.key === sel) : null;
  const it = e ? { ex: e.ex, name: e.name, kind: e.kind } : null;
  const add = async (p) => {
    const item = p.custom ? { ex: "", name: p.name } : { ex: p.id, name: p.name, kind: p.kind };
    const { lib: next } = libAdd(lib, [item]);
    const saved = await saveLib(orgId, next).catch(() => null);
    const k = libList(saved || next).find((x) => fold(x.name) === fold(item.name) || (item.ex && x.key === item.ex));
    if (k) setSel(k.key);
  };
  const close = () => {
    setSel("");
    onClose();
  };
  return (
    <Sheet open={open} onClose={close} title={e ? `No ${e.no} · ${e.name}` : "Hareketler"}>
      {e ? (
        <div>
          {exById(e.ex)?.how && (
            <p className="flex gap-2 rounded-xl bg-bg px-3 py-2 text-[0.8125rem] leading-snug text-mut">
              <Icon name="spark" className="mt-0.5 size-3.5 shrink-0 text-acc" />
              {exById(e.ex).how}
            </p>
          )}
          <ExerciseMedia media={e.media || []} ex={e.ex} edit onChange={(v) => setMedia(it, { yt: e.yt, media: v }).catch(() => {})} className="mt-2" />
          <YtEdit yt={e.yt} onChange={(v) => setMedia(it, { yt: v, media: e.media }).catch(() => {})} media={e.media || []} onMedia={(v) => setMedia(it, { yt: e.yt, media: v }).catch(() => {})} className="mt-2" />
          <p className="mt-2 text-[0.75rem] text-mut">Bu hareketin geçtiği bütün programlarda (sporcularınki dahil) bu fotoğraf ve video görünür.</p>
          <button type="button" onClick={() => setSel("")} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-bg text-[0.875rem] font-semibold">
            <Icon name="chev" className="size-4 rotate-180" />
            Hareketler
          </button>
        </div>
      ) : (
        <div>
          <label className="flex items-center gap-2 rounded-xl bg-bg px-3">
            <Icon name="search" className="size-4 text-mut" />
            <input value={q} onChange={(x) => setQ(x.target.value)} placeholder="Ara: ad ya da numara" className="h-11 w-full min-w-0 bg-transparent text-[0.9375rem] outline-none" />
          </label>
          <ul className="mt-2 divide-y divide-line">
            {list.map((x) => (
              <li key={x.key}>
                <button type="button" onClick={() => setSel(x.key)} className="flex w-full items-center gap-3 py-2.5 text-left">
                  <span className="w-8 shrink-0 text-[0.8125rem] font-bold tabular-nums text-mut">{x.no}</span>
                  <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">{x.name}</b>
                  {x.yt?.id && <Icon name="video" className="size-4 text-rec" />}
                  {x.media?.length ? <Icon name="camera" className="size-4 text-mut" /> : null}
                  <Icon name="chev" className="size-4 text-mut" />
                </button>
              </li>
            ))}
            {!list.length && <li className="py-6 text-center text-[0.875rem] text-mut">{q ? "Bulunamadı" : "Program hazırlayınca hareketler burada numarasıyla görünür"}</li>}
          </ul>
          <button type="button" onClick={() => setPick(true)} className="mt-2 flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-acc/30 text-[0.9375rem] font-semibold text-acc">
            <Icon name="plus" className="size-4" />
            Hareket ekle
          </button>
        </div>
      )}
      <ExercisePicker open={pick} onClose={() => setPick(false)} onPick={add} />
    </Sheet>
  );
}
