// Başka bir sitedeki hareket sayfasından (ör. muscleandstrength.com/exercises/…) videoyu bulur.
// Sayfa sunucuda indirilir (/api/page-video), burada yalnız HTML okunur. Sıra: sayfaya gömülü YouTube oynatıcısı,
// sayfanın kendi videosu (og:video, <video>/<source>, metindeki .mp4/.m3u8 adresi), en son sayfadaki YouTube bağlantısı.
// Sonuç: { yt: { id } } | { video: "https://…" } | null
const YT_EMBED = /(?:youtube(?:-nocookie)?\.com\/embed\/|youtube\.com\/v\/)([A-Za-z0-9_-]{11})/;
const YT_ANY = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const VIDEO_EXT = /\.(mp4|webm|m4v|mov|m3u8)(\?|#|$)/i;

// JSON içindeki "https:\/\/…" ve HTML'deki &amp; gibi yazımları düzeltir
const unescape = (s) =>
  String(s || "")
    .replace(/\\\//g, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/g, "/")
    .trim();

// Göreli adresi sayfaya göre tam adrese çevirir; yalnız https (http ise https denenir)
export function absUrl(src, page) {
  const s = unescape(src);
  if (!s || /^(data|blob|javascript):/i.test(s)) return "";
  try {
    const u = new URL(s, page);
    if (u.protocol === "http:") u.protocol = "https:";
    if (u.protocol !== "https:") return "";
    const out = u.toString();
    return out.length <= 1200 ? out : "";
  } catch {
    return "";
  }
}

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))?.slice(1).find((x) => x != null) || "";

function metaVideo(html) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const key = (attr(tag, "property") || attr(tag, "name")).toLowerCase();
    if (["og:video:secure_url", "og:video:url", "og:video", "twitter:player:stream"].includes(key)) {
      const c = attr(tag, "content");
      if (c) return c;
    }
  }
  return "";
}

function tagVideos(html) {
  const out = [];
  for (const tag of html.match(/<(?:video|source)\b[^>]*>/gi) || []) {
    for (const a of ["src", "data-src", "data-video-src", "data-mp4"]) {
      const v = attr(tag, a);
      if (v) out.push(v);
    }
  }
  return out;
}

export function findPageVideo(html, page) {
  const h = String(html || "");
  const flat = unescape(h);
  const emb = flat.match(YT_EMBED);
  if (emb) return { yt: { id: emb[1] } };
  // og:video bazen YouTube oynatıcısıdır
  const meta = metaVideo(h);
  if (meta) {
    const y = unescape(meta).match(YT_EMBED) || unescape(meta).match(YT_ANY);
    if (y) return { yt: { id: y[1] } };
  }
  const metaUrl = absUrl(meta, page);
  if (metaUrl && VIDEO_EXT.test(metaUrl)) return { video: metaUrl };
  // <video>/<source> adresi uzantısız da olabilir; resim, sayfa ve başka oynatıcı (Vimeo) sayılmaz
  for (const src of tagVideos(h)) {
    const u = absUrl(src, page);
    if (u && !/\.(jpe?g|png|gif|webp|svg|html?|php)(\?|#|$)/i.test(u) && !/vimeo\.com/i.test(u)) return { video: u };
  }
  const raw = flat.match(/https?:\/\/[^\s"'<>()\\]+?\.(?:mp4|webm|m4v|m3u8)(?:\?[^\s"'<>()\\]*)?/i);
  if (raw) {
    const u = absUrl(raw[0], page);
    if (u) return { video: u };
  }
  const any = flat.match(YT_ANY);
  if (any) return { yt: { id: any[1] } };
  return null;
}

// Sunucunun indirmeyeceği adresler: yerel ağ, iç adresler (yalnız açık internetteki sayfalar)
export function publicPage(text) {
  let u;
  try {
    u = new URL(String(text || "").trim());
  } catch {
    return "";
  }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password || (u.port && !["80", "443"].includes(u.port))) return "";
  const host = u.hostname.toLowerCase();
  if (!host.includes(".") || /^(localhost|.*\.local|.*\.internal|.*\.localhost)$/.test(host)) return "";
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host.startsWith("[")) return "";
  return u.toString();
}

// Doğrudan fotoğraf/video dosyası mı (sayfa değil)
export const isFileLink = (text) => /\.(mp4|mov|webm|m4v|m3u8|jpe?g|png|gif|webp|heic|avif)(\?|#|$)/i.test(String(text || "").trim());
