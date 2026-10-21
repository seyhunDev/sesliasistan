"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { writeTimer } from "@/features/training/Countdown";
import { saveStarts } from "@/features/athletes/raceLiveStore";
import { VOIDS, beginRace, dropRace, finishRace, nextRaceNo, raceName, raceTime, raceTitle, shiftRace, voidRace } from "@/lib/raceLive";

// Yarış akışı (Seyhun 2026-10-18): Süre sekmesi ve uygulama içi kamera aynı akışı kullanır (RaceMedia'da bir kez).
// "Başlat · 4. yarış" geri sayımı başlatır ve yarışı açar; +30 sn/+1 dk start anını kaydırır; "Yarışı bitir" bitiş saatini yazar.
// İptal: geri sayımda ya da startan sonra sebep sorulur (Tehir, Genel geri çağırma, İptal; kapatınca İptal). Yarış geçersiz sayılır,
// numarası tekrarına geçer. Geri sayımda "Yanlış başlattım" yarışı siler. Her adımdan sonra 8 sn "Geri al" (liste ve sayaç geri yazılır).
export function useRaceFlow({ orgId, raceId, live, onChange, rdays = null, today = "" }) {
  const toast = useToast();
  const [ask, setAsk] = useState(null); // iptal sebebi sorulan: { id, prevT, canDrop, at }
  const save = (next) => onChange({ starts: next }, () => saveStarts(orgId, raceId, next));
  const undo = (msg, before, prevT) =>
    toast(msg, { duration: 8000, action: { label: "Geri al", onClick: () => (save(before), prevT && writeTimer(prevT)) } });
  const ridOf = (t) => t?.rid || live.starts.find((x) => t?.end && Math.abs(Date.parse(x.at) - t.end) < 5000)?.id || "";
  const flow = {
    label: `${nextRaceNo(live.starts, today, rdays)}. yarış`,
    onStart: (end, rid, prevT) => {
      const before = live.starts;
      const got = beginRace(live.starts, Date.now(), end, rdays);
      save(got.starts);
      undo(`${raceName(got.starts.find((x) => x.id === got.id))} ${end < Date.now() ? "açıldı" : "geri sayımı başladı"}`, before, prevT);
    },
    onShift: (end, rid) => rid && save(shiftRace(live.starts, rid, end, rdays)),
    onCancel: (prevT) => {
      const id = ridOf(prevT);
      if (live.starts.some((x) => x.id === id)) setAsk({ id, prevT, canDrop: true, at: Date.now() });
      else undo("Geri sayım iptal edildi", live.starts, prevT);
    },
    onVoid: (prevT) => {
      const id = ridOf(prevT);
      if (live.starts.some((x) => x.id === id)) setAsk({ id, prevT, canDrop: false, at: Date.now() });
    },
    onFinish: (prevT) => {
      const before = live.starts;
      const id = ridOf(prevT);
      const next = id ? finishRace(live.starts, id, Date.now(), rdays) : live.starts;
      save(next);
      const s = next.find((x) => x.id === id);
      undo(s ? `${raceName(s)} bitti${raceTime(s) ? ` · ${raceTime(s)}` : ""}` : "Yarış bitti", before, prevT);
    },
  };
  // reason: VOIDS'tan biri; boş: yarışı sil (yanlış başlatıldı)
  const choose = (reason) => {
    if (!ask) return;
    const before = live.starts;
    setAsk(null);
    if (!reason) {
      save(dropRace(live.starts, ask.id, rdays));
      return undo("Geri sayım iptal edildi, yarış silindi", before, ask.prevT);
    }
    const next = voidRace(live.starts, ask.id, reason, ask.at, rdays); // bitiş: İptal'e basılan an
    save(next);
    const s = next.find((x) => x.id === ask.id);
    undo(s ? raceTitle(s) : reason, before, ask.prevT);
  };
  return { flow, ask, choose, ridOf, save, undo };
}

// "Neden iptal?" seçenekleri; Sheet içinde (sayfada) ve kameranın üstünde (koyu) aynı düğmeler
export function VoidChoices({ ask, onChoose, dark = false }) {
  const btn = dark ? "h-12 rounded-2xl bg-white/15 text-[1rem] font-semibold text-white active:bg-white/25" : "h-12 rounded-2xl bg-bg text-[1rem] font-semibold ring-1 ring-line active:translate-y-px";
  return (
    <div className="grid gap-2 pb-2">
      {VOIDS.map((v) => (
        <button key={v} type="button" onClick={() => onChoose(v)} className={btn}>
          {v === "İptal" ? "İptal (sebepsiz)" : v}
        </button>
      ))}
      {ask.canDrop && (
        <button type="button" onClick={() => onChoose("")} className={`h-11 text-[0.9375rem] font-semibold ${dark ? "text-[#FF453A]" : "text-rec"}`}>
          Yanlış başlattım · yarışı sil
        </button>
      )}
    </div>
  );
}

export function VoidSheet({ ask, onChoose }) {
  return (
    <Sheet open={!!ask} onClose={() => onChoose("İptal")} title="Neden iptal?">
      {ask && <VoidChoices ask={ask} onChoose={onChoose} />}
    </Sheet>
  );
}
