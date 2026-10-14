import { tokens } from "./model";

// Asistanın puanlaması (1. adım: yalnız ölçer, davranışı değiştirmez). Saf işlevler, testleri test:asistan › "Puanlama".
// Her komut (tur) bittikten sonra kullanıcının ne yaptığına bakılır, kendiliğinden puan verilir:
//   +1 iş ✓ bitti ve 2 dk dokunulmadı, +1 soru gerekmedi, +1 onay kartına tek "evet"
//   −2 "geri al", "yanlış", "X değil Y" gibi düzeltme, −2 aynı cümle 2 dk içinde yeniden söylendi (anlaşılmadı)
//   −1 kayıt 10 dk içinde elle düzeltildi, −1 Vazgeç / ✗ / yapılamadı, −1 açılan sayfadan 30 sn içinde geri dönüldü
// Puanlar cümle kalıbına (sayı, gün, ek atılmış kelimeler) toplanır; rapor Ayarlar › Öğrenme'de.
export const POINTS = { done: 1, noAsk: 1, yes: 1, fix: -2, repeat: -2, edit: -1, fail: -1, back: -1 };
export const WIN = { done: 2 * 60e3, repeat: 2 * 60e3, edit: 10 * 60e3, back: 30e3 };
export const OLD_DAYS = 60; // daha eski kalıplar rapora girmez
export const MAX_PATS = 500;

const words = (s) => [...new Set(tokens(s).filter((w) => !w.includes("_")))];

// Cümle kalıbı: kelime kökleri (sayı #sayı, gün #gün) sıralı; "yarın 10'da antrenman ekle" = "cuma 9'da antrenman ekle"
export function patternOf(s) {
  return words(s).sort().join(" ");
}
// Firestore alan adı olarak güvenli kısa anahtar
export function patternKey(s) {
  const p = patternOf(s);
  let h = 5381;
  for (let i = 0; i < p.length; i++) h = ((h << 5) + h + p.charCodeAt(i)) >>> 0;
  return `k${h.toString(36)}`;
}

// İki cümle neredeyse aynı mı (kelime kümelerinin Jaccard benzerliği)
export function similar(a, b, min = 0.7) {
  const A = new Set(words(a));
  const B = new Set(words(b));
  if (!A.size || !B.size) return false;
  let both = 0;
  A.forEach((w) => B.has(w) && both++);
  return both / (A.size + B.size - both) >= min;
}

// Kullanıcı önceki işi düzeltiyor mu: "geri al", "yanlış", "hayır … değil", "Ali değil Ayşe", "10 değil 11"
const FIX = /(^|\s)(geri al|yanlış|yanlis|öyle değil|öyle demedim|onu demedim|ben .{0,20}dedim)(\s|$|[.,!])|(^|\s)hayır\b.{0,40}\bdeğil\b|\S\s+değil[,]?\s+(?!m[iıuü](\s|$|\?))\S/iu;
export function isCorrection(s) {
  return FIX.test(String(s || "").toLocaleLowerCase("tr-TR"));
}

// ISO hafta: "2026-W42"
export function weekOf(t = Date.now()) {
  const d = new Date(t);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day + 3);
  const y = d.getFullYear();
  const first = new Date(y, 0, 4);
  const w = 1 + Math.round(((d - first) / 864e5 - 3 + ((first.getDay() + 6) % 7)) / 7);
  return `${y}-W${String(w).padStart(2, "0")}`;
}

// Bitmiş turun hemen bilinen puanı (2 dk bekleyen +1 hariç): ✗/vazgeç −1, soru sorulmadıysa +1 (başarıyla bittiyse)
export function endPoints({ fail = false, dropped = false, asked = false } = {}) {
  if (fail || dropped) return [{ e: "fail", p: POINTS.fail }];
  return asked ? [] : [{ e: "noAsk", p: POINTS.noAsk }];
}

// Özete bir olay ekler (sum: { pats: {k: {x, e, n, b, p, t}}, weeks: {w: {n, b, p}} }).
// ev: { k, x, e (son iş: ai/local…), n (yeni tur 1), b (tur ilk kez kötü 1), p (puan), t }
export function applyEvent(sum, ev) {
  const out = sum || { pats: {}, weeks: {} };
  out.pats ||= {};
  out.weeks ||= {};
  const pat = (out.pats[ev.k] ||= { x: ev.x || "", e: ev.e || "", n: 0, b: 0, p: 0, t: 0 });
  pat.n += ev.n || 0;
  pat.b += ev.b || 0;
  pat.p += ev.p || 0;
  if (ev.x) pat.x = ev.x;
  if (ev.e) pat.e = ev.e;
  pat.t = Math.max(pat.t || 0, ev.t || 0);
  const w = (out.weeks[weekOf(ev.t)] ||= { n: 0, b: 0, p: 0 });
  w.n += ev.n || 0;
  w.b += ev.b || 0;
  w.p += ev.p || 0;
  return out;
}

const rate = (n, b) => (n ? Math.max(0, Math.round(((n - b) / n) * 100)) : 0);

// Rapor: bu hafta, son 4 hafta, en kötü cümleler (60 günden eskiler sayılmaz)
export function report(sum, now = Date.now()) {
  const weeks = sum?.weeks || {};
  const list = [];
  for (let i = 0; i < 4; i++) {
    const w = weekOf(now - i * 7 * 864e5);
    const v = weeks[w] || { n: 0, b: 0, p: 0 };
    list.push({ w, n: v.n, b: v.b, p: v.p, ok: rate(v.n, v.b) });
  }
  const fresh = Object.values(sum?.pats || {}).filter((x) => now - (x.t || 0) < OLD_DAYS * 864e5);
  const worst = fresh
    .filter((x) => x.b > 0)
    .sort((a, b) => a.p - b.p || b.b - a.b)
    .slice(0, 8)
    .map((x) => ({ x: x.x, n: x.n, b: x.b, p: x.p, ok: rate(x.n, x.b) }));
  return { week: list[0], weeks: list, worst, pats: fresh.length };
}

// Kopyalanacak düz metin (thread'e yapıştırmak için)
export function reportText(r) {
  const lines = [`Asistan puanı · bu hafta ${r.week.n} komut, başarı %${r.week.ok}, puan ${r.week.p}`];
  r.weeks.slice(1).forEach((w) => lines.push(`${w.w}: ${w.n} komut, %${w.ok}, puan ${w.p}`));
  if (r.worst.length) {
    lines.push("", "En çok hata:");
    r.worst.forEach((x) => lines.push(`- "${x.x}" · ${x.n} kez, ${x.b} hatalı, puan ${x.p}`));
  }
  return lines.join("\n");
}

// Çok kalıp birikince en eskiler bırakılır
export function oldestKeys(pats, max = MAX_PATS) {
  const ks = Object.keys(pats || {});
  if (ks.length <= max) return [];
  return ks.sort((a, b) => (pats[a].t || 0) - (pats[b].t || 0)).slice(0, ks.length - max);
}
