// Testler sayfasının listesi (Seyhun, 2026-10-21: "her özelliğin kendi testleri olsun, seçilip toplu ya da hepsi yapılabilsin").
// Özellik başına üç tür satır:
//   run  telefonda kendiliğinden çalışan test (seçilebilir): run({ signal, uid }) → { lines: [{ ok, text, sub }], pass, total }
//   gh   GitHub'daki tam testin bölümleri (son.txt başlık adları, ghResult.js); telefondan başlatılmaz, sonucu görünür
//   href elle yapılan test sayfası
// Yeni test: ilgili özelliğe bir satır eklenir. Yeni özellik: FEATURES'a yeni bir öğe.
import { doc, getDocFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch, jsonOf } from "@/lib/authFetch";
import { askAssistant } from "@/services/assistantService";
import { probeCheck, probeSamples } from "@/lib/aiProbe";
import { testPush } from "@/lib/push";

const sec = (ms) => `${(ms / 1000).toFixed(1).replace(".", ",")} sn`;
const one = (ok, text, sub = "") => ({ lines: [{ ok, text, sub }], pass: ok ? 1 : 0, total: 1 });
// Kullanıcının durdurması + süre sınırı (sinyal verilince authFetch kendi 30 sn sınırını koymaz)
const lim = (signal, ms = 20000) => (AbortSignal.any && AbortSignal.timeout ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : signal);
const errText = (e) => e?.reason || e?.message || "hata";

async function tts(text, signal) {
  const r = await authFetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }), signal: lim(signal, 15000) });
  if (!r.ok) {
    const j = await jsonOf(r).catch(() => ({}));
    throw new Error([j.error || `sunucu ${r.status}`, j.detail].filter(Boolean).join(": "));
  }
  return r.blob();
}

// Asistan › Örnek cümleler: yapay zeka işlerinin örnekleri sırayla gönderilir (kayıt yapılmaz), türü doğru mu (lib/aiProbe.js)
async function probe({ signal }) {
  const rows = [];
  for (const x of probeSamples()) {
    if (signal.aborted) break;
    const t0 = Date.now();
    try {
      const r = await askAssistant({ text: x.say }, lim(signal, 30000));
      rows.push({ ...x, ...probeCheck(x, r), ms: Date.now() - t0 });
    } catch (e) {
      if (signal.aborted) break;
      rows.push({ ...x, ok: false, err: errText(e), ms: Date.now() - t0 });
    }
  }
  const good = rows.filter((x) => x.ok);
  const avg = good.length ? good.reduce((a, x) => a + x.ms, 0) / good.length : 0;
  return {
    lines: [
      ...rows.filter((x) => !x.ok).map((x) => ({ ok: false, text: `“${x.say}”`, sub: x.err ? `${x.err} · ${sec(x.ms)}` : `beklenen ${x.want} · olan ${x.got || "?"} · ${sec(x.ms)}` })),
      ...(good.length ? [{ ok: true, text: `${good.length} cümle doğru`, sub: `ort. ${sec(avg)}` }] : []),
    ],
    pass: good.length,
    total: rows.length,
  };
}

// Ses › Sesli okuma: sunucu sesi (/api/tts) gelir mi; gelirse çalınır
async function speak({ signal }) {
  const t0 = Date.now();
  try {
    const blob = await tts("Deneme, bir iki üç.", signal);
    const ms = Date.now() - t0;
    try {
      const a = new Audio(URL.createObjectURL(blob));
      a.play().catch(() => {});
    } catch {}
    return one(blob.size > 500, blob.size > 500 ? `Ses geldi · ${sec(ms)}` : "Ses boş geldi");
  } catch (e) {
    return one(false, "Ses gelmedi", errText(e));
  }
}

// Ses › Ses tanıma: sunucu sesiyle söylenen cümle yazıya çevrilir (/api/transcribe), aynı cümle mi
const SAY = "Yarın saat beşte toplantı var.";
async function hear({ signal }) {
  let blob;
  try {
    blob = await tts(SAY, signal);
  } catch (e) {
    return one(false, "Deneme sesi üretilemedi", errText(e));
  }
  const t0 = Date.now();
  try {
    const fd = new FormData();
    fd.append("audio", blob, blob.type.includes("wav") ? "deneme.wav" : "deneme.mp3");
    const r = await authFetch("/api/transcribe", { method: "POST", body: fd, signal: lim(signal) });
    const j = await jsonOf(r).catch(() => ({}));
    if (!r.ok) return one(false, "Yazıya çevrilemedi", j.error || `sunucu ${r.status}`);
    const got = String(j.text || "").trim();
    const low = got.toLocaleLowerCase("tr-TR");
    const ok = /toplant/.test(low) && /yarın/.test(low);
    return one(ok, got ? `Duyulan: “${got}”` : "Boş geldi", `${j.provider || ""}${j.provider ? " · " : ""}${sec(Date.now() - t0)}`);
  } catch (e) {
    return one(false, "Yazıya çevrilemedi", errText(e));
  }
}

// Bildirimler › Deneme bildirimi: bu cihaza hemen bir bildirim gönderilir (lib/push.js testPush)
async function push() {
  const t0 = Date.now();
  try {
    await testPush();
    return one(true, `Gönderildi · ${sec(Date.now() - t0)}`);
  } catch (e) {
    return one(false, "Gönderilemedi", errText(e));
  }
}

// Bildirimler › Zamanlayıcı: hatırlatmaları gönderen zamanlayıcı (5 dakikada bir) son 10 dakikada sorunsuz çalıştı mı
async function beat({ signal }) {
  try {
    const r = await authFetch("/api/push-tests", { signal: lim(signal) });
    const b = await jsonOf(r);
    if (!r.ok || b.error) return one(false, "Okunamadı", b.error || `sunucu ${r.status}`);
    if (!b.start) return one(false, "Hiç çalışmamış");
    const min = Math.round((Date.now() - Date.parse(b.start)) / 60000);
    const when = min < 1 ? "az önce" : `${min} dk önce`;
    if (min > 10) return one(false, `Son çalışma ${when}`, "10 dakikadan uzun süredir çalışmıyor");
    if (!b.end || b.end < b.start) return one(false, `Son çalışma ${when}`, "yarıda kaldı");
    return one(true, `Son çalışma ${when}`);
  } catch (e) {
    return one(false, "Okunamadı", errText(e));
  }
}

// Uygulama › Bağlantı: sunucu ve veritabanı cevap veriyor mu
async function link({ signal, uid }) {
  const lines = [];
  let t0 = Date.now();
  try {
    const r = await authFetch("/api/push-tests", { signal: lim(signal) });
    lines.push({ ok: r.ok, text: r.ok ? `Sunucu cevap verdi · ${sec(Date.now() - t0)}` : "Sunucu hata verdi", sub: r.ok ? "" : `${r.status}` });
  } catch (e) {
    lines.push({ ok: false, text: "Sunucuya ulaşılamadı", sub: errText(e) });
  }
  t0 = Date.now();
  try {
    await getDocFromServer(doc(db, "users", uid));
    lines.push({ ok: true, text: `Veritabanı okundu · ${sec(Date.now() - t0)}` });
  } catch (e) {
    lines.push({ ok: false, text: "Veritabanı okunamadı", sub: errText(e) });
  }
  return { lines, pass: lines.filter((l) => l.ok).length, total: lines.length };
}

export const FEATURES = [
  {
    id: "asistan",
    name: "Asistan",
    tests: [
      { id: "ornek", name: "Örnek cümleler", sub: () => `${probeSamples().length} cümle · yapay zeka`, ai: true, run: probe },
      { id: "anlama", name: "Anlama ve akış", gh: ["ANLAMA", "AKIŞ", "GERÇEK YAPAY ZEKA"] },
      { id: "ekran", name: "Asistan ekranı", gh: ["SESLİ ASİSTAN EKRANI"] },
    ],
  },
  {
    id: "ses",
    name: "Ses",
    tests: [
      { id: "okuma", name: "Sesli okuma", sub: () => "“Deneme” okunur", run: speak },
      { id: "tanima", name: "Ses tanıma", sub: () => "Kısa kayıt yazıya çevrilir", run: hear },
      { id: "elle", name: "Ses testi", sub: () => "Elle · üç yol yan yana", href: "/settings/voice-test" },
    ],
  },
  {
    id: "bildirim",
    name: "Bildirimler",
    tests: [
      { id: "deneme", name: "Deneme bildirimi", sub: () => "Hemen gelir mi", run: push },
      { id: "zamanlayici", name: "Zamanlayıcı", sub: () => "Son 10 dk içinde çalıştı mı", run: beat },
      { id: "elle", name: "Bildirim testi", sub: () => "Elle · türler ve kayıt", href: "/settings/push-test" },
    ],
  },
  {
    id: "cevrimdisi",
    name: "Çevrimdışı",
    tests: [{ id: "kayit", name: "İnternetsiz kayıt", gh: ["ÇEVRİMDIŞI"] }],
  },
  {
    id: "uygulama",
    name: "Uygulama",
    tests: [
      { id: "baglanti", name: "Bağlantı", sub: () => "Sunucu ve veri cevap veriyor mu", run: link },
      { id: "sayfalar", name: "Sayfalar", gh: ["UYGULAMA"] },
      { id: "birim", name: "Birim testleri", gh: ["BİRİM TESTLERİ"] },
    ],
  },
];

// Telefonda çalışan testler, tam kimlikleriyle ("ses.okuma")
export const RUNNABLE = FEATURES.flatMap((f) => f.tests.filter((t) => t.run).map((t) => ({ ...t, key: `${f.id}.${t.id}`, feature: f.name })));
