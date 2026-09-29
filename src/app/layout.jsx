import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { ServiceWorkerSetup } from "@/features/pwa/Pwa";

export const metadata = {
    title: "Sesli Asistan",
    applicationName: "Sesli Asistan",
    description: "Planlar, görevler ve notlar; konuşarak yönet.",
    appleWebApp: { capable: true, title: "Sesli Asistan", statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
    icons: {
        icon: [
            { url: "/logo.svg", type: "image/svg+xml" },
            { url: "/favicon.ico", sizes: "any" },
        ],
        apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
        shortcut: "/favicon.ico",
    },
};

export const viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#f97316",
};

export default function RootLayout({ children }) {
    return (
        <html lang="tr">
            <body>
                <AuthProvider>{children}</AuthProvider>
                <ServiceWorkerSetup />
            </body>
        </html>
    );
}