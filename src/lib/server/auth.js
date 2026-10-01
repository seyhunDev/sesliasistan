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

async function check(uid, email, cached) {
  const allowed = allowList();
  if (allowed.length && !allowed.includes((email || "").toLowerCase()) && !cached?.staffOk) {
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
  return { ok: true, uid, email: (email || "").toLowerCase(), staff: !!cached?.staff };
}

// Token'ın içindeki kullanıcı kimliği (imza doğrulanmadan; yalnızca geliştirme kısayolunda kullanılır)
function peek(token) {
  try {
    const p = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    return { uid: p.user_id || p.sub || "", email: String(p.email || "").toLowerCase() };
  } catch {
    return { uid: "", email: "" };
  }
}

// Firebase ID token'ını doğrular, izin listesini ve istek sınırını uygular.
// Geliştirmede DEV_SKIP_AUTH=1 ile doğrulama atlanabilir (yayında yok sayılır). Bu durumda da giriş yapan
// kişinin gerçek kimliği kullanılır; "dev" gibi sahte bir kimlikle kayıt açılırsa veriler yanlış işletmeye gider.
export async function requireUser(request) {
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (process.env.DEV_SKIP_AUTH === "1" && process.env.NODE_ENV !== "production") {
    const { uid, email } = token ? peek(token) : {};
    if (!uid) return { ok: false, error: "Geliştirme modunda da giriş yapmış olmalısın." };
    const r = await roleOf(uid, token, []);
    return { ok: true, uid, email, staff: r.staff };
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
    // İzin listesindeki e-posta ana hesaptır; değilse rolüne bakılır (kişi mi, ana hesabı izinli mi)
    if (!allowed.includes(entry.email.toLowerCase())) {
      const r = await roleOf(u.localId, token, allowed);
      entry.staff = r.staff;
      entry.staffOk = r.ok;
    }
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
