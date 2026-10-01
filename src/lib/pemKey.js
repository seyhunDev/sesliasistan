// Firebase hizmet hesabının özel anahtarını ortam değişkeninden güvenle okur.
// Netlify ekranına yapıştırırken sık görülen bozulmaları düzeltir: baştaki/sondaki tırnak ve boşluk,
// "\n" olarak yazılmış satır sonları, Windows satır sonu (\r), yanlışlıkla yapıştırılmış tüm JSON dosyası.
export function cleanKey(raw) {
  let k = String(raw || "").trim();
  if (k.startsWith("{")) {
    try {
      k = JSON.parse(k).private_key || k;
    } catch {}
  }
  k = k.replace(/^["']+|["']+$/g, "").replace(/\\n/g, "\n").replace(/\r/g, "").trim();
  return k ? `${k}\n` : "";
}
// Hizmet hesabı e-postası (tırnak/boşluk temizlenmiş)
export const cleanEmail = (raw) => String(raw || "").trim().replace(/^["']+|["']+$/g, "");
