import { authFetch } from "@/lib/authFetch";

// Ders programını metinden ya da fotoğraftan çıkarır (/api/schedule, Gemini). Kaydetmez: { lessons, message } döner.
// current: kişinin mevcut programı (değişiklik isteğinde yapay zeka tam listeyi döndürür).
export async function askSchedule(payload) {
  const res = await authFetch("/api/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ders programı çıkarılamadı");
  return data;
}

// Ana asistan sonucu Ders programı sayfasındaki önizlemeye verir (sayfa açıksa önizleme açılır; kaydetmeyi kullanıcı seçer:
// ekle ya da programı değiştir). Sayfa kapalıysa sonuç oturumda bekler, sayfa açılınca gösterilir.
export const SCHEDULE_KEY = "sa-schedule-preview";
export function showSchedule(result) {
  try {
    sessionStorage.setItem(SCHEDULE_KEY, JSON.stringify(result));
  } catch {}
  window.dispatchEvent(new CustomEvent(SCHEDULE_KEY, { detail: result }));
}
export function takeSchedule() {
  try {
    const raw = sessionStorage.getItem(SCHEDULE_KEY);
    sessionStorage.removeItem(SCHEDULE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
