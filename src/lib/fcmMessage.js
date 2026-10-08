// Android uygulamasına (Firebase Cloud Messaging) gidecek bildirimi Web Push yükünden kurar. Saf: test edilir.
// Metin service worker'daki gibi tek satırlık başlık + ayrıntı (public/sw.js onPush).
const flat = (x) => String(x || "").replace(/\s*\n+\s*/g, " · ").replace(/\s+/g, " ").trim();

export function fcmMessage(token, payload, ttlSec = 86400) {
  let d = payload;
  if (typeof d === "string") {
    try {
      d = JSON.parse(d);
    } catch {
      d = { body: d };
    }
  }
  d = d && typeof d === "object" ? d : {};
  const head = flat(d.title);
  const rest = flat(d.body);
  const title = (head || rest || "Yeni bildirimin var").slice(0, 200);
  const body = head ? rest.slice(0, 1000) : "";
  const tag = d.tag ? String(d.tag).slice(0, 100) : undefined;
  const count = typeof d.badge === "number" && d.badge > 0 ? Math.min(999, Math.round(d.badge)) : undefined;
  return {
    token,
    notification: { title, ...(body ? { body } : {}) },
    data: { url: String(d.url || "/"), ...(tag ? { tag } : {}) },
    android: {
      priority: "high",
      ttl: Math.max(0, Math.round(ttlSec)) * 1000,
      ...(tag ? { collapseKey: tag } : {}),
      notification: { channelId: "genel", ...(tag ? { tag } : {}), ...(count ? { notificationCount: count } : {}) },
    },
  };
}
