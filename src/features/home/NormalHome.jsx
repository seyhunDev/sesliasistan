"use client";

import { useHesap } from "@/features/auth/useHesap";
import { Row, RowList } from "@/components/ui/Row";
import { PaidNotice } from "@/features/receipts/Payment";
import { HomeFrame } from "./OwnerHome";
import { MyFitCard } from "./MyFitCard";
import { Waiting } from "./IpadHome";

// Normal kullanıcının ana sayfası (çalışan, aile, diğer; antrenör de; Seyhun 2026-11-24 "küçük kapsamlı uygulama", 2026-11-25 ayrı dosya):
// Hava, Takvim, Bekleyen, antrenörde Yönet, ödeme bildirimi, kendi fitness kartı. Velora Sailing (Kulüp) ve İngilizce alt çubukta,
// burada tekrar yok (Seyhun 2026-11-25).
export function NormalHome() {
  const h = useHesap();
  return (
    <HomeFrame>
      {(inbox, onInbox) => (
        <>
          <Waiting inbox={inbox} onAll={onInbox} />
          {h.coach && (
            <RowList>
              <Row href="/bilgi/yonet" title="Yönet" />
            </RowList>
          )}
          <PaidNotice />
          <MyFitCard />
        </>
      )}
    </HomeFrame>
  );
}
