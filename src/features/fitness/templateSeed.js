"use client";

import { authFetch } from "@/lib/authFetch";
import { libEntry } from "@/lib/fitness/library";
import { templateDraw, templatePhotos } from "@/lib/fitness/templates";
import { prepMedia, saveMedia } from "./fitMedia";

// Hazır program seçilince (NewProgram › Hazır program) hareket fotoğrafları kütüphaneye yüklenir, yalnız fotoğrafı/videosu
// olmayan hareketlere (Seyhun'un eklediği fotoğraf ezilmez); ikinci seçişte yüklenecek bir şey kalmaz.
// 1) Uygulamayla gelen fotoğraflar (public/fitness/hazir, yüksek çözünürlüklü). 2) Fotoğrafı hiç olmayanlar yapay zekayla
// çizilir (/api/fitness-pic; örnek olarak programın bir fotoğrafı gider, aynı oda ve kıyafet). Çizilemeyen "+" ile eklenir.
// Aynı hareket başka yazımla kütüphanedeyse ("+" / "-" / "ve") o kayıt kullanılır (libKey → nameKey).
// onProg(yazı). Dönüş: { added, drawn, failed }
const REF = "/fitness/hazir/hip-hinge.jpg";
const empty = (lib) => (x) => {
  const e = libEntry(lib, x);
  return !(e?.media?.length || e?.yt);
};
const b64 = (blob) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] || "");
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

export async function seedTemplatePhotos({ id, orgId, lib, addMany, onProg }) {
  const need = templatePhotos(id).filter(empty(lib));
  const draw = templateDraw(id).filter(empty(lib));
  const out = [];
  let n = 0;
  let failed = 0;
  if (!orgId || (!need.length && !draw.length)) return { added: 0, drawn: 0, failed };
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
        } catch (e) {
          if (/storage\//.test(e?.code || "")) throw e;
          return null;
        } finally {
          onProg?.(`Fotoğraflar ${++n} / ${need.length}`);
        }
      }),
    );
    out.push(...part.filter(Boolean));
  }
  const added = out.length;
  if (draw.length) {
    let ref = "";
    try {
      ref = await b64(await (await fetch(REF)).blob());
    } catch {
      ref = "";
    }
    let k = 0;
    for (const x of draw) {
      onProg?.(`Fotoğraf çiziliyor ${++k} / ${draw.length}`);
      try {
        const r = await authFetch("/api/fitness-pic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: x.name, setup: x.setup, how: x.how, ref }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.data) {
          failed++;
          if (r.status === 429 || r.status === 503) break;
          continue;
        }
        const bytes = Uint8Array.from(atob(j.data), (c) => c.charCodeAt(0));
        const m = await prepMedia(new File([bytes], `${x.name}.png`, { type: j.mimeType || "image/png" }));
        const meta = await saveMedia(orgId, m);
        out.push({ it: { ex: x.ex, name: x.name, kind: x.kind }, meta });
      } catch {
        failed++;
      }
    }
  }
  if (out.length) await addMany(out);
  return { added, drawn: out.length - added, failed };
}
