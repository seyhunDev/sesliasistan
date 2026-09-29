import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";

// Asistan ucunu çağırır. digest: cihazda üretilen veri özeti, history: son konuşma turları, people: çalışan adları
export async function askAssistant({ text, name = "", digest = "", history = [], people = [] }, signal) {
  const res = await authFetch("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, name, digest, history, today: todayStr(), ...(people.length ? { people } : {}) }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Asistan yanıt vermedi");
  return data;
}
