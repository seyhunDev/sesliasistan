"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { cleanYt, ytEmbed, ytThumb, ytWatch } from "@/lib/fitness/youtube";
import { linkMedia } from "@/lib/fitness/model";
import { isFileLink } from "@/lib/fitness/pageVideo";
import { authFetch } from "@/lib/authFetch";

const MEDIA_MAX = 3;

// Hareketin YouTube videosu: program düzenlenirken bağlantı yapıştırılır, sporcu antrenmanda izler.
// Sporcu "Videoyu gizle" derse o video bu cihazda bir daha kendiliğinden açılmaz ("Videoyu göster" ile döner).
const OFF = "sa-fit-yt-off";
const offSet = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem(OFF) || "[]"));
  } catch {
    return new Set();
  }
};
function saveOff(set) {
  try {
    localStorage.setItem(OFF, JSON.stringify([...set].slice(-200)));
  } catch {}
}

export function YtPlayer({ yt, className = "", auto = false }) {
  if (!yt?.id) return null;
  return (
    <div className={`aspect-video w-full overflow-hidden rounded-3xl bg-black ${className}`}>
      <iframe
        src={ytEmbed(yt.id, yt.start, auto)}
        title="Hareket videosu"
        className="size-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

// Antrenman ekranı: video açık gelir, gizlenebilir; gizliyse küçük "Videoyu göster" düğmesi
export function YtToggle({ yt, className = "" }) {
  const [off, setOff] = useState(() => (yt?.id ? offSet().has(yt.id) : false));
  if (!yt?.id) return null;
  const set = (v) => {
    const s = offSet();
    if (v) s.add(yt.id);
    else s.delete(yt.id);
    saveOff(s);
    setOff(v);
  };
  if (off) {
    return (
      <button type="button" onClick={() => set(false)} className={`flex h-10 items-center gap-2 rounded-full bg-card px-4 text-[0.9375rem] font-semibold text-acc shadow-sm active:scale-95 ${className}`}>
        <Icon name="video" className="size-4.5" />
        Videoyu göster
      </button>
    );
  }
  return (
    <div className={className}>
      <YtPlayer yt={yt} />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <a href={ytWatch(yt.id, yt.start)} target="_blank" rel="noreferrer" className="text-[0.8125rem] font-semibold text-mut underline-offset-2">
          YouTube&apos;da aç
        </a>
        <button type="button" onClick={() => set(true)} data-press className="btn btn-secondary btn-sm text-mut">
          <Icon name="x" className="size-4" />
          Videoyu gizle
        </button>
      </div>
    </div>
  );
}

// Adım adım antrenman: video oynatılmıyorken küçük kart (resim + ▶), dokununca büyür ve oynar, "Küçült" ile kart olur.
// Ekran kaydırmadan sığsın diye video kendiliğinden açılmaz.
export function YtSmall({ yt, className = "" }) {
  const [play, setPlay] = useState(false);
  if (!yt?.id) return null;
  if (play) {
    return (
      <div className={className}>
        <YtPlayer yt={yt} auto />
        <button type="button" onClick={() => setPlay(false)} data-press className="btn btn-secondary btn-sm mt-1.5 text-mut">
          <Icon name="x" className="size-4" />
          Küçült
        </button>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setPlay(true)} className={`flex w-full items-center gap-3 rounded-2xl bg-card p-2 text-left shadow-sm active:scale-[.99] ${className}`}>
      <span className="relative block h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-black">
        <img src={ytThumb(yt.id)} alt="" className="size-full object-cover" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-7 place-items-center rounded-full bg-black/60 text-white">
            <Icon name="video" className="size-3.5" />
          </span>
        </span>
      </span>
      <span className="text-[0.9375rem] font-semibold text-acc">Videoyu izle</span>
    </button>
  );
}

// Program düzenleme: bağlantı yapıştırılır. YouTube bağlantısı videonun yerine geçer; fotoğraf ya da .mp4 dosyası
// hareketin fotoğraf/videolarına eklenir (en çok 3). Başka bir sitenin hareket sayfası (ör. muscleandstrength.com)
// verilirse sunucu sayfadaki videoyu bulur: YouTube ise videonun yerine, sitenin kendi videosuysa fotoğraf/videolara.
// big: tam ekran hareket sayfası (büyük alan, "Yapıştır" düğmesi panodaki bağlantıyı ekler)
export function YtEdit({ yt, onChange, media = [], onMedia, className = "", big = false }) {
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const full = (media || []).filter((m) => !m.stock).length >= MEDIA_MAX;
  const done = () => {
    setErr("");
    setText("");
  };
  const addMedia = (m) => {
    if (full || !onMedia) return setErr(`En çok ${MEDIA_MAX} fotoğraf ya da video`);
    done();
    onMedia([...(media || []).filter((x) => !x.stock), m]);
  };
  const fromPage = async (v) => {
    setBusy(true);
    setErr("");
    try {
      const res = await authFetch("/api/page-video", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: v.trim() }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(d.error || "Sayfadaki video bulunamadı");
      const y = cleanYt(d.yt);
      if (y) {
        done();
        return onChange(y);
      }
      const m = linkMedia(d.video);
      if (!m) return setErr("Sayfadaki video bulunamadı");
      addMedia({ ...m, kind: "video" });
    } catch {
      setErr("Sayfaya ulaşılamadı");
    } finally {
      setBusy(false);
    }
  };
  const add = (v) => {
    if (busy) return;
    if (!v.trim()) return setErr("");
    const y = cleanYt(v);
    if (y) {
      done();
      return onChange(y);
    }
    const m = linkMedia(v);
    if (!m) return setErr("Bağlantı https:// ile başlamalı");
    if (!isFileLink(v)) return fromPage(v);
    addMedia(m);
  };
  // Panodaki bağlantıyı okur ve ekler (izin verilmezse kutuya yapıştırılır)
  const paste = async () => {
    try {
      const v = (await navigator.clipboard.readText()).trim();
      if (!v) return setErr("Panoda bağlantı yok");
      setText(v);
      add(v);
    } catch {
      setErr("Pano okunamadı; kutuya basılı tutup yapıştır");
    }
  };
  return (
    <div className={className}>
      {yt?.id && (
        <div className="mb-2 flex items-center gap-3 rounded-2xl bg-bg p-2">
          <a href={ytWatch(yt.id, yt.start)} target="_blank" rel="noreferrer" className="relative block h-14 w-24 shrink-0 overflow-hidden rounded-xl bg-black">
            <img src={ytThumb(yt.id)} alt="" className="size-full object-cover" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-7 place-items-center rounded-full bg-black/60 text-white">
                <Icon name="video" className="size-3.5" />
              </span>
            </span>
          </a>
          <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold">
            YouTube videosu
            <small className="block font-normal text-mut">Sporcu antrenmanda izler</small>
          </span>
          <button type="button" onClick={() => onChange(null)} data-press className="btn btn-danger btn-sm">
            Kaldır
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="url"
          inputMode="url"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setErr("");
          }}
          onPaste={(e) => {
            const v = e.clipboardData?.getData("text") || "";
            if (cleanYt(v) || linkMedia(v)) {
              e.preventDefault();
              add(v);
            }
          }}
          onKeyDown={(e) => e.key === "Enter" && add(text)}
          placeholder={yt?.id ? "Fotoğraf, video ya da sayfa bağlantısı" : "YouTube, video ya da hareket sayfası bağlantısı"}
          className={`min-w-0 flex-1 bg-bg px-3 outline-none ${big ? "h-12 rounded-xl text-[1rem]" : "h-9 rounded-full text-[0.8125rem]"}`}
        />
        {!big && text.trim() && (
          <button type="button" disabled={busy} onClick={() => add(text)} data-press className="btn btn-primary btn-sm">
            {busy ? "Aranıyor…" : "Ekle"}
          </button>
        )}
      </div>
      {big && (
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={busy} onClick={paste} data-press className="btn btn-secondary flex-1">
            Yapıştır
          </button>
          <button type="button" disabled={busy || !text.trim()} onClick={() => add(text)} data-press className="btn btn-primary flex-1">
            {busy ? "Aranıyor…" : "Ekle"}
          </button>
        </div>
      )}
      {busy && <p className="mt-1 text-[0.75rem] text-mut">Sayfadaki video aranıyor…</p>}
      {err && <p className="mt-1 text-[0.75rem] font-semibold text-rec">{err}</p>}
    </div>
  );
}
