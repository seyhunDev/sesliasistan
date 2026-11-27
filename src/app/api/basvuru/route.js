import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb, adminReady } from "@/lib/server/admin";
import { sendTo } from "@/lib/server/pushSend";
import { basvuruTemizle } from "@/lib/basvuru";
import { cihazOf } from "@/lib/kullanim";
import { VELORA_ADMIN } from "@/lib/sharedRace";

export const runtime = "nodejs";

// Tanıtımdaki "Velora'ya katıl" başvurusu (Seyhun 2026-11-26). Herkese açık; giriş gerekmez. Alanlar sunucuda da kontrol edilir
// (lib/basvuru), kayıt yönetici anahtarıyla orgs/{ana hesap}/basvurular'a yazılır (istemci yazamaz, yalnız ana hesap okur),
// ana hesaba bildirim gider (Ayarlar › Admin). Kötüye kullanım: gizli "web" alanı dolu gelirse (bot) sessizce yok sayılır,
// aynı yerden saatte en çok 5 başvuru, aynı numaradan 1 günde tek kayıt.

const hits = new Map(); // ip -> [zaman]
function cok(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 2000) hits.delete(hits.keys().next().value);
  return list.length > 5;
}

// Başvurunun gideceği ana hesap: TANITIM_ORG (Netlify, isteğe bağlı) ya da tek ana hesap; birden çoksa izin listesindeki ilk e-posta
let org = "";
async function anaHesap(db) {
  if (org) return org;
  if (process.env.TANITIM_ORG) return (org = process.env.TANITIM_ORG);
  // Velora'nın sahibi (VELORA_ADMIN). Herkese açılınca her antrenör de "owner" olur; yalnız role'e bakmak başvuruyu kaybeder
  // (açılış testi, 2026-11-27).
  const sahip = await adminAuth().getUserByEmail(VELORA_ADMIN).catch(() => null);
  if (sahip) {
    const p = await db.collection("users").doc(sahip.uid).get();
    if (p.exists && p.data().role === "owner") return (org = p.data().orgId || sahip.uid);
  }
  const snap = await db.collection("users").where("role", "==", "owner").limit(5).get();
  if (snap.size === 1) return (org = snap.docs[0].id);
  const first = (process.env.ALLOWED_EMAILS || "").split(",")[0]?.trim();
  if (first) {
    const u = await adminAuth().getUserByEmail(first).catch(() => null);
    if (u && snap.docs.some((d) => d.id === u.uid)) return (org = u.uid);
  }
  return "";
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (body.web) return NextResponse.json({ ok: true }); // bot
  const ip = req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || "?";
  if (cok(ip)) return NextResponse.json({ error: "Çok fazla başvuru gönderildi, biraz sonra yeniden dene." }, { status: 429 });
  const r = basvuruTemizle(body);
  if (!r.ok) return NextResponse.json({ error: Object.values(r.hatalar)[0], hatalar: r.hatalar }, { status: 400 });
  if (!adminReady()) return NextResponse.json({ error: "Başvuru şu an alınamıyor, biraz sonra yeniden dene." }, { status: 503 });

  const db = adminDb();
  const o = await anaHesap(db).catch(() => "");
  if (!o) {
    console.error("[basvuru] ana hesap bulunamadı (TANITIM_ORG yok, birden çok ana hesap)");
    return NextResponse.json({ error: "Başvuru şu an alınamıyor, biraz sonra yeniden dene." }, { status: 503 });
  }
  const col = db.collection("orgs").doc(o).collection("basvurular");
  // Aynı numara son 24 saatte başvurduysa yeni kayıt açılmaz (yeniden basma, sayfayı yenileme)
  const once = await col.where("tel", "==", r.veri.tel).limit(3).get();
  if (once.docs.some((d) => Date.now() - (d.data().at?.toMillis?.() || 0) < 864e5)) return NextResponse.json({ ok: true });

  const ref = await col.add({
    ...r.veri,
    durum: "yeni",
    at: FieldValue.serverTimestamp(),
    cihaz: cihazOf(req.headers.get("user-agent") || ""),
    kaynak: String(body.kaynak || "Tanıtım").slice(0, 30),
  });
  await sendTo(o, { title: `Yeni başvuru: ${r.veri.ad}`, body: `${r.veri.rol} · ${r.veri.kulup}`, tag: `basvuru-${ref.id}`, url: "/settings/admin", cat: "basvuru" }).catch((e) =>
    console.error("[basvuru] bildirim gitmedi:", e?.message),
  );
  return NextResponse.json({ ok: true });
}
