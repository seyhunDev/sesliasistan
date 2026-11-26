// Zamanlayıcı nöbeti (sistem taraması 2026-11-26, madde 10): iki zamanlanmış görev birbirini izler. Bildirim zamanlayıcısı
// (plan-reminders, 5 dk) system/scheduler'a, yarış sitesi taraması (race-site, 10 dk) system/raceSite'a "çalıştım" yazar.
// Biri 30 dakikadır çalışmadıysa (ya da yarıda kaldıysa) öteki Velora ana hesabına tek bildirim gönderir; düzelince bir kez
// "yeniden çalışıyor" der. Okuma limiti için yarım saatte bir bakılır (günde ~70 okuma).
// Yalnız göreli import (Netlify işlevi "@/" bilmez).
import { getAuth } from "firebase-admin/auth";
import { notifyUser } from "./raceSiteSync.js";

export const STALE_MS = 30 * 60e3;
const ADMIN = "seyhunyildiz@gmail.com"; // lib/sharedRace.js VELORA_ADMIN

// İş adı -> son çalışma (ms). scheduler: başlangıç; bitiş başlangıçtan 10 dk'dan fazla gerideyse yarıda kalmış sayılır.
export function lastRun(job, d = {}) {
  if (job === "scheduler") {
    const s = Date.parse(d.start || "") || 0;
    const e = Date.parse(d.end || "") || 0;
    return e >= s || Date.now() - s < 10 * 60e3 ? s : e;
  }
  return Date.parse(d.at || "") || 0;
}

// Saf karar: { alert: "down" | "up" | "", at } (alertAt: son "durdu" bildirimi)
export function verdict(last, alertAt, now = Date.now()) {
  const down = !last || now - last > STALE_MS;
  if (down && !alertAt) return "down";
  if (!down && alertAt) return "up";
  return "";
}

const NAME = { scheduler: "Bildirim zamanlayıcısı", raceSite: "Yarış sitesi taraması" };

// Yarım saatte bir: dakika [0, every) aralığındayken bakar
export const watchTime = (every, d = new Date()) => d.getUTCMinutes() % 30 < every;

export async function watch(db, job, { recordInbox, sendDevice }) {
  const ref = db.collection("system").doc(job);
  const d = (await ref.get()).data() || {};
  const v = verdict(lastRun(job, d), d.alertAt);
  if (!v) return "";
  let uid = "";
  try {
    uid = (await getAuth().getUserByEmail(ADMIN)).uid;
  } catch {
    return "";
  }
  const payload =
    v === "down"
      ? { title: `${NAME[job]} durdu`, body: "Son 30 dakikadır çalışmadı. Hatırlatmalar ve yarış belgeleri gecikebilir; Netlify işlev günlüğüne bak.", tag: `nobet-${job}`, url: "/settings" }
      : { title: `${NAME[job]} yeniden çalışıyor`, body: "", tag: `nobet-${job}`, url: "/settings" };
  await notifyUser({ db, uid, payload, recordInbox, sendDevice }).catch((e) => console.warn("[nöbet]", e.message));
  await ref.set({ alertAt: v === "down" ? new Date().toISOString() : null }, { merge: true });
  return v;
}
