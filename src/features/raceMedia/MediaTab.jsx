"use client";

import { useRef, useState } from "react";
import { card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { addRaceMedia, dropRaceMedia, prepRaceMedia } from "@/features/athletes/raceLiveStore";
import { Bar } from "@/features/training/Countdown";
import { dayOf, hm, mediaGroups } from "@/lib/raceLive";

// Medya: "Fotoğraf" ve "Video" kamerayı açar; çekilen küçültülüp (video 960 px, fotoğraf 1600 px) Storage'a yüklenir ve yarışa yazılır.
// Liste o günün yarışlarına göre gruplu (çekildiği saatten sonraki son start). Dokununca büyük açılır: Paylaş, Sil.
const sizeText = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function MediaTab({ orgId, race, day, live, onChange }) {
  const toast = useToast();
  const photo = useRef(null);
  const video = useRef(null);
  const [busy, setBusy] = useState(""); // ilerleme yazısı
  const [open, setOpen] = useState(null);
  const groups = mediaGroups(live.media, live.starts, day);

  const take = async (file) => {
    if (!file || busy) return;
    // Çekildiği an: dosyanın zamanı bu güne aitse o, değilse şimdi
    const t = file.lastModified ? new Date(file.lastModified).toISOString() : "";
    const now = new Date().toISOString();
    const at = t && dayOf(t) === day ? t : dayOf(now) === day ? now : new Date(`${day}T12:00:00`).toISOString();
    try {
      setBusy("Hazırlanıyor…");
      const m = await prepRaceMedia(file, (p) => setBusy(`Küçültülüyor %${Math.round(p * 100)}`));
      setBusy("Yükleniyor…");
      const meta = await addRaceMedia(orgId, race.id, m, at, (p) => setBusy(`Yükleniyor %${Math.round(p * 100)}`));
      onChange((l) => ({ media: [...l.media, meta] }));
      toast(m.kind === "video" && file.size > m.blob.size ? `Video kaydedildi · ${sizeText(file.size)} → ${sizeText(m.blob.size)}` : m.kind === "video" ? "Video kaydedildi" : "Fotoğraf kaydedildi");
    } catch (e) {
      toast(e?.code === "storage/unauthorized" ? "Kaydedilemedi: Storage kuralı yayınlanmamış olabilir." : e?.message || "Kaydedilemedi");
    }
    setBusy("");
  };
  const drop = (m) => {
    if (!confirm(m.kind === "video" ? "Video silinsin mi?" : "Fotoğraf silinsin mi?")) return;
    setOpen(null);
    onChange((l) => ({ media: l.media.filter((x) => x.id !== m.id) }), () => dropRaceMedia(orgId, race.id, m));
  };
  const share = async (m) => {
    try {
      const blob = await (await fetch(m.url)).blob();
      const f = new File([blob], `${race.name || "yarış"} ${hm(m.at).replace(":", ".")}.${m.kind === "video" ? (m.type.includes("webm") ? "webm" : "mp4") : "jpg"}`, { type: m.type || blob.type });
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f] });
      else window.open(m.url, "_blank");
    } catch (e) {
      if (e?.name !== "AbortError") toast("Paylaşılamadı");
    }
  };

  return (
    <>
      {!groups.length && <p className={`${card} mt-3 px-4 py-6 text-center text-[0.875rem] text-mut`}>Bu gün fotoğraf ya da video yok.</p>}
      {groups.map((g) => (
        <section key={g.key}>
          <p className="mb-1.5 mt-4 px-1 text-[0.8125rem] text-mut">{g.title}</p>
          <div className={`${card} grid grid-cols-3 gap-1 overflow-hidden p-1`}>
            {g.items.map((m) => (
              <button key={m.id} type="button" onClick={() => setOpen(m)} className="relative aspect-square overflow-hidden rounded-xl bg-line active:opacity-80">
                {m.kind === "video" ? (
                  <>
                    <video src={`${m.url}#t=0.3`} muted playsInline preload="metadata" className="size-full object-cover" />
                    <span className="absolute bottom-1 right-1.5 text-[0.6875rem] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">video</span>
                  </>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={m.url} alt="" loading="lazy" className="size-full object-cover" />
                )}
              </button>
            ))}
          </div>
        </section>
      ))}

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? `${open.kind === "video" ? "Video" : "Fotoğraf"} · ${hm(open.at)}` : ""}>
        {open && (
          <div className="pb-2">
            {open.kind === "video" ? (
              <video src={open.url} controls playsInline className="max-h-[60vh] w-full rounded-xl bg-black" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={open.url} alt="" className="max-h-[60vh] w-full rounded-xl object-contain" />
            )}
            <p className="mt-2 text-[0.8125rem] text-mut">{sizeText(open.size)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => share(open)} className="h-12 rounded-2xl bg-acc text-[1rem] font-semibold text-white">Paylaş</button>
              <button type="button" onClick={() => drop(open)} className="h-12 rounded-2xl bg-bg text-[1rem] font-semibold text-rec">Sil</button>
            </div>
          </div>
        )}
      </Sheet>

      <input ref={photo} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ""))} />
      <input ref={video} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ""))} />
      <Bar>
        {busy ? (
          <div className="grid h-14 w-full place-items-center rounded-2xl border border-line bg-card text-[1rem] font-semibold">{busy}</div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => photo.current?.click()} className="h-14 flex-1 rounded-2xl border border-line bg-card text-[1.0625rem] font-semibold active:translate-y-px">Fotoğraf</button>
            <button type="button" onClick={() => video.current?.click()} className="h-14 flex-1 rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:translate-y-px">Video</button>
          </div>
        )}
      </Bar>
    </>
  );
}
