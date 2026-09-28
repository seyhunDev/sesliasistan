import "./globals.css";
import { AuthProvider } from "@/features/auth/AuthProvider";

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
    themeColor: "#f5f6f8",
};

export default function RootLayout({ children }) {
    return (
        <html lang="tr">
            <body>
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}