"use client";

import { Button } from "@/components/ui/Button";
import { Img, tl } from "./Img";

// Sepet çubuğu (Seyhun 2026-10-23, örnek A): alt çubuğa yapışık lacivert şerit, arkada sepetteki ürünlerin fotoğrafları
// soldan koyulaşarak; o sırada alt çubuk da lacivert olur (globals.css .cartbar), ikisi tek yüzey görünür.
export function CartBar({ place, lines, count, total, onOpen }) {
  const items = place.menu.flatMap((c) => c.items);
  const photos = [...new Set(lines.map((l) => items.find((i) => i.id === l.itemId)?.photo).filter(Boolean))].slice(0, 3);
  return (
    <div className="cartbar fixed inset-x-0 z-30 mx-auto w-full max-w-[30rem]">
      <div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === "Enter" && onOpen()} className="relative h-[6.75rem] cursor-pointer overflow-hidden rounded-t-[1.5rem] bg-[#11203a] text-white">
        <span className="absolute inset-0 flex" aria-hidden="true">
          {photos.map((p) => <Img key={p} src={p} w={360} className="h-full min-w-0 flex-1 !bg-transparent" />)}
        </span>
        <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,32,58,.96),rgba(17,32,58,.86)_45%,rgba(17,32,58,.55)),linear-gradient(0deg,#11203a_10%,transparent_70%)]" aria-hidden="true" />
        <div className="relative flex items-center gap-3 px-5 pt-3.5">
          <span className="min-w-0 flex-1 leading-tight">
            <small className="block truncate text-[0.8125rem] font-semibold text-white/70">Sepet · {count} ürün</small>
            <b className="block text-[1.25rem] font-bold tabular-nums tracking-[-.01em]">{tl(total)}</b>
          </span>
          <Button variant="secondary" size="sm" full={false} className="!h-10 shrink-0 !rounded-full !px-4 !text-[#11203a]" onClick={(e) => (e.stopPropagation(), onOpen())}>Sepete git</Button>
        </div>
      </div>
    </div>
  );
}
