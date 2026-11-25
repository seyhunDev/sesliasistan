// Kim hangi bildirimi alır (Seyhun 2026-11-25: "sporcuya sadece fitness ile yani antrenmanı ile ilgili bildirim gelmeli...
// herkes kendi yaptığı ve takip ettiği şeylerin bildirimlerini alıyor olmalı"). Tek kural burada; sunucudaki her gönderim
// (lib/server/pushSend sendTo, Netlify plan-reminders) buna bakar. Türü yazılmamış bildirim sporcuya ve veliye gitmez.
// Netlify işlevleri de kullanır: "@/" içe aktarması yok.
import { kindOf } from "./kinds.js";

// Bildirim türleri (payload.cat): training (antrenman planı: yeni, değişti, iptal, hatırlatma), fitness, chat, absent
// (devamsızlık), dues (aidat), plan (diğer planlar), task, note, receipt, summary (günlük özetler), extra (rüzgâr, doğum günü,
// haftalık), calls, race, mail, test
// Sporcu ve öğrenci: yalnız antrenman ve fitness. Veli: çocuğunun devamsızlığı ve aidat. Mesaj (chat) sporcu tarafına gitmez:
// Mesajlar sporcu tarafında gizli (Seyhun 2026-11-25 "mesajları şimdilik sporculara göstermeyelim").
export const ALLOW = {
  athlete: new Set(["training", "fitness", "test"]),
  student: new Set(["training", "fitness", "test"]),
  parent: new Set(["absent", "dues", "test"]),
};

// Kategorisi Antrenman ya da başlığında antrenman/idman geçen plan (fitness hariç; lib/trainingLog buradan alır)
export const isTraining = (p) => !p?.fit && (p?.cat || p?.category) !== "Fitness" && ((p?.cat || p?.category) === "Antrenman" || /antre?nman|idman/i.test(p?.title || ""));

// Kaydın bildirim türü: fitness planı, antrenman planı, diğer plan, görev, not
export const recordCat = (kind, r) => (kind !== "plan" ? kind : r?.fit ? "fitness" : isTraining(r) ? "training" : "plan");
export const planCat = (p) => recordCat("plan", p);

// Bu kişi bu türü alır mı. Ana hesap, çalışan, aile, diğer: hepsini (yalnız kendi kayıtları zaten seçilerek gönderilir).
export function allowNotify(user, cat) {
  if (!user) return false;
  if (user.role !== "staff") return true;
  const allow = ALLOW[kindOf(user)];
  return !allow || allow.has(cat);
}

// Sporcuya "yeni antrenman" bildirimi gidecek kişiler (Kişiler: hesabı olan, ayrılmamış sporcu ve öğrenciler)
export const trainees = (members = []) =>
  [...new Set(members.filter((m) => m?.uid && m.account !== false && m.status !== "left" && (m.kind === "athlete" || m.kind === "student")).map((m) => m.uid))];
