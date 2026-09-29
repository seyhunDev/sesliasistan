import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";

// Sunucu route'unu çağırır. Anahtar hiçbir zaman tarayıcıda bulunmaz.
// name: kullanıcının adı. signal: isteği iptal etmek için.
// context: { mode: "create" | "edit", drafts: [...], last: "asistanın önceki yanıtı" }, konuşmanın devamı için
// people: çalışan adları (yalnızca ana hesapta); sorumlu atama ve adların doğru yazımı için
// prefer: kullanıcının bulunduğu sayfa ("plan" | "task" | "note"); tür belirsizse buna yakın durulur
export async function interpretText(text, name = "", signal, context, people = [], prefer) {
  const res = await authFetch("/api/interpret", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, today: todayStr(), name, context, ...(people.length ? { people } : {}), ...(prefer ? { prefer } : {}) }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "AI yanıt vermedi");
  return data; // { items, message, source: "ai" | "rules", provider, warning? }; items[].assignTo: sorumlu adları
}
