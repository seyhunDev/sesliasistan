// Takip ve adres haritası görünümleri (ücretsiz, anahtarsız karolar). Kaynak yazısı lisans gereği haritadaki küçük "i" içinde.
// Seyhun 2026-10-23: "daha profesyonel, reklam/isim görünmesin" → örnek sayfa /yemek/harita-ornek'te seçilecek.
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
export const MAP_STYLES = {
  acik: { name: "Açık", layers: [[`${ESRI}/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, 16], [`${ESRI}/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, 16]], attr: "© Esri · © OpenStreetMap katkıcıları" },
  sokak: { name: "Sokak", layers: [[`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`, 19]], attr: "© Esri · © OpenStreetMap katkıcıları" },
  lacivert: { name: "Lacivert", layers: [[`${ESRI}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, 16], [`${ESRI}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, 16]], attr: "© Esri · © OpenStreetMap katkıcıları", dark: true },
  osm: { name: "Şimdiki", layers: [["https://tile.openstreetmap.org/{z}/{x}/{y}.png", 19]], attr: "© OpenStreetMap katkıcıları" },
};
export const MAP_STYLE = "osm"; // seçilen görünüm (Seyhun seçince değişecek)

// Leaflet haritasına görünümü koyar; kaynak yazısı Leaflet köşesinde değil, "i" düğmesinde
export function addStyle(L, map, key = MAP_STYLE) {
  const st = MAP_STYLES[key] || MAP_STYLES.osm;
  return st.layers.map(([url, nat]) => L.tileLayer(url, { maxZoom: 19, maxNativeZoom: nat }).addTo(map));
}
