"use client";

import { useEffect, useState } from "react";
import { Row } from "@/features/settings/ui";

// Android uygulamasını güncelle (yalnız Android telefonda): en yeni APK'yı indirir, indirilen dosyaya dokununca kurulur.
// APK her main birleşmesinde GitHub Actions "Android APK" ile derlenip "android" sürümüne konur (adres hep aynı;
// depo herkese açık, APK da). Aynı imza anahtarıyla derlendiği için eski uygulamanın üstüne kurulur.
export const APK_URL = "https://github.com/seyhunDev/sesliasistan/releases/download/android/asistan.apk";
const INFO = "https://api.github.com/repos/seyhunDev/sesliasistan/releases/tags/android";

const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent || "");

// "15 Kas 22:12" (en yeni APK'nın derlendiği an)
export const apkDate = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function AndroidApkRow() {
  const [show] = useState(isAndroid);
  const [when, setWhen] = useState("");
  useEffect(() => {
    if (!show) return;
    fetch(INFO)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const a = j?.assets?.find((x) => x.name === "asistan.apk");
        if (a?.updated_at) setWhen(apkDate(a.updated_at));
      })
      .catch(() => {});
  }, [show]);
  if (!show) return null;
  return <Row title="Android uygulamasını güncelle" sub={when} chevron onClick={() => window.open(APK_URL, "_blank")} />;
}
