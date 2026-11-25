import { Barlow, Barlow_Condensed } from "next/font/google";

// Herkese açık canlı yarış sayfalarının yazısı (Seyhun 2026-11-02 "profesyonel yelken yarışı yayını gibi, rastgele yazı karakteri olmasın"):
// spor yayınlarının dar, kalın yazısı. Başlık, sayı ve etiketler Barlow Condensed; satırlar Barlow. Derlemede indirilir, uygulamayla sunulur.
// Tek yerde: herkese açık /canli düzeni ve uygulama içinden açılan canlı ekran (app/(app)/athletes/(..)canli) aynı yazıyı kullanır.
export const liveBody = Barlow({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--lv-font" });
export const liveHead = Barlow_Condensed({ subsets: ["latin", "latin-ext"], weight: ["300", "500", "600", "700", "800"], display: "swap", variable: "--lv-font-c" });
