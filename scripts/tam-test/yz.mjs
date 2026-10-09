// Katman 4: gerçek yapay zeka (Gemini). Anahtar .env.local'dan okunur; yoksa atlanır. Her cümle bir istektir (kotadan düşer).
// a) Görev listesi: yerelde çalışan uygulamanın /api/tasks ucuna (telefonun yaptığı isteğin aynısı) çok işli, bozuk cümleler
//    gönderilir; dönen listede her iş var mı ve her işin cümlesi uygulamada doğru akışa gidiyor mu bakılır.
// b) Ana asistan: scripts/asistan-test/yapay-zeka.mjs (plan, görev, not, mesaj, soru cümleleri; doğrudan Gemini'ye).
import { TEST_TOKEN } from "./sunucu.mjs";
import { decide, kindOfRoute, tr } from "./akis.mjs";

// [cümle, beklenen iş türleri]
const TASKS = [
  ["Atatürk Kupası yarışı oluru afişini hazirla ve bugün İlay antrenmana katıldı. onu yoklamaya ekle", ["race", "post", "attendance"]],
  ["ataturk kupasi yarisi oluru afisini hazirla ve bugun ilay antremana katildi onu yoklamaya ekle", ["race", "post", "attendance"]],
  ["Atatürk Kupası adında bir yarış oluştur. Bugün antrenmana Mustafa geldi. Enes ödemesini yaptı. Aidat ödemesini yaptı. Nakit verdi. Ve Atatürk Kupası için Instagram görseli hazırla.", ["race", "attendance", "income", "post"]],
  ["enes aidatini nakit verdi mehmet de geldi yoklamaya ekle", ["income", "attendance"]],
  ["foca yarisina mehmeti ekle sonra aliye yaz otel ayarlandi", ["race", "other"]],
  ["bugün antremana ali ve ayşe geldi ali kayanın ekim aidatı nakit 1500 alındı", ["attendance", "income"]],
  ["dün 14 knot poyrazda start çalıştık antrenman günlüğüne yaz ali ve ayşe geldi yoklamaya ekle", ["log", "attendance"]],
  ["yeni sporcu ekle can tekin 2014 doğumlu ve bugün antremana geldi yoklamaya yaz", ["athlete", "attendance"]],
  ["şey ııı turkcell faturası ödendi yarın 10da antrenman ekle", ["invoice", "other"]],
  ["listeye çay şeker ekle envanterden 1 şamandıra çıkar", ["shopping", "inventory"]],
  ["yoklama al ali ve ayşe geldi", ["attendance"]], // tek iş: listede tek iş olmalı
];
const norm = (k) => (k === "dues" ? "athlete" : k);
const set = (a) => [...new Set(a.map(norm))].sort().join(",");

export async function runTasks(server, log = () => {}) {
  const rows = [];
  for (const [s, want] of TASKS) {
    const t0 = Date.now();
    let row;
    try {
      const r = await fetch(`${server.url}/api/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${TEST_TOKEN}` },
        body: JSON.stringify({ text: s, today: new Date().toISOString().slice(0, 10) }),
        signal: AbortSignal.timeout(30000),
      });
      const d = await r.json().catch(() => ({}));
      const ms = Date.now() - t0;
      if (r.status === 503) return [{ katman: "yapay zeka", grup: "Görev listesi (gerçek yapay zeka)", say: "anahtar", expect: "", ok: null, got: "ATLANDI: .env.local'da GEMINI_API_KEY ve GEMINI_MODEL yok" }];
      if (!r.ok) throw new Error(`${r.status} ${d.error || ""}`);
      const tasks = d.tasks || [];
      // Her işin cümlesi uygulamada tek iş olarak hangi akışa gider (yapay zekanın türüyle uyuşmalı)
      const steps = tasks.map((t) => ({ ...t, route: decide(t.say, { chained: true }).route }));
      const wrong = steps.filter((x) => norm(kindOfRoute(x.route)) !== norm(x.kind) && !(x.kind === "other" && x.route === "ai"));
      const kindsOk = set(tasks.map((t) => t.kind)) === set(want);
      const slow = ms > 15000;
      const ok = kindsOk && !wrong.length && !slow;
      const got = [
        tasks.map((t) => `${t.kind}: “${t.say}”`).join(" | ") || "(liste boş)",
        wrong.length ? `YANLIŞ AKIŞ: ${wrong.map((x) => `“${x.say}” → ${tr(x.route)}`).join(", ")}` : "",
        `${(ms / 1000).toFixed(1)} sn${slow ? " (telefon 15 sn'de vazgeçer)" : ""}`,
      ].filter(Boolean).join(" · ");
      row = { katman: "yapay zeka", grup: "Görev listesi (gerçek yapay zeka)", say: s, expect: want.map(tr).join(" + "), ok, got };
    } catch (e) {
      row = { katman: "yapay zeka", grup: "Görev listesi (gerçek yapay zeka)", say: s, expect: want.map(tr).join(" + "), ok: false, got: `HATA: ${e.message} · ${((Date.now() - t0) / 1000).toFixed(1)} sn` };
    }
    rows.push(row);
    log(`  ${row.ok ? "✓" : "✗"} ${s.slice(0, 70)}`);
    await new Promise((r) => setTimeout(r, 1500)); // dakikalık kota dolmasın
  }
  return rows;
}

export async function runAssistant(log = () => {}) {
  const { default: run } = await import("../asistan-test/yapay-zeka.mjs");
  const out = await run((s) => log(`  ${s}`));
  return out.map((r) => ({ katman: "yapay zeka", grup: `Ana asistan: ${r.group}`, say: r.say, expect: r.expect, ok: r.ok, got: `${r.got} · ${(r.ms / 1000).toFixed(1)} sn` }));
}
