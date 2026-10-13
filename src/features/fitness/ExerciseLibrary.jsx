"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { exById, fold } from "@/lib/fitness/exercises";
import { exKey, libAdd, libList } from "@/lib/fitness/library";
import { ExerciseMedia } from "./ExerciseMedia";
import { ExercisePicker } from "./ExercisePicker";
import { YtEdit } from "./YtVideo";
import { saveLib } from "./fitnessData";
import { useFitLib } from "./useFitLib";

// Hareketler: kulübün hareket kütüphanesi (programlarda geçen her hareket bir kez, numarasıyla). Harekete eklenen
// fotoğraf, video ve YouTube bağlantısı o hareketin geçtiği bütün programlarda ve sporcuların antrenmanlarında görünür.
const hasVideo = (x) => !!(x.yt?.id || (x.media || []).some((m) => m.kind === "video"));

export function ExerciseLibrary({ open, onClose, orgId, progs = [] }) {
  const { lib, setMedia } = useFitLib();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState("");
  const [pick, setPick] = useState(false);
  const [only, setOnly] = useState("");
  const all = libList(lib, q);
  const list = only === "v" ? all.filter(hasVideo) : only === "n" ? all.filter((x) => !hasVideo(x)) : all;
  // Hareketin kaç programda geçtiği
  const uses = useMemo(() => {
    const m = {};
    for (const pr of progs) {
      const keys = new Set();
      for (const d of pr.days || []) for (const it of d.items || []) keys.add(exKey(it));
      for (const k of keys) m[k] = (m[k] || 0) + 1;
    }
    return m;
  }, [progs]);
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
          <div className="flex items-center gap-2">
            <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-bg px-3">
              <Icon name="search" className="size-4 text-mut" />
              <input value={q} onChange={(x) => setQ(x.target.value)} placeholder="Ara: ad ya da numara" className="h-12 w-full min-w-0 bg-transparent text-[1rem] outline-none" />
            </label>
            <button type="button" onClick={() => setPick(true)} aria-label="Hareket ekle" className="grid size-12 shrink-0 place-items-center rounded-xl bg-acc text-white">
              <Icon name="plus" className="size-6" />
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            {[
              ["", `Hepsi ${all.length}`],
              ["v", "Videolu"],
              ["n", "Videosuz"],
            ].map(([k, label]) => (
              <button key={k || "all"} type="button" onClick={() => setOnly(k)} className={`h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold ${only === k ? "bg-deep text-white" : "bg-bg text-mut"}`}>
                {label}
              </button>
            ))}
          </div>
          <ul className="mt-2 divide-y divide-line">
            {list.map((x) => {
              const v = hasVideo(x);
              const n = uses[x.key] || 0;
              return (
                <li key={x.key}>
                  <button type="button" onClick={() => setSel(x.key)} className="flex min-h-[4.5rem] w-full items-center gap-3 py-2.5 text-left">
                    <span className={`relative grid size-14 shrink-0 place-items-center rounded-2xl ${v ? "bg-deep text-white" : "bg-bg text-mut"}`}>
                      <Icon name={v ? "video" : "plus"} className="size-6" />
                      <span className="absolute -left-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-card px-1 text-[0.6875rem] font-bold tabular-nums text-fg ring-1 ring-line">{x.no}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[1rem] font-semibold">{x.name}</b>
                      <small className="block truncate text-[0.8125rem] text-mut">{[v ? "Video" : "Video yok", n ? `${n} programda` : ""].filter(Boolean).join(" · ")}</small>
                    </span>
                    {v ? (
                      <Icon name="chev" className="size-5 shrink-0 text-mut" />
                    ) : (
                      <span className="shrink-0 rounded-full bg-acc/10 px-3 py-1.5 text-[0.8125rem] font-semibold text-acc">Video ekle</span>
                    )}
                  </button>
                </li>
              );
            })}
            {!list.length && <li className="py-6 text-center text-[0.875rem] text-mut">{q || only ? "Bulunamadı" : "Program hazırlayınca hareketler burada numarasıyla görünür"}</li>}
          </ul>
        </div>
      )}
      <ExercisePicker open={pick} onClose={() => setPick(false)} onPick={add} />
    </Sheet>
  );
}
