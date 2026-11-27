// tanitim-ses için modül çözümleyici: "@/..." yolları src/'ye, uzantısız yollar .js'e gider (Next'in takma adı gibi).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
const SRC = fileURLToPath(new URL("../../src/", import.meta.url));
const SRC_URL = pathToFileURL(SRC).href;
const withExt = (p) => (/\.[mc]?js$/.test(p) && existsSync(p) ? p : existsSync(p + ".js") ? p + ".js" : p);
export async function resolve(spec, ctx, next) {
  if (spec.startsWith("@/")) return { url: pathToFileURL(withExt(SRC + spec.slice(2))).href, shortCircuit: true, format: "module" };
  if ((spec.startsWith("./") || spec.startsWith("../")) && ctx.parentURL?.startsWith(SRC_URL))
    return { url: pathToFileURL(withExt(fileURLToPath(new URL(spec, ctx.parentURL)))).href, shortCircuit: true, format: "module" };
  return next(spec, ctx);
}
