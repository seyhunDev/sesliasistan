"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { MEDIA_MAX, dropMedia, loadMedia, prepMedia, saveMedia } from "./fitMedia";

// Hareketin fotoğraf ve videoları: küçük kareler (fotoğraf ya da ▶), dokununca tam ekran (düzenleme ve kütüphane; antrenmanda MediaShow büyük gösterir).
// edit: ana hesap programı düzenlerken "Fotoğraf" ve "Video" düğmeleri (galeri ya da kamera; telefon sorar), × ile çıkarılır.
// Dosya seçilir seçilmez yüklenir; künye onChange ile harekete yazılır, program kaydedilince plana gider.
export function useBlobUrl(orgId, m) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (!m?.id || (!orgId && !m.url)) return undefined;
    let u = "";
    let live = true;
    loadMedia(orgId, m)
      .then(({ src, blob }) => {
        if (!live) return;
        if (blob) u = URL.createObjectURL(blob);
        setUrl(u || src);
      })
      .catch(() => live && setErr(true));
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [orgId, m?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const fail = () => setErr(true);
  return { url, err, fail };
}

// big: kutuyu doldurur (tam ekran hareket sayfası)
export function Thumb({ orgId, m, onOpen, onDrop, big = false }) {
  const { url, err, fail } = useBlobUrl(orgId, m);
  const sz = big ? "size-full" : "size-20";
  return (
    <span className={`relative ${sz} shrink-0`}>
      <button type="button" onClick={() => url && onOpen(m)} aria-label={m.kind === "video" ? "Videoyu aç" : "Fotoğrafı aç"} className={`grid ${sz} place-items-center overflow-hidden rounded-2xl bg-bg`}>
        {err ? (
          <Icon name="alert" className="size-5 text-mut" />
        ) : !url ? (
          <span className="shimmer size-full" />
        ) : m.kind === "video" ? (
          <>
            <video src={`${url}#t=0.1`} muted playsInline preload="metadata" onError={fail} className="size-full object-cover" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid size-8 place-items-center rounded-full bg-black/55 text-white">
                <Icon name="video" className="size-4" />
              </span>
            </span>
          </>
        ) : (
          <img src={url} alt="" onError={fail} className="size-full object-cover" />
        )}
      </button>
      {onDrop && (
        <button type="button" onClick={() => onDrop(m)} aria-label="Çıkar" className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-deep text-white shadow">
          <Icon name="x" className="size-3.5" />
        </button>
      )}
    </span>
  );
}

export function Viewer({ orgId, m, onClose }) {
  const { url } = useBlobUrl(orgId, m);
  return (
    <div role="dialog" aria-label="Hareket" className="fixed inset-0 z-[70] flex flex-col bg-black" onClick={onClose}>
      <div className="flex justify-end p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-11 place-items-center rounded-full bg-white/15 text-white">
          <Icon name="x" className="size-5" />
        </button>
      </div>
      <div className="grid min-h-0 flex-1 place-items-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        {!url ? (
          <span className="text-[0.875rem] text-white/70">Yükleniyor…</span>
        ) : m.kind === "video" ? (
          <video src={url} controls autoPlay loop playsInline muted className="max-h-full max-w-full rounded-xl" />
        ) : (
          <img src={url} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
        )}
      </div>
    </div>
  );
}

// Büyük gösterim (sporcunun hareket ekranı): ilk dosya kenardan kenara, video sessiz ve tekrar ederek oynar
export function Big({ orgId, m, onOpen }) {
  const { url, err, fail } = useBlobUrl(orgId, m);
  if (err) return null;
  return (
    <button type="button" onClick={() => url && onOpen(m)} aria-label={m.kind === "video" ? "Videoyu büyüt" : "Fotoğrafı büyüt"} className="block aspect-[4/3] w-full overflow-hidden rounded-3xl bg-black/5">
      {!url ? (
        <span className="shimmer block size-full" />
      ) : m.kind === "video" ? (
        <video src={url} autoPlay loop muted playsInline onError={fail} className="size-full object-cover" />
      ) : (
        <img src={url} alt="" onError={fail} className="size-full object-cover" />
      )}
    </button>
  );
}

// Antrenman ekranı: hareketin kendi videosu doğrudan, sayfanın içinde (kart ya da büyütme yok).
// Bu cihazda ilk kez görülen video kendiliğinden (sessiz) oynar; sonra oynat düğmesiyle (sa-fit-seen, video kimliği).
const SEEN = "sa-fit-seen";
function seenSet() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN) || "[]"));
  } catch {
    return new Set();
  }
}
function markSeen(id) {
  try {
    const s = seenSet();
    if (s.has(id)) return;
    s.add(id);
    localStorage.setItem(SEEN, JSON.stringify([...s].slice(-300)));
  } catch {}
}

// Antrenman ekranı: hareketin bütün fotoğraf ve videoları büyük, ortada, aynı boyda (en çok 18rem boy, oval köşe).
// Fotoğrafa dokununca tam ekran açılır.
export function MediaShow({ media = [], className = "" }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(null);
  const list = (media || []).filter((x) => !x.stock && (x.kind === "video" || x.kind === "photo"));
  if (!list.length) return null;
  return (
    <div className={`space-y-2 ${className}`}>
      {list.map((m) => (m.kind === "video" ? <OneVideo key={m.id} orgId={profile?.orgId} m={m} /> : <OnePhoto key={m.id} orgId={profile?.orgId} m={m} onOpen={setOpen} />))}
      {open && <Viewer orgId={profile?.orgId} m={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

// Kutu dosyanın kendi oranını alır (siyah boşluk kalmaz); dikey olan en çok 18rem boyda, ortada
const boxStyle = (ratio) => ({ aspectRatio: ratio, maxWidth: `calc(18rem * ${ratio})` });
const BOX = "mx-auto block max-h-[18rem] w-full overflow-hidden rounded-3xl";

function OnePhoto({ orgId, m, onOpen }) {
  const { url, err, fail } = useBlobUrl(orgId, m);
  const [ratio, setRatio] = useState(4 / 3);
  const fit = (e) => {
    const i = e.currentTarget;
    if (i.naturalWidth && i.naturalHeight) setRatio(i.naturalWidth / i.naturalHeight);
  };
  if (err) return null;
  if (!url) return <span className="shimmer block aspect-video w-full rounded-3xl" />;
  return (
    <button type="button" onClick={() => onOpen(m)} aria-label="Fotoğrafı büyüt" style={boxStyle(ratio)} className={`${BOX} bg-bg`}>
      <img src={url} alt="" onLoad={fit} onError={fail} className="size-full object-cover" />
    </button>
  );
}

function OneVideo({ orgId, m }) {
  const { url, err, fail } = useBlobUrl(orgId, m);
  // İlk görülüş açılışta bir kez okunur (aynı video için ekran açık kaldıkça değişmez)
  const [first, setFirst] = useState({ id: "", on: false });
  if (m?.id && first.id !== m.id) setFirst({ id: m.id, on: !seenSet().has(m.id) });
  const auto = first.id === m?.id && first.on;
  const [ratio, setRatio] = useState(16 / 9);
  const fit = (e) => {
    const v = e.currentTarget;
    if (v.videoWidth && v.videoHeight) setRatio(v.videoWidth / v.videoHeight);
  };
  useEffect(() => {
    if (m?.id) markSeen(m.id);
  }, [m?.id]);
  // Açılamayan video sessizce kaybolmaz: sporcu ne olduğunu görür, adres varsa telefonun oynatıcısında açar
  if (err) {
    const href = url || m.url;
    return (
      <div className="flex w-full items-center gap-3 rounded-2xl bg-card p-3 shadow-sm">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-bg text-mut">
          <Icon name="video" className="size-5" />
        </span>
        <span className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-mut">
          <b className="block text-[0.9375rem] text-fg">Video burada oynatılamadı</b>
          {/webm/i.test(m.type || "") ? "Bu video biçimi (WebM) iPhone'da açılmıyor." : /quicktime|mov/i.test(m.type || "") ? "Bu video biçimi (MOV) bu telefonda açılmıyor." : "Bağlantı ya da biçim sorunu olabilir."}
        </span>
        {href && (
          <a href={href} target="_blank" rel="noreferrer" className="shrink-0 rounded-full bg-acc/10 px-3 py-1.5 text-[0.8125rem] font-semibold text-acc">
            Aç
          </a>
        )}
      </div>
    );
  }
  if (!url) return <span className="shimmer block aspect-video w-full rounded-3xl" />;
  return (
    <video
      key={m.id}
      src={auto ? url : `${url}#t=0.1`}
      controls
      playsInline
      loop
      autoPlay={auto}
      muted={auto}
      preload="metadata"
      onError={fail}
      onLoadedMetadata={fit}
      style={boxStyle(ratio)}
      className={`${BOX} bg-black object-cover`}
    />
  );
}

export function ExerciseMedia({ media = [], ex, edit, onChange, className = "", big = false }) {
  const { profile } = useAuth();
  const orgId = profile?.orgId;
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const added = useRef(new Set());
  const list = (media || []).filter((m) => !m.stock);
  if (!edit && !list.length) return null;

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !orgId) return;
    setErr("");
    setBusy("Hazırlanıyor…");
    try {
      const m = await prepMedia(file, (p) => setBusy(`Video küçültülüyor %${Math.round(p * 100)}`));
      setBusy("Yükleniyor…");
      const meta = await saveMedia(orgId, m, (p) => setBusy(`Yükleniyor %${Math.round(p * 100)}`));
      added.current.add(meta.id);
      onChange?.([...list, meta].slice(0, MEDIA_MAX));
    } catch (x) {
      setErr(/storage\/(unauthorized|unknown|retry|bucket|project)/.test(x?.code || "") ? "Yüklenemedi: Firebase Storage açık değil ya da kuralı yayınlanmadı." : x?.message || "Eklenemedi");
    } finally {
      setBusy("");
    }
  };
  // Bu açılışta eklenen dosya hemen silinir; önceden kaydedilmiş olan eski planlarda da kullanıldığı için durur
  const drop = (m) => {
    onChange?.(list.filter((x) => x.id !== m.id));
    if (added.current.has(m.id)) dropMedia(orgId, m);
  };

  if (big && !edit) {
    const [first, ...more] = list;
    return (
      <div className={className}>
        <Big orgId={orgId} m={first} onOpen={setOpen} />
        {more.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 pt-2">
            {more.map((m) => (
              <Thumb key={m.id} orgId={orgId} m={m} onOpen={setOpen} />
            ))}
          </div>
        )}
        {open && <Viewer orgId={orgId} m={open} onClose={() => setOpen(null)} />}
      </div>
    );
  }

  return (
    <div className={className}>
      {(list.length > 0 || busy) && (
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1.5">
          {list.map((m) => (
            <Thumb key={m.id} orgId={orgId} m={m} onOpen={setOpen} onDrop={edit ? drop : null} />
          ))}
          {busy && (
            <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-bg px-1 text-center text-[0.6875rem] font-semibold leading-tight text-mut">{busy}</span>
          )}
        </div>
      )}
      {edit && list.length < MEDIA_MAX && !busy && (
        <div className="mt-1.5 flex gap-2">
          <button type="button" onClick={() => photoRef.current?.click()} data-press className="btn btn-secondary btn-sm">
            <Icon name="camera" className="size-4 text-acc" />
            Fotoğraf ekle
          </button>
          <button type="button" onClick={() => videoRef.current?.click()} data-press className="btn btn-secondary btn-sm">
            <Icon name="video" className="size-4 text-acc" />
            Video ekle
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={pick} />
        </div>
      )}
      {err && <p className="mt-1 text-[0.75rem] font-semibold text-rec">{err}</p>}
      {open && <Viewer orgId={orgId} m={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
