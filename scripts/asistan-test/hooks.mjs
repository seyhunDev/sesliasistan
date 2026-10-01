// Testler için modül çözümleyici: "@/..." yolları src/'ye, uzantısız yollar .js/.jsx'e gider.
// Tarayıcıya özel iki modül (öğrenme verisi, Firebase istemcisi) boş taklitle değiştirilir.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const SRC = fileURLToPath(new URL("../../src/", import.meta.url));
const SRC_URL = pathToFileURL(SRC).href;
const STUBS = { "@/lib/brain/store": new URL("./taklit-brain.mjs", import.meta.url).href, "@/lib/firebase/clientApp": new URL("./taklit-firebase.mjs", import.meta.url).href };
const withExt = (p) => (/\.[mc]?jsx?$/.test(p) && existsSync(p) ? p : existsSync(p + ".js") ? p + ".js" : existsSync(p + ".jsx") ? p + ".jsx" : existsSync(p + "/index.js") ? p + "/index.js" : p);
export async function resolve(spec, ctx, next) {
  if (STUBS[spec]) return { url: STUBS[spec], shortCircuit: true };
  if (spec.startsWith("@/")) return { url: pathToFileURL(withExt(SRC + spec.slice(2))).href, shortCircuit: true, format: "module" };
  if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.startsWith(SRC_URL)) {
    return { url: pathToFileURL(withExt(fileURLToPath(new URL(spec, ctx.parentURL)))).href, shortCircuit: true, format: "module" };
  }
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.startsWith(SRC_URL)) return { ...(await next(url, { ...ctx, format: "module" })), format: "module" };
  return next(url, ctx);
}
