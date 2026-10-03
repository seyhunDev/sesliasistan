"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { Row } from "./ui";

// Ayarlar › iPhone takvimi: planlar iPhone/Mac Takvim'e abonelik olarak eklenir (salt okunur, birkaç saatte bir yenilenir).
// Bağlantı gizlidir; bilen herkes planları görür, bu yüzden "Yenile" eskisini geçersiz kılar, "Kapat" siler.
export function CalendarFeedRow() {
  const { profile } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(null); // sunucudan dönen son bağlantı (profil gecikirse)
  const [busy, setBusy] = useState(false);
  const token = mine ?? profile?.icsToken ?? "";
  const url = token && typeof window !== "undefined" ? `${window.location.origin}/api/ics?t=${token}` : "";
  const webcal = url.replace(/^https?:/, "webcal:");

  async function call(action) {
    setBusy(true);
    try {
      const res = await authFetch("/api/ics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Olmadı");
      setMine(j.token || "");
      if (action === "off") toast("Takvim bağlantısı kapatıldı");
      else if (action === "new" && token) toast("Yeni bağlantı oluşturuldu, eskisi artık çalışmaz");
    } catch (e) {
      toast(e.message || "Olmadı");
    }
    setBusy(false);
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("Bağlantı kopyalandı");
    } catch {
      toast("Kopyalanamadı");
    }
  };

  return (
    <Row icon="cal" tone="rec" title="iPhone takvimi" sub={token ? "Açık · planlar Takvim'de" : "Planları iPhone ya da Mac Takvim'de gör"} onClick={() => setOpen((o) => !o)} chevron>
      {open && (
        <div className="px-4 pb-3 text-[0.875rem]">
          {!token ? (
            <>
              <p className="text-mut">Planların iPhone Takvim’de abonelik olarak görünür; değişiklikler birkaç saat içinde gelir. Takvimden düzenlenmez, düzenleme uygulamada.</p>
              <button type="button" disabled={busy} onClick={() => call("new")} className="mt-2 h-10 w-full rounded-xl bg-acc font-semibold text-white active:scale-[.98] disabled:opacity-50">
                {busy ? "Hazırlanıyor…" : "Takvim bağlantısı oluştur"}
              </button>
            </>
          ) : (
            <>
              <a href={webcal} className="grid h-10 w-full place-items-center rounded-xl bg-acc font-semibold text-white active:scale-[.98]">
                Takvime ekle
              </a>
              <p className="mt-2 text-mut">Açılan ekranda Abone Ol › Ekle. Açılmazsa bağlantıyı kopyala: iPhone Ayarlar › Takvim › Hesaplar › Hesap Ekle › Diğer › Abone Olunan Takvim Ekle.</p>
              <p className="mt-2 break-all rounded-xl bg-bg px-3 py-2 text-[0.75rem] text-mut">{url}</p>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={copy} className="h-9 flex-1 rounded-full font-semibold ring-1 ring-line active:scale-95">Kopyala</button>
                <button type="button" disabled={busy} onClick={() => call("new")} className="h-9 flex-1 rounded-full font-semibold ring-1 ring-line active:scale-95 disabled:opacity-50">Yenile</button>
                <button type="button" disabled={busy} onClick={() => call("off")} className="h-9 flex-1 rounded-full font-semibold text-rec ring-1 ring-rec/30 active:scale-95 disabled:opacity-50">Kapat</button>
              </div>
              <p className="mt-2 text-[0.75rem] text-mut">Bağlantıyı bilen planları görür; paylaşma. Şüphelenirsen Yenile.</p>
            </>
          )}
        </div>
      )}
    </Row>
  );
}
