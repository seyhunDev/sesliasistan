// "Örnekleri dene" (Ayarlar › Asistan süre kaydı): iş listesindeki (assistTasks.js) yapay zeka işlerinin örnek cümleleri
// tek tek ana asistana gönderilir. Kayıt yapılmaz, mesaj gitmez: yalnız cevabın süresi, modeli ve doğru türü bulup bulmadığı
// ölçülür. Her cümle kotadan bir istek düşer.
import { TASKS } from "./assistTasks";

// İşin beklenen türü (yapay zekanın intent alanı)
const WANT = {
  plan: "create", repeat: "create", task: "create", note: "create", record: "create",
  complete: "action", reopen: "action", noteDone: "action", planDone: "action", update: "action", delete: "action", cancel: "action",
  send: "message", group: "message", whatsapp: "message",
  query: "query", weather: "query",
};

// Denenecek örnekler: [{ id, name, say, want }] (çoklu iş ayrı uçta, burada yok)
export function probeSamples(tasks = TASKS) {
  return tasks
    .filter((t) => t.by === "yz" && WANT[t.id])
    .map((t) => ({ id: t.id, name: t.name, say: String(t.say).split(";")[0].trim(), want: WANT[t.id] }));
}

// Cevabın türü beklenenle uyuşuyor mu. Silme/iptal gibi işlerde kayıt bulunamazsa yapay zeka soru sorabilir (query/chat):
// veri gönderilmediği için bu da kabul edilir, "kayıt yok" diye işaretlenir.
export function probeCheck(sample, r) {
  const got = r?.intent || "";
  if (got === sample.want) return { ok: true, got };
  if (sample.want === "action" && ["query", "chat"].includes(got)) return { ok: true, got, note: "kayıt yok, sordu" };
  return { ok: false, got };
}

// Kopyalanacak düz metin
export function probeText(rows) {
  const ok = rows.filter((x) => x.ok).length;
  const ms = rows.filter((x) => x.ms > 0).map((x) => x.ms);
  const avg = ms.length ? Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) : 0;
  const head = `Örnek deneme · ${new Date().toLocaleString("tr-TR")} · ${ok}/${rows.length} doğru · ortalama ${(avg / 1000).toFixed(1)} sn`;
  return [head, ...rows.map((x) => `${x.ok ? "✓" : "✗"} ${x.name}: “${x.say}” → ${x.err ? `HATA (${x.err})` : x.got || "?"}${x.note ? ` (${x.note})` : ""} · ${(x.ms / 1000).toFixed(1)} sn${x.first ? ` (ilk parça ${(x.first / 1000).toFixed(1)} sn)` : ""}${x.model ? ` · ${x.model}` : ""}`)].join("\n");
}
