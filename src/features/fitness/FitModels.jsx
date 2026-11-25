"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { libEntry } from "@/lib/fitness/library";
import { templatePhotos } from "@/lib/fitness/templates";
import { useBlobUrl } from "./ExerciseMedia";
import { loadMedia, prepMedia, saveMedia } from "./fitMedia";
import { seedMalePhotos } from "./templateSeed";

// Modeller (Hareketler › Modeller; Seyhun 2026-11-25): hazır programın kız modeli (uygulamayla gelen fotoğraflar) ve erkek model.
// Erkek model bir kez çizilir (Gemini), beğenilene kadar yeniden çizilir, "Bunu kullan" ile kütüphanede (lib.models.m) durur.
// Erkek fotoğrafları yalnız buradan, seçilen erkek modelle çizilir (her hareket bir çizim; eksik olanlar).
const TPL = "yelken-ev-12";
const KIZ = "/fitness/model-kiz.jpg";
const b64 = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] || "");
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

export function FitModels({ open, onClose, orgId, lib, setModel, addMale }) {
  const toast = useToast();
  const [cand, setCand] = useState(null); // { blob, url } çizilen ama seçilmemiş erkek model
  const [busy, setBusy] = useState("");
  const saved = lib?.models?.m || null;
  const { url: savedUrl } = useBlobUrl(orgId, saved);
  useEffect(() => () => cand && URL.revokeObjectURL(cand.url), [cand]);
  if (!open) return null;

  const moves = templatePhotos(TPL);
  const have = moves.filter((x) => (libEntry(lib, x)?.media || []).some((m) => m.g === "m")).length;
  const left = moves.length - have;

  const draw = async () => {
    setBusy("Çiziliyor…");
    try {
      const ref = await b64(await (await fetch(KIZ)).blob());
      const r = await authFetch("/api/fitness-pic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Erkek model", mode: "model", ref }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.data) throw new Error(j.error || "Çizilemedi");
      const bytes = Uint8Array.from(atob(j.data), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: j.mimeType || "image/png" });
      setCand({ blob, url: URL.createObjectURL(blob) });
    } catch (e) {
      toast(e.message || "Çizilemedi");
    } finally {
      setBusy("");
    }
  };
  const use = async () => {
    setBusy("Kaydediliyor…");
    try {
      const m = await prepMedia(new File([cand.blob], "erkek-model.png", { type: cand.blob.type }));
      await setModel(await saveMedia(orgId, m));
      setCand(null);
      toast("Erkek model seçildi");
    } catch {
      toast("Kaydedilemedi");
    } finally {
      setBusy("");
    }
  };
  const drawAll = async () => {
    setBusy("Hazırlanıyor…");
    try {
      const got = await loadMedia(orgId, saved);
      const blob = got.blob || (await (await fetch(got.src)).blob());
      const r = await seedMalePhotos({ id: TPL, orgId, lib, addMale, model: await b64(blob), onProg: setBusy });
      toast([r.drawn ? `${r.drawn} erkek fotoğrafı eklendi` : "", r.failed ? `${r.failed} çizilemedi${r.stopped ? ", yarın devam et" : ""}` : ""].filter(Boolean).join(" · ") || "Hepsi hazır");
    } catch {
      toast("Erkek fotoğrafları çizilemedi");
    } finally {
      setBusy("");
    }
  };

  const boy = cand?.url || savedUrl;
  return createPortal(
    <div role="dialog" aria-label="Modeller" className="fixed inset-0 z-[46] flex flex-col overflow-y-auto bg-bg">
      <div className="mx-auto flex h-14 w-full max-w-[30rem] shrink-0 items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <button type="button" onClick={() => !busy && onClose()} data-press className="btn btn-text btn-sm -ml-1 text-acc">
          Kapat
        </button>
        <b className="text-[1.0625rem] font-semibold">Modeller</b>
        <span className="w-16" />
      </div>
      <div className="mx-auto w-full max-w-[30rem] px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-2 gap-3">
          {[
            ["Kız", KIZ],
            ["Erkek", boy],
          ].map(([label, src]) => (
            <figure key={label} className="m-0 overflow-hidden rounded-2xl bg-card ring-1 ring-line">
              <div className="aspect-[2/3] bg-bg">{src ? <img src={src} alt={`${label} model`} className="size-full object-cover" /> : <div className="grid size-full place-items-center text-[0.875rem] text-mut">Henüz yok</div>}</div>
              <figcaption className="px-3 py-2 text-[0.875rem] font-semibold">
                {label}
                {label === "Erkek" && cand ? <span className="ml-1.5 font-normal text-mut">yeni</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant={cand ? "secondary" : "primary"} className="flex-1" disabled={!!busy} onClick={draw}>
            {busy === "Çiziliyor…" ? busy : boy ? "Yeniden çiz" : "Erkek modeli çiz"}
          </Button>
          {cand && (
            <Button className="flex-1" disabled={!!busy} onClick={use}>
              Bunu kullan
            </Button>
          )}
        </div>
        <section className="mt-6 rounded-2xl bg-card p-4 ring-1 ring-line">
          <b className="text-[0.9375rem] font-semibold">Erkek fotoğrafları</b>
          <p className="mt-1 text-[0.875rem] text-mut">{`${have} / ${moves.length} hareket hazır`}</p>
          <Button className="mt-3" full disabled={!saved || !left || !!busy} onClick={drawAll}>
            {busy && busy !== "Çiziliyor…" && busy !== "Kaydediliyor…" ? busy : left ? `Eksikleri çiz (${left})` : "Hepsi hazır"}
          </Button>
        </section>
      </div>
    </div>,
    document.body,
  );
}
