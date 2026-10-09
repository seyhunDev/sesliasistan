// Konuşma algılama (kayıt yolu, iPhone ve Safari): mikrofon seviyesinden "konuşuyor mu, sustu mu" kararı.
// Ortam gürültüsü (rüzgâr, motor, deniz, uzaktan konuşma) sürekli "konuşuyor" sanılıp dinleme bitmiyordu.
// Şimdi gürültü tabanı son 3 saniyenin en sessiz anlarından ölçülür: sürekli gürültü birkaç saniyede taban olur,
// konuşmanın üstünde kalması gerekir. Konuşma başladıktan sonra kullanıcının kendi ses düzeyinin çok altındaki
// sesler (arkadaki konuşmalar) konuşma sayılmaz. Tek bir tık ya da çarpma konuşmayı başlatmaz.
const WIN = 30; // son 3 sn (100 ms adım)
const TALK = 60; // kullanıcının ses düzeyi için son 6 sn'lik konuşma adımı

// Konuşma bitişi (kayıt yolu): konuşma bittikten sonra bu kadar sessizlikte söylenen kendiliğinden gönderilir.
// Kısa tutulur (hız); kullanıcı ardından konuşmaya devam ederse söylediği öncekine eklenir (AssistantSheet `inflight`).
export const END_SILENCE = 1600; // ms (önceden 2300)
export const END_SILENCE_SHORT = 2000; // yalnız birkaç kelime söylendiyse (cümle yarım olabilir) biraz daha bekle (ms)
export const SHORT_TALK = 1500; // bundan kısa konuşma "kısa" sayılır (ms)
// Bu konuşmanın sonunda ne kadar sessizlik beklenir (ms)
export const endWait = (v) => (v.lastSpeech - v.voiceFrom < SHORT_TALK ? END_SILENCE_SHORT : END_SILENCE);
// Konuşuldu ve sustu: şimdi gönderilmeli mi
export const speechEnded = (v, now) => !!v.voiceSeen && now - v.lastSpeech >= endWait(v);

// Dokun-konuş-dokun-gönder (kayıt yolu): dinlerken söylenen ara ara yazıya çevrilip ekranda gösterilir.
// Yeni ara yazı ancak öncekinden PART_MS sonra, önceki istek bittiyse ve o arada yeniden konuşulduysa istenir.
export const PART_MS = 2000;
export const partialDue = (s, now) => !s.partBusy && !!s.voiceSeen && s.lastSpeech > (s.partFrom || 0) && now - (s.partAt || s.t0 || 0) >= PART_MS;

// Parça parça yazı (Seyhun: "kullanıcı bir şey söyledi, biraz bekledi, gönderelim ama mikrofon dinlemeye devam etsin;
// bütün metin kalmalı, yeni söylenenler gitmesin", 2026-10-09): kısa bir duraksamada (SEG_PAUSE) ya da uzun aralıksız
// konuşmada (SEG_MAX) o ana kadarki YENİ ses ayrı parça olarak yazıya çevrilir, parçalar sırayla eklenir. Dinleme sürer.
// Durdurunca bütün kayıt bir kez daha çevrilir (düzeltilmiş tam metin); o olmazsa parçalar gönderilir.
export const SEG_PAUSE = 700;
export const LIVE_EVERY = 2500; // konuşma algılanmasa da ara yazı bu sürede bir (useSpeech)
export const SEG_MAX = 3000; // aralıksız konuşmada da yazı 3 sn'de bir kutuya gelsin (Seyhun: "söylediklerim yazılmıyor", 2026-10-09)
export const segmentDue = (s, now) =>
  !!s.voiceSeen && (s.segBusy || 0) < 2 && s.lastSpeech > (s.segFrom || 0) && (now - s.lastSpeech >= SEG_PAUSE || now - (s.segFrom || s.voiceFrom || s.t0 || 0) >= SEG_MAX);
// Son yazı: tam kaydın çevirisi, ama parçaların toplamından belirgin kısaysa (bir kısmı düşmüş) parçalar
export const bestText = (full, parts) => {
  const f = String(full || "").trim();
  const p = String(parts || "").trim();
  if (!f) return p;
  return p && f.length < p.length * 0.6 ? p : f;
};

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)] || 0;
};

export function makeVad({ minLvl = 0.03 } = {}) {
  const hist = [];
  const talk = [];
  const v = { voiceSeen: false, voiceFrom: 0, lastSpeech: 0, floor: 0, gate: minLvl, run: 0 };
  // lvl: 0-1 ses seviyesi, now: ms. Döner: bu adımda konuşma var mı
  v.step = (lvl, now) => {
    hist.push(lvl);
    if (hist.length > WIN) hist.shift();
    const sorted = [...hist].sort((a, b) => a - b);
    v.floor = sorted[Math.floor(sorted.length * 0.15)] || 0;
    // Konuşma sırasında eşik biraz düşer (kısık heceler, cümle sonları kesilmesin) ama kullanıcının
    // kendi sesinin ~%30'unun (yaklaşık 10 dB altı) altındaki ses konuşma sayılmaz
    v.gate = v.voiceSeen ? Math.max(minLvl * 0.7, v.floor * 2, median(talk) * 0.3) : Math.max(minLvl, v.floor * 2.5);
    const on = lvl > v.gate;
    v.run = on ? v.run + 1 : 0;
    if (on && (v.voiceSeen || v.run >= 2)) {
      if (!v.voiceSeen) v.voiceFrom = now - 100;
      v.voiceSeen = true;
      v.lastSpeech = now;
      talk.push(lvl);
      if (talk.length > TALK) talk.shift();
      return true;
    }
    return false;
  };
  return v;
}
