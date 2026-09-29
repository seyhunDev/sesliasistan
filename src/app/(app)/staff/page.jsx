"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { useData } from "@/features/data/DataProvider";
import { StaffCard, seenText } from "@/features/staff/StaffCard";

// Çalışanlar (yalnızca ana hesap): ekle, listele, son görülme ve üzerindeki işler
export default function StaffPage() {
  const { isStaff, members } = useData();
  const router = useRouter();
  useEffect(() => {
    if (isStaff) router.replace("/");
  }, [isStaff, router]);
  if (isStaff) return null;

  const online = members.filter((m) => seenText(m.lastSeen) === "Çevrimiçi").length;
  return (
    <main className="mx-auto max-w-[480px] px-5 pb-[calc(40px+env(safe-area-inset-bottom))]">
      <PageHeader title="Kişiler" sub={members.length ? `${members.length} kişi${online ? ` · ${online} çevrimiçi` : ""}` : "Henüz kişi yok"} />
      <div className="mt-2">
        <StaffCard page />
      </div>
    </main>
  );
}
