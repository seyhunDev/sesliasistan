"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Seg, card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { VIDEO_Q, addRaceMedia, backfillPoster, cloudCopy, dropRaceMedia, mutedCopy, posterOf, prepRaceMedia, readVideoQ, saveMedia, saveVideoQ } from "@/features/athletes/raceLiveStore";
import { Button } from "@/components/ui/Button";
import { Bar, readTimer } from "@/features/training/Countdown";
import { dayOf, fixMedia, hm, mediaByRace, mediaGroups, mediaOf, momentAt, momentBadge, momentOf, tagMedia } from "@/lib/raceLive";
import { MediaViewer } from "./MediaViewer";
import { Thumb } from "./Thumb";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { deletePhotos, hasCamera } from "@/lib/nativeIos";
import { clearKept, dropKept, dropPending, keepLocal, listKept, listPending, putPending } from "./pendingStore";
import { setShooting, useShooting } from "./shooting";

// Medya: alt sekmelerin yanındaki Kayıt iPhone'un kendi kamerasını açar (RecPick; Seyhun 2026-10-22: sarsıntısız,
// net görüntü), dosyası olduğu gibi (prepRaceMedia). Başlıktaki ayar düğmesi (MediaSettingsButton): video kalitesi ve telefonda
// tutulanların boyutu / Telefondan sil. Sayaçlı kamera kalktı (Seyhun 2026-10-22: "direkt iPhone kamerasını kullanalım"); an yine dosyanın zamanından. Video en çok 2 dk; sırayla Storage'a yüklenir ve yarışa yazılır.
// Start sayacı sürerken çekilen, starta göre anıyla kaydedilir; liste yarışa ve ana göre gruplu
// ("2. yarış · Son 1 dakika", lib/raceLive.js mediaGroups), küçük resimde "−0:42" / "+12:30". Dokununca büyük açılır:
// yarıştaki sporcular etiketlenir (dokun ekle/çıkar), Paylaş, Düzelt (yarış ve an), Sil. Etiketli varsa üstte sporcu süzgeci.
// Çekilen hemen kaydedilir (önce gözden geçirme yok). file0: alttaki Kayıt ile çekilen dosya (işlenince onFileDone).
// Yüklenen ve yüklenmekte olan kayıtlar sayfa genelinde tutulur: sekme değişince Medya yeniden açılır, telefonda bekleyen kayıt (yüklemesi
// eski sekmede sürerken) yeniden sıraya girip ikinci kez yükleniyordu (Seyhun 2026-10-22: "aynı videonun iki kaydı düşüyor")
const noSub = () => () => {};
const INFO_KEY = "sa-medya-bilgi3"; // 2026-10-26: iPhone uygulamasında aslı Fotoğraflar'da; yeni yazı bir kez daha görünür
// Çekim ayarları başlıkta (Seyhun 2026-10-22, örnek yaris-tasarim/medya/medya-ust-bos-yukleniyor.png): Kayıt zaten alt sekmelerin yanında;
// başlıktaki düğme Medya'nın "Çekim" penceresini açar (video kalitesi, telefonda tutulanlar, Telefondan sil)
const SET_EV = "sa-medya-ayar";
// Adlı düğme (Seyhun 2026-10-28: adsız ayar simgesi yerine "Çekim")
export const openMediaSettings = () => window.dispatchEvent(new Event(SET_EV));
export function MediaSettingsButton({ dark = false }) {
  const open = openMediaSettings;
  if (!dark) return <Button variant="secondary" size="sm" onClick={open}>Çekim</Button>;
  return (
    <button type="button" onClick={open} data-press className="h-10 shrink-0 rounded-full bg-white/15 px-3.5 text-[0.875rem] font-semibold text-white active:translate-y-px active:bg-white/25">
      Çekim
    </button>
  );
}
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
const tried = new Set();
// Videonun küçük resmi çekilir çekilmez telefonda yapılır (listede hemen görünür; Seyhun 2026-10-22: iPhone videolarının ön izlemesi
// çıkmıyordu), aynısı yüklemede de kullanılır: kayıt no → Promise<Blob|null>
const posterJobs = new Map(); // bu açılışta küçük resmi denenen kayıtlar (olmazsa yeniden denenmez)

export function MediaTab({ orgId, race, day, live, ours = [], onChange, file0 = null, onFileDone }) {
  const toast = useToast();
  const [busy, setBusy] = useState(""); // ilerleme yazısı
  const [pending, setPending] = useState(0); // sırada bekleyen kayıt
  const queue = useRef(Promise.resolve());
  const [waiting, setWaiting] = useState([]); // telefonda bekleyen (yüklenemeyen) kayıtlar
  // Yüklenenler listede hemen, telefondaki önizlemesiyle (Seyhun 2026-10-21, örnek yaris-tasarim/medya/yukleme.png): üstünde dolan halka,
  // bitince kısa ✓. ups: yüklenen/bekleyen kayıtlar { [id]: { rec, url, p, err } }; mine: bu telefonda çekilip yüklenen künye → yerel dosya
  const { ups, mine, kept } = useSyncExternalStore(upSub, upGet, () => blankUps);
  const setUps = (f) => upSet((x) => ({ ...x, ups: f(x.ups) }));
  const setMine = (f) => upSet((x) => ({ ...x, mine: f(x.mine) }));
  const shooting = useShooting(); // iPhone kamerasında çekilen, hazırlanıyor (shooting.js)
  const [tick, setTick] = useState(0); // eski kayıtların küçük resmi: biri bitince sıradaki
  const up = (id, f) => setUps((u) => (u[id] ? { ...u, [id]: { ...u[id], ...f(u[id]) } } : u));
  const addUp = (rec, err = false) => {
    setUps((u) => (u[rec.id] ? u : { ...u, [rec.id]: { rec, url: URL.createObjectURL(rec.orig || rec.blob), p: err ? null : 0, err } }));
    if (rec.kind !== "video" || posterJobs.has(rec.id)) return;
    const job = posterOf(rec.blob, "video");
    posterJobs.set(rec.id, job);
    job.then((b) => b && up(rec.id, () => ({ pic: URL.createObjectURL(b) })));
  };
  const [more, setMore] = useState(false); // Çekim: video kalitesi, telefonda tutulanlar
  const [vq, setVq] = useState("hi");
  useEffect(() => setVq(readVideoQ()), [more]);
  useEffect(() => {
    const f = () => setMore(true);
    window.addEventListener(SET_EV, f);
    return () => window.removeEventListener(SET_EV, f);
  }, []);
  const [openId, setOpen] = useState("");
  const [who, setWho] = useState("");
  const todays = live.media.filter((m) => dayOf(m.at) === day);
  const tagged = ours.filter((a) => todays.some((m) => m.ath.includes(a.id)));
  const pick = tagged.some((a) => a.id === who) ? who : "";
  const upItems = pick ? [] : Object.values(ups).filter((x) => x.rec.raceId === race.id).map(({ rec, url, p, err, pic }) => ({ id: rec.id, kind: rec.kind, at: rec.at, dur: rec.dur, ...rec.mom, u: { url, p, err, pic } }));
  const open = live.media.find((m) => m.id === openId) || upItems.find((m) => m.id === openId) || null;
  const going = upItems.filter((x) => !x.u.err);
  const justDone = Object.values(mine).some((x) => x.done);
  const groups = mediaGroups([...mediaOf(live.media, pick), ...upItems], live.starts, day);
  const titleOf = new Map(groups.flatMap((g) => g.items.map((m) => [m.id, g.title])));
  const gallery = mediaByRace([...mediaOf(live.media, pick), ...upItems], live.starts, day);
  const count = (xs) => [xs.filter((m) => m.kind === "video").length, xs.filter((m) => m.kind !== "video").length].map((n, k) => n && `${n} ${k ? "fotoğraf" : "video"}`).filter(Boolean).join(" · ");
  // Bilgi kartı bir kez (Seyhun 2026-10-22): ✕'e basınca bu telefonda bir daha çıkmaz
  const [info, setInfo] = useState(false);
  const app = useSyncExternalStore(noSub, hasCamera, () => false); // iPhone uygulaması: aslı Fotoğraflar'a gider (VeloraKamera)
  useEffect(() => {
    try {
      if (!localStorage.getItem(INFO_KEY)) setInfo(true);
    } catch {}
  }, []);
  const closeInfo = () => {
    setInfo(false);
    try {
      localStorage.setItem(INFO_KEY, "1");
    } catch {}
  };
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
      // Büyük iPhone videosu: buluta önce akışa uygun 720p kopyası hazırlanır (halkanın ilk yarısı), aslı telefonda kalır
      let cl = rec;
      if (rec.big && rec.kind === "video") {
        const c = await cloudCopy(rec.blob, rec.type, (p) => up(rec.id, () => ({ p: p * 0.5 })));
        if (c.blob !== rec.blob) cl = { ...rec, blob: c.blob, type: c.type, orig: rec.blob };
      }
      const half = cl !== rec;
      const meta = await addRaceMedia(orgId, race.id, { ...cl, posterP: posterJobs.get(rec.id) }, rec.at, (p) => up(rec.id, () => ({ p: half ? 0.5 + p * 0.5 : p })), { ...rec.mom, dur: rec.dur, ...(rec.asset ? { asset: rec.asset } : {}) });
      done.add(rec.id);
      await keepLocal({ id: meta.id, raceId: race.id, kind: rec.kind, size: (cl.orig || cl.blob).size, blob: cl.orig || cl.blob });
      await dropPending(rec.id);
      upSet((x) => {
        const { [rec.id]: u, ...rest } = x.ups;
        return { ups: rest, mine: u ? { ...x.mine, [meta.id]: { url: u.url, done: true } } : x.mine, kept: { ...x.kept, [meta.id]: { kind: rec.kind, size: rec.blob.size } } };
      });
      setTimeout(() => setMine((m) => (m[meta.id] ? { ...m, [meta.id]: { ...m[meta.id], done: false } } : m)), 4000);
      setOpen((o) => (o === rec.id ? meta.id : o)); // yüklenirken izleniyorsa izleme sürer
      onChange((l) => ({ media: [...l.media, meta] }));
      setWaiting((w) => w.filter((x) => x.id !== rec.id));
    } catch (e) {
      const err = errText(e);
      console.warn("[raceMedia] yüklenemedi", e);
      await putPending({ ...rec, err });
      setWaiting((w) => [...w.filter((x) => x.id !== rec.id), { ...rec, err }]);
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
  // orig: küçültülmeden önceki dosya (iPhone videosu); telefonda o tutulur ve izlenir (çekildiği kalitede), buluta küçüğü gider
  // asset: iPhone uygulamasında aslının Fotoğraflar'daki kimliği (Velora'dan silinince oradan da silinir)
  const keep = async (m, at, mom, before = 0, orig = null, asset = "") => {
    const rec = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, raceId: race.id, at, kind: m.kind, type: m.type, blob: m.blob, ...(orig && orig !== m.blob ? { orig } : {}), dur: m.dur || 0, ...(m.big ? { big: true } : {}), ...(asset ? { asset } : {}), mom, before, err: "" };
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
  // An: yarış satırından; yarış yoksa süren start sayacından (düz start, "+ Yarış yap" denmemiş)
  const momentFor = (at) => momentAt(at, live.starts) || momentOf(at, readTimer());
  // iPhone kamerasıyla çekilen: an (startan beri / son 1 dakika…) dosyanın zamanından hesaplanır; dosyanın zamanı bu güne aitse o, değilse şimdi
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
      await keep(m, at0, at0 === at ? mom : momentFor(at0), file.size, m.kind === "video" ? file : null, file.asset || "");
    } catch (e) {
      toast(e?.message || "Kaydedilemedi");
      setBusy("");
    }
    setShooting(null);
  };
  // Alttaki Kayıt ile (başka sekmede) çekilen dosya burada işlenir
  useEffect(() => {
    if (!file0 || seenFiles.has(file0)) return;
    seenFiles.add(file0);
    take(file0);
    onFileDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file0]);

  const drop = (m) => {
    if (!confirm(m.kind === "video" ? "Video silinsin mi?" : "Fotoğraf silinsin mi?")) return;
    setOpen("");
    const rest = live.media.filter((x) => x.id !== m.id);
    onChange({ media: rest }, () => dropRaceMedia(orgId, race.id, m, rest));
    if (m.asset) deletePhotos([m.asset]); // aslı Fotoğraflar'dan da (iPhone onay sorar; Seyhun 2026-10-26)
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
  // İndir (Seyhun 2026-10-22: "telefona indir butonu olsun, orijinal haliyle"): telefonda saklanan aslı (m.local), yoksa buluttaki.
  // iPhone paylaşım ekranında "Videoyu Kaydet" ile Fotoğraflar'a gider. Büyük dosya inerken dokunuş süresi geçerse iPhone paylaşımı
  // açmaz: hazırlanan dosya saklanır, ikinci dokunuşta hemen açılır.
  const ready = useRef(null);
  const save = async (m) => {
    try {
      let f = ready.current?.id === m.id ? ready.current.f : null;
      if (!f) {
        setBusy("Hazırlanıyor");
        const blob = await (await fetch(m.local || m.url)).blob();
        const type = blob.type || m.type || (m.kind === "video" ? "video/mp4" : "image/jpeg");
        const ext = m.kind !== "video" ? "jpg" : type.includes("webm") ? "webm" : type.includes("quicktime") ? "mov" : "mp4";
        f = new File([blob], `${race.name || "yarış"} ${hm(m.at).replace(":", ".")}.${ext}`, { type });
        ready.current = { id: m.id, f };
        setBusy("");
      }
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f] });
      else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        a.click();
      }
      ready.current = null;
    } catch (e) {
      setBusy("");
      if (e?.name === "NotAllowedError" && ready.current?.id === m.id) toast("Hazır, yeniden İndir'e dokun");
      else if (e?.name !== "AbortError") toast("İndirilemedi");
    }
  };
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
      {info && (
        <div className={`${card} relative mt-3 py-3 pl-3.5 pr-11 text-[0.875rem] leading-snug`}>
          <b className="mb-0.5 block font-semibold">Videolar nerede saklanır?</b>
          {app
            ? "Aslı iPhone'un Fotoğraflar'ına kaydedilir. Buluta 1080p kopyası yüklenir, silinene kadar kalır. Velora'dan silince Fotoğraflar'daki aslı da silinir (iPhone onay sorar)."
            : `Telefonda 7 gün saklanır, buluta da yüklenir. Bulutta ${VIDEO_Q[vq].label} tutulur. Çekildiği kalitede kalsın istersen 7 gün içinde İndir ile telefonuna kaydet.`}
          <button type="button" onClick={closeInfo} aria-label="Bilgiyi kapat" className="absolute right-1.5 top-1.5 grid size-9 place-items-center rounded-full text-mut active:bg-bg">
            <Icon name="x" className="size-5" />
          </button>
        </div>
      )}
      {/* Yükleme sürerken ne kadarının gittiği yazar (Seyhun 2026-10-22: "yüklenip yüklenmediğini bilmiyorum"); sayfayla kaymaz,
          alttaki sekmelerin hemen üstünde sabit durur (Seyhun 2026-10-23) */}
      {shooting && !going.length && (
        <p role="status" style={{ bottom: "calc(var(--bar-b, env(safe-area-inset-bottom)) + 0.5rem)" }} className="pointer-events-none fixed inset-x-0 z-30 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-line bg-card px-3.5 py-1.5 text-center text-[0.8125rem] font-semibold text-mut shadow-[0_2px_12px_rgba(38,40,44,.08)]">
          {shooting.kind === "video" ? (app ? "Video Fotoğraflar'a kaydediliyor" : "Video hazırlanıyor") : "Fotoğraf hazırlanıyor"}
        </p>
      )}
      {(going.length > 0 || justDone) && (
        <p role="status" style={{ bottom: "calc(var(--bar-b, env(safe-area-inset-bottom)) + 0.5rem)" }} className="pointer-events-none fixed inset-x-0 z-30 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-full border border-line bg-card px-3.5 py-1.5 text-center text-[0.8125rem] font-semibold tabular-nums text-mut shadow-[0_2px_12px_rgba(38,40,44,.08)]">{going.length ? `${going.length} ${going.every((x) => x.kind === "video") ? "video" : going.every((x) => x.kind !== "video") ? "fotoğraf" : "kayıt"} buluta gönderiliyor · %${Math.round((going.reduce((a, x) => a + (x.u.p || 0), 0) / going.length) * 100)}` : "Buluta gönderildi ✓"}</p>
      )}
      {/* Çekim bitti, kayıt hazırlanıyor: hemen bir kare (Seyhun 2026-10-28: "çektim, baktım hiçbir şey yok") */}
      {shooting && (
        <section>
          <div className="mb-1.5 mt-4 px-1">
            <b className="text-[1.0625rem] font-semibold">Yeni çekim</b>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <div role="status" className="relative grid aspect-square place-items-center overflow-hidden rounded-lg bg-[#11203a] text-white">
              <span className="flex flex-col items-center gap-1.5">
                <Icon name="load" className="size-6 animate-spin" />
                <span className="text-[0.6875rem] font-semibold">Kaydediliyor</span>
              </span>
            </div>
          </div>
        </section>
      )}
      {!groups.length && !shooting && (
        <div className="fade-in px-6 pt-16 text-center">
          <div className="mx-auto mb-4 grid size-[4.75rem] place-items-center rounded-3xl bg-acc/10 text-acc">
            <Icon name="image" className="size-9" />
          </div>
          <b className="block text-[1.1875rem] font-semibold">{day === dayOf(new Date().toISOString()) ? "Bugün kayıt yok" : "Bu günde kayıt yok"}</b>
          <p className="mt-1.5 text-[0.9375rem] text-mut">Kayıt&apos;a dokununca iPhone kamerası açılır.</p>
        </div>
      )}
      {/* iPhone galerisi gibi (Seyhun 2026-10-22 onayı, yaris-tasarim/medya/galeri-iphone.png): yarışa göre, kenardan kenara 4'lü sıkı ızgara */}
      {gallery.map((g) => (
        <section key={g.key}>
          <div className="mb-1.5 mt-4 flex items-baseline justify-between gap-3 px-1">
            <b className="truncate text-[1.0625rem] font-semibold">{g.title}</b>
            <span className="shrink-0 text-[0.8125rem] text-mut">{count(g.items)}</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {g.items.map((m) => (
              <button key={m.id} type="button" onClick={() => setOpen(m.id)} className="relative aspect-square overflow-hidden rounded-lg bg-line active:opacity-80">
                <Thumb kind={m.kind} url={m.url} thumb={m.thumb || m.u?.pic} dur={m.dur} local={m.u?.url || mine[m.id]?.url} up={m.u && !m.u.err ? m.u.p : null} err={!!m.u?.err} done={!!mine[m.id]?.done} />
                {m.phase && <span className="absolute left-1 top-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[0.6875rem] font-semibold tabular-nums text-white">{momentBadge(m)}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}

      <MediaViewer
        // Yüklenmekte olan da hemen izlenir (Seyhun 2026-10-22: "telefonda tuttuğumuzu kullanamıyoruz"): telefondaki dosyadan oynar
        items={gallery.flatMap((g) => g.items).map((m) => (m.u ? { ...m, url: m.u.url, local: m.u.url, thumb: m.u.pic, up: m.u.err ? -1 : m.u.p } : mine[m.id] ? { ...m, local: mine[m.id].url } : m))}
        id={open ? open.id : ""}
        onPick={setOpen}
        onClose={() => setOpen("")}
        label={(m) => titleOf.get(m.id) || "" /* üstte grubun adı (yarış · evre); an zaten görüntünün üstünde yazar, saat yazılmaz */}
        ours={ours}
        onTag={tag}
        onShare={share}
        onSave={save}
        busy={busy}
        onDrop={drop}
        starts={live.starts}
        onFix={fix}
      />

      {busy && (
        <Bar>
          <div className="grid h-14 w-full place-items-center rounded-2xl border border-line bg-card text-[1rem] font-semibold">{pending > 1 ? `${busy} · ${pending - 1} sırada` : busy}</div>
        </Bar>
      )}
      <Sheet open={more} onClose={() => setMore(false)} title="Çekim">
        <p className="mb-2 px-1 text-[0.9375rem] font-semibold">Video kalitesi</p>
        <Seg value={vq} onChange={(k) => (setVq(k), saveVideoQ(k))} options={[["hi", "1080p"], ["lo", "720p"]]} />
        <p className="mt-4 px-1 text-[0.9375rem] tabular-nums">{stockText}</p>
        {stock.length > 0 && (
          <Button variant="secondary" onClick={() => (setMore(false), clearPhone())} className="mt-2">
            Telefondan sil
          </Button>
        )}
      </Sheet>
    </>
  );
}
