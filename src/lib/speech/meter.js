// Canlı ses ölçeri: dinlerken dalganın (ListenWave) okuduğu tek kaynak. İkinci mikrofon açılmaz:
// kayıt yolunda useSpeech'in konuşma bandı (170-4000 Hz) analizcisi paylaşılır, React yeniden çizimi olmadan
// ekran karesi başına okunur. Canlı yazı yolunda (Web Speech ses vermez) useSpeech'in yumuşatılmış seviyesi kullanılır.
const m = { an: null, buf: null, lvl: 0 };

// an boşsa ölçer kapanır; owner verilirse yalnız o analizci hâlâ bağlıysa (başka dinleme onu ezmesin)
export function setMeter(an, owner) {
  if (!an && owner && m.an !== owner) return;
  m.an = an || null;
  m.buf = an ? new Uint8Array(an.fftSize) : null;
  if (!an) m.lvl = 0;
}

export function setMeterLevel(v) {
  m.lvl = v || 0;
}

// 0-1 arası anlık seviye (RMS, useSpeech'teki ölçümle aynı ölçek)
export function readMeter() {
  if (!m.an) return m.lvl;
  try {
    m.an.getByteTimeDomainData(m.buf);
  } catch {
    return m.lvl;
  }
  let sum = 0;
  for (let i = 0; i < m.buf.length; i++) {
    const v = (m.buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / m.buf.length) * 4);
}
