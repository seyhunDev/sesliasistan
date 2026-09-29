// Plan hatırlatma bildirimleri (Web Push): izin, bu cihazın aboneliği ve ayarların kaydı.
// Ayarlar users/{uid} belgesinde: reminders { on, lead, tz } ve push { <cihaz>: abonelik }.
import { deleteField, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { isIOS } from "@/lib/speech/detect";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export const pushSupported = () =>
  typeof window !== "undefined" && window.isSecureContext && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
// iPhone'da bildirim yalnızca ana ekrana eklenen uygulamada çalışır
export const isStandalone = () => typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true);
export const needsInstall = () => isIOS() && !isStandalone();
export const pushConfigured = () => !!KEY;

const toKey = (s) => {
  const raw = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
// Cihaz anahtarı: aboneliğin adresinden kısa bir kimlik
const deviceKey = (endpoint) => {
  let h = 0;
  for (const ch of endpoint) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `d${(h >>> 0).toString(36)}`;
};
const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul";
  } catch {
    return "Europe/Istanbul";
  }
};

async function currentSub() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

// Kayıtlı ayar + bu cihaz abone mi
export async function loadReminders(uid) {
  const snap = await getDoc(doc(db, "users", uid)).catch(() => null);
  const data = snap?.exists() ? snap.data() : {};
  let here = false;
  if (pushSupported() && Notification.permission === "granted") {
    const sub = await Promise.race([currentSub(), new Promise((r) => setTimeout(() => r(null), 3000))]).catch(() => null);
    here = !!(sub && data.push?.[deviceKey(sub.endpoint)]);
  }
  return { on: !!data.reminders?.on, lead: data.reminders?.lead || 60, here };
}

// Profil alanları: güvenlik kuralı rol ve işletmenin değişmemesini ister, bu yüzden hep mevcut değerler yazılır
const ids = (p) => ({ role: p.role || "owner", orgId: p.orgId || p.uid });

// Bildirimleri aç: izin ister, bu cihazı abone yapar, ayarı kaydeder. p: profil { uid, role, orgId }
export async function enableReminders(p, lead) {
  const uid = p.uid;
  if (!pushSupported()) throw Object.assign(new Error("Bu tarayıcı bildirimleri desteklemiyor."), { code: "unsupported" });
  if (!KEY) throw Object.assign(new Error("Bildirim anahtarı tanımlı değil."), { code: "config" });
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw Object.assign(new Error("Bildirim izni verilmedi."), { code: "denied" });
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(KEY) }));
  const j = sub.toJSON();
  await setDoc(
    doc(db, "users", uid),
    {
      ...ids(p),
      reminders: { on: true, lead, tz: tz() },
      push: { [deviceKey(j.endpoint)]: { endpoint: j.endpoint, keys: j.keys, at: new Date().toISOString(), ua: navigator.userAgent.slice(0, 120) } },
    },
    { merge: true },
  );
}

export async function setLead(p, lead) {
  await setDoc(doc(db, "users", p.uid), { ...ids(p), reminders: { lead, tz: tz() } }, { merge: true });
}

// Bu cihazda kapat (diğer cihazlar etkilenmez); hiç cihaz kalmazsa hatırlatma tamamen kapanır
export async function disableReminders(p) {
  const sub = pushSupported() ? await currentSub().catch(() => null) : null;
  const ref = doc(db, "users", p.uid);
  if (sub) {
    await updateDoc(ref, { [`push.${deviceKey(sub.endpoint)}`]: deleteField() }).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
  const left = Object.keys((await getDoc(ref)).data()?.push || {}).length;
  if (!left) await setDoc(ref, { ...ids(p), reminders: { on: false } }, { merge: true });
}

// Bu cihaza deneme bildirimi
export async function testPush() {
  const sub = await currentSub();
  if (!sub) throw new Error("Bu cihaz abone değil.");
  const res = await authFetch("/api/push-test", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Deneme bildirimi gönderilemedi.");
}
