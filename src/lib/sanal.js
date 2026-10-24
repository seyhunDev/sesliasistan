import { authFetch, jsonOf } from "@/lib/authFetch";

// Velora Sanal (market, ayrı site) adresi ve tek dokunuşla giriş: sunucudan 1 saatlik giriş anahtarı alınır (/api/sanal-giris),
// adresin # kısmında gider (sunucuya ve kayıtlara gitmez); Velora Sanal /giris onunla oturum açar ve # kısmını siler.
// Anahtar alınamazsa (bağlantı, yetki) site yine açılır, orada Velora kullanıcı adı ve şifreyle girilir.
export const SANAL_URL = "https://velora-sanal.netlify.app";

export async function sanalLink() {
  try {
    const r = await jsonOf(await authFetch("/api/sanal-giris", { method: "POST", timeout: 10000 }));
    if (r?.token) return `${SANAL_URL}/giris#t=${encodeURIComponent(r.token)}`;
  } catch {}
  return SANAL_URL;
}

// Market düğmesi: aynı pencerede Velora Sanal'a geçer (iPhone'da açılır pencere engellenmesin diye yeni sekme açılmaz)
export async function openSanal() {
  window.location.assign(await sanalLink());
}
