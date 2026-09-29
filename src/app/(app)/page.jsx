"use client";

import { OwnerHome } from "@/features/home/OwnerHome";

// Ana hesap ve çalışan aynı ana sayfayı kullanır; çalışan yalnızca kendi kayıtlarını görür
export default function HomePage() {
  return <OwnerHome />;
}
