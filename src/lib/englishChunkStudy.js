// Kalıp çalışması (İngilizce sayfası › Kalıplar): ilerleme destede (orgs/{orgId}/english/deck) iki alanda tutulur:
//   chunks: { [kalıp id]: { st: "study" | "known", box, due, kd } }  (hiç başlanmamış kalıp yazılmaz)
//   cdays: kalıp bitirilen günler (en çok 60, eskiden yeniye) → "üst üste gün"
// Akış: Dinle · Değiştir (boşluğa parçaları dene) · Kur (Türkçesinden blokları dizerek İngilizcesini kur) · Konuş (yapay zeka).
// Kur'da hepsi ilk denemede doğruysa kalıp bir sonraki aralığa geçer (1, 2, 4, 7, 14 gün; deste aralıklarıyla aynı),
// aralıklar bitince öğrenildi. Hata varsa yarın yeniden.
import { CHUNKS, CHUNK_TOPICS } from "@/lib/englishChunks";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const GAPS = [1, 2, 4, 7, 14];
const IDS = new Set(CHUNKS.map((c) => c.id));

export const chunkById = (id) => CHUNKS.find((c) => c.id === id) || null;
// Parçalı cümle: { en, tr } (boşluk dolu)
export const fillText = (c, f) => `${c.head} ${f[0]}${c.tail ? (/^[?.!,]/.test(c.tail) ? c.tail : ` ${c.tail}`) : "."}`.replace(/\s+([?.!,])/g, "$1");
export const patternText = (c) => `${c.head} …${c.tail ? (/^[?.!,]/.test(c.tail) ? c.tail : ` ${c.tail}`) : ""}`;

export function cleanChunkState(m) {
  const out = {};
  for (const [id, v] of Object.entries(m && typeof m === "object" ? m : {})) {
    if (!IDS.has(id) || !v || typeof v !== "object") continue;
    out[id] = {
      st: v.st === "known" ? "known" : "study",
      box: Math.max(0, Math.min(20, Math.round(Number(v.box) || 0))),
      due: DAY.test(String(v.due || "")) ? v.due : "",
      kd: DAY.test(String(v.kd || "")) ? v.kd : "",
    };
  }
  return out;
}
export const cleanDays = (a) => [...new Set((Array.isArray(a) ? a : []).filter((d) => DAY.test(String(d))))].sort().slice(-60);

const addDays = (day, n) => {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const chunkState = (deck, id) => deck?.chunks?.[id] || null;
const ofTopic = (topic) => CHUNKS.filter((c) => !topic || c.topic === topic);
// Bugün tekrarı gelenler (en eskisi önce)
export const dueChunks = (deck, today, topic = "") =>
  ofTopic(topic)
    .filter((c) => chunkState(deck, c.id)?.st === "study" && chunkState(deck, c.id).due <= today)
    .sort((a, b) => chunkState(deck, a.id).due.localeCompare(chunkState(deck, b.id).due));

// Sıradaki kalıp: tekrarı gelen, sonra yeni (liste sırasıyla), sonra tekrarı ileride olan çalışılan; skip: bu açılışta geçilenler.
// Hepsi öğrenildiyse null.
export function nextChunk(deck, { today, topic = "", skip = [] } = {}) {
  const all = ofTopic(topic);
  const due = dueChunks(deck, today, topic);
  const fresh = all.filter((c) => !chunkState(deck, c.id));
  const later = all.filter((c) => chunkState(deck, c.id)?.st === "study" && !due.includes(c));
  const order = [...due, ...fresh, ...later];
  const sk = new Set(skip);
  return order.find((c) => !sk.has(c.id)) || order[0] || null;
}

// Kalıp bitti (Kur sonucu): right = hepsi ilk denemede doğru mu
export function finishChunk(deck, id, today, right) {
  if (!IDS.has(id)) return deck;
  const gaps = Array.isArray(deck?.gaps) && deck.gaps.length ? deck.gaps : GAPS;
  const cur = chunkState(deck, id);
  let next;
  if (!right) next = { st: "study", box: 0, due: addDays(today, 1), kd: "" };
  else if (cur?.st === "study" && cur.due > today) next = cur; // tekrarı gelmeden yeniden çalışıldı: aralık değişmez
  else {
    const box = cur ? cur.box + 1 : 1;
    next = box > gaps.length ? { st: "known", box, due: "", kd: today } : { st: "study", box, due: addDays(today, gaps[box - 1]), kd: "" };
  }
  return { ...deck, chunks: { ...(deck?.chunks || {}), [id]: next }, cdays: cleanDays([...(deck?.cdays || []), today]) };
}
// Öğrendim (⋯ listesinden): hemen öğrenildi; Yeniden çalış: baştan
export const knowChunk = (deck, id, today) => (IDS.has(id) ? { ...deck, chunks: { ...(deck?.chunks || {}), [id]: { st: "known", box: GAPS.length + 1, due: "", kd: today } } } : deck);
export function resetChunk(deck, id) {
  const chunks = { ...(deck?.chunks || {}) };
  delete chunks[id];
  return { ...deck, chunks };
}

// Üst üste gün: bugün ya da dün bitenle biten seri
export function streak(days, today) {
  const set = new Set(cleanDays(days));
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
// Sayılar: { known, study, words: öğrenilen + çalışılan kalıplardaki parça sayısı, total, days }
export function chunkStats(deck, today) {
  const st = CHUNKS.map((c) => [c, chunkState(deck, c.id)]).filter(([, s]) => s);
  return {
    known: st.filter(([, s]) => s.st === "known").length,
    study: st.filter(([, s]) => s.st === "study").length,
    words: st.reduce((n, [c]) => n + c.fills.length, 0),
    total: CHUNKS.length,
    days: streak(deck?.cdays, today),
  };
}
// Konu ilerlemesi: [{ topic, done, total }] (done: başlanmış kalıp)
export const chunkTopics = (deck) =>
  CHUNK_TOPICS.map((topic) => {
    const l = ofTopic(topic);
    return { topic, done: l.filter((c) => chunkState(deck, c.id)).length, known: l.filter((c) => chunkState(deck, c.id)?.st === "known").length, total: l.length };
  });
export const studyChunkRows = (deck) =>
  CHUNKS.filter((c) => chunkState(deck, c.id)?.st === "study").sort((a, b) => chunkState(deck, a.id).due.localeCompare(chunkState(deck, b.id).due));
export const knownChunkRows = (deck) =>
  CHUNKS.filter((c) => chunkState(deck, c.id)?.st === "known").sort((a, b) => (chunkState(deck, b.id).kd || "").localeCompare(chunkState(deck, a.id).kd || ""));

// Kur görevleri: kalıbın n parçası için { tr, answer: [blok], pool: [blok] } (blok: { t, slot }).
// Doğru bloklar: baş + parça (+ son, noktalama değilse). Çeldiriciler: yakın yanlış baş (near) ve aynı kalıbın başka bir parçası.
const shuffle = (a, rnd) => {
  const o = [...a];
  for (let i = o.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [o[i], o[j]] = [o[j], o[i]];
  }
  return o;
};
export function buildTasks(c, rnd = Math.random, n = 3) {
  const picks = shuffle(c.fills.map((_, i) => i), rnd).slice(0, Math.min(n, c.fills.length));
  return picks.map((i) => {
    const f = c.fills[i];
    const tailWord = c.tail && !/^[?.!,]/.test(c.tail) ? c.tail.replace(/[?.!,]+$/, "") : "";
    const answer = [{ t: c.head, slot: false }, { t: f[0], slot: true }, ...(tailWord ? [{ t: tailWord, slot: false }] : [])];
    const other = c.fills.filter((_, j) => j !== i);
    const wrong = [...(c.near ? [{ t: c.near, slot: false }] : []), ...(other.length ? [{ t: other[Math.floor(rnd() * other.length)][0], slot: true }] : [])];
    return { tr: f[2], en: fillText(c, f), answer, pool: shuffle([...answer, ...wrong], rnd).map((b, k) => ({ ...b, k })) };
  });
}
// Kurulan sıra doğru mu (bloklar metinle karşılaştırılır)
export const taskRight = (task, built) => built.length === task.answer.length && built.every((b, i) => b.t === task.answer[i].t);

// Türkçe cümlede parçanın Türkçesini işaretlemek için: [önce, işaret, sonra] ya da null
export function markTr(sentence, part) {
  if (!part) return null;
  const i = sentence.toLocaleLowerCase("tr-TR").indexOf(part.toLocaleLowerCase("tr-TR"));
  return i < 0 ? null : [sentence.slice(0, i), sentence.slice(i, i + part.length), sentence.slice(i + part.length)];
}
