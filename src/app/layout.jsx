import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ServiceWorkerSetup } from "@/features/pwa/Pwa";

// Her cihazda aynı görünen, Türkçe karakterleri tam destekleyen yazı tipi (derlemede indirilir, uygulamayla birlikte sunulur)
const inter = Inter({ subsets: ["latin", "latin-ext"], display: "swap", variable: "--font-inter" });

export const metadata = {
    title: "Sesli Asistan",
    applicationName: "Sesli Asistan",
    appleWebApp: { capable: true, title: "Sesli Asistan", statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#f4f3ef",
};

const SIZE_SCRIPT = `try{var s=localStorage.getItem("sa-size");if(s==="l"||s==="xl")document.documentElement.dataset.size=s}catch(e){}`;

export default function RootLayout({ children }) {
    return (
        <html lang="tr" className={inter.variable} suppressHydrationWarning>
            <head>
                {/* Yazı boyutu seçimi sayfa çizilmeden uygulansın (sonradan büyüyüp zıplamasın) */}
                <script dangerouslySetInnerHTML={{ __html: SIZE_SCRIPT }} />
            </head>
            <body>
                <AuthProvider>{children}</AuthProvider>
                <ServiceWorkerSetup />
            </body>
        </html>
    );
}