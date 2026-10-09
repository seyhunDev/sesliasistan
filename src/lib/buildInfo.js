// Yayın (sürüm) bilgisi: son değişikliğin kısa açıklaması, PR numarası ve yayın zamanı derlemede gömülür (next.config.mjs).
// Yeni sürüm ilk açılınca üstte kısa not (UpdateNote), Ayarlar'da "Sürüm" satırı, asistanda "son güncelleme ne?".
export const BUILD = {
  at: process.env.NEXT_PUBLIC_BUILD_AT || "",
  sha: process.env.NEXT_PUBLIC_BUILD_SHA || "",
  msg: process.env.NEXT_PUBLIC_BUILD_MSG || "",
};

// Commit başlığından açıklama ve PR numarası: "Asistan: … (#246)" ya da "Merge pull request #243 from …" + gövde ilk satırı
export function parseCommit(subject = "", body = "") {
  const s = String(subject).trim();
  const m = /^Merge pull request #(\d+)/.exec(s);
  if (m) return { pr: m[1], text: String(body).split("\n").map((x) => x.trim()).find(Boolean) || "" };
  const p = /\s*\(#(\d+)\)\s*$/.exec(s);
  return { pr: p ? p[1] : "", text: p ? s.slice(0, p.index).trim() : s };
}

// Gömülen ileti: ilk satır başlık, kalanı gövde
export function commitOf(msg = "") {
  const [subject, ...rest] = String(msg).split("\n");
  return parseCommit(subject, rest.join("\n"));
}

// Yayın zamanı: "9 Ekim 18:15"
export function buildWhen(at = BUILD.at) {
  const d = new Date(at);
  if (!at || isNaN(d)) return "";
  const day = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", timeZone: "Europe/Istanbul" });
  const time = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" });
  return `${day} ${time}`;
}

// Kısa satır: "9 Ekim 18:15 · #247 · Ayarlar'da sürüm satırı"
export function buildLine(b = BUILD) {
  const { pr, text } = commitOf(b.msg);
  return [buildWhen(b.at), pr && `#${pr}`, text].filter(Boolean).join(" · ") || "Sürüm bilgisi yok";
}

// Asistanın cevabı
export function buildSpeech(b = BUILD) {
  const when = buildWhen(b.at);
  if (!when) return "Bu sürümün yayın bilgisi yok (geliştirme sürümü olabilir).";
  const { text } = commitOf(b.msg);
  return `Son güncelleme ${when} tarihinde yayınlandı.${text ? ` Değişiklik: ${text}.` : ""}`;
}

// "son güncelleme ne", "en son ne değişti", "uygulama güncellendi mi", "hangi sürüm(deyim)"
const ASK = /(son (güncelleme|yayın|değişiklik|sürüm)|en son (ne|hangi)\S* (değişti|değişiklik|güncelle\S*|eklendi)|uygulama(yı)? güncellendi mi|güncelleme (geldi|oldu) mu|güncel mi(yim)?|hangi sürüm|sürüm (ne|kaç|bilgisi)|ne zaman güncellendi)/;
export function versionAsk(s) {
  const t = String(s || "").toLocaleLowerCase("tr-TR").replace(/[.,!?]+/g, " ").replace(/\s+/g, " ").trim();
  return t.split(" ").length <= 8 && ASK.test(t);
}
