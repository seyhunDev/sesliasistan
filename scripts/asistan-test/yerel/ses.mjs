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

