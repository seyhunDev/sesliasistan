// Kayıt içinde asistana söylenenlerden mesaj / tamamlama / onay niyetini çıkaran basit kurallar.
// Yapay zeka yokken (anahtar yok, hak bitti, yanıt gelmedi) yedek olarak ve istemcide onay/ret için kullanılır.
// Saf fonksiyonlar (sunucu ve istemci ortak); Node testleri için göreli içe aktarma.
import { matchPerson } from "../names.js";

// Türkçe harflerle biten kelimelerde \b çalışmaz ("vazgeç"): kelime sonu = boşluk, noktalama ya da metin sonu
const END = "(?=$|[\\s.,!?;:])";
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
const words = (s) => low(s).split(" ").filter(Boolean).length;

// Bekleyen taslak için sesli/yazılı onay ve ret ("evet gönder", "tamam", "vazgeç", "hayır gönderme")
const YES = new RegExp(`^(evet|gönder|gönderebilirsin|yolla|at|tamam|tamamdır|olur|onayla|onaylıyorum|doğru|aynen)${END}`);
const NO = new RegExp(`^(hayır|vazgeç|iptal|gönderme|boş ?ver|istemiyorum|dur|kalsın)${END}`);
export function confirmWord(text) {
  const t = low(text).replace(/[.!?,]+$/g, "");
  if (!t || words(t) > 4) return "";
  if (NO.test(t) || /(^|\s)gönderme($|\s)/.test(t)) return "no";
  if (YES.test(t)) return "yes";
  return "";
}

// İşi bitirdiğini söylüyor mu ("tamamladım", "hallettim", "bitti")
const DONE = new RegExp(`(^|\\s)(tamamladım|tamamlandı|bitirdim|hallettim|halledildi|yaptım|bitti)${END}`);

const SAY = "(yaz|söyle|ilet|sor|bildir|haber ver|mesaj (?:at|gönder|yaz|yolla)|mesaj olarak (?:gönder|at|yaz))";
// Kime: tek kelimelik ad ("Ali'ye") ya da "ana hesaba"
const WHO = "(?:(ana hesab|\\S+?)(?:'|’)?(?:ye|ya|e|a|ne|na)\\s+)?";
// "Ali'ye yaz: yarın gelemiyorum" · "mesaj at yarın gelemiyorum" · "Ali'ye söyle, kargo geldi"
const DIRECT = new RegExp(`^${WHO}${SAY}\\s*[:,-]?\\s+(.+)$`, "i");
// "yarın gelemiyorum diye yaz" · "Ali'ye kargo geldi diye haber ver"
const DIYE = new RegExp(`^${WHO}(.+?)\\s+diye\\s+${SAY}$`, "i");
// "Ali'ye haber ver" · "Ali'ye mesaj at" (içerik yok)
const BARE = new RegExp(`^${WHO}${SAY}$`, "i");
// Birleşik: "saati 11 yap ve Ali'ye haber ver" / "…yap, Ali'ye de yaz" (önce değişiklik, sonra haber)
const TAIL = new RegExp(`^(.+?)(?:\\s+ve|,)\\s+${WHO.replace("\\s+)?", "(?:\\s*de|\\s*da)?\\s+)?")}${SAY}$`, "i");
// Dolaylı anlatım: "kargonun geciktiğini söyle" (kural motoru bunu mesaja çeviremez)
const INDIRECT = new RegExp(`(dığını|diğini|duğunu|düğünü|tığını|tiğini|tuğunu|tüğünü|acağını|eceğini|masını|mesini)\\s+${SAY}$`, "i");

const tidy = (s) => {
  const t = String(s || "").replace(/\s+/g, " ").trim().replace(/^["“”']|["“”']$/g, "");
  return t ? t[0].toLocaleUpperCase("tr-TR") + t.slice(1) : "";
};

// text: kullanıcının söylediği; thread: kayıttaki diğer kişilerin adları
// Dönüş: { send, done, bare, to, unknown, indirect, before } — hiçbiri yoksa null
//   bare: içeriksiz "haber ver"; before: birleşik cümlede değişiklik kısmı ("saati 11 yap")
export function messageIntent(text, thread = []) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const t = low(raw);
  const done = DONE.test(t);
  // "…, tamamladım ve Ali'ye yaz: …" gibi birleşik cümle: mesaj kısmını ayır
  const part = raw.replace(/^(?:tamamladım|bitirdim|hallettim|yaptım)\s*(?:,|ve)?\s*/i, "");
  let m;
  let to = "";
  let send = "";
  let verb = "";
  let bare = false;
  let indirect = false;
  let before = "";
  if ((m = DIYE.exec(part))) [, to, send, verb] = m;
  else if (INDIRECT.test(part)) indirect = true;
  else if ((m = DIRECT.exec(part))) [, to, verb, send] = m;
  else if ((m = BARE.exec(part))) {
    [, to] = m;
    bare = true;
  } else if ((m = TAIL.exec(part))) {
    [, before, to] = m;
    bare = true;
  }
  // "Ali'ye" gibi bir ad yakalandıysa kayıttaki kişilerle eşleştir (eşleşmezse yanlış kişiye gitmesin)
  let unknown = "";
  if (to && /^ana hesab/i.test(to)) to = "Ana hesap"; // çalışan için ana hesap her kayıtta vardır
  else if (to) {
    const hit = matchPerson(to, thread);
    if (!hit) {
      // "mesaj" ya da sıradan bir kelime ad sanılmasın: yalnızca büyük harfli ya da kesme işaretli ise ad say
      if (/^[A-ZÇĞİÖŞÜ]/.test(to) || /['’]/.test(raw.slice(0, to.length + 2))) unknown = tidy(to);
      else {
        send = send ? `${to} ${send}` : send;
      }
      to = "";
    } else to = hit;
  }
  send = tidy(send);
  if (send && /^sor$/i.test(verb || "") && !/[?.!]$/.test(send)) send += "?"; // "Ali'ye sor yarın gelecek mi"
  if (!send && !bare && !indirect && !done && !unknown) return null;
  return { send, done, bare, to, unknown, indirect, before: before.trim() };
}

// Değişiklik özeti (kural motoru "saati 11 yap ve Ali'ye haber ver" dediğinde gönderilecek kısa mesaj)
export function changeText(before = {}, after = {}) {
  const parts = [];
  if (after.title && after.title !== before.title) parts.push(`Başlık: ${after.title}`);
  if (after.date && after.date !== before.date) parts.push(`Tarih: ${after.date.split("-").reverse().join(".")}`);
  if (after.time !== before.time) parts.push(after.time ? `Saat: ${after.time}` : "Saat kaldırıldı, tüm gün");
  if (after.place && after.place !== before.place) parts.push(`Yer: ${after.place}`);
  return parts.length ? `Güncellendi · ${parts.join(" · ")}` : "";
}
