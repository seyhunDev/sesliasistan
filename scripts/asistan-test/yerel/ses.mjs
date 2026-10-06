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
