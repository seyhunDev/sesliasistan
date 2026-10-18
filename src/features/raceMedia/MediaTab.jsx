"use client";

import { useEffect, useRef, useState } from "react";
import { card } from "@/components/ui/Page";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { addRaceMedia, dropRaceMedia, prepRaceMedia, saveMedia } from "@/features/athletes/raceLiveStore";
import { Bar } from "@/features/training/Countdown";
import { dayOf, hm, mediaGroups, mediaOf, momentAt, momentBadge, momentRaceName, momentText, tagMedia } from "@/lib/raceLive";
import { ReviewSheet } from "./ReviewSheet";
import { CameraSheet } from "./CameraSheet";
import { stampBlob } from "./stamp";
import { dropPending, listPending, putPending } from "./pendingStore";

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
  const inflight = useRef(new Set());
  const done = useRef(new Set());
  const [waiting, setWaiting] = useState([]); // telefonda bekleyen (yüklenemeyen) kayıtlar
  const [last, setLast] = useState(null); // kamerada köşedeki son çekilen: { id, kind, url, state: up | ok | err, err }
  const [reviewing, setReviewing] = useState([]); // çekildi, kaydetmeden önce gözden geçirilecek
  const [review, setReview] = useState(false);
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

  // Çekilenin anı (Süre sekmesindeki yarışlara göre: momentAt) ve üstüne basılan yazı ("4. yarış · Son 1 dakika · 0:42 kala" / yarış adı · saat)
  const linesFor = (mom, at) => (mom ? [`${momentRaceName(mom, live.starts)} · ${momentText(mom)}`, `${race.name || "Yarış"} · ${hm(at)}`] : []);
  const stampFor = (at) => linesFor(momentAt(at, live.starts), at);
  // Her çekilen önce telefonda saklanır (pendingStore), sonra sırayla yüklenir; yüklenince telefondan silinir.
  // Yüklenemezse kaybolmaz: "telefonda bekliyor" kartı, sayfa açılınca ve internet gelince yeniden denenir.
  const errText = (e) =>
    e?.code === "storage/unauthorized" ? "Storage kuralı yayınlanmamış olabilir (Firebase › Storage › Rules)." : /network|retry-limit|offline/i.test(`${e?.code} ${e?.message}`) || !navigator.onLine ? "İnternet yok." : e?.message || "Yüklenemedi.";
  const send = async (rec) => {
    if (inflight.current.has(rec.id) || done.current.has(rec.id)) return; // aynı kayıt iki kez sıraya girdiyse bir kez yüklenir
    inflight.current.add(rec.id);
    try {
      setBusy("Yükleniyor…");
      const meta = await addRaceMedia(orgId, race.id, rec, rec.at, (p) => setBusy(`Yükleniyor %${Math.round(p * 100)}`), rec.mom);
      done.current.add(rec.id);
      await dropPending(rec.id);
      onChange((l) => ({ media: [...l.media, meta] }));
      setWaiting((w) => w.filter((x) => x.id !== rec.id));
      setLast((l) => (l?.id === rec.id ? { ...l, state: "ok" } : l));
      if (!cam) toast(rec.kind === "video" && rec.before > rec.blob.size ? `Video kaydedildi · ${sizeText(rec.before)} → ${sizeText(rec.blob.size)}` : rec.kind === "video" ? "Video kaydedildi" : "Fotoğraf kaydedildi");
    } catch (e) {
      const err = errText(e);
      await putPending({ ...rec, err });
      setWaiting((w) => [...w.filter((x) => x.id !== rec.id), { ...rec, err }]);
      setLast((l) => (l?.id === rec.id ? { ...l, state: "err", err } : l));
    }
    inflight.current.delete(rec.id);
    setBusy("");
  };
  const enqueue = (rec) => {
    setPending((n) => n + 1);
    queue.current = queue.current.then(() => send(rec)).finally(() => setPending((n) => n - 1));
  };
  // Çekilen telefonda saklanır ve "Kaydetmeden önce" listesine girer (ReviewSheet); Kaydet'e basılınca yüklenir
  const keep = async (m, at, mom, before = 0) => {
    const rec = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, raceId: race.id, at, kind: m.kind, type: m.type, blob: m.blob, mom, before, err: "", review: true };
    await putPending(rec);
    setReviewing((l) => [...l, rec]);
    setLast((l) => (l?.url && URL.revokeObjectURL(l.url), { id: rec.id, kind: rec.kind, url: URL.createObjectURL(rec.blob), state: "saved" }));
  };
  const setMom = (id, mom) => setReviewing((l) => l.map((r) => (r.id === id ? (putPending({ ...r, mom }), { ...r, mom }) : r)));
  const discard = (id) => {
    dropPending(id);
    setReviewing((l) => l.filter((r) => r.id !== id));
  };
  const confirmAll = async () => {
    const list = reviewing;
    setReviewing([]);
    setReview(false);
    for (const r of list) {
      const rec = { ...r, review: false };
      if (rec.kind === "photo" && rec.mom) rec.blob = await stampBlob(rec.blob, linesFor(rec.mom, rec.at)); // seçilen yarış ve an basılır
      await putPending(rec);
      enqueue(rec);
    }
  };
  const retry = () => waiting.forEach((r) => enqueue(r));
  // Sayfa açılınca telefonda kalanlar listelenir ve yeniden denenir; internet gelince de
  useEffect(() => {
    let on = true;
    listPending(race.id).then((all) => {
      if (!on || !all.length) return;
      const l = all.filter((r) => !r.review);
      setReviewing(all.filter((r) => r.review));
      setWaiting(l);
      l.forEach((r) => enqueue(r));
    });
    const online = () => listPending(race.id).then((l) => l.filter((r) => !r.review).forEach((r) => enqueue(r)));
    window.addEventListener("online", online);
    return () => {
      on = false;
      window.removeEventListener("online", online);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race.id]);
  // Uygulama içi kameradan: an çekildiği anda hesaplanır (sayaç sonra sıfırlansa da kalır)
  const shot = (x) => keep(x, x.at, momentAt(x.at, live.starts));
  // Telefonun kendi kamerasıyla (uygulama içi kamera açılamazsa): çekildiği an dosyanın zamanı bu güne aitse o, değilse şimdi
  const take = async (file) => {
    if (!file) return;
    const t = file.lastModified ? new Date(file.lastModified).toISOString() : "";
    const now = new Date().toISOString();
    const at = t && dayOf(t) === day ? t : dayOf(now) === day ? now : new Date(`${day}T12:00:00`).toISOString();
    const mom = momentAt(at, live.starts);
    try {
      setBusy("Hazırlanıyor…");
      const m = await prepRaceMedia(file, (p) => setBusy(`Küçültülüyor %${Math.round(p * 100)}`));
      setBusy("");
      await keep(m, at, mom, file.size);
      setReview(true);
    } catch (e) {
      toast(e?.message || "Kaydedilemedi");
      setBusy("");
    }
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

  const waitErr = waiting.find((x) => x.err)?.err || "";
  return (
    <>
      {reviewing.length > 0 && !review && (
        <div className={`${card} mt-3 flex items-center gap-3 px-4 py-3`}>
          <b className="min-w-0 flex-1 text-[0.9375rem] font-semibold">{reviewing.length} çekim kaydedilmeyi bekliyor</b>
          <button type="button" onClick={() => setReview(true)} className="h-10 shrink-0 rounded-xl bg-acc px-4 text-[0.9375rem] font-semibold text-white active:translate-y-px">
            Gözden geçir
          </button>
        </div>
      )}
      {waiting.length > 0 && (
        <div className={`${card} mt-3 flex items-center gap-3 px-4 py-3`}>
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] font-semibold text-warn">{waiting.length} kayıt telefonda bekliyor</b>
            <span className="block text-[0.8125rem] text-mut">{busy || waitErr || "Yükleniyor"}</span>
          </span>
          {!busy && (
            <button type="button" onClick={retry} className="h-10 shrink-0 rounded-xl bg-acc px-4 text-[0.9375rem] font-semibold text-white active:translate-y-px">
              Tekrar dene
            </button>
          )}
        </div>
      )}
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
            <p className="mt-2 text-[0.8125rem] text-mut">{[open.phase ? `${momentRaceName(open, live.starts)} · ${momentText(open)}` : "", sizeText(open.size)].filter(Boolean).join(" · ")}</p>
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
      <ReviewSheet open={review && !cam} items={reviewing} starts={live.starts} onMom={setMom} onDrop={discard} onSave={confirmAll} onClose={() => setReview(false)} />
      <CameraSheet open={!!cam} mode={cam} onMode={setCam} onClose={() => (setCam(""), reviewing.length && setReview(true))} onShot={shot} onFail={camFail} stampFor={stampFor} pending={pending} last={last} />
    </>
  );
}
