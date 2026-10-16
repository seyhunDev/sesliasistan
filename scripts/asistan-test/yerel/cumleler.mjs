// Hazır cümle seti (src/lib/brain/seedPhrases.js) ve eşleyicisi (seedMatch.js)
import { suite } from "./ortak.mjs";
import { SEED } from "@/lib/brain/seedPhrases";
import { fold, seedTop, seedFind, withLearned, compileKey } from "@/lib/brain/seedMatch";

const { group } = suite("asistan");

const ids = SEED.map((t) => t.id);
const phrases = SEED.flatMap((t) => t.say.map((s) => [t.id, fold(s)]));
const dupes = phrases.filter(([, f], i) => phrases.findIndex(([, g]) => g === f) !== i);
const ROUTES = ["local", "more", "ai", "attendance", "shopping", "navigate", "close", "undo"];

group("Hazır cümle seti: biçim")([
  ["iş adları tekil", { desc: "aynı id iki kez yok", fn: () => ids.filter((x, i) => ids.indexOf(x) !== i), ok: (x) => x.length === 0 }],
  ["örnek cümleler tekil", { desc: "aynı söz iki işte yok", fn: () => dupes.map(([id, f]) => `${id}: ${f}`), ok: (x) => x.length === 0 }],
  ["alanlar", { desc: "kind, route, keys, say dolu", fn: () => SEED.filter((t) => !["read", "do", "talk"].includes(t.kind) || !ROUTES.includes(t.route) || !t.keys?.length || !t.say?.length || !t.title).map((t) => t.id), ok: (x) => x.length === 0 }],
  ["kalıplar derlenir", { desc: "her kalıp düzenli ifade olur", fn: () => SEED.flatMap((t) => t.keys.filter((k) => { try { compileKey(k); return false; } catch { return true; } })), ok: (x) => x.length === 0 }],
  ["en az 25 iş", { desc: "temel set", fn: () => SEED.length, ok: (x) => x >= 25 }],
  ["Türkçe harfsiz", { desc: "fold", fn: () => fold("Ali'ye ŞİMDİ Işık’la yaz"), ok: (x) => x === "aliye simdi isikla yaz" }],
]);

group("Hazır cümle seti: tek cümle")(SEED.flatMap((t) => t.say.map((s) => [s, { desc: t.id, fn: (x) => seedTop(x)?.id || "-", ok: (x) => x === t.id }])));

group("Hazır cümle seti: olmaması gerekenler")(SEED.flatMap((t) => t.not.map((s) => [s, { desc: `${t.id} değil`, fn: (x) => seedTop(x)?.id || "-", ok: (x) => x !== t.id }])));

const para = (s) => `Şey, bugün çok yoğundu. ${s}. Sonra bakarız`;
group("Hazır cümle seti: paragrafın içinde")(SEED.flatMap((t) => t.say.map((s) => [para(s), { desc: t.id, fn: (x) => seedFind(x).map((h) => h.id), ok: (x) => x.includes(t.id) }])));

const learned = withLearned(SEED, [{ id: "notes.read", x: "karalamalarımı dinlet" }, { id: "yok.boyle", x: "deneme" }]);
group("Hazır cümle seti: sıra ve öğrenilenler")([
  ["Bugün neler var? Ayrıca listeye süt ekle. Bir de Ali'yi ara.", { desc: "plans.today, shopping.add, call sırayla", fn: (x) => seedFind(x).map((h) => h.id).join(), ok: (x) => x === "plans.today,shopping.add,call" }],
  ["karalamalarımı dinlet", { desc: "öğrenilen söz notes.read", fn: (x) => seedTop(x, learned)?.id || "-", ok: (x) => x === "notes.read" }],
  ["karalamalarımı dinlet (öğrenmeden)", { desc: "sette yok", fn: () => seedTop("karalamalarımı dinlet")?.id || "-", ok: (x) => x === "-" }],
  ["bilinmeyen iş", { desc: "atlanır, set aynı uzunlukta", fn: () => learned.length === SEED.length && !learned.some((t) => t.id === "yok.boyle"), ok: (x) => x === true }],
  ["asıl set değişmez", { desc: "SEED'e yazılmaz", fn: () => SEED.find((t) => t.id === "notes.read").learned, ok: (x) => x === undefined }],
]);
