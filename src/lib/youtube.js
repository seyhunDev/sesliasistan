// YouTube kanalı (Seyhun 2026-11-06): Velora'dan videoyu kanala yükleme ve kanaldaki videoları/canlı yayını listeleme.
// Erişim anahtarı sunucudan (api/youtube, 1 saatlik) alınır; yükleme ve liste YouTube'a doğrudan gider.
import { authFetch } from "@/lib/authFetch";

let tok = null; // { token, exp, channel }

export class YtNeed extends Error {
  constructor(need, msg) {
    super(msg || (need === "setup" ? "YouTube bağlantısı kurulmamış" : "YouTube'a bağlan"));
    this.need = need; // "connect" | "setup"
  }
}

async function call(op) {
  const r = await authFetch("/api/youtube", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op }) });
  const d = await r.json().catch(() => ({}));
  if (d.need) throw new YtNeed(d.need, d.error);
  if (!r.ok) throw new Error(d.error || "YouTube'a ulaşılamadı");
  return d;
}

export async function ytToken() {
  if (tok && tok.exp - Date.now() > 2 * 60e3) return tok;
  tok = await call("token");
  return tok;
}
export const ytForget = () => (tok = null);

// Google izin sayfası. iPhone uygulamasında adres değişince Capacitor onu Safari'de açar (Google uygulama içinde girişe izin vermez).
// Tarayıcıda önce boş sekme açılır (sonradan açılan pencere engellenir), adres gelince ona gider.
const nativeApp = () => typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
export async function ytConnect() {
  const w = nativeApp() ? null : window.open("", "_blank");
  try {
    const { url } = await call("start");
    if (w) w.location.href = url;
    else window.location.href = url;
  } catch (e) {
    w?.close();
    throw e;
  }
}
export async function ytDisconnect() {
  await call("off");
  tok = null;
}

// Yükleme dosyasının adı ve bilgileri: başlık 100, açıklama 5000 karakter; < > YouTube'da yasak
const clean = (s, n) => String(s || "").replace(/[<>]/g, "").trim().slice(0, n);
export const ytMeta = (title, description = "") => ({
  snippet: { title: clean(title, 100) || "Velora video", description: clean(description, 5000), categoryId: "17" },
  status: { privacyStatus: "unlisted", embeddable: true, selfDeclaredMadeForKids: false },
});

// Videoyu kanala Liste dışı yükler (devam ettirilebilir yükleme, tek parça). onProgress(0..1). Sonuç video kimliği.
export async function ytUpload(blob, { title, description } = {}, onProgress) {
  const { token } = await ytToken();
  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-length": String(blob.size),
      "x-upload-content-type": blob.type || "video/mp4",
    },
    body: JSON.stringify(ytMeta(title, description)),
  });
  if (init.status === 401) throw (ytForget(), new YtNeed("connect"));
  if (!init.ok) throw new Error(await ytErr(init));
  const loc = init.headers.get("location");
  if (!loc) throw new Error("YouTube yükleme adresi vermedi");
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest();
    x.open("PUT", loc);
    x.setRequestHeader("content-type", blob.type || "video/mp4");
    x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) {
        try {
          const id = JSON.parse(x.responseText).id;
          return id ? res(id) : rej(new Error("YouTube video kimliği vermedi"));
        } catch {
          return rej(new Error("YouTube cevabı okunamadı"));
        }
      }
      rej(new Error(errText(x.status, x.responseText)));
    };
    x.onerror = () => rej(new Error("Yükleme kesildi. İnterneti kontrol et."));
    x.send(blob);
  });
}

function errText(status, body) {
  let why = "";
  try {
    why = JSON.parse(body)?.error?.errors?.[0]?.reason || JSON.parse(body)?.error?.message || "";
  } catch {}
  if (/quota/i.test(why)) return "YouTube'un günlük yükleme sınırı doldu. Yarın tekrar dene.";
  if (/uploadLimitExceeded/i.test(why)) return "Kanalın yükleme sınırı doldu.";
  return `YouTube kabul etmedi (${status}${why ? ` ${why}` : ""})`;
}
const ytErr = async (r) => errText(r.status, await r.text().catch(() => ""));

async function api(path) {
  const { token } = await ytToken();
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (r.status === 401) throw (ytForget(), new YtNeed("connect"));
  if (!r.ok) throw new Error(await ytErr(r));
  return r.json();
}
const thumbOf = (sn) => sn?.thumbnails?.medium?.url || sn?.thumbnails?.default?.url || "";

// Kanaldaki şu anki canlı yayın(lar) ve son yüklenen videolar (liste dışı olanlar dahil)
// → { channel, live: [{ id, title, thumb, link }], videos: [{ id, title, thumb, link, at, privacy }] }
export async function ytMine() {
  const t = await ytToken();
  const [lb, ch] = await Promise.all([
    api("liveBroadcasts?part=snippet&broadcastStatus=active&broadcastType=all&maxResults=5").catch(() => ({ items: [] })),
    api("channels?part=contentDetails,snippet&mine=true"),
  ]);
  const live = (lb.items || []).map((x) => ({ id: x.id, title: x.snippet?.title || "Canlı yayın", thumb: thumbOf(x.snippet), link: `https://youtu.be/${x.id}` }));
  const up = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  let videos = [];
  if (up) {
    const pl = await api(`playlistItems?part=snippet,status&maxResults=25&playlistId=${up}`);
    videos = (pl.items || [])
      .map((x) => ({ id: x.snippet?.resourceId?.videoId, title: x.snippet?.title || "", thumb: thumbOf(x.snippet), at: x.snippet?.publishedAt || "", privacy: x.status?.privacyStatus || "" }))
      .filter((x) => x.id && !live.some((l) => l.id === x.id))
      .map((x) => ({ ...x, link: `https://youtu.be/${x.id}` }));
  }
  return { channel: ch.items?.[0]?.snippet?.title || t.channel || "", live, videos };
}

export const PRIVACY = { public: "Herkese açık", unlisted: "Liste dışı", private: "Özel" };
