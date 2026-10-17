"use client";

import { useRef, useState } from "react";
import { deleteObject, getDownloadURL, getStorage, ref as sref, uploadBytes } from "firebase/storage";
import { Loader } from "@/components/ui/Loader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { avatarPath } from "@/lib/avatar";
import { app } from "@/lib/firebase/clientApp";
import { compressImage } from "@/lib/image";
import { initials } from "@/lib/utils/format";

// Profil fotoğrafı (herkes kendisininkini, ana hesap herkesinkini): 400 px'e küçültülür, Storage'a yüklenir,
// adresi /api/photo ile kişi kaydına, Mesajlar rehberine ve kişinin profiline yazılır. Eski fotoğraf silinir.
async function save(uid, body) {
  const res = await authFetch("/api/photo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ uid, ...body }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Fotoğraf kaydedilemedi");
}
async function drop(path) {
  if (path) await deleteObject(sref(getStorage(app), path)).catch(() => {});
}
export async function setPhoto(orgId, uid, file, oldPath = "", onPreview) {
  const { dataUrl } = await compressImage(file, 400, 0.8);
  onPreview?.(dataUrl);
  const blob = await (await fetch(dataUrl)).blob();
  const path = avatarPath(orgId, uid);
  const r = sref(getStorage(app), path);
  await uploadBytes(r, blob, { contentType: "image/jpeg", cacheControl: "public, max-age=31536000" });
  try {
    await save(uid, { photo: await getDownloadURL(r), path });
  } catch (e) {
    await drop(path);
    throw e;
  }
  if (oldPath && oldPath !== path) await drop(oldPath);
}
export async function removePhoto(uid, oldPath = "") {
  await save(uid, { photo: "" });
  await drop(oldPath);
}

// Yuvarlak fotoğraf ya da baş harfler. Dokununca: Fotoğraf seç / Fotoğrafı kaldır.
export function ProfilePhoto({ orgId, uid, name, photo, photoPath, size = "size-20", text = "text-[1.75rem]", tone = "bg-acc/10 text-acc" }) {
  const toast = useToast();
  const input = useRef(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Seçilen fotoğraf: yüklenirken ve kayıttaki adres değişene kadar bu gösterilir ({ url, was: o anki adres })
  const [pre, setPre] = useState(null);
  const preview = pre && pre.was === photo ? pre.url : null;
  async function run(fn) {
    setOpen(false);
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setPre(null);
      toast(e.message || "Fotoğraf kaydedilemedi");
    } finally {
      setBusy(false);
    }
  }
  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) run(() => setPhoto(orgId, uid, f, photoPath, (url) => setPre({ url, was: photo })));
  };
  return (
    <>
      <button type="button" onClick={() => (photo ? setOpen(true) : input.current?.click())} disabled={busy || !orgId} aria-label="Profil fotoğrafı" className={`relative grid ${size} shrink-0 place-items-center overflow-hidden rounded-full ${tone} ${text} font-semibold transition active:scale-95`}>
        {preview || photo ? <img src={preview || photo} alt="" className={`size-full object-cover transition ${busy ? "opacity-50" : ""}`} /> : <span className={busy ? "opacity-40" : ""}>{initials(name)}</span>}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-black/25">
            <Loader size="sm" className="text-white" label="Fotoğraf yükleniyor" />
          </span>
        )}
      </button>
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
      <Sheet open={open} onClose={() => setOpen(false)} title="Profil fotoğrafı">
        <div className="flex flex-col gap-2 pb-2">
          <button type="button" onClick={() => (setOpen(false), input.current?.click())} className="h-12 rounded-2xl bg-acc text-[1rem] font-semibold text-white active:scale-[.98]">
            Fotoğraf seç
          </button>
          <button type="button" onClick={() => run(() => removePhoto(uid, photoPath))} className="h-12 rounded-2xl border border-line bg-card text-[1rem] font-semibold text-rec active:scale-[.98]">
            Fotoğrafı kaldır
          </button>
        </div>
      </Sheet>
    </>
  );
}
