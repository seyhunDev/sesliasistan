// Kısa tanıtımın sesleri, derlemeden ÖNCE dosya olarak hazırlanır (Seyhun 2026-11-27: "önden alalım, kaydedelim,
// değişiklik olunca yenilensin"). `npm run build` bunu çalıştırır.
// - Cümleler: src/lib/tanitimSes.js (sayfadaki "say" ile aynı). Her cümlenin özeti = ses + stil + metin.
// - Kalıcı yer: Firebase Storage tanitim-ses/<özet>.mp3. Varsa oradan indirilir, hiçbir ses servisi çağrılmaz.
// - Yoksa (yeni ya da değişmiş cümle) canlı sitedeki /api/tanitim-ses'ten BİR KEZ alınır ve Storage'a yazılır. Ses anahtarı
//   derlemede okunamıyor (Netlify gizli değeri derlemeye vermiyor, 2026-11-27 "API key not valid"), o yüzden canlı sunucu üretir.
//   Canlıdaki metin farklıysa (cümle bu yayınla değişiyor) alınmaz; sayfa o cümleyi bir sonraki yayına kadar sunucudan ister.
// - Doğal (Gemini) olmayan ses gelirse de saklanır ama 10 dakikadan eskiyse her yayında yeniden denenir (Gemini açılınca geçsin).
// - Gemini Vertex yolundan WAV gelir: ffmpeg ile MP3'e çevrilir (GitHub'daki makinede var); ffmpeg yoksa o cümle atlanır.
// - Çıktı: public/tanitim/kisa/ses/<id>.mp3 + liste.json ({ id: özet }); depoya girmez (.gitignore).
// - Storage açılmazsa hiçbir şey yapılmaz, derleme DURMAZ; sayfa /api/tanitim-ses'e, o da olmazsa cihazın sesine döner.
import { register } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
register(new URL("./hooks.mjs", import.meta.url));

const OUT = new URL("../../public/tanitim/kisa/ses/", import.meta.url);
const SITE = (process.env.URL || "https://sesliasistan.netlify.app").replace(/\/$/, "");
const YENIDEN = 10 * 60 * 1000;
const log = (...a) => console.log("[tanıtım sesleri]", ...a);

function toMp3(wav) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-codec:a", "libmp3lame", "-b:a", "64k", "-f", "mp3", "pipe:1"], { input: wav, maxBuffer: 64 << 20 });
  if (r.status !== 0 || !r.stdout?.length) throw new Error("ffmpeg: " + String(r.stderr || r.error || "yok").slice(0, 160));
  return r.stdout;
}

async function main() {
  const need = ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"];
  const yok = need.filter((k) => !process.env[k]);
  if (yok.length) return log("atlandı, ortamda yok:", yok.join(", "));
  const { TANITIM_SES, tanitimOzet } = await import("../../src/lib/tanitimSes.js");
  const { adminDb } = await import("../../src/lib/server/admin.js");
  const { getStorage } = await import("firebase-admin/storage");
  adminDb();
  const bucket = getStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  await bucket.getFiles({ prefix: "tanitim-ses/", maxResults: 1 }); // erişim yoksa burada düşer
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const liste = {};
  const say = { saklı: 0, yeni: 0, olmadı: 0 };
  const motor = {};
  for (const [id, text] of Object.entries(TANITIM_SES)) {
    const ozet = tanitimOzet(text);
    const file = bucket.file(`tanitim-ses/${ozet}.mp3`);
    try {
      let audio = null, engine = "";
      const [vardir] = await file.exists();
      if (vardir) {
        const [meta] = await file.getMetadata();
        engine = meta.metadata?.engine || "";
        const eski = engine !== "gemini" && Date.now() - Date.parse(meta.updated || 0) > YENIDEN;
        if (!eski) [audio] = await file.download();
      }
      if (audio) say.saklı++;
      else {
        const res = await fetch(`${SITE}/api/tanitim-ses?id=${encodeURIComponent(id)}&o=${ozet}`, { signal: AbortSignal.timeout(60000) });
        if (!res.ok) throw new Error(`canlı site ${res.status}`);
        if (res.headers.get("x-tanitim-ozet") !== ozet) throw new Error("canlıdaki metin farklı (sonraki yayında alınır)");
        audio = Buffer.from(await res.arrayBuffer());
        if (/wav/i.test(res.headers.get("content-type") || "")) audio = toMp3(audio);
        engine = res.headers.get("x-tts-engine") || "";
        await file.save(audio, { contentType: "audio/mpeg", resumable: false, metadata: { metadata: { engine, id } } });
        say.yeni++;
      }
      motor[engine || "?"] = (motor[engine || "?"] || 0) + 1;
      writeFileSync(new URL(`${id}.mp3`, OUT), audio);
      liste[id] = ozet.slice(0, 12) + (engine === "gemini" ? "" : "c");
    } catch (e) {
      say.olmadı++;
      log(id, "alınamadı:", e.message);
    }
  }
  writeFileSync(new URL("liste.json", OUT), JSON.stringify(liste));
  log(`${Object.keys(liste).length} dosya hazır (Storage'dan ${say.saklı}, yeni alınan ${say.yeni}, olmayan ${say.olmadı}; ses: ${JSON.stringify(motor)})`);
}

main().catch((e) => log("atlandı:", e.message)).finally(() => process.exit(0));
