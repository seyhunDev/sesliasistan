"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { loadRaces, planRaceStep, saveRace, withStepDone } from "@/features/athletes/races";
import { leftTag } from "@/lib/homeTiles";
import { planDonePatch, planReopenPatch } from "@/lib/planActions";

// Ana sayfada yarış planına dokununca (Seyhun 2026-10-19: "ödendiğinde buradan ödendi olarak işaretleyebilmeliyim; plana mı yarışın sayfasına mı
// gideceğim, tercih edebilmeliyim; yapıldı deyince yarışın yapılan işlerine de yazılsın"): Yapıldı (plan biter, yarışın işi Yapılanlar'a geçer),
// Yarışın sayfası, Planı aç. Yarış açılınca bir kez okunur (planRaceStep: plan adı "Yarış adı: iş").
export function RacePlanSheet({ plan, today, onClose }) {
  const { profile } = useAuth();
  const { updateRecord } = useData();
  const { openAdd } = useAdd();
  const toast = useToast();
  const router = useRouter();
  const [got, setGot] = useState({ id: "", hit: null }); // okunan planın yarışı (null: bulunamadı)
  const [busy, setBusy] = useState(false);
  const orgId = profile?.orgId;

  useEffect(() => {
    if (!plan || !orgId) return;
    let live = true;
    loadRaces(orgId)
      .then((list) => live && setGot({ id: plan.id, hit: planRaceStep(plan, list) }))
      .catch(() => live && setGot({ id: plan.id, hit: null }));
    return () => {
      live = false;
    };
  }, [plan, orgId]);

  if (!plan) return <Sheet open={false} onClose={onClose} title="" />;
  const hit = got.id === plan.id ? got.hit : undefined; // undefined: okunuyor
  const by = { name: profile?.name ?? "Kullanıcı" };
  const left = leftTag(plan.date, today);
  const when = [new Date(`${plan.date}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "numeric", month: "short" }), plan.time, left?.text.replace(/^! /, "")].filter(Boolean).join(" · ");
  const race = hit?.race;
  const go = (fn) => {
    onClose();
    fn();
  };
  // Yapıldı: plan Arşiv'e geçer; yarışın eşleşen işi varsa o da yapıldı işaretlenir (yarışın sayfasında Yapılanlar)
  const done = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (hit?.step) await saveRace(orgId, profile.uid, withStepDone(race, hit.step.key));
      await updateRecord("plan", plan.id, planDonePatch(), by);
      navigator.vibrate?.(10);
      toast(hit?.step ? `Yapıldı: ${hit.step.label}` : "Yapıldı, Arşiv'e kaldırıldı", { action: { label: "Geri al", onClick: () => updateRecord("plan", plan.id, planReopenPatch(), by) } });
      onClose();
    } catch {
      toast("Kaydedilemedi, tekrar dene.");
    } finally {
      setBusy(false);
    }
  };
  const btn = "flex h-12 w-full items-center justify-center rounded-2xl text-[0.9375rem] font-semibold active:translate-y-px";
  return (
    <Sheet open onClose={onClose} title={plan.title}>
      <div className="space-y-2.5 pb-1">
        <p className="text-[0.875rem] text-mut">
          {when}
          {plan.place ? ` · ${plan.place}` : ""}
        </p>
        {!hit?.whole && (
          <button type="button" data-press disabled={busy || hit === undefined} onClick={done} className={`${btn} acc-btn disabled:opacity-60`}>
            {busy ? "Kaydediliyor…" : "Yapıldı"}
          </button>
        )}
        {race && (
          <button type="button" data-press onClick={() => go(() => router.push(`/athletes/races/${race.id}`))} className={`${btn} raised bg-card text-acc`}>
            Yarışın sayfası
          </button>
        )}
        <button type="button" data-press onClick={() => go(() => openAdd({ edit: { kind: "plan", id: plan.id } }))} className={`${btn} raised bg-card text-fg`}>
          Planı aç
        </button>
      </div>
    </Sheet>
  );
}
