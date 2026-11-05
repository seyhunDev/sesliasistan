"use client";

// Yayın sayfasının işleri (Seyhun 2026-11-01): telefondan seçilen video yarışa yüklenir ve ekrana verilir; videonun eni boyu kayda yazılır
// (herkese açık sayfa dikey videoyu dikey kutuda gösterir). Çekim akışının geri kalanı (yerel kopya, küçük resim kuyruğu) MediaTab'da kalır.
import { RAW_MAX, addRaceMedia, cloudCopy, cloudMedia, prepRaceMedia } from "@/features/athletes/raceLiveStore";
import { keepLocal, listKept } from "@/features/raceMedia/pendingStore";
import { dayOf, momentAt, momentOf } from "@/lib/raceLive";
import { readTimer } from "@/features/training/Countdown";
import { authFetch } from "@/lib/authFetch";
import { compressImage } from "@/lib/image";
import { kindOf } from "@/features/athletes/raceNotice";
import { cleanProgram } from "@/lib/raceProgram";

// Videonun eni boyu (dikey mi yatay mı); okunamazsa { w: 0, h: 0 }
export function videoSize(file) {
  return new Promise((res) => {
    if (!/^video\//.test(file?.type || "") && !/\.(mov|mp4|m4v)$/i.test(file?.name || "")) return res({ w: 0, h: 0 });
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = (w, h) => (URL.revokeObjectURL(url), res({ w, h }));
    v.onloadedmetadata = () => done(v.videoWidth || 0, v.videoHeight || 0);
    v.onerror = () => done(0, 0);
    setTimeout(() => done(v.videoWidth || 0, v.videoHeight || 0), 8000);
    v.src = url;
  });
}

// Dosyayı yarışa yükler; onStep("Hazırlanıyor…" | "Küçültülüyor %40" | "Yükleniyor %70"). Künyeyi döndürür.
export async function uploadForScreen(orgId, raceId, file, starts, onStep) {
  const size = await videoSize(file);
  onStep?.("Hazırlanıyor…");
  const m = await prepRaceMedia(file, (p) => onStep?.(`Küçültülüyor %${Math.round(p * 100)}`));
  let blob = m.blob;
  let type = m.type;
  // Sınıra (55 MB) sığan video olduğu gibi gider; küçültme (video süresi kadar süren yeniden kodlama) yalnız sığmayana
  // (Seyhun 2026-11-01: "küçültülüyor dedi, öyle kaldı, video yüklenmedi")
  if (m.kind === "video" && blob.size > RAW_MAX) {
    const c = await cloudCopy(blob, type, (p) => onStep?.(`Küçültülüyor %${Math.round(p * 100)}`));
    blob = c.blob;
    type = c.type;
  }
  const { at, extra } = takenAt(file, m, size, starts);
  return addRaceMedia(orgId, raceId, { blob, type, kind: m.kind }, at, (p) => onStep?.(`Yükleniyor %${Math.round(p * 100)}`), extra);
}
// Çekilen anı (dosya zamanı kaydın bitişi) ve künyeye yazılanlar (an, süre, en boy)
function takenAt(file, m, size, starts) {
  const t = file.lastModified ? new Date(file.lastModified).toISOString() : "";
  const now = new Date().toISOString();
  const end = t && dayOf(t) === dayOf(now) ? t : now;
  const at = m.kind === "video" && m.dur ? new Date(Date.parse(end) - m.dur * 1000).toISOString() : end;
  const mom = momentAt(at, starts) || momentOf(at, readTimer()) || {};
  return { at, extra: { ...mom, ...(m.dur ? { dur: m.dur } : {}), ...(size.w && size.h ? { w: size.w, h: size.h } : {}) } };
}

// Yayın videosu önce yalnız telefona (Seyhun 2026-11-05 "buluta eklemeyi şarta bağlayalım, sadece telefona eklenecek; isterse seçtiği
// videoları buluta yükleyebilir"): dosya telefonda kalır (pendingStore, stay), yarışa küçük resmi ve künyesi (ph) yazılır.
// Fotoğraf küçük olduğundan eskisi gibi yüklenir. Künyeyi döndürür.
export async function keepForScreen(orgId, raceId, file, starts, onStep) {
  const size = await videoSize(file);
  onStep?.("Hazırlanıyor…");
  const m = await prepRaceMedia(file, null);
  const { at, extra } = takenAt(file, m, size, starts);
  if (m.kind !== "video") return addRaceMedia(orgId, raceId, { blob: m.blob, type: m.type, kind: m.kind }, at, (p) => onStep?.(`Yükleniyor %${Math.round(p * 100)}`), extra);
  const meta = await addRaceMedia(orgId, raceId, { blob: m.blob, type: m.type, kind: "video" }, at, null, { ...extra, ph: true });
  await keepLocal({ id: meta.id, raceId, kind: "video", size: m.blob.size, blob: m.blob, stay: true });
  return meta;
}
// Telefonda duran videolardan bu telefondakiler (id kümesi)
export const keptIds = (raceId) => listKept().then((l) => new Set(l.filter((x) => x.raceId === raceId && x.kind === "video").map((x) => x.id)));
// Seçilen telefondaki videoyu buluta yükle (akışa uygun kopyası gider, aslı telefonda 7 gün daha). Yeni künyeyi döndürür.
export async function cloudForScreen(orgId, raceId, meta, onStep) {
  const k = (await listKept()).find((x) => x.id === meta.id);
  if (!k?.blob) throw new Error("Video bu telefonda değil");
  onStep?.("Hazırlanıyor…");
  const c = await cloudCopy(k.blob, meta.type || k.blob.type, (p) => onStep?.(`Küçültülüyor %${Math.round(p * 100)}`));
  const next = await cloudMedia(orgId, raceId, meta, c.blob, c.type, (p) => onStep?.(`Yükleniyor %${Math.round(p * 100)}`));
  await keepLocal({ id: meta.id, raceId, kind: "video", size: k.blob.size, blob: k.blob });
  return next;
}

// Yarış programı (Seyhun 2026-11-02): fotoğraf, PDF ya da yazı → günler (yapay zekâ okur, /api/race-program; lib/raceProgram.js)
async function askProgram(body) {
  const res = await authFetch("/api/race-program", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), timeout: 65000 });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || "Program okunamadı, tekrar dene.");
  return cleanProgram(p).days;
}
const toB64 = (file) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1]);
    fr.onerror = () => rej(new Error("Dosya okunamadı"));
    fr.readAsDataURL(file);
  });
export async function readProgramFile(file, ctx = {}) {
  const kind = await kindOf(file);
  if (kind === "pdf") {
    if (file.size > 4 * 1024 * 1024) throw new Error("PDF 4 MB'tan büyük. Program sayfasının fotoğrafını yükle.");
    return askProgram({ ...ctx, mimeType: "application/pdf", data: await toB64(file) });
  }
  if (kind === "image") {
    const img = await compressImage(file, 2400, 0.85);
    return askProgram({ ...ctx, mimeType: img.mimeType, data: img.base64 });
  }
  if (kind === "text") return askProgram({ ...ctx, text: (await file.text()).slice(0, 30000) });
  throw new Error("PDF ya da fotoğraf seç.");
}
export const readProgramText = (text, ctx = {}) => askProgram({ ...ctx, text: String(text || "").slice(0, 30000) });
