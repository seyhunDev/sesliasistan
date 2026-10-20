"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { db } from "@/lib/firebase/clientApp";
import { shareGroup } from "@/lib/cancelPlan";
import { cleanWaGroups, waGroupFor } from "@/lib/waGroups";
import { athleteTemplates, cleanTemplates } from "@/lib/waTemplates";
import { todayStr } from "@/lib/utils/format";

// Sporculara WhatsApp mesajı (Seyhun 2026-10-20: "hazır kalıplar; kopyalar otomatik, WhatsApp'a gider, grubu seçer, yapıştırır, gönderirim").
// Üstte metin (değiştirilebilir), altında hazır kalıplar (o anki planlardan) ve kaydedilenler; kalıba dokununca metne gelir.
// "WhatsApp'ı aç": metin panoya kopyalanır; Ayarlar › WhatsApp gruplarında Sporcular grubu varsa grup açılır, yoksa WhatsApp metin hazır açılır
// (grup orada seçilir). "Kalıp olarak kaydet": users/{uid}.waTemplates. races: useRaceHome().open
export function WaSheet({ open, onClose, races = [] }) {
  const { profile } = useAuth();
  const { plans } = useData();
  const toast = useToast();
  const [text, setText] = useState("");
  const mine = cleanTemplates(profile?.waTemplates);
  if (!open) return <Sheet open={false} onClose={onClose} title="" />;
  const ready = athleteTemplates(plans, races, todayStr()).filter((t) => !mine.includes(t));
  const group = waGroupFor("Sporcular", cleanWaGroups(profile?.waGroups))?.link || "";
  const save = (list) => updateDoc(doc(db, "users", profile.uid), { waTemplates: list }).catch(() => toast("Kaydedilemedi, tekrar dene."));
  const send = () => {
    const how = shareGroup(text.trim(), group);
    toast(how === "group" ? "Kopyalandı, grupta yapıştır" : "Kopyalandı, WhatsApp'ta grubu seç");
    onClose();
  };
  const row = (t, del) => (
    <li key={t} className="flex items-start gap-2 border-t border-line first:border-t-0">
      <button type="button" onClick={() => setText(t)} className="min-w-0 flex-1 break-words py-2.5 text-left text-[0.9375rem]">
        {t}
      </button>
      {del && (
        <button type="button" aria-label="Kalıbı sil" onClick={() => save(mine.filter((x) => x !== t))} className="grid size-10 shrink-0 place-items-center text-mut">
          <Icon name="x" className="size-4" />
        </button>
      )}
    </li>
  );
  const btn = "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[0.9375rem] font-semibold disabled:opacity-50";
  return (
    <Sheet open onClose={onClose} title="Sporculara WhatsApp">
      <div className="space-y-3 pb-1">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Mesaj" className="block w-full resize-none rounded-xl bg-bg px-3 py-2.5 text-[1rem] outline-none" />
        <button type="button" data-press disabled={!text.trim()} onClick={send} className={`${btn} acc-btn`}>
          <Icon name="whatsapp" className="size-5" />
          WhatsApp&apos;ı aç
        </button>
        <button type="button" data-press disabled={!text.trim() || mine.includes(text.trim())} onClick={() => save(cleanTemplates([text.trim(), ...mine]))} className={`${btn} raised bg-card text-acc`}>
          Kalıp olarak kaydet
        </button>
        {mine.length > 0 && (
          <section>
            <h3 className="text-[0.75rem] uppercase tracking-[.02em] text-mut">Kalıplarım</h3>
            <ul>{mine.map((t) => row(t, true))}</ul>
          </section>
        )}
        <section>
          <h3 className="text-[0.75rem] uppercase tracking-[.02em] text-mut">Hazır</h3>
          <ul>{ready.map((t) => row(t))}</ul>
        </section>
      </div>
    </Sheet>
  );
}
