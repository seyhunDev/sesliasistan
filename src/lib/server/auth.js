import { NextResponse } from "next/server";
import { VELORA_ADMIN } from "@/lib/sharedRace";

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

// Güvenilir kulüp (sistem taraması 2026-11-26, madde 1): kayıt herkese açık (Velora Sailing bağlantısı) ve kayıt olan herkes
// kendi kulübünün ana hesabı olur. İzin listesindeki (ALLOWED_EMAILS) ya da Velora ana hesabının (VELORA_ADMIN,
// NEXT_PUBLIC_SPORCU_EMAILS) kulübü sınırsızdır; diğer kulüplerin günlük yapay zekâ harcaması AI_ORG_DAY_USD (varsayılan 0,5 $)
// ile sınırlıdır. Harcama aiUsage.js'in yazdığı usage/ai_{kulüp}_{ay}.usdDay.{gün}'den okunur (kulüp başına 2 dakikada bir okuma).
const trustList = () => [
  ...allowList(),
  VELORA_ADMIN,
  ...(process.env.NEXT_PUBLIC_SPORCU_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
];
const orgInfo = globalThis.__orgTrust || (globalThis.__orgTrust = new Map()); // uid -> { org, trusted }
const daySpend = globalThis.__orgDaySpend || (globalThis.__orgDaySpend = new Map()); // org -> { at, usd }
const adminOn = () => !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
const TZ_DAY = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());

async function trustOf(uid, email) {
  const hit = orgInfo.get(uid);
  if (hit && hit.exp > Date.now()) return hit;
  const list = trustList();
  let v = { org: uid, trusted: list.includes((email || "").toLowerCase()) };
  if (!v.trusted) {
    const { adminAuth, profileOf } = await import("@/lib/server/admin");
    const p = await profileOf(uid);
    if (p.role === "staff" && p.orgId && p.orgId !== uid) {
      const owner = await profileOf(p.orgId);
      const oe = owner.role === "owner" ? ((await adminAuth().getUser(p.orgId)).email || "").toLowerCase() : "";
      v = { org: p.orgId, trusted: !!oe && list.includes(oe) };
    }
  }
  v.exp = Date.now() + 30 * 60e3;
  orgInfo.set(uid, v);
  if (orgInfo.size > 500) orgInfo.delete(orgInfo.keys().next().value);
  return v;
}

async function orgOverCap(org) {
  const cap = Number(process.env.AI_ORG_DAY_USD);
  const limit = process.env.AI_ORG_DAY_USD && Number.isFinite(cap) && cap >= 0 ? cap : 0.5;
  const day = TZ_DAY();
  let s = daySpend.get(org);
  if (!s || s.day !== day || Date.now() - s.at > 2 * 60e3) {
    const { adminDb } = await import("@/lib/server/admin");
    const d = (await adminDb().collection("usage").doc(`ai_${org}_${day.slice(0, 7)}`).get()).data();
    s = { at: Date.now(), day, usd: Number(d?.usdDay?.[day.slice(8, 10)]) || 0 };
    daySpend.set(org, s);
    if (daySpend.size > 500) daySpend.delete(daySpend.keys().next().value);
  }
  return s.usd >= limit;
}

// Güvenilmeyen kulüp günlük yapay zekâ sınırını geçtiyse 429. Yönetici anahtarı yoksa ya da okunamazsa engellemez.
async function capCheck(uid, email) {
  if (!adminOn()) return null;
  try {
    const t = await trustOf(uid, email);
    if (t.trusted || !(await orgOverCap(t.org))) return null;
    return { ok: false, status: 429, error: "Bu hesabın bugünkü yapay zekâ kullanım sınırı doldu. Yarın tekrar dene." };
  } catch (e) {
    console.warn("[auth] kulüp sınırı okunamadı:", e?.message?.slice(0, 120));
    return null;
  }
}

// Hesabın rolü: kişi (çalışan) mı, kişiyse ana hesabı izin listesinde mi. { staff, ok }
// Önce yönetici anahtarıyla; anahtar yoksa ya da çalışmazsa (Netlify'da bozuk anahtar) kişinin kendi profili kendi
// oturumuyla okunur. Kişi profilini yalnızca sunucu oluşturabilir (kurallar istemcinin "staff" profil açmasına izin
// vermez), bu yüzden profilde staff yazıyorsa kişi gerçekten bir ana hesaba bağlıdır. Anahtar sorunu kişileri engellemez.
async function roleOf(uid, token, allowed) {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const { adminAuth, profileOf } = await import("@/lib/server/admin");
      const p = await profileOf(uid);
      if (p.role !== "staff") return { staff: false, ok: false };
      if (!allowed.length) return { staff: true, ok: true };
      const owner = await profileOf(p.orgId);
      const email = (await adminAuth().getUser(p.orgId)).email?.toLowerCase();
      return { staff: true, ok: owner.role === "owner" && allowed.includes(email) };
    } catch (e) {
      console.warn("[auth] yönetici anahtarı çalışmadı, profil kişinin oturumuyla okunuyor:", e?.message?.slice(0, 120));
    }
  }
  try {
    const pid = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const base = process.env.FIRESTORE_EMULATOR_HOST ? `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1` : "https://firestore.googleapis.com/v1";
    const res = await fetch(`${base}/projects/${pid}/databases/(default)/documents/users/${uid}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { staff: false, ok: false };
    const staff = (await res.json()).fields?.role?.stringValue === "staff";
    return { staff, ok: staff };
  } catch {
    return { staff: false, ok: false };
  }
}

async function check(uid, email, cached, free = false) {
  const allowed = allowList();
  if (allowed.length && !allowed.includes((email || "").toLowerCase()) && !cached?.staffOk) {
    return { ok: false, status: 403, error: "Bu hesabın asistanı kullanma izni yok. Yöneticiden erişim iste." };
  }
  const over = free ? "" : overLimit(uid);
  if (!over && !free) {
    const capped = await capCheck(uid, email);
    if (capped) return capped;
  }
  if (over) {
    return {
      ok: false,
      status: 429,
      error: over === "hour" ? "Kısa sürede çok fazla istek gönderildi. Biraz sonra tekrar dene." : "Bugünkü kullanım sınırına ulaşıldı. Yarın tekrar dene.",
    };
  }
  return { ok: true, uid, email: (email || "").toLowerCase(), staff: !!cached?.staff, verified: !!cached?.verified };
}

// Token'ın içindeki kullanıcı kimliği (imza doğrulanmadan; yalnızca geliştirme kısayolunda kullanılır)
function peek(token) {
  try {
    const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return { uid: p.user_id || p.sub || "", email: String(p.email || "").toLowerCase(), verified: p.email_verified === true };
  } catch {
    return { uid: "", email: "" };
  }
}

// Firebase ID token'ını doğrular, izin listesini ve istek sınırını uygular.
// Geliştirmede DEV_SKIP_AUTH=1 ile doğrulama atlanabilir (yayında yok sayılır). Bu durumda da giriş yapan
// kişinin gerçek kimliği kullanılır; "dev" gibi sahte bir kimlikle kayıt açılırsa veriler yanlış işletmeye gider.
// free: istek sınırına sayılmaz (sık yenilenen, yapay zekasız veri: deniz trafiği)
export async function requireUser(request, { free = false } = {}) {
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (process.env.DEV_SKIP_AUTH === "1" && process.env.NODE_ENV !== "production") {
    const { uid, email, verified } = token ? peek(token) : {};
    if (!uid) return { ok: false, error: "Geliştirme modunda da giriş yapmış olmalısın." };
    const r = await roleOf(uid, token, []);
    return { ok: true, uid, email, staff: r.staff, verified: !!verified };
  }
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!token || !key) return { ok: false };

  const hit = cache.get(token);
  if (hit && hit.exp > Date.now()) return check(hit.uid, hit.email, hit, free);
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });
    if (!res.ok) return { ok: false };
    const u = (await res.json()).users?.[0];
    if (!u?.localId) return { ok: false };
    const entry = { uid: u.localId, email: u.email || "", verified: !!u.emailVerified, exp: Date.now() + 5 * 60 * 1000 };
    const allowed = allowList();
    // İzin listesindeki e-posta ana hesaptır; değilse rolüne bakılır (kişi mi, ana hesabı izinli mi)
    if (!allowed.includes(entry.email.toLowerCase())) {
      const r = await roleOf(u.localId, token, allowed);
      entry.staff = r.staff;
      entry.staffOk = r.ok;
    }
    cache.set(token, entry);
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    return check(u.localId, u.email, entry, free);
  } catch {
    return { ok: false };
  }
}

// requireUser sonucuna göre uygun yanıt: 401 (oturum yok), 403 (izin yok), 429 (sınır aşıldı)
export const unauthorized = (au) =>
  NextResponse.json({ error: au?.error || "Oturum gerekli. Giriş yapıp tekrar dene." }, { status: au?.status || 401 });
