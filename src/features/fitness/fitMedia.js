"use client";

// Fitness hareketine eklenen fotoğraf ve kısa video (hareketin nasıl yapıldığı). Dosyalar Firebase Storage'da:
// orgs/{org}/fitMedia/{id} (kural storage.rules: ana hesap yazar, aynı kulüpteki hesaplar okur).
// Harekette yalnız künye durur: media [{ id, type, size, kind photo|video, url }] (en çok 3). url indirme adresidir;
// video oradan akarak oynar (baştan sona inmesi beklenmez); dosya tarayıcı önbelleğinde kalır.
// Eski düzen (Firestore'da 900 KB'lık parçalar, url yok) yalnız okunur.
// Fotoğraf 1280 px JPEG'e küçültülür. Video en çok 60 sn; 25 MB'tan büyükse telefonda 640 px'e küçültülerek yeniden kaydedilir
// (video süresi kadar sürer); küçültülemezse en çok 80 MB kabul edilir.
import { collection, getDocs } from "firebase/firestore";
import { deleteObject, getMetadata, getStorage, listAll, ref as sref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { app, db } from "@/lib/firebase/clientApp";
import { compressImage } from "@/lib/image";
import { dropRaceFile, getRaceFile, saveRaceFile } from "@/features/athletes/raceFiles";

export const MEDIA_MAX = 3;
const VIDEO_SEC = 60;
const VIDEO_OK = 25 * 1024 * 1024;
const VIDEO_MAX = 80 * 1024 * 1024;
const store = () => getStorage(app);
const path = (orgId, id) => `orgs/${orgId}/fitMedia/${id}`;
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const cacheKey = (id) => `fitm:${id}`;
// Listede görünen küçük önizleme yalnız bu telefonda (IndexedDB) saklanır: liste her açılışta fotoğraf indirmez
const thumbKey = (id) => `fitt:${id}`;

export const isVideoFile = (f) => /^video\//.test(f?.type || "") || /\.(mov|mp4|m4v|webm)$/i.test(f?.name || "");
const isImageFile = (f) => /^image\//.test(f?.type || "") || /\.(jpe?g|png|heic|heif|webp)$/i.test(f?.name || "");

export function videoMeta(url) {
  return new Promise((res, rej) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.onloadedmetadata = () => res(v);
    v.onerror = () => rej(new Error("Video açılamadı"));
    v.src = url;
  });
}

export function recType() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]) if (MediaRecorder.isTypeSupported?.(t)) return t;
  return "";
}

// Videoyu 640 px'e (max) küçültüp yeniden kaydeder (sessiz; hareket gösterimi; yarış videosu da kullanır). onProg(0..1)
// audio: ses de kaydedilir (yarış videosu; Seyhun 2026-10-20). Ses çalınmaz, yalnız kayda gider; olmazsa sessiz kaydedilir.
export async function shrinkVideo(v, onProg, max = 640, bps = 900_000, audio = false) {
  const type = recType();
  const c = document.createElement("canvas");
  if (!type || !c.captureStream) throw new Error("no-shrink");
  const k = Math.min(1, max / Math.max(v.videoWidth || max, v.videoHeight || max));
  c.width = Math.max(2, Math.round((v.videoWidth || max) * k / 2) * 2);
  c.height = Math.max(2, Math.round((v.videoHeight || 360) * k / 2) * 2);
  const ctx = c.getContext("2d");
  const stream = c.captureStream(30);
  let ac = null;
  if (audio) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ac.createMediaStreamDestination();
      ac.createMediaElementSource(v).connect(dest);
      v.muted = false;
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch (e) {
      console.warn("[fitMedia] ses eklenemedi", e);
      v.muted = true;
    }
  }
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: bps });
  const chunks = [];
  rec.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
  const done = new Promise((res) => (rec.onstop = res));
  let on = true;
  const draw = () => {
    if (!on) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    onProg?.(Math.min(1, v.currentTime / (v.duration || 1)));
    requestAnimationFrame(draw);
  };
  v.currentTime = 0;
  rec.start(1000);
  await ac?.resume().catch(() => {});
  await v.play().catch(() => ((v.muted = true), v.play()));
  draw();
  await new Promise((res) => (v.onended = res));
  on = false;
  rec.stop();
  await done;
  ac?.close().catch(() => {});
  const blob = new Blob(chunks, { type: type.split(";")[0] });
  if (!blob.size) throw new Error("no-shrink");
  return blob;
}

// Seçilen dosyayı saklanacak hâle getirir: { blob, type, kind }
export async function prepMedia(file, onProg) {
  if (isImageFile(file)) {
    const img = await compressImage(file, 1280, 0.75);
    const bytes = Uint8Array.from(atob(img.base64), (ch) => ch.charCodeAt(0));
    return { blob: new Blob([bytes], { type: "image/jpeg" }), type: "image/jpeg", kind: "photo" };
  }
  if (!isVideoFile(file)) throw new Error("Fotoğraf ya da video seç.");
  const url = URL.createObjectURL(file);
  try {
    const v = await videoMeta(url);
    if (v.duration && isFinite(v.duration) && v.duration > VIDEO_SEC + 1) throw new Error(`Video en çok ${VIDEO_SEC} saniye olabilir.`);
    if (file.size <= VIDEO_OK) return { blob: file, type: file.type || "video/mp4", kind: "video" };
    try {
      const blob = await shrinkVideo(v, onProg);
      if (blob.size < file.size) return { blob, type: blob.type, kind: "video" };
    } catch (e) {
      if (e.message !== "no-shrink") console.warn("[fitMedia] küçültülemedi", e);
    }
    if (file.size > VIDEO_MAX) throw new Error("Video çok büyük (en çok 80 MB). Daha kısa çek.");
    return { blob: file, type: file.type || "video/mp4", kind: "video" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Storage'a yükler, künyeyi döndürür. onProg(0..1)
export async function saveMedia(orgId, m, onProg) {
  const id = newId();
  const r = sref(store(), path(orgId, id));
  const task = uploadBytesResumable(r, m.blob, { contentType: m.type, cacheControl: "private, max-age=31536000" });
  await new Promise((res, rej) => task.on("state_changed", (s) => onProg?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0), rej, res));
  const url = await getDownloadURL(r);
  makeThumb(m.blob, m.kind)
    .then((b) => b && saveRaceFile({ id: thumbKey(id), blob: b, name: id }))
    .catch(() => {});
  return { id, kind: m.kind, type: m.type, size: m.blob.size, parts: 1, url };
}

// Küçük önizleme (240 px JPEG): fotoğraftan ya da videonun ilk karesinden, yüklenen dosyanın kendisinden
async function makeThumb(blob, kind) {
  if (kind === "photo") {
    const img = await compressImage(blob, 240, 0.7);
    return new Blob([Uint8Array.from(atob(img.base64), (ch) => ch.charCodeAt(0))], { type: "image/jpeg" });
  }
  const url = URL.createObjectURL(blob);
  try {
    const v = await videoMeta(url);
    await new Promise((res) => {
      v.onseeked = res;
      v.currentTime = Math.min(0.2, (v.duration || 1) / 2);
    });
    const k = Math.min(1, 240 / Math.max(v.videoWidth || 240, v.videoHeight || 240));
    const c = document.createElement("canvas");
    c.width = Math.max(2, Math.round((v.videoWidth || 240) * k));
    c.height = Math.max(2, Math.round((v.videoHeight || 240) * k));
    c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob(res, "image/jpeg", 0.7));
  } finally {
    URL.revokeObjectURL(url);
  }
}
// Bu telefondaki önizleme. Yoksa (başka cihazda ya da önizleme öncesi yüklenen) fotoğraf bir kez indirilip önizlemesi
// yapılır; Storage tarayıcıdan indirmeye izin vermezse (CORS) bu oturumda bir daha denenmez, null döner.
let noFetch = false;
export async function getThumb(m) {
  const hit = await getRaceFile(thumbKey(m.id));
  if (hit?.blob) return hit.blob;
  if (noFetch || m.kind !== "photo" || !m.url || m.link) return null;
  try {
    const res = await fetch(m.url);
    if (!res.ok) return null;
    const b = await makeThumb(await res.blob(), "photo");
    if (b) saveRaceFile({ id: thumbKey(m.id), blob: b, name: m.id });
    return b;
  } catch {
    noFetch = true;
    return null;
  }
}

// Gösterilecek adres: Storage'da ise indirme adresi (tarayıcı önbelleğinde 1 yıl kalır), eski düzende parçalardan blob (bu cihazda saklanır).
// Dönüş { src, blob } (blob varsa çağıran URL.createObjectURL yapar)
export async function loadMedia(orgId, meta) {
  if (meta.link) return { src: meta.url };
  const hit = await getRaceFile(cacheKey(meta.id));
  if (hit?.blob) return { blob: hit.blob };
  if (meta.url) return { src: meta.url };
  const snap = await getDocs(collection(db, "orgs", orgId, "fitMedia", meta.id, "parts"));
  const list = snap.docs.sort((a, b) => a.id.localeCompare(b.id)).map((d) => d.data().data?.toUint8Array?.());
  if (!list.length || list.length < (meta.parts || 1) || list.some((x) => !x)) throw new Error("Dosya bulunamadı");
  const blob = new Blob(list, { type: meta.type || (meta.kind === "video" ? "video/mp4" : "image/jpeg") });
  saveRaceFile({ id: cacheKey(meta.id), blob, name: meta.id });
  return { blob };
}

// Storage'da duran ama hiçbir harekete bağlı olmayan dosyalar (used: bağlı kimlikler). Dönüş: künyeler, yeniden eskiye
// (at: yüklenme zamanı; kaydedilirken cleanMedia atar)
export async function looseMedia(orgId, used = new Set(), max = 60) {
  const all = await listAll(sref(store(), `orgs/${orgId}/fitMedia`));
  const free = all.items.filter((it) => !used.has(it.name)).slice(0, max);
  const out = await Promise.all(
    free.map(async (it) => {
      try {
        const [md, url] = await Promise.all([getMetadata(it), getDownloadURL(it)]);
        const type = md.contentType || "";
        return { id: it.name, kind: /^video\//.test(type) ? "video" : "photo", type, size: md.size || 0, parts: 1, url, at: md.timeCreated || "" };
      } catch {
        return null;
      }
    }),
  );
  return out.filter(Boolean).sort((a, b) => String(b.at).localeCompare(String(a.at)));
}

// Siler; hata sessiz
export async function dropMedia(orgId, meta) {
  if (!meta?.id || meta.link) return;
  if (meta.url) await deleteObject(sref(store(), path(orgId, meta.id))).catch(() => {});
  dropRaceFile(cacheKey(meta.id));
  dropRaceFile(thumbKey(meta.id));
}

// Kulübün bütün fitness dosyalarını siler (Fitness'ı sıfırla). Dönüş: silinen dosya sayısı
export async function dropAllMedia(orgId) {
  let n = 0;
  try {
    const all = await listAll(sref(store(), `orgs/${orgId}/fitMedia`));
    await Promise.all(
      all.items.map((it) =>
        deleteObject(it)
          .then(() => {
            n++;
            dropRaceFile(cacheKey(it.name));
            dropRaceFile(thumbKey(it.name));
          })
          .catch(() => {}),
      ),
    );
  } catch {}
  return n;
}
