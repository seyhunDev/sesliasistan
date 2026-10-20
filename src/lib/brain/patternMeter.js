// Hızlı kalıplar, 1. aşama: ÖLÇME (çalışma haritası 5. iş, 20 Ekim 2026). Yapay zekaya giden her istekte telefonun kendi
// tahmini (öğrenilenler + kurallar, commands.js brainCommand) yapay zekanın sonucuyla karşılaştırılır; hiçbir şey
// değişmez, yalnız sayılır. Bir iş türünde telefon yeterince sık aynı sonucu buluyorsa (HAZIR) sonraki aşamada o tür
// yapay zekasız yapılabilir. Sayılar bu cihazda (localStorage) tutulur: Firestore okuma/yazma yok.
// Ayarlar › Öğrenme › "Hızlı kalıp ölçümü" gösterir. Saf karşılaştırma işlevi test edilir.
import { fold } from "@/lib/brain/seedMatch";
import { labelFromAI } from "@/lib/brain/model";

const KEY = "sa-kalip-olcum";
export const READY = { n: 10, rate: 0.9 };

const same = (a, b) => fold(a || "") === fold(b || "");
// Kayıt alanları: tür, gün, saat ve başlık aynı mı (başlıkta büyük/küçük harf ve Türkçe harf farkı sayılmaz)
const sameItem = (x = {}, y = {}) => x.type === y.type && (x.date || "") === (y.date || "") && (x.time || "") === (y.time || "") && same(x.title || x.body, y.title || y.body);

// local: brainCommand sonucu (ya da null), ai: yapay zekanın yanıtı. { label, guessed, kind, full }
//   kind: telefon işin türünü doğru buldu mu; full: işin kendisini de (kayıt alanları / açılan sayfa) aynı çıkardı mı
export function comparePattern(local, ai) {
  const label = labelFromAI(ai);
  const guessed = local?.brain?.label || "";
  const kind = !!label && guessed === label;
  let full = false;
  if (kind && local.type === "create") full = local.items?.length === ai.items?.length && local.items.every((x, i) => sameItem(x, ai.items[i]));
  else if (kind && local.type === "navigate") full = local.page === ai.navigate;
  else if (kind) full = local.type === "receipt" || local.type === "meeting";
  return { label, guessed, kind, full };
}

const box = () => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};
const read = (st = box()) => {
  try {
    return JSON.parse(st?.getItem(KEY) || "") || { by: {}, last: [] };
  } catch {
    return { by: {}, last: [] };
  }
};

// Ölçümü yaz (iş türü bilinmiyorsa sayılmaz). Son 20 karşılaştırma da tutulur (kopyalanıp incelenmek için)
export function meterPattern(text, local, ai, st = box()) {
  const c = comparePattern(local, ai);
  if (!c.label || !st) return c;
  const m = read(st);
  const r = (m.by[c.label] ||= { n: 0, kind: 0, full: 0 });
  r.n++;
  if (c.kind) r.kind++;
  if (c.full) r.full++;
  m.last = [{ x: String(text || "").slice(0, 120), l: c.label, g: c.guessed, ok: c.full }, ...(m.last || [])].slice(0, 20);
  try {
    st.setItem(KEY, JSON.stringify(m));
  } catch {
    /* depolama dolu: ölçüm atlanır */
  }
  return c;
}

// Rapor: iş türü başına kaç istek, telefon kaçında aynı sonucu buldu, hazır mı (en çok istekten aza)
export function patternReport(st = box()) {
  const m = read(st);
  const rows = Object.entries(m.by)
    .map(([label, r]) => ({ label, ...r, ready: r.n >= READY.n && r.full / r.n >= READY.rate }))
    .sort((a, b) => b.n - a.n);
  const n = rows.reduce((a, r) => a + r.n, 0);
  const full = rows.reduce((a, r) => a + r.full, 0);
  return { rows, n, full, last: m.last || [] };
}

export function resetPatternMeter(st = box()) {
  try {
    st?.removeItem(KEY);
  } catch {
    /* yok say */
  }
}
