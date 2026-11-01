"use client";

// Yayın sayfasının işleri (Seyhun 2026-11-01): telefondan seçilen video yarışa yüklenir ve ekrana verilir; videonun eni boyu kayda yazılır
// (herkese açık sayfa dikey videoyu dikey kutuda gösterir). Çekim akışının geri kalanı (yerel kopya, küçük resim kuyruğu) MediaTab'da kalır.
import { RAW_MAX, addRaceMedia, cloudCopy, prepRaceMedia } from "@/features/athletes/raceLiveStore";
import { dayOf, momentAt, momentOf } from "@/lib/raceLive";
import { readTimer } from "@/features/training/Countdown";

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
  const t = file.lastModified ? new Date(file.lastModified).toISOString() : "";
  const now = new Date().toISOString();
  const end = t && dayOf(t) === dayOf(now) ? t : now;
  const at = m.kind === "video" && m.dur ? new Date(Date.parse(end) - m.dur * 1000).toISOString() : end;
  const mom = momentAt(at, starts) || momentOf(at, readTimer()) || {};
  const extra = { ...mom, ...(m.dur ? { dur: m.dur } : {}), ...(size.w && size.h ? { w: size.w, h: size.h } : {}) };
  return addRaceMedia(orgId, raceId, { blob, type, kind: m.kind }, at, (p) => onStep?.(`Yükleniyor %${Math.round(p * 100)}`), extra);
}
