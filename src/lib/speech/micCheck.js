// Mikrofon gerçekten ses veriyor mu (kayıt yolu, useSpeech).
// iPhone bazen mikrofonu "açık" gösterir ama hiç ses vermez: kayıt (MediaRecorder) boş kalır, ham ses toplanmaz,
// kullanıcı boşuna konuşur ve sonunda "Ses alınamadı" görür. Mikrofon açıldıktan MIC_CHECK_MS sonra bakılır:
// ne kayıttan parça (saniyede bir gelir) ne ham ses geldiyse mikrofon ölü sayılır, bir kez yeniden açılır.
export const MIC_CHECK_MS = 1800;
export const MIC_TRIES = 1; // kaç kez sessizce yeniden açılır; sonra hemen uyarılır
export const MIC_DEAD_TEXT = "Mikrofondan ses gelmiyor. Asistanı kapatıp yeniden aç; olmazsa mikrofonu kullanan başka bir uygulamayı kapat.";

// s: { micAt, chunks: [{ size }], pcmLen }; now: şimdiki zaman. "wait" henüz erken, "ok" ses geliyor, "dead" ses yok
// Ses gelir gelmez "ok" (dinlerken yeşil nokta hemen yanar)
export function micState(s, now) {
  if (!s?.micAt) return "wait";
  const bytes = (s.chunks || []).reduce((n, c) => n + (c?.size || 0), 0);
  if (bytes > 0 || (s.pcmLen || 0) > 0) return "ok";
  return now - s.micAt < MIC_CHECK_MS ? "wait" : "dead";
}
