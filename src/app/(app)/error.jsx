"use client";

import { CrashScreen } from "@/components/ui/CrashScreen";

// Bir sayfa çökerse alt çubuk ve asistan yerinde kalır, yalnız sayfa alanında Türkçe hata ekranı çıkar
export default function AppError(props) {
  return <CrashScreen {...props} where="sayfa" />;
}
