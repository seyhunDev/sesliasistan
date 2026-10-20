// Sesli yanıt açıkken (Ayarlar › Sesli yanıt) asistanın konuşması: hazır kısa cümleler + gelen cevap.
// Seyhun (2026-10-20): "İstekte bulundum, hemen ilgileniyorum desin; sonra ne yapıldıysa onu söylesin; sıralı işlerde
// önce şunu, sonra şunu yapıyorum, tamam hepsi yapıldı; onay bekleyen varsa onay beklediğini söylesin. Sesli yanıt
// kapalıysa yazıyla gösterilir." Saf işlevler, test edilir.

// İstek alınınca (yapay zeka beklenirken) hemen söylenen cümle: ön cevabın cümlesi ("Tamam, planı hazırlıyorum.")
export const startLine = (pc) => String(pc?.line || "").trim() || "Hemen ilgileniyorum.";

// Cevabın okunan hali: onay bekleyen işte (soru sorulmadıysa) "Onayını bekliyorum.", sıralı işlerin sonunda
// (hepsi yapıldıysa) "Tamam, hepsi yapıldı."
export function spokenReply(message, { confirm = false, planEnd = false, planOk = true } = {}) {
  const out = String(message || "").trim();
  const add = [confirm && !/\?\s*$/.test(out) && "Onayını bekliyorum.", planEnd && planOk && "Tamam, hepsi yapıldı."].filter(Boolean);
  return [out, ...add].filter(Boolean).join(" ");
}
