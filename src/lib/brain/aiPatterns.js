// Yapay zekanın öğrenme kaydı (Seyhun: "her istekte yapay zekadan öğrenmeye ekleyebileceğimiz formatta data dönsün,
// öğrenmeyi sağlam temellere oturtalım", 2026-10-21). Her yapay zeka cevabında learn gelir (lib/ai/assistant.js cleanLearn):
// iş adı (task), cümle kalıbı ("{gün} {saat}te {başlık} ekle"), yerlerin değerleri, ses tanıma düzeltmeleri, güven.
// Bu dosya saf işlevlerdir (test:asistan › "Öğrenme kaydı"); saklama store.js'de (aylık öğrenme belgesine aynı yazmayla).
//   - Kayıt iş ✓ bitince "doğru" adayıdır; 2 dk içinde "geri al / yanlış" ya da aynı cümle yeniden söylenirse yanlış olur.
//     Hata, ✗, vazgeçme de yanlıştır.
//   - Aynı kalıp en az READY.n kez, en az %READY.rate doğru bittiyse "hazır": Hazır cevaplar açıkken kayıt ekleme
//     kalıpları yapay zekasız yapılır (assistRoute.js readyCreate yanında), kapalıyken yalnız birikir.
import { fold } from "./seedMatch";
import { READY } from "./patternMeter";
import { isCorrection, similar, WIN } from "./score";

export { READY };
export const HOLD_MS = WIN.repeat; // doğru sayılmadan önce bekleme (geri alınır mı)

// Kalıbın anahtarı: harf/ek farkı sayılmaz ("{gün} {saat}'te" = "{gün} {saat}te")
export const patKey = (p) =>
  fold(String(p || "").replace(/\{\s*([^}]+?)\s*\}['’]?[\p{L}]*/gu, " {$1} "))
    .replace(/\s+/g, " ")
    .trim();

// Yapay zeka cevabından öğrenme kaydı: { x, p, k, l, c, v } ya da null (kalıp yoksa)
//   x söz, p kalıp, k iş adı, l uygulamanın etiketi (model.js labelFromAI), c güven, v yerlerin değerleri "gün=yarın|saat=10:00"
export function lessonOf(text, r, label = "") {
  const lr = r?.learn;
  const p = String(lr?.pattern || "").trim();
  if (!lr || !/\{[^}]+\}|\S/.test(p) || !patKey(p)) return null;
  const v = (lr.slots || []).map((s) => `${s.k}=${String(s.v).replace(/[|=]/g, " ")}`).join("|").slice(0, 200);
  return {
    x: String(text || "").replace(/\s+/g, " ").trim().slice(0, 160),
    p: p.slice(0, 140),
    k: String(lr.task || "").slice(0, 40),
    l: label || "",
    ...(Number.isFinite(lr.conf) ? { c: lr.conf } : {}),
    ...(v ? { v } : {}),
  };
}

// Bekleyen kayıt geri alındı mı: süre içinde düzeltme ya da aynı cümle yeniden (anlaşılmadı)
export function undoneBy(text, hold, now = Date.now()) {
  if (!hold || now - hold.t * 1000 > HOLD_MS) return false;
  return isCorrection(text) || similar(text, hold.x);
}

// Kalıp tablosu: kalıp başına kaç kez, kaçı doğru, hazır mı (silinenler hariç; en çok kullanılandan aza)
export function tallyPats(list = [], drop = []) {
  const gone = new Set(drop);
  const by = new Map();
  for (const e of list) {
    const key = patKey(e?.p);
    if (!key || gone.has(key)) continue;
    const r = by.get(key) || { key, p: e.p, k: e.k || "", l: e.l || "", n: 0, ok: 0, last: 0, x: "" };
    r.n++;
    if (e.ok) r.ok++;
    if ((e.t || 0) >= r.last) Object.assign(r, { last: e.t || 0, p: e.p, k: e.k || r.k, l: e.l || r.l, x: e.x || r.x });
    by.set(key, r);
  }
  return [...by.values()]
    .map((r) => ({ ...r, rate: r.n ? r.ok / r.n : 0, ready: r.n >= READY.n && r.ok / r.n >= READY.rate }))
    .sort((a, b) => b.n - a.n || b.last - a.last);
}

// Kalıp cümleye uyuyor mu: { gün: "yarın", saat: "10", başlık: "antrenman" } ya da null.
// Yerden sonraki ek ("{saat}'te" → "10'da") yere dahil sayılır; kalıbın kelimeleri sırasıyla aynı olmalı.
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SLOT_RE = "(\\S+(?:\\s+\\S+)*?)";
export function matchPattern(p, text) {
  const names = [];
  const toks = [];
  let prevSlot = false;
  for (const part of String(p || "").split(/(\{[^}]+\})/)) {
    const slot = /^\{([^}]+)\}$/.exec(part);
    if (slot) {
      names.push(slot[1].trim());
      toks.push(SLOT_RE);
      prevSlot = true;
      continue;
    }
    if (!part) continue;
    const lit = prevSlot ? part.replace(/^[^\s]+/, "") : part; // yerin eki ("'te") yere dahil
    fold(lit).split(" ").filter(Boolean).forEach((w) => toks.push(esc(w)));
    prevSlot = false;
  }
  if (!names.length) return null;
  const m = new RegExp(`^${toks.join("\\s+")}[.!?;\\s]*$`).exec(fold(text));
  if (!m) return null;
  return Object.fromEntries(names.map((n, i) => [n, m[i + 1].trim()]));
}

// Hazır kalıplardan bu cümleye uyan ilk kayıt ekleme kalıbı (yalnız create:plan / create:task / create:note)
const CREATE = new Set(["create:plan", "create:task", "create:note"]);
export function readyLearned(text, rows = []) {
  for (const r of rows) {
    if (!r.ready || !CREATE.has(r.l)) continue;
    const slots = matchPattern(r.p, text);
    if (slots) return { row: r, slots };
  }
  return null;
}
