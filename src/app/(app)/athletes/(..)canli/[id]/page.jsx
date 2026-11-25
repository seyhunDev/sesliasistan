import { liveBody, liveHead } from "@/features/liveScreen/fonts";
import { InAppBack } from "@/features/liveScreen/InAppBack";
import { CanliUpdate } from "@/features/liveScreen/CanliUpdate";
import { LiveScreen } from "@/features/liveScreen/LiveScreen";

// Uygulama içinden açılan canlı ekran (Seyhun 2026-11-12 "canlı ekrandan geri kaydırınca takılıyor"): yarış sayfası ya da Yayın'daki
// "Canlı" /canli/<id>'ye gider; bu yol (Next "araya giren yol", (..)canli) onu uygulamanın içinde çizer. Önceden /canli uygulamanın
// dışında olduğu için açınca bütün uygulama (veri dinleyicileri, sağlayıcılar) kapanıyor, geri dönünce baştan kuruluyordu: takılma ve
// yeniden okuma. Adres aynı; bağlantıyla ya da yenileyince herkese açık app/canli/[id] açılır. Görünüm onunla aynı (canli/layout.jsx).
export const metadata = { title: "Canlı yarış · Velora" };

export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const q = await searchParams;
  return (
    <>
      <div className={`canli-root ${liveBody.variable} ${liveHead.variable}`}>
        <LiveScreen id={id} y={typeof q?.y === "string" ? q.y : ""} />
      </div>
      <InAppBack />
      <CanliUpdate />
    </>
  );
}
