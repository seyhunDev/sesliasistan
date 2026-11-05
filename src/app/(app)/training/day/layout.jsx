import { Barlow, Barlow_Condensed } from "next/font/google";

// Antrenman ekranı canlı ekranın yazısıyla (Seyhun 2026-11-05 "canlı yayın sayfası gibi"; /canli düzeniyle aynı yazı karakterleri)
const body = Barlow({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--lv-font" });
const head = Barlow_Condensed({ subsets: ["latin", "latin-ext"], weight: ["500", "600", "700", "800"], display: "swap", variable: "--lv-font-c" });

export default function TrainingDayLayout({ children }) {
  return <div className={`${body.variable} ${head.variable}`}>{children}</div>;
}
