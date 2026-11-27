"use client";

import { useParams } from "next/navigation";
import { UzmanProgram } from "@/features/admin/UzmanProgram";

// Admin › Uzmanlar › uzman › sporcu › Program hazırla (yalnız ana hesap)
export default function Page() {
  const { id, istek } = useParams();
  return <UzmanProgram id={String(id || "")} istekId={String(istek || "")} />;
}
