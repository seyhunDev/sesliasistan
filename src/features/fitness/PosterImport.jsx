"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { compressImage } from "@/lib/image";
import { libList } from "@/lib/fitness/library";
import { MEDIA_MAX, prepMedia, saveMedia } from "./fitMedia";

// Afişten hareket fotoğrafları (Hareketler › "Afişten"; Seyhun 2026-11-25): bütün hareketlerin gösterildiği bir afiş yüklenir,
// yapay zeka her hareketin fotoğraf alanını ve kütüphanedeki karşılığını bulur (/api/fitness-poster). Fotoğraflar telefonda
// kesilir; her satırda hangi harekete gideceği seçilir ("Ekleme" = atla). "Ekle" ile her biri o hareketin fotoğraflarına eklenir
// (useFitLib.setMedia: bütün programlara ve sporculara gider). Afişin kendisi saklanmaz.
const loadImg = (file) =>
  new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => res({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rej(new Error("Fotoğraf açılamadı"));
    };
    img.src = url;
  });

// box [ymin, xmin, ymax, xmax] 0–1000 → JPEG (biraz pay bırakılır)
function cut(img, [y0, x0, y1, x1]) {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const pad = 6;
  const sx = Math.max(0, ((x0 - pad) / 1000) * W);
  const sy = Math.max(0, ((y0 - pad) / 1000) * H);
  const sw = Math.min(W, ((x1 + pad) / 1000) * W) - sx;
  const sh = Math.min(H, ((y1 + pad) / 1000) * H) - sy;
  const c = document.createElement("canvas");
  c.width = Math.round(sw);
  c.height = Math.round(sh);
  c.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return new Promise((res) => c.toBlob((b) => res({ blob: b, src: c.toDataURL("image/jpeg", 0.8) }), "image/jpeg", 0.92));
}

export function PosterImport({ open, onClose, orgId, lib, setMedia }) {
  const toast = useToast();
  const ref = useRef(null);
  const [busy, setBusy] = useState("");
  const [rows, setRows] = useState([]); // { name, to (kütüphane anahtarı ya da ""), blob, src }
  const all = libList(lib);
  if (!open) return null;

  const close = () => {
    if (busy) return;
    setRows([]);
    onClose();
  };
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy("Afiş okunuyor…");
    let url = "";
    try {
      const small = await compressImage(file, 2200, 0.85);
      const r = await authFetch("/api/fitness-poster", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mimeType: small.mimeType, data: small.base64, names: all.map((x) => x.name) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Afiş okunamadı");
      const loaded = await loadImg(file);
      url = loaded.url;
      const out = [];
      for (const x of j.items || []) {
        const c = await cut(loaded.img, x.box);
        if (!c.blob) continue;
        out.push({ name: x.name, to: all.find((y) => y.name === x.match)?.key || "", ...c });
      }
      setRows(out);
    } catch (x) {
      toast(x.message || "Afiş okunamadı");
    } finally {
      if (url) URL.revokeObjectURL(url);
      setBusy("");
    }
  };
  const chosen = rows.filter((x) => x.to);
  const save = async () => {
    let n = 0;
    try {
      for (const x of chosen) {
        n++;
        setBusy(`Ekleniyor ${n} / ${chosen.length}`);
        const e = all.find((y) => y.key === x.to);
        if (!e) continue;
        const m = await prepMedia(new File([x.blob], `${x.name}.jpg`, { type: "image/jpeg" }));
        const meta = await saveMedia(orgId, m);
        await setMedia({ ex: e.ex, name: e.name, kind: e.kind }, (cur) => ({ yt: cur.yt, media: [...(cur.media || []), meta].slice(-MEDIA_MAX) }));
      }
      toast(`${chosen.length} fotoğraf eklendi`);
      setRows([]);
      onClose();
    } catch (x) {
      toast(/storage\//.test(x?.code || "") ? "Yüklenemedi: Firebase Storage açık değil" : x?.message || "Eklenemedi");
    } finally {
      setBusy("");
    }
  };

  return createPortal(
    <div role="dialog" aria-label="Afişten fotoğraf" className="fixed inset-0 z-[46] flex flex-col bg-bg">
      <div className="mx-auto flex h-14 w-full max-w-[30rem] items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <button type="button" onClick={close} data-press className="btn btn-text btn-sm -ml-1 text-acc">
          Vazgeç
        </button>
        <b className="text-[1.0625rem] font-semibold">Afişten fotoğraf</b>
        <span className="w-16" />
      </div>
      <div className="mx-auto min-h-0 w-full max-w-[30rem] flex-1 overflow-y-auto px-4 pb-4">
        {!rows.length ? (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => ref.current?.click()}
            className="mt-4 flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-line bg-card text-[1rem] font-semibold text-acc"
          >
            <span className="grid size-16 place-items-center rounded-full bg-acc/10">
              {busy ? <span className="size-7 animate-spin rounded-full border-[3px] border-acc/25 border-t-acc" /> : <Icon name="plus" className="size-8" />}
            </span>
            {busy || "Afişi seç"}
          </button>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {rows.map((x, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.src} alt="" className="size-20 shrink-0 rounded-xl bg-card object-cover" />
                <span className="min-w-0 flex-1">
                  <small className="block truncate text-[0.8125rem] text-mut">{x.name}</small>
                  <select
                    value={x.to}
                    aria-label={`${x.name} hangi harekete`}
                    onChange={(e) => setRows((o) => o.map((y, k) => (k === i ? { ...y, to: e.target.value } : y)))}
                    className={`mt-1 h-11 w-full min-w-0 rounded-xl bg-card px-2.5 text-[0.9375rem] font-semibold ring-1 ring-line ${x.to ? "" : "text-mut"}`}
                  >
                    <option value="">Ekleme</option>
                    {all.map((y) => (
                      <option key={y.key} value={y.key}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </span>
              </li>
            ))}
          </ul>
        )}
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>
      {rows.length > 0 && (
        <div className="mx-auto w-full max-w-[30rem] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <button type="button" disabled={!chosen.length || !!busy} onClick={save} data-press className="btn btn-primary h-14 w-full">
            {busy || (chosen.length ? `${chosen.length} fotoğrafı ekle` : "Hareket seç")}
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
