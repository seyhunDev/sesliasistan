// Gemini Live modelleri (/api/live-token): Google'ın model listesinden Live (bidiGenerateContent) destekleyenler.
// Yazı cevaplı "live" modelleri önce, sesli (native-audio) sonra, flash önce; çeviri/ses/resim modelleri en sonda.
export function liveOrder(models) {
  const live = (models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes("bidiGenerateContent"))
    .map((m) => String(m.name || "").replace(/^models\//, ""))
    .filter(Boolean);
  const score = (n) => (/native-audio/.test(n) ? 2 : 0) + (/flash/.test(n) ? 0 : 1) + (/translate|tts|image/.test(n) ? 4 : 0);
  return [...new Set(live)].sort((a, b) => score(a) - score(b));
}
