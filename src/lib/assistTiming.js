// Asistan süre kaydı (Ayarlar › Asistan süre kaydı): her komutun adım adım ne kadar sürdüğü, son 20 komut.
// Yalnız bu cihazda (localStorage "sa-timing"); sunucuya ve Firebase'e gitmez.
// Anlar: dinleme (useSpeech) → komut (AssistantSheet run) → yapay zeka → kayıt → cevap → okuma (TtsProvider).
// Sesli komutta dinlemenin anları ayrı tutulur (speechMark), komut başlayınca kayda eklenir.

export const TIMING_KEY = "sa-timing";
export const TIMING_MAX = 20;
const AFTER_REPLY = 4000; // cevaptan sonra okuma başlamazsa (sesli yanıt kapalı) kayıt bu kadar sonra kapanır

// Her an, bir önceki andan bu yana geçen adımın adıyla gösterilir
export const STEP_LABELS = {
  voiceEnd: "Konuşman",
  stop: "Susmanın beklenmesi",
  upload: "Sesin hazırlanması",
  text: "Yazıya çevirme",
  run: "Uygulamaya geçiş",
  pre: "Ön cevap",
  ai: "Veri özeti, gönderme",
  first: "Yapay zeka ilk parça",
  aiDone: "Yapay zeka cevabı",
  saved: "Kaydetme",
  reply: "Sonucun hazırlanması",
  preSay: "Ön cevap okunmaya başladı",
  speak: "Cevap okunmaya başladı",
};
const ENGINES = { ai: "Yapay zeka", local: "Yerel", rules: "Yedek kurallar", brain: "Öğrenilenler" };

let speech = null; // son dinlemenin anları
let cur = null; // işlenen komut
let timer = null;
let clock = () => Date.now();
let store = null; // testte bellekteki depo

// Test için: saat ve depo değiştirilebilir
export function timingTest({ now, storage } = {}) {
  clock = now || (() => Date.now());
  store = storage || null;
  speech = null;
  cur = null;
  clearTimeout(timer);
}

const box = () => store || (typeof localStorage !== "undefined" ? localStorage : null);

export function timingList() {
  try {
    const l = JSON.parse(box()?.getItem(TIMING_KEY) || "[]");
    return Array.isArray(l) ? l : [];
  } catch {
    return [];
  }
}

export function timingClear() {
  try {
    box()?.removeItem(TIMING_KEY);
  } catch {}
}

function save(r) {
  try {
    box()?.setItem(TIMING_KEY, JSON.stringify([r, ...timingList()].slice(0, TIMING_MAX)));
  } catch {}
}

// Dinleme anları: "listen" yeni dinleme başlatır; "voiceEnd" verilen anla (son ses), diğerleri şimdi
export function speechMark(name, at) {
  const t = at ?? clock();
  if (name === "listen") speech = { listen: t };
  else if (speech && speech[name] == null && t) speech[name] = t;
}

// Yeni komut: önceki bitmemişse kaydedilir. Sesliyse az önceki dinlemenin anları da eklenir
export function timingStart(text, viaVoice) {
  flush();
  const t = clock();
  const sp = viaVoice && speech?.text && t - speech.text < 10000 ? speech : null;
  cur = { at: t, text: String(text || "").slice(0, 90), voice: !!viaVoice, engine: "", marks: { ...(sp || {}), run: t } };
  speech = null;
}

export function timingMark(name) {
  if (cur && cur.marks[name] == null) cur.marks[name] = clock();
}

// Cevap verildi: okuma başlayınca (ya da başlamazsa kısa süre sonra) kayıt kapanır.
// Kim cevapladı: yapay zeka cevap verdiyse "ai" (sonucu uygulama söylese de), yoksa verilen (yerel, yedek kurallar…)
export function timingReply(engine) {
  if (!cur) return;
  timingMark("reply");
  if (!cur.engine) cur.engine = cur.marks.aiDone ? "ai" : engine || "local";
  clearTimeout(timer);
  if (cur.marks.speak) flush();
  else timer = setTimeout(flush, AFTER_REPLY);
}

// Sesli okuma başladı: önce ön cevap ("Tamam.") okunur, sonra cevap
export function timingSpeak() {
  if (!cur) return;
  if (cur.marks.pre && !cur.marks.preSay && !cur.marks.reply && !cur.marks.speak) return timingMark("preSay");
  timingMark("speak");
  if (cur.marks.reply) flush();
}

export function timingFlush() {
  flush();
}

function flush() {
  clearTimeout(timer);
  const r = cur;
  cur = null;
  if (r?.marks.reply) save(r);
}

// Adımlar: anlar zamana göre sıralanır, her adımın süresi bir önceki andan bu yana.
// "Konuşman" kullanıcının konuşma süresidir, toplama girmez. Toplam: sustuğu an (yazıda gönderdiği an) → cevabın okunması
export function timingSteps(r) {
  const m = r?.marks || {};
  const list = Object.entries(m)
    .filter(([, t]) => typeof t === "number")
    .sort((a, b) => a[1] - b[1]);
  const steps = [];
  for (let i = 1; i < list.length; i++) {
    const [name, t] = list[i];
    steps.push({ name, label: STEP_LABELS[name] || name, ms: t - list[i - 1][1], user: name === "voiceEnd" });
  }
  const from = m.voiceEnd ?? m.listen ?? m.run;
  const to = m.speak ?? m.reply;
  return { steps, total: from != null && to != null ? Math.max(0, to - from) : 0, ai: m.aiDone != null && m.ai != null ? m.aiDone - m.ai : 0 };
}

export const secText = (ms) => `${(ms / 1000).toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} sn`;
export const msText = (ms) => (ms < 1000 ? `${Math.round(ms)} ms` : secText(ms));
export const engineName = (e) => ENGINES[e] || "";

// Kopyalanacak düz metin (yeni threade yapıştırmak için)
export function timingText(list = timingList()) {
  return list
    .map((r) => {
      const { steps, total } = timingSteps(r);
      const head = `${new Date(r.at).toLocaleString("tr-TR")} · ${r.voice ? "sesli" : "yazılı"}${r.engine ? ` · ${engineName(r.engine)}` : ""} · toplam ${secText(total)} · “${r.text}”`;
      return [head, ...steps.map((s) => `  ${s.label}: ${msText(s.ms)}`)].join("\n");
    })
    .join("\n\n");
}
