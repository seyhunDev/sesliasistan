import { liveBody, liveHead } from "@/features/liveScreen/fonts";
import { InAppBack } from "@/features/liveScreen/InAppBack";
import { CanliUpdate } from "@/features/liveScreen/CanliUpdate";

// Herkese açık canlı yarış sayfaları (yazı: features/liveScreen/fonts.js). Uygulama içinden (yarış sayfası, Yayın) açılan canlı ekran
// app/(app)/athletes/(..)canli altında aynı düzenle çizilir, uygulama kapanıp yeniden kurulmaz.
export default function CanliLayout({ children }) {
  return (
    <>
      <div className={`canli-root ${liveBody.variable} ${liveHead.variable}`}>{children}</div>
      <InAppBack />
      <CanliUpdate />
    </>
  );
}
