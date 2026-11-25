import { Tracker } from "@/features/tracking/Tracker";

// Teknedeki telefonun takip sayfası (Seyhun 2026-11-02): girişsiz; link Yayın › Dönüşler › Tekne takibi'nden paylaşılır.
export const metadata = { title: "Tekne takibi · Velora" };

export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const q = await searchParams;
  return <Tracker id={id} k={typeof q?.k === "string" ? q.k : ""} />;
}
