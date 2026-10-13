"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { stockPhotos } from "@/lib/fitness/exerciseGuide";
import { MEDIA_MAX, dropMedia, loadMedia, prepMedia, saveMedia } from "./fitMedia";

// Hareketin fotoğraf ve videoları: küçük kareler (fotoğraf ya da ▶), dokununca tam ekran.
// edit: ana hesap programı düzenlerken "Fotoğraf" ve "Video" düğmeleri (galeri ya da kamera; telefon sorar), × ile çıkarılır.
// Dosya seçilir seçilmez yüklenir; künye onChange ile harekete yazılır, program kaydedilince plana gider.
function useBlobUrl(orgId, m) {
  const [url, setUrl] = useState("");
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (m?.stock) return undefined;
    if (!m?.id || !orgId) return undefined;
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
  if (m?.stock) return { url: m.url, err: false, fail };
  return { url, err, fail };
}

function Thumb({ orgId, m, onOpen, onDrop }) {
  const { url, err, fail } = useBlobUrl(orgId, m);
  return (
    <span className="relative size-20 shrink-0">
      <button type="button" onClick={() => url && onOpen(m)} aria-label={m.kind === "video" ? "Videoyu aç" : "Fotoğrafı aç"} className="grid size-20 place-items-center overflow-hidden rounded-2xl bg-bg">
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
      {m.stock && <span className="pointer-events-none absolute bottom-1 left-1 rounded-full bg-black/55 px-1.5 text-[0.625rem] font-semibold text-white">Örnek</span>}
      {onDrop && !m.stock && (
        <button type="button" onClick={() => onDrop(m)} aria-label="Çıkar" className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-deep text-white shadow">
          <Icon name="x" className="size-3.5" />
        </button>
      )}
    </span>
  );
}

function Viewer({ orgId, m, onClose }) {
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

// Büyük gösterim (sporcunun "Nasıl yapılır" ekranı): ilk dosya kenardan kenara, video sessiz ve tekrar ederek oynar
// Hazır örnek: başlangıç ve bitiş kareleri sırayla, hareket gibi görünür
function StockBig({ shots, onOpen }) {
  const [k, setK] = useState(0);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (shots.length < 2) return undefined;
    const t = setInterval(() => setK((x) => (x + 1) % shots.length), 1200);
    return () => clearInterval(t);
  }, [shots.length]);
  if (bad) return null;
  return (
    <button type="button" onClick={() => onOpen(shots[k])} aria-label="Fotoğrafı büyüt" className="relative block aspect-[4/3] w-full overflow-hidden rounded-3xl bg-white">
      {shots.map((m, n) => (
        <img key={m.id} src={m.url} alt="" onError={() => setBad(true)} className={`absolute inset-0 size-full object-contain transition-opacity duration-500 ${n === k ? "opacity-100" : "opacity-0"}`} />
      ))}
      <span className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[0.6875rem] font-semibold text-white">Örnek fotoğraf</span>
    </button>
  );
}

function Big({ orgId, m, onOpen }) {
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

// Hareketin hazır örnek fotoğrafları (kendi fotoğrafı/videosu eklenene kadar gösterilir)
export function stockMedia(ex) {
  return stockPhotos(ex).map((url, n) => ({ id: `stock-${ex}-${n}`, kind: "photo", url, stock: true }));
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
  const list = media || [];
  const stock = list.length ? [] : stockMedia(ex);
  if (!edit && !list.length && !stock.length) return null;

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

  if (big && !edit && stock.length) {
    return (
      <div className={className}>
        <StockBig shots={stock} onOpen={setOpen} />
        {open && <Viewer orgId={orgId} m={open} onClose={() => setOpen(null)} />}
      </div>
    );
  }

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
      {(list.length > 0 || busy || stock.length > 0) && (
        <div className="flex gap-2 overflow-x-auto pb-1 pt-1.5">
          {(busy ? list : list.length ? list : stock.slice(0, 1)).map((m) => (
            <Thumb key={m.id} orgId={orgId} m={m} onOpen={setOpen} onDrop={edit ? drop : null} />
          ))}
          {busy && (
            <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-bg px-1 text-center text-[0.6875rem] font-semibold leading-tight text-mut">{busy}</span>
          )}
        </div>
      )}
      {edit && list.length < MEDIA_MAX && !busy && (
        <div className="mt-1.5 flex gap-2">
          <button type="button" onClick={() => photoRef.current?.click()} className="flex h-9 items-center gap-1.5 rounded-full bg-bg px-3 text-[0.8125rem] font-semibold">
            <Icon name="camera" className="size-4 text-acc" />
            Fotoğraf ekle
          </button>
          <button type="button" onClick={() => videoRef.current?.click()} className="flex h-9 items-center gap-1.5 rounded-full bg-bg px-3 text-[0.8125rem] font-semibold">
            <Icon name="video" className="size-4 text-acc" />
            Video ekle
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={pick} />
        </div>
      )}
      {edit && stock.length > 0 && !busy && <p className="mt-1 text-[0.75rem] text-mut">Örnek fotoğraf. Kendi fotoğrafını ya da videonu ekleyince onun yerine geçer.</p>}
      {err && <p className="mt-1 text-[0.75rem] font-semibold text-rec">{err}</p>}
      {open && <Viewer orgId={orgId} m={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
