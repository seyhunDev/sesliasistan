// Mesaja eklenen fotoğraf, dosya ve sesli mesaj.
// Dosya Firebase Storage'da: orgs/{org}/chatFiles/{sohbet}/{gönderen}/{id} (kural storage.rules: yalnız sohbetin üyeleri).
// Mesajda künye: file { kind photo|file|voice, name, type, size, path, url, w, h, sec }.

export const CHAT_LIMITS = { photo: 10 * 1024 * 1024, voice: 10 * 1024 * 1024, file: 20 * 1024 * 1024 };
export const VOICE_MAX_SEC = 300;

export const kindOfFile = (type) => (/^image\//.test(type || "") ? "photo" : /^audio\//.test(type || "") ? "voice" : "file");

export function secText(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function sizeText(n) {
  const b = Number(n) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

// Sohbet listesinde, bildirimde ve yanıtta görünen kısa ad
export function fileLabel(f) {
  if (!f) return "";
  if (f.kind === "photo") return "📷 Fotoğraf";
  if (f.kind === "voice") return `🎤 Sesli mesaj${f.sec ? ` ${secText(f.sec)}` : ""}`;
  return `📎 ${f.name || "Dosya"}`;
}

// Mesaja yazılacak künye: yalnız bilinen alanlar, sınırlı uzunlukta
export function cleanChatFile(f) {
  if (!f || !f.url || !f.path) return null;
  const kind = ["photo", "file", "voice"].includes(f.kind) ? f.kind : "file";
  const out = { kind, name: String(f.name || "").slice(0, 120), type: String(f.type || "").slice(0, 100), size: Math.max(0, Math.round(Number(f.size) || 0)), path: String(f.path).slice(0, 300), url: String(f.url).slice(0, 1000) };
  if (kind === "photo" && f.w && f.h) Object.assign(out, { w: Math.round(f.w), h: Math.round(f.h) });
  if (kind === "voice") out.sec = Math.min(VOICE_MAX_SEC, Math.max(0, Math.round(Number(f.sec) || 0)));
  return out;
}

// Dosya sınırı aşıyorsa hata yazısı, yoksa ""
export function tooBig(kind, size) {
  const max = CHAT_LIMITS[kind] || CHAT_LIMITS.file;
  return size > max ? `Dosya çok büyük (en çok ${Math.round(max / 1024 / 1024)} MB).` : "";
}

// Kayıt biçimi: iPhone mp4/aac, Chrome webm/opus
export function voiceType() {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"]) if (MediaRecorder.isTypeSupported?.(t)) return t;
  return "";
}
