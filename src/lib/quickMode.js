// Hazır cevaplar (Ayarlar › Öğrenme): açıkken kısa komutlar ve özet soruları ("bugün ne var", "notlarımı oku", hazır
// kalıplar) yapay zekaya gitmeden telefonda cevaplanır. Varsayılan kapalı (Seyhun 2026-10-21: "uygulama içinde cevaplar
// doğru olmuyor, yapay zekaya gönderelim; öğrenme belirli bir seviyeye ulaşınca uygulamayı dahil ederiz, şimdilik
// ayarlarda bir düğmeyle"). Kapalıyken de öğrenme ve hızlı kalıp ölçümü sürer. Bu cihazda saklanır.
const KEY = "sa-quick";

export function quickOn() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setQuick(on) {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {}
}
