// Bu cihazda saklanan verilerin boyutu (Ayarlar › Bu cihazdaki veriler). Tarayıcıya bağlı olmayan hesaplar burada (test edilir).

// Kayıttaki dosyaların (Blob) ve yazıların yaklaşık boyutu (bayt)
export function bytesOf(v, depth = 0) {
  if (v == null || depth > 6) return 0;
  if (typeof Blob !== "undefined" && v instanceof Blob) return v.size;
  if (v instanceof ArrayBuffer) return v.byteLength;
  if (ArrayBuffer.isView(v)) return v.byteLength;
  if (typeof v === "string") return v.length * 2;
  if (typeof v === "number" || typeof v === "boolean") return 8;
  if (Array.isArray(v)) return v.reduce((n, x) => n + bytesOf(x, depth + 1), 0);
  if (typeof v === "object") return Object.entries(v).reduce((n, [k, x]) => n + k.length * 2 + bytesOf(x, depth + 1), 0);
  return 0;
}

// 1536 → "2 KB", 3_400_000 → "3,2 MB"
export function sizeText(n) {
  n = Math.max(0, Number(n) || 0);
  if (n >= 1073741824) return `${(n / 1073741824).toFixed(1).replace(".", ",")} GB`;
  if (n >= 1048576) return `${(n / 1048576).toFixed(1).replace(".", ",")} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return n ? `${n} B` : "0 KB";
}

// Yarış evrakı veritabanındaki bir kayıt: tür, ad, boyut. raceName(id) yarışın adını verir (bilinmiyorsa boş).
// Kayıtlar: "<yarış>" hazırlanan evrak, "<yarış>:extra" eklenen evrak, "notice:<id>" talimat kopyası
export function raceFileInfo(rec, raceName = () => "") {
  const id = String(rec?.id || "");
  const size = bytesOf(rec);
  if (id.startsWith("rf:")) return { id, kind: "cache", title: rec.name || "Evrak", sub: "Firebase'deki evrakın kopyası", size };
  if (id.startsWith("notice:")) return { id, kind: "notice", title: rec.name || "Yarış talimatı", sub: "Talimat kopyası", size };
  if (id.endsWith(":extra")) {
    const n = rec.files?.length || 0;
    return { id, kind: "extra", title: raceName(id.slice(0, -6)) || "Yarış", sub: `Eklenen evrak · ${n} dosya`, size };
  }
  const t = String(rec.name || "").replace(/-evrak\.pdf$/, "").replace(/-/g, " ");
  return { id, kind: "docs", title: raceName(id) || t || "Yarış", sub: `Hazırlanan evrak${rec.pages ? ` · ${rec.pages} sayfa` : ""}`, size };
}

// Yerel ayarlar (localStorage): anahtar + değer, UTF-16 (2 bayt/karakter)
export const storageBytes = (pairs) => pairs.reduce((n, [k, v]) => n + (String(k).length + String(v ?? "").length) * 2, 0);

// Telefonda 7 gün tutulan medya (raceMedia/pendingStore "kept"): yarış/antrenman başına grup, en çok yer kaplayan önce.
// daysLeft: o gruptaki ilk silinecek dosyanın kalan günü (en az 0)
export function mediaGroups(kept, keepDays = 7, now = Date.now()) {
  const map = new Map();
  for (const x of kept || []) {
    const g = map.get(x.raceId) || { raceId: x.raceId, videos: 0, photos: 0, size: 0, first: Infinity, ids: [] };
    if (x.kind === "video") g.videos += 1;
    else g.photos += 1;
    g.size += x.size || x.blob?.size || 0;
    g.first = Math.min(g.first, x.savedAt || now);
    g.ids.push(x.id);
    map.set(x.raceId, g);
  }
  return [...map.values()]
    .map(({ first, ...g }) => ({ ...g, daysLeft: Math.max(0, keepDays - Math.floor((now - first) / 864e5)) }))
    .sort((a, b) => b.size - a.size);
}

// "9 video · 2 foto"
export const mediaCount = (g) => [g.videos && `${g.videos} video`, g.photos && `${g.photos} foto`].filter(Boolean).join(" · ");

// Bulutta kaydı olan medya: canlı belgedeki (raceLive.media) künyelerden adresi olanlar. Yalnız bunlar telefondan silinir.
export const inCloud = (ids, media) => {
  const up = new Set((media || []).filter((m) => m?.id && (m.url || m.path)).map((m) => m.id));
  return ids.filter((id) => up.has(id));
};
