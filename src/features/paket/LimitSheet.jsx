"use client";

import { useRouter } from "next/navigation";
import { Sheet, SheetActions } from "@/components/ui/Sheet";

// Sporcu hakkı dolunca (örnek: "3 sporcu hakkın doldu · Yeni sporcu eklemek için paketini büyüt."; Paketleri gör / Vazgeç)
export function LimitSheet({ open, limit, onClose }) {
  const router = useRouter();
  return (
    <Sheet open={open} onClose={onClose} title={`${limit || 3} sporcu hakkın doldu`} footer={<SheetActions onCancel={onClose} onYes={() => router.push("/settings/paket")} yes="Paketleri gör" />}>
      <p className="pb-2 text-[0.9375rem] text-mut">Yeni sporcu eklemek için paketini büyüt.</p>
    </Sheet>
  );
}
