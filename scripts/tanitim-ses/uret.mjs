// Kısa tanıtımın sesleri, derlemeden ÖNCE dosya olarak hazırlanır (Seyhun 2026-11-27: "önden alalım, kaydedelim,
// değişiklik olunca yenilensin"). `npm run build` bunu çalıştırır; GitHub'daki yayında Netlify'ın ortam değişkenleri gelir.
// - Cümleler: src/lib/tanitimSes.js (sayfadaki "say" ile aynı). Ses: TANITIM_SES_STIL (Aoede, anlatım), Gemini doğal ses.
// - Kalıcı yer: Firebase Storage tts-cache/<metin özeti>.mp3 (lib/server/tts.js). Metin aynıysa oradan indirilir, yeniden
//   üretilmez (ücret yok); yalnız değişen ya da yeni cümle Gemini'ye gider.
// - Çıktı: public/tanitim/kisa/ses/<id>.mp3 + liste.json ({ id: özet }). Sayfa dosyayı ?h=<özet> ile açar; metin değişince
//   adres de değişir, eski ses kalmaz. Dosyalar depoya girmez (.gitignore), her yayında Storage'dan yeniden yazılır.
// - Gemini olmazsa Chirp sesi yazılır (Storage'a konmaz, sonraki yayında Gemini yeniden denenir).
// - Storage ya da anahtar yoksa (yerel derleme, test) hiçbir şey üretilmez, derleme DURMAZ; sayfa /api/tanitim-ses'e döner.
import { register } from "node:module";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
register(new URL("./hooks.mjs", import.meta.url));

const OUT = new URL("../../public/tanitim/kisa/ses/", import.meta.url);
const log = (...a) => console.log("[tanıtım sesleri]", ...a);

async function main() {
  const need = ["GOOGLE_TTS_KEY", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"];
  const yok = need.filter((k) => !process.env[k]);
  if (yok.length) return log("atlandı, ortamda yok:", yok.join(", "));
  const { TANITIM_SES, TANITIM_SES_STIL } = await import("../../src/lib/tanitimSes.js");
  const { synthesize, ttsKey } = await import("../../src/lib/server/tts.js");
  // Storage açılmıyorsa hiç üretme: yoksa her yayında aynı cümleler yeniden ücretle üretilirdi
  const { adminDb } = await import("../../src/lib/server/admin.js");
  const { getStorage } = await import("firebase-admin/storage");
  adminDb();
  await getStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET).getFiles({ prefix: "tts-cache/", maxResults: 1 });
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const liste = {};
  const say = { saklı: 0, yeni: 0, yedek: 0, olmadı: 0 };
  for (const [id, text] of Object.entries(TANITIM_SES)) {
    try {
      const r = await synthesize({ text, ...TANITIM_SES_STIL, cache: true, timeoutMs: 60000 });
      // Chirp yedeği de yazılır (sayfa sunucuya muhtaç kalmasın) ama saklanmaz: sonraki yayında Gemini yeniden denenir
      if (r.engine !== "gemini") say.yedek++;
      else r.cached ? say.saklı++ : say.yeni++;
      writeFileSync(new URL(`${id}.mp3`, OUT), r.audio);
      liste[id] = ttsKey({ text: text.replace(/\s+/g, " ").trim(), voice: TANITIM_SES_STIL.voice, lang: "tr", style: TANITIM_SES_STIL.style, rate: 1 }).slice(0, 12) + (r.engine === "gemini" ? "" : "c");
    } catch (e) {
      say.olmadı++;
      log(id, "üretilemedi:", e.detail || e.message);
    }
  }
  writeFileSync(new URL("liste.json", OUT), JSON.stringify(liste));
  log(`${Object.keys(liste).length} dosya hazır (Storage'dan ${say.saklı}, yeni üretilen ${say.yeni}, yedek ses ${say.yedek}, olmayan ${say.olmadı})`);
}

main().catch((e) => log("atlandı:", e.message)).finally(() => process.exit(0));
