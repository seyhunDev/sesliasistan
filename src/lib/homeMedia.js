// Ana sayfa › Medya kartı (Seyhun 2026-10-28 "A · Büyük kartlar"): en son kayıt eklenen antrenman ya da yarış, son 4 karesi.
// Medya okuması (her antrenman/yarış bir belge) 30 dakikada bir yapılır; arada bu cihazdaki kopya gösterilir.
export const MEDIA_KEY = "velora.homeMedia";
export const MEDIA_KEEP = 30 * 60 * 1000;

// librarySections çıktısından en yeni bölüm → { title, sub, href, items: son 4 (yeni önce) } ya da null
export function latestMedia(secs) {
  const all = [...(secs?.ant || []), ...(secs?.race || [])].filter((s) => s.items?.length);
  if (!all.length) return null;
  const s = all.reduce((a, b) => (b.last > a.last ? b : a));
  const items = s.items
    .slice(-4)
    .reverse()
    .map((m) => ({ id: m.id, kind: m.kind, url: m.url, ...(m.thumb ? { thumb: m.thumb } : {}), ...(m.dur ? { dur: m.dur } : {}) }));
  return { title: s.title, sub: s.sub, href: s.href, items };
}

const LS = () => (typeof localStorage === "undefined" ? null : localStorage);
export function readMedia(store = LS()) {
  try {
    const v = JSON.parse(store?.getItem(MEDIA_KEY) || "null");
    return v && typeof v.at === "number" ? v : null;
  } catch {
    return null;
  }
}
export function keepMedia(card, now = Date.now(), store = LS()) {
  try {
    store?.setItem(MEDIA_KEY, JSON.stringify({ at: now, card }));
  } catch {
    /* dolu ya da gizli pencere */
  }
}
export const mediaFresh = (v, now = Date.now()) => !!v && now - v.at < MEDIA_KEEP;
