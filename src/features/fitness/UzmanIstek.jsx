"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { compressImage } from "@/lib/image";
import { DERS_MAX, SURELER, TURLER, VARSAYILAN_TURLER, acikMi, durumYaz } from "@/lib/fitness/uzmanIstek";

// "Uzmanla çalış" (Seyhun 2026-11-27, örnek onaylı): süre, hedef, ders programı, planları paylaşma izni → istek "Uzman bekleniyor".
// Açık istek varsa durumu gösterilir; paylaşım burada her an açılıp kapatılır (sporcunun elinde). Program ekle'de (ana hesap,
// Kimin için'deki kişi adına) ve sporcunun Fitness sayfasında aynı bileşen. Kayıt sunucuda (/api/uzman-istek).
const seg = (on) => `h-10 rounded-[0.625rem] text-[0.9375rem] transition ${on ? "bg-card font-semibold shadow-[0_1px_3px_rgba(0,0,0,.15)]" : "text-mut"}`;
const box = "rounded-[1.125rem] border border-line bg-card p-3.5";

function Paylas({ value, onChange }) {
  const { acik, turler } = value;
  return (
    <section className={box}>
      <div className="flex items-center justify-between gap-3">
        <b className="text-[1rem] font-semibold">Planlarımı paylaş</b>
        <button type="button" role="switch" aria-checked={acik} aria-label="Planlarımı paylaş" onClick={() => onChange(acik ? { acik: false, turler: [] } : { acik: true, turler: turler.length ? turler : VARSAYILAN_TURLER })} className={`relative h-[1.875rem] w-[3.125rem] shrink-0 rounded-full transition ${acik ? "bg-acc" : "bg-line"}`}>
          <span className={`absolute top-[2px] size-[1.625rem] rounded-full bg-white shadow transition-all ${acik ? "left-[1.375rem]" : "left-[2px]"}`} />
        </button>
      </div>
      {acik && (
        <>
          <p className="mt-2 text-[0.8125rem] text-mut">Uzman yalnız seçtiklerini görür:</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TURLER.map(([k, l]) => {
              const on = turler.includes(k);
              return (
                <button key={k} type="button" aria-pressed={on} onClick={() => onChange({ acik: true, turler: on ? turler.filter((x) => x !== k) : [...turler, k] })} className={`rounded-full px-3 py-1.5 text-[0.8125rem] font-semibold ${on ? "bg-acc/15 text-acc" : "bg-bg text-mut"}`}>
                  {l}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[0.8125rem] text-mut">İstediğin zaman kapatırsın; kapatınca uzman göremez.</p>
        </>
      )}
    </section>
  );
}

export function UzmanIstek({ orgId, forUid = "", forName = "", spor = "", yas = 0, sehir = "" }) {
  const toast = useToast();
  const ask = useConfirm();
  const [list, setList] = useState(null);
  const [sure, setSure] = useState(3);
  const [hedef, setHedef] = useState("");
  const [file, setFile] = useState(null);
  const [paylas, setPaylas] = useState({ acik: false, turler: [] });
  const [busy, setBusy] = useState(false);
  const q = `orgId=${encodeURIComponent(orgId || "")}${forUid ? `&for=${encodeURIComponent(forUid)}` : ""}`;
  const yukle = useCallback(async () => {
    try {
      const r = await authFetch(`/api/uzman-istek?${q}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error);
      setList(j.list || []);
    } catch {
      setList([]);
    }
  }, [q]);
  useEffect(() => {
    if (orgId) Promise.resolve().then(yukle);
  }, [orgId, yukle]);
  const acik = (list || []).find((x) => x.brans === "fitness" && acikMi(x.durum));

  const gonder = async () => {
    setBusy(true);
    try {
      let ders = null;
      if (file) {
        if (/^image\//.test(file.type)) {
          const c = await compressImage(file, 2000, 0.8);
          ders = { name: file.name.replace(/\.\w+$/, ".jpg"), type: c.mimeType, data: c.base64 };
        } else {
          if (file.size > DERS_MAX) throw new Error("Dosya çok büyük (en çok 4 MB).");
          const data = await new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(String(fr.result).split(",")[1]);
            fr.onerror = () => rej(new Error("Dosya okunamadı"));
            fr.readAsDataURL(file);
          });
          ders = { name: file.name, type: file.type || "application/pdf", data };
        }
      }
      const r = await authFetch("/api/uzman-istek", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orgId, for: forUid || undefined, sure, hedef, spor, yas: yas || undefined, sehir: sehir || undefined, paylas, ders }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.istek) throw new Error(j.error || "İstek gönderilemedi");
      setList((l) => [j.istek, ...(l || [])]);
      toast("İstek gönderildi");
    } catch (x) {
      toast(x instanceof TypeError ? "Bağlantı kurulamadı, tekrar dene" : x.message || "İstek gönderilemedi");
    } finally {
      setBusy(false);
    }
  };
  const guncelle = async (id, body) => {
    const r = await authFetch("/api/uzman-istek", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ orgId, id, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.istek) throw new Error(j.error || "Kaydedilemedi");
    setList((l) => l.map((x) => (x.id === id ? j.istek : x)));
  };
  const paylasDegis = async (p) => {
    const eski = acik.paylas;
    setList((l) => l.map((x) => (x.id === acik.id ? { ...x, paylas: p } : x)));
    try {
      await guncelle(acik.id, { paylas: p });
    } catch {
      setList((l) => l.map((x) => (x.id === acik.id ? { ...x, paylas: eski } : x)));
      toast("Kaydedilemedi, tekrar dene");
    }
  };
  const iptal = () =>
    ask({
      title: "İstek iptal edilsin mi?",
      yes: "İptal et",
      run: () => guncelle(acik.id, { iptal: true }).catch(() => toast("İptal edilemedi")),
    });

  if (!list) return <div className="h-40 animate-pulse rounded-[1.125rem] bg-card" />;
  if (acik)
    return (
      <div className="space-y-3">
        <section className={box}>
          <div className="flex items-center justify-between gap-2">
            <b className="min-w-0 truncate text-[1rem] font-semibold">{`Fitness · ${acik.sure} ay`}</b>
            <span className="shrink-0 rounded-full bg-[#fff1d6] px-2.5 py-1 text-[0.75rem] font-semibold text-[#7a5200]">{durumYaz(acik.durum)}</span>
          </div>
          {acik.hedef && <p className="mt-1.5 text-[0.875rem]">{acik.hedef}</p>}
          <p className="mt-1.5 text-[0.8125rem] text-mut">{acik.ders ? `Ders programı: ${acik.ders.ad}` : "Ders programı yok"}</p>
        </section>
        <Paylas value={acik.paylas} onChange={paylasDegis} />
        <button type="button" onClick={iptal} className="block w-full py-2 text-center text-[0.875rem] font-semibold text-mut">
          İsteği iptal et
        </button>
      </div>
    );
  return (
    <div className="space-y-3">
      {forName && <p className="text-[0.875rem] text-mut">{`${forName} için`}</p>}
      <div>
        <small className="mb-1.5 block text-[0.8125rem] font-semibold text-mut">Süre</small>
        <div className="grid grid-cols-3 rounded-xl bg-bg p-[3px]">
          {SURELER.map((s) => (
            <button key={s} type="button" aria-pressed={sure === s} onClick={() => setSure(s)} className={seg(sure === s)}>
              {`${s} ay`}
            </button>
          ))}
        </div>
      </div>
      <label className="block">
        <small className="mb-1.5 block text-[0.8125rem] font-semibold text-mut">Hedef</small>
        <input value={hedef} onChange={(e) => setHedef(e.target.value)} maxLength={300} placeholder="Örn. Nisan yarışlarına güçlen" className="h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-[0.9375rem] outline-none" />
      </label>
      <label className={`${box} flex cursor-pointer items-center justify-between gap-3`}>
        <span className="min-w-0">
          <b className="block text-[1rem] font-semibold">Ders programı</b>
          <small className="block truncate text-[0.8125rem] text-mut">{file ? file.name : "PDF ya da fotoğraf yükle"}</small>
        </span>
        <span className="shrink-0 text-[0.9375rem] font-semibold text-acc">{file ? "Değiştir" : "Yükle"}</span>
        <input type="file" accept="application/pdf,image/*,.pdf" className="hidden" onChange={(e) => (setFile(e.target.files?.[0] || null), (e.target.value = ""))} />
      </label>
      <Paylas value={paylas} onChange={setPaylas} />
      <Button loading={busy} onClick={gonder}>
        İstek gönder
      </Button>
    </div>
  );
}
