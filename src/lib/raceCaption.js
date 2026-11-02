// Ekranın altındaki yazı kendiliğinden (Seyhun 2026-11-02 "start ise start … genel geri olursa genel geri … tehir olursa tehir,
// geri sayım bittiğinde bir şey yazmasın"). Grup ve yarış zaten şeritte yazdığı için burada yalnız o anki olay yazar.
// Yayıncının elle yazdığı yazı (screen.caption) her zaman önce gelir; boşsa bu kullanılır.
//  - Start geri sayımı: "Start", son dakikada "Son dakika"; sayaç durdurulduysa yazı yok
//  - Tehir (plan.status "ap" ya da yarış "Tehir" sayıldı): "Tehir"; yeni geri sayım başlayınca "Start"
//  - Genel geri çağırma: "Genel geri"; iptal: "Yarış iptal" (yeni geri sayım başlayana kadar, en çok 60 dk)
//  - Start'tan sonraki 3 dk içinde OCS/UFD/BFD varsa: "Bireysel geri · 512 · 88"
//  - Lider finişe geldi, yarış bitmedi: "Finiş"
// Döndürür: { text, kind } kind "start" | "warn" | "" (warn: tehir / genel geri / iptal kehribar)
const VOID_TEXT = { Tehir: "Tehir", "Genel geri çağırma": "Genel geri", İptal: "Yarış iptal" };
const EARLY = ["OCS", "UFD", "BFD"];
const ms = (iso) => Date.parse(iso || "") || 0;

export function autoCaption({ plan, starts = [], timer = null, rounds = {}, now = Date.now(), today = "" }) {
  const none = { text: "", kind: "" };
  const cd = timer?.mode === "start" && timer?.end != null && now < timer.end;
  if (cd) return { text: (timer.end - now) / 1000 <= 60 ? "Son dakika" : "Start", kind: "start" };
  if (timer?.mode === "start" && timer?.end == null && timer?.left != null) return none; // durduruldu: sebebi seçilince yazar
  const day = (starts || []).filter((x) => !today || x.day === today).sort((a, b) => ms(a.cd || a.at) - ms(b.cd || b.at));
  const last = day[day.length - 1];
  if (last?.void && now - ms(last.fin) < 60 * 60e3) return { text: VOID_TEXT[last.void] || last.void, kind: "warn" };
  if (plan?.status === "ap" && (!plan.day || !today || plan.day === today)) return { text: "Tehir", kind: "warn" };
  // Süren yarışlar (aynı anda iki grup olabilir): en son başlayandan geriye
  for (const s of [...day].reverse()) {
    if (s.void || s.fin || !s.at) continue;
    const at = ms(s.at);
    if (now < at) continue;
    const e = rounds?.[s.id];
    const pen = Object.entries(e?.pen || {}).filter(([, c]) => EARLY.includes(c)).map(([sail]) => sail);
    if (pen.length && now - at < 3 * 60e3) return { text: `Bireysel geri · ${pen.slice(0, 4).join(" · ")}`, kind: "warn" };
    const fi = (e?.route || []).indexOf("F");
    if (fi >= 0 && (e.legs?.[fi] || []).length) return { text: "Finiş", kind: "start" };
  }
  return none;
}
