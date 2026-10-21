// Konuşma raporlarını kaydetme (Seyhun, 2026-10-21: "asistan her başlatıldığında raporu tutulmalı, tarih tarih"): asistan
// kapanınca o konuşmanın raporu (lib/assistReport.js) sunucuya gider (/api/assist-log). Gönderilemezse (internet yok)
// bu cihazda bekler, sonraki kapanışta yeniden denenir (en çok 20). Liste: Ayarlar › Testler › Asistan raporu.
import { authFetch } from "@/lib/authFetch";
import { reportDevice, reportText, reportVoiceOn } from "@/lib/assistReport";
import { timingErrors, timingFlush, timingList } from "@/lib/assistTiming";
import { buildLine } from "@/lib/buildInfo";
import { quickOn } from "@/lib/quickMode";

const WAIT_KEY = "sa-asst-log-wait";
const readWait = () => {
  try {
    const v = JSON.parse(localStorage.getItem(WAIT_KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
const writeWait = (v) => {
  try {
    if (v.length) localStorage.setItem(WAIT_KEY, JSON.stringify(v.slice(-20)));
    else localStorage.removeItem(WAIT_KEY);
  } catch {}
};

// since: asistanın açıldığı an. Bu konuşmada söylenen yoksa kaydedilmez
export function sessionLog(since) {
  timingFlush();
  const list = timingList().filter((r) => r.at >= since);
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a.at - b.at);
  const text = reportText({ since, list, errors: timingErrors(), session: true, meta: { version: buildLine(), device: reportDevice(), voice: reportVoiceOn(), quick: quickOn() } });
  return { at: since, n: list.length, first: String(sorted[0]?.text || "").slice(0, 120), text };
}

export async function saveSessionLog(since) {
  let item = null;
  try {
    item = sessionLog(since);
  } catch {}
  const queue = [...readWait(), ...(item ? [item] : [])];
  if (!queue.length) return;
  const left = [];
  for (const x of queue) {
    try {
      const res = await authFetch("/api/assist-log", { method: "POST", body: JSON.stringify(x), headers: { "content-type": "application/json" }, timeout: 10000 });
      if (!res.ok && res.status >= 500) left.push(x); // geçersizse (400) bekletilmez
    } catch {
      left.push(x);
    }
  }
  writeWait(left);
}
