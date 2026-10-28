"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ListHead } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { loadRaces } from "@/features/athletes/races";
import { loadAllMedia } from "@/features/athletes/raceLiveStore";
import { Thumb } from "@/features/raceMedia/Thumb";
import { loadDeck, updateDeck } from "@/features/words/wordData";
import { sayEn } from "@/features/words/WordView";
import { cachedDeck, knowWord, nextWordIndex, pickCard } from "@/lib/englishWords";
import { groupTasks } from "@/lib/agenda";
import { keepMedia, latestMedia, mediaFresh, readMedia } from "@/lib/homeMedia";
import { librarySections } from "@/lib/mediaLibrary";
import { todayStr } from "@/lib/utils/format";

// Ana sayfanın altındaki özellik kartları (Seyhun 2026-10-28 "A · Büyük kartlar"; eski "Özet" (Mesajlar) yerine):
// İngilizce (sıradaki kelime), Görevler (açık görevlerin ilk üçü), Medya (son eklenen 4 kare). Her kartta "Tümü ›" o sayfa.
// Bilgisi olmayan kart çizilmez.
const CARD = "overflow-hidden rounded-[1.25rem] border border-line bg-card";

// İngilizce: tekrarı gelen çalışma kelimesi, yoksa listeden sıradaki (WordCard ile aynı seçim; ana sayfa tekrar saymaz).
// Kelimeye ya da Çalış'a dokununca İngilizce sayfası; Dinle telefonda okur; Biliyorum kelimeyi öğrenilenlere alır, sıradaki gelir.
export function EnglishCard() {
  const { profile, isOwner } = useAuth();
  const orgId = isOwner ? profile?.orgId || "" : "";
  const [w, setW] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  useEffect(() => {
    let live = true;
    const show = (deck) => live && setW(pickCard(deck, todayStr(), nextWordIndex()));
    loadDeck(orgId).then(show, () => show(cachedDeck()));
    return () => {
      live = false;
    };
  }, [orgId]);
  if (!w) return null;
  const know = async () => {
    const today = todayStr();
    setBusy(true);
    try {
      const deck = await updateDeck(orgId, (d) => knowWord(d, w.en, today));
      setW(pickCard(deck || cachedDeck(), today, nextWordIndex()));
    } catch {
      /* bağlantı yok: kart değişmez */
    } finally {
      setBusy(false);
    }
  };
  return (
    <section aria-label="İngilizce">
      <ListHead title="İngilizce" href="/english" />
      <div className={CARD}>
        <Link href="/english" data-press="row" className="relative block px-4 pb-3 pt-3.5">
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(14,165,196,.18),rgba(14,165,196,0)_60%)]" />
          <small className="relative block text-[0.75rem] font-semibold text-mut">{w.study ? "Sıradaki kelime · tekrar bugün" : "Sıradaki kelime"}</small>
          <b className="relative mt-0.5 block truncate text-[1.875rem] font-bold leading-tight tracking-[-.02em]">
            {w.en}
            {w.type && <span className="ml-2 text-[0.875rem] font-medium text-mut">{w.type}</span>}
          </b>
          {w.tr && <span className="relative block text-[1rem] font-semibold text-[#67e8f9]">{w.tr}</span>}
          {w.ex && <span className="relative mt-2 block text-[0.875rem] leading-snug text-mut">{w.ex}</span>}
        </Link>
        <div className="flex gap-2 px-4 pb-3.5">
          <Button size="sm" onClick={() => router.push("/english")}>
            Çalış
          </Button>
          <Button variant="secondary" size="sm" onClick={() => sayEn(w.en)}>
            Dinle
          </Button>
          <Button variant="secondary" size="sm" loading={busy} onClick={know}>
            Biliyorum
          </Button>
        </div>
      </div>
    </section>
  );
}

// Görevler: açık görevler son tarihe göre (gecikenler önce), ilk üçü. Yuvarlağa dokununca yapıldı (Geri al), satıra dokununca görev açılır.
export function TasksCard() {
  const { tasks, toggleTask } = useData();
  const { openAdd } = useAdd();
  const toast = useToast();
  const open = tasks.filter((t) => !t.done);
  if (!open.length) return null;
  const top = groupTasks(open, todayStr())
    .flatMap((g) => g.items)
    .slice(0, 3);
  const done = (t) => {
    toggleTask(t.id);
    toast(`Yapıldı · ${t.title}`, { action: { label: "Geri al", onClick: () => toggleTask(t.id) } });
  };
  return (
    <section aria-label="Görevler">
      <ListHead title="Görevler" count={open.length} href="/tasks" />
      <div className={`${CARD} divide-y divide-line`}>
        {top.map((t) => (
          <TaskRow key={t.id} task={t} onToggle={() => done(t)} onOpen={() => openAdd({ edit: { kind: "task", id: t.id } })} />
        ))}
      </div>
    </section>
  );
}

// Medya: en son kayıt eklenen antrenman ya da yarışın son 4 karesi; dokununca onun Medya sekmesi. Okuma 30 dakikada bir (homeMedia.js).
export function MediaCard() {
  const { profile } = useAuth();
  const { plans } = useData();
  const orgId = profile?.orgId || "";
  const [card, setCard] = useState(() => readMedia()?.card || null);
  useEffect(() => {
    if (!orgId || mediaFresh(readMedia())) return;
    let live = true;
    Promise.all([loadAllMedia(orgId), loadRaces(orgId).catch(() => [])])
      .then(([docs, races]) => {
        const c = latestMedia(librarySections(docs, { plans, races }));
        keepMedia(c);
        if (live) setCard(c);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // plans her değişimde yeniden okutmasın: yalnız açılışta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);
  if (!card?.items?.length) return null;
  return (
    <section aria-label="Medya">
      <ListHead title="Medya" href="/media" />
      <Link href={card.href} data-press="row" className={`${CARD} block`}>
        <div className="grid grid-cols-4 gap-[3px] p-[3px]">
          {card.items.map((m) => (
            <div key={m.id} className="relative aspect-square overflow-hidden rounded-[0.625rem] bg-white/5">
              <Thumb kind={m.kind} url={m.url} thumb={m.thumb} dur={m.dur} />
            </div>
          ))}
        </div>
        <small className="block truncate px-4 pb-3 pt-2 text-[0.8125rem] text-mut">
          Son eklenen · {card.title} · {card.sub}
        </small>
      </Link>
    </section>
  );
}
