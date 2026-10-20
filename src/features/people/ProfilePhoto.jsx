"use client";

import { useRef, useState } from "react";
import { deleteObject, getDownloadURL, getStorage, ref as sref, uploadBytes } from "firebase/storage";
import { Loader } from "@/components/ui/Loader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { avatarPath, clampPan, coverBox } from "@/lib/avatar";
import { app } from "@/lib/firebase/clientApp";
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
// dataUrl: kırpma ekranında hazırlanan 400×400 JPEG
export async function setPhoto(orgId, uid, dataUrl, oldPath = "") {
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
  const [crop, setCrop] = useState(null); // seçilen dosyanın adresi: kırpma ekranı açık
  const pick = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) setCrop(URL.createObjectURL(f));
  };
  const closeCrop = () => (crop && URL.revokeObjectURL(crop), setCrop(null));
  const saveCrop = (dataUrl) => {
    closeCrop();
    setPre({ url: dataUrl, was: photo });
    run(() => setPhoto(orgId, uid, dataUrl, photoPath));
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
          <button type="button" onClick={() => (setOpen(false), input.current?.click())} data-press className="btn btn-primary">
            Fotoğraf seç
          </button>
          <button type="button" onClick={() => run(() => removePhoto(uid, photoPath))} data-press className="btn btn-danger">
            Fotoğrafı kaldır
          </button>
        </div>
      </Sheet>
      <Sheet open={!!crop} onClose={closeCrop} title="Fotoğrafı yerleştir">
        {crop && <Cropper key={crop} src={crop} onSave={saveCrop} />}
      </Sheet>
    </>
  );
}

const FRAME = 260; // ekrandaki yuvarlak çerçeve (px)
const OUT = 400; // kaydedilen fotoğraf (px)

// Kırpma: fotoğraf çerçeveyi dolduracak şekilde ortalanmış açılır; parmakla kaydırılır, iki parmakla ya da sürgüyle büyütülür.
function Cropper({ src, onSave }) {
  const img = useRef(null);
  const [nat, setNat] = useState(null); // { w, h }
  const [z, setZ] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const pts = useRef(new Map());
  const last = useRef(null); // { x, y, d } önceki dokunuş ortası ve iki parmak arası
  const box = nat ? coverBox(nat.w, nat.h, FRAME, z) : null;
  const fix = (p, zz = z) => (nat ? clampPan(p, coverBox(nat.w, nat.h, FRAME, zz), FRAME) : p);

  const mid = () => {
    const a = [...pts.current.values()];
    const x = a.reduce((s, p) => s + p.x, 0) / a.length;
    const y = a.reduce((s, p) => s + p.y, 0) / a.length;
    const d = a.length > 1 ? Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) : 0;
    return { x, y, d };
  };
  const down = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    last.current = mid();
  };
  const moveP = (e) => {
    if (!pts.current.has(e.pointerId) || !last.current) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const m = mid();
    const zz = m.d && last.current.d ? Math.min(4, Math.max(1, z * (m.d / last.current.d))) : z;
    setZ(zz);
    const dx = m.x - last.current.x;
    const dy = m.y - last.current.y;
    setPan((p) => fix({ x: p.x + dx, y: p.y + dy }, zz));
    last.current = m;
  };
  const up = (e) => {
    pts.current.delete(e.pointerId);
    last.current = pts.current.size ? mid() : null;
  };
  const zoom = (zz) => {
    setZ(zz);
    setPan((p) => fix(p, zz));
  };
  function save() {
    if (!box) return;
    const c = document.createElement("canvas");
    c.width = OUT;
    c.height = OUT;
    const k = OUT / FRAME;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, OUT, OUT);
    ctx.drawImage(img.current, (box.left + pan.x) * k, (box.top + pan.y) * k, box.w * k, box.h * k);
    onSave(c.toDataURL("image/jpeg", 0.85));
  }

  return (
    <div className="flex flex-col items-center gap-4 pb-2" onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
      <div
        onPointerDown={down}
        onPointerMove={moveP}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative touch-none select-none overflow-hidden rounded-full bg-bg ring-1 ring-line"
        style={{ width: FRAME, height: FRAME }}
      >
        <img
          ref={img}
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          className="pointer-events-none absolute max-w-none"
          style={box ? { width: box.w, height: box.h, left: box.left + pan.x, top: box.top + pan.y } : { opacity: 0 }}
        />
      </div>
      <input type="range" min="1" max="4" step="0.01" value={z} onChange={(e) => zoom(+e.target.value)} aria-label="Büyüt" className="w-full max-w-[260px]" style={{ accentColor: "var(--acc)" }} />
      <button type="button" onClick={save} disabled={!box} data-press className="btn btn-primary w-full">
        Kaydet
      </button>
    </div>
  );
}
