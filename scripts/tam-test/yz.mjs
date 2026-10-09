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
  // İnsan davranışları: düzeltme, vazgeçme, soru içinde iş, uzun anlatım. Üçüncü öğe: dönen işlerin cümlesinde olması / olmaması gereken
  ["yoklamaya Ali'yi ekle pardon Ayşe'yi bir de listeye süt ekle", ["attendance", "shopping"], { has: /Ayşe/, not: /Ali/ }],
  ["Atatürk Kupası yarışı oluştur ve görselini hazırla yok görseli sonra yaparız", ["race"]],
  ["Turkcell faturası ödendi mi bilmiyorum ama yarın 10'da antrenman ekle", ["other"]],
  ["şimdi şöyle bugün hava çok güzeldi çocuklar erken geldi neyse uzatmayayım Mustafa ve Zeynep geldi yoklamaya ekle sonra da Foça yarışını aç bakayım", ["attendance", "race"]],
  ["Enes aidatını nakit verdi 1500 yok yok 1000 verdi Mehmet de geldi yoklamaya ekle", ["income", "attendance"], { has: /1000|1\.000|bin/, not: /1500|1\.500/ }],
  ["listeye süt ekle listeye süt ekle envanterden şamandıra çıkar", ["shopping", "inventory"], { once: "shopping" }],
];
// Küçük örnek (varsayılan): eski bozuk çok işli 2 + insan davranışı 2
const SAMPLE = [TASKS[0], TASKS[3], TASKS[11], TASKS[15]];
let USED = 0;
export const used = () => USED;
const norm = (k) => (k === "dues" ? "athlete" : k);
const set = (a) => [...new Set(a.map(norm))].sort().join(",");

export async function runTasks(server, log = () => {}, full = false) {
  const rows = [];
  let quota = false;
  for (const [s, want, must] of full ? TASKS : SAMPLE) {
    if (quota) {
      rows.push({ katman: "yapay zeka", grup: "Görev listesi (gerçek yapay zeka)", say: s, expect: want.map(tr).join(" + "), ok: null, got: "ATLANDI: yapay zeka kotası doldu" });
      continue;
    }
    USED++;
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
      if (r.status === 429) {
        quota = true;
        rows.push({ katman: "yapay zeka", grup: "Görev listesi (gerçek yapay zeka)", say: s, expect: want.map(tr).join(" + "), ok: null, got: "ATLANDI: yapay zeka kotası doldu (429)" });
        continue;
      }
      if (!r.ok) throw new Error(`${r.status} ${d.error || ""}`);
      const tasks = d.tasks || [];
      // Her işin cümlesi uygulamada tek iş olarak hangi akışa gider (yapay zekanın türüyle uyuşmalı)
      const steps = tasks.map((t) => ({ ...t, route: decide(t.say, { chained: true }).route }));
      const wrong = steps.filter((x) => norm(kindOfRoute(x.route)) !== norm(x.kind) && !(x.kind === "other" && x.route === "ai"));
      const kindsOk = set(tasks.map((t) => t.kind)) === set(want);
      const slow = ms > 15000;
      // Düzeltme / vazgeçme: işlerin cümlesinde düzeltilen bilgi olmalı, eskisi olmamalı; tekrar: aynı iş bir kez
      const said = tasks.map((t) => t.say).join(" | ");
      const miss = [];
      if (must?.has && !must.has.test(said)) miss.push(`düzeltilen bilgi yok (${must.has.source})`);
      if (must?.not && must.not.test(said)) miss.push(`vazgeçilen bilgi kaldı (${must.not.source})`);
      if (must?.once && tasks.filter((t) => t.kind === must.once).length > 1) miss.push(`${tr(must.once)} iki kez`);
      const ok = kindsOk && !wrong.length && !slow && !miss.length;
      const got = [
        tasks.map((t) => `${t.kind}: “${t.say}”`).join(" | ") || "(liste boş)",
        miss.length ? miss.join(", ") : "",
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

export async function runAssistant(log = () => {}, full = false) {
  const { default: run, CASES, HUMAN, SAMPLE: PICK } = await import("../asistan-test/yapay-zeka.mjs");
  const cases = full ? [...CASES, ...HUMAN] : PICK;
  // Ana asistan isteği ~9 bin token: dakikalık token sınırına takılmamak için istekler arası bekleme
  const out = await run((s) => log(`  ${s}`), cases, { pause: full ? 2500 : 1500 });
  USED += out.filter((r) => r.ms > 0).length;
  const human = new Set(HUMAN.map((c) => c[0]));
  return out.map((r) => ({ katman: "yapay zeka", grup: `Ana asistan: ${human.has(r.say) ? "insan davranışı" : r.group}`, say: r.say, expect: r.expect, ok: r.ok, got: `${r.got}${r.ms ? ` · ${(r.ms / 1000).toFixed(1)} sn` : ""}` }));
}
