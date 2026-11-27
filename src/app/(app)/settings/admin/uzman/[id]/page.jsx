"use client";

import { useParams } from "next/navigation";
import { UzmanSayfasi } from "@/features/admin/UzmanSayfasi";

// Uzmanın sayfası (Admin › Uzmanlar › uzman): atanan sporcular, gönderdikleri bilgiler, program hazırlama
export default function Page() {
  const { id } = useParams();
  return <UzmanSayfasi id={String(id || "")} />;
}
