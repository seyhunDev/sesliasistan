// YouTube kanalı (Seyhun 2026-11-06): Velora'dan videoyu kanala yükleme ve kanaldaki videoları/canlı yayını listeleme.
// Erişim anahtarı sunucudan (api/youtube, 1 saatlik) alınır; yükleme ve liste YouTube'a doğrudan gider.
import { authFetch } from "@/lib/authFetch";
import { addSource } from "@/lib/raceRounds";

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

async function api(path, { method = "GET", body } = {}) {
  const { token } = await ytToken();
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (r.status === 401) throw (ytForget(), new YtNeed("connect"));
  if (r.status === 204) return {};
  const t = await r.text().catch(() => "");
  // eski bağlantıda yayın yönetme izni yok: yeniden bağlanılır
  if (r.status === 403 && /insufficientPermissions|insufficient authentication scopes/i.test(t)) throw new YtNeed("connect", "YouTube iznini yenile");
  if (!r.ok) throw new Error(errText(r.status, t));
  return t ? JSON.parse(t) : {};
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

// Kalıcı yayın anahtarı (Seyhun 2026-11-06 çoklu kaynak: "2 drone, 2 telefon, sabit kameralar"): her kaynağa kanalda bir anahtar.
// Anahtar bir kez cihaza (DJI Fly, PRISM, kamera uygulaması) girilir, hiç değişmez. Sonuç anahtarın kimliği (kaynakta ytStream).
export async function ytNewStream(name) {
  const d = await api("liveStreams?part=snippet,cdn,contentDetails", {
    method: "POST",
    body: { snippet: { title: clean(`Velora · ${name}`, 100) }, cdn: { ingestionType: "rtmp", resolution: "variable", frameRate: "variable" }, contentDetails: { isReusable: true } },
  });
  if (!d.id) throw new Error("YouTube anahtar açmadı");
  return d.id;
}
// Cihaza girilecek adres ve anahtar: { url, key, health } (Firestore'a yazılmaz, her seferinde YouTube'dan okunur)
export async function ytStreamInfo(id) {
  const d = await api(`liveStreams?part=cdn,status&id=${encodeURIComponent(id)}`);
  const it = d.items?.[0];
  if (!it) throw new Error("Anahtar YouTube'da bulunamadı");
  const ing = it.cdn?.ingestionInfo || {};
  return { url: ing.ingestionAddress || "rtmp://a.rtmp.youtube.com/live2", key: ing.streamName || "", health: it.status?.streamStatus || "" };
}

// Yayının bekleyen ya da süren hâlleri: bunlardan biriyse bağlı yayın yeniden kullanılır; bittiyse (complete) yenisi açılır
export const YT_OPEN = ["created", "ready", "testStarting", "testing", "liveStarting", "live"];
const vidOf = (u) => (String(u || "").match(/(?:youtu\.be\/|[?&]v=|\/live\/)([\w-]{11})/) || [])[1] || "";
// Hangi kaynaklara yeni yayın gerekir: anahtarı olan, bağlı yayını olmayan ya da yayını bitmiş/silinmiş (saf; test yaris.mjs)
export const needBroadcast = (sources, status) => sources.filter((x) => x.ytStream && !YT_OPEN.includes(status[vidOf(x.url)] || ""));

// Günün yayınları: anahtarı olan her kaynak için Liste dışı, kendiliğinden başlayıp biten yayın açılır ve anahtara bağlanır;
// cihaz yayına başlayınca yayın kendisi canlıya geçer. Sonuç değişen kaynaklar { id: url } (değişen yoksa {}).
export async function ytPrepare(sources, titleOf) {
  const mine = sources.filter((x) => x.ytStream);
  if (!mine.length) return {};
  const ids = mine.map((x) => vidOf(x.url)).filter(Boolean);
  const status = {};
  if (ids.length) {
    const d = await api(`liveBroadcasts?part=status&id=${ids.join(",")}&maxResults=50`);
    for (const it of d.items || []) status[it.id] = it.status?.lifeCycleStatus || "";
  }
  const out = {};
  for (const x of needBroadcast(mine, status)) {
    const b = await api("liveBroadcasts?part=snippet,status,contentDetails", {
      method: "POST",
      body: {
        snippet: { title: clean(titleOf(x), 100) || "Velora canlı", scheduledStartTime: new Date(Date.now() + 60e3).toISOString() },
        status: { privacyStatus: "unlisted", selfDeclaredMadeForKids: false },
        contentDetails: { enableAutoStart: true, enableAutoStop: true, enableEmbed: true, latencyPreference: "low", enableDvr: true },
      },
    });
    if (!b.id) continue;
    await api(`liveBroadcasts/bind?id=${b.id}&part=id,contentDetails&streamId=${encodeURIComponent(x.ytStream)}`, { method: "POST" });
    out[x.id] = `https://youtu.be/${b.id}`;
  }
  return out;
}

// Kanalda şu an süren canlı yayınlar (Seyhun 2026-11-06 "kendim bir yayın açınca onu göreyim, direkt seçebileyim"): [{ id, title, link }]
export async function ytLiveNow() {
  const d = await api("liveBroadcasts?part=snippet&broadcastStatus=active&broadcastType=all&maxResults=8");
  return (d.items || []).map((x) => ({ id: x.id, title: x.snippet?.title || "", link: `https://youtu.be/${x.id}` }));
}
// Kaynak listesine kanalın canlı yayınları: listede olmayan her canlı yayın kaynak olarak eklenir (auto), bitmiş olan kendiliğinden
// eklenmiş kaynak kalkar. Elle eklenenlere dokunulmaz. Değişiklik yoksa null (saf; test yaris.mjs)
export function withMyLive(list, live) {
  const on = new Set(live.map((x) => x.id));
  let l = list.filter((x) => !x.auto || on.has(vidOf(x.url)));
  const have = new Set(l.map((x) => vidOf(x.url)).filter(Boolean));
  for (const b of live) {
    if (have.has(b.id) || l.length >= 8) continue;
    const n = addSource(l, "camera");
    l = n.map((x, i) => (i === n.length - 1 ? { ...x, name: clean(b.title, 30) || x.name, url: b.link, auto: true } : x));
    have.add(b.id);
  }
  const same = l.length === list.length && l.every((x, i) => x === list[i]);
  return same ? null : l;
}
