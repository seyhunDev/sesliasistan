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

// Toplantı metninden özet + kararlar + taslak kayıtlar
export async function summarizeMeeting(text) {
  const res = await authFetch("/api/meeting", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, today: todayStr() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Yapay zeka yanıt vermedi");
  return data; // { title, summary, decisions, items, message }
}
