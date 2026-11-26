// Hareket animasyonu için yapay zeka talimatı (Seyhun 2026-11-26): Hareketler'de "Yapay zekayla oluştur" (Gemini) ve
// "Kopyala / Paylaş" (dışarıdaki bir yapay zekaya vermek için) aynı metni kullanır. Video araçları İngilizceyi daha iyi anlar.
const S = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function animPrompt({ name, how } = {}) {
  const n = S(name, 80);
  const h = S(how, 500);
  return [
    `Animate the attached photo into a short looping video of the exercise "${n}".`,
    "If the photo shows two frames side by side, they are the start and end positions of the same person: make ONE continuous shot of that one person, not a split screen.",
    "Keep the same person, face, hair, outfit, room, lighting and camera angle. Do not change anything except the movement.",
    h ? `How it is done: ${h}` : "",
    "Show correct technique at a normal, steady speed, 2-3 repetitions. The whole body stays in the frame. Static camera, no zoom.",
    "No text, no music, no logos. 4-6 seconds, seamless loop.",
  ]
    .filter(Boolean)
    .join("\n");
}

// Kopyalanan metin: üstte Türkçe ad ve açıklama (kendisi okusun), altta yapay zekaya verilecek talimat
export const animShareText = (e) => [S(e?.name, 80), S(e?.how, 500), "", animPrompt(e)].filter((x, i) => x || i === 2).join("\n");
