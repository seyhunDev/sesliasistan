"use client";

import { addRaceMedia, cloudCopy, prepRaceMedia } from "@/features/athletes/raceLiveStore";
import { keepLocal } from "@/features/raceMedia/pendingStore";
import { cleanTagList } from "@/lib/raceLive";

// Yönet videosu (Seyhun 2026-11-25 "seçili sporcu varsa onun etiketiyle… galerimizde o günün"): çekilen video Medya › Antrenman'da
// "Yönet · gün" bölümüne gider (raceLive/ant-yonet-<gün>), etiketleriyle (sporcu adı + Orsa, Pupa, Start…). Aslı iPhone'da Fotoğraflar'da.
// Yükleme MediaTab ile aynı yol: büyük video (50 MB üstü) yalnız telefonda kalır (künye + küçük resim), orta boy buluta küçültülerek gider.
const PHONE_MB = 50;
export const VTAGS = ["Orsa", "Pupa", "Start", "Dönüş", "Trapez", "Şamandıra"];
export async function saveYonetVideo(org, day, file, tags, onProg) {
  const m = await prepRaceMedia(file);
  const end = file.lastModified || Date.now();
  const at = new Date(end - (m.kind === "video" ? (m.dur || 0) * 1000 : 0)).toISOString();
  const ph = !!file.asset && m.kind === "video" && file.size > PHONE_MB * 1e6;
  let cl = m;
  if (!ph && m.big && m.kind === "video") {
    const c = await cloudCopy(m.blob, m.type, (p) => onProg?.(p * 0.5));
    cl = { ...m, blob: c.blob, type: c.type };
  }
  const half = cl !== m;
  const id = `ant-yonet-${day}`;
  const meta = await addRaceMedia(org, id, cl, at, (p) => onProg?.(half ? 0.5 + p * 0.5 : p), { dur: m.dur, tags: cleanTagList(tags), ...(file.asset ? { asset: file.asset } : {}), ...(ph ? { ph: true } : {}) });
  await keepLocal({ id: meta.id, raceId: id, kind: m.kind, size: file.size, blob: file, ...(ph ? { stay: true } : {}) });
  return meta;
}

// Kendi eklediğin etiketler bu telefonda hatırlanır
const KEY = "sa-yonet-etiket";
export function myTags() {
  try {
    return cleanTagList(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return [];
  }
}
export function rememberTag(t) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cleanTagList([t, ...myTags()])));
  } catch {}
}
