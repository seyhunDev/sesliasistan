"use client";

// Yarış multimedya sayfasının kaydı (lib/raceLive.js): orgs/{org}/raceLive/{yarışId} belgesi (rüzgâr, startlar, fotoğraf/video künyeleri)
// ve sonuç belgesinden okunan bütün liste orgs/{org}/raceLive/{yarışId}/sheets/{belgeId} (genel sıralama; kulüp, doğum yılı, puan).
// Yarış belgesinden ayrı durur: yarış sayfası kaydedince bu alanlar ezilmez. Fotoğraf ve video Storage'da orgs/{org}/raceMedia/{id}
// (kural storage.rules: yalnız ana hesap). Fotoğraf 2048 px JPEG; video (en çok 2 dk) iPhone'un çektiği gibi (sesli) saklanır, çok büyükse küçültülür (prepRaceMedia).
import { arrayUnion, collection, doc, getDoc, getDocs } from "firebase/firestore";
import { deleteDoc, setDoc } from "@/lib/firebase/write";
import { deleteObject, getDownloadURL, getStorage, ref as sref, uploadBytesResumable } from "firebase/storage";
import { app, db } from "@/lib/firebase/clientApp";
import { compressImage } from "@/lib/image";
import { cleanBuoys, cleanDays, cleanLive, cleanMedia, cleanStarts, cleanWind } from "@/lib/raceLive";
import { isVideoFile, shrinkVideo, videoMeta } from "@/features/fitness/fitMedia";

const VIDEO_SEC = 120;
const VIDEO_MAX = 58 * 1024 * 1024; // storage.rules raceMedia: 60 MB (Seyhun 2026-10-22: "60 MB kalsın, 80 saniyelik kaliteli video yeter")

// Video kalitesi (Seyhun 2026-10-22: "videolar niye kalitesiz, en az 1080p"; Storage sınırı 60 MB kalır): buluta giden kopyanın kalitesi,
// bu telefonda seçilir (Medya › Çekim). hi 1080p (varsayılan): 1920 px en çok 5 Mbit, uzun videoda 60 MB'a sığacak kadar düşer (80 sn'ye kadar
// tam, 2 dk ≈ 3,6 Mbit). lo 720p: 2,5 Mbit. iPhone kamerasının aslı telefonda çekildiği kalitede kalır (İndir).
export const VIDEO_Q = {
  hi: { px: 1920, cloud: 5_000_000, label: "1080p" },
  lo: { px: 1280, cloud: 2_500_000, label: "720p" },
};
const QKEY = "sa-cam-q";
export const readVideoQ = () => {
  try {
    return localStorage.getItem(QKEY) === "lo" ? "lo" : "hi";
  } catch {
    return "hi";
  }
};
export const saveVideoQ = (q) => {
  try {
    localStorage.setItem(QKEY, q);
  } catch {}
};
const live = (orgId, id) => doc(db, "orgs", orgId, "raceLive", id);
const store = () => {
  const s = getStorage(app);
  s.maxUploadRetryTime = 60e3;
  return s;
};
const mpath = (orgId, id) => `orgs/${orgId}/raceMedia/${id}`;
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function loadLive(orgId, id) {
  const snap = await getDoc(live(orgId, id));
  return cleanLive(snap.exists() ? snap.data() : {});
}

// Medya sayfası (/media): bütün antrenman (ant-<planId>) ve yarış belgelerinin fotoğraf/video künyeleri. Dönüş [{ id, media }] (boşlar yok)
export async function loadAllMedia(orgId) {
  const snap = await getDocs(collection(db, "orgs", orgId, "raceLive"));
  return snap.docs.map((d) => ({ id: d.id, media: cleanMedia(d.data()?.media) })).filter((x) => x.media.length);
}
export const addWind = (orgId, id, w) => setDoc(live(orgId, id), { wind: arrayUnion(cleanWind([w])[0]) }, { merge: true });
export const saveWind = (orgId, id, list) => setDoc(live(orgId, id), { wind: cleanWind(list) }, { merge: true });
export const saveBuoys = (orgId, id, list) => setDoc(live(orgId, id), { buoys: cleanBuoys(list) }, { merge: true });
export const saveDays = (orgId, id, list) => setDoc(live(orgId, id), { days: cleanDays(list) }, { merge: true });
export const saveStarts = (orgId, id, list) => setDoc(live(orgId, id), { starts: cleanStarts(list) }, { merge: true });
// Bütün künye listesi (sporcu etiketi değişince)
export const saveMedia = (orgId, id, list) => setDoc(live(orgId, id), { media: cleanMedia(list) }, { merge: true });

// Seçilen ya da çekilen dosya → saklanacak hâl: { blob, type, kind }. onProg(0..1) küçültme ilerlemesi
// Kurallar (Seyhun 2026-10-20: "iPhone'un kendi kamerası"): fotoğraf 2048 px JPEG; video en çok 2 dakika, iPhone'un çektiği dosya
// olduğu gibi saklanır (ses, kalite ve yön korunur). Storage sınırını (60 MB) aşarsa 1280 px'e sesli küçültülür (video süresi kadar sürer).
const RAW_MAX = 55 * 1024 * 1024;
export async function prepRaceMedia(file, onProg) {
  if (!isVideoFile(file)) {
    const img = await compressImage(file, 2048, 0.85);
    const bytes = Uint8Array.from(atob(img.base64), (ch) => ch.charCodeAt(0));
    return { blob: new Blob([bytes], { type: "image/jpeg" }), type: "image/jpeg", kind: "photo" };
  }
  const url = URL.createObjectURL(file);
  try {
    const v = await videoMeta(url);
    if (v.duration && isFinite(v.duration) && v.duration > VIDEO_SEC + 1) throw new Error("Video en çok 2 dakika olabilir. Daha kısa çek.");
    const dur = v.duration && isFinite(v.duration) ? Math.round(v.duration) : 0;
    const type = file.type || (/\.mov$/i.test(file.name || "") ? "video/quicktime" : "video/mp4");
    // big: buluta akışa uygun küçük kopyası gider (cloudCopy; yüklemeden hemen önce, sırada). Dosya telefonda hemen izlenir.
    const big = dur ? (file.size * 8) / dur > STREAM_BPS * 1.6 : file.size > 15 * 1024 * 1024;
    return { blob: file, type, kind: "video", dur, big };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Buluttaki video (Seyhun 2026-10-22: "datadan alınan videolar çok yavaş, YouTube gibi gösterirken yüklensin"): iPhone videosu saniyede
// 10-50 Mbit; denizde telefon interneti bunu oynatırken indiremiyor, oynatıcı bekliyordu. Buluta seçilen kalitede kopya gider (VIDEO_Q):
// inerken hemen oynar (MP4 parça parça yazılır), yükleme de kısalır. Aslı telefonda 7 gün (İndir). Küçültme video süresi kadar sürer;
// olmazsa sınırın altındaki aslı gider. onProg(0..1)
const STREAM_BPS = 2_500_000;
export async function cloudCopy(blob, type, onProg) {
  const url = URL.createObjectURL(blob);
  try {
    const v = await videoMeta(url);
    const q = VIDEO_Q[readVideoQ()];
    // Zaten o kalitede ve sınırın altındaysa aslı gider (yeniden kodlamak yalnız bozar)
    if (v.duration > 0 && (blob.size * 8) / v.duration <= q.cloud * 1.3 && blob.size <= RAW_MAX) return { blob, type };
    // 60 MB'a sığsın: süreye göre bit hızı (ses ve kap payı %12)
    const fit = v.duration > 0 ? Math.floor(((VIDEO_MAX * 8) / v.duration) * 0.88) - 128_000 : q.cloud;
    const small = await shrinkVideo(v, onProg, q.px, Math.min(q.cloud, fit), true);
    if (small.size > VIDEO_MAX) throw new Error("büyük");
    return { blob: small, type: small.type };
  } catch (e) {
    if (e.message !== "no-shrink") console.warn("[raceMedia] küçültülemedi", e);
    if (blob.size <= RAW_MAX) return { blob, type };
    throw new Error("Video çok büyük ve bu telefonda küçültülemedi. Daha kısa çek.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Paylaşmak için sessiz kopya (Seyhun 2026-10-20: "bazılarının sesini kapatmak isteyebilirim"): kayıttaki video sesli kalır.
// Telefon videoyu baştan oynatıp sessiz yeniden kaydeder (video süresi kadar sürer). onProg(0..1)
export async function mutedCopy(blob, onProg) {
  const url = URL.createObjectURL(blob);
  try {
    const v = await videoMeta(url);
    return await shrinkVideo(v, onProg, 1920, 6_000_000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Küçük resim (Seyhun 2026-10-21: "sürekli video yüklemesi olmasın"): listede videonun kendisi yerine ilk karesinden 480 px JPEG.
// Çekilince telefonda hazırlanır, dosyanın yanına `<id>-k` adıyla yüklenir. Olmazsa null (liste eskisi gibi videodan gösterir).
export async function posterOf(blob, kind) {
  const url = URL.createObjectURL(blob);
  try {
    const src = await new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error("zaman")), 15000);
      const ok = (x) => (clearTimeout(t), res(x));
      const no = () => (clearTimeout(t), rej(new Error("açılamadı")));
      if (kind !== "video") {
        const im = new Image();
        im.onload = () => ok(im);
        im.onerror = no;
        im.src = url;
        return;
      }
      // iPhone kamerasının büyük .mov dosyasında Safari veri yüklemeye başlamıyordu (küçük resim çıkmıyordu; Seyhun 2026-10-22):
      // load() çağrılır, üst bilgi gelince kareye gidilir; 1,5 sn'de kare gelmezse sessiz oynatıp durdurmak yüklemeyi başlatır
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.setAttribute("playsinline", "");
      v.preload = "auto";
      let asked = false;
      const seek = () => {
        if (asked) return;
        asked = true;
        v.onseeked = () => ok(v);
        v.currentTime = Math.min(0.3, (isFinite(v.duration) && v.duration > 0 ? v.duration : 1) / 2);
      };
      v.onloadedmetadata = seek;
      v.onloadeddata = seek;
      v.onerror = no;
      v.src = url;
      v.load();
      setTimeout(() => v.readyState < 2 && v.play().then(() => v.pause(), () => {}), 1500);
    });
    const w0 = src.videoWidth || src.naturalWidth;
    const h0 = src.videoHeight || src.naturalHeight;
    if (!w0 || !h0) return null;
    const k = Math.min(1, 480 / Math.max(w0, h0));
    const c = document.createElement("canvas");
    c.width = Math.round(w0 * k);
    c.height = Math.round(h0 * k);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", 0.72));
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
const tpath = (orgId, id) => `${mpath(orgId, id)}-k`;
async function putPoster(orgId, mid, poster) {
  if (!poster) return "";
  try {
    const r = sref(store(), tpath(orgId, mid));
    await uploadBytesResumable(r, poster, { contentType: "image/jpeg", cacheControl: "private, max-age=31536000" });
    return await getDownloadURL(r);
  } catch {
    return "";
  }
}

// Yükler ve yarışa yazar; künyeyi döndürür. at: çekildiği an (ISO); extra: start sayacına göre an (lib/raceLive.js momentOf)
export async function addRaceMedia(orgId, id, m, at, onProg, extra = null) {
  const mid = newId();
  const r = sref(store(), mpath(orgId, mid));
  // Küçük resim yüklemeyle aynı anda hazırlanır (önce yapılınca iPhone'da yükleme 10 sn'ye kadar %0'da bekliyordu; Seyhun 2026-10-22)
  const posterP = (m.posterP || posterOf(m.blob, m.kind)).catch(() => null); // posterP: MediaTab çekilir çekilmez başlattı
  const task = uploadBytesResumable(r, m.blob, { contentType: m.type, cacheControl: "private, max-age=31536000" });
  await new Promise((res, rej) => task.on("state_changed", (s) => onProg?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0), rej, res));
  const thumb = await putPoster(orgId, mid, await posterP);
  const meta = cleanMedia([{ id: mid, kind: m.kind, type: m.type, size: m.blob.size, url: await getDownloadURL(r), at, thumb, ...extra }])[0];
  // Kayıt telefondaki Firestore önbelleğine hemen yazılır; sunucunun onayı zayıf bağlantıda uzun sürer, beklenmez (halka %100'de takılı
  // kalıyordu). Yazma arkada tamamlanır.
  const w = setDoc(live(orgId, id), { media: arrayUnion(meta) }, { merge: true });
  w.catch((e) => console.warn("[raceMedia] künye yazılamadı", e));
  await Promise.race([w, new Promise((res) => setTimeout(res, 3000))]);
  return meta;
}

// rest: kalan liste (arrayRemove birebir aynı nesneyi ister; etiket alanı eklenince eski künyeler eşleşmez)
export async function dropRaceMedia(orgId, id, meta, rest) {
  await setDoc(live(orgId, id), { media: cleanMedia(rest) }, { merge: true });
  await deleteObject(sref(store(), mpath(orgId, meta.id))).catch(() => {});
  if (meta.thumb) await deleteObject(sref(store(), tpath(orgId, meta.id))).catch(() => {});
}

// Küçük resmi olmayan eski kayıt: dosya bir kez indirilir, küçük resim yapılıp yüklenir ve kayda yazılır. Küçük resmin adresini döndürür.
export async function backfillPoster(orgId, id, meta) {
  const res = await fetch(meta.url);
  if (!res.ok) return "";
  const thumb = await putPoster(orgId, meta.id, await posterOf(await res.blob(), meta.kind));
  if (!thumb) return "";
  const l = await loadLive(orgId, id);
  await saveMedia(orgId, id, l.media.map((x) => (x.id === meta.id ? { ...x, thumb } : x)));
  return thumb;
}

// Sonuç belgesinin bütün listesi (genel sıralama)
const sheets = (orgId, id) => collection(db, "orgs", orgId, "raceLive", id, "sheets");
export const saveSheet = (orgId, id, fileId, fleets) => setDoc(doc(sheets(orgId, id), fileId), { fleets, at: new Date().toISOString() });
export const dropSheetDoc = (orgId, id, fileId) => deleteDoc(doc(sheets(orgId, id), fileId)).catch(() => {});
export async function loadSheets(orgId, id) {
  const snap = await getDocs(sheets(orgId, id));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(a.at).localeCompare(String(b.at)));
}

// Denemeleri sıfırla: patch (lib/raceLive.js resetPatch) belgeye yazılır; media boşaltılıyorsa dosyalar da silinir
export async function resetLive(orgId, id, patch, media = []) {
  await setDoc(live(orgId, id), patch, { merge: true });
  if (patch.media) for (const m of media) for (const p of [mpath(orgId, m.id), tpath(orgId, m.id)]) await deleteObject(sref(store(), p)).catch(() => {});
}

// Yarış silinince: dosyalar, listeler ve kayıt
export async function dropLive(orgId, id) {
  const l = await loadLive(orgId, id).catch(() => null);
  for (const m of l?.media || []) for (const p of [mpath(orgId, m.id), tpath(orgId, m.id)]) await deleteObject(sref(store(), p)).catch(() => {});
  const sh = await getDocs(sheets(orgId, id)).catch(() => null);
  for (const d of sh?.docs || []) await deleteDoc(d.ref).catch(() => {});
  await deleteDoc(live(orgId, id)).catch(() => {});
}
