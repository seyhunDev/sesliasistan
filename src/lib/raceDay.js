// Yarış günü (Seyhun 2026-10-28: "yarış başladığında rüzgâr önemli; neticeler girilmeye başladıysa neticeler; iş 6'da bitince
// sonuçlar, sonra ertesi gün önemli"): yarış sayfasının üstü günün evresine göre dizilir. Saf fonksiyonlar (test:yaris › Yarış günü).
//   race    A · yarışlar sürüyor: şimdiki rüzgâr üstte
//   results B · bugünün sonucu geldi: bizimkilerin sırası üstte
//   done    C · gün bitti (son yarış bitip 90 dk geçti ya da 18:00): sonuç kısa, sonra yarın (ilk start, rüzgâr) ya da dönüş
// Yarış günü değilse "".

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const END_HOUR = 18;
const QUIET_MS = 90 * 60e3;

export const nextDay = (d) => {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + 1);
  return x.toLocaleDateString("sv-SE");
};

// starts: raceLive starts (cleanStarts); now: Date
export function racePhase({ r, today, now, starts = [] }) {
  const a = r?.startDate;
  const b = r?.endDate || a;
  if (!DAY.test(a || "") || today < a || today > b) return "";
  const mine = (starts || []).filter((x) => x.day === today && !x.void);
  const last = mine.at(-1);
  const quiet = !!last && mine.every((x) => x.fin) && now - Date.parse(last.fin) >= QUIET_MS;
  if (now.getHours() >= END_HOUR || quiet) return "done";
  if (r.results?.day === today && Object.keys(r.results.rows || {}).length) return "results";
  return "race";
}

// Talimattaki programdan bir günün satırları ve ilk start ("İlk start", yoksa adında start geçen, yoksa saatli ilk satır)
export function dayPlan(r, day) {
  const list = (r?.notice?.schedule || []).filter((s) => s?.date === day);
  const timed = list.filter((s) => /^\d{2}:\d{2}$/.test(s.time || "")).sort((x, y) => x.time.localeCompare(y.time));
  const start = timed.find((s) => /start/i.test(s.title)) || null;
  return { list, start, first: timed[0] || null };
}

// Sonuç her yazılışta günü alır; gün değiştiyse önceki günün sıraları prev'e geçer (dünden fark: ↑2)
export function stampResults(old, next, today) {
  if (!next) return next;
  const was = old?.rows || {};
  const prev = old?.day && old.day !== today ? Object.fromEntries(Object.entries(was).filter(([, x]) => x?.place).map(([id, x]) => [id, x.place])) : old?.prev || {};
  return { ...next, day: today, prev };
}

// Sıradaki değişim: + yükseldi, − düştü, 0 aynı, null bilinmiyor
export function placeMove(res, id) {
  const now = res?.rows?.[id]?.place;
  const was = res?.prev?.[id];
  return now && was ? was - now : null;
}

// Bizimkiler sırayla (sıralı olanlar önce)
export function ourPlaces(res, athletes) {
  const rows = res?.rows || {};
  return athletes
    .map((a) => ({ id: a.id, name: a.studentName, place: rows[a.id]?.place || 0, row: rows[a.id] || null, move: placeMove(res, a.id) }))
    .filter((x) => x.place)
    .sort((x, y) => x.place - y.place);
}
