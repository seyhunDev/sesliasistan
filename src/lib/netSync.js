// İnternet / gönderilmeyi bekleyen kayıt göstergesi (üstteki şerit). Saf kısım: hangi durumda ne yazılır.
// online: tarayıcı bağlı mı (kısa kopmalar sayılmaz, netWatch.js) · pending: kullanıcının kaydı uzun süredir sunucuya gitmeyi
// bekliyor mu · sent: bekleyen kayıtlar az önce gitti. İnternet varken arka plandaki küçük yazmalar ("son görülme") şerit açmaz.
// hush: internet varken bekleyen kayıt bir kez kısa gösterildi, şerit kapalı (gönderim arkada sürer)
export function netText({ online, pending, sent, hush }) {
  if (!online) return pending ? "İnternet yok · kayıtların telefonda, bağlantı gelince gönderilecek" : "İnternet yok · kaydettiklerin telefonda saklanır";
  if (pending) return hush ? "" : "Kayıtların gönderiliyor…";
  if (sent) return "Kayıtların gönderildi";
  return "";
}

// Şerit tonu: bekliyor / gönderildi (ikisi de sakin; renk patlaması yok)
export const netTone = ({ online, pending }) => (!online || pending ? "wait" : "ok");

// Bekleyen kayıt ne zaman şerit açar (ms): internet yokken hemen, varken uzun süre gitmezse
export const pendingGrace = (online) => (online ? 12e3 : 0);
// İnternet kopunca şerit bu kadar sonra açılır (Wi-Fi ↔ mobil veri geçişindeki kısa kopma uyarı göstermesin)
export const OFFLINE_GRACE = 2500;
// İnternet varken bekleyen kayıt şeridi: bu kadar görünür, sonra kapanır; en çok bu aralıkta bir kez
export const FLASH_MS = 4000;
export const FLASH_GAP = 10 * 60e3;
