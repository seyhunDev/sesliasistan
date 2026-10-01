"use client";

import { useAssistant } from "@/features/assistant/AssistantProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useChat } from "@/features/chat/ChatProvider";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { planState } from "@/lib/agenda";
import { dayItems } from "@/lib/summary";
import { todayStr } from "@/lib/utils/format";

const CHIPS = ["Bugün neler var?", "Yarın 10'da antrenman ekle", "Ekibe yaz"];

const hello = (h) => (h < 5 ? "İyi geceler" : h < 12 ? "Günaydın" : h < 18 ? "İyi günler" : "İyi akşamlar");
// ["2 plan", "1 görev"] → "2 plan ve 1 görev"
const join = (xs) => (xs.length < 2 ? xs[0] || "" : `${xs.slice(0, -1).join(", ")} ve ${xs.at(-1)}`);

// Ana sayfanın başı: asistanın sesiyle günün özeti. Kart yok, yalnızca yazı: selam, tek cümlelik özet ve öneriler.
// Önerilere dokununca asistan alttaki sahnede cevaplar.
export function AssistantBrief() {
  const { profile } = useAuth();
  const { plans, tasks, myUid } = useData();
  const { unreadTotal } = useChat();
  const { openAssistant } = useAssistant();
  const now = useNow();
  const today = todayStr();
  const d = dayItems({ plans, tasks, date: today, uid: myUid, late: true });
  const left = d.plans.filter((p) => planState(p, now) !== "past").length;
  const first = (profile?.name || "").split(" ")[0];

  const items = [left && `${left} plan`, d.due.length && `${d.due.length} görev`].filter(Boolean);
  const extra = [d.late.length && `${d.late.length} görev gecikmiş`, unreadTotal && `${unreadTotal} sohbette okunmamış mesaj var`].filter(Boolean);
  const line = [items.length ? `Bugün ${join(items)} var.` : "Bugün için plan ya da görev yok.", extra.length ? `${join(extra)}.` : ""].filter(Boolean).join(" ");
  const sentence = line.charAt(0).toLocaleUpperCase("tr-TR") + line.slice(1);

  return (
    <section aria-label="Asistan özeti" className="px-1">
      <p className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-[.12em] text-acc">
        <span className="size-1.5 rounded-full bg-acc" aria-hidden="true" />
        Asistan
      </p>
      <h1 className="mt-1.5 text-[1.5rem] font-semibold leading-tight tracking-tight">
        {hello(now.getHours())}
        {first ? `, ${first}` : ""}.
      </h1>
      <p className="mt-1 text-[1rem] leading-relaxed text-mut">{sentence}</p>
      <div className="-mx-5 mt-3.5 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => openAssistant({ text: c, dock: true })}
            className="shrink-0 rounded-full bg-card px-3.5 py-2 text-[0.8125rem] font-medium ring-1 ring-line transition active:scale-95"
          >
            {c}
          </button>
        ))}
      </div>
    </section>
  );
}
