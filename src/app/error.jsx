"use client";

import { CrashScreen } from "@/components/ui/CrashScreen";

// Uygulama çerçevesi (sağlayıcılar, alt çubuk) ya da giriş sayfaları çökerse
export default function RootError(props) {
  return <CrashScreen {...props} where="çerçeve" />;
}
