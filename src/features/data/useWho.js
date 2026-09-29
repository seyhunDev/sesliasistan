"use client";

import { createElement } from "react";
import { WhoPill } from "@/components/ui/WhoPill";
import { ackSummary, doersOf } from "@/lib/people";
import { useData } from "./DataProvider";

// Ana hesapta kaydın görevli etiketi: görevli çalışan(lar)ın adı, yoksa "Ana hesap".
// Çalışanda ya da hiç çalışan yokken null döner (etiket gösterilmez).
export function useWho() {
  const { isStaff, myUid, nameOf, members } = useData();
  const on = !isStaff && members.length > 0;
  return function pillOf(rec, className = "") {
    return on
      ? createElement(WhoPill, { className, names: doersOf(rec, myUid).map((u) => nameOf(u) || "Ayrılan kişi"), status: ackSummary(rec)?.key })
      : null;
  };
}
