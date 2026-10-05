// Envanter: birden çok envanter (Normal, Yelken Kulübü, …), her birinin kendi kategorileri, ürünleri ve hareket kaydı.
// Kayıt orgs/{orgId}/inventories/{id} tek belge (ürünler içinde: liste tek okuma, değişiklik tek yazma).
// Hem telefon hem sunucu (yapay zeka cevabını temizlemek için) kullanır; "use client" yok, Firebase yok.
//
// inv = {
//   name, kind ("normal" | "club"), prefix (numara öneki, boş olabilir), cats [ad],
//   items [{ id, no, name, cat, qty, unit, addedAt, brand, serial, sailNo, year (alım yılı), place, state, damage (hasar: "yırtık"),
//            owner "club" | "private", ownerName (özel teknenin sahibi), parent (bağlı olduğu teknenin id'si: salma, dümen, direk…),
//            assignee, price, checkAt, note, updatedAt }],
//   log [{ at, op add|remove|edit|delete, no, name, qty, text, by }]   hareketler, en yenisi önde
// }

export const KINDS = [
  ["normal", "Normal", "box"],
  ["club", "Yelken kulübü", "anchor"],
];
export const kindOf = (k) => KINDS.find(([x]) => x === k) || KINDS[0];

// Hazır kategoriler (kullanıcı ekler, siler, adını değiştirir)
export const CATS = {
  club: ["Tekne", "Salma", "Dümen", "Direk", "Bom", "Yelken", "Bot", "Motor", "Şamandıra", "Telsiz", "Can yeleği", "Tekne arabası", "Halat ve donanım", "Bilgisayar", "Yazıcı", "Diğer"],
  normal: ["Elektronik", "Mobilya", "Mutfak", "Araç gereç", "Kırtasiye", "Diğer"],
};
// İlk açılışta hazır gelen envanterler
export const STARTERS = [
  { name: "Yelken Kulübü", kind: "club" },
  { name: "Normal", kind: "normal" },
];

// Teknenin takımı: bu kategorilerdeki ürünler bir tekneye bağlanabilir, ayrıca kendi kategorisinde de sayılır
export const BOAT_CAT = "Tekne";
export const PART_CATS = ["Salma", "Dümen", "Direk", "Bom", "Yelken"];
export const isBoat = (x) => fold(x?.cat) === fold(BOAT_CAT);
export const isPart = (x) => PART_CATS.some((c) => fold(c) === fold(x?.cat));
// Kategoriye göre gösterilen ek alanlar (diğerlerinde dolu değilse gizli)
export const hasSailNo = (cat) => ["tekne", "yelken"].includes(fold(cat));

export const OWNERS = [
  ["club", "Kulübün"],
  ["private", "Özel"],
];

export const STATES = [
  ["new", "Yeni"],
  ["good", "İyi"],
  ["worn", "Yıpranmış"],
  ["repair", "Bakımda"],
  ["broken", "Arızalı"],
  ["lost", "Kayıp"],
  ["out", "Kullanım dışı"],
];
const STATE_KEYS = STATES.map(([k]) => k);
export const stateLabel = (k) => STATES.find(([x]) => x === k)?.[1] || "İyi";
// Dikkat isteyen durumlar (listede renkli, özetde sayılır)
export const BAD = ["repair", "broken", "lost"];

export const UNITS = ["adet", "takım", "çift", "metre", "kutu", "paket", "litre"];

const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const L = (v, n) => String(v ?? "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, n);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const date = (v) => (DATE.test(v || "") ? v : "");
const int = (v, max) => Math.min(Math.max(0, Math.round(Number(v) || 0)), max);
const num = (v, max = 100_000_000) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.min(Math.max(0, Math.round(n * 100) / 100), max) : 0;
};
const yearOf = (v) => {
  const n = Math.round(Number(v) || 0);
  return n >= 1950 && n <= 2100 ? n : 0;
};
// "3 yıllık" (alım yılından)
export const ageText = (year, today = new Date().toISOString()) => {
  if (!year) return "";
  const n = Number(today.slice(0, 4)) - year;
  return n <= 0 ? "bu yıl alındı" : `${n} yıllık`;
};
export const newId = () => Math.random().toString(36).slice(2, 10);
const okId = (x) => /^[\w-]{1,20}$/.test(x || "");
const arr = (a, max) => (Array.isArray(a) ? a : []).slice(0, max);

export const MAX_ITEMS = 1500;
const MAX_LOG = 300;

// Türkçe harfsiz, küçük: eşleştirme için ("Şamandıra" = "samandira")
export const fold = (s) =>
  String(s ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u" })[c])
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function cleanItem(x = {}) {
  return {
    id: okId(x.id) ? x.id : newId(),
    no: S(x.no, 20),
    name: S(x.name, 80),
    cat: S(x.cat, 30) || "Diğer",
    qty: int(x.qty ?? 1, 1_000_000),
    unit: S(x.unit, 12) || "adet",
    addedAt: date(x.addedAt),
    brand: S(x.brand, 60),
    serial: S(x.serial, 40),
    sailNo: S(x.sailNo, 20),
    year: yearOf(x.year),
    damage: S(x.damage, 120),
    owner: x.owner === "private" ? "private" : "club",
    ownerName: x.owner === "private" ? S(x.ownerName, 60) : "",
    parent: okId(x.parent) && x.parent !== x.id ? x.parent : "",
    place: S(x.place, 60),
    state: STATE_KEYS.includes(x.state) ? x.state : "good",
    assignee: S(x.assignee, 60),
    price: num(x.price),
    checkAt: date(x.checkAt),
    note: L(x.note, 600),
    updatedAt: S(x.updatedAt, 30),
  };
}
const cleanLog = (x = {}) => ({
  at: S(x.at, 30),
  op: ["add", "remove", "edit", "delete"].includes(x.op) ? x.op : "edit",
  no: S(x.no, 20),
  name: S(x.name, 80),
  qty: Math.round(Number(x.qty) || 0),
  text: S(x.text, 160),
  by: S(x.by, 40),
});

export function cleanInv(v = {}) {
  const kind = v.kind === "club" ? "club" : "normal";
  let cats = [...new Set(arr(v.cats, 40).map((c) => S(c, 30)).filter(Boolean))];
  // Sürüm 2: kulüp envanterine Salma ve Dümen kategorileri (eski kayıtlara bir kez eklenir; sonra silinebilir)
  if (cats.length && kind === "club" && (Number(v.v) || 1) < 2) {
    const add = ["Salma", "Dümen"].filter((c) => !cats.includes(c));
    const at = Math.max(0, cats.indexOf("Tekne") + 1);
    cats = [...cats.slice(0, at), ...add, ...cats.slice(at)];
  }
  const items = arr(v.items, MAX_ITEMS).map(cleanItem).filter((x) => x.name);
  const ids = new Set(items.map((x) => x.id));
  return {
    v: 2,
    name: S(v.name, 40) || kindOf(kind)[1],
    kind,
    prefix: S(v.prefix, 6).toLocaleUpperCase("tr-TR"),
    cats: cats.length ? cats : [...CATS[kind]],
    // Silinen tekneye bağlı parçalar boşa düşer
    items: items.map((x) => (x.parent && !ids.has(x.parent) ? { ...x, parent: "" } : x)),
    log: arr(v.log, MAX_LOG).map(cleanLog),
    order: int(v.order, 1000),
  };
}
export const freshInv = (name, kind = "normal", order = 0) => cleanInv({ name, kind, order });

// Sıradaki numara: kayıtlı numaraların sonundaki en büyük sayı + 1 (elle değiştirilen numaralar da sayılır). "001" ya da "DYK-001"
export function nextNo(inv, skip = 0) {
  const max = (inv?.items || []).reduce((m, x) => Math.max(m, Number(/(\d+)\s*$/.exec(x.no)?.[1] || 0)), 0);
  const n = String(max + 1 + skip).padStart(3, "0");
  return inv?.prefix ? `${inv.prefix}-${n}` : n;
}

// Kategori adı: envanterdeki kategoriyle eşleşir ("tekneler" → "Tekne"); yoksa olduğu gibi (yeni kategori olarak eklenir)
export function catOf(inv, c) {
  const f = fold(c);
  if (!f) return "Diğer";
  const hit = inv.cats.find((x) => fold(x) === f) || inv.cats.find((x) => f.startsWith(fold(x)) || fold(x).startsWith(f));
  return hit || S(c, 30).replace(/^./, (m) => m.toLocaleUpperCase("tr-TR"));
}

// Ürünün kısa adı: "Optimist (No 004)"
export const itemLabel = (x) => (x.no ? `${x.name} (No ${x.no})` : x.name);
const qtyText = (n, unit = "adet") => `${n} ${unit}`;

// Özet: ürün sayısı, toplam adet, dikkat isteyenler
export function invStats(inv) {
  const items = inv?.items || [];
  return {
    items: items.length,
    qty: items.reduce((n, x) => n + x.qty, 0),
    bad: items.filter((x) => BAD.includes(x.state) || x.damage).length,
    value: items.reduce((n, x) => n + x.price * Math.max(1, x.qty), 0),
    own: items.filter((x) => x.owner === "private").reduce((n, x) => n + x.qty, 0),
  };
}
export function statsText(inv) {
  const s = invStats(inv);
  if (!s.items) return "Henüz ürün yok";
  return [`${s.items} ürün`, `${s.qty} adet`, s.bad ? `${s.bad} sorunlu` : "", s.own ? `${s.own} özel` : ""].filter(Boolean).join(" · ");
}

// Kategoriye göre gruplar (envanterin kategori sırası; listede olmayanlar sonda)
export function groupItems(items, cats) {
  const by = new Map();
  for (const x of items) by.set(x.cat, [...(by.get(x.cat) || []), x]);
  const order = [...cats.filter((c) => by.has(c)), ...[...by.keys()].filter((c) => !cats.includes(c))];
  return order.map((c) => [c, by.get(c).sort((a, b) => a.no.localeCompare(b.no, "tr", { numeric: true }) || a.name.localeCompare(b.name, "tr"))]);
}

// Arama: ad, numara, marka, seri, yer, kimde, not
export function searchItems(items, q) {
  const f = fold(q);
  if (!f) return items;
  return items.filter((x) => fold([x.no, x.name, x.cat, x.brand, x.serial, x.sailNo, x.year || "", x.damage, x.ownerName, x.owner === "private" ? "özel" : "kulüp", x.place, x.assignee, x.note, stateLabel(x.state)].join(" ")).includes(f));
}

// ---- Değişiklikler (sayfa ve asistan aynı fonksiyonlarla yazar; hareket kaydı tutulur) ----
const stamp = (inv, e) => ({ ...inv, log: [cleanLog(e), ...inv.log].slice(0, MAX_LOG) });

// Ürünü ekler ya da günceller (sayfadaki form). Yeni üründe numara ve tarih boşsa verilir.
export function upsertItem(inv, item, { now = new Date().toISOString(), by = "" } = {}) {
  const old = item.id && inv.items.find((x) => x.id === item.id);
  const x = cleanItem({ ...item, updatedAt: now });
  if (!old) {
    if (!x.no) x.no = nextNo(inv);
    if (!x.addedAt) x.addedAt = now.slice(0, 10);
  }
  const cats = inv.cats.includes(x.cat) ? inv.cats : [...inv.cats.filter((c) => c !== "Diğer"), x.cat, ...(inv.cats.includes("Diğer") ? ["Diğer"] : [])];
  const items = old ? inv.items.map((y) => (y.id === x.id ? x : y)) : [...inv.items, x].slice(-MAX_ITEMS);
  const e = old
    ? { at: now, op: x.qty !== old.qty ? (x.qty > old.qty ? "add" : "remove") : "edit", no: x.no, name: x.name, qty: x.qty - old.qty, text: changeText(old, x), by }
    : { at: now, op: "add", no: x.no, name: x.name, qty: x.qty, text: `Eklendi: ${qtyText(x.qty, x.unit)}`, by };
  return stamp({ ...inv, cats, items }, e);
}

export function dropItem(inv, id, { now = new Date().toISOString(), by = "" } = {}) {
  const old = inv.items.find((x) => x.id === id);
  if (!old) return inv;
  return stamp({ ...inv, items: inv.items.filter((x) => x.id !== id) }, { at: now, op: "delete", no: old.no, name: old.name, qty: -old.qty, text: "Envanterden silindi", by });
}

const FIELD_NAMES = { no: "numara", name: "ad", cat: "kategori", qty: "adet", unit: "birim", addedAt: "eklenme tarihi", brand: "marka", serial: "seri no", sailNo: "yelken no", year: "alım yılı", place: "yer", state: "durum", damage: "hasar", owner: "sahibi", ownerName: "sahibi", parent: "tekne", assignee: "kimde", price: "fiyat", checkAt: "kontrol tarihi", note: "not" };
// "adet 3 → 5, durum Bakımda, yer Hangar"
export function changeText(a, b) {
  const out = [];
  for (const k of Object.keys(FIELD_NAMES)) {
    if (a[k] === b[k]) continue;
    if (k === "qty") out.push(`adet ${a.qty} → ${b.qty}`);
    else if (k === "state") out.push(`durum ${stateLabel(b.state)}`);
    else if (k === "note") out.push("not");
    else if (k === "owner") out.push(b.owner === "private" ? "özel" : "kulübün");
    else if (k === "ownerName" && a.owner !== b.owner) continue;
    else if (k === "parent") out.push(b.parent ? "tekneye bağlandı" : "tekneden ayrıldı");
    else out.push(`${FIELD_NAMES[k]} ${b[k] || "boş"}`);
  }
  return out.join(", ") || "Değişiklik yok";
}

// ---- Yapay zekanın işlemleri ----
// op: { op: "add" | "remove" | "update" | "delete", id (var olan ürün), name, cat, qty, unit, brand, serial, place, state, assignee, price, addedAt, checkAt, note, no }
// add + id: o ürünün adedi artar; add id'siz: yeni ürün. remove: adet azalır (0'ın altına inmez). update: söylenen alanlar değişir.
// delete: onay gerekir; burada uygulanmaz, `deletes`te döner.
// Dönüş: { inv, lines: ["Ekledim: …"], deletes: [ürün], missing: ["…"] }
const FIELDS = ["name", "cat", "unit", "brand", "serial", "sailNo", "year", "damage", "owner", "ownerName", "place", "state", "assignee", "price", "addedAt", "checkAt", "note", "no"];
export function cleanOp(o = {}) {
  const op = ["add", "remove", "update", "delete"].includes(o.op) ? o.op : "";
  if (!op) return null;
  const out = { op, id: okId(o.id) ? o.id : "" };
  // key: bu listede yeni eklenen ürünün geçici adı; parent: bağlanacak tekne (var olan id ya da aynı listedeki key)
  if (/^[\w-]{1,20}$/.test(o.key || "")) out.key = o.key;
  if (/^[\w-]{1,20}$/.test(o.parent || "")) out.parent = o.parent;
  if (o.parent === "none") out.parent = "none";
  if (o.qty != null && o.qty !== "") out.qty = int(o.qty, 1_000_000);
  for (const k of FIELDS) if (o[k] != null && String(o[k]).trim() !== "") out[k] = o[k];
  if (out.state && !STATE_KEYS.includes(out.state)) delete out.state;
  if (out.addedAt && !DATE.test(out.addedAt)) delete out.addedAt;
  if (out.checkAt && !DATE.test(out.checkAt)) delete out.checkAt;
  if (op === "add" && !out.id && !S(out.name, 80)) return null;
  if (op !== "add" && !out.id) return null;
  return out;
}

export function applyOps(inv, ops, { now = new Date().toISOString(), by = "" } = {}) {
  let cur = inv;
  const added = [];
  const more = [];
  const less = [];
  const edited = [];
  const deletes = [];
  const missing = [];
  const keys = {};
  for (const raw of ops || []) {
    const o = cleanOp(raw);
    if (!o) continue;
    const old = o.id ? cur.items.find((x) => x.id === o.id) : null;
    // Tekne: aynı listede eklenen teknenin key'i ya da var olan id; "none" tekneden ayırır
    if (o.parent) {
      const pid = o.parent === "none" ? "" : keys[o.parent] || o.parent;
      const boat = pid && cur.items.find((x) => x.id === pid);
      o.parent = boat ? pid : "";
      // Takım parçası sahibini belirtmezse teknenin sahibini alır
      if (boat && !old && !o.owner) Object.assign(o, { owner: boat.owner, ownerName: boat.ownerName });
      if (!boat && raw.parent !== "none") delete o.parent;
    }
    if (o.id && !old) {
      missing.push(S(raw.name, 60) || "ürün");
      continue;
    }
    if (o.op === "delete") {
      if (!deletes.some((x) => x.id === old.id)) deletes.push(old);
      continue;
    }
    if (o.op === "add" && !old) {
      const item = { ...o, id: "", cat: catOf(cur, o.cat), qty: o.qty ?? 1, addedAt: o.addedAt || now.slice(0, 10) };
      cur = upsertItem(cur, item, { now, by });
      const x = cur.items[cur.items.length - 1];
      if (o.key) keys[o.key] = x.id;
      added.push(x);
      continue;
    }
    if (o.op === "add" || o.op === "remove") {
      const d = o.qty ?? 1;
      const qty = o.op === "add" ? old.qty + d : Math.max(0, old.qty - d);
      const patch = { ...old, ...pick(o, ["state", "place", "assignee", "note"]), qty };
      cur = upsertItem(cur, patch, { now, by });
      (o.op === "add" ? more : less).push({ x: old, qty });
      continue;
    }
    // update
    const patch = { ...old, ...pick(o, [...FIELDS, "parent"]), ...(o.qty != null ? { qty: o.qty } : {}) };
    if (patch.cat) patch.cat = catOf(cur, patch.cat);
    const next = cleanItem(patch);
    const what = changeText(old, next);
    if (what === "Değişiklik yok") continue;
    cur = upsertItem(cur, patch, { now, by });
    edited.push({ x: next, what });
  }
  const lines = [];
  // Aynı anda eklenen tekne ve takımı tek parça söylenir: "Optimist teknesi (No 011, takımıyla: salma, dümen…)"
  const newIds = new Set(added.map((x) => x.id));
  const kitOfNew = (b) => added.filter((x) => x.parent === b.id).map((x) => x.cat.toLocaleLowerCase("tr-TR"));
  const addText = (x) => {
    const kit = kitOfNew(x);
    const no = kit.length ? `No ${x.no}, takımıyla: ${kit.join(", ")}` : `No ${x.no}`;
    return `${x.qty > 1 ? `${x.qty} ${x.unit === "adet" ? "" : `${x.unit} `}` : ""}${x.name} (${no})${x.owner === "private" ? `, özel${x.ownerName ? ` (${x.ownerName})` : ""}` : ""}`.replace(/\s+/g, " ");
  };
  const shownAdd = added.filter((x) => !(x.parent && newIds.has(x.parent)));
  if (shownAdd.length) lines.push(`Ekledim: ${shownAdd.map(addText).join(", ")}.`);
  if (more.length) lines.push(`Artırdım: ${more.map(({ x, qty }) => `${x.name} ${x.qty} → ${qty}`).join(", ")}.`);
  if (less.length) lines.push(`Azalttım: ${less.map(({ x, qty }) => `${x.name} ${x.qty} → ${qty}${qty === 0 ? " (kalmadı)" : ""}`).join(", ")}.`);
  if (edited.length) lines.push(`Değiştirdim: ${edited.map(({ x, what }) => `${x.name}, ${what}`).join("; ")}.`);
  if (missing.length) lines.push(`Bulamadım: ${missing.join(", ")}.`);
  return { inv: cur, lines, deletes, missing, changed: added.length + more.length + less.length + edited.length > 0 };
}
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] != null).map((k) => [k, o[k]]));

// Yapay zekaya giden kısa liste (yalnız eşleştirme için gerekenler)
export const brief = (inv) =>
  inv.items.map((x) => ({ id: x.id, no: x.no, name: x.name, cat: x.cat, qty: x.qty, unit: x.unit, ...(x.brand ? { brand: x.brand } : {}), ...(x.serial ? { serial: x.serial } : {}), ...(x.sailNo ? { sailNo: x.sailNo } : {}), ...(x.year ? { year: x.year } : {}), ...(x.place ? { place: x.place } : {}), ...(x.assignee ? { assignee: x.assignee } : {}), state: x.state, ...(x.damage ? { damage: x.damage } : {}), owner: x.owner, ...(x.ownerName ? { ownerName: x.ownerName } : {}), ...(x.parent ? { parent: x.parent } : {}) }));

// Hangi envanter: cümlede adı geçen ("kulüp envanterine", "normal envantere"), yoksa açık sayfadaki, yoksa son kullanılan, yoksa kulüp
export function pickInv(text, list, { here = "", last = "" } = {}) {
  if (!list?.length) return null;
  const t = ` ${fold(text)} `;
  const named = list
    .map((v) => {
      const f = fold(v.name);
      const words = f.split(" ").filter((w) => w.length > 2 && w !== "envanter");
      const hit = t.includes(` ${f} `) ? 10 : words.filter((w) => new RegExp(` ${w}\\S*`).test(t)).length;
      return [v, hit];
    })
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (named.length) return named[0][0];
  if (/ kulup\S* envanter/.test(t)) return list.find((v) => v.kind === "club") || null;
  return list.find((v) => v.id === here) || list.find((v) => v.id === last) || list.find((v) => v.kind === "club") || list[0];
}

// Excel: ürünler ve hareketler
export function excelRows(inv) {
  const items = [["No", "Ürün", "Kategori", "Adet", "Birim", "Sahibi", "Tekne", "Eklenme", "Alım yılı", "Marka / model", "Seri no", "Yelken no", "Yer", "Durum", "Hasar", "Kimde", "Fiyat (₺)", "Son kontrol", "Not"]];
  const byId = new Map(inv.items.map((x) => [x.id, x]));
  for (const [, list] of groupItems(inv.items, inv.cats))
    for (const x of list)
      items.push([x.no, x.name, x.cat, x.qty, x.unit, ownerText(x), x.parent ? itemLabel(byId.get(x.parent)) : "", x.addedAt, x.year || "", x.brand, x.serial, x.sailNo, x.place, stateLabel(x.state), x.damage, x.assignee, x.price || "", x.checkAt, x.note]);
  const log = [["Zaman", "İşlem", "No", "Ürün", "Adet", "Ayrıntı", "Kim"]];
  const OPS = { add: "Ekleme", remove: "Çıkarma", edit: "Düzenleme", delete: "Silme" };
  for (const e of inv.log) log.push([e.at.slice(0, 16).replace("T", " "), OPS[e.op], e.no, e.name, e.qty, e.text, e.by]);
  return { Ürünler: items, Hareketler: log };
}

// ---- Sahiplik ve tekne takımı ----
export const ownerText = (x) => (x.owner === "private" ? `Özel${x.ownerName ? ` · ${x.ownerName}` : ""}` : "Kulübün");

// Bir grubun sayımı: toplam adet, kulübün, özel, (takım parçasıysa) teknede / boşta
export function countOf(list) {
  const q = (f) => list.filter(f).reduce((n, x) => n + x.qty, 0);
  return { total: q(() => true), club: q((x) => x.owner !== "private"), own: q((x) => x.owner === "private"), onBoat: q((x) => !!x.parent), free: q((x) => !x.parent) };
}
// "8 adet · kulübün 6 · özel 2 · 3 teknede"
export function countText(list, part = false) {
  const c = countOf(list);
  return [`${c.total} adet`, c.own ? `kulübün ${c.club} · özel ${c.own}` : "", part && c.onBoat ? `${c.onBoat} teknede` : ""].filter(Boolean).join(" · ");
}

// Teknenin takımı: bağlı parçalar ve eksik takım kategorileri
export function kitOf(inv, boat) {
  const parts = inv.items.filter((x) => x.parent === boat.id);
  const have = new Set(parts.map((x) => fold(x.cat)));
  return { parts, missing: PART_CATS.filter((c) => !have.has(fold(c))) };
}
// "Tam takım" ya da "Eksik: dümen, bom"
export function kitText(inv, boat) {
  const k = kitOf(inv, boat);
  if (!k.parts.length) return "";
  return k.missing.length ? `Eksik: ${k.missing.map((c) => c.toLocaleLowerCase("tr-TR")).join(", ")}` : "Tam takım";
}
// Eksik takım parçalarını oluşturur, tekneye bağlar (sahibi teknenin sahibi). cats: hangi kategoriler (boşsa tüm eksikler)
export function addKit(inv, boatId, opts = {}, cats = null) {
  const boat = inv.items.find((x) => x.id === boatId);
  if (!boat) return inv;
  const want = cats || kitOf(inv, boat).missing;
  const base = boat.name.replace(/\s*tekne(si)?\s*/i, " ").trim() || boat.name;
  return applyOps(inv, want.map((c) => ({ op: "add", name: `${base} ${c.toLocaleLowerCase("tr-TR")}`, cat: c, qty: 1, parent: boatId })), opts).inv;
}
