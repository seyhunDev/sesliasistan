// Apple Watch (mobil/ios/App/VeloraSaat) tek sayacı yönetir: saatten gelen iş telefondaki sayaç kaydına uygulanır
// (training/Countdown.jsx ile aynı kurallar). Saf işlevler; IosBridge yazar ve saate durumu gönderir.
import { seqSteps } from "./raceLive";

// t: sayaç kaydı { dur, end, left, mode, zero, own, where, rid }; is: start | pause | resume | finish | add; sn: start'ta süre, add'de ±saniye.
// own/where: saatten başlatılan sayacın sahibi sayfa ve adı. Sonuç yeni kayıt ya da null (bu durumda yapılamaz).
export function watchTimerAct(t, is, { sn = 0, own = "", where = "", now = Date.now() } = {}) {
  const running = t.end != null;
  const up = running && t.end <= now;
  // Telefonda yarışa bağlanmış sayaç (rid) yarışın kaydını da değiştirir: saatte yalnız görünür
  if (t.rid && running) return null;
  if (is === "start") {
    const dur = Math.round(sn) > 0 ? Math.round(sn) : t.dur;
    return { dur, end: now + dur * 1000, left: null, mode: "start", zero: t.zero ?? null, own, where }; // antrenman günündeki gibi start dizisi
  }
  if (is === "pause") return running && !up ? { ...t, end: null, left: Math.max(1, Math.round((t.end - now) / 1000)) } : null;
  if (is === "resume") return !running && t.left != null ? { ...t, end: now + t.left * 1000, left: null } : null;
  if (is === "add") {
    if (!running || up) return null;
    const end = t.end + sn * 1000;
    return end - now >= 1000 ? { ...t, end } : null;
  }
  if (is === "finish") return running || t.left != null ? { dur: t.dur, end: null, left: null, zero: up ? t.end : (t.zero ?? null) } : null;
  return null;
}

// Saatin gösterdiği durum. title: sayacın adı; label: sayaç kapalıyken Başlat'ın üstünde (bugünkü antrenman).
// steps: yarış start dizisinin dakikaları (5 4 1 0), yalnız mode "start"; lock: telefondan yönetilir (yarışa bağlı)
export function watchTimerView(t, { label = "", now = Date.now() } = {}) {
  const running = t.end != null;
  const paused = !running && t.left != null;
  const title = t.where || (t.mode === "start" ? "Start" : "Sayaç");
  return {
    state: running ? "run" : paused ? "pause" : "idle",
    end: running ? t.end : 0,
    left: paused ? Math.round(t.left) : 0,
    dur: Math.round(t.dur || 300),
    title,
    label,
    steps: t.mode === "start" ? seqSteps(running || paused ? Math.max(t.dur, paused ? t.left : (t.end - now) / 1000) : t.dur).map((x) => x.m) : [],
    lock: !!(t.rid && running),
  };
}

// Bugünkü ilk antrenman: saatten başlatılan sayacın sahibi ve Başlat'ın üstündeki yazı ("Antrenman · bugün 16:00")
export function watchTraining(trainings, today) {
  const p = (trainings || []).find((x) => x.date === today);
  if (!p) return { own: "/training", where: "Antrenman", label: "" };
  const where = p.title || "Antrenman";
  return { own: `/training/day?id=${p.id}`, where, label: `${where} · bugün${p.time ? ` ${p.time}` : ""}` };
}
