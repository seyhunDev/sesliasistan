"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CHUNKS } from "@/lib/englishChunks";
import { loadPics, makePic } from "./chunkPics";

// İngilizce › Kalıplar › ⋯ › Resimler (yalnız ana hesap): 37 kalıbın resmi. Eksikleri sırayla çizer; resme dokununca büyür,
// orada "Yeniden çiz" ve "Çalış". Resimler bir kez çizilir, kaydedilir (chunkPics.js).
export function ChunkPics({ orgId, onOpen }) {
  const [pics, setPics] = useState(null);
  const [run, setRun] = useState("");
  const [err, setErr] = useState("");
  const [sel, setSel] = useState("");

  useEffect(() => {
    let live = true;
    loadPics(orgId).then(
      (p) => live && setPics(p),
      () => live && setPics({}),
    );
    return () => {
      live = false;
    };
  }, [orgId]);

  const draw = async (ids) => {
    setErr("");
    for (const id of ids) {
      setRun(id);
      try {
        const img = await makePic(orgId, id);
        setPics((p) => ({ ...p, [id]: img }));
      } catch (e) {
        setErr(e.message);
        break;
      }
    }
    setRun("");
  };

  if (!pics) return <div className="grid grid-cols-4 gap-2">{CHUNKS.slice(0, 8).map((c) => <div key={c.id} className="aspect-square animate-pulse rounded-xl bg-white/6" />)}</div>;
  const missing = CHUNKS.filter((c) => !pics[c.id]).map((c) => c.id);
  const s = sel && CHUNKS.find((c) => c.id === sel);

  return (
    <div className="space-y-4">
      {s && (
        <div className="space-y-3">
          {pics[s.id] ? <img src={pics[s.id]} alt="" className="aspect-square w-full rounded-[1.25rem] object-cover" /> : <div className="aspect-square w-full animate-pulse rounded-[1.25rem] bg-white/6" />}
          <p className="truncate text-[1rem] font-semibold">{`${s.head} ${s.fills[0][0]}${s.tail ? ` ${s.tail}` : ""}`.replace(/\s+([?.!,])/g, "$1")}</p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={!!run} onClick={() => draw([s.id])}>
              {run === s.id ? "Çiziliyor…" : "Yeniden çiz"}
            </Button>
            <Button variant="primary" onClick={() => onOpen(s.id)}>
              Çalış
            </Button>
          </div>
        </div>
      )}
      {missing.length > 0 && (
        <Button variant="primary" disabled={!!run} onClick={() => draw(missing)}>
          {run ? `Çiziliyor · ${CHUNKS.length - missing.length}/${CHUNKS.length}` : `Eksikleri çiz (${missing.length})`}
        </Button>
      )}
      {err && <p className="text-[0.9375rem] font-semibold text-[#f3a39a]">{err}</p>}
      <div className="grid grid-cols-4 gap-2">
        {CHUNKS.map((c) => (
          <button key={c.id} type="button" aria-label={c.head} aria-pressed={sel === c.id} onClick={() => setSel(sel === c.id ? "" : c.id)} className={`aspect-square overflow-hidden rounded-xl bg-white/6 ${sel === c.id ? "ring-2 ring-[#8fb3ff]" : ""} ${run === c.id ? "animate-pulse" : ""}`}>
            {pics[c.id] ? <img src={pics[c.id]} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center px-1 text-center text-[0.6875rem] leading-tight text-white/45">{c.head}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
