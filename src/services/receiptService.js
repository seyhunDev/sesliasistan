import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";

// Fiş fotoğrafını yapay zekaya okutur. image: base64 (önek olmadan)
export async function readReceipt({ image, mimeType }, signal) {
  const res = await authFetch("/api/receipt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image, mimeType, today: todayStr() }),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.detail) console.warn("[fiş]", data.detail);
    throw new Error(data.error || "Fiş okunamadı");
  }
  return data; // { draft, provider, ms }
}
