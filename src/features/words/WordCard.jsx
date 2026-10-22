"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { cachedDeck, nextWordIndex, pickCard, reviewWord } from "@/lib/englishWords";
import { todayStr } from "@/lib/utils/format";
import { loadDeck, updateDeck } from "./wordData";

// Sayfanın altındaki İngilizce kelime kartı: kelime, türü, Türkçe anlamı, örnek cümle ve Türkçesi.
// Deste ana hesapta Firestore'da (wordData.js, 1 okuma). Önce tekrarı gelen çalışma kelimesi ("İNGİLİZCE · ÇALIŞ";
// gösterilince bir sonraki tekrar gününe geçer), yoksa listeden sıradaki (bu cihaz kaldığı yeri saklar).
// Dinle: telefonun İngilizce sesiyle okunur. Başka: listeden sıradaki kelime. Yapay zekaya gitmez.
export function WordCard({ className = "" }) {
  const { profile, isOwner } = useAuth();
  const orgId = isOwner ? profile?.orgId || "" : "";
  const [w, setW] = useState(null); // sunucu çiziminde boş; kelime telefonda seçilir
  useEffect(() => {
    let live = true;
    const show = (deck) => {
      if (!live) return;
      const today = todayStr();
      const c = pickCard(deck, today, nextWordIndex());
      setW(c);
      if (c?.study) updateDeck(orgId, (d) => reviewWord(d, c.en, today)).catch(() => {});
    };
    loadDeck(orgId).then(show, () => show(cachedDeck()));
    return () => {
      live = false;
    };
  }, [orgId]);
  if (!w) return <div className={`mt-8 h-[9.5rem] ${className}`} aria-hidden="true" />;

  const say = (text) => {
    try {
      const s = window.speechSynthesis;
      if (!s) return;
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
  };
  const next = () => {
    const deck = cachedDeck();
    const c = pickCard({ ...deck, words: deck.words.filter((x) => x.status === "list") }, todayStr(), nextWordIndex());
    if (c) setW(c);
  };

  return (
    <section aria-label="Günün İngilizce kelimesi" className={`mt-8 rounded-[1.25rem] bg-card px-4 pb-3 pt-3.5 shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)] ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.6875rem] font-bold tracking-[.08em] text-mut">{w.study ? "İNGİLİZCE · ÇALIŞ" : "İNGİLİZCE · B2"}</span>
        <button type="button" onClick={next} data-press className="btn btn-text btn-sm h-8 gap-1">
          Başka <Icon name="chev" className="size-4" />
        </button>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <b className="min-w-0 truncate text-[1.375rem] font-bold leading-tight tracking-tight">{w.en}</b>
        <button type="button" onClick={() => say(w.en)} aria-label="Kelimeyi dinle" className="grid size-8 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
          <Icon name="volume" className="size-4" />
        </button>
        <span className="ml-auto shrink-0 rounded-md bg-line/70 px-1.5 text-[0.6875rem] font-semibold text-mut">{w.type}</span>
      </div>
      <p className="mt-0.5 text-[0.9375rem] font-semibold text-acc">{w.tr}</p>
      <button type="button" onClick={() => say(w.ex)} className="mt-2.5 block w-full border-l-2 border-acc/40 pl-3 text-left">
        <span className="block text-[0.9375rem] italic leading-snug">{w.ex}</span>
        <span className="mt-0.5 block text-[0.8125rem] leading-snug text-mut">{w.exTr}</span>
      </button>
    </section>
  );
}
