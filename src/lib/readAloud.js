// Sesli okuma isteği: "notları oku", "bugün hangi planlar var", "görevlerimi anlat", "yarını söyle".
// Böyle bir istekte cevap sesli okunur (sesli yanıt kapalıysa "Sesli yanıtı aç" düğmesi çıkar), okuma bitince mikrofon
// bir kez açılır: kullanıcı yeni isteğini söyler ya da "kapat" der. Diğer isteklerde asistan eskisi gibi çalışır.
// (Seyhun, 2026-10-14)
import { messageFirst } from "@/lib/steps";

const lower = (s) => String(s || "").toLocaleLowerCase("tr-TR");

// Okutma sözleri (kelimenin başı): oku, okur musun, okuyabilir, okusana; seslendir, sesli; dinlet; anlat; söyle; özetle;
// "say" sayma olabilir, "okul" / "okundu" okuma değildir
const READ_WORD = /^(oku(?:r|y|s|$)|seslendir|sesli|sesle$|dinlet|anlat|söyle|özetle|bahset|tekrarla)/u;
// Liste sorusu: "bugün hangi planlar var", "yarın neler var", "kaç görevim var", "toplantı var mı"
const ASK_WORD = /^(hangi|neler|ne|kaç|kimler)$/u;
// İş yapan söz varsa okuma değil iştir ("not al ve oku" gibi karışıklarda iş önce gelir)
const ACT_WORD = /^(ekle|kaydet|sil|oluştur|gönder|planla(?!r)|hatırlat|ata|ver|aç|kapat)/u;

export function wantsRead(raw) {
  const s = lower(raw).replace(/[.,!?;:…"“”]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return false;
  // Birine söylenecek söz mesajdır: "Ali'ye söyle yarın gelsin", "ekibe anlat"
  if (messageFirst(s)) return false;
  const to = /^(\p{L}+)['’]?(?:y?[ae]) (?:anlat|söyle|oku)/u.exec(s);
  if (to && !/^(ban|san|biz|siz)$/u.test(to[1])) return false;
  const words = s.replace(/['’]/g, " ").split(" ");
  if (words.some((w) => READ_WORD.test(w))) {
    // "sesli yanıtı kapat" ayardır, okuma değil
    return !words.some((w) => /^(kapat|aç)/u.test(w) && words.includes("yanıtı"));
  }
  if (words.some((w) => ACT_WORD.test(w))) return false;
  if (!words.includes("var") && !words.includes("varmış")) return false;
  return words.some((w) => ASK_WORD.test(w)) || /(?:^| )var m[ıi](?: |$)/u.test(s);
}
