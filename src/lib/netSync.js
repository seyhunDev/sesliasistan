// İnternet / gönderilmeyi bekleyen kayıt göstergesi (üstteki şerit). Saf kısım: hangi durumda ne yazılır.
// online: tarayıcı bağlı mı · pending: Firestore'da sunucuya gitmemiş yazma var mı · sent: az önce hepsi gitti
export function netText({ online, pending, sent }) {
  if (!online) return pending ? "İnternet yok · kaydedildi, bağlantı gelince gönderilecek" : "İnternet yok · kaydettiklerin bağlantı gelince gönderilir";
  if (pending) return "Bağlantı zayıf · kayıtların gönderiliyor…";
  if (sent) return "Bağlantı geldi · kayıtların gönderildi";
  return "";
}

// Şerit rengi: yok/zayıf koyu, gönderildi yeşil
export const netTone = ({ online, pending }) => (!online || pending ? "wait" : "ok");
