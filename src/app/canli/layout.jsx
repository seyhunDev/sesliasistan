import { Barlow, Barlow_Condensed } from "next/font/google";

// Herkese açık canlı yarış sayfalarının yazısı (Seyhun 2026-11-02 "profesyonel yelken yarışı yayını gibi, rastgele yazı karakteri olmasın"):
// spor yayınlarının dar, kalın yazısı. Başlık, sayı ve etiketler Barlow Condensed; satırlar Barlow. Derlemede indirilir, uygulamayla sunulur.
const body = Barlow({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--lv-font" });
const head = Barlow_Condensed({ subsets: ["latin", "latin-ext"], weight: ["300", "500", "600", "700", "800"], display: "swap", variable: "--lv-font-c" });

export default function CanliLayout({ children }) {
  return <div className={`${body.variable} ${head.variable}`}>{children}</div>;
}
