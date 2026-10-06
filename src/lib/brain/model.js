import { normalizeSpeech } from "@/lib/speech/normalize";

// Küçük yerel "yapay zeka": kullanıcının geçmiş komutlarından öğrenir.
// Yöntem: kelime kökleri (+ ikili kök grupları) ile TF-IDF vektörü, kosinüs benzerliği,
// en yakın komşuların ağırlıklı oylaması. Sunucu gerektirmez, saf JavaScript.
// Geliştirmek için: tokens() (özellik çıkarımı), WEIGHT (kaynak güveni), predict() (oylama) değiştirilebilir.
export const MODEL_V = 1;

// Etiketler (label):
//   create:plan | create:task | create:note | create:plan+note | create:multi
//   nav:home | nav:plans | nav:tasks | nav:notes | nav:receipts
//   receipt | complete | summary | query | action:delete | action:update | chat | send
export const LABELS = {
  "create:plan": "Plan ekleme",
  "create:task": "Görev ekleme",
  "create:note": "Not ekleme",
  "create:plan+note": "Plan + not",
  "create:multi": "Birden çok kayıt",
  receipt: "Fiş",
  meeting: "Toplantı kaydı",
  complete: "Görev tamamlama",
  summary: "Özet",
  query: "Soru",
  "action:delete": "Silme",
  "action:update": "Değiştirme",
  chat: "Sohbet",
  send: "Mesaj gönderme",
};

// Kaynağın güveni: kullanıcı kaydettiyse en yüksek
export const WEIGHT = { user: 2, ai: 1.5, local: 1 };

const STOP = new Set("ve ile bir bu şu o da de mi mı mu mü ki için gibi daha çok bana beni benim bizim lütfen şey olarak diye".split(" "));
const stem = (w) => (w.length <= 5 ? w : w.slice(0, 5));

// Metni özelliklere çevirir: saat/tarih/sayılar tek işarete, kelimeler köke, ardışık kökler ikili gruba
export function tokens(text) {
  const t = normalizeSpeech(text)
    .toLocaleLowerCase("tr-TR")
    .replace(/saat \d{1,2}:\d{2}/g, " #saat ")
    .replace(/\d+/g, " #sayı ")
    .replace(/(^|\s)(pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar|bugün|yarın|öbür gün|haftaya)\S*/gu, " #gün ")
    .replace(/[^\p{L}#\s]/gu, " ");
  const ws = t.split(/\s+/).filter((w) => w && !STOP.has(w)).map((w) => (w[0] === "#" ? w : stem(w)));
  const out = [...ws];
  for (let i = 1; i < ws.length; i++) out.push(`${ws[i - 1]}_${ws[i]}`);
  return out;
}

// Örneklerden arama dizini kurar. examples: [{ x: metin, l: etiket, s: kaynak }]
export function train(examples) {
  const docs = examples.map((e) => ({ e, tf: count(tokens(e.x)) }));
  const df = new Map();
  docs.forEach((d) => d.tf.forEach((_, k) => df.set(k, (df.get(k) || 0) + 1)));
  const N = docs.length || 1;
  const idf = (k) => Math.log(1 + N / (df.get(k) || 1));
  docs.forEach((d) => (d.vec = weigh(d.tf, idf)));
  return { v: MODEL_V, n: docs.length, docs, idf };
}

function count(ts) {
  const m = new Map();
  ts.forEach((k) => m.set(k, (m.get(k) || 0) + 1));
  return m;
}
function weigh(tf, idf) {
  const v = new Map();
  let norm = 0;
  tf.forEach((c, k) => {
    const w = (1 + Math.log(c)) * idf(k);
    v.set(k, w);
    norm += w * w;
  });
  norm = Math.sqrt(norm) || 1;
  v.forEach((w, k) => v.set(k, w / norm));
  return v;
}
function cos(a, b) {
  let s = 0;
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  small.forEach((w, k) => {
    const o = big.get(k);
    if (o) s += w * o;
  });
  return s;
}

// En yakın k örneğe bakarak etiket tahmini.
// Dönüş: { label, score (0-1 güven), sim (en yakın benzerlik), near: [{ x, l, sim }] } ya da null
export function predict(index, text, k = 5) {
  if (!index?.n) return null;
  const q = weigh(count(tokens(text)), index.idf);
  if (!q.size) return null;
  const near = index.docs
    .map((d) => ({ d, sim: cos(q, d.vec) }))
    .filter((x) => x.sim > 0.15)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, k);
  if (!near.length) return null;
  const votes = new Map();
  let total = 0;
  near.forEach(({ d, sim }) => {
    const w = sim * (WEIGHT[d.e.s] || 1);
    votes.set(d.e.l, (votes.get(d.e.l) || 0) + w);
    total += w;
  });
  const [label, best] = [...votes].sort((a, b) => b[1] - a[1])[0];
  const sim = near[0].sim;
  return { label, score: (best / total) * Math.min(1, sim / 0.4), sim, near: near.map(({ d, sim: s }) => ({ x: d.e.x, l: d.e.l, sim: +s.toFixed(2) })) };
}

// ---- Etiket çıkarma: olayı tek etikete çevirir ----
export function labelFromCommand(cmd) {
  if (!cmd) return "";
  if (cmd.type === "receipt") return "receipt";
  if (cmd.type === "meeting") return "meeting";
  if (cmd.type === "navigate") return `nav:${cmd.page}`;
  if (cmd.type === "complete") return "complete";
  if (cmd.type === "create") return labelFromItems(cmd.items);
  if (cmd.type === "reply") return "summary";
  return "";
}
export function labelFromItems(items = []) {
  const ts = [...new Set(items.map((i) => i.type))].sort();
  if (!ts.length) return "";
  if (ts.length === 1) return items.length > 1 ? "create:multi" : `create:${ts[0]}`;
  return ts.join("+") === "note+plan" && items.length === 2 ? "create:plan+note" : "create:multi";
}
export function labelFromAI(r) {
  if (!r) return "";
  if (r.intent === "create" && r.items?.length) return labelFromItems(r.items);
  const op = r.actions?.[0]?.op;
  if (op === "complete_task") return "complete";
  if (op === "done_note") return "action:done_note";
  if (op === "delete") return "action:delete";
  if (op === "update") return "action:update";
  if (r.intent === "navigate" && r.navigate) return `nav:${r.navigate}`;
  if (r.intent === "message" && (r.send?.text || r.send?.to)) return "send";
  if (r.intent === "query") return "query";
  if (r.intent === "chat") return "chat";
  return "";
}
