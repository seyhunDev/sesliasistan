import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { cleanKey } from "@/lib/pemKey";

export const runtime = "nodejs";

// Sunucu sağlık kontrolü (girişsiz): yalnızca var/yok ve çalışıyor/çalışmıyor bilgisi. Gizli değer yok.
// Veritabanı için tek bir boş okuma denenir (hiç veri döndürmez): yönetici anahtarı gerçekten çalışıyor mu.
// Tarayıcıda aç: /api/health
export async function GET() {
  const env = process.env;
  const has = (k) => !!env[k];
  const out = {
    surum: "2026-09-30b",
    ayarlar: Object.fromEntries(
      ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "SITE_URL", "GEMINI_API_KEY"].map((k) => [k, has(k)]),
    ),
  };
  try {
    crypto.createPrivateKey(cleanKey(env.FIREBASE_PRIVATE_KEY));
    out.ozelAnahtar = "okunuyor";
  } catch (e) {
    out.ozelAnahtar = env.FIREBASE_PRIVATE_KEY ? `okunamıyor (${String(e.message).slice(0, 60)})` : "yok";
  }
  try {
    const { adminDb } = await import("@/lib/server/admin");
    out.firebaseKutuphanesi = "yüklendi";
    try {
      adminDb();
      out.firebaseBaglanti = "hazır";
      // Gerçek deneme: var olmayan bir belgeyi okur (veri döndürmez). Anahtar yanlışsa burada hata verir.
      const t = Date.now();
      await Promise.race([
        adminDb().collection("_saglik").doc("deneme").get(),
        new Promise((_, no) => setTimeout(() => no(new Error("zaman aşımı (8 sn)")), 8000)),
      ]);
      out.veritabaniOkuma = `çalışıyor (${Date.now() - t} ms)`;
    } catch (e) {
      const msg = String(e.message || e).replace(/\s+/g, " ").slice(0, 160);
      if (out.firebaseBaglanti === "hazır") out.veritabaniOkuma = `ÇALIŞMIYOR: ${msg}`;
      else out.firebaseBaglanti = `hata: ${msg}`;
    }
  } catch (e) {
    out.firebaseKutuphanesi = `yüklenemedi: ${String(e.message).slice(0, 160)}`;
  }
  return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
}
