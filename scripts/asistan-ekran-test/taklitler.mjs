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
