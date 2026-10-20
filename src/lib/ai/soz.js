// Söz yapay zekası (Seyhun, 20 Ekim 2026): "Yerelde sadece 'ilgileniyorum' olsun; istek yapay zekaya da gitsin, yapay zeka
// cevabı metin olarak döndürsün. Bu apayrı bir işlem olsun." İşi yapan (yerel kural ya da iş yapay zekası) sonucu bilgi
// olarak yazar; bu ayrı ve küçük çağrı onu kullanıcıya doğal, kısa bir konuşma cümlesine çevirir. Bilgi eklemez, çıkarmaz.
// Gelen metin denetlenir (sayılar, saatler, adlar korunmuş mu); tutmazsa ya da süre geçerse yerel cümle kullanılır.
// Saf işlevler (istem, denetim) ve bu cihazdaki aç/kapa (Ayarlar › Testler › Asistan süre kaydı).

export const SOZ_SYSTEM = `Sen bir Türkçe kişisel asistan uygulamasının konuşma sesisin. Uygulama kullanıcının isteğini zaten yaptı; sana isteği ve uygulamanın SONUÇ bilgisini veriyorum.
Görevin: SONUÇ'u kullanıcıya sıcak, doğal, kısa bir konuşma cümlesiyle söylemek (sesli okunacak).
Kurallar:
- Yalnız SONUÇ'taki bilgiyi kullan. Bilgi ekleme, tahmin etme, hiçbir bilgiyi atlama.
- Sayıları, tutarları, saatleri, tarihleri ve adları AYNEN koru (yazım biçimi dahil: 18:00, 3.450 TL, “Antrenman”).
- SONUÇ bir soru ya da teklif içeriyorsa ("saatini söyle", "ekleyeyim mi?") onu da doğal biçimde sor.
- En çok 2 kısa cümle; liste varsa virgüllerle tek cümlede say. Emoji, madde işareti, tırnak içinde açıklama yok.
- "Tamam", "Anladım" ile başlama; doğrudan sonucu söyle. Senli konuş.`;

const cut = (s, n) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
export function sozUser({ said = "", result = "" }) {
  return `## KULLANICININ İSTEĞİ\n"""\n${cut(said, 400)}\n"""\n\n## SONUÇ (uygulamanın yaptığı)\n"""\n${cut(result, 1200)}\n"""`;
}
export const SOZ_SCHEMA = { type: "object", properties: { text: { type: "string" } }, required: ["text"] };

// Korunması gerekenler: sayılar (saat, tutar, tarih) ve büyük harfle başlayan adlar (cümle başı dışında)
const nums = (s) => String(s).match(/\d+(?:[.:,]\d+)*/g) || [];
const names = (s) =>
  String(s)
    .split(/(?<=[.!?:])\s+/)
    .flatMap((x) => x.split(/\s+/).slice(1))
    .map((w) => w.replace(/^[“"'(]+|[”"').,;:!?]+$/g, "").replace(/['’].*$/, ""))
    .filter((w) => /^\p{Lu}\p{Ll}{2,}/u.test(w));
// Söz metni kabul edilebilir mi: boş değil, çok uzun değil, sonuçtaki sayılar ve adlar korunmuş
export function sozOk(result, text) {
  const t = String(text || "").trim();
  if (!t || t.length > Math.max(240, String(result).length * 2)) return false;
  if (!nums(result).every((n) => t.includes(n))) return false;
  return names(result).every((n) => t.toLocaleLowerCase("tr-TR").includes(n.toLocaleLowerCase("tr-TR")));
}

// Hangi cevap söz yapay zekasına gider: onay ya da seçim kartı (silme, para, kişi, yarış) ve sıralı iş listesi yerel kalır;
// yapay zekanın kendi yazdığı cevap (soru, sohbet) zaten doğal, ayrıca gönderilmez; çok kısa ("Tamam.") ve uzun liste
// cevapları ("notlarımı oku": 2 cümleye sığmaz, bilgi düşer) da gitmez
export function wantsSoz({ message = "", engine = "", confirm = false, midPlan = false } = {}) {
  if (confirm || midPlan || engine === "ai") return false;
  const m = String(message).trim();
  return m.length >= 12 && m.length <= 260 && !/\n/.test(m);
}

const KEY = "sa-soz";
export function sozOn() {
  try {
    return typeof localStorage === "undefined" || localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}
export function setSozOn(on) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* yok say */
  }
}
