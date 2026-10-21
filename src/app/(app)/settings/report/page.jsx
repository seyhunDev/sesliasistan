"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/components/ui/ToastProvider";
import { reportDevice, reportText, reportVoiceOn } from "@/lib/assistReport";
import { timingFlush } from "@/lib/assistTiming";
import { buildLine } from "@/lib/buildInfo";
import { quickOn } from "@/lib/quickMode";

// Asistan raporu ("rapor oluştur" ya da Ayarlar › Testler): bugün bu cihazda asistana söylenenler, cevaplar, süreler,
// model ve hatalar (lib/assistReport.js). Paylaş ile gönderilir (iPhone paylaşım menüsü), yoksa kopyalanır.
// Altta kayıtlı konuşmalar (her kapanışta kaydedilir, lib/assistLog.js), tarih tarih; dokununca o konuşmanın raporu.
const dayText = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short" });
const hm = (t) => new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export default function ReportPage() {
  const toast = useToast();
  const [today, setToday] = useState("");
  const [sel, setSel] = useState(null); // { id, at, text }: açılan kayıtlı konuşma
  const [saved, setSaved] = useState(null);
  useEffect(() => {
    const make = () => setToday(reportText({ meta: { version: buildLine(), device: reportDevice(), voice: reportVoiceOn(), quick: quickOn() } }));
    timingFlush(); // "rapor oluştur" komutunun kaydı da girsin
    const t = setTimeout(make, 0);
    authFetch("/api/assist-log", { timeout: 10000 })
      .then((r) => r.json())
      .then((j) => setSaved(Array.isArray(j?.list) ? j.list : []))
      .catch(() => setSaved([]));
    return () => clearTimeout(t);
  }, []);
  const open = async (x) => {
    setSel({ id: x.id, at: x.at, text: "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const j = await (await authFetch(`/api/assist-log?id=${encodeURIComponent(x.id)}`, { timeout: 10000 })).json();
      setSel({ id: x.id, at: x.at, text: j.text || "Rapor okunamadı." });
    } catch {
      setSel({ id: x.id, at: x.at, text: "Rapor okunamadı." });
    }
  };
  const text = sel ? sel.text : today;
  const days = [...new Set((saved || []).map((x) => x.day))];
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
      <PageHeader title="Asistan raporu" sub={sel ? `Konuşma · ${dayText(new Date(sel.at).toLocaleDateString("en-CA"))} ${hm(sel.at)}` : "Bugün, bu cihaz"} back="/settings/tests" />
      <div className="mt-2 flex gap-2">
        <Button full onClick={share}>Paylaş</Button>
        <Button full variant="secondary" onClick={copy}>Kopyala</Button>
        {sel && (
          <Button full variant="secondary" onClick={() => setSel(null)}>
            Bugün
          </Button>
        )}
      </div>
      <pre className="mt-3 max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-line bg-card p-3 text-[0.8125rem] leading-relaxed">{text || "Hazırlanıyor…"}</pre>
      <div className="mt-5">
        <ListHead title="Kayıtlı konuşmalar" count={saved?.length || 0} />
        {saved === null ? (
          <p className="px-1 py-3 text-[0.875rem] text-mut">Yükleniyor…</p>
        ) : !saved.length ? (
          <p className="px-1 py-3 text-[0.875rem] text-mut">Henüz kayıt yok.</p>
        ) : (
          days.map((d) => (
            <div key={d} className="mb-3">
              <p className="px-1 pb-1 text-[0.8125rem] font-semibold text-mut">{dayText(d)}</p>
              <RowList>
                {saved
                  .filter((x) => x.day === d)
                  .map((x) => (
                    <Row key={x.id} onClick={() => open(x)} title={x.first || "Konuşma"} sub={`${hm(x.at)} · ${x.n} istek`} />
                  ))}
              </RowList>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
