"use client";

import "./globals.css";
import { CrashScreen } from "@/components/ui/CrashScreen";
import { THEME_SCRIPT } from "@/lib/theme";

// Kök yerleşim bile çökerse (son çare): kendi <html>'i ile aynı Türkçe ekran, telefonun açık/koyu ayarıyla
export default function GlobalError(props) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <title>Sesli Asistan</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <CrashScreen {...props} where="kök" />
      </body>
    </html>
  );
}
