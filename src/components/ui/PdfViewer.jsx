"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";

// Uygulama içi PDF görüntüleyici (tam ekran). Dosya yeni sekmede açılmaz: iPhone'da ana ekrana eklenen uygulama,
// dosya internetten/cihazdan geldikten sonra açılan yeni sekmeyi engelliyordu (dokunuştan sonra beklendiği için),
// talimat hiç açılmıyordu. Sayfalar pdf.js ile çizilir (public/pdfjs, uygulamayla birlikte sunulur; internet gerekmez).
// pdf.js yüklenemezse dosya çerçevede gösterilir. Paylaş düğmesi dosya hazır olunca çalışır (dokunuş taze).
const PDFJS = "/pdfjs/pdf.min.js";
let loading = null;
function loadPdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  loading ||= new Promise((ok, fail) => {
    const s = document.createElement("script");
    s.src = PDFJS;
    s.async = true;
    s.onload = () => {
      const lib = window.pdfjsLib;
      if (!lib) return fail(new Error("pdfjs"));
      lib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
      ok(lib);
    };
    s.onerror = () => {
      loading = null;
      s.remove();
      fail(new Error("pdfjs"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

// title: başlık; load: () => Promise<File>; onClose
export function PdfViewer({ title, load, onClose }) {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState(null); // [{ w, h }] ilk ölçüler
  const [err, setErr] = useState("");
  const [frame, setFrame] = useState(""); // pdf.js yoksa çerçevede gösterilecek adres
  const [zoom, setZoom] = useState(1);
  const doc = useRef(null);
  const box = useRef(null);

  useEffect(() => {
    let off = false;
    let url = "";
    (async () => {
      try {
        const f = await load();
        if (off) return;
        setFile(f);
        try {
          const lib = await loadPdfjs();
          const pdf = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()), standardFontDataUrl: "/pdfjs/standard_fonts/" }).promise;
          if (off) return pdf.destroy();
          doc.current = pdf;
          const sizes = [];
          for (let i = 1; i <= pdf.numPages; i++) {
            const p = await pdf.getPage(i);
            const v = p.getViewport({ scale: 1 });
            sizes.push({ w: v.width, h: v.height });
          }
          if (!off) setPages(sizes);
        } catch {
          url = URL.createObjectURL(f);
          if (!off) setFrame(url);
        }
      } catch (e) {
        if (!off) setErr(e?.message || "Dosya açılamadı");
      }
    })();
    return () => {
      off = true;
      doc.current?.destroy?.();
      doc.current = null;
      if (url) URL.revokeObjectURL(url);
    };
  }, [load]);

  // Arka plandaki sayfa kaymasın; geri tuşu yerine kapat
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", key);
    };
  }, [onClose]);

  const share = async () => {
    if (!file) return;
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: file.name });
      } catch {}
      return;
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-bg" role="dialog" aria-modal="true" aria-label={title}>
      <header className="flex shrink-0 items-center gap-1 border-b border-line bg-card px-1.5 pb-1.5 pt-[calc(.375rem+env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label="Kapat" className="grid size-11 place-items-center rounded-full text-fg active:bg-bg">
          <Icon name="x" className="size-5" />
        </button>
        <p className="min-w-0 flex-1 truncate text-center text-[0.9375rem] font-semibold">{title}</p>
        {pages && (
          <button type="button" onClick={() => setZoom((z) => (z >= 2 ? 1 : z + 0.5))} aria-label="Büyüt" className="grid h-11 min-w-11 place-items-center rounded-full px-2 text-[0.8125rem] font-semibold tabular-nums text-acc active:bg-bg">
            {zoom === 1 ? "Büyüt" : `%${zoom * 100}`}
          </button>
        )}
        <button type="button" onClick={share} disabled={!file} aria-label="Paylaş" className="grid size-11 place-items-center rounded-full text-acc active:bg-bg disabled:opacity-40">
          <Icon name="up" className="size-5" />
        </button>
      </header>
      <div ref={box} className="min-h-0 flex-1 overflow-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
        {err ? (
          <p className="px-6 py-16 text-center text-[0.9375rem] text-mut">{err}</p>
        ) : frame ? (
          <iframe src={frame} title={title} className="size-full border-0 bg-white" />
        ) : !pages ? (
          <div className="grid place-items-center py-24 text-acc" role="status" aria-label="Açılıyor">
            <span className="loader" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <p className="mt-3 text-[0.8125rem] text-mut">Açılıyor…</p>
          </div>
        ) : (
          <div className="mx-auto space-y-3 px-2 py-3" style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? "60rem" : undefined }}>
            {pages.map((s, i) => (
              <PdfPage key={i} doc={doc} n={i + 1} size={s} root={box} zoom={zoom} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tek sayfa: ekrana yaklaşınca çizilir (uzun talimatta bellek dolmasın), büyütünce yeniden çizilir
function PdfPage({ doc, n, size, root, zoom }) {
  const wrap = useRef(null);
  const canvas = useRef(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { root: root.current, rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root]);

  useEffect(() => {
    if (!near || !doc.current) return;
    let task = null;
    let off = false;
    (async () => {
      const page = await doc.current.getPage(n);
      if (off) return;
      const css = wrap.current?.clientWidth || 360;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.min((css * dpr) / size.w, 2400 / size.w); // çok büyük tuval iPhone'da çizilmez
      const v = page.getViewport({ scale });
      const c = canvas.current;
      if (!c) return;
      c.width = Math.floor(v.width);
      c.height = Math.floor(v.height);
      task = page.render({ canvasContext: c.getContext("2d"), viewport: v });
      await task.promise.catch(() => {});
    })();
    return () => {
      off = true;
      task?.cancel?.();
    };
  }, [near, doc, n, size, zoom]);

  return (
    <div ref={wrap} className="overflow-hidden rounded-md bg-white shadow-[0_1px_3px_rgba(0,0,0,.12)]" style={{ aspectRatio: `${size.w} / ${size.h}` }}>
      <canvas ref={canvas} className="block size-full" aria-label={`Sayfa ${n}`} />
    </div>
  );
}
