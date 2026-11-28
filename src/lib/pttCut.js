// Bas konuşta parçayı nerede keseceğiz (Seyhun 2026-11-28 "2-3 saniye değil de o susma şeylerini hesaplayarak gönderelim"):
// sabit 2,5 sn yerine ses seviyesine bakılır. Konuşma sürerken parça büyür; kısa bir susmada (cümle bitti) parça kesilip hemen gider,
// konuşma devam edince yeni parça başlar. Kesme hep sessizliğe denk geldiği için kaydediciler arasındaki küçük boşluk kelime yemez.
// Saf hesap: pttTick(durum, seviye 0–1, şimdi) → "cut" (parçayı gönder) | "" (devam).
// Hiçbir parça atılmaz (2026-11-28 düzeltme): iPhone'da seviye ölçer açılamayıp hep 0 okuyunca konuşma sessizlik sanılıp
// bütün parçalar atılıyordu, sporcuya ses gitmiyordu. Konuşma duyulmayan parça artık eskisi gibi 2,5 sn'de gider.
export const PTT = {
  SIL_MS: 650, // bu kadar susma = cümle sonu
  MIN_MS: 1200, // bundan kısa parça kesilmez (tek kelimelik "Hadi" bile 1,2 sn'de gider)
  MAX_MS: 9000, // hiç susmadan konuşursa üst sınır: kısa bir duraksamada (250 ms) ya da 9 sn'de kesilir
  DIP_MS: 250,
  IDLE_MS: 2500, // konuşma duyulmayan parça (ya da ölçer çalışmıyorsa) eski sabit sürede gider
  VOICE_MIN: 0.06, // seviye bunun altındaysa her zaman sessizlik
  VOICE_MAX: 0.2, // bunun üstü her zaman konuşma
};

export function pttStart(s, now) {
  s.segAt = now;
  s.voice = false;
  s.lastVoice = 0;
  return s;
}

export function pttTick(s, v, now, P = PTT) {
  // Gürültü tabanı: sessiz odadan başlar, yavaşça yükselir, hemen düşer (rüzgâr/motor uğultusu bir süre sonra konuşma sayılmaz).
  // Eşik en çok P.VOICE_MAX: uzun konuşmada taban yükselse de konuşma hep konuşma sayılır.
  s.floor = s.floor == null ? P.VOICE_MIN / 3 : v < s.floor ? v : s.floor + (v - s.floor) * 0.01;
  const voice = v > Math.max(P.VOICE_MIN, Math.min(s.floor * 2.5, P.VOICE_MAX));
  if (voice) {
    s.voice = true;
    s.lastVoice = now;
  }
  const age = now - s.segAt;
  const quiet = now - s.lastVoice;
  if (!s.voice) return age >= P.IDLE_MS ? "cut" : "";
  if (age < P.MIN_MS) return "";
  if (quiet >= P.SIL_MS) return "cut";
  if (age >= P.MAX_MS && (quiet >= P.DIP_MS || age >= P.MAX_MS + 1500)) return "cut";
  return "";
}
