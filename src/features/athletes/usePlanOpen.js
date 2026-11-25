"use client";

import { useRouter } from "next/navigation";
import { useAdd } from "@/features/add/AddProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "./access";
import { useRaceHome } from "./raceHome";
import { planRaceHref } from "./raceLinks";

// Plana dokununca nereye gidilir (TEK KURAL, raceLinks.planRaceHref; Seyhun 2026-11-05): yarışa bağlı plan yarış sayfasını, diğerleri planı açar.
// Planlar, Takvim, ana sayfa (Sıradaki plan, gün listesi, gün penceresi) hep bunu kullanır. Yarış sayfası yalnız sporcu yetkisi olanlarda açılır;
// yetkisi olmayan (çalışan) planı görür. Eski planlarda (raceId yok) yarış adla, ana sayfanın zaten okuduğu yaklaşan yarışlardan bulunur.
export function usePlanOpen() {
  const router = useRouter();
  const { openAdd } = useAdd();
  const { profile } = useAuth();
  const race = useRaceHome();
  const can = canSeeAthletes(profile?.email);
  const hrefOf = (p) => (can && p ? planRaceHref(p, race.open) : "");
  // before: gitmeden önce yapılacak iş (ör. gün penceresini kapat)
  const open = (p, before) => {
    const href = hrefOf(p);
    before?.();
    if (href) router.push(href);
    else openAdd({ edit: { kind: "plan", id: p.id } });
  };
  return { open, hrefOf };
}
