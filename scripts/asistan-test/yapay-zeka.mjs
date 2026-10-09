// Gerçek yapay zekayla asistan testi: uygulamanın sunucusunun yaptığı isteğin aynısı (aynı sistem talimatı, veri özeti biçimi,
// alıcı listesi) örnek verilerle gönderilir; dönen niyet ve alanlar beklenenle karşılaştırılır.
// Anahtarlar .env.local'dan okunur, hiçbir yere yazılmaz. Her cümle bir yapay zeka isteğidir (ücretsiz kotadan düşer).
import { callClaude } from "@/lib/ai/anthropic";
import { callGemini } from "@/lib/ai/gemini";
import { ASSISTANT_SYSTEM, ASSISTANT_TOOL, parseAssistant } from "@/lib/ai/assistant";
import { aiErrorKind } from "@/lib/ai/errors";
import { buildDigest, addDate } from "@/lib/ai/digest";
import { historyBlock } from "@/lib/convoContext";
import { todayStr } from "@/lib/utils/format";

const today = todayStr();
const tom = addDate(today, 1);
const plans = [
  { id: "p1", title: "Optimist antrenmanı", date: today, time: "17:00", place: "Kulüp iskelesi", cat: "Antrenman" },
  { id: "p2", title: "Yönetim kurulu toplantısı", date: tom, time: "10:00", place: "Kulüp salonu", cat: "Toplantı" },
  { id: "p3", title: "Bölge yarışı", date: addDate(today, 3), time: "", cat: "Yarış" },
  { id: "p4", title: "Laser antrenmanı", date: addDate(today, 5), time: "09:00", cat: "Antrenman" },
];
const tasks = [
  { id: "t1", title: "Tekneleri hazırla", due: today, done: false, assignees: ["u-ali"] },
  { id: "t2", title: "Römork lastiklerini kontrol et", due: tom, done: false, assignees: ["u-sanver"] },
  { id: "t3", title: "Motor yağını değiştir", due: addDate(today, -2), done: false },
];
const notes = [{ id: "n1", title: "3 numaralı Optimist", body: "Dümen yuvası gevşek, antrenmandan önce sıkılmalı.", createdAt: `${today}T09:00:00` }];
const members = [{ uid: "u-ali", name: "Ali Kök" }, { uid: "u-sanver", name: "Sanver İmamoğulları" }, { uid: "u-pinar", name: "Pınar Ezgi Yıldız" }];
const people = members.map((m) => m.name);
const contacts = ["Ekip (grup)", "Aile (grup)", ...people];
const baseDigest = buildDigest({ plans, tasks, notes, receipts: [], name: "Seyhun", members });

const chatFocus = [
  "## AÇIK EKRAN",
  "Sohbet: Ekip (grup)",
  "Varsayılan alıcı: Ekip",
  "Son mesajlar (eskiden yeniye):",
  "Ben: Günaydın, bugün 17:00 antrenmanı var. Tekneler hazır mı?",
  "Ali Kök: Hazırlıyorum, 3 numaralı Optimist'in dümenine bakacağım.",
  "Sanver İmamoğulları: Ben 16:30'da iskelede olurum. Cumartesi için yedek yelken lazım, biri sipariş versin.",
].join("\n");
const recordFocus = ["## AÇIK EKRAN", "Açık kayıt: Görev t:t2 | Römork lastiklerini kontrol et | son gün " + tom, "Varsayılan alıcı: Bu kaydın konuşması (kayıttaki kişiler görür)", "Kayıtta henüz mesaj yok."].join("\n");

// [söylenen, beklenen (açıklama), kontrol(r), bağlam]
export const CASES = [
  ["bu hafta neler var", "soru (query), planları sayar", (r) => r.intent === "query" && r.show.length > 0],
  ["yarın sabah dokuzda antrenman koy", "yeni plan, saat 09:00", (r) => r.intent === "create" && r.items[0]?.type === "plan" && r.items[0]?.time === "09:00"],
  ["Ali tekneleri yıkasın", "Ali Kök'e görev", (r) => r.intent === "create" && r.items[0]?.type === "task" && JSON.stringify(r.items[0]).includes("Ali Kök")],
  ["şey, malzeme odası çok dolu bunu bir yere yaz", "not", (r) => r.intent === "create" && r.items[0]?.type === "note"],
  ["yarınki toplantıyı iptal et", "iptal (iptal ekranı), p2", (r) => r.intent === "action" && r.actions.some((a) => a.op === "cancel" && a.id === "p2")],
  ["yarınki toplantıyı sil", "silme (onaylı), p2", (r) => r.intent === "action" && r.actions.some((a) => a.op === "delete" && a.id === "p2")],
  ["bölge yarışını pazara ertele", "güncelleme, p3", (r) => r.intent === "action" && r.actions.some((a) => a.op === "update" && a.id === "p3")],
  ["tekneleri hazırlama işini bitirdim", "görev tamamlama, t1", (r) => r.intent === "action" && r.actions.some((a) => a.op === "complete_task" && a.id === "t1")],
  // Görev listesindeki (assistTasks.js) diğer yapay zeka işleri
  ["her salı 16:00 Optimist antrenmanı ekle", "tekrarlayan plan (weekly)", (r) => r.intent === "create" && r.items[0]?.type === "plan" && (r.items[0]?.repeat === "week" || r.items[0]?.weekly === true) && r.items[0]?.time === "16:00"],
  ["motor yağı görevini yeniden aç", "görevi yeniden açma, t3", (r) => r.intent === "action" && r.actions.some((a) => a.op === "reopen_task" && a.id === "t3")],
  ["3 numaralı Optimist notu yapıldı", "not yapıldı (arşiv), n1", (r) => r.intent === "action" && r.actions.some((a) => a.op === "done_note" && a.id === "n1")],
  ["Ali'ye yarın 10'da tekne bakımı olduğunu yaz ve takvime ekle", "sıralı: mesaj + plan", (r) => r.send?.to === "Ali Kök" && !!r.send.text && r.items.some((i) => i.type === "plan" && i.time === "10:00")],
  ["not al: malzeme odası çok dolu", "not (açıkça istendi)", (r) => r.intent === "create" && r.items.length === 1 && r.items[0]?.type === "note"],
  ["yarın 10'da antrenman var, Ali de gelecek", "yalnız plan, kendiliğinden not yok", (r) => r.intent === "create" && r.items.some((i) => i.type === "plan") && !r.items.some((i) => i.type === "note")],
  ["Ali'ye söyle yarın erken gelsin", "Ali Kök'e mesaj", (r) => r.intent === "message" && r.send?.to === "Ali Kök" && !!r.send.text],
  ["ekibe yaz yarın antrenman yok", "Ekip grubuna mesaj", (r) => r.intent === "message" && r.send?.to === "Ekip"],
  ["Sanver'le yazışmalarıma bir göz at", "Sanver ile sohbeti aç", (r) => r.intent === "navigate" && /Sanver/.test(r.openChat)],
  ["hesap ayarlarım nerede", "Ayarlar sayfası", (r) => r.intent === "navigate" && r.navigate === "settings"],
  ["kendi yoklama geçmişimi görmek istiyorum", "Yoklamam sayfası", (r) => r.intent === "navigate" && r.navigate === "myAttendance"],
  ["Sanver'in işleri neler", "Sanver'in görevleri (query)", (r) => r.intent === "query" && /römork/i.test(r.message)],
  ["geciken bir şey var mı", "geciken görev: motor yağı", (r) => r.intent === "query" && /motor/i.test(r.message)],
  ["merhaba", "selam (chat)", (r) => r.intent === "chat"],
  ["bunu nasıl kullanırım", "yardım (chat)", (r) => r.intent === "chat"],
  ["bu sohbeti özetle", "sohbet özeti (Ekip sohbeti açık)", (r) => r.intent === "query" && /(Ali|Sanver|tekne|iskele)/i.test(r.message), chatFocus],
  ["bundan görev çıkar", "yedek yelken siparişi görevi", (r) => r.intent === "create" && /yelken/i.test(JSON.stringify(r.items)), chatFocus],
  ["tamam ben de 16:30'da orada olurum diye yaz", "Ekip'e mesaj (alıcı söylenmedi)", (r) => r.intent === "message" && r.send?.to === "Ekip", chatFocus],
  ["bu görevi tamamla", "açık kayıt t2 tamamlanır", (r) => r.intent === "action" && r.actions.some((a) => a.op === "complete_task" && a.id === "t2"), recordFocus],
  ["buna lastik basıncını da kontrol edin yaz", "kaydın konuşmasına mesaj", (r) => r.intent === "message" && /kayd/i.test(r.send?.to || ""), recordFocus],
];

// İnsan davranışları (tam testte: npm run test:hepsi): düzeltme, vazgeçme, "onu", yanlış ad, soru/komut, tekrar, uzun anlatım.
// Beşinci öğe: konuşma geçmişi (önceki tur), uygulamanın gönderdiği biçimde.
const dayAfter = (wd) => {
  for (let i = 1; i <= 7; i++) if (new Date(`${addDate(today, i)}T12:00:00`).getDay() === wd) return addDate(today, i);
};
const FRI = dayAfter(5);
const SAT = dayAfter(6);
const askedTomorrow = [{ role: "user", text: "yarın ne var" }, { role: "assistant", text: "Yarın 10:00'da Yönetim kurulu toplantısı var." }];
const madeMsg = [{ role: "user", text: "Ali'ye yaz yarın erken gelsin" }, { role: "assistant", text: "Ali Kök için mesaj hazır: “Yarın erken gelir misin?” Göndereyim mi?" }];
const planOf = (r) => r.items.find((i) => i.type === "plan");
const textOf = (r) => `${r.send?.text || ""} ${(r.sends || []).map((x) => x.text).join(" ")}`;
export const HUMAN = [
  ["yarın değil cuma 10'da antrenman ekle", `düzeltme: plan cuma (${FRI}) 10:00`, (r) => planOf(r)?.date === FRI && planOf(r)?.time === "10:00"],
  ["yarın 10'da yok yok 11'de antrenman ekle", "düzeltme: plan 11:00", (r) => planOf(r)?.time === "11:00"],
  ["Ali'ye yaz yok yok Pınar'a yaz yarın erken gelsin", "düzeltme: mesaj Pınar'a, Ali'ye değil", (r) => /Pınar/.test(r.send?.to || "") && !(r.sends || []).some((x) => /Ali/.test(x.to))],
  ["Ali'ye yarın gelmesin diye yaz pardon gelsin diye yaz", "düzeltme: mesaj “gelsin”, “gelmesin” değil", (r) => r.send?.to === "Ali Kök" && !/gelme/i.test(textOf(r))],
  ["bölge yarışını pazara ertele yok ertelemeyelim kalsın", "vazgeçme: hiçbir şey değişmez", (r) => !r.actions.some((a) => a.op === "update") && !r.items.length],
  ["Ali'ye mesaj atacaktım ama boşver", "vazgeçme: mesaj hazırlanmaz", (r) => !r.send?.text && !r.items.length],
  ["onu 11'e al", "“onu” = konuşulan toplantı (p2), saat 11:00", (r) => r.actions.some((a) => a.op === "update" && a.id === "p2"), null, askedTomorrow],
  ["onu iptal et", "“onu” = konuşulan toplantı (p2) iptal", (r) => r.actions.some((a) => (a.op === "cancel" || a.op === "delete") && a.id === "p2"), null, askedTomorrow],
  ["daha kısa yaz", "önceki mesaj kısalır (Ali Kök)", (r) => r.intent === "message" && r.send?.to === "Ali Kök", null, madeMsg],
  ["Ali Kük'e tekneleri yıkamasını söyle", "yanlış ad: Ali Kök'e mesaj", (r) => r.send?.to === "Ali Kök"],
  ["sanvere römork lastiklerini sor", "kesmesiz ad: Sanver'e mesaj", (r) => /Sanver/.test(r.send?.to || "")],
  ["pınar ezginin işleri ne", "küçük harf ad: Pınar'ın görevleri (query)", (r) => r.intent === "query"],
  ["yarın toplantı var mı", "soru: cevaplanır, kayıt eklenmez", (r) => r.intent === "query" && !r.items.length],
  ["motor yağı görevi bitti mi", "soru: görev tamamlanmaz", (r) => !r.actions.some((a) => a.op === "complete_task")],
  ["motor yağı görevi bitti", "komut: t3 tamamlanır", (r) => r.actions.some((a) => a.op === "complete_task" && a.id === "t3")],
  ["antrenman ekle antrenman ekle yarın onda", "tekrar: tek plan 10:00", (r) => r.items.filter((i) => i.type === "plan").length === 1 && planOf(r)?.time === "10:00"],
  ["şimdi şöyle bir şey diyecektim hani geçen hafta konuşmuştuk ya cumartesi sabah dokuzda bir tekne bakımı yapalım dedik onu bir takvime koy", `uzun anlatım: plan cumartesi (${SAT}) 09:00`, (r) => planOf(r)?.date === SAT && planOf(r)?.time === "09:00"],
  ["ekibe yazma sadece Ali'ye yaz yarın antrenman yok", "olumsuz: yalnız Ali'ye", (r) => r.send?.to === "Ali Kök" && !(r.sends || []).some((x) => x.to === "Ekip")],
  ["rica etsem yarın akşam altıda toplantı koyar mısın", "kibar: plan 18:00", (r) => planOf(r)?.time === "18:00"],
  ["abi şu römork işini Sanver halletti", "sokak ağzı: t2 tamamlanır", (r) => r.actions.some((a) => a.op === "complete_task" && a.id === "t2")],
];
// Küçük örnek (varsayılan tam testte; kota az gider): eski setten 5, insan davranışlarından 7
export const SAMPLE = [CASES[1], CASES[11], CASES[14], CASES[20], CASES[26], HUMAN[0], HUMAN[2], HUMAN[4], HUMAN[6], HUMAN[9], HUMAN[13], HUMAN[16]];

function pickProvider() {
  const p = (process.env.AI_PROVIDER || "").toLowerCase();
  if (p === "gemini" || p === "anthropic") return p;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "";
}
const ask = (provider, user) =>
  provider === "gemini"
    ? callGemini({ model: process.env.GEMINI_MODEL, system: ASSISTANT_SYSTEM, user, schema: ASSISTANT_TOOL.input_schema, maxTokens: 8192, timeoutMs: 20000 })
    : callClaude({ model: process.env.AI_MODEL_TEXT || "claude-haiku-4-5-20251001", system: ASSISTANT_SYSTEM, tool: ASSISTANT_TOOL, messages: [{ role: "user", content: user }], maxTokens: 2048 });

export default async function run(log, cases = CASES, { pause = 0, group = "" } = {}) {
  const provider = pickProvider();
  if (!provider) {
    log("Yapay zeka anahtarı bulunamadı (.env.local içinde GEMINI_API_KEY ya da ANTHROPIC_API_KEY). Yapay zeka testi atlandı.");
    return [];
  }
  log(`Sağlayıcı: ${provider}${provider === "gemini" ? ` · model ${process.env.GEMINI_MODEL || "(GEMINI_MODEL boş)"}` : ""}`);
  const out = [];
  for (const [say, expect, ok, focus, hist] of cases) {
    if (out.some((x) => x.quota)) {
      out.push({ group: group || "Yapay zeka", say, ok: null, expect, got: "ATLANDI: yapay zeka kotası doldu", ms: 0, quota: true });
      continue;
    }
    if (pause && out.length) await new Promise((r) => setTimeout(r, pause)); // dakikalık token sınırı dolmasın
    const digest = [baseDigest, focus].filter(Boolean).join("\n\n");
    const recipients = `## MESAJ ALICILARI\n${[...(focus === recordFocus ? ["Bu kaydın konuşması (kayıt)"] : []), ...contacts].join("\n")}`;
    const user = `${digest}\n\n${recipients}\n\n## KONUŞMA GEÇMİŞİ\n${hist ? historyBlock(hist) : "(yok)"}\n\n## KULLANICININ YENİ İSTEĞİ (Seyhun)\n"""\n${say}\n"""`;
    const t0 = Date.now();
    let row;
    try {
      const r = parseAssistant(await ask(provider, user), people, contacts.map((c) => c.replace(/\s*\(.*\)\s*$/, "")).concat(focus === recordFocus ? ["Bu kaydın konuşması"] : []), say);
      const pass = !!ok(r);
      const what = [r.intent, r.navigate && `sayfa=${r.navigate}`, r.openChat && `sohbet=${r.openChat}`, r.send && `mesaj→${r.send.to}: ${r.send.text}`, r.items.length && `kayıt=${r.items.map((i) => `${i.type}:${i.title}${i.time ? " " + i.time : ""}`).join(", ")}`, r.actions.length && `işlem=${r.actions.map((a) => `${a.op}:${a.id}`).join(", ")}`].filter(Boolean).join(" · ");
      const g = group || (focus ? (focus === chatFocus ? "Yapay zeka · sohbet bağlamı" : "Yapay zeka · kayıt bağlamı") : hist ? "Yapay zeka · konuşma geçmişi" : "Yapay zeka");
      row = { group: g, say, ok: pass, expect, got: `${what} · “${r.message}”`, ms: Date.now() - t0 };
    } catch (e) {
      const kind = aiErrorKind(e);
      // Kota doldu: hata değil, atlandı (sonraki cümleler de atlanır)
      row = { group: group || "Yapay zeka", say, ok: kind === "quota" ? null : false, expect, got: kind === "quota" ? "ATLANDI: yapay zeka kotası doldu (429)" : `HATA (${kind}): ${String(e.message).slice(0, 160)}`, ms: Date.now() - t0, quota: kind === "quota" };
    }
    out.push(row);
    log(`${row.ok ? "✓" : row.ok === null ? "–" : "✗"} ${say} — ${(row.ms / 1000).toFixed(1)} sn`);
  }
  return out;
}
