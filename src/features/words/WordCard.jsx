"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthProvider";
import { cachedDeck, knowWord, nextWordIndex, pickCard, reviewWord, studyWord } from "@/lib/englishWords";
import { todayStr } from "@/lib/utils/format";
import { loadDeck, updateDeck } from "./wordData";
import { WordView } from "./WordView";

// Sayfanın altındaki İngilizce kelime kartı: kelime, türü, Türkçe anlamı, örnek cümle ve Türkçesi.
// Deste ana hesapta Firestore'da (wordData.js, 1 okuma). Önce tekrarı gelen çalışma kelimesi ("İNGİLİZCE · ÇALIŞ";
// gösterilince bir sonraki tekrar gününe geçer), yoksa listeden sıradaki (bu cihaz kaldığı yeri saklar).
// Dinle: telefonun İngilizce sesiyle okunur. Başka: listeden sıradaki kelime. Yapay zekaya gitmez.
// Başlığa dokununca İngilizce sayfası (/english) açılır.
// Sağ altta: listedeki kelimede "Çalış" (çalışmaya alır, bugünkü tekrarı sayılır), çalışılanda "Öğrendim" (artık gelmez).
export function WordCard({ className = "" }) {
  const { profile, isOwner } = useAuth();
  const orgId = isOwner ? profile?.orgId || "" : "";
  const [w, setW] = useState(null); // sunucu çiziminde boş; kelime telefonda seçilir
  const [busy, setBusy] = useState(false);
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
  if (!w) return <div className={`mt-8 h-[12rem] ${className}`} aria-hidden="true" />;

  const next = () => {
    const deck = cachedDeck();
    const c = pickCard({ ...deck, words: deck.words.filter((x) => x.status === "list") }, todayStr(), nextWordIndex());
    if (c) setW(c);
  };
  // Çalış: kelime çalışma listesine girer (bugün görüldüğü için ilk tekrarı sayılır). Öğrendim: artık gelmez, sıradaki gelir.
  const mark = async () => {
    const today = todayStr();
    setBusy(true);
    try {
      if (w.study) {
        await updateDeck(orgId, (d) => knowWord(d, w.en, today));
        next();
      } else {
        await updateDeck(orgId, (d) => reviewWord(studyWord(d, w, today, new Date().toISOString()), w.en, today));
        setW({ ...w, study: true });
      }
    } catch {
      /* bağlantı yok: kart değişmez */
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Günün İngilizce kelimesi" className={`mt-8 rounded-[1.25rem] bg-card px-4 pb-3 pt-3.5 shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)] ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <Link href="/english" className={`py-1 text-[0.6875rem] font-bold tracking-[.08em] ${w.study ? "text-acc" : "text-mut"}`}>{w.study ? "İNGİLİZCE · ÇALIŞ" : "İNGİLİZCE · B2"}</Link>
        <button type="button" onClick={next} data-press className="btn btn-text btn-sm h-8 gap-1">
          Başka <Icon name="chev" className="size-4" />
        </button>
      </div>
      <WordView w={w} />
      <div className="mt-3 flex justify-end">
        <Button variant={w.study ? "primary" : "secondary"} size="sm" loading={busy} onClick={mark}>
          {w.study ? "Öğrendim" : "Çalış"}
        </Button>
      </div>
    </section>
  );
}
