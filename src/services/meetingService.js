import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";

// Tek bir ses parçasını yazıya çevirir (WAV)
export async function transcribeChunk(wav) {
  const fd = new FormData();
  fd.append("audio", wav, "parca.wav");
  const res = await authFetch("/api/transcribe", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ses çevrilemedi");
  return String(data.text || "").trim();
}

// Toplantı metninden başlıklı özet, kararlar, sorumlulu işler, planlar ve mesajlar.
// people: çalışan adları (sorumlu), contacts: mesaj gönderilebilecek kişiler
export async function summarizeMeeting(text, { people = [], contacts = [] } = {}) {
  const res = await authFetch("/api/meeting", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, today: todayStr(), people, contacts }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Yapay zeka yanıt vermedi");
  return data; // { title, sections, decisions, items, messages, message } (cleanMeeting)
}
