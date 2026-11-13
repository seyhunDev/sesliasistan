import { authFetch, jsonOf } from "@/lib/authFetch";

// Velora dışındaki kendi projelerimizin adresleri (tek yer; adres değişirse yalnız burası güncellenir)
// Velora Sailing (eski Professional Sailing, 2026-11-13'te depo ve adres velora-sailing oldu)
export const SIMULATOR_URL = "https://seyhundev.github.io/velora-sailing/";

// Dış bağlantıyı uygulamanın dışında açar: web'de yeni sekme; iPhone/iPad kabuğunda (Capacitor) başka alan adı Safari'de açılır
export function openExternal(url) {
  if (typeof window === "undefined") return;
  const w = window.open(url, "_blank", "noopener");
  if (!w) window.location.href = url;
}

// Velora Sailing'i kullanıcının Velora hesabıyla açar: /api/sailing-giris 1 saatlik giriş anahtarı verir, adresin # kısmında gider
// (sunucuya ve kayıtlara gitmez); Sailing onunla oturum açar ve # kısmını siler. Anahtar alınamazsa site yine açılır (orada
// Velora e-posta ve şifresiyle ya da misafir olarak girilir). Sekme dokunuş anında açılır ki iPhone açılır pencereyi engellemesin.
export async function openSailing() {
  if (typeof window === "undefined") return;
  // Uygulama kabuğunda (Capacitor) boş sekme açılmaz: adres hazır olunca openExternal Safari'de açar
  const native = !!window.Capacitor?.isNativePlatform?.();
  const w = native ? null : window.open("", "_blank");
  let url = SIMULATOR_URL;
  try {
    const r = await jsonOf(await authFetch("/api/sailing-giris", { method: "POST", timeout: 10000 }));
    if (r?.token) url = `${SIMULATOR_URL}#t=${encodeURIComponent(r.token)}`;
  } catch {}
  if (w && !w.closed) w.location.href = url;
  else openExternal(url);
}
