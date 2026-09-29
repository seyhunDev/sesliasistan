import { NextResponse } from "next/server";

const cache = new Map(); // token -> { uid, email, exp }

// İzin verilen e-postalar (virgülle): ALLOWED_EMAILS="ben@ornek.com,kulup@ornek.com". Boşsa giriş yapan herkes kullanabilir.
const allowList = () =>
  (process.env.ALLOWED_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

// Kişi başı istek sınırı (kota ve faturayı korur). Sunucu örneği başına tutulur; yeniden başlayınca sıfırlanır.
// AI_LIMIT_HOUR / AI_LIMIT_DAY ile değiştirilebilir.
const hits = new Map(); // uid -> [zaman damgaları]
const HOUR = 3600e3;
const DAY = 24 * HOUR;
function overLimit(uid) {
  const perHour = Number(process.env.AI_LIMIT_HOUR) || 120;
  const perDay = Number(process.env.AI_LIMIT_DAY) || 600;
  const now = Date.now();
  const list = (hits.get(uid) || []).filter((t) => now - t < DAY);
  const lastHour = list.filter((t) => now - t < HOUR).length;
  if (lastHour >= perHour || list.length >= perDay) {
    hits.set(uid, list);
    return lastHour >= perHour ? "hour" : "day";
  }
  list.push(now);
  hits.set(uid, list);
  if (hits.size > 500) hits.delete(hits.keys().next().value);
  return "";
}

// İzin listesinde olmayan hesap, listedeki bir ana hesabın çalışanıysa da kullanabilir
// Yönetici bağlantısı yalnızca gerektiğinde yüklenir (diğer API'ler firebase-admin'e bağımlı olmasın)
async function staffOfAllowed(uid, allowed) {
  if (!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)) return false;
  try {
    const { adminAuth, profileOf } = await import("@/lib/server/admin");
    const p = await profileOf(uid);
    if (p.role !== "staff") return false;
    const owner = await profileOf(p.orgId);
    const email = (await adminAuth().getUser(p.orgId)).email?.toLowerCase();
    return owner.role === "owner" && allowed.includes(email);
  } catch {
    return false;
  }
}

async function check(uid, email, cached) {
  const allowed = allowList();
  if (allowed.length && !allowed.includes((email || "").toLowerCase()) && !(cached?.staffOk ?? (await staffOfAllowed(uid, allowed)))) {
    return { ok: false, status: 403, error: "Bu hesabın asistanı kullanma izni yok. Yöneticiden erişim iste." };
  }
  const over = overLimit(uid);
  if (over) {
    return {
      ok: false,
      status: 429,
      error: over === "hour" ? "Kısa sürede çok fazla istek gönderildi. Biraz sonra tekrar dene." : "Bugünkü kullanım sınırına ulaşıldı. Yarın tekrar dene.",
    };
  }
  return { ok: true, uid };
}

// Token'ın içindeki kullanıcı kimliği (imza doğrulanmadan; yalnızca geliştirme kısayolunda kullanılır)
function peekUid(token) {
  try {
    const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return p.user_id || p.sub || "";
  } catch {
    return "";
  }
}

// Firebase ID token'ını doğrular, izin listesini ve istek sınırını uygular.
// Geliştirmede DEV_SKIP_AUTH=1 ile doğrulama atlanabilir (yayında yok sayılır). Bu durumda da giriş yapan
// kişinin gerçek kimliği kullanılır; "dev" gibi sahte bir kimlikle kayıt açılırsa veriler yanlış işletmeye gider.
export async function requireUser(request) {
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (process.env.DEV_SKIP_AUTH === "1" && process.env.NODE_ENV !== "production") {
    const uid = token && peekUid(token);
    return uid ? { ok: true, uid } : { ok: false, error: "Geliştirme modunda da giriş yapmış olmalısın." };
  }
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!token || !key) return { ok: false };

  const hit = cache.get(token);
  if (hit && hit.exp > Date.now()) return check(hit.uid, hit.email, hit);
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });
    if (!res.ok) return { ok: false };
    const u = (await res.json()).users?.[0];
    if (!u?.localId) return { ok: false };
    const entry = { uid: u.localId, email: u.email || "", exp: Date.now() + 5 * 60 * 1000 };
    const allowed = allowList();
    if (allowed.length && !allowed.includes(entry.email.toLowerCase())) entry.staffOk = await staffOfAllowed(u.localId, allowed);
    cache.set(token, entry);
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    return check(u.localId, u.email, entry);
  } catch {
    return { ok: false };
  }
}

// requireUser sonucuna göre uygun yanıt: 401 (oturum yok), 403 (izin yok), 429 (sınır aşıldı)
export const unauthorized = (au) =>
  NextResponse.json({ error: au?.error || "Oturum gerekli. Giriş yapıp tekrar dene." }, { status: au?.status || 401 });
