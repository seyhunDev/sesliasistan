"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";

// Yarış özelliğini henüz kullanmayanlara bir kerelik tanıtım. Seçim hesaba yazılır (her cihazda bir kez görünür).
export function RaceIntro({ race }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!race.intro) return null;
  const pick = (on) => {
    setBusy(true);
    race.set(on).then(
      () => on && toast("Yarışlar ana sayfaya eklendi"),
      () => (setBusy(false), toast("Kaydedilemedi, tekrar dene")),
    );
  };
  return (
    <section className="rounded-[1.25rem] bg-card px-4 py-3.5 shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
          <Icon name="flag" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.6875rem] font-bold tracking-[.08em] text-acc">YENİ</span>
          <b className="block text-[1rem] font-semibold">Yarışlar</b>
          <small className="block text-[0.8125rem] leading-snug text-mut">Yarış evrakı, bütçe ve yapılacaklar tek yerde. Sporcularla yarışa gidiyorsan ana sayfana ekle.</small>
        </span>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" disabled={busy} onClick={() => pick(false)} className="h-9 rounded-full bg-bg px-4 text-[0.8125rem] font-semibold active:scale-95 disabled:opacity-50">
          Gerek yok
        </button>
        <button type="button" disabled={busy} onClick={() => pick(true)} className="h-9 rounded-full bg-acc px-4 text-[0.8125rem] font-semibold text-white active:scale-95 disabled:opacity-50">
          Ana sayfaya ekle
        </button>
      </div>
    </section>
  );
}
