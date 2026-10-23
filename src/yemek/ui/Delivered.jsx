"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Img } from "./Img";

// Teslim edildi ekranı (Seyhun 2026-10-23): tam ekran, arkada siparişin fotoğrafı. Puan isteğe bağlı: yıldıza dokununca
// (yazıldıysa notla) kaydedilir ve ekran kapanır; ✕ ile puansız kapanır. Bir kez kapanınca bir daha çıkmaz (order.rateDone).
// Dokunulmazsa 10 sn sonra kendiliğinden kapanır (uygulama sonradan açılınca da bu ekran görünür, Seyhun 2026-10-23).
const AUTO_MS = 10000;
const hm = (iso) => (iso ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "");

export function Delivered({ order, photo, onRate, onClose }) {
  const [note, setNote] = useState("");
  const [writing, setWriting] = useState(false);
  const [picked, setPicked] = useState(0);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (touched) return;
    const t = setTimeout(onClose, AUTO_MS);
    return () => clearTimeout(t);
  }, [touched]); // eslint-disable-line react-hooks/exhaustive-deps
  const rate = async (n) => {
    if (picked) return;
    setPicked(n);
    await onRate(n, note.trim());
  };
  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-hidden bg-[#11203a] text-white" role="dialog" aria-label="Teslim edildi" onPointerDown={() => setTouched(true)}>
      <Img src={photo} w={900} className="absolute inset-0 size-full !bg-transparent" />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,32,58,.35)_0%,rgba(17,32,58,.15)_30%,rgba(17,32,58,.85)_62%,#11203a_80%)]" aria-hidden="true" />
      <div className="relative flex justify-end px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label="Kapat" data-press className="grid size-11 place-items-center rounded-full bg-black/30 backdrop-blur-md">
          <Icon name="x" className="size-5" />
        </button>
      </div>
      <div className="relative mt-auto px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <p className="text-[0.9375rem] font-semibold text-white/75">{order.placeName} · {hm(order.times?.delivered)}</p>
        <h1 className="mt-1 text-[2.5rem] font-extrabold leading-none tracking-[-.03em]">Afiyet olsun</h1>
        <p className="mt-6 text-[1rem] font-semibold">Nasıldı?</p>
        {writing && (
          <input autoFocus value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="Not"
            className="mt-3 h-12 w-full rounded-2xl border border-white/25 bg-white/10 px-4 text-base text-white outline-none placeholder:text-white/50 focus:border-[#67e8f9]" />
        )}
        <div className="mt-3 flex justify-between">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" aria-label={`${n} yıldız`} onClick={() => rate(n)} data-press className="grid size-14 place-items-center rounded-2xl bg-white/10 backdrop-blur-md">
              <Icon name="star" className={`size-8 transition-colors ${n <= picked ? "fill-[#f2c14e] text-[#f2c14e]" : "text-white/85"}`} />
            </button>
          ))}
        </div>
        {!writing && (
          <button type="button" onClick={() => setWriting(true)} className="mt-4 text-[0.9375rem] font-semibold text-[#67e8f9]">Not ekle</button>
        )}
      </div>
    </div>
  );
}
