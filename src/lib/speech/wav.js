// Kaydı 16 kHz tek kanal WAV'a çevirir (iPhone "audio/mp4" kaydeder; WAV'ı hem Gemini hem OpenAI tanır).
// 16 kHz 16 bit: saniyede ~32 KB (90 sn en fazla ~2,9 MB).
const RATE = 16000;

export async function toWav16k(blob) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!AC || !OAC) throw new Error("ses çevrimi desteklenmiyor");
  const ctx = new AC();
  try {
    const ab = await blob.arrayBuffer();
    // Eski Safari geri çağırmalı, yeniler Promise döner: ikisini de destekle
    const audio = await new Promise((res, rej) => {
      const p = ctx.decodeAudioData(ab, res, rej);
      if (p?.then) p.then(res, rej);
    });
    const off = new OAC(1, Math.max(1, Math.ceil(audio.duration * RATE)), RATE);
    const src = off.createBufferSource();
    src.buffer = audio;
    // Rüzgâr ve motor uğultusu (konuşmanın altındaki çok pes sesler) atılır
    const hp = off.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 90;
    src.connect(hp);
    hp.connect(off.destination);
    src.start(0);
    const out = await new Promise((res, rej) => {
      off.oncomplete = (e) => res(e.renderedBuffer);
      const p = off.startRendering();
      if (p?.then) p.then(res, rej);
    });
    return encode(louder(trimQuiet(out.getChannelData(0))));
  } finally {
    try { ctx.close(); } catch {}
  }
}

const FRAME = RATE / 50; // 20 ms
const frameLevels = (x) => {
  const out = [];
  for (let i = 0; i + FRAME <= x.length; i += FRAME) {
    let sum = 0;
    for (let k = i; k < i + FRAME; k++) sum += x[k] * x[k];
    out.push(Math.sqrt(sum / FRAME));
  }
  return out;
};

// Baştaki ve sondaki sessizliği kırpar (0,4 sn pay bırakır): çeviri hızlanır, Whisper sessizlikte cümle uydurmaz.
// Konuşma bulunamazsa kayıt olduğu gibi kalır (sunucu karar verir).
export function trimQuiet(x) {
  const lv = frameLevels(x);
  if (lv.length < 10) return x;
  const floor = [...lv].sort((a, b) => a - b)[Math.floor(lv.length * 0.1)];
  const gate = Math.max(floor * 3, 0.01);
  const first = lv.findIndex((v) => v > gate);
  if (first < 0) return x;
  let last = lv.length - 1;
  while (last > first && lv[last] <= gate) last--;
  const pad = Math.round(RATE * 0.4);
  const a = Math.max(0, first * FRAME - pad);
  const b = Math.min(x.length, (last + 1) * FRAME + pad);
  return a === 0 && b === x.length ? x : x.slice(a, b);
}

// Kısık kaydı yükseltir (uzaktan ya da alçak sesle konuşma), en çok 6 kat; zaten yüksekse dokunmaz
export function louder(x) {
  let peak = 0;
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  if (!peak) return x;
  const g = Math.min(6, 0.9 / peak);
  if (g < 1.2) return x;
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] * g;
  return y;
}

function encode(samples) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, 1, true); // tek kanal
  v.setUint32(24, RATE, true);
  v.setUint32(28, RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}
