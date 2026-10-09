// Ses testleri: Whisper'ın uydurduğu metnin ayıklanması, Türkçe okunuş, en iyi cihaz sesinin seçimi.
import { bestVoice, speechChunks, speechText } from "@/lib/speech/speakText";
import { suite } from "./ortak.mjs";

const { group } = suite("ses");
// Whisper'ın sessizlikte uydurduğu cümleler atılır; gerçek komut kalır
const { dropHallucination } = await import("@/lib/speech/hallucination");
const HP = "Spor kulübü, yelken, antrenman, yarış, regat, ayak, Optimist, ILCA, Laser.";
const HL = (want) => ({ desc: want ? `kalır: ${want}` : "boş", fn: (s) => dropHallucination(s, HP), ok: (r) => r === want });
group("Uydurma metin ayıklama")([
  ["Altyazı M.K.", HL("")], ["İzlediğiniz için teşekkür ederim.", HL("")], ["Abone olmayı unutmayın!", HL("")], ["[Müzik]", HL("")],
  ["Bir sonraki videoda görüşmek üzere.", HL("")], ["Spor kulübü, yelken, antrenman, yarış, regat", HL("")],
  ["Yoklamayı aç. İzlediğiniz için teşekkür ederim.", HL("Yoklamayı aç.")], ["Teşekkürler.", HL("Teşekkürler.")],
  ["Optimist yarışına git", HL("Optimist yarışına git")], ["yarın antrenman ekle", HL("yarın antrenman ekle")],
]);


// Sesli okunuş (cihaz sesi): metin Türkçe okunuşa çevrilir, en doğal ses seçilir
const SP = (want) => ({ desc: want, fn: speechText, ok: (r) => r === want });
group("Sesli okunuş")([
  ["Yarın saat 14:30'da antrenman var 🚤", SP("Yarın saat on dört otuzda antrenman var")],
  ["Rüzgar 12 kt, 18°C.", SP("Rüzgar 12 knot, 18 derece.")],
  ["Foça yarışı 7-11 Ekim'de.", SP("Foça yarışı 7 ile 11 Ekim'de.")],
  ["Otel kişi başı 3.500 TL (4 gece).", SP("Otel kişi başı 3.500 lira, 4 gece.")],
  ["**Toplam:** ₺12.400", SP("Toplam: 12.400 lira")],
  ["Toplantı 2026-10-07 saat 09:05", SP("Toplantı 7 Ekim 2026 saat dokuz sıfır beş")],
  ["%20 indirim", SP("yüzde 20 indirim")],
  ["rüzgar 25 km/s", SP("rüzgar saatte 25 kilometre")],
  ["Optimist/ILCA", SP("Optimist ya da ILCA")],
  ["uzun cümle bölünür", { desc: "160 harften kısa parçalar", fn: () => speechChunks("Yarın ".repeat(20) + "toplantı var, " + "tekneler hazırlanacak ".repeat(8) + "ve bitti."), ok: (r) => r.length > 1 && r.every((x) => x.length <= 160) }],
]);
const VOICES = [
  { name: "Eddy", lang: "tr-TR", voiceURI: "com.apple.eloquence.tr-TR.Eddy" },
  { name: "Yelda", lang: "tr-TR", voiceURI: "com.apple.voice.compact.tr-TR.Yelda", localService: true },
  { name: "Yelda", lang: "tr-TR", voiceURI: "com.apple.voice.premium.tr-TR.Yelda", localService: true },
  { name: "Samantha", lang: "en-US", voiceURI: "com.apple.voice.compact.en-US.Samantha" },
];
const BV = (list, uri, want) => ({ desc: want || "ses yok", fn: () => bestVoice(list, uri)?.voiceURI || null, ok: (r) => r === want });
group("Ses seçimi")([
  ["Premium varsa o", BV(VOICES, "", "com.apple.voice.premium.tr-TR.Yelda")],
  ["yalnız eğlence + kompakt: kompakt", BV(VOICES.slice(0, 2), "", "com.apple.voice.compact.tr-TR.Yelda")],
  ["kullanıcının seçtiği", BV(VOICES, "com.apple.voice.compact.tr-TR.Yelda", "com.apple.voice.compact.tr-TR.Yelda")],
  ["Türkçe ses yok", BV(VOICES.slice(3), "", null)],
  ["Chrome: Google (internet) yerine cihazdaki Yelda", BV([{ name: "Google Türkçe", lang: "tr-TR", voiceURI: "Google Türkçe", localService: false }, { name: "Yelda", lang: "tr-TR", voiceURI: "Yelda", localService: true }], "", "Yelda")],
  ["Mac Chrome: Gelişmiş ad ile", BV([{ name: "Yelda", lang: "tr-TR", voiceURI: "Yelda", localService: true }, { name: "Yelda (Gelişmiş)", lang: "tr-TR", voiceURI: "Yelda (Gelişmiş)", localService: true }], "", "Yelda (Gelişmiş)")],
]);


// Konuşma bitişi (kayıt yolu, iPhone): gürültüde de susunca dinleme biter (vad.js; useSpeech ile aynı kural: endWait)
const { makeVad, endWait, speechEnded, END_SILENCE, END_SILENCE_SHORT } = await import("@/lib/speech/vad");
const { trimQuiet, louder } = await import("@/lib/speech/wav");
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
// noise(t): gürültü seviyesi, talk: [başlangıç, bitiş] ms (konuşma heceli: 300 ms ses, 100 ms ara)
const scene = ({ noise, talk = [1000, 4000], pause, voice = 0.3, total = 30000 }) => () => {
  seed = 7;
  const v = makeVad({ minLvl: 0.03 });
  for (let t = 0; t <= total; t += 100) {
    const n = noise(t) * (0.7 + rnd() * 0.6);
    const speaking = talk && t >= talk[0] && t < talk[1] && t % 400 < 300 && !(pause && t >= pause[0] && t < pause[1]);
    v.step(speaking ? Math.max(n, voice * (0.6 + rnd() * 0.5)) : n, t);
    if (speechEnded(v, t)) return { seen: true, end: t - (talk ? talk[1] : 0), wait: endWait(v) };
  }
  return { seen: v.voiceSeen, end: null };
};
const ENDS = (max) => ({ desc: `konuşma bitince ${max / 1000} sn içinde biter`, ok: (r) => r.seen && r.end != null && r.end <= max });
group("Konuşma bitişi (gürültü)")([
  ["sessiz oda", { ...ENDS(3000), fn: scene({ noise: () => 0.01 }) }],
  ["sürekli rüzgâr uğultusu", { ...ENDS(3500), fn: scene({ noise: () => 0.09 }) }],
  ["konuşma bitince motor çalıştı", { ...ENDS(7000), fn: scene({ noise: (t) => (t > 4000 ? 0.12 : 0.01) }) }],
  ["arkada uzaktan konuşanlar", { ...ENDS(4000), fn: scene({ noise: (t) => (Math.floor(t / 700) % 2 ? 0.05 : 0.015) }) }],
  ["alçak sesle konuşma", { ...ENDS(3000), fn: scene({ noise: () => 0.004, voice: 0.06 }) }],
  ["cümle ortasında 1,5 sn duraksama kesmez (rüzgârda)", { desc: "konuşmanın sonunda biter", fn: scene({ noise: () => 0.09, talk: [1000, 7000], pause: [3000, 4500] }), ok: (r) => r.seen && r.end > 0 && r.end <= 3500 }],
  ["konuşmadan: tek çarpma konuşma sayılmaz", { desc: "konuşma yok", fn: () => { const v = makeVad(); [0.01, 0.01, 0.5, 0.01, 0.01].forEach((l, i) => v.step(l, i * 100)); return v.voiceSeen; }, ok: (r) => r === false }],
]);
// Konuşma bitti → gönderme kararı kaç ms sonra (sessiz odada): uzun cümlede 1,6 sn, kısa sözde ("evet") 2 sn.
// Cümle ortasındaki kısa duraksama kesmez. Bekleme 0,1 sn'lik ölçüm adımıyla ve son hecenin payıyla biraz uzayabilir.
const AFTER = (lo, hi) => ({ desc: `${lo / 1000}-${hi / 1000} sn sonra gönderilir`, ok: (r) => r.seen && r.end >= lo && r.end <= hi });
group("Konuşma bitişi süresi")([
  ["uzun cümle (3 sn)", { ...AFTER(END_SILENCE - 300, END_SILENCE + 300), fn: scene({ noise: () => 0.01 }) }],
  ["kısa söz (\"evet\", 0,8 sn)", { ...AFTER(END_SILENCE_SHORT - 300, END_SILENCE_SHORT + 300), fn: scene({ noise: () => 0.01, talk: [1000, 1800] }) }],
  ["1,2 sn duraksama kesmez", { desc: "duraksamada gönderilmez, sonunda gönderilir", fn: scene({ noise: () => 0.01, talk: [1000, 6000], pause: [2500, 3700] }), ok: (r) => r.seen && r.end > 0 && r.end <= END_SILENCE + 300 }],
  ["2,2 sn duraksama: gönderilir (devamı öncekine eklenir)", { desc: "duraksamada gönderilir", fn: scene({ noise: () => 0.01, talk: [1000, 7000], pause: [3000, 5200] }), ok: (r) => r.seen && r.end < 0 }],
]);

// Dokun-konuş-dokun-gönder: dinlerken ara yazı ne zaman istenir (kayıt yolu, vad.js partialDue)
const { partialDue, PART_MS } = await import("@/lib/speech/vad");
const PD = (s, now, want) => ({ desc: want ? "istenir" : "istenmez", fn: () => partialDue(s, now), ok: (r) => r === want });
group("Dinlerken ara yazı")([
  ["konuşuldu, 2 sn geçti", PD({ t0: 0, voiceSeen: true, lastSpeech: 1800 }, PART_MS, true)],
  ["henüz konuşulmadı", PD({ t0: 0, voiceSeen: false, lastSpeech: 0 }, 5000, false)],
  ["önceki istek sürüyor", PD({ t0: 0, voiceSeen: true, lastSpeech: 4000, partBusy: true, partAt: 2000, partFrom: 1800 }, 4500, false)],
  ["son ara yazıdan beri konuşulmadı", PD({ t0: 0, voiceSeen: true, lastSpeech: 1800, partAt: 2000, partFrom: 1800 }, 6000, false)],
  ["yeniden konuşuldu ama 2 sn dolmadı", PD({ t0: 0, voiceSeen: true, lastSpeech: 3000, partAt: 2000, partFrom: 1800 }, 3500, false)],
  ["yeniden konuşuldu, 2 sn doldu", PD({ t0: 0, voiceSeen: true, lastSpeech: 3800, partAt: 2000, partFrom: 1800 }, 4000, true)],
]);

// Parça parça yazı: duraksamada ya da uzun konuşmada yeni ses ayrı parça olarak çevrilir, dinleme sürer (vad.js segmentDue)
const { segmentDue, bestText, SEG_PAUSE, SEG_MAX } = await import("@/lib/speech/vad");
const SD = (s, now, want) => ({ desc: want ? "parça gider" : "beklenir", fn: () => segmentDue(s, now), ok: (r) => r === want });
group("Dinlerken parça yazı")([
  ["konuştu, kısa duraksadı", SD({ t0: 0, voiceSeen: true, voiceFrom: 500, lastSpeech: 2000 }, 2000 + SEG_PAUSE, true)],
  ["hâlâ konuşuyor (duraksama yok)", SD({ t0: 0, voiceSeen: true, voiceFrom: 500, lastSpeech: 2900 }, 3000, false)],
  ["aralıksız uzun konuşma", SD({ t0: 0, voiceSeen: true, voiceFrom: 500, lastSpeech: 8900 }, 500 + SEG_MAX, true)],
  ["son parçadan beri konuşmadı", SD({ t0: 0, voiceSeen: true, lastSpeech: 2000, segFrom: 2800 }, 6000, false)],
  ["iki parça hâlâ çevriliyor", SD({ t0: 0, voiceSeen: true, lastSpeech: 4000, segFrom: 2800, segBusy: 2 }, 5000, false)],
  ["hiç konuşulmadı", SD({ t0: 0, voiceSeen: false, lastSpeech: 0 }, 5000, false)],
]);
group("Son yazı: tam çeviri mi parçalar mı")([
  ["tam çeviri var", { desc: "tam çeviri", fn: () => bestText("Yarın onda antrenman ekle", "yarın 10 antrenman ekle"), ok: (r) => r === "Yarın onda antrenman ekle" }],
  ["tam çeviri yok", { desc: "parçalar", fn: () => bestText("", "yarın 10 antrenman ekle"), ok: (r) => r === "yarın 10 antrenman ekle" }],
  ["tam çeviri kısa kalmış", { desc: "parçalar (söylenen kaybolmaz)", fn: () => bestText("Yarış oluştur", "Cumhuriyet yarışı oluştur, yarış için görsel hazırla, Mustafa geldi"), ok: (r) => r.startsWith("Cumhuriyet") }],
]);

// Groq Whisper parçaları: sessizlikte uydurulan parça atılır (no_speech_prob yüksek ve model emin değil)
const { spokenText } = await import("@/lib/speech/hallucination");
const SPK = (desc, data, exp) => [desc, { desc: exp ? `“${exp}”` : "boş", fn: () => spokenText(data), ok: (r) => r === exp }];
group("Whisper parçaları")([
  SPK("emin parça kalır", { segments: [{ text: " Yarın antrenman ekle.", no_speech_prob: 0.02, avg_logprob: -0.2 }] }, "Yarın antrenman ekle."),
  SPK("sessiz ve emin olmayan parça atılır", { segments: [{ text: "Yarın antrenman ekle.", no_speech_prob: 0.01, avg_logprob: -0.3 }, { text: "İzlediğiniz için teşekkürler.", no_speech_prob: 0.9, avg_logprob: -1.1 }] }, "Yarın antrenman ekle."),
  SPK("sessiz ama emin parça kalır", { segments: [{ text: "Evet.", no_speech_prob: 0.7, avg_logprob: -0.3 }] }, "Evet."),
  SPK("parça yoksa düz metin", { text: " Planları aç " }, "Planları aç"),
]);

const tone = (sec, amp) => Float32Array.from({ length: 16000 * sec }, (_, i) => amp * Math.sin(i / 3));
const withTalk = () => { const x = new Float32Array(16000 * 6); x.set(tone(2, 0.3), 16000 * 2); return x; };
group("Kayıt temizliği")([
  ["baştaki ve sondaki sessizlik kırpılır", { desc: "~2,8 sn kalır", fn: () => trimQuiet(withTalk()).length / 16000, ok: (r) => r > 2.7 && r < 2.9 }],
  ["konuşma yoksa kayıt aynen kalır", { desc: "6 sn", fn: () => trimQuiet(new Float32Array(16000 * 6)).length / 16000, ok: (r) => r === 6 }],
  ["kısık kayıt yükseltilir (en çok 6 kat)", { desc: "tepe ~0,6", fn: () => Math.max(...louder(tone(1, 0.1))), ok: (r) => r > 0.55 && r < 0.65 }],
  ["yüksek kayda dokunulmaz", { desc: "tepe ~0,8", fn: () => Math.max(...louder(tone(1, 0.8))), ok: (r) => r > 0.79 && r < 0.81 }],
]);

// Dinlerken ses dalgası: kayıt yolunun analizcisi paylaşılır (ikinci mikrofon yok), başka dinleme ölçeri ezmez
const meter = await import("@/lib/speech/meter");
const fakeAn = (amp) => ({ fftSize: 64, getByteTimeDomainData: (b) => b.forEach((_, i) => (b[i] = 128 + Math.round(amp * 127 * (i % 2 ? 1 : -1)))) });
group("Dinleme dalgası")([
  ["analizci yoksa yumuşatılmış seviye", { desc: "0,3", fn: () => { meter.setMeter(null); meter.setMeterLevel(0.3); return meter.readMeter(); }, ok: (r) => r === 0.3 }],
  ["analizciden anlık seviye", { desc: "~0,4", fn: () => { meter.setMeter(fakeAn(0.1)); return meter.readMeter(); }, ok: (r) => r > 0.38 && r < 0.42 }],
  ["yüksek ses 1'de kalır", { desc: "1", fn: () => { meter.setMeter(fakeAn(0.9)); return meter.readMeter(); }, ok: (r) => r === 1 }],
  ["başka dinlemenin kapanışı ölçeri kapatmaz", { desc: "açık kalır", fn: () => { const a = fakeAn(0.1); meter.setMeter(a); meter.setMeter(null, fakeAn(0.5)); return meter.readMeter(); }, ok: (r) => r > 0.38 }],
  ["kendi kapanışı ölçeri kapatır", { desc: "0", fn: () => { const a = fakeAn(0.1); meter.setMeter(a); meter.setMeter(null, a); return meter.readMeter(); }, ok: (r) => r === 0 }],
]);

// Dalga ortada sabit: çubuk sayısı ve yeri değişmez, yalnız boyları sesle değişir
const { waveBars, WAVE_MIN } = await import("@/lib/speech/waveBars");
const wb = (lv, t = 0.4, n = 5) => waveBars(lv, t, n);
group("Dinleme dalgası (ortada sabit)")([
  ["sessizlikte hepsi en kısada", { desc: `hepsi ${WAVE_MIN}`, fn: () => wb(0), ok: (r) => r.length === 5 && r.every((x) => x === WAVE_MIN) }],
  ["ses yükselince çubuklar uzar", { desc: "yüksek > kısık", fn: () => [wb(0.2), wb(0.9)], ok: ([a, b]) => b.every((x, i) => x > a[i]) }],
  ["ortadaki çubuk kenardakinden uzun", { desc: "orta > kenar", fn: () => { const t = [0, 0.3, 0.7, 1.1, 1.6]; return t.map((x) => { const r = wb(1, x); return r[2] - Math.max(r[0], r[4]); }); }, ok: (r) => r.filter((d) => d > 0).length >= 4 }],
  ["çubuk sayısı zamanla değişmez (kayma yok)", { desc: "her an 5", fn: () => [0, 1, 2, 3].map((t) => wb(0.5, t).length), ok: (r) => r.every((n) => n === 5) }],
  ["boy 1'i geçmez", { desc: "≤ 1", fn: () => [0, 0.5, 1, 2].flatMap((t) => wb(5, t)), ok: (r) => r.every((x) => x <= 1 && x >= WAVE_MIN) }],
]);

// Gemini 3.5 Transcribe: istek gövdesi (SMART kip, Türkçe, kelime listesi), yanıtın tek satır okunması, süre ve Kullanım satırı
const GS = await import("@/lib/speech/geminiStt");
const { sttUsage } = await import("@/lib/aiUsage");
const wavOf = (sec) => { const b = new Uint8Array(44 + 32000 * sec); b.set([82, 73, 70, 70]); b[28] = 0x00; b[29] = 0x7d; return b; }; // 32000 bayt/sn
group("Gemini ses tanıma")([
  ["istek SMART kip ve Türkçe", { desc: "mode SMART, tr-TR", fn: () => GS.sttBody("QUJD", "audio/wav", ["Optimist"]).generationConfig.audioTranscriptionConfig, ok: (c) => c.mode === "SMART" && c.languageCodes[0] === "tr-TR" && c.customVocabulary[0] === "Optimist" }],
  ["ses gövdede", { desc: "inlineData", fn: () => GS.sttBody("QUJD", "audio/wav").contents[0].parts[0].inlineData, ok: (d) => d.mimeType === "audio/wav" && d.data === "QUJD" }],
  ["kelime listesi: adlar önce, kısa kelime yok, en çok 100", { desc: "Ali Kaya başta", fn: () => GS.sttVocab("yelken, aç, Optimist, git.", ["Ali Kaya"], ["Foça Kupası"]), ok: (v) => v[0] === "Ali Kaya" && v.includes("Foça Kupası") && v.includes("Optimist") && !v.includes("aç") && v.length <= 100 }],
  ["uzun liste 100'de kesilir", { desc: "100", fn: () => GS.sttVocab("", Array.from({ length: 150 }, (_, i) => `Ad ${i}`)).length, ok: (n) => n === 100 }],
  ["madde madde yanıt tek satır olur", { desc: "“Listeye ekle: süt ekmek”", fn: () => GS.sttText({ candidates: [{ content: { parts: [{ text: "Listeye ekle:\n- süt\n- ekmek\n" }] } }] }), ok: (t) => t === "Listeye ekle: süt ekmek" }],
  ["boş yanıt boş metin", { desc: "boş", fn: () => GS.sttText({}), ok: (t) => t === "" }],
  ["WAV süresi başlıktan", { desc: "3 sn", fn: () => GS.audioSecs(wavOf(3), "audio/wav"), ok: (n) => n === 3 }],
  ["Kullanım: saniye dakikaya, ücret", { desc: "2 dk ≈ $0,01", fn: () => sttUsage({ "stt-sec": 120 }), ok: (u) => u.min === 2 && Math.abs(u.cost - 0.01) < 1e-9 }],
]);

// iPhone ses oturumu: mikrofon kapanınca bırakılır (arka plandaki YouTube/müzik devam etsin)
const as = await import("@/lib/speech/audioSession");
const fakeSession = () => { const s = { type: "auto", seen: [] }; return new Proxy(s, { set: (o, k, v) => { if (k === "type") o.seen.push(v); o[k] = v; return true; } }); };
// Durumlar sırayla denenir (aynı sayaç ve navigator paylaşılır)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const onSession = async (sess, run) => {
  const had = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { value: { audioSession: sess }, configurable: true });
  try { return await run(); } finally {
    if (had) Object.defineProperty(globalThis, "navigator", had); else delete globalThis.navigator;
  }
};
const W = as.CLOSE_WAIT_MS, RL = as.RELEASE_MS;
const sessionRun = await (async () => {
  const out = {};
  // takılı "transient" mikrofon açılırken "auto"ya döner
  { const sess = fakeSession(); sess.type = "transient"; out.reset = await onSession(sess, async () => { as.micOpening(); const t = sess.type; as.micClosed(); await sleep(W + RL + 100); return t; }); }
  // açılırken kayıt kipi yazılmaz
  { const sess = fakeSession(); out.openSeen = await onSession(sess, async () => { as.micOpening(); const n = sess.seen.slice(); as.micClosed(); await sleep(W + RL + 100); return n; }); }
  // kapanınca kısa süre transient, sonra auto
  { const sess = fakeSession(); out.cycle = await onSession(sess, async () => { as.micOpening(); as.micClosed(); const early = sess.type; await sleep(W + 100); const mid = sess.type; await sleep(RL + 100); return { early, mid, end: sess.type }; }); }
  // iki mikrofondan biri kapanınca bırakılmaz
  { const sess = fakeSession(); out.two = await onSession(sess, async () => { as.micOpening(); as.micOpening(); as.micClosed(); await sleep(W + 100); const t = sess.seen.includes("transient"); as.micClosed(); await sleep(W + RL + 100); return t; }); }
  // bırakma sırasında mikrofon yeniden açılırsa hemen auto, transient'e dönülmez
  { const sess = fakeSession(); out.reopen = await onSession(sess, async () => { as.micOpening(); as.micClosed(); await sleep(W + 100); as.micOpening(); const t = sess.type; await sleep(RL + 100); const after = sess.type; as.micClosed(); await sleep(W + RL + 100); return { t, after }; }); }
  // kip yazılamazsa (hata) auto'da kalır
  { const sess = { get type() { return "auto"; }, set type(v) { if (v === "transient") throw new Error("x"); } }; out.err = await onSession(sess, async () => { as.micOpening(); as.micClosed(); await sleep(W + 100); return sess.type; }); }
  try { as.micOpening(); as.micClosed(); out.none = true; } catch { out.none = false; }
  await sleep(W + RL + 100);
  return out;
})();
group("Ses oturumu (arka plan sesi)")([
  ["takılı kalan oturum mikrofon açılırken sıfırlanır", { desc: "transient → auto", fn: () => sessionRun.reset, ok: (r) => r === "auto" }],
  ["mikrofon açılırken kayıt kipi yazılmaz", { desc: "değişiklik yok", fn: () => sessionRun.openSeen, ok: (r) => r.length === 0 }],
  ["mikrofon kapanınca kısa süre bırakılır, sonra auto", { desc: "auto → transient → auto", fn: () => sessionRun.cycle, ok: (r) => r.early === "auto" && r.mid === "transient" && r.end === "auto" }],
  ["iki mikrofondan biri kapanınca bırakılmaz", { desc: "transient yok", fn: () => sessionRun.two, ok: (r) => r === false }],
  ["bırakırken mikrofon açılırsa hemen auto", { desc: "auto, auto", fn: () => sessionRun.reopen, ok: (r) => r.t === "auto" && r.after === "auto" }],
  ["kip yazılamazsa auto'da kalır", { desc: "auto", fn: () => sessionRun.err, ok: (r) => r === "auto" }],
  ["destek yoksa hata vermez", { desc: "sorunsuz", fn: () => sessionRun.none, ok: (r) => r === true }],
]);
