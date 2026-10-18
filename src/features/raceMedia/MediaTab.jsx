"use client";

import { useRef, useState } from "react";
import { card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { addRaceMedia, dropRaceMedia, prepRaceMedia, saveMedia } from "@/features/athletes/raceLiveStore";
import { Bar, readTimer } from "@/features/training/Countdown";
import { dayOf, hm, mediaGroups, mediaOf, momentBadge, momentOf, momentRace, momentText, tagMedia } from "@/lib/raceLive";
import { CameraSheet } from "./CameraSheet";
import { stampBlob } from "./stamp";

// Medya: "Fotoğraf" ve "Video" uygulama içi kamerayı açar (CameraSheet: sayaç ve bipleri sürer; açılamazsa telefonun kamerası).
// Çekilen küçük kaydedilir (video en çok 2 dk, 960 px; fotoğraf 1600 px), sırayla Storage'a yüklenir ve yarışa yazılır.
// Start sayacı sürerken çekilen, starta göre anıyla kaydedilir ve üstüne yazılır; liste yarışa ve ana göre gruplu
// ("2. yarış · Son 1 dakika", lib/raceLive.js mediaGroups), küçük resimde "−0:42" / "+12:30". Dokununca büyük açılır:
// yarıştaki sporcular etiketlenir (dokun ekle/çıkar), Paylaş, Sil. Etiketli varsa üstte sporcu süzgeci.
const sizeText = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function MediaTab({ orgId, race, day, live, ours = [], onChange }) {
  const toast = useToast();
  const photo = useRef(null);
  const video = useRef(null);
  const [busy, setBusy] = useState(""); // ilerleme yazısı
  const [pending, setPending] = useState(0); // sırada bekleyen kayıt
  const queue = useRef(Promise.resolve());
  const [cam, setCam] = useState(""); // açık uygulama içi kamera: "photo" | "video"
  const [native, setNative] = useState(false); // uygulama içi kamera açılamadı: telefonun kamerası
  const [openId, setOpen] = useState("");
  const [who, setWho] = useState("");
  const open = live.media.find((m) => m.id === openId) || null;
  const todays = live.media.filter((m) => dayOf(m.at) === day);
  const tagged = ours.filter((a) => todays.some((m) => m.ath.includes(a.id)));
  const pick = tagged.some((a) => a.id === who) ? who : "";
  const groups = mediaGroups(mediaOf(live.media, pick), live.starts, day);
  const first = (a) => (a.studentName || "").split(" ")[0];

  // Sayaç sürerken çekilenin anı ve üstüne basılan yazı ("2. yarış · Son 1 dakika · 0:42 kala" / yarış adı · saat)
  const stampFor = (at) => {
    const mom = momentOf(at, readTimer());
    return mom ? [`${momentRace(mom, live.starts)}. yarış · ${momentText(mom)}`, `${race.name || "Yarış"} · ${hm(at)}`] : [];
  };
  // Kayıtlar sırayla yüklenir; kamera açık kalıp çekmeye devam edilebilir
  const upload = async (m, at, mom, before = 0) => {
    try {
      setBusy("Yükleniyor…");
      const meta = await addRaceMedia(orgId, race.id, m, at, (p) => setBusy(`Yükleniyor %${Math.round(p * 100)}`), mom);
      onChange((l) => ({ media: [...l.media, meta] }));
      toast(m.kind === "video" && before > m.blob.size ? `Video kaydedildi · ${sizeText(before)} → ${sizeText(m.blob.size)}` : m.kind === "video" ? "Video kaydedildi" : "Fotoğraf kaydedildi");
    } catch (e) {
      toast(e?.code === "storage/unauthorized" ? "Kaydedilemedi: Storage kuralı yayınlanmamış olabilir." : e?.message || "Kaydedilemedi");
    }
    setBusy("");
  };
  const enqueue = (job) => {
    setPending((n) => n + 1);
    queue.current = queue.current.then(job).finally(() => setPending((n) => n - 1));
  };
  // Uygulama içi kameradan: an çekildiği anda hesaplanır (sayaç sonra sıfırlansa da kalır)
  const shot = (x) => {
    const mom = momentOf(x.at, readTimer());
    enqueue(() => upload(x, x.at, mom));
  };
  // Telefonun kendi kamerasıyla (uygulama içi kamera açılamazsa): çekildiği an dosyanın zamanı bu güne aitse o, değilse şimdi
  const take = (file) => {
    if (!file) return;
    const t = file.lastModified ? new Date(file.lastModified).toISOString() : "";
    const now = new Date().toISOString();
    const at = t && dayOf(t) === day ? t : dayOf(now) === day ? now : new Date(`${day}T12:00:00`).toISOString();
    const mom = momentOf(at, readTimer());
    const lines = stampFor(at);
    enqueue(async () => {
      try {
        setBusy("Hazırlanıyor…");
        const m = await prepRaceMedia(file, (p) => setBusy(`Küçültülüyor %${Math.round(p * 100)}`));
        if (m.kind === "photo" && lines.length) m.blob = await stampBlob(m.blob, lines);
        await upload(m, at, mom, file.size);
      } catch (e) {
        toast(e?.message || "Kaydedilemedi");
        setBusy("");
      }
    });
  };
  const openCam = (k) => {
    if (native) return (k === "photo" ? photo : video).current?.click();
    setCam(k);
  };
  const camFail = (e) => {
    setCam("");
    setNative(true);
    toast(e?.name === "NotAllowedError" ? "Kamera izni verilmedi. Telefonun kamerası açılacak." : e?.message && !/^[A-Z]/.test(e.name || "") ? e.message : "Kamera açılamadı. Telefonun kamerası açılacak.");
  };

  const drop = (m) => {
    if (!confirm(m.kind === "video" ? "Video silinsin mi?" : "Fotoğraf silinsin mi?")) return;
    setOpen("");
    const rest = live.media.filter((x) => x.id !== m.id);
    onChange({ media: rest }, () => dropRaceMedia(orgId, race.id, m, rest));
  };
  const tag = (m, athId) => {
    const next = tagMedia(live.media, m.id, athId);
    onChange({ media: next }, () => saveMedia(orgId, race.id, next));
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
      {tagged.length > 0 && (
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
          {[{ id: "", studentName: "Hepsi" }, ...tagged].map((a) => (
            <button key={a.id || "all"} type="button" onClick={() => setWho(a.id)} aria-pressed={pick === a.id} className={`h-8 shrink-0 rounded-full px-3 text-[0.8125rem] font-semibold active:scale-95 ${pick === a.id ? "bg-acc text-white" : "bg-card ring-1 ring-line"}`}>
              {a.id ? first(a) : "Hepsi"}
            </button>
          ))}
        </div>
      )}
      {!groups.length && <p className={`${card} mt-3 px-4 py-6 text-center text-[0.875rem] text-mut`}>Bu gün fotoğraf ya da video yok.</p>}
      {groups.map((g) => (
        <section key={g.key}>
          <p className="mb-1.5 mt-4 px-1 text-[0.8125rem] text-mut">{g.title}</p>
          <div className={`${card} grid grid-cols-3 gap-1 overflow-hidden p-1`}>
            {g.items.map((m) => (
              <button key={m.id} type="button" onClick={() => setOpen(m.id)} className="relative aspect-square overflow-hidden rounded-xl bg-line active:opacity-80">
                {m.kind === "video" ? (
                  <>
                    <video src={`${m.url}#t=0.3`} muted playsInline preload="metadata" className="size-full object-cover" />
                    <span className="absolute bottom-1 right-1.5 text-[0.6875rem] font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">video</span>
                  </>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={m.url} alt="" loading="lazy" className="size-full object-cover" />
                )}
                {m.phase && <span className="absolute left-1 top-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-white">{momentBadge(m)}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}

      <Sheet open={!!open} onClose={() => setOpen("")} title={open ? `${open.kind === "video" ? "Video" : "Fotoğraf"} · ${hm(open.at)}` : ""}>
        {open && (
          <div className="pb-2">
            {open.kind === "video" ? (
              <video src={open.url} controls playsInline className="max-h-[60vh] w-full rounded-xl bg-black" />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={open.url} alt="" className="max-h-[60vh] w-full rounded-xl object-contain" />
            )}
            <p className="mt-2 text-[0.8125rem] text-mut">{[open.phase ? `${momentRace(open, live.starts)}. yarış · ${momentText(open)}` : "", sizeText(open.size)].filter(Boolean).join(" · ")}</p>
            {ours.length > 0 && (
              <>
                <p className="mt-3 text-[0.8125rem] text-mut">Kimler var</p>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {ours.map((a) => {
                    const on = open.ath.includes(a.id);
                    return (
                      <button key={a.id} type="button" onClick={() => tag(open, a.id)} aria-pressed={on} className={`h-9 rounded-full px-3.5 text-[0.875rem] font-semibold active:scale-95 ${on ? "bg-acc text-white" : "bg-bg ring-1 ring-line"}`}>
                        {a.studentName}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
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
          <div className="grid h-14 w-full place-items-center rounded-2xl border border-line bg-card text-[1rem] font-semibold">{pending > 1 ? `${busy} · ${pending - 1} sırada` : busy}</div>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => openCam("photo")} className="h-14 flex-1 rounded-2xl border border-line bg-card text-[1.0625rem] font-semibold active:translate-y-px">Fotoğraf</button>
            <button type="button" onClick={() => openCam("video")} className="h-14 flex-1 rounded-2xl bg-acc text-[1.0625rem] font-semibold text-white active:translate-y-px">Video</button>
          </div>
        )}
      </Bar>
      <CameraSheet open={!!cam} mode={cam} onMode={setCam} onClose={() => setCam("")} onShot={shot} onFail={camFail} stampFor={stampFor} pending={pending} />
    </>
  );
}
