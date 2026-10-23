// Testler için modül çözümleyici: "@/..." yolları src/'ye, uzantısız yollar .js/.jsx'e gider.
// Tarayıcıya özel iki modül (öğrenme verisi, Firebase istemcisi) boş taklitle değiştirilir.
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const SRC = fileURLToPath(new URL("../../src/", import.meta.url));
const SRC_URL = pathToFileURL(SRC).href;
const STUBS = { "@/lib/brain/store": new URL("./taklit-brain.mjs", import.meta.url).href, "@/lib/firebase/clientApp": new URL("./taklit-firebase.mjs", import.meta.url).href };
// Bildirim testi: sunucu kodu sahte Firestore / push / oturumla çalışır (taklit-sunucu.mjs; hiçbir yere bağlanmaz)
const SERVER = new URL("./taklit-sunucu.mjs", import.meta.url).href;
for (const m of ["next/server", "firebase-admin/app", "firebase-admin/firestore", "firebase-admin/auth", "firebase-admin/messaging", "web-push", "@/lib/server/auth"]) STUBS[m] = SERVER;
const withExt = (p) => (/\.[mc]?jsx?$/.test(p) && existsSync(p) ? p : existsSync(p + ".js") ? p + ".js" : existsSync(p + ".jsx") ? p + ".jsx" : existsSync(p + "/index.js") ? p + "/index.js" : p);
export async function resolve(spec, ctx, next) {
  if (STUBS[spec]) return { url: STUBS[spec], shortCircuit: true };
  if (spec.startsWith("@/")) {
    const f = withExt(SRC + spec.slice(2));
    return { url: pathToFileURL(f).href, shortCircuit: true, format: f.endsWith(".cjs") ? "commonjs" : "module" };
  }
  if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.startsWith(SRC_URL)) {
    return { url: pathToFileURL(withExt(fileURLToPath(new URL(spec, ctx.parentURL)))).href, shortCircuit: true, format: "module" };
  }
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  // Veri dosyası (src/data/*.json): Next gibi varsayılan dışa aktarım olarak yüklenir
  if (url.startsWith(SRC_URL) && url.endsWith(".json")) return { format: "module", source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`, shortCircuit: true };
  // Olduğu gibi alınan CommonJS kütüphane (src/lib/vendor/*.cjs)
  if (url.startsWith(SRC_URL) && url.endsWith(".cjs")) return next(url, { ...ctx, format: "commonjs" });
  if (url.startsWith(SRC_URL)) return { ...(await next(url, { ...ctx, format: "module" })), format: "module" };
  return next(url, ctx);
}
