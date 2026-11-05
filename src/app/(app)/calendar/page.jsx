"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarView } from "@/features/calendar/CalendarView";

// Adres çubuğundaki ?d=YYYY-MM-DD: ana sayfadaki haftadan gelince o gün seçili açılır
export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarFromUrl />
    </Suspense>
  );
}
function CalendarFromUrl() {
  const d = useSearchParams().get("d") || "";
  const day = /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "";
  return <CalendarView key={day} initial={day} />;
}

