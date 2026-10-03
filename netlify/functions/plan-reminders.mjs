// Plan hatırlatmaları ve günlük özet: Netlify bunu 5 dakikada bir çalıştırır.
// Hatırlatması açık kullanıcıların yaklaşan planlarına bakar, zamanı gelenler için telefona bildirim gönderir.
// Gerekli ortam değişkenleri: FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (hizmet hesabından), NEXT_PUBLIC_FIREBASE_PROJECT_ID,
// NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
import webpush from "web-push";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, Filter, getFirestore } from "firebase-admin/firestore";
import { dueReminders, localNow, reminderText, remindKey } from "../../src/lib/reminders.js";
import { due, eveningText, morningText } from "../../src/lib/summary.js";
import { WIND_KN, birthdayText, isMonday, weeklyText, windAlert, windRows, windUrl } from "../../src/lib/notifyExtra.js";
import { mailDigestText } from "../../src/lib/bankSheet.js";
import { sheetsFromRaw, xlsxOf } from "../../src/lib/mailParse.js";
import { cleanEmail, cleanKey } from "../../src/lib/pemKey.js";

export const config = { schedule: "*/5 * * * *" };

// Okuma tasarrufu: bildirimle ilgili kullanıcılar her çalışmada tek sorguyla bir kez okunur (önceden 7 ayrı sorgu,
// aynı kişi her birinde yeniden okunuyordu). Kulübün plan/görev sorguları da çalışma boyunca paylaşılır.
const NOTIFY_FIELDS = ["summaryAt", "eveningAt", "birthdayAt", "windAt", "weeklyAt"];
const hasAt = (d, k) => typeof d[k] === "string" && d[k] > "";
async function notifyUsers(db) {
  const users = db.collection("users");
  try {
    const s = await users
      .where(Filter.or(Filter.where("reminders.on", "==", true), Filter.where("mailPending", "==", true), ...NOTIFY_FIELDS.map((k) => Filter.where(k, ">", ""))))
      .get();
    return s.docs;
  } catch (e) {
    // VEYA sorgusu reddedilirse eski yol: alan başına ayrı sorgu
    console.warn("[reminders] tek sorgu olmadı:", e.message);
    const snaps = await Promise.all([users.where("reminders.on", "==", true), users.where("mailPending", "==", true), ...NOTIFY_FIELDS.map((k) => users.where(k, ">", ""))].map((q) => q.get()));
    return [...new Map(snaps.flatMap((x) => x.docs).map((d) => [d.id, d])).values()];
  }
}
// Aynı sorgu bir çalışmada bir kez: anahtar -> Promise<QuerySnapshot>
function shared() {
  const m = new Map();
  return (key, q) => {
    if (!m.has(key)) m.set(key, q.get());
    return m.get(key);
  };
}

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
    initializeApp({ credential: cert({ projectId, clientEmail: cleanEmail(env.FIREBASE_CLIENT_EMAIL), privateKey: cleanKey(env.FIREBASE_PRIVATE_KEY) }) });
  }
  const db = getFirestore();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:bildirim@sesliasistan.app", pub, priv);

  const all = await notifyUsers(db);
  const q = shared();
  let sent = 0;
  for (const u of all.filter((x) => x.data().reminders?.on === true)) {
    const { reminders = {}, push = {}, role, orgId } = u.data();
    const subs = Object.entries(push);
    if (!subs.length) continue;
    const lead = Number(reminders.lead) || 60;
    const tz = reminders.tz || "Europe/Istanbul";
    const today = localNow(tz).date;
    // Bugünden 2 gün sonrasına kadar olan planlar ("1 gün önce" hatırlatması için yarın ve öbür gün).
    // Çalışan yalnızca kendisini ilgilendiren (people listesinde olduğu) planlar için bildirim alır.
    const oid = orgId || u.id;
    const snap = await q(`near:${oid}:${today}`, db.collection("orgs").doc(oid).collection("plans").where("date", ">=", today).where("date", "<=", addDays(today, 2)));
    const plans = snap.docs.map((d) => ({ ...d.data(), id: d.id })).filter((p) => p.status !== "cancelled" && (role !== "staff" || (p.people || []).includes(u.id)));
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
  const summaries = await sendSummaries(db, all, q).catch((e) => (console.error("[summary]", e.message), 0));
  const mails = await sendMailDigests(db, all).catch((e) => (console.error("[mail]", e.message), 0));
  const extras = await sendExtras(db, all, q).catch((e) => (console.error("[extras]", e.message), 0));
  console.log(`[reminders] ${all.length} kullanıcı, ${sent} bildirim, ${summaries} özet, ${mails} mail, ${extras} ek`);
  return new Response(`ok ${sent} ${summaries} ${mails} ${extras}`);
}

// Günlük özetler: sabah (o gün, istenirse yarın da) ve akşam (ertesi gün); her biri günde bir kez
async function sendSummaries(db, all, q) {
  let n = 0;
  for (const u of all.filter((x) => hasAt(x.data(), "summaryAt") || hasAt(x.data(), "eveningAt"))) {
    const d = u.data();
    const subs = Object.entries(d.push || {});
    if (!subs.length) continue;
    const tz = d.reminders?.tz || "Europe/Istanbul";
    const today = localNow(tz).date;
    const nowHM = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
    const morning = due(d.summaryAt, d.summarySent, today, nowHM);
    const evening = due(d.eveningAt, d.eveningSent, today, nowHM);
    if (!morning && !evening) continue;
    const oid = d.orgId || u.id;
    const org = db.collection("orgs").doc(oid);
    const staff = d.role === "staff";
    const mine = (x) => !staff || (x.people || []).includes(u.id);
    const [p, t] = await Promise.all([
      q(`plans:${oid}:${today}`, org.collection("plans").where("date", ">=", addDays(today, -14))),
      q(`tasks:${oid}`, org.collection("tasks").where("done", "==", false)),
    ]);
    const data = { plans: p.docs.map((x) => x.data()).filter((x) => mine(x) && x.status !== "cancelled"), tasks: t.docs.map((x) => x.data()).filter(mine), today, uid: u.id, name: d.name };
    const send = async (msg, tag) => {
      const payload = JSON.stringify({ ...msg, tag, url: "/" });
      await Promise.all(
        subs.map(async ([key, sub]) => {
          try {
            await webpush.sendNotification(sub, payload, { TTL: 3 * 3600 });
            n++;
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) await u.ref.update({ [`push.${key}`]: FieldValue.delete() });
          }
        }),
      );
    };
    if (morning) {
      await send(morningText({ ...data, withTomorrow: !!d.summaryTomorrow }), `summary-${today}`);
      await u.ref.update({ summarySent: today });
    }
    if (evening) {
      await send(eveningText(data), `evening-${today}`);
      await u.ref.update({ eveningSent: today });
    }
  }
  return n;
}

// Ek bildirimler (Ayarlar › Günlük özetler): doğum günü, rüzgâr uyarısı, pazartesi haftalık özet; her biri günde bir kez
const DIKILI = { lat: 39.0717, lon: 26.8886 };
async function sendExtras(db, all, q) {
  const users = all.filter((x) => ["birthdayAt", "windAt", "weeklyAt"].some((k) => hasAt(x.data(), k)));
  const winds = new Map(); // konum -> bugünün saatleri (her çalışmada bir kez indirilir)
  let n = 0;
  for (const u of users) {
    const d = u.data();
    const subs = Object.entries(d.push || {});
    if (!subs.length) continue;
    const tz = d.reminders?.tz || "Europe/Istanbul";
    const today = localNow(tz).date;
    const nowHM = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
    const bday = due(d.birthdayAt, d.birthdaySent, today, nowHM);
    const wind = due(d.windAt, d.windSent, today, nowHM);
    const weekly = isMonday(today) && due(d.weeklyAt, d.weeklySent, today, nowHM);
    if (!bday && !wind && !weekly) continue;
    const orgId = d.orgId || u.id;
    const org = db.collection("orgs").doc(orgId);
    const staff = d.role === "staff";
    const mine = (x) => !staff || (x.people || []).includes(u.id);
    const send = async (msg, tag, url = "/") => {
      const payload = JSON.stringify({ ...msg, tag, url });
      await Promise.all(
        subs.map(async ([key, sub]) => {
          try {
            await webpush.sendNotification(sub, payload, { TTL: 3 * 3600 });
            n++;
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) await u.ref.update({ [`push.${key}`]: FieldValue.delete() });
          }
        }),
      );
    };
    if (bday) {
      // Doğum günleri kişiye özel: yalnız kişinin kendi eklediği kayıtlar
      const s = await org.collection("birthdays").where("createdByUid", "==", u.id).get();
      const msg = birthdayText(s.docs.map((x) => x.data()), today);
      if (msg) await send(msg, `birthday-${today}`, "/birthdays");
      await u.ref.update({ birthdaySent: today });
    }
    if (wind || weekly) {
      const [p, t] = await Promise.all([
        q(`plans:${orgId}:${today}`, org.collection("plans").where("date", ">=", addDays(today, -14))),
        weekly ? q(`tasks:${orgId}`, org.collection("tasks").where("done", "==", false)) : null,
      ]);
      const plans = p.docs.map((x) => ({ ...x.data(), id: x.id })).filter((x) => mine(x) && x.status !== "cancelled");
      if (wind) {
        const place = d.weatherPlace && Number.isFinite(+d.weatherPlace.lat) ? d.weatherPlace : DIKILI;
        const key = `${(+place.lat).toFixed(2)},${(+place.lon).toFixed(2)}`;
        if (!winds.has(key)) {
          const res = await fetch(windUrl(place), { signal: AbortSignal.timeout(10000) }).catch(() => null);
          winds.set(key, res?.ok ? windRows(await res.json(), today) : null);
        }
        const rows = winds.get(key);
        if (rows) {
          const msg = windAlert({ rows, plans, today, kn: Number(d.windKn) || WIND_KN });
          if (msg) await send(msg, `wind-${today}`, msg.url || "/");
          await u.ref.update({ windSent: today });
        }
      }
      if (weekly) {
        const tasks = t.docs.map((x) => x.data()).filter(mine);
        await send(weeklyText({ plans, tasks, today, uid: u.id, name: d.name }), `weekly-${today}`, "/calendar");
        await u.ref.update({ weeklySent: today });
      }
    }
  }
  return n;
}

// Gelen banka mailleri (Gmail betiği doğrudan veritabanına yazar, users.mailPending'i işaretler): son mailden 8 dakika sonra hepsi tek bildirimde (sabah 11'deki 3 hesap özeti gibi).
// Betik Gmail'e 5 dakikada bir baktığı için bekleme bundan uzun: aynı anda gelenler ayrı bildirime bölünmez.
const MAIL_QUIET = 8 * 60e3;
async function sendMailDigests(db, all) {
  let n = 0;
  for (const u of all.filter((x) => x.data().mailPending === true)) {
    const d = u.data();
    if (Date.now() - Date.parse(d.mailLastAt || 0) < MAIL_QUIET) continue;
    const snap = await db.collection("orgs").doc(u.id).collection("mails").where("notified", "==", false).get();
    if (!snap.empty) {
      // Excel ekleri henüz okunmadıysa (uygulama açılmadıysa) burada okunur: bildirimde bakiyeler görünsün
      const mails = await Promise.all(
        snap.docs.map(async (x) => {
          const m = x.data();
          if (m.sheets || !m.raw?.length) return m;
          const sheets = sheetsFromRaw(m.raw, xlsxOf(await import("xlsx")));
          await x.ref.update({ sheets }).catch(() => {});
          return { ...m, sheets };
        }),
      );
      const payload = JSON.stringify({ ...mailDigestText(mails), tag: `mail-${snap.docs[0].id}`, url: "/mail" });
      await Promise.all(
        Object.entries(d.push || {}).map(async ([key, sub]) => {
          try {
            await webpush.sendNotification(sub, payload, { TTL: 6 * 3600 });
            n++;
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) await u.ref.update({ [`push.${key}`]: FieldValue.delete() });
          }
        }),
      );
      const batch = db.batch();
      snap.docs.forEach((x) => batch.update(x.ref, { notified: true }));
      await batch.commit();
    }
    // Bu arada yeni mail geldiyse (belge değiştiyse) işaret kalır, bir sonraki turda gönderilir
    await u.ref.update({ mailPending: false }, { lastUpdateTime: u.updateTime }).catch(() => {});
  }
  return n;
}

export default sendDueReminders;
