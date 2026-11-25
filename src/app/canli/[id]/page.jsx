import { LiveScreen } from "@/features/liveScreen/LiveScreen";

// Herkese açık canlı yarış ekranı (Seyhun 2026-11-01): girişsiz; laptop, dev ekran ve telefonda. ?y=<start> önceki yarış.
export const metadata = { title: "Canlı yarış · Velora" };

export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const q = await searchParams;
  return <LiveScreen id={id} y={typeof q?.y === "string" ? q.y : ""} />;
}
