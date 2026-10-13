// Kulübün hareket kütüphanesi: programlarda geçen her hareket bir kez, numarasıyla kaydedilir; fotoğrafı, videosu ve
// YouTube bağlantısı hareketin kendisinde durur. Bir harekete video eklenince o hareketin geçtiği bütün programlarda
// (sporcularınki dahil) aynı video görünür. Kayıt tek belge: orgs/{org}/fitLib/main
//   { next, items: { anahtar: { no, name, kind, yt, media [], m } } }
// anahtar: listedeki hareketin id'si ("wall-sit"), listede olmayan (elle yazılan) hareket "c:ad" ("c:sandalyede-dips").
// no: hareket kütüphaneye ilk girdiğinde verilir (1, 2, 3…), değişmez. m: fotoğraf/video bu kütüphaneden yönetiliyor
// (true ise programdaki hareket kütüphanedekini kullanır; false ise programdaki kendi fotoğrafı kalır).
import { exById, fold } from "./exercises";
import { cleanMedia } from "./model";
import { cleanYt } from "./youtube";

const S = (v, n = 60) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const KINDS = ["reps", "time", "cardio"];

export function exKey(it) {
  if (it?.ex && exById(it.ex)) return it.ex;
  const f = fold(it?.name).replace(/ /g, "-").slice(0, 50);
  return f ? `c:${f}` : "";
}
export const isCustomKey = (k) => String(k || "").startsWith("c:");

export function cleanLib(v = {}) {
  const items = {};
  let next = 1;
  for (const [k, e] of Object.entries(v?.items || {})) {
    if (!k || k.length > 60 || !e || typeof e !== "object") continue;
    if (!isCustomKey(k) && !exById(k)) continue;
    const no = Math.round(+e.no) || 0;
    if (no < 1) continue;
    const o = { no, name: S(e.name) || exById(k)?.name || k.slice(2), kind: KINDS.includes(e.kind) ? e.kind : exById(k)?.kind || "reps" };
    const yt = cleanYt(e.yt);
    if (yt) o.yt = yt;
    const media = cleanMedia(e.media);
    if (media.length) o.media = media;
    if (e.m || yt || media.length) o.m = true;
    items[k] = o;
    next = Math.max(next, no + 1);
  }
  return { next: Math.max(next, Math.round(+v?.next) || 1), items };
}

// Kütüphanede olmayan hareketleri sırayla numaralayıp ekler. Programdaki hareketin kendi fotoğrafı/videosu varsa
// (kütüphane öncesi programlar) o kütüphaneye geçer. Dönüş: { lib, added: [anahtar] }
export function libAdd(lib, items = []) {
  const out = { next: lib?.next || 1, items: { ...(lib?.items || {}) } };
  const added = [];
  for (const it of items) {
    const k = exKey(it);
    if (!k) continue;
    const cur = out.items[k];
    const own = { yt: cleanYt(it.yt), media: cleanMedia(it.media) };
    if (cur) {
      if (!cur.m && (own.yt || own.media.length)) out.items[k] = withMedia(cur, own);
      continue;
    }
    const e = { no: out.next++, name: S(it.name) || exById(k)?.name || "", kind: KINDS.includes(it.kind) ? it.kind : exById(k)?.kind || "reps" };
    out.items[k] = own.yt || own.media.length ? withMedia(e, own) : e;
    added.push(k);
  }
  return { lib: out, added };
}

function withMedia(e, { yt, media }) {
  const o = { ...e, m: true };
  delete o.yt;
  delete o.media;
  if (cleanYt(yt)) o.yt = cleanYt(yt);
  const md = cleanMedia(media);
  if (md.length) o.media = md;
  return o;
}

// Hareketin fotoğraf/videosunu kütüphanede değiştirir (yoksa ekler, numara verir)
export function libSetMedia(lib, it, { yt, media }) {
  const k = exKey(it);
  if (!k) return lib;
  const base = libAdd(lib, [{ ex: it.ex, name: it.name, kind: it.kind }]).lib;
  return { ...base, items: { ...base.items, [k]: withMedia(base.items[k], { yt, media }) } };
}

export const libEntry = (lib, it) => lib?.items?.[exKey(it)] || null;
export const libNo = (lib, it) => libEntry(lib, it)?.no || 0;

// Programdaki/antrenmandaki hareket kütüphanedekini kullanır (kütüphane yönetiyorsa)
export function withLib(it, lib) {
  const e = libEntry(lib, it);
  if (!it || !e?.m) return it;
  const o = { ...it };
  delete o.yt;
  delete o.media;
  if (e.yt) o.yt = e.yt;
  if (e.media?.length) o.media = e.media;
  return o;
}
export const itemsWithLib = (items = [], lib) => (items || []).map((it) => withLib(it, lib));
export const progWithLib = (prog, lib) => ({ ...prog, days: (prog?.days || []).map((d) => ({ ...d, items: itemsWithLib(d.items, lib) })) });

// Aynı mı (gereksiz yazma olmasın)
const sig = (items = []) => JSON.stringify((items || []).map((it) => [it.yt?.id || "", it.yt?.start || 0, (it.media || []).map((m) => m.id).join(",")]));
export const sameMedia = (a, b) => sig(a) === sig(b);

// Kütüphanedeki sıralı liste (numaraya göre), arama Türkçe harfsiz
export function libList(lib, q = "") {
  const f = fold(q);
  return Object.entries(lib?.items || {})
    .map(([key, e]) => ({ key, ...e, ex: isCustomKey(key) ? "" : key }))
    .filter((e) => !f || fold(e.name).includes(f) || String(e.no) === f)
    .sort((a, b) => a.no - b.no);
}

// Kütüphanedeki fotoğraf/video kimlikleri (program silinince bunlar silinmez)
export const libMediaIds = (lib) => new Set(Object.values(lib?.items || {}).flatMap((e) => (e.media || []).map((m) => m.id)));

// Yapay zekaya: listede olmayan, kulübün kendi hareketleri ("c:…: ad")
export const customCatalog = (lib) =>
  libList(lib)
    .filter((e) => isCustomKey(e.key))
    .slice(0, 60)
    .map((e) => `${e.key}: ${e.name}`)
    .join("\n");
