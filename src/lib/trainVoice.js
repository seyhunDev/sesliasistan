// Antrenman yarışını sesle yönetme (Seyhun 2026-11-02 "hepsini sesli yapmak istiyorum"):
// "2 dakika başlat", "iki dakikalık yarış başlat", "yarışı başlat", "start ver", "sayacı başlat" → 3·2·1 sonra geri sayım (yarış açılır);
// "yarışı bitir", "yarış bitti" → süre yazılır; aynı cümlede sonuç da söylenebilir ("yarışı bitir, birinci Ali ikinci Ayşe").
// Yalnız sonuç cümlesi eskisi gibi trainResult'a gider (lib/raceVoice.js resultCommand).
import { numberIn } from "@/lib/raceLive";

const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/[’'`]/g, "").replace(/[.,!;:]/g, " ").replace(/\s+/g, " ").trim();
const NUMW = "bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on";
// Başlatma cümlesi yalnız bu sözcüklerden oluşur (başka işin "… başlat"ı karışmasın)
const START = new RegExp(`^(?:(?:hadi|tamam|şimdi|yeni|\\d{1,2}|${NUMW}|dakika\\p{L}*|dk\\p{L}*|yarış\\p{L}*|start\\p{L}*|sayaç\\p{L}*|sayac\\p{L}*|geri|sayım\\p{L}*)\\s+)+(?:başlat\\p{L}*|başla|ver)$`, "u");
const START_W = /(dakika|dk|yarış|start|saya[cç]|geri say)/u;
const FIN = /^(?:(?:hadi|tamam|şimdi|bu|son)\s+)*(?:yarış\p{L}*|sayac\p{L}*|sayaç)\s+(?:bitir\p{L}*|bitti|durdur\p{L}*)(?![\p{L}])\s*/u;
const FIN2 = /^(?:bitir|durdur)\p{L}*\s+(?:yarış\p{L}*|sayac\p{L}*)(?![\p{L}])\s*/u;

// { start: saniye (0: telefondaki seçili süre) } | { finish: true, rest: "sonuç cümlesi" | "" } | null
export function trainCommand(raw) {
  const s = low(raw);
  if (!s || /\?|(?<![\p{L}])kaç(?![\p{L}])/u.test(low(raw) + String(raw)) || s.split(" ").length > 80) return null;
  if (START.test(s) && START_W.test(s) && (!/ ver$/.test(s) || /start/.test(s))) {
    const min = numberIn(s, "dakika|dk");
    return { start: min && min <= 30 ? min * 60 : 0 };
  }
  const m = FIN.exec(s) || FIN2.exec(s);
  if (m) return { finish: true, rest: s.slice(m[0].length).replace(/^(?:ve|sonra|sonuçlar\p{L}*|sonuç\p{L}*|şöyle|şunlar)\s+/u, "").trim() };
  return null;
}

// Bugün yarış günü mü (yarış günü sayaç işleri Yayın sayfasının; antrenmanınki burada)
export const raceToday = (races, today) => (races || []).some((r) => r.startDate && r.startDate <= today && (r.endDate || r.startDate) >= today);
