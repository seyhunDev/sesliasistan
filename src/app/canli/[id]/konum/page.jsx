import { BoatRacePage } from "@/features/tracking/BoatRacePage";

// Tekne animasyonu (Seyhun 2026-11-03): örnek yarışta hazır veri setinden start; ?grp=<grup> yalnız o grubun tekneleri.
export const metadata = { title: "Tekne konumları · Velora" };

export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const q = await searchParams;
  return <BoatRacePage id={id} grp0={typeof q?.grp === "string" ? q.grp : ""} />;
}
