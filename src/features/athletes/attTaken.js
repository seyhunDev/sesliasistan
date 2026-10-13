"use client";

// Bugünün yoklaması alındı: sunucu ana hesabın kaydına yazar (users/{ana hesap}.attLast). Yoklama hatırlatması buna bakar
// (lib/attRemind.js). Çalışan da yoklama alabildiği için istemci yazmaz, sunucu yazar. Günde bir kez gönderilir.
import { authFetch } from "@/lib/authFetch";
import { todayStr } from "@/lib/utils/format";
export { attTakenIn } from "@/lib/attRemind";

const KEY = "sa-att-taken";

export async function markAttTaken(date = todayStr()) {
  if (date !== todayStr()) return;
  try {
    if (localStorage.getItem(KEY) === date) return;
  } catch {}
  try {
    const res = await authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "attTaken", date }) });
    if (res.ok) localStorage.setItem(KEY, date);
  } catch {}
}
