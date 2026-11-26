// Toplu antrenman / veli takvimi penceresini başka yerden (sesli asistan) açmak için küçük köprü.
// Takvim sayfası açıksa hemen açılır; değilse istek bekler, sayfa açılınca (CalendarView) alınır.
let waiting = null; // { kind: "bulk" | "parents", prefill }
const subs = new Set();
export function openCalendarSheet(kind, prefill = null) {
  waiting = { kind, prefill };
  subs.forEach((f) => f());
}
export function takeCalendarSheet() {
  const w = waiting;
  waiting = null;
  return w;
}
export function onCalendarSheet(f) {
  subs.add(f);
  return () => subs.delete(f);
}
