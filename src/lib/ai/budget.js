// Süre sınırları (motor planı 2. adım, 20 Ekim 2026): Netlify sunucu işlevi ~10 sn'de kesilebilir. Asistan ve iş listesi
// uçları toplamda bu bütçeyi geçmez; ilk parça kısa sürede gelmezse kalan süreyle yedek modele geçilir. Telefon da
// sunucudan biraz uzun bekler ve bağlantı kopmasında bir kez sessizce yeniden dener. Saf işlevler, test edilir.
//   AI_BUDGET_MS (Netlify ortam değişkeni, isteğe bağlı): sınır daha uzunsa artırılabilir (en çok 25 sn).

export function budgetMs(env = process.env) {
  const n = Number(env?.AI_BUDGET_MS);
  return n >= 5000 ? Math.min(n, 25000) : 9500;
}

// Asistan akışı için süreler: toplam, ilk parça, yedek çağrı (kalan süre; çok az kaldıysa 0 = deneme)
export function streamPlan(total) {
  return { timeoutMs: total - 500, firstMs: Math.min(4000, Math.round(total * 0.4)) };
}
export function fallbackMs(total, spent) {
  const left = total - spent - 300;
  return left >= 2500 ? left : 0;
}

// Telefon: sunucu bütçesi + ağ payı
export const PHONE_WAIT_MS = 14000;
export const TASKS_WAIT_MS = 12000;

// Sessiz yeniden deneme: yalnız bağlantı kopması / sunucuya ulaşamama ve hızlı gelen hata (ilk 7 sn). Kota, anahtar,
// anlaşılamayan yanıt ve zaman aşımında yeniden denenmez (aynı sonuç, kota boşa gider).
export function retryable(err, ms) {
  if (ms > 7000) return false;
  const r = err?.reason || "";
  if (r === "quota" || r === "nokey" || r === "model" || r === "unclear" || r === "timeout") return false;
  if (r === "network" || r === "busy") return true;
  const m = String(err?.message || "");
  return /yarıda kesildi|Load failed|Failed to fetch|NetworkError|ağ|bağlan/i.test(m) || err?.name === "TypeError";
}
