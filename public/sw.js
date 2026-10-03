// Sesli Asistan service worker: çevrimdışı açılış + plan hatırlatma bildirimleri.
// Önbellek yalnızca yayında açık (?dev=1 ile kaydedilirse kapalı; geliştirmede eski dosya sorunu olmasın).
const VERSION = "sa-v10";
const PAGES_CACHE = `${VERSION}-pages`;
const STATIC_CACHE = `${VERSION}-static`;
const PAGES = ["/", "/plans", "/tasks", "/notes", "/receipts", "/calendar", "/schedule", "/staff", "/login"];
const CACHE_ON = !new URL(self.location).searchParams.has("dev");
const NAV_TIMEOUT = 4000; // ağ bu sürede cevap vermezse kayıtlı sayfa açılır

// Sayfayı ve içindeki /_next/static dosyalarını önbelleğe alır (diğer sayfalar da internetsiz açılabilsin)
async function cachePage(path) {
  const res = await fetch(path, { cache: "reload", credentials: "same-origin" });
  if (!res.ok || res.redirected) return;
  const pages = await caches.open(PAGES_CACHE);
  await pages.put(path, res.clone());
  const html = await res.text();
  const assets = new Set([...html.matchAll(/\/_next\/static\/[^"'\s)\\]+/g)].map((m) => m[0]));
  const stat = await caches.open(STATIC_CACHE);
  await Promise.all(
    [...assets].map(async (u) => {
      if (await stat.match(u)) return;
      const r = await fetch(u).catch(() => null);
      if (r?.ok) await stat.put(u, r);
    }),
  );
}

self.addEventListener("install", (e) => {
  e.waitUntil((CACHE_ON ? Promise.all(PAGES.map((p) => cachePage(p).catch(() => {}))) : Promise.resolve()).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION) || !CACHE_ON).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));

self.addEventListener("fetch", (e) => {
  if (!CACHE_ON) return;
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Değişmeyen dosyalar (adında sürüm var): önce önbellek
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Sayfalar: önce ağ (güncel sürüm), ağ yoksa ya da yavaşsa kayıtlı sayfa
  if (req.mode === "navigate") {
    const path = url.pathname;
    e.respondWith(
      (async () => {
        const pages = await caches.open(PAGES_CACHE);
        try {
          const res = await Promise.race([fetch(req), timeout(NAV_TIMEOUT)]);
          if (res.ok && !res.redirected) pages.put(path, res.clone());
          return res;
        } catch {
          const hit = await pages.match(path);
          if (hit) return hit;
          return new Response(
            '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Çevrimdışı</title><body style="font-family:system-ui;background:#f4f3ef;color:#26282c;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px"><div><h1 style="font-size:20px">İnternet bağlantısı yok</h1><p style="color:#74777d">Bu sayfa henüz telefona kaydedilmedi. Bağlantı gelince tekrar dene.</p></div>',
            { headers: { "content-type": "text/html; charset=utf-8" } },
          );
        }
      })(),
    );
  }
});

// ---- Bildirimler ----
// iPhone, push geldiğinde bildirim gösterilmezse (işleyici hata verirse ya da çok uzun sürerse) kendi İngilizce
// standart metnini yazar ("This website has been updated in the background"). Bu yüzden: önce bildirim gösterilir,
// hiçbir adım hata fırlatmaz, yan işler (simge sayısı, "iletildi" onayı) kısa süreyle sınırlıdır.
const FALLBACK = { body: "Yeni bildirimin var" };
const within = (p, ms) => Promise.race([p, new Promise((r) => setTimeout(r, ms))]).catch(() => {});

function readPush(e) {
  try {
    const d = e.data ? e.data.json() : null;
    if (d && typeof d === "object") return d;
  } catch {}
  try {
    const t = e.data?.text();
    if (t) return { body: t };
  } catch {}
  return {};
}

async function onPush(e) {
  const d = readPush(e);
  // Tek satır: başlık ve ayrıntı birleşir ("Yeni görev: Motor yağı · Son gün yarın · Ali verdi",
  // "Ali Kaya · Motor yağı: Yağ bitmiş"). Telefon üstte yalnız uygulama adını ekler.
  const flat = (x) => String(x || "").replace(/\s*\n+\s*/g, " · ").replace(/\s+/g, " ").trim();
  const head = flat(d.title);
  const rest = flat(d.body);
  const title = head && rest ? `${head}${head.includes(":") || rest.includes(":") ? " · " : ": "}${rest}` : head || rest || FALLBACK.body;
  const opts = {
    body: "",
    lang: "tr",
    tag: d.tag || undefined, // aynı kayıt için tek bildirim (yenisi öncekinin yerine geçer, yığılmaz)
    renotify: !!d.tag, // yerine geçerken de sesle/titreşimle haber ver
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: d.url || "/" },
  };
  try {
    await self.registration.showNotification(title, opts);
  } catch {
    // Seçeneklerden biri bu cihazda desteklenmiyorsa en sade hâliyle yine göster
    await self.registration.showNotification(title, { data: opts.data }).catch(() => {});
  }
  // Uygulama simgesindeki sayı (iPhone'da ana ekrana eklenmiş uygulama, iOS 16.4+)
  try {
    if (typeof d.badge === "number" && self.navigator.setAppBadge)
      await within(d.badge > 0 ? self.navigator.setAppBadge(d.badge) : self.navigator.clearAppBadge(), 1500);
  } catch {}
  // Atama bildirimi: telefona ulaştı ("iletildi") onayı
  if (d.ack) {
    try {
      await within(fetch("/api/ack", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(d.ack) }), 4000);
    } catch {}
  }
}

self.addEventListener("push", (e) => {
  e.waitUntil(onPush(e).catch(() => self.registration.showNotification(FALLBACK.body).catch(() => {})));
});

// Bildirime dokununca: açık uygulama varsa ona geç, yoksa aç
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = e.notification.data?.url || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate?.(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
