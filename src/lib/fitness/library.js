// Kulübün hareket kütüphanesi: programlarda geçen her hareket bir kez, numarasıyla kaydedilir; fotoğrafı, videosu ve
// YouTube bağlantısı hareketin kendisinde durur. Bir harekete video eklenince o hareketin geçtiği bütün programlarda
// (sporcularınki dahil) aynı video görünür. Kayıt tek belge: orgs/{org}/fitLib/main
//   { next, items: { anahtar: { no, name, kind, yt, media [], spare [], m } }, alias: { eski anahtar: anahtar } }
// anahtar: listedeki hareketin id'si ("wall-sit"), listede olmayan (elle yazılan) hareket "c:ad" ("c:sandalyede-dips").
// no: hareket kütüphaneye ilk girdiğinde verilir (1, 2, 3…), değişmez. m: fotoğraf/video bu kütüphaneden yönetiliyor
// (true ise programdaki hareket kütüphanedekini kullanır; false ise programdaki kendi fotoğrafı kalır).
// Aynı adlı iki kayıt olmaz: listedeki hareket ("split-squat") ile elle yazılan ("c:split-squat") aynı adı taşıyorsa
// önceki kayıt kullanılır (libKey). Eskiden açılmış kopyalar birleştirilir (libMerge): kalanın anahtarı alias'ta,
// fotoğraf/videolar birleşir; 3'ten fazlası spare'de saklanır (silinmez).
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

// Kütüphanedeki anahtar: birleştirilmiş eski anahtar → kalan; kütüphanede yoksa aynı adlı kayıt
export function libKey(lib, it) {
  const k = exKey(it);
  if (!k) return "";
  const items = lib?.items || {};
  const a = lib?.alias?.[k];
  if (a && items[a]) return a;
  if (items[k]) return k;
  const f = fold(it?.name || exById(k)?.name);
  if (!f) return k;
  const same = Object.entries(items)
    .filter(([, e]) => fold(e.name) === f)
    .sort((x, y) => x[1].no - y[1].no)[0];
  return same ? same[0] : k;
}

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
    const spare = cleanMedia(e.spare, 30);
    if (spare.length) o.spare = spare;
    if (e.m || yt || media.length) o.m = true;
    items[k] = o;
    next = Math.max(next, no + 1);
  }
  const alias = {};
  for (const [a, b] of Object.entries(v?.alias || {})) if (a && a.length <= 60 && !items[a] && items[b]) alias[a] = b;
  const out = { next: Math.max(next, Math.round(+v?.next) || 1), items };
  if (Object.keys(alias).length) out.alias = alias;
  return out;
}

// Kütüphanede olmayan hareketleri sırayla numaralayıp ekler. Programdaki hareketin kendi fotoğrafı/videosu varsa
// (kütüphane öncesi programlar) o kütüphaneye geçer. Dönüş: { lib, added: [anahtar] }
export function libAdd(lib, items = []) {
  const out = { ...(lib?.alias ? { alias: lib.alias } : {}), next: lib?.next || 1, items: { ...(lib?.items || {}) } };
  const added = [];
  for (const it of items) {
    const k = libKey(out, it);
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
  // Kaldırılan fotoğraf yedekte duruyorsa yedekten çıkar (dosyası silinebilsin); yedektekiler yerinde kalır
  if (o.spare) {
    const now = new Set(cleanMedia(media).map((m) => m.id));
    o.spare = o.spare.filter((m) => !now.has(m.id));
    if (!o.spare.length) delete o.spare;
  }
  if (cleanYt(yt)) o.yt = cleanYt(yt);
  const md = cleanMedia(media);
  if (md.length) o.media = md;
  return o;
}

// Hareketin fotoğraf/videosunu kütüphanede değiştirir (yoksa ekler, numara verir)
export function libSetMedia(lib, it, { yt, media }) {
  const base = libAdd(lib, [{ ex: it.ex, name: it.name, kind: it.kind }]).lib;
  const k = libKey(base, it);
  if (!k || !base.items[k]) return lib;
  return { ...base, items: { ...base.items, [k]: withMedia(base.items[k], { yt, media }) } };
}

export const libEntry = (lib, it) => lib?.items?.[libKey(lib, it)] || null;
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
export const libMediaIds = (lib) => new Set(Object.values(lib?.items || {}).flatMap((e) => [...(e.media || []), ...(e.spare || [])].map((m) => m.id)));

// ---- Kopyalar ----
const mediaCount = (e) => (e.media?.length || 0) + (e.spare?.length || 0) + (e.yt?.id ? 1 : 0);
// Aynı adlı kayıt grupları: [{ name, keep, items: [{ key, no, name, media, yt, … }] }]; ilk satır kalacak olan
// (fotoğrafı/videosu en çok olan; eşitse numarası küçük olan)
export function libDupes(lib) {
  const by = new Map();
  for (const e of libList(lib)) {
    const f = fold(e.name);
    if (!f) continue;
    by.set(f, [...(by.get(f) || []), e]);
  }
  return [...by.values()]
    .filter((g) => g.length > 1)
    .map((g) => {
      const items = [...g].sort((a, b) => mediaCount(b) - mediaCount(a) || a.no - b.no);
      return { name: items[0].name, keep: items[0].key, items };
    });
}

// Kopyaları birleştirir: keep kalır, ötekiler silinir ve anahtarları keep'e yönlenir (programlar değişmeden kalanı
// kullanır). Fotoğraf/video hiçbiri kaybolmaz: hepsi kalana geçer (ilk 3'ü görünür, fazlası spare'de). YouTube kalanınki,
// yoksa öbürününki.
export function libMerge(lib, keep, keys = []) {
  const items = { ...(lib?.items || {}) };
  const k0 = items[keep];
  const drop = keys.filter((k) => k !== keep && items[k]);
  if (!k0 || !drop.length) return lib;
  const seen = new Set();
  const all = [k0, ...drop.map((k) => items[k])]
    .flatMap((e) => [...(e.media || []), ...(e.spare || [])])
    .filter((m) => m?.id && !seen.has(m.id) && seen.add(m.id));
  const yt = k0.yt || drop.map((k) => items[k].yt).find(Boolean);
  const o = { ...k0 };
  delete o.media;
  delete o.spare;
  delete o.yt;
  if (yt) o.yt = yt;
  if (all.length) o.media = all.slice(0, 3);
  if (all.length > 3) o.spare = all.slice(3);
  if (o.media || yt || drop.some((k) => items[k].m)) o.m = true;
  items[keep] = o;
  for (const k of drop) delete items[k];
  const alias = {};
  for (const [a, b] of Object.entries(lib?.alias || {})) alias[a] = drop.includes(b) ? keep : b;
  for (const k of drop) alias[k] = keep;
  return { ...lib, items, alias };
}

// Yapay zekaya: listede olmayan, kulübün kendi hareketleri ("c:…: ad")
export const customCatalog = (lib) =>
  libList(lib)
    .filter((e) => isCustomKey(e.key))
    .slice(0, 60)
    .map((e) => `${e.key}: ${e.name}`)
    .join("\n");

// Eski görüntüye göre yapılan değişikliği (eklenen/çıkarılan) güncel listeye uygular: arada başka bir ekleme olduysa
// (yüklenirken bağlantı eklendi gibi) o kaybolmaz. base: değişikliğin yapıldığı liste, next: istenen, fresh: şu anki
export function mediaApply(base = [], next = [], fresh = []) {
  const was = new Set((base || []).map((m) => m.id));
  const now = new Set((next || []).map((m) => m.id));
  const gone = [...was].filter((id) => !now.has(id));
  const add = (next || []).filter((m) => !was.has(m.id));
  const out = (fresh || []).filter((m) => !gone.includes(m.id));
  for (const m of add) if (!out.some((x) => x.id === m.id)) out.push(m);
  return out;
}

// Hiçbir harekete bağlı olmayan dosyaları harekete ekler (ilk 3'ü görünür, fazlası spare'de)
export function libAttach(lib, key, metas = []) {
  const e = lib?.items?.[key];
  if (!e || !metas.length) return lib;
  const seen = new Set();
  const all = [...(e.media || []), ...(e.spare || []), ...metas].filter((m) => m?.id && !seen.has(m.id) && seen.add(m.id));
  const o = { ...e, m: true };
  delete o.media;
  delete o.spare;
  if (all.length) o.media = all.slice(0, 3);
  if (all.length > 3) o.spare = all.slice(3);
  return { ...lib, items: { ...lib.items, [key]: o } };
}

// Birleştirmede kalacak olan: fotoğrafı/videosu çok olan, eşitse numarası küçük olan
export function libKeepOf(lib, keys = []) {
  return keys
    .map((k) => ({ k, e: lib?.items?.[k] }))
    .filter((x) => x.e)
    .sort((a, b) => mediaCount(b.e) - mediaCount(a.e) || a.e.no - b.e.no)[0]?.k || "";
}
