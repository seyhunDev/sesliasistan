// Plan hatırlatmaları: Netlify bunu 5 dakikada bir çalıştırır.
// Hatırlatması açık kullanıcıların yaklaşan planlarına bakar, zamanı gelenler için telefona bildirim gönderir.
// Gerekli ortam değişkenleri: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (hizmet hesabından), NEXT_PUBLIC_FIREBASE_PROJECT_ID,
// NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import webpush from "web-push";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { dueReminders, localNow, reminderText, remindKey } from "../../src/lib/reminders.js";

export const config = { schedule: "*/5 * * * *" };

const addDays = (date, n) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function sendDueReminders() {
  const env = process.env;
  const pub = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = env.VAPID_PRIVATE_KEY;
  const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY || !projectId || !pub || !priv) {
    console.warn("[reminders] ayar eksik: FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY / VAPID anahtarları");
    return new Response("ayar eksik", { status: 200 });
  }
  if (!getApps().length) {
    // Özel anahtar tek satır ("\n" ile) ya da çok satır girilmiş olabilir
    const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
    initializeApp({ credential: cert({ projectId, clientEmail: env.FIREBASE_CLIENT_EMAIL, privateKey }) });
  }
  const db = getFirestore();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:bildirim@sesliasistan.app", pub, priv);

  const users = await db.collection("users").where("reminders.on", "==", true).get();
  let sent = 0;
  for (const u of users.docs) {
    const { reminders = {}, push = {}, role, orgId } = u.data();
    const subs = Object.entries(push);
    if (!subs.length) continue;
    const lead = Number(reminders.lead) || 60;
    const tz = reminders.tz || "Europe/Istanbul";
    const today = localNow(tz).date;
    // Bugünden 2 gün sonrasına kadar olan planlar ("1 gün önce" hatırlatması için yarın ve öbür gün).
    // Çalışan yalnızca kendisini ilgilendiren (people listesinde olduğu) planlar için bildirim alır.
    const snap = await db.collection("orgs").doc(orgId || u.id).collection("plans").where("date", ">=", today).where("date", "<=", addDays(today, 2)).get();
    const plans = snap.docs.map((d) => ({ ...d.data(), id: d.id })).filter((p) => role !== "staff" || (p.people || []).includes(u.id));
    for (const p of dueReminders(plans, { lead, tz, uid: u.id })) {
      const payload = JSON.stringify(reminderText(p, lead));
      await Promise.all(
        subs.map(async ([key, sub]) => {
          try {
            await webpush.sendNotification(sub, payload, { TTL: 3600 });
            sent++;
          } catch (e) {
            // Telefon aboneliği bitmiş (uygulama silinmiş / izin kaldırılmış): kaydı temizle
            if (e.statusCode === 404 || e.statusCode === 410) await u.ref.update({ [`push.${key}`]: FieldValue.delete() });
            else console.error("[reminders] gönderilemedi:", e.statusCode, e.body || e.message);
          }
        }),
      );
      await snap.docs.find((d) => d.id === p.id).ref.update({ [`reminded.${u.id}`]: remindKey(p, lead) });
    }
  }
  console.log(`[reminders] ${users.size} kullanıcı, ${sent} bildirim`);
  return new Response(`ok ${sent}`);
}

export default sendDueReminders;
