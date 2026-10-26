import { authFetch, jsonOf } from "@/lib/authFetch";

// Velora Sanal (market, ayrı site) adresi ve tek dokunuşla giriş: sunucudan 1 saatlik giriş anahtarı alınır (/api/sanal-giris),
// adresin # kısmında gider (sunucuya ve kayıtlara gitmez); Velora Sanal /giris onunla oturum açar ve # kısmını siler.
// Anahtar alınamazsa (bağlantı, yetki) site yine açılır, orada Velora kullanıcı adı ve şifreyle girilir.
export const SANAL_URL = "https://velora-sanal.netlify.app";

// Giriş anahtarı (1 saat) ya da null; gömülü /sanal bunu Sanal isteyince postMessage ile verir
export async function sanalToken() {
  try {
    const r = await jsonOf(await authFetch("/api/sanal-giris", { method: "POST", timeout: 10000 }));
    return r?.token || null;
  } catch {
    return null;
  }
}

// pad: gömülü tam ekranda iPhone'un üst (çentik) ve alt (çizgi) payı, px; iframe içine safe-area gelmediği için Sanal bunları
// adresten okur (st, sb) ve üst/alt satırını o kadar içeride çizer (velora-sanal #13)
export async function sanalLink(pad) {
  try {
    const r = await jsonOf(await authFetch("/api/sanal-giris", { method: "POST", timeout: 10000 }));
    const p = pad ? `&st=${pad.st | 0}&sb=${pad.sb | 0}` : "";
    if (r?.token) return `${SANAL_URL}/giris#t=${encodeURIComponent(r.token)}${p}`;
  } catch {}
  return SANAL_URL;
}

// Market düğmesi: aynı pencerede Velora Sanal'a geçer (iPhone'da açılır pencere engellenmesin diye yeni sekme açılmaz)
export async function openSanal() {
  window.location.assign(await sanalLink());
}
