// Bildirim testi gönderimi (lib/pushTest): deneme kaydını bir kez gönderir, kişinin tüm cihazlarına gider.
// Gerçek bildirim gibi zile de yazılır ve simgedeki sayıyı artırır (Seyhun: "ikonun üstünde sayıyı görmek istiyorum");
// zildeki deneme satırları (etiket test-…) "Kaydı temizle" ve 3 saatlik temizlikte silinir. Telefon alınca service worker imzalı onayla /api/ack'a "ulaştı" yazar.
// Hem /api/push-tests (anında), hem push-test-background (30 sn bekleyip), hem plan-reminders (5 dakikada bir) kullanır.
import webpush from "web-push";
import { FieldValue } from "firebase-admin/firestore";
import { sendDevice } from "./sendDevice.js";
import { ackSig } from "./ackSign.js";
import { pendingAt, testText } from "../pushTest.js";
import { recordInbox } from "../inbox.js";

export const TEST_COL = "pushTests";

// via: "anında" (bekleyen işlev) ya da "zamanlayıcı" (5 dakikalık plan-reminders). Gönderilen cihaz sayısını döner.
export async function sendTest(db, uid, id, via, now = new Date()) {
  const ref = db.collection("users").doc(uid);
  // Aynı deneme iki yoldan iki kez gitmesin: önce "gönderildi" işaretlenir
  const got = await db.runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data() || {};
    const t = d.pushTests?.[id];
    if (!t || t.sent || t.err) return null;
    const msg = testText(t, now);
    const next = pendingAt(d.pushTests, id);
    tx.update(ref, {
      [`pushTests.${id}.sent`]: now.toISOString(),
      [`pushTests.${id}.via`]: via,
      [`pushTests.${id}.title`]: msg.title,
      [`pushTests.${id}.body`]: msg.body,
      pushTestAt: next || FieldValue.delete(),
    });
    return { msg, push: d.push || {} };
  });
  if (!got) return 0;
  const subs = Object.entries(got.push).filter(([, s]) => s?.fcm || s?.endpoint);
  if (!subs.length) {
    await ref.update({ [`pushTests.${id}.err`]: "Bu hesapta bildirimi açık telefon yok" });
    return 0;
  }
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:bildirim@sesliasistan.app", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  } catch {
    await ref.update({ [`pushTests.${id}.err`]: "Bildirim anahtarı sunucuda geçersiz" });
    return 0;
  }
  const msg = { ...got.msg, tag: `test-${id}`, url: "/settings/push-test" };
  const badge = await recordInbox(db, uid, msg);
  const payload = JSON.stringify({ ...msg, ...(badge !== undefined && { badge }), ack: { o: uid, c: TEST_COL, i: id, u: uid, s: ackSig(uid, TEST_COL, id, uid) } });
  let n = 0;
  const errs = [];
  await Promise.all(
    subs.map(async ([, sub]) => {
      try {
        await sendDevice(sub, payload, { TTL: 600 });
        n++;
      } catch (e) {
        errs.push(e.statusCode === 404 || e.statusCode === 410 ? "Bir cihazın bildirim kaydı bitmiş" : `Gönderilemedi (kod ${e.statusCode || 0})`);
      }
    }),
  );
  await ref.update({ [`pushTests.${id}.devices`]: n, ...(errs.length && { [`pushTests.${id}.err`]: errs[0] }) });
  return n;
}

// Plan başladı, hatırlatma zamanı kaçtı (zamanlayıcı çalışmadı): kayda nedeni yazılır
export async function missTest(db, uid, id, tests) {
  await db
    .collection("users")
    .doc(uid)
    .update({ [`pushTests.${id}.err`]: "Gönderilmedi: zamanlayıcı hatırlatma saatinde çalışmadı", pushTestAt: pendingAt(tests, id) || FieldValue.delete() });
}
