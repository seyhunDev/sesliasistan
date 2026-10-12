"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Borçlar artık Hesaplar'da (Kulüp: kulübün verdikleri, Kişisel: bana borçlu olanlar / benim borçlarım). Eski bağlantılar için.
export default function DebtsPage() {
  const router = useRouter();
  useEffect(() => router.replace("/mail?tab=kisisel"), [router]);
  return null;
}
