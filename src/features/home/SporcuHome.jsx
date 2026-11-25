"use client";

import { useRouter } from "next/navigation";
import { useHesap } from "@/features/auth/useHesap";
import { BilgiTile } from "@/features/bilgi/BilgiTile";
import { IntroTile } from "@/components/ui/IntroTile";
import { SailingPreview } from "@/features/intro/SailingPreview";
import { HomeFrame } from "./OwnerHome";
import { MyAttendanceCard } from "./MyAttendanceCard";
import { Waiting } from "./IpadHome";
import { TodayFit } from "./TodayFit";
import { DersCard } from "./DersCard";
import { useQuota } from "@/lib/quota";
import { PaidNotice } from "@/features/receipts/Payment";

// Sporcu tarafının ana sayfası (sporcu, öğrenci, veli; Seyhun 2026-11-25 ayrı dosya): Hava, altında bugünün fitness antrenmanı (varsa), Takvim;
// yanda Ders programı kartı, Tekne ekranı (yalnız Aç), Bekleyen, kalan asistan/fiş hakkı, Velora Sailing, Yoklamam kartı. Asistan yok (alt çubukta küre çıkmaz).
export function SporcuHome() {
  const h = useHesap();
  const router = useRouter();
  const qa = useQuota("assistant");
  const qr = useQuota("receipt");
  return (
    <HomeFrame lead={<TodayFit />}>
      {(inbox, onInbox) => (
        <>
          <DersCard />
          <BilgiTile owner={false} />
          <Waiting inbox={inbox} onAll={onInbox} />
          {qa && qr && (
            <p className="px-1 text-[0.75rem] tabular-nums text-mut">
              Bugün kalan · asistan {qa.left}/{qa.limit} · fiş {qr.left}/{qr.limit}
            </p>
          )}
          <PaidNotice />
          <IntroTile preview={<SailingPreview />} title="Velora Sailing" sub="Taktik ve kural senaryoları" onOpen={() => router.push("/sailing")} />
          <MyAttendanceCard kind={h.kind} />
        </>
      )}
    </HomeFrame>
  );
}
