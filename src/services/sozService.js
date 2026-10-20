import { authFetch } from "@/lib/authFetch";

// Söz yapay zekası (/api/soz): işin sonucunu doğal cümleye çevirir. Hata ya da 5 sn'de cevap yoksa { error } döner,
// çağıran kendi cümlesini kullanır.
export async function askSoz({ said, result }) {
  try {
    const res = await authFetch("/api/soz", { method: "POST", timeout: 5000, headers: { "content-type": "application/json" }, body: JSON.stringify({ said, result }) });
    const d = await res.json().catch(() => ({}));
    return res.ok && d.text ? d : { error: d.reason || (res.status === 422 ? "unclear" : "other") };
  } catch (e) {
    return { error: e?.name === "TimeoutError" || e?.name === "AbortError" ? "timeout" : "network" };
  }
}
