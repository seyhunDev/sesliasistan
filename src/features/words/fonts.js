import { Bricolage_Grotesque } from "next/font/google";

// İngilizce Hatırla "Altyazı" ekranının başlık yazısı (Seyhun 2026-11-25 A · Altyazı seçti): film altyazısı gibi iri, yuvarlak hatlı.
// Derlemede indirilir, uygulamayla sunulur; yalnız bu ekranda kullanılır.
export const enHead = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], weight: ["600", "700", "800"], display: "swap", variable: "--en-font" });
