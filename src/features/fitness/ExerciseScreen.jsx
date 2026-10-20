"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { exById } from "@/lib/fitness/exercises";
import { ytThumb } from "@/lib/fitness/youtube";
import { Big, Thumb, Viewer } from "./ExerciseMedia";
import { MEDIA_MAX, prepMedia, saveMedia } from "./fitMedia";
import { YtEdit } from "./YtVideo";

// Hareketlerim'de bir hareket: tam ekran. Üstte büyük önizleme, altında 3 kutu (dosya, yükleniyor %, yüklenemedi, boş),
// Fotoğraf · Video · Bağlantı. Her dosya yüklenir yüklenmez tek başına kaydedilir (güncel kayda eklenir, arada eklenen
// ezilmez); sayfadan çıkılsa da yükleme sürer ve kaydedilir. "Kaldır" yalnız hareketten çıkarır, dosya silinmez.
// put(fn): fn(güncel kayıt) => { yt, media } kaydeder (useFitLib.setMedia).
let seq = 0;
export function ExerciseScreen({ e, uses = 0, put, onBack, children }) {
  const { profile } = useAuth();
  const orgId = profile?.orgId;
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [cur, setCur] = useState(0);
  const [open, setOpen] = useState(null);
  const [link, setLink] = useState(false);
  const photoRef = useRef(null);
  const videoRef = useRef(null);
  const media = (e.media || []).filter((m) => !m.stock);
  const free = MEDIA_MAX - media.length - jobs.filter((j) => !j.err).length;
  const shown = media[Math.min(cur, media.length - 1)];
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const job = (id, v) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...v } : j)));
  const run = async (id, file) => {
    job(id, { err: "", pct: 0, step: "Hazırlanıyor" });
    try {
      const m = await prepMedia(file, (p) => job(id, { pct: p, step: "Küçültülüyor" }));
      job(id, { pct: 0, step: "Yükleniyor" });
      const meta = await saveMedia(orgId, m, (p) => job(id, { pct: p }));
      await put((now) => ({ yt: now.yt, media: [...(now.media || []), meta] }));
      setJobs((js) => js.filter((j) => j.id !== id));
    } catch (x) {
      const err = /storage\/(unauthorized|unknown|retry|bucket|project)/.test(x?.code || "") ? "Storage kapalı" : x?.message || "Yüklenemedi";
      job(id, { err });
      toast(`Yüklenemedi: ${err}`);
    }
  };
  const pick = (ev) => {
    const files = [...(ev.target.files || [])].slice(0, Math.max(0, free));
    ev.target.value = "";
    if (!files.length || !orgId) return;
    const add = files.map((file) => ({ id: `j${++seq}`, file, kind: /^video\//.test(file.type) ? "video" : "photo", pct: 0, step: "Hazırlanıyor", err: "" }));
    setJobs((js) => [...js, ...add]);
    add.forEach((j) => run(j.id, j.file));
  };
  const remove = async (m) => {
    if (!confirm(m.kind === "video" ? "Video bu hareketten kaldırılsın mı?" : "Fotoğraf bu hareketten kaldırılsın mı?")) return;
    try {
      await put((now) => ({ yt: now.yt, media: (now.media || []).filter((x) => x.id !== m.id) }));
      setCur(0);
    } catch {
      toast("Kaldırılamadı, tekrar dene");
    }
  };
  const tap = (k) => (k === "Fotoğraf" ? photoRef.current?.click() : k === "Video" ? videoRef.current?.click() : setLink(!link));
  const save = (fn) => put(fn).catch(() => toast("Kaydedilemedi, tekrar dene"));

  const slots = [
    ...media.map((m, i) => ({ k: m.id, m, i })),
    ...jobs.map((j) => ({ k: j.id, j })),
  ].slice(0, MEDIA_MAX);
  while (slots.length < MEDIA_MAX) slots.push({ k: `e${slots.length}` });

  return createPortal(
    <div role="dialog" aria-label={e.name} className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-bg">
      <div className="mx-auto max-w-[30rem] px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex h-11 items-center justify-between">
          <button type="button" onClick={onBack} data-press className="btn btn-text btn-sm -ml-1 text-acc">
            <Icon name="chev" className="size-4 rotate-180" />
            Hareketler
          </button>
          <span className="text-[0.875rem] tabular-nums text-mut">No {e.no}</span>
        </div>
        <h1 className="mt-2 text-[1.625rem] font-semibold leading-tight">{e.name}</h1>
        <p className="mt-0.5 text-[0.8125rem] text-mut">{[uses ? `${uses} programda` : "", "sporcular da görür"].filter(Boolean).join(" · ")}</p>
        {exById(e.ex)?.how && <p className="mt-2 rounded-xl bg-card px-3 py-2 text-[0.8125rem] leading-snug text-mut ring-1 ring-line">{exById(e.ex).how}</p>}

        <div className="relative mt-3">
          {shown ? (
            <>
              <Big key={shown.id} orgId={orgId} m={shown} onOpen={setOpen} />
              <button type="button" onClick={() => remove(shown)} className="absolute right-2.5 top-2.5 h-9 rounded-full bg-black/50 px-3.5 text-[0.8125rem] font-semibold text-white">
                Kaldır
              </button>
            </>
          ) : e.yt?.id ? (
            <img src={ytThumb(e.yt.id)} alt="" className="block aspect-[4/3] w-full rounded-3xl object-cover" />
          ) : (
            <div className="grid aspect-[4/3] w-full place-items-center rounded-3xl border-[1.5px] border-dashed border-line text-mut">
              <Icon name="camera" className="size-8" />
            </div>
          )}
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {slots.map((s) =>
            s.m ? (
              <span key={s.k} className={`grid aspect-square place-items-center rounded-[1.15rem] ${shown?.id === s.m.id ? "bg-acc" : ""} p-[3px]`}>
                <Thumb orgId={orgId} m={s.m} onOpen={() => setCur(s.i)} big />
              </span>
            ) : s.j ? (
              s.j.err ? (
                <button key={s.k} type="button" onClick={() => run(s.j.id, s.j.file)} className="grid aspect-square place-items-center rounded-[1.15rem] bg-rec/10 p-2 text-center text-[0.8125rem] font-semibold leading-tight text-rec">
                  <span>
                    Yüklenemedi
                    <u className="mt-2 block">Tekrar dene</u>
                  </span>
                </button>
              ) : (
                <span key={s.k} className="grid aspect-square place-items-center rounded-[1.15rem] bg-deep text-white">
                  <span className="grid size-14 place-items-center rounded-full" style={{ background: `conic-gradient(var(--acc) ${Math.round(s.j.pct * 100)}%, rgb(255 255 255 / .18) 0)` }}>
                    <span className="grid size-[2.875rem] place-items-center rounded-full bg-deep text-[0.8125rem] font-semibold tabular-nums">%{Math.round(s.j.pct * 100)}</span>
                  </span>
                  <small className="-mt-3 text-[0.6875rem] font-semibold">{s.j.step}</small>
                </span>
              )
            ) : (
              <span key={s.k} className="grid aspect-square place-items-center rounded-[1.15rem] border-[1.5px] border-dashed border-line text-[0.8125rem] font-semibold text-mut">
                Boş
              </span>
            ),
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            ["camera", "Fotoğraf", free < 1],
            ["video", "Video", free < 1],
            ["paperclip", "Bağlantı", false],
          ].map(([icon, label, off]) => (
            <button key={label} type="button" disabled={off} onClick={() => tap(label)} className={`flex h-[4.75rem] flex-col items-center justify-center gap-1.5 rounded-2xl border bg-card text-[0.875rem] font-semibold shadow-[0_2px_0_var(--line)] transition active:translate-y-0.5 active:shadow-none disabled:opacity-45 ${label === "Bağlantı" && link ? "border-acc text-acc" : "border-line"}`}>
              <Icon name={icon} className="size-6 text-acc" />
              {label}
            </button>
          ))}
        </div>
        <input ref={photoRef} type="file" accept="image/*" multiple className="hidden" onChange={pick} />
        <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={pick} />
        {free < 1 && <p className="mt-1.5 text-[0.75rem] text-mut">En çok {MEDIA_MAX} fotoğraf ya da video. Yenisi için birini kaldır.</p>}

        {(link || e.yt?.id) && (
          <YtEdit
            big
            yt={e.yt}
            media={media}
            onChange={(v) => save((now) => ({ yt: v, media: now.media }))}
            onMedia={(v) => {
              const add = v.filter((m) => !media.some((x) => x.id === m.id));
              save((now) => ({ yt: now.yt, media: [...(now.media || []), ...add] }));
            }}
            className="mt-3 rounded-2xl border border-line bg-card p-3"
          />
        )}
        {children}
      </div>
      {open && <Viewer orgId={orgId} m={open} onClose={() => setOpen(null)} />}
    </div>,
    document.body,
  );
}
