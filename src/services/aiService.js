import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";

// Sunucu route'unu çağırır. Anahtar hiçbir zaman tarayıcıda bulunmaz.
// name: kullanıcının adı. signal: isteği iptal etmek için.
// context: { mode: "create" | "edit", drafts: [...], last: "asistanın önceki yanıtı" }, konuşmanın devamı için
export async function interpretText(text, name = "", signal, context) {
  const res = await authFetch("/api/interpret", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, today: todayStr(), name, context }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "AI yanıt vermedi");
  return data; // { items, message, source: "ai" | "rules", provider, warning? }
}
