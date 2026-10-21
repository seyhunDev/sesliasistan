"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { reportText } from "@/lib/assistReport";
import { timingFlush } from "@/lib/assistTiming";
import { buildLine } from "@/lib/buildInfo";
import { quickOn } from "@/lib/quickMode";

// Asistan raporu ("rapor oluştur" ya da Ayarlar › Testler): bugün bu cihazda asistana söylenenler, cevaplar, süreler,
// model ve hatalar (lib/assistReport.js). Paylaş ile gönderilir (iPhone paylaşım menüsü), yoksa kopyalanır.
const device = () => {
  const ua = navigator.userAgent || "";
  const os = /iPhone|iPad/.test(ua) ? `iOS ${(/OS (\d+[_\d]*)/.exec(ua)?.[1] || "").replace(/_/g, ".")}` : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : "Bilgisayar";
  const app = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone ? "ana ekran uygulaması" : "tarayıcı";
  return `${os}, ${app}`;
};
const voiceOn = () => {
  try {
    return localStorage.getItem("sa_tts_on") === "1";
  } catch {
    return false;
  }
};

export default function ReportPage() {
  const toast = useToast();
  const [text, setText] = useState("");
  useEffect(() => {
    const make = () => setText(reportText({ meta: { version: buildLine(), device: device(), voice: voiceOn(), quick: quickOn() } }));
    timingFlush(); // "rapor oluştur" komutunun kaydı da girsin
    const t = setTimeout(make, 0);
    return () => clearTimeout(t);
  }, []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast("Rapor kopyalandı");
    } catch {
      toast("Kopyalanamadı");
    }
  };
  const share = async () => {
    if (!navigator.share) return copy();
    try {
      await navigator.share({ title: "Asistan raporu", text });
    } catch (e) {
      if (e?.name !== "AbortError") copy();
    }
  };
  return (
    <div className="pb-28">
      <PageHeader title="Asistan raporu" sub="Bugün, bu cihaz" back="/settings" />
      <div className="mt-2 flex gap-2">
        <Button full onClick={share}>Paylaş</Button>
        <Button full variant="secondary" onClick={copy}>Kopyala</Button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-line bg-card p-3 text-[0.8125rem] leading-relaxed">{text || "Hazırlanıyor…"}</pre>
    </div>
  );
}
