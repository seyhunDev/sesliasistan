import { NextResponse } from "next/server";

const cache = new Map(); // token -> { uid, exp }

// Firebase ID token'ını doğrular. Geliştirmede DEV_SKIP_AUTH=1 ile atlanabilir (yayında yok sayılır).
export async function requireUser(request) {
  if (process.env.DEV_SKIP_AUTH === "1" && process.env.NODE_ENV !== "production") return { ok: true, uid: "dev" };
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!token || !key) return { ok: false };

  const hit = cache.get(token);
  if (hit && hit.exp > Date.now()) return { ok: true, uid: hit.uid };
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    });
    if (!res.ok) return { ok: false };
    const uid = (await res.json()).users?.[0]?.localId;
    if (!uid) return { ok: false };
    cache.set(token, { uid, exp: Date.now() + 5 * 60 * 1000 });
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    return { ok: true, uid };
  } catch {
    return { ok: false };
  }
}

export const unauthorized = () => NextResponse.json({ error: "Oturum gerekli. Giriş yapıp tekrar dene." }, { status: 401 });
