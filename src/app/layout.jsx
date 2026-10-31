import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ServiceWorkerSetup } from "@/features/pwa/Pwa";
import { BootSplash } from "@/components/ui/BootSplash";
import { PressFeedback } from "@/components/ui/PressFeedback";
import { THEME_BG, THEME_SCRIPT } from "@/lib/theme";

// Her cihazda aynı görünen, Türkçe karakterleri tam destekleyen yazı tipi (derlemede indirilir, uygulamayla birlikte sunulur)
const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-inter" });

export const metadata = {
    title: "Velora",
    applicationName: "Velora",
    appleWebApp: { capable: true, title: "Velora", statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: THEME_BG.light },
        { media: "(prefers-color-scheme: dark)", color: THEME_BG.dark },
    ],
};

const SIZE_SCRIPT = `document.documentElement.dataset.boot="on";try{var s=localStorage.getItem("sa-size");if(s==="l"||s==="xl")document.documentElement.dataset.size=s}catch(e){}`;

// Anında açılış: önceki açılışın kopyası (lib/warmStart.js, anahtar sa-warm-me) varsa açılış ekranı ilk karede hiç çizilmez (html[data-warm])
const WARM_SCRIPT = `try{if(localStorage.getItem("sa-warm-me"))document.documentElement.dataset.warm=""}catch(e){}`;

export default function RootLayout({ children }) {
    return (
        <html lang="tr" className={inter.variable} suppressHydrationWarning>
            <head>
                {/* Yazı boyutu seçimi sayfa çizilmeden uygulansın (sonradan büyüyüp zıplamasın) */}
                <script dangerouslySetInnerHTML={{ __html: SIZE_SCRIPT }} />
                {/* Açık / koyu görünüm de ilk çizimden önce (beyaz parlayıp kararmasın) */}
                <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
                {/* Telefonda önceki açılışın kopyası varsa açılış ekranı hiç çizilmez (lib/warmStart.js) */}
                <script dangerouslySetInnerHTML={{ __html: WARM_SCRIPT }} />
            </head>
            <body>
                {/* Tek açılış ekranı: yükleme aşamaları boyunca sabit kalır, sonra sayfaya yumuşak geçer (lib/boot.js) */}
                <BootSplash />
                <AuthProvider>{children}</AuthProvider>
                <ServiceWorkerSetup />
                <PressFeedback />
            </body>
        </html>
    );
}