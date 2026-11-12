// Velora dışındaki kendi projelerimizin adresleri (tek yer; adres değişirse yalnız burası güncellenir)
export const SIMULATOR_URL = "https://seyhundev.github.io/professional-sailing/";

// Dış bağlantıyı uygulamanın dışında açar: web'de yeni sekme; iPhone/iPad kabuğunda (Capacitor) başka alan adı Safari'de açılır
export function openExternal(url) {
  if (typeof window === "undefined") return;
  const w = window.open(url, "_blank", "noopener");
  if (!w) window.location.href = url;
}
