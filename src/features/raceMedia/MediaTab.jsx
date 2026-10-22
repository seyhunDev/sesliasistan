"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { addRaceMedia, backfillPoster, dropRaceMedia, mutedCopy, prepRaceMedia, saveMedia } from "@/features/athletes/raceLiveStore";
import { Button } from "@/components/ui/Button";
import { Bar, readTimer } from "@/features/training/Countdown";
import { dayOf, fixMedia, hm, mediaGroups, mediaOf, momentAt, momentBadge, momentOf, momentRaceName, tagMedia } from "@/lib/raceLive";
import { MediaViewer } from "./MediaViewer";
import { Thumb } from "./Thumb";
import { CameraSheet } from "./CameraSheet";
import { RecPick } from "./RecPick";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/buttonClass";
import { clearKept, dropKept, dropPending, keepLocal, listKept, listPending, putPending } from "./pendingStore";

// Medya: üstteki "+ Kayıt" ve alt sekmelerin yanındaki Kayıt iPhone'un kendi kamerasını açar (RecPick; Seyhun 2026-10-22: sarsıntısız,
// net görüntü), dosyası olduğu gibi (prepRaceMedia). Yanındaki ⋯: Sayaçlı kamera (CameraSheet: süre ekranda, bipler sürer) ve telefonda
// tutulanların boyutu / Telefondan sil. Video en çok 2 dk; sırayla Storage'a yüklenir ve yarışa yazılır.
// Start sayacı sürerken çekilen, starta göre anıyla kaydedilir; liste yarışa ve ana göre gruplu
// ("2. yarış · Son 1 dakika", lib/raceLive.js mediaGroups), küçük resimde "−0:42" / "+12:30". Dokununca büyük açılır:
// yarıştaki sporcular etiketlenir (dokun ekle/çıkar), Paylaş, Düzelt (yarış ve an), Sil. Etiketli varsa üstte sporcu süzgeci.
// Çekilen hemen kaydedilir (önce gözden geçirme yok). file0: alttaki Kayıt ile çekilen dosya (işlenince onFileDone).
// Yüklenen ve yüklenmekte olan kayıtlar sayfa genelinde tutulur: sekme değişince Medya yeniden açılır, telefonda bekleyen kayıt (yüklemesi
// eski sekmede sürerken) yeniden sıraya girip ikinci kez yükleniyordu (Seyhun 2026-10-22: "aynı videonun iki kaydı düşüyor")
const inflight = new Set();
// Yükleme durumu da sayfa genelinde (sekme değişip Medya yeniden açılınca halka kaldığı yerden görünür):
// ups { [id]: { rec, url, p, err } }; mine: bu telefonda çekilip yüklenen künye → { url: yerel dosya, done: kısa ✓ }
// kept: telefonda 7 gün tutulan (pendingStore "kept") künye → { kind, size }; Medya › ⋯ içinde toplamı yazar
let upSnap = { ups: {}, mine: {}, kept: {} };
let keptLoaded = false;
const upSubs = new Set();
const upSet = (f) => ((upSnap = f(upSnap)), upSubs.forEach((x) => x()));
const upSub = (x) => (upSubs.add(x), () => upSubs.delete(x));
const upGet = () => upSnap;
const blankUps = { ups: {}, mine: {}, kept: {} };
const done = new Set();
const seenFiles = new WeakSet(); // alttaki Kayıt dosyası bir kez işlenir
const tried = new Set(); // bu açılışta küçük resmi denenen kayıtlar (olmazsa yeniden denenmez)

export function MediaTab({ orgId, race, day, live, ours = [], onChange, file0 = null, onFileDone }) {
  const toast = useToast();
  const photo = useRef(null);
  const video = useRef(null);
  const [busy, setBusy] = useState(""); // ilerleme yazısı
  const [pending, setPending] = useState(0); // sırada bekleyen kayıt
  const queue = useRef(Promise.resolve());
  const [waiting, setWaiting] = useState([]); // telefonda bekleyen (yüklenemeyen) kayıtlar
  // Yüklenenler listede hemen, telefondaki önizlemesiyle (Seyhun 2026-10-21, örnek yaris-tasarim/medya/yukleme.png): üstünde dolan halka,
  // bitince kısa ✓. ups: yüklenen/bekleyen kayıtlar { [id]: { rec, url, p, err } }; mine: bu telefonda çekilip yüklenen künye → yerel dosya
  const { ups, mine, kept } = useSyncExternalStore(upSub, upGet, () => blankUps);
  const setUps = (f) => upSet((x) => ({ ...x, ups: f(x.ups) }));
  const setMine = (f) => upSet((x) => ({ ...x, mine: f(x.mine) }));
  const [tick, setTick] = useState(0); // eski kayıtların küçük resmi: biri bitince sıradaki
  const up = (id, f) => setUps((u) => (u[id] ? { ...u, [id]: { ...u[id], ...f(u[id]) } } : u));
  const addUp = (rec, err = false) => setUps((u) => (u[rec.id] ? u : { ...u, [rec.id]: { rec, url: URL.createObjectURL(rec.blob), p: err ? null : 0, err } }));
  const [last, setLast] = useState(null); // kamerada köşedeki son çekilen: { id, kind, url, state: up | ok | err, err }
  const [cam, setCam] = useState(""); // açık sayaçlı kamera: "photo" | "video"
  const [more, setMore] = useState(false); // ⋯: Sayaçlı kamera, telefonda tutulanlar
  const camRef = useRef("");
  useEffect(() => {
    camRef.current = cam;
  }, [cam]);
  const [openId, setOpen] = useState("");
  const [who, setWho] = useState("");
  const todays = live.media.filter((m) => dayOf(m.at) === day);
  const tagged = ours.filter((a) => todays.some((m) => m.ath.includes(a.id)));
  const pick = tagged.some((a) => a.id === who) ? who : "";
  const upItems = pick ? [] : Object.values(ups).filter((x) => x.rec.raceId === race.id).map(({ rec, url, p, err }) => ({ id: rec.id, kind: rec.kind, at: rec.at, dur: rec.dur, ...rec.mom, u: { url, p, err } }));
  const open = live.media.find((m) => m.id === openId) || upItems.find((m) => m.id === openId) || null;
  const going = upItems.filter((x) => !x.u.err);
  const justDone = Object.values(mine).some((x) => x.done);
  const groups = mediaGroups([...mediaOf(live.media, pick), ...upItems], live.starts, day);
  const first = (a) => (a.studentName || "").split(" ")[0];

  // Çekilenin anı (Süre sekmesindeki yarışlara göre: momentAt) ve üstüne basılan yazı ("4. yarış · Son 1 dakika · 0:42 kala" / yarış adı · saat)
  // Her çekilen önce telefonda saklanır (pendingStore), sonra sırayla yüklenir; yüklenince telefondan silinir.
  // Yüklenemezse kaybolmaz: "telefonda bekliyor" kartı, sayfa açılınca ve internet gelince yeniden denenir.
  const errText = (e) =>
    e?.code === "storage/unauthorized" ? "Storage kuralı yayınlanmamış olabilir (Firebase › Storage › Rules)." : /network|retry-limit|offline/i.test(`${e?.code} ${e?.message}`) || !navigator.onLine ? "İnternet yok." : e?.message || "Yüklenemedi.";
  const send = async (rec) => {
    if (inflight.has(rec.id) || done.has(rec.id)) return; // aynı kayıt iki kez sıraya girdiyse bir kez yüklenir
    inflight.add(rec.id);
    try {
      addUp(rec);
      up(rec.id, () => ({ p: 0, err: false }));
      const meta = await addRaceMedia(orgId, race.id, rec, rec.at, (p) => up(rec.id, () => ({ p })), { ...rec.mom, dur: rec.dur });
      done.add(rec.id);
      await keepLocal({ id: meta.id, raceId: race.id, kind: rec.kind, size: rec.blob.size, blob: rec.blob });
      await dropPending(rec.id);
      upSet((x) => {
        const { [rec.id]: u, ...rest } = x.ups;
        return { ups: rest, mine: u ? { ...x.mine, [meta.id]: { url: u.url, done: true } } : x.mine, kept: { ...x.kept, [meta.id]: { kind: rec.kind, size: rec.blob.size } } };
      });
      setTimeout(() => setMine((m) => (m[meta.id] ? { ...m, [meta.id]: { ...m[meta.id], done: false } } : m)), 4000);
      setOpen((o) => (o === rec.id ? meta.id : o)); // yüklenirken izleniyorsa izleme sürer
      onChange((l) => ({ media: [...l.media, meta] }));
      setWaiting((w) => w.filter((x) => x.id !== rec.id));
      setLast((l) => (l?.id === rec.id ? { ...l, state: "ok" } : l));
    } catch (e) {
      const err = errText(e);
      console.warn("[raceMedia] yüklenemedi", e);
      await putPending({ ...rec, err });
      setWaiting((w) => [...w.filter((x) => x.id !== rec.id), { ...rec, err }]);
      setLast((l) => (l?.id === rec.id ? { ...l, state: "err", err } : l));
      up(rec.id, () => ({ p: null, err: true }));
    }
    inflight.delete(rec.id);
  };
  const enqueue = (rec) => {
    setPending((n) => n + 1);
    queue.current = queue.current.then(() => send(rec)).finally(() => setPending((n) => n - 1));
  };
  // Çekilen hemen kaydedilir (Seyhun 2026-10-18: çoğu zaman yarış ve an doğru; yanlışsa büyük açıp "Düzelt"): telefonda saklanır, sıraya girer.
  // Görüntünün üstüne yazı basılmaz (Seyhun 2026-10-20: "çok yazı olmasın"); an uygulamada görüntünün başlığında yazar
  const keep = async (m, at, mom, before = 0) => {
    const rec = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, raceId: race.id, at, kind: m.kind, type: m.type, blob: m.blob, dur: m.dur || 0, mom, before, err: "" };
    setLast((l) => (l?.url && URL.revokeObjectURL(l.url), { id: rec.id, kind: rec.kind, url: URL.createObjectURL(rec.blob), state: "up" }));
    await putPending(rec);
    addUp(rec);
    enqueue(rec);
  };
  // Bekleyen kayıt kendiliğinden yeniden denenir (Seyhun 2026-10-22: "Tekrar dene" düğmesi kalktı): internet gelince ve 30 sn'de bir
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const f = () => setOnline(navigator.onLine);
    f();
    window.addEventListener("online", f);
    window.addEventListener("offline", f);
    return () => (window.removeEventListener("online", f), window.removeEventListener("offline", f));
  }, []);
  const hasWait = waiting.length > 0;
  useEffect(() => {
    if (!hasWait) return;
    const id = setInterval(() => navigator.onLine && listPending(race.id).then((l) => l.forEach((r) => enqueue(r))), 30e3);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasWait, race.id]);
  // Sayfa açılınca telefonda kalanlar (eski "kaydetmeden önce" bekleyenler dahil) listelenir ve yeniden denenir; internet gelince de
  useEffect(() => {
    let on = true;
    listPending(race.id).then((list) => {
      const all = list.filter((r) => !inflight.has(r.id) && !done.has(r.id)); // önceki açılışta yüklenmekte olan, orada biter
      if (!on || !all.length) return;
      setWaiting(all);
      all.forEach((r) => (addUp(r, !!r.err), enqueue(r)));
    });
    const online = () => listPending(race.id).then((l) => l.forEach((r) => enqueue(r)));
    window.addEventListener("online", online);
    return () => {
      on = false;
      window.removeEventListener("online", online);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [race.id]);
  // Telefonda tutulanlar (7 günü geçenler silinir) sayfa açılışında bir kez okunur: izlerken yerel dosya oynar
  useEffect(() => {
    if (keptLoaded) return;
    keptLoaded = true;
    listKept().then((list) =>
      upSet((x) => {
        const mine = { ...x.mine };
        const kept = { ...x.kept };
        for (const k of list) {
          if (!mine[k.id]) mine[k.id] = { url: URL.createObjectURL(k.blob), done: false };
          kept[k.id] = { kind: k.kind, size: k.size || k.blob?.size || 0 };
        }
        return { ...x, mine, kept };
      }),
    );
  }, []);
  const clearPhone = async () => {
    await clearKept();
    upSet((x) => {
      const mine = { ...x.mine };
      for (const id of Object.keys(x.kept)) if (mine[id]) (URL.revokeObjectURL(mine[id].url), delete mine[id]);
      return { ...x, mine, kept: {} };
    });
    toast("Telefondan silindi");
  };
  // Küçük resmi olmayan eski kayıtlar sırayla bir kez tamamlanır (sonra liste videoyu indirmez)
  const noThumb = live.media.find((m) => !m.thumb && !tried.has(m.id));
  useEffect(() => {
    if (!noThumb || !navigator.onLine) return;
    tried.add(noThumb.id);
    let on = true;
    backfillPoster(orgId, race.id, noThumb)
      .then((thumb) => on && thumb && onChange((l) => ({ media: l.media.map((x) => (x.id === noThumb.id ? { ...x, thumb } : x)) })))
      .catch(() => {})
      .finally(() => on && setTick((n) => n + 1));
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noThumb?.id, tick]);
  // Uygulama içi kameradan: an çekildiği anda hesaplanır (sayaç sonra sıfırlansa da kalır)
  // An: yarış satırından; yarış yoksa süren start sayacından (düz start, "+ Yarış yap" denmemiş)
  const momentFor = (at) => momentAt(at, live.starts) || momentOf(at, readTimer());
  const shot = (x) => keep(x, x.at, momentFor(x.at));
  // Telefonun kendi kamerasıyla (uygulama içi kamera açılamazsa): çekildiği an dosyanın zamanı bu güne aitse o, değilse şimdi
  const take = async (file) => {
    if (!file) return;
    const t = file.lastModified ? new Date(file.lastModified).toISOString() : "";
    const now = new Date().toISOString();
    const at = t && dayOf(t) === day ? t : dayOf(now) === day ? now : new Date(`${day}T12:00:00`).toISOString();
    const mom = momentFor(at);
    try {
      setBusy("Hazırlanıyor…");
      const m = await prepRaceMedia(file, (p) => setBusy(`Küçültülüyor %${Math.round(p * 100)}`));
      setBusy("");
      // iPhone videosunun dosya zamanı kaydın bittiği an: an (startan beri) kaydın başına göre
      const at0 = m.kind === "video" && m.dur && t && dayOf(t) === day ? new Date(Date.parse(at) - m.dur * 1000).toISOString() : at;
      await keep(m, at0, at0 === at ? mom : momentFor(at0), file.size);
    } catch (e) {
      toast(e?.message || "Kaydedilemedi");
      setBusy("");
    }
  };
  // Alttaki Kayıt ile (başka sekmede) çekilen dosya burada işlenir
  useEffect(() => {
    if (!file0 || seenFiles.has(file0)) return;
    seenFiles.add(file0);
    take(file0);
    onFileDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file0]);
  // Kayıt her zaman bizim kamerayı açar (foto/video kamerada seçilir; Seyhun 2026-10-22). iPhone'un kendi kamerası kameranın ⋯ menüsünde
  const native = (k) => (setCam(""), (k === "photo" ? photo : video).current?.click());
  const camFail = (e) => {
    setCam("");
    toast(e?.name === "NotAllowedError" ? "Kamera izni verilmedi" : e?.message && !/^[A-Z]/.test(e.name || "") ? e.message : "Sayaçlı kamera açılamadı");
  };

  const drop = (m) => {
    if (!confirm(m.kind === "video" ? "Video silinsin mi?" : "Fotoğraf silinsin mi?")) return;
    setOpen("");
    const rest = live.media.filter((x) => x.id !== m.id);
    onChange({ media: rest }, () => dropRaceMedia(orgId, race.id, m, rest));
    dropKept(m.id);
    upSet((x) => {
      const { [m.id]: k, ...kept } = x.kept;
      const { [m.id]: u, ...mine } = x.mine;
      if (u) URL.revokeObjectURL(u.url);
      return k || u ? { ...x, kept, mine } : x;
    });
  };
  // Sonradan düzeltme: yarışı ve anı değişir (fotoğrafa basılı yazı değişmez)
  const fix = (m, mom) => {
    const next = fixMedia(live.media, m.id, mom);
    onChange({ media: next }, () => saveMedia(orgId, race.id, next));
  };
  const tag = (m, athId) => {
    const next = tagMedia(live.media, m.id, athId);
    onChange({ media: next }, () => saveMedia(orgId, race.id, next));
  };
  // muted: sessiz kopya paylaşılır (kayıttaki video sesli kalır)
  const share = async (m, muted = false) => {
    try {
      let blob = await (await fetch(m.url)).blob();
      if (muted) {
        setBusy("Sessiz kopya hazırlanıyor");
        blob = await mutedCopy(blob, (p) => setBusy(`Sessiz kopya hazırlanıyor %${Math.round(p * 100)}`));
        setBusy("");
      }
      const type = blob.type || m.type;
      const ext = m.kind !== "video" ? "jpg" : type.includes("webm") ? "webm" : type.includes("quicktime") ? "mov" : "mp4";
      const f = new File([blob], `${race.name || "yarış"} ${hm(m.at).replace(":", ".")}${muted ? " sessiz" : ""}.${ext}`, { type });
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f] });
      else window.open(muted ? URL.createObjectURL(f) : m.url, "_blank");
    } catch (e) {
      setBusy("");
      if (e?.name !== "AbortError") toast(muted ? "Sessiz kopya hazırlanamadı" : "Paylaşılamadı");
    }
  };


  const waitErr = waiting.find((x) => x.err)?.err || "";
  const stock = Object.values(kept);
  const nv = stock.filter((k) => k.kind === "video").length;
  const mb = stock.reduce((a, k) => a + (k.size || 0), 0) / 1e6;
  const size = mb >= 1000 ? `${(mb / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} GB` : `${Math.max(1, Math.round(mb))} MB`;
  const stockText = !stock.length ? "Telefonda kayıt yok" : `Telefonda ${[nv && `${nv} video`, stock.length - nv && `${stock.length - nv} fotoğraf`].filter(Boolean).join(" · ")} · ${size}`;
  return (
    <>
      {((!online && (waiting.length > 0 || upItems.length > 0)) || (online && waiting.length > 0 && waitErr && waitErr !== "İnternet yok.")) && (
        <p className="mt-3 px-1 text-[0.875rem] text-warn">{online ? waitErr : "Bağlantı yok · telefona kaydedildi"}</p>
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
      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        {/* Yükleme sürerken burada ne kadarının gittiği yazar (Seyhun 2026-10-22: "yüklenip yüklenmediğini bilmiyorum"), bitince sayılar */}
        <p className="text-[0.875rem] tabular-nums text-mut">{going.length ? `${going.length} ${going.every((x) => x.kind === "video") ? "video" : going.every((x) => x.kind !== "video") ? "fotoğraf" : "kayıt"} buluta gönderiliyor · %${Math.round((going.reduce((a, x) => a + (x.u.p || 0), 0) / going.length) * 100)}` : justDone ? "Buluta gönderildi ✓" : todays.length ? [todays.filter((m) => m.kind === "video").length, todays.filter((m) => m.kind !== "video").length].map((n, k) => n && `${n} ${k ? "fotoğraf" : "video"}`).filter(Boolean).join(" · ") : ""}</p>
        <div className="flex shrink-0 gap-2">
          <RecPick onFile={take} className={buttonClass({ size: "sm", full: false })}>
            + Kayıt
          </RecPick>
          <Button variant="secondary" size="sm" full={false} onClick={() => setMore(true)} aria-label="Diğer çekim" className="px-2.5">
            <Icon name="more" className="size-5" />
          </Button>
        </div>
      </div>
      {!groups.length && <p className={`${card} mt-3 px-4 py-6 text-center text-[0.875rem] text-mut`}>Bu gün fotoğraf ya da video yok.</p>}
      {groups.map((g) => (
        <section key={g.key}>
          <p className="mb-1.5 mt-4 px-1 text-[0.8125rem] text-mut">{g.title}</p>
          <div className={`${card} grid grid-cols-3 gap-1 overflow-hidden p-1`}>
            {g.items.map((m) => (
              <button key={m.id} type="button" onClick={() => setOpen(m.id)} className="relative aspect-square overflow-hidden rounded-xl bg-line active:opacity-80">
                <Thumb kind={m.kind} url={m.url} thumb={m.thumb} dur={m.dur} local={m.u?.url || mine[m.id]?.url} up={m.u && !m.u.err ? m.u.p : null} err={!!m.u?.err} done={!!mine[m.id]?.done} />
                {m.phase && <span className="absolute left-1 top-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-white">{momentBadge(m)}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}

      <MediaViewer
        // Yüklenmekte olan da hemen izlenir (Seyhun 2026-10-22: "telefonda tuttuğumuzu kullanamıyoruz"): telefondaki dosyadan oynar
        items={groups.flatMap((g) => g.items).map((m) => (m.u ? { ...m, url: m.u.url, local: m.u.url, up: m.u.err ? -1 : m.u.p } : mine[m.id] ? { ...m, local: mine[m.id].url } : m))}
        id={open ? open.id : ""}
        onPick={setOpen}
        onClose={() => setOpen("")}
        label={(m) => (m.phase ? momentRaceName(m, live.starts) : "") /* an (startan beri) görüntünün üstünde yazar */}
        ours={ours}
        onTag={tag}
        onShare={share}
        busy={busy}
        onDrop={drop}
        starts={live.starts}
        onFix={fix}
      />

      <input ref={photo} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ""))} />
      <input ref={video} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e) => (take(e.target.files?.[0]), (e.target.value = ""))} />
      {busy && (
        <Bar>
          <div className="grid h-14 w-full place-items-center rounded-2xl border border-line bg-card text-[1rem] font-semibold">{pending > 1 ? `${busy} · ${pending - 1} sırada` : busy}</div>
        </Bar>
      )}
      <Sheet open={more} onClose={() => setMore(false)} title="Çekim">
        <Button variant="secondary" onClick={() => (setMore(false), setCam("video"))}>
          Sayaçlı kamera
        </Button>
        <p className="mt-4 px-1 text-[0.9375rem] tabular-nums">{stockText}</p>
        {stock.length > 0 && (
          <Button variant="secondary" onClick={() => (setMore(false), clearPhone())} className="mt-2">
            Telefondan sil
          </Button>
        )}
      </Sheet>
      <CameraSheet open={!!cam} mode={cam} onMode={setCam} onClose={() => setCam("")} onShot={shot} onFail={camFail} last={last} onNative={native} stock={stockText} onClear={stock.length ? clearPhone : null} />
    </>
  );
}
