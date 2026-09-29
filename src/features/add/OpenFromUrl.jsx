"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdd } from "./AddProvider";

// Bildirime dokununca gelen adres: /?open=task:KİMLİK -> o kaydı açar (açılınca "görüldü" işaretlenir)
function Opener() {
  const q = useSearchParams().get("open") || "";
  const { openAdd } = useAdd();
  const router = useRouter();
  useEffect(() => {
    if (!q) return;
    const [kind, id] = q.split(":");
    if (["plan", "task", "note"].includes(kind) && id) openAdd({ edit: { kind, id } });
    router.replace(window.location.pathname); // adres temizlensin, yenileyince tekrar açılmasın
  }, [q, openAdd, router]);
  return null;
}

export function OpenFromUrl() {
  return (
    <Suspense fallback={null}>
      <Opener />
    </Suspense>
  );
}
