"use client";

import { useToast } from "@/components/ui/ToastProvider";
import { writeTimer } from "@/features/training/Countdown";
import { mmss } from "@/lib/raceScore";
import { upSec } from "@/lib/raceLive";

// Antrenman sayfasında yarış multimedyanın sayacı (Seyhun 2026-10-20): aynı Countdown (compact, start dizisi) ve Start/Şamandıra
// kareleri; akış antrenman planının yarışlarına (lib/raceScore.js) yazar. Başlat yeni yarışı açar (start anı = sayacın 0'ı),
// +30 sn/+1 dk startı kaydırır, geri sayımda İptal sonucu olmayan yarışı siler, Bitir yarışın süresini yazar. Her adımda 8 sn "Geri al".
export function useTrainingFlow({ races, save }) {
  const toast = useToast();
  const undo = (msg, before, prevT) =>
    toast(msg, { duration: 8000, action: { label: "Geri al", onClick: () => (save(before), prevT && writeTimer(prevT)) } });
  const nameOf = (id, list = races) => list.find((r) => r.id === id)?.name || "Yarış";
  const flow = {
    label: `Yarış ${races.length + 1}`,
    onStart: (end, rid, prevT) => {
      const r = { id: rid, name: `Yarış ${races.length + 1}`, startAt: end, finishes: [] };
      save([...races, r]);
      undo(`${r.name} ${end < Date.now() ? "açıldı" : "geri sayımı başladı"}`, races, prevT);
    },
    onShift: (end, rid) => rid && save(races.map((r) => (r.id === rid ? { ...r, startAt: end } : r))),
    onCancel: (prevT) => {
      const r = races.find((x) => x.id === prevT?.rid);
      if (r && !r.finishes.length) save(races.filter((x) => x.id !== r.id));
      undo(r && !r.finishes.length ? `Geri sayım iptal edildi, ${r.name} silindi` : "Geri sayım iptal edildi", races, prevT);
    },
    onVoid: (prevT) => {
      const r = races.find((x) => x.id === prevT?.rid);
      if (r && !r.finishes.length) save(races.filter((x) => x.id !== r.id));
      undo(r && !r.finishes.length ? `${r.name} iptal edildi, silindi` : "Sayaç durdu", races, prevT);
    },
    onFinish: (prevT) => {
      const r = races.find((x) => x.id === prevT?.rid);
      if (!r) return undo("Yarış bitti", races, prevT);
      const fin = upSec(r.startAt ?? prevT.end, Date.now());
      save(races.map((x) => (x.id === r.id ? { ...x, fin } : x)));
      undo(`${nameOf(r.id)} bitti · ${mmss(fin)}`, races, prevT);
    },
  };
  return { flow, undo };
}
