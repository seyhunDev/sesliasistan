"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { athleteNext, statusOf } from "@/lib/fitness/model";
import { markStart } from "@/features/fitness/guideVoice";
import { todayStr } from "@/lib/utils/format";

// Bugünün fitness antrenmanı (Seyhun 2026-11-25 "sporcunun fitness'ı varsa o gün gösterilmeli"; örnek velora-tarama/sporcu-fitness-ders.html):
// normal kullanıcı ve sporcu ana sayfasında Hava'nın hemen altında tek kart; antrenörün hazırladığı bugünkü antrenman, sağda Başla
// (antrenman ekranını açar; Seyhun 2026-11-25 "plana atmasın, direkt antrenmana gitmeliyim": adım adım ekran hemen açılır, Fitness › Antrenmana başla gibi). Bugün antrenman yoksa çizilmez (sıradakiler Takvim'de). Veri cihazdaki planlardan (ek okuma yok).
export function TodayFit() {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const n = athleteNext(plans, profile?.uid, todayStr());
  if (!n?.today) return null;
  const p = n.plan;
  const k = (p.fit?.items || []).length;
  const st = statusOf(p, todayStr());
  const fin = st === "done" || st === "skip";
  const open = () => {
    if (!fin) markStart(p.id);
    openAdd({ edit: { kind: "plan", id: p.id } });
  };
  return (
    <section aria-label="Bugünün fitness antrenmanı" className="iph-pn iph-lead iph-fit">
      <button type="button" data-press onClick={open} className="flex w-full min-w-0 items-center gap-3 text-left">
        <span className="min-w-0 flex-1">
          <small className="block text-[0.75rem] font-semibold text-[var(--fit,#ea7a1a)]">Bugün · Fitness{p.time ? ` · ${p.time}` : ""}</small>
          <b className="block truncate text-[1.125rem] font-semibold">{p.fit?.name || p.title}</b>
          {k > 0 && <small className="block text-[0.8125rem] text-mut">{k} hareket</small>}
        </span>
        <span className="btn btn-primary btn-sm pointer-events-none">{fin ? "Sonuç" : "Başla"}</span>
      </button>
    </section>
  );
}
