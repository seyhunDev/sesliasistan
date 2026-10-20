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

// Kayıt sonrası doğal cümle (çalışma haritası 3. iş; Seyhun 2026-10-20: "saatsiz oluşturuldu, saat eklemeni istersen
// hemen ekleyelim"). Aynı açılış her seferinde tekrarlanmasın diye sırayla değişir. Saatsiz tek plan için saat teklif
// edilir; cevap ("17:00", "akşam beşte") planın saatine yazılır (beyin/yonlendirme.js planTime).
const OPENERS = ["Ekledim", "Tamam, ekledim", "Kaydettim"];
let turn = 0;
export const untimedPlan = (list) => list.length === 1 && list[0].type === "plan" && !list[0].time && !list[0].endDate && list[0].repeat !== "week";
export function savedLine(what, who = "", list = [], n = turn++) {
  const open = OPENERS[n % OPENERS.length];
  if (!untimedPlan(list)) return { text: `${open}: ${what}${who}.`, offer: "" };
  const w = String(what).replace(/, tüm gün(?=,|$)/, "");
  return { text: `${open}: ${w}, saatsiz${who}. İstersen saatini söyle, hemen ekleyeyim.`, offer: "time" };
}
