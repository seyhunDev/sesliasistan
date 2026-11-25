"use client";

import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { sayEn } from "./WordView";
import { enHead } from "./fonts";

// Kalıplar › Hatırla, "Altyazı" tasarımı (Seyhun 2026-11-25 A seçti; örnek /mnt/project-files/ingilizce-hatirla/ornek.html):
// kalıbın resmi bütün ekranı kaplar, cümle film altyazısı gibi altta belirir, en altta tek büyük "Bas ve konuş" çubuğu.
// Durum (st): idle · open (mikrofon açılıyor) · rec (dinliyor; çubuk ve dalga sesle büyür, --lv) · wait (yapay zeka bakıyor).
// Sonuç: doğru yeşil; yanlış "Sen: …" + doğrusu + "Tekrar söyle"; Göster'de yalnız doğrusu. Telefon ve iPad, dikey ve yatay aynı düzen;
// geniş ekranda yazı büyür, içerik ortada en çok 48rem.
const Y = "#ffe14d";
const BARS = [0.45, 0.8, 1, 0.65, 0.9, 0.55, 1, 0.7, 0.5, 0.85];

export function Altyazi({ pic, say0, tr, heard, answered, wrong, st, lvRef, onMic, onClose, onShow, onSkip, onTalk }) {
  const busy = st === "wait" || st === "open";
  const label = st === "rec" ? "Dinliyorum · bitince bas" : st === "open" ? "Mikrofon açılıyor…" : st === "wait" ? "Bakıyorum…" : wrong ? "Tekrar söyle" : "Bas ve konuş";
  return (
    <div role="dialog" aria-label="Hatırla" className={`${enHead.variable} fixed inset-0 z-[54] flex flex-col overflow-hidden bg-black text-white`}>
      <div aria-hidden="true" className={`absolute inset-0 transition-opacity duration-300 ${st === "rec" ? "opacity-70" : "opacity-95"}`}>
        {pic.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pic.img} alt="" className="size-full object-cover" />
        ) : (
          <div className={`size-full bg-[radial-gradient(70%_50%_at_70%_55%,#f08a5d_0%,rgba(240,138,93,0)_70%),linear-gradient(180deg,#2a1f45,#5a3560_60%,#1d1830)] ${pic.wait ? "animate-pulse" : ""}`} />
        )}
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,.55)_0%,rgba(0,0,0,0)_22%,rgba(0,0,0,0)_42%,rgba(0,0,0,.9)_80%)]" />

      <header className="relative flex items-center justify-between px-3 pt-[calc(0.5rem+env(safe-area-inset-top))] text-white/80">
        <button type="button" onClick={onClose} aria-label="Hatırla'yı kapat" className="grid size-11 place-items-center rounded-full">
          <Icon name="x" className="size-5" />
        </button>
        <b className="font-[family-name:var(--en-font)] text-[0.9375rem] font-bold tracking-[.06em]">HATIRLA · 4/5</b>
        {!answered && st === "idle" ? (
          <button type="button" onClick={onShow} className="h-11 px-3 text-[0.9375rem] font-semibold text-white/75">
            Göster
          </button>
        ) : (
          <span className="w-11" />
        )}
      </header>

      <div className="relative mx-auto flex w-full max-w-[48rem] flex-1 flex-col justify-end gap-6 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:gap-8 md:px-10 md:pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div aria-live="polite" className="min-h-[2.75rem] text-balance text-center font-[family-name:var(--en-font)] text-[1.9rem] font-extrabold leading-[1.15] tracking-[-.01em] [text-shadow:0_2px_18px_rgba(0,0,0,.6)] md:text-[2.9rem]">
          {answered ? (
            <button type="button" onClick={() => sayEn(say0)} className="text-balance">
              {wrong && <span className="mb-1.5 block font-sans text-[0.95rem] font-semibold leading-snug text-[#ff8a7a] md:text-[1.15rem]">Sen: {heard.heard}</span>}
              <span className={heard.ok ? "text-[#7cf0b5]" : "text-white"}>
                {heard.ok && <Icon name="check" className="mr-2 inline size-[0.8em] align-[-0.05em]" />}
                {say0}
              </span>
            </button>
          ) : st === "wait" ? (
            <Loader size="lg" className="text-[#ffe14d]" label="Bakıyorum" />
          ) : st === "rec" || st === "open" ? (
            <span className="text-white/50">…</span>
          ) : heard?.err ? (
            <span className="block font-sans text-[1.05rem] font-semibold leading-snug text-[#ff8a7a] md:text-[1.25rem]">{heard.err}</span>
          ) : (
            <span className="text-[0.62em] font-semibold text-white/55">{tr}</span>
          )}
        </div>

        {answered && !wrong ? (
          <div className="flex gap-3">
            <button type="button" onClick={onSkip} className="h-[3.6rem] flex-1 rounded-full border-[1.5px] border-white/30 text-[1.0625rem] font-semibold active:scale-[.98]">
              Atla
            </button>
            <button type="button" onClick={onTalk} style={{ background: Y }} className="h-[3.6rem] flex-[1.4] rounded-full text-[1.0625rem] font-bold text-[#1a1505] active:scale-[.98]">
              Konuş
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <button
              ref={lvRef}
              type="button"
              onClick={onMic}
              aria-label={st === "rec" ? "Bitti, gönder" : label}
              aria-busy={busy}
              style={st === "idle" ? { background: Y } : undefined}
              className={`relative flex h-16 w-full items-center justify-center gap-3 rounded-full text-[1.0625rem] font-bold transition-[background-color,transform] active:scale-[.98] md:h-[4.5rem] md:text-[1.1875rem] ${st === "idle" ? "text-[#1a1505]" : st === "rec" ? "bg-[#ff3d5a] text-white" : "bg-white/14 text-white"}`}
            >
              {st === "rec" && (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-[#ff3d5a]/30 transition-transform duration-75"
                  style={{ transform: "scale(calc(1 + var(--lv, 0) * .06), calc(1 + var(--lv, 0) * .45))" }}
                />
              )}
              {busy ? <Loader size="sm" className="relative text-white" label={label} /> : <Icon name={st === "rec" ? "up" : "mic"} className="relative size-6" />}
              <span className="relative">{label}</span>
              {st === "rec" && (
                <span aria-hidden="true" className="relative flex h-6 items-center gap-[3px]">
                  {BARS.map((k, i) => (
                    <i key={i} className="w-[3px] rounded-full bg-white transition-[height] duration-75" style={{ height: `calc(18% + var(--lv, 0) * ${Math.round(k * 82)}%)` }} />
                  ))}
                </span>
              )}
            </button>
            {wrong && st === "idle" && (
              <div className="flex justify-between px-2 text-[1rem] font-semibold text-white/70">
                <button type="button" onClick={onSkip} className="h-10">
                  Atla
                </button>
                <button type="button" onClick={onTalk} className="h-10">
                  Konuş
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
