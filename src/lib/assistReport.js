// Asistan raporu ("rapor oluştur", Ayarlar › Testler › Asistan raporu): bugün bu cihazda asistana söylenen her şey, ne
// duyulduğu, verilen cevap, kim cevapladı, adım adım süreler, model ve hatalar. Seyhun telefonda dener, raporu paylaşır,
// uygulama buna göre geliştirilir (2026-10-21). Kaynak: süre kaydı (lib/assistTiming.js), yalnız bu cihazda.
import { engineName, liveOf, liveText, msText, secText, timingErrors, timingList, timingSteps } from "@/lib/assistTiming";

const ERR = { quota: "kota doldu", busy: "servis yoğun", timeout: "zaman aşımı", network: "ulaşılamadı", unclear: "yanıt anlaşılamadı", nokey: "anahtar yok", model: "model bulunamadı", other: "hata" };
const hm = (t) => new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const startOfDay = (now) => {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

// Varsayılan kapsam: bugün (gece yarısından beri). meta: { version, voice, quick, device }
export function reportText({ now = Date.now(), since = startOfDay(now), list = timingList(), errors = timingErrors(), meta = {} } = {}) {
  const rows = list.filter((r) => r.at >= since).sort((a, b) => a.at - b.at);
  const errs = errors.filter((e) => e.at >= since).sort((a, b) => a.at - b.at);
  const totals = rows.map((r) => timingSteps(r).total).filter((t) => t > 0);
  const ais = rows.map((r) => timingSteps(r).ai).filter((t) => t > 0);
  const models = [...new Set(rows.map((r) => r.info?.model).filter(Boolean))];
  const failed = rows.filter((r) => r.info?.err).length;
  const head = [
    `ASİSTAN RAPORU · ${new Date(now).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} ${hm(now)}`,
    `Kapsam: bugün ${hm(since)}'den beri, bu cihaz`,
    meta.version && `Sürüm: ${meta.version}`,
    meta.device && `Cihaz: ${meta.device}`,
    `Sesli yanıt: ${meta.voice ? "açık" : "kapalı"} · Hazır cevaplar: ${meta.quick ? "açık" : "kapalı"}`,
    models.length ? `Model: ${models.join(", ")}` : "",
    "",
    `ÖZET: ${rows.length} istek (${rows.filter((r) => r.voice).length} sesli, ${rows.filter((r) => !r.voice).length} yazılı) · yapay zekaya ${rows.filter((r) => r.engine === "ai").length}`,
    totals.length ? `Ortalama cevap süresi ${secText(avg(totals))} (en uzun ${secText(Math.max(...totals))}) · yapay zeka ortalama ${secText(avg(ais))}` : "",
    `Hata: ${failed} yapay zeka, ${errs.length} dinleme`,
  ].filter((x) => x !== false && x != null);
  const body = rows.map((r, i) => {
    const { steps, total } = timingSteps(r);
    const lv = liveText(liveOf(r));
    const i0 = r.info || {};
    return [
      `${i + 1}) ${hm(r.at)} · ${r.voice ? "sesli" : "yazılı"} · ${engineName(r.engine) || "?"} · toplam ${secText(total)}`,
      `   Duyulan: “${r.text}”`,
      r.answer ? `   Cevap: “${r.answer}”` : "   Cevap: (yok)",
      i0.model ? `   Model: ${i0.model}${i0.retry ? ` (bir kez yeniden denendi: ${ERR[i0.retry] || i0.retry})` : ""}` : "",
      i0.err ? `   Hata: yapay zeka ${ERR[i0.err] || i0.err}` : "",
      i0.sozErr ? `   Söz yapay zekası olmadı (${ERR[i0.sozErr] || i0.sozErr}), yerel cümle` : "",
      `   Süreler: ${steps.map((s) => `${s.label} ${msText(s.ms)}`).join(" · ") || "-"}`,
      lv ? `   ${lv[0].toLocaleUpperCase("tr-TR")}${lv.slice(1)}` : "",
    ].filter(Boolean).join("\n");
  });
  const errLines = errs.map((e) => `- ${hm(e.at)} ${e.msg}`);
  return [
    ...head,
    "",
    rows.length ? "İSTEKLER" : "Bugün asistana söylenen bir şey yok.",
    ...body.flatMap((b) => [b, ""]),
    ...(errLines.length ? ["DİNLEME HATALARI", ...errLines] : []),
  ].join("\n").trim();
}

// "rapor oluştur", "asistan raporu hazırla", "raporu paylaş" (sağlık raporu, antrenman raporu değil)
export function reportAsk(s) {
  const t = String(s || "").toLocaleLowerCase("tr-TR").replace(/[.!?,]+/g, " ").replace(/\s+/g, " ").trim();
  return /^(bana )?(asistan(ın)? |test )?rapor(u|unu)? ?(oluştur|hazırla|çıkar|ver|paylaş|göster|yap)\p{L}*( bana)?$/u.test(t) || /^(asistan|test) raporu$/.test(t);
}
