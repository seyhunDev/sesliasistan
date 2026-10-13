"use client";

import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { athleteNext } from "@/lib/fitness/model";
import { todayStr } from "@/lib/utils/format";
import { CARD } from "./ui";

const DAY = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short" });

// Sporcunun ana sayfası: antrenörün hazırladığı bugünkü antrenman, yoksa sıradaki. Dokununca antrenman açılır (adım adım başlat).
// Antrenman yoksa çizilmez. Veri cihazdaki planlardan (ek okuma yok).
export function MyFitCard() {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const n = athleteNext(plans, profile?.uid, todayStr());
  if (!n) return null;
  const p = n.plan;
  const n2 = (p.fit?.items || []).length;
  const when = n.today ? `Bugün${p.time ? ` · ${p.time}` : ""}` : `${DAY.format(new Date(`${p.date}T12:00:00`))}${p.time ? ` · ${p.time}` : ""}`;
  return (
    <section aria-label="Antrenman">
      <button type="button" onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} className={`flex w-full items-center gap-3 px-3.5 py-3 text-left ${CARD}`}>
        <span className="grid size-[2.625rem] shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
          <Icon name="dumbbell" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <small className="block text-[0.75rem] font-semibold text-mut">{n.today ? "BUGÜNKÜ ANTRENMANIN" : "SIRADAKİ ANTRENMAN"}</small>
          <b className="block truncate text-[0.9375rem] font-semibold">{p.fit?.name || p.title}</b>
          <small className="block truncate text-[0.75rem] text-mut">{[when, n2 ? `${n2} hareket` : ""].filter(Boolean).join(" · ")}</small>
        </span>
        {n.today && <span className="shrink-0 rounded-full bg-acc px-3 py-1.5 text-[0.8125rem] font-semibold text-white">Başla</span>}
      </button>
    </section>
  );
}
