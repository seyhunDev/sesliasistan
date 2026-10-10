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

// Dinlerken gelen ara yazı (canlı yazı): her parçanın gecikmesi (ms, istek gidişinden yazının gelişine) ve servis
export function speechLive(ms, by) {
  if (!speech || !(ms >= 0)) return;
  speech.live = [...(speech.live || []), { ms: Math.round(ms), by: String(by || "") }].slice(-30);
}

// Canlı yazı denemesi: path "pcm" (ham ses parçası) / "whole" (kaydın tamamı) bir istek; path boşsa istek yazı getirmedi (why)
export function speechLiveTry(path, why = "") {
  if (!speech) return;
  const t = speech.tries || { pcm: 0, whole: 0, miss: 0, why: "" };
  if (path) t[path] = (t[path] || 0) + 1;
  else (t.miss += 1), (t.why = String(why || "").slice(0, 40));
  speech.tries = t;
}

// Canlı yazı özeti: parça sayısı, ortalama ve en uzun gecikme, servis ("Gemini", "Whisper")
const LIVE_BY = { gtranscribe: "Gemini", groq: "Whisper", openai: "Whisper" };
export function liveOf(r) {
  const l = Array.isArray(r?.live) ? r.live : [];
  const t = r?.tries || null;
  const req = t ? (t.pcm || 0) + (t.whole || 0) : 0;
  if (!l.length && !req && !(r?.voice && r?.marks?.listen != null)) return null;
  const avg = l.length ? l.reduce((a, x) => a + x.ms, 0) / l.length : 0;
  const by = [...new Set(l.map((x) => LIVE_BY[x.by] || x.by).filter(Boolean))].join(", ");
  return { n: l.length, avg: Math.round(avg), max: l.length ? Math.max(...l.map((x) => x.ms)) : 0, by, req, miss: t?.miss || 0, why: t?.why || "", path: t?.whole && !t?.pcm ? "whole" : t?.pcm ? "pcm" : "" };
}
// Canlı yazı satırı: gecikme; hiç yazı gelmediyse neden (istek gitmedi: ham ses toplanmadı; gitti ama boş/hata döndü)
export const liveText = (v) => {
  if (!v) return "";
  if (!v.n) return v.req ? `canlı yazı gelmedi: ${v.req} istek, ${v.miss} boş${v.why ? ` (${v.why})` : ""}${v.path === "whole" ? ", ham ses yok" : ""}` : "canlı yazı istenmedi (ses parçası toplanmadı)";
  return `canlı yazı ${v.n} parça, ortalama ${msText(v.avg)}, en uzun ${msText(v.max)}${v.by ? ` (${v.by})` : ""}${v.miss ? `, ${v.miss} boş${v.why ? ` (${v.why})` : ""}` : ""}${v.path === "whole" ? ", ham ses yok" : ""}`;
};

// Yeni komut: önceki bitmemişse kaydedilir. Sesliyse az önceki dinlemenin anları da eklenir
export function timingStart(text, viaVoice) {
  flush();
  const t = clock();
  const sp = viaVoice && speech?.text && t - speech.text < 10000 ? speech : null;
  const { live, tries, ...marks } = sp || {};
  cur = { at: t, text: String(text || "").slice(0, 90), voice: !!viaVoice, engine: "", marks: { ...marks, run: t }, ...(live?.length ? { live } : {}), ...(tries ? { tries } : {}) };
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
      const lv = liveText(liveOf(r));
      return [head, ...steps.map((s) => `  ${s.label}: ${msText(s.ms)}`), ...(lv ? [`  ${lv[0].toLocaleUpperCase("tr-TR")}${lv.slice(1)}`] : [])].join("\n");
    })
    .join("\n\n");
}
