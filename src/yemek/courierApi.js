// Kurye hesabının sunucu istekleri (/api/kurye). Hata olursa sunucunun Türkçe iletisiyle Error atar.
import { authFetch } from "@/lib/authFetch";

export async function kuryeApi(action, data = {}) {
  const res = await authFetch("/api/kurye", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...data }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Olmadı, yeniden dene");
  return j;
}
