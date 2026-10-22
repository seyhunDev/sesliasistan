"use client";

import { Icon } from "@/components/ui/Icon";

// Telefonun İngilizce sesiyle okur (yoksa sessiz)
export function sayEn(text) {
  try {
    const s = window.speechSynthesis;
    if (!s || !text) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    const v = s.getVoices().find((x) => /^en[-_]US/i.test(x.lang)) || s.getVoices().find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    s.speak(u);
  } catch {
    /* ses yok */
  }
}

// Kelime ya da cümle: İngilizcesi (dinle), türü, Türkçesi, örnek cümle ve Türkçesi (dokununca okunur).
// Kelime kartı (WordCard) ve İngilizce sayfası aynı görünümü kullanır; cümlede yazı biraz küçük, alt satıra iner.
export function WordView({ w }) {
  const phrase = w.kind === "phrase" || w.type === "cümle";
  return (
    <>
      <div className="mt-1 flex items-center gap-2">
        <b className={`min-w-0 font-bold leading-tight tracking-tight ${phrase ? "text-[1.1875rem]" : "truncate text-[1.375rem]"}`}>{w.en}</b>
        <button type="button" onClick={() => sayEn(w.en)} aria-label="Dinle" className="grid size-8 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
          <Icon name="volume" className="size-4" />
        </button>
        {!phrase && <span className="ml-auto shrink-0 rounded-md bg-line/70 px-1.5 text-[0.6875rem] font-semibold text-mut">{w.type}</span>}
      </div>
      <p className="mt-0.5 text-[0.9375rem] font-semibold text-acc">{w.tr}</p>
      {w.ex && (
        <button type="button" onClick={() => sayEn(w.ex)} className="mt-2.5 block w-full border-l-2 border-acc/40 pl-3 text-left">
          <span className="block text-[0.9375rem] italic leading-snug">{w.ex}</span>
          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-mut">{w.exTr}</span>
        </button>
      )}
    </>
  );
}
