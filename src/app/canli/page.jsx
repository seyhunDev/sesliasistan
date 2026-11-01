import { LiveHome } from "@/features/liveScreen/LiveHome";

// Herkese açık genel sayfa (Seyhun 2026-11-01): açık yarışların listesi; silinen yarışın linki buraya yönlenir.
export const metadata = { title: "Canlı yarışlar · Velora" };

export default function Page() {
  return <LiveHome />;
}
