// Dinleme dalgasının çubuk boyları (ListenWave): çubuklar ortada sabit durur, yalnız sese göre yükselip alçalır.
// Ortadaki çubuk en uzun, kenarlara doğru kısalır (çan biçimi); her çubuk kendi hızında hafifçe dalgalanır ki
// aynı anda hepsi birden aynı boya gelmesin. level 0-1 (kazançlı ses seviyesi), t saniye; sessizlikte hepsi en kısada.
export const WAVE_MIN = 0.12;

export function waveBars(level, t, n = 7) {
  const lv = Math.max(0, Math.min(1, level || 0));
  const mid = (n - 1) / 2;
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = mid ? Math.abs(i - mid) / mid : 0; // 0 ortada, 1 kenarda
    const bell = 1 - 0.6 * d * d;
    const wob = 0.72 + 0.28 * Math.sin(t * (5.3 + i * 1.7) + i * 2.1); // 0,44-1
    out.push(WAVE_MIN + (1 - WAVE_MIN) * lv * bell * wob);
  }
  return out;
}
