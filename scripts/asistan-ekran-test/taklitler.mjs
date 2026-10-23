// Tarayıcıya sayfa açılmadan önce eklenen taklitler: telefonun ses tanıması (SpeechRecognition), sesli okuma
// (speechSynthesis), ana ekran uygulaması (iPhone, navigator.standalone). Test bunları window.__t ile sürer.
// Yapay zeka ve ses uçları (/api/assistant, /api/tasks, /api/transcribe, /api/tts…) senaryolar.mjs'te ağdan taklit edilir:
// hiçbir istek gerçek yapay zekaya gitmez.

export const INIT = ({ standalone = false, sha = "" } = {}) => `(() => {
  const T = (window.__t = { srStarts: 0, said: [], spoken: [], sr: null, speakMs: 900 });
  ${sha ? `try {
    localStorage.setItem("sa-build", ${JSON.stringify(sha)}); // "Güncellendi" notu çıkmasın (ayrı senaryoda sınanır)
  } catch {}` : ""}
  ${standalone ? `
  // iPhone ana ekran uygulaması: telefonun tanıması varsayılan kapalı, kayıt + sunucu yolu (#503)
  Object.defineProperty(navigator, "standalone", { get: () => true });
  ` : ""}
  class FakeSR {
    constructor() {
      this.lang = "";
      this.continuous = false;
      this.interimResults = false;
    }
    start() {
      T.srStarts++;
      T.sr = this;
      setTimeout(() => this.onstart && this.onstart(), 5);
    }
    stop() {
      if (T.sr !== this) return;
      T.sr = null;
      setTimeout(() => this.onend && this.onend(), 30);
    }
    abort() {
      this.stop();
    }
    emit(text, final) {
      const r = [{ transcript: text }];
      r.isFinal = !!final;
      this.onresult && this.onresult({ resultIndex: 0, results: [r] });
    }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
  // Kullanıcı konuşur: önce yarım (canlı yazı), sonra tam sonuç
  T.say = (text) => {
    if (!T.sr) return false;
    const words = text.split(" ");
    T.sr.emit(words.slice(0, Math.max(1, words.length - 1)).join(" "), false);
    T.sr.emit(text, true);
    T.said.push(text);
    return true;
  };

  // Sesli okuma: söylenen metin kaydedilir, kısa süre "konuşur"
  let timers = [];
  const synth = {
    speaking: false,
    paused: false,
    pending: false,
    speak(u) {
      T.spoken.push(u.text);
      synth.speaking = true;
      timers.push(setTimeout(() => u.onstart && u.onstart({}), 30));
      timers.push(setTimeout(() => {
        synth.speaking = false;
        u.onend && u.onend({});
      }, T.speakMs));
    },
    cancel() {
      timers.forEach(clearTimeout);
      timers = [];
      synth.speaking = false;
    },
    pause() {},
    resume() {},
    getVoices: () => [{ lang: "tr-TR", name: "Yelda", voiceURI: "tr-yelda", localService: true, default: true }],
    addEventListener() {},
    removeEventListener() {},
  };
  Object.defineProperty(window, "speechSynthesis", { get: () => synth });
  window.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
      this.lang = "";
      this.voice = null;
      this.rate = 1;
      this.pitch = 1;
      this.volume = 1;
    }
  };
})();`;

// Kameralar (/api/cams) taklit cevabı: lib/cams.js camList biçiminde; görüntüler data: SVG (dış adreslere gidilmez)
const pic = (sky, sea) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225"><rect width="400" height="130" fill="${sky}"/><rect y="130" width="400" height="95" fill="${sea}"/></svg>`)}`;
const cam = (id, title, km, min, live = false) => ({ id: String(id), title, lat: 39, lon: 26.8, at: Date.now() - min * 60e3, thumb: pic("#b9d6e6", "#3b7da0"), preview: pic(id % 2 ? "#9cc7de" : "#c7dbe6", id % 2 ? "#2f6f93" : "#356f8c"), player: "", live, link: `https://www.windy.com/webcams/${id}`, km });
export const CAMS = {
  cams: [
    cam(1, "Ayvalık · Cunda koyu", 27, 2, true),
    cam(2, "Bergama · Akropol", 31, 5),
    cam(3, "Midilli · Molivos", 34, 1),
    cam(4, "Çandarlı limanı", 38, 8),
    cam(5, "Midilli · Limanı", 45, 3),
    cam(6, "Foça · Sirenler", 52, 4),
    cam(7, "Altınova sahil", 58, 12),
    cam(8, "Karşıyaka sahil", 79, 6),
    cam(9, "İzmir · Kordon", 83, 2),
  ],
};

// Deniz trafiği (/api/sea) taklit cevabı: lib/sea.js shipList biçiminde
const ship = (m, n, type, lat, lon, sog, cog, key, label, port, km, extra = {}) => ({ m, n, t: 0, type, lat, lon, sog, cog, dest: "", seen: Date.now(), guard: false, state: { key, label, port, km, ...extra } });
export const SEA = {
  at: Date.now(),
  ships: [
    ship(1, "Ayvalık Ferry", "Yolcu", 39.03, 26.8, 11.2, 60, "approach", "Yanaşıyor", "Dikili", 6.2, { min: 20 }),
    ship(2, "Mavi Rüzgar", "Yat", 39.06, 26.87, 6.4, 240, "leave", "Ayrılıyor", "Dikili", 1.4),
    { ...ship(3, "Nordic Star", "Tanker", 38.95, 26.75, 12.8, 160, "underway", "Seyirde", "Çandarlı", 12.1), dest: "ALIAGA" },
    ship(4, "Seher K", "Kuru yük", 39.1, 26.8, 0, null, "ready", "Kalkacak", "Dikili", 7.9),
    ship(5, "Delta Pioneer", "Tanker", 39.12, 26.82, 0, null, "anchor", "Demirde", "Dikili", 7.6),
    { ...ship(6, "TCSG 309", "Kolluk", 39.07, 26.88, 0, null, "moored", "Limanda", "Dikili", 0.3), guard: true },
    ship(7, "Deniz Yıldızı", "Balıkçı", 39.071, 26.886, 0, null, "moored", "Limanda", "Dikili", 0.1),
  ],
};
