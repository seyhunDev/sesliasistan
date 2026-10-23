// Deniz trafiği soruları: "yanaşan gemi var mı", "limanda kaç gemi var", "demirde kaç gemi var", "deniz trafiği nasıl",
// "Sahil Güvenlik nerede", "Sahil Güvenliğin numarası ne". Cevap sayfayla aynı veriden (/api/sea); kural ve metin lib/sea.js.
import { seaAnswer } from "@/lib/sea";
import { fetchSea } from "@/features/sea/useSea";

const L = { engine: "local" };

export async function runSea(ctx, sq, viaVoice) {
  const { reply, setPhase } = ctx;
  if (sq.q === "emergency") return reply(seaAnswer("emergency"), L, viaVoice);
  setPhase("thinking");
  let data = null;
  try {
    data = await fetchSea();
  } catch {}
  return reply(seaAnswer(sq.q, data), { ...L, ...(data?.ships ? {} : { fail: true }) }, viaVoice);
}
