"use client";

import { useRef, useState } from "react";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { animShareText } from "@/lib/fitness/animPrompt";
import { photoFile, prepAnim, saveMedia } from "./fitMedia";

// Hareketler › hareket (Seyhun 2026-11-26): açıklama elle düzenlenir; animasyon iki yoldan gelir: "Yapay zekayla oluştur"
// (Gemini video, /api/fitness-anim, ücretli) ya da dışarıda yaptırılıp "Animasyon yükle" (video ya da GIF). Animasyon
// hareketin dosyalarında { a: true } ile durur, antrenmanda fotoğraftan önce oynar (forSex). "Kopyala / Paylaş":
// hareketin adı, açıklaması, yapay zeka talimatı ve fotoğrafı, başka bir yapay zekaya vermek için.

// Açıklama: göster, "Düzenle" ile yaz; boş kaydedilirse programlardaki anlatım geri gelir
export function HowEdit({ how, own, onSave }) {
  const toast = useToast();
  const [text, setText] = useState(null);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await onSave(text.trim());
      setText(null);
      toast("Açıklama kaydedildi");
    } catch {
      toast("Kaydedilemedi, tekrar dene");
    } finally {
      setBusy(false);
    }
  };
  if (text !== null)
    return (
      <section className="mt-2 rounded-2xl border border-line bg-card p-3">
        <textarea value={text} onChange={(x) => setText(x.target.value)} autoFocus maxLength={500} rows={5} placeholder="Hareket nasıl yapılır" className="w-full resize-none rounded-xl bg-bg px-3 py-2 text-[0.9375rem] leading-snug outline-none" />
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => setText(null)} data-press className="btn btn-secondary flex-1">
            Vazgeç
          </button>
          <button type="button" disabled={busy} onClick={save} data-press className="btn btn-primary flex-1">
            {busy ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </section>
    );
  return (
    <button type="button" onClick={() => setText(how || "")} className="mt-2 block w-full rounded-xl bg-card px-3 py-2 text-left ring-1 ring-line">
      <span className="flex items-center justify-between text-[0.75rem] font-semibold text-mut">
        {own ? "Açıklama (elle yazıldı)" : "Açıklama"}
        <span className="text-acc">Düzenle</span>
      </span>
      <span className={`mt-0.5 block text-[0.8125rem] leading-snug ${how ? "" : "text-mut"}`}>{how || "Açıklama yok"}</span>
    </button>
  );
}

// Sıradaki fotoğraf: animasyon ve video değil; kız/işaretsiz önce
const photoOf = (media) => {
  const p = (media || []).filter((m) => !m.a && m.kind === "photo");
  return p.find((m) => m.g !== "m") || p[0] || null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function AnimTools({ e, how, media, full, orgId, put }) {
  const toast = useToast();
  const confirmAsk = useConfirm();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState("");
  const anim = (media || []).find((m) => m.a);
  const photo = photoOf(media);
  const info = { name: e.name, how };
  // Eski animasyonun yerine yenisi (dosyası silinmez, "Hareketsiz kalan dosyalar"da durur)
  const addAnim = (meta) => put((now) => ({ yt: now.yt, media: [{ ...meta, a: true }, ...(now.media || []).filter((m) => !m.a)] }));
  const roomy = () => {
    if (full && !anim) {
      toast("Yer yok: önce bir fotoğrafı kaldır");
      return false;
    }
    return true;
  };

  const make = async () => {
    if (!photo) return toast("Önce bir fotoğraf ekle");
    if (!roomy()) return;
    if (!(await confirmAsk({ title: "Animasyon oluşturulsun mu?", text: "Gemini fotoğraftaki kişiyle kısa bir video yapar. Ücretlidir; birkaç dakika sürebilir.", yes: "Oluştur", danger: false }))) return;
    setBusy("Hazırlanıyor…");
    try {
      const { base64 } = await photoFile(orgId, photo);
      const r = await authFetch("/api/fitness-anim", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orgId, name: e.name, how, ref: base64 }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.id) throw new Error(j.error || "Animasyon başlatılamadı");
      setBusy("Animasyon yapılıyor…");
      for (let i = 0; i < 60; i++) {
        await sleep(6000);
        const g = await authFetch(`/api/fitness-anim?orgId=${encodeURIComponent(orgId)}&id=${encodeURIComponent(j.id)}`);
        const v = await g.json().catch(() => ({}));
        if (!g.ok) throw new Error(v.error || "Animasyon alınamadı");
        if (v.done && v.meta) {
          await addAnim(v.meta);
          toast("Animasyon eklendi");
          return;
        }
      }
      throw new Error("Animasyon çok uzun sürdü, sonra tekrar dene");
    } catch (x) {
      toast(x instanceof TypeError ? "Bağlantı kurulamadı, tekrar dene" : x.message || "Animasyon yapılamadı");
    } finally {
      setBusy("");
    }
  };

  const upload = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file || !orgId || !roomy()) return;
    setBusy("Yükleniyor…");
    try {
      const m = await prepAnim(file, (p) => setBusy(`Küçültülüyor %${Math.round(p * 100)}`));
      const meta = await saveMedia(orgId, m, (p) => setBusy(`Yükleniyor %${Math.round(p * 100)}`));
      await addAnim(meta);
      toast("Animasyon eklendi");
    } catch (x) {
      toast(x.message || "Yüklenemedi");
    } finally {
      setBusy("");
    }
  };

  // Yazı ve fotoğraf birlikte panoya; tarayıcı resmi almazsa yalnız yazı
  const copy = async () => {
    const text = animShareText(info);
    try {
      if (!photo || typeof ClipboardItem === "undefined") throw new Error("no-image");
      const png = photoFile(orgId, photo, 1024).then(async ({ file }) => {
        const bmp = await createImageBitmap(file);
        const c = document.createElement("canvas");
        c.width = bmp.width;
        c.height = bmp.height;
        c.getContext("2d").drawImage(bmp, 0, 0);
        return await new Promise((res) => c.toBlob(res, "image/png"));
      });
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": new Blob([text], { type: "text/plain" }), "image/png": png })]);
      toast("Ad, açıklama ve fotoğraf kopyalandı");
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        toast(photo ? "Yazı kopyalandı; fotoğraf için Paylaş" : "Yazı kopyalandı");
      } catch {
        toast("Kopyalanamadı");
      }
    }
  };
  const share = async () => {
    const text = animShareText(info);
    try {
      const files = photo ? [new File([(await photoFile(orgId, photo, 1600)).file], `${e.name}.jpg`, { type: "image/jpeg" })] : [];
      if (!navigator.share) throw new Error("no-share");
      await navigator.share(files.length && navigator.canShare?.({ files }) ? { files, text } : { text });
    } catch (x) {
      if (x?.name !== "AbortError") copy();
    }
  };

  return (
    <section className="mt-4">
      <h2 className="mb-1.5 flex items-center justify-between text-[0.9375rem] font-semibold">
        Animasyon
        <span className="text-[0.8125rem] font-normal text-mut">{busy || (anim ? "Var, antrenmanda önce o oynar" : "Yok")}</span>
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!!busy} onClick={make} data-press className="btn btn-secondary">
          {anim ? "Yeniden oluştur" : "Yapay zekayla oluştur"}
        </button>
        <button type="button" disabled={!!busy} onClick={() => fileRef.current?.click()} data-press className="btn btn-secondary">
          Animasyon yükle
        </button>
        <button type="button" onClick={copy} data-press className="btn btn-secondary">
          Kopyala
        </button>
        <button type="button" onClick={share} data-press className="btn btn-secondary">
          Paylaş
        </button>
      </div>
      <input ref={fileRef} type="file" accept="video/*,image/gif" className="hidden" onChange={upload} />
    </section>
  );
}
