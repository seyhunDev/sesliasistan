"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { goBack } from "@/lib/navTrail";

// Geri düğmesi: gelinen sayfaya döner; uygulama bu sayfada açıldıysa `href`e (üst sayfa) gider.
// Üst sayfaya giderken geçmişte bu sayfanın yerine geçer (replace): yoksa üst sayfada geri basınca
// bu sayfaya dönülür, buradan yine üst sayfaya gidilir ve iki sayfa arasında döngü olur.
// data-back: kenardan kaydırarak geri (SwipeBack.jsx) gidilecek üst sayfayı buradan okur.
export function BackLink({ href = "/", onClick, ...rest }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      replace
      data-back=""
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        goBack(router, href);
      }}
      {...rest}
    />
  );
}
