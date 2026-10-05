"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { canGoBack } from "@/lib/navTrail";

// Geri düğmesi: gelinen sayfaya döner; uygulama bu sayfada açıldıysa `href`e (üst sayfa) gider
export function BackLink({ href = "/", onClick, ...rest }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || !canGoBack()) return;
        e.preventDefault();
        router.back();
      }}
      {...rest}
    />
  );
}
