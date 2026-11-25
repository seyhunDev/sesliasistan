"use client";

import { useRouter } from "next/navigation";
import { useHesap, setGibiGor } from "@/features/auth/useHesap";
import { VIEW_LABEL } from "@/lib/hesapGorunum";

// "… gibi gör" sürerken ekranın altında, alt çubuğun üstünde küçük şerit (Seyhun 2026-11-25): hangi hesabın düzenine bakıldığı ve Geri dön.
// Geri dön önizlemeyi bitirir ve ana sayfayı açar (ana hesabın kendi ana sayfası).
export function GibiGorBar() {
  const { preview } = useHesap();
  const router = useRouter();
  if (!preview) return null;
  return (
    <div className="gibigor" role="status">
      <span>{VIEW_LABEL[preview]} gibi görüyorsun</span>
      <button
        type="button"
        data-press
        onClick={() => {
          setGibiGor("");
          router.push("/");
        }}
        className="btn btn-primary btn-sm"
      >
        Geri dön
      </button>
    </div>
  );
}
