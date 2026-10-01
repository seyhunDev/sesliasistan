import { authFetch } from "@/lib/authFetch";
import { saveQuota } from "@/lib/quota";
import { todayStr } from "@/lib/utils/format";

// Asistan ucunu çağırır. digest: cihazda üretilen veri özeti, history: son konuşma turları, people: çalışan adları
// onText verilirse akış istenir: okunacak metin geldikçe onText(o ana kadarki metin) çağrılır (sunucu desteklemezse
// tek parça yanıt gelir, onText hiç çağrılmaz; sonuç aynı).
export async function askAssistant({ text, name = "", digest = "", history = [], people = [], contacts = [], precue = "", onText }, signal) {
  const res = await authFetch("/api/assistant", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, name, digest, history, today: todayStr(), ...(people.length ? { people } : {}), ...(contacts.length ? { contacts } : {}), ...(precue ? { precue } : {}), ...(onText ? { stream: true } : {}) }),
    signal,
  });
  if (res.ok && (res.headers.get("content-type") || "").includes("ndjson") && res.body) return readStream(res, onText);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn(`[asistan] ${res.status} ${data.reason || ""}: ${data.error || "yanıt yok"}${data.detail ? ` · ${data.detail}` : ""}`);
    const err = new Error(data.error || "Asistan yanıt vermedi");
    err.reason = data.reason || "";
    throw err;
  }
  return data;
}

// NDJSON akışı: {t:"m", m} parçaları, {t:"done", ...yanıt} ya da {t:"err", error, reason}
async function readStream(res, onText) {
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      let o;
      try {
        o = JSON.parse(line);
      } catch {
        continue;
      }
      if (o.t === "m") onText?.(o.m);
      else if (o.t === "done") {
        const { t, quota, ...r } = o;
        if (quota) saveQuota(quota);
        return r;
      } else if (o.t === "err") {
        console.warn(`[asistan] akış ${o.reason || ""}: ${o.error}`);
        const err = new Error(o.error || "Asistan yanıt vermedi");
        err.reason = o.reason || "";
        throw err;
      }
    }
    if (done) break;
  }
  throw new Error("Asistan yanıtı yarıda kesildi");
}
