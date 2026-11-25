"use client";

import { libEntry } from "@/lib/fitness/library";
import { templatePhotos } from "@/lib/fitness/templates";
import { saveMedia } from "./fitMedia";

// Hazır program seçilince (NewProgram › Hazır program) uygulamayla gelen hareket fotoğrafları kütüphaneye yüklenir:
// yalnız fotoğrafı/videosu olmayan hareketler (Seyhun'un eklediği fotoğraf ezilmez). İkinci seçişte yüklenecek bir şey kalmaz.
// Aynı hareket başka yazımla kütüphanedeyse ("+" / "-" / "ve") o kayıt kullanılır (libKey → nameKey).
// onProg(bitti, toplam). Dönüş: eklenen fotoğraf sayısı.
export async function seedTemplatePhotos({ id, orgId, lib, addMany, onProg }) {
  const need = templatePhotos(id).filter((x) => {
    const e = libEntry(lib, x);
    return !(e?.media?.length || e?.yt);
  });
  if (!orgId || !need.length) return 0;
  const out = [];
  let n = 0;
  onProg?.(0, need.length);
  // 4'erli yükleme: hızlı ama telefonu boğmadan
  for (let i = 0; i < need.length; i += 4) {
    const part = await Promise.all(
      need.slice(i, i + 4).map(async (x) => {
        try {
          const r = await fetch(x.src);
          if (!r.ok) return null;
          const blob = await r.blob();
          const meta = await saveMedia(orgId, { blob, type: "image/jpeg", kind: "photo" });
          return { it: { ex: x.ex, name: x.name, kind: x.kind }, meta };
        } catch {
          return null;
        } finally {
          onProg?.(++n, need.length);
        }
      }),
    );
    out.push(...part.filter(Boolean));
  }
  if (out.length) await addMany(out);
  return out.length;
}
