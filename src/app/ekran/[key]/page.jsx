import { BilgiScreen } from "@/features/bilgi/BilgiScreen";
import { ToastProvider } from "@/components/ui/ToastProvider";

// Sporcu bilgi ekranı, herkese açık link (Seyhun 2026-11-15): girişsiz, linki alan herkes açar. Anahtar Bilgi ekranı › Yönet'te
export const metadata = { title: "Bilgi ekranı · Velora" };

export default async function Page({ params }) {
  const { key } = await params;
  return (
    <ToastProvider>
      <BilgiScreen pub={String(key || "").slice(0, 40)} />
    </ToastProvider>
  );
}
