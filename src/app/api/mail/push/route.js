import { NextResponse } from "next/server";
import webpush from "web-push";
import { mailDigestText } from "@/lib/bankSheet";
import { sheetsFromRaw, xlsxOf } from "@/lib/mailParse";
import { restDb } from "@/lib/server/firestoreRest";
import { duesText, runAutoDues } from "@/lib/duesAuto";

export const runtime = "nodejs";

// Gmail betiği yeni mail kaydedince hemen buraya haber verir → telefona tek bildirim (o turda gelen bütün mailler).
// Kimlik: betiğin Google erişim anahtarı (Firebase projesinde yetkili hesap). Sunucu veritabanını bu anahtarla okur/yazar;
// hizmet hesabı anahtarı (FIREBASE_PRIVATE_KEY) gerekmez. Yalnızca VAPID anahtarları gerekir.
// Hesap özetindeki sporcu ödemeleri aidata yazılır, bildirim "Aidat geldi: …" olur (duesAuto.js).
// Bildirilen mailler notified:true olur; 5 dakikalık zamanlanmış görev aynı maili bir daha bildirmez.
export async function POST(request) {
  const h = request.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  const { uid } = await request.json().catch(() => ({}));
  if (!token || !/^[\w-]{6,128}$/.test(String(uid || ""))) return NextResponse.json({ error: "Eksik istek" }, { status: 400 });
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return NextResponse.json({ error: "Sunucuda VAPID anahtarları yok" }, { status: 500 });

  const db = restDb(token);
  const user = await db.get(`users/${uid}`);
  if (user.status !== 200) return NextResponse.json({ error: "Veritabanına erişilemedi" }, { status: user.status === 404 ? 404 : 403 });

  const list = await db.where(`orgs/${uid}`, "mails", "notified", false, 30);
  if (!list.length) return NextResponse.json({ sent: 0, mails: 0 });

  // Excel ekleri henüz okunmadıysa burada okunur: bildirimde bakiye görünsün
  let XLSX = null;
  const mails = [];
  for (const { id, data: m } of list) {
    if (!m.sheets && m.raw?.length) {
      XLSX ||= xlsxOf(await import("xlsx"));
      m.sheets = sheetsFromRaw(m.raw, XLSX);
      await db.patch(`orgs/${uid}/mails/${id}`, { sheets: m.sheets }).catch(() => {});
    }
    mails.push(m);
  }

  // Sporcu aidatı geldiyse kendiliğinden yazılır; bildirim mail özeti yerine aidatı söyler (duesAuto.js)
  const io = {
    get: async (path) => {
      const r = await db.get(path);
      return r.status === 200 ? r.data : null;
    },
    set: async (path, fields) => {
      const st = await db.upsert(path, fields);
      if (st !== 200) throw new Error(`yazılamadı ${st}`);
    },
  };
  const dues = duesText(await runAutoDues(io, uid, mails).catch((e) => (console.error("[aidat]", e.message), null)));

  const subs = Object.values(user.data.push || {}).filter((s) => s?.endpoint);
  let sent = 0;
  const errors = [];
  if (subs.length) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:bildirim@sesliasistan.app", pub, priv);
    const payload = JSON.stringify(dues ? { ...dues, tag: `dues-${list[0].id}`, url: "/dues" } : { ...mailDigestText(mails), tag: `mail-${list[0].id}`, url: "/mail" });
    await Promise.all(
      subs.map((s) =>
        webpush.sendNotification(s, payload, { TTL: 6 * 3600 }).then(
          () => sent++,
          (e) => errors.push(e.statusCode || String(e.message || e).slice(0, 80)), // geçersiz abonelikleri zamanlanmış görev temizler
        ),
      ),
    );
  }
  await Promise.all(list.map(({ id }) => db.patch(`orgs/${uid}/mails/${id}`, { notified: true })));
  await db.patch(`users/${uid}`, { mailPending: false });
  return NextResponse.json({ sent, mails: list.length, devices: subs.length, ...(errors.length ? { errors } : {}) });
}
