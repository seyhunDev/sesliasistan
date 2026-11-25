"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// Antrenman sayfası kalktı (Seyhun 2026-11-23 "antrenmanın bilgi ekranı Yönet olacak; yarış ve start kısmını tamamen kaldırıyoruz"):
// eski bağlantılar (widget, saat, eski bildirimler) Yönet'e gider; ?id= antrenmanı Yönet'e bağlar.
export default function TrainingDayPage() {
  return (
    <Suspense>
      <Go />
    </Suspense>
  );
}

function Go() {
  const router = useRouter();
  const id = (useSearchParams().get("id") || "").replace(/[^\w-]/g, "").slice(0, 60);
  useEffect(() => {
    router.replace(id ? `/bilgi/yonet?ant=${encodeURIComponent(id)}` : "/bilgi/yonet");
  }, [router, id]);
  return null;
}
