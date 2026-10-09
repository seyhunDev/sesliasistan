// Bir cihaza bildirim: tarayıcı/ana ekran uygulaması Web Push (abonelik { endpoint, keys }), Android uygulaması
// Firebase Cloud Messaging (kayıt { fcm }). web-push'un sendNotification'ı gibi çalışır: hata statusCode taşır,
// 404/410 aboneliğin bittiği demektir (çağıran kaydı siler). Netlify işlevi (plan-reminders.mjs) de kullanır.
import webpush from "web-push";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { cleanEmail, cleanKey } from "../pemKey.js";
import { fcmMessage } from "../fcmMessage.js";

function app() {
  return (
    getApps().find((a) => a.name === "[DEFAULT]") ||
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: cleanEmail(process.env.FIREBASE_CLIENT_EMAIL),
        privateKey: cleanKey(process.env.FIREBASE_PRIVATE_KEY),
      }),
    })
  );
}

const GONE = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);

export const isFcm = (sub) => !!sub?.fcm;
// Gönderilebilir kayıt mı (eski/bozuk kayıtlar atlanır)
export const deviceOk = (sub) => !!(sub?.fcm || sub?.endpoint);

// Hazır FCM mesajı (arama bildirimi gibi); hatası sendDevice'taki gibi statusCode taşır
export async function sendFcm(msg) {
  try {
    return await getMessaging(app()).send(msg);
  } catch (e) {
    const code = e?.code || e?.errorInfo?.code || "";
    throw Object.assign(new Error(e?.message || "FCM gönderilemedi"), { statusCode: GONE.has(code) ? 410 : 502, body: `FCM ${code} ${e?.message || ""}`.trim() });
  }
}

export async function sendDevice(sub, payload, opts = {}) {
  if (!isFcm(sub)) return webpush.sendNotification(sub, payload, opts);
  return sendFcm(fcmMessage(sub.fcm, payload, opts.TTL ?? 86400));
}
