"use client";
import { authFetch } from "@/lib/authFetch";

import { useCallback, useEffect, useRef, useState } from "react";
import { isIOS, pickProvider } from "@/lib/speech/detect";
import { appAllowed, errorState, offMessage, permissionHelp, savePermission } from "@/lib/permissions";
import { pcmToWav16k, toWav16k } from "@/lib/speech/wav";
import { bestText, makeVad, segmentDue, speechEnded } from "@/lib/speech/vad";
import { speechMark } from "@/lib/assistTiming";
import { setMeter, setMeterLevel } from "@/lib/speech/meter";
import { micClosed, micOpening, micReset } from "@/lib/speech/audioSession";

const ERR = {
  "not-allowed": "Mikrofon ya da ses tanıma izni verilmedi. iPhone: Ayarlar › Safari › Mikrofon › İzin Ver.",
  "service-not-allowed": "Bu cihazda ses tanıma kapalı. iPhone: Ayarlar › Genel › Klavye › Dikte'yi Etkinleştir'i aç, ayrıca Ayarlar › Siri'de Siri'yi aç.",
  "no-speech": "Ses duyulmadı, tekrar dene.",
  "audio-capture": "Mikrofon bulunamadı.",
  network: "Ses tanıma için internet gerekli.",
  "language-not-supported": "Türkçe ses tanıma bu tarayıcıda desteklenmiyor.",
};
const FATAL = ["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported", "network"];
const NO_SPEECH = "Ses duyulmadı, tekrar dene.";
const MAX_SEC = 90; // güvenlik sınırı
const FINAL_WAIT = 700; // durdurunca son sonucu en fazla bu kadar bekle (ms)
const VOICE_LVL = 0.03; // kayıt yolunda "ses var" alt eşiği (ortam gürültüsüne göre yükselir, vad.js)
// Konuşma bitişi (1,6 sn; kısa konuşmada 2 sn) vad.js'te: END_SILENCE, speechEnded

// status: "idle" | "listening" | "transcribing"
// onFinal(text, mode): mode "send" (hemen gönder) | "edit" (metin kutuda kalsın)
// Varsayılan: dokun-konuş-dokun-gönder (ChatGPT/Claude gibi). Dinleme kullanıcı durdurana kadar sürer, söylenen
// dinlerken ekranda yazılır (kayıt yolunda ara ara sunucuda yazıya çevrilir), durdurunca gönderilir.
// start({ autoStop: ms, auto, quiet, endpoint: ms, handsFree }): autoStop kadar konuşulmazsa dinleme biter (0 = kapalı).
//   handsFree: kayıt yolunda konuşma bitince (END_SILENCE) kendiliğinden gönder (şimdilik kimse kullanmıyor).
//   endpoint: konuşma başladıktan sonra bu kadar sessizlikte söylenen kendiliğinden gönderilir (canlı sohbet; 0 = kapalı).
//   Kayıt yolunda bu zaten END_SILENCE ile yapılır; bu seçenek canlı yazı yolunda (Web Speech) da aynısını yapar.
//   auto: kendiliğinden başlatıldı (15 sn sessizlikte kapanır). quiet: hatalar gösterilmez
//   (yalnızca yanıt okunduktan sonra yeniden dinlemede; kullanıcı düğmeye bastıysa hata hep görünür).
//   Konuşulduysa metni gönderir, hiç konuşulmadıysa "ses duyulmadı" der.
// names: kişi adları (çalışanlar); ses çevirisine ipucu olarak gider ki doğru yazılsın
// terms: özel adlar (yarış adları gibi); aynı şekilde ipucu olur
// noLevel: ses seviyesi React durumuna yazılmaz (yalnız ölçere, meter.js); dinlerken saniyede 10 yeniden çizim olmaz
// onMiss(): dinleme metinsiz bitti (sessiz dinlemede de çağrılır; bekletilen yanıt uygulansın diye)
export function useSpeech({ onFinal, onFail, onMiss, lang = "tr-TR", names, terms, noLevel = false } = {}) {
  const [provider, setProvider] = useState(null);
  const [status, setStatus] = useState("idle");
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(null); // otomatik bitmeye kalan saniye (3 sn sessizlikten sonra)

  const R = useRef({ status: "idle", sid: 0 });
  const cb = useRef({});
  cb.current = { onFinal, onFail, onMiss, names, terms };
  const fail = (m) => {
    if (!R.current.silent) cb.current.onFail?.(m); // otomatik başlatılan dinlemede hata sessiz geçilir
    cb.current.onMiss?.();
  };
  const stopRef = useRef(null);

  const setSt = (v) => {
    R.current.status = v;
    setStatus(v);
  };

  const releaseAudio = () => {
    const s = R.current;
    clearInterval(s.timer);
    s.timer = null;
    clearTimeout(s.finalTimer);
    try { s.proc?.disconnect(); } catch {}
    s.proc = null;
    s.stream?.getTracks().forEach((t) => t.stop());
    s.stream = null;
    try { s.ctx?.close(); } catch {}
    s.ctx = null;
    if (s.analyser) setMeter(null, s.analyser);
    s.analyser = null;
    if (s.micOn) {
      s.micOn = false;
      micClosed(); // iPhone: ses oturumu bırakılır, arka plandaki ses (YouTube, müzik) devam eder
    }
  };

  const finish = () => {
    releaseAudio();
    setSt("idle");
    setFinalText("");
    setInterim("");
    setLevel(0);
    setElapsed(0);
    setRemaining(null);
  };

  const ticker = () => {
    const s = R.current;
    clearInterval(s.timer);
    s.t0 = Date.now();
    s.lvl = 0;
    s.timer = setInterval(() => {
      const now = Date.now();
      const sec = Math.floor((now - s.t0) / 1000);
      setElapsed(sec);

      let raw;
      if (s.analyser) {
        s.analyser.getByteTimeDomainData(s.buf);
        let sum = 0;
        for (let i = 0; i < s.buf.length; i++) {
          const v = (s.buf[i] - 128) / 128;
          sum += v * v;
        }
        raw = Math.min(1, Math.sqrt(sum / s.buf.length) * 4); // konuşma bandındaki ses seviyesi (kayıt yolu)
        if (raw > 0.001) s.meterLive = true; // ölçer çalışıyor (askıdaki ses motorunda hep 0 gelir)
        // Konuşuyor mu, sustu mu: gürültü tabanı ve kullanıcının ses düzeyine göre (vad.js)
        if (s.meterLive) {
          s.vad.step(raw, now);
          s.voiceSeen = s.vad.voiceSeen;
          s.voiceFrom = s.vad.voiceFrom;
          if (s.vad.voiceSeen) s.lastSpeech = s.vad.lastSpeech;
        }
      } else {
        // Web Speech ses seviyesi vermez: yeni kelime geldiğinde dalga hareketlenir
        raw = now - (s.lastAct || 0) < 400 ? 0.35 + Math.random() * 0.5 : 0.05 + Math.random() * 0.05;
      }
      s.lvl = s.lvl * 0.55 + raw * 0.45; // yumuşatma: dalga titremesin
      if (!noLevel) setLevel(s.lvl);
      if (!s.analyser) setMeterLevel(s.lvl);

      if (s.status !== "listening") return;
      if (sec >= MAX_SEC) {
        stopRef.current?.("send");
        return;
      }
      // Kayıt yolu, eller serbest: konuşuldu ve sustu, kendiliğinden gönder
      if (s.handsFree && s.kind === "server" && speechEnded(s, now)) {
        stopRef.current?.("send");
        return;
      }
      // Kayıt yolu: söylenen ara ara yazıya çevrilip gösterilir (gönderme yine kullanıcının dokunuşuyla)
      if (s.kind === "server" && s.pcmLen && segmentDue(s, now)) liveSegment(s.sid);
      // Canlı yazı yolu, canlı sohbet: konuşma bitti (yeni kelime gelmiyor), kendiliğinden gönder.
      // Kısa duraksamada kelimeler gelmeye devam ettiği için kesilmez.
      if (s.endpoint > 0 && s.kind === "webspeech" && s.text && now - s.lastSpeech >= s.endpoint) {
        stopRef.current?.("send");
        return;
      }
      if (s.autoStop > 0) {
        const silent = now - Math.max(s.lastSpeech || 0, s.t0);
        setRemaining(silent >= 3000 ? Math.max(0, Math.ceil((s.autoStop - silent) / 1000)) : null);
        if (silent >= s.autoStop) {
          // Kayıt yolunda ses ölçer yanılabilir (sessiz mikrofon, askıdaki ses motoru): kaydı atma, sunucu karar versin
          if (s.text || s.voiceSeen || s.kind === "server") stopRef.current?.("send"); // konuşulmuştu: gönder
          else {
            cancelNow(); // hiç konuşulmadı: kapat
            fail(NO_SPEECH);
          }
        }
      } else setRemaining(null);
    }, 100);
  };

  // Sonucu teslim et (bir kez): eldeki metinle devam eder
  const deliver = (sid, mode) => {
    const s = R.current;
    if (s.sid !== sid || s.delivered) return;
    s.delivered = true;
    const text = s.text;
    const err = s.error;
    const rec = s.rec;
    s.rec = null;
    try { rec?.abort(); } catch {}
    finish();
    if (text) {
      speechMark("text");
      cb.current.onFinal?.(text, mode);
    } else fail(ERR[err] || NO_SPEECH);
  };

  // ---- Yol 1: tarayıcı ses tanıması, canlı yazı ----
  const startWebSpeech = (sid) => {
    const s = R.current;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    s.restarts = 0;
    s.base = ""; // önceki oturumlardan biriken metin

    const begin = () => {
      s.begunAt = Date.now();
      s.gotResult = false;
      const rec = new SR();
      rec.lang = lang;
      rec.interimResults = true;
      rec.continuous = !isIOS(); // iOS'ta sürekli mod güvenilmez, cümle sonunda kendiliğinden biter
      rec.maxAlternatives = 1;
      s.rec = rec;
      s.error = null;

      rec.onresult = (e) => {
        if (s.sid !== sid || s.rec !== rec) return;
        let f = "";
        let i = "";
        for (let k = 0; k < e.results.length; k++) {
          const res = e.results[k];
          if (res.isFinal) f += res[0].transcript;
          else i += res[0].transcript;
        }
        s.gotResult = true;
        s.emptyEnds = 0;
        const pre = s.base ? `${s.base} ` : "";
        const full = `${pre}${f}${i}`.trim();
        if (full !== s.text) s.lastSpeech = Date.now();
        s.text = full;
        s.lastAct = Date.now();
        setFinalText(`${pre}${f}`);
        setInterim(i);
      };
      rec.onerror = (e) => {
        if (s.sid === sid && s.rec === rec) s.error = e.error;
        if (e.error === "not-allowed") savePermission("microphone", "denied");
      };
      rec.onend = () => {
        if (s.sid !== sid || s.rec !== rec) return;
        // Hiç sonuç vermeden hemen biten oturumlar (iPhone'da tanıma başlamadıysa): sonsuz döngüde "Dinliyorum"da kalma
        if (!s.gotResult && Date.now() - s.begunAt < 1500) s.emptyEnds = (s.emptyEnds || 0) + 1;
        if (s.emptyEnds >= 3 && !s.text) {
          s.rec = null;
          finish();
          fail(ERR[s.error] || "Ses tanıma başlamadı. iPhone'da Ayarlar › Genel › Klavye › Dikte'yi aç ya da tekrar dene.");
          return;
        }
        // Motor kendiliğinden bitirdiyse (sessizlik, cümle sonu) ve kullanıcı hâlâ dinleniyorsa yeniden başlat
        if (s.status === "listening" && !FATAL.includes(s.error) && s.restarts < 80 && Date.now() - s.t0 < MAX_SEC * 1000) {
          s.restarts += 1;
          s.base = s.text;
          setTimeout(() => {
            if (s.sid === sid && s.status === "listening") begin();
          }, 120);
          return;
        }
        deliver(sid, s.mode || "send");
      };
      try {
        rec.start();
      } catch {
        if (s.text) deliver(sid, s.mode || "send");
        else {
          finish();
          fail("Ses tanıma başlatılamadı.");
        }
      }
    };
    begin();
  };

  // Kayıt yolunun ham sesi (Float32 parçaları) → [from, to) aralığı tek dizi
  const pcmRange = (s, from, to) => {
    const out = new Float32Array(Math.max(0, to - from));
    let pos = 0;
    for (const c of s.pcm) {
      const end = pos + c.length;
      if (end > from && pos < to) {
        const a = Math.max(from, pos);
        const b = Math.min(to, end);
        out.set(c.subarray(a - pos, b - pos), a - from);
      }
      pos = end;
      if (pos >= to) break;
    }
    return out;
  };
  const segText = (s) => s.segs.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();

  // Kayıt yolunda parça yazı: son kesimden bu yana söylenen yeni ses yazıya çevrilir ve öncekilere eklenir (yazı kutusunda
  // görünür, gönderilmez). Mikrofon dinlemeye devam eder; parçalar sırayla dizilir, geç gelen öncekinin yerini almaz.
  const liveSegment = async (sid) => {
    const s = R.current;
    const from = s.segPos || 0;
    const to = s.pcmLen;
    s.segFrom = Date.now();
    if (to - from < (s.rate || 16000) * 0.4) return; // yarım saniyeden kısa: sonrakiyle birlikte gider
    const i = s.segs.length;
    s.segs.push("");
    s.segPos = to;
    s.segBusy = (s.segBusy || 0) + 1;
    try {
      const wav = await pcmToWav16k(pcmRange(s, from, to), s.rate);
      if (s.sid !== sid || s.status !== "listening") return;
      const fd = new FormData();
      fd.append("audio", wav, "parca.wav");
      fd.append("partial", "1");
      if (cb.current.names?.length) fd.append("names", cb.current.names.join(","));
      if (cb.current.terms?.length) fd.append("terms", cb.current.terms.join("|"));
      const res = await authFetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (s.sid !== sid || s.status === "idle") return;
      if (res.ok && data.text) {
        s.segs[i] = data.text;
        s.partial = segText(s);
        setFinalText(s.partial);
      }
    } catch {
    } finally {
      if (s.sid === sid) s.segBusy = Math.max(0, (s.segBusy || 1) - 1);
    }
  };

  // ---- Yol 2: kayıt + sunucuda çeviri ----
  const startServer = async (sid) => {
    const s = R.current;
    const alive = () => s.sid === sid;
    let stream;
    if (!s.micOn) {
      s.micOn = true;
      micOpening();
    }
    try {
      const ask = () => navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      try {
        stream = await ask();
      } catch (e) {
        // İzin reddi değilse (iPhone ses oturumu takılı, mikrofon başka işte): oturumu sıfırla, bir kez daha dene
        if (errorState(e) === "denied") throw e;
        micReset();
        await new Promise((r) => setTimeout(r, 300));
        stream = await ask();
      }
      savePermission("microphone", "granted");
    } catch (e) {
      const st = errorState(e);
      if (st !== "error") savePermission("microphone", st);
      if (!alive()) return;
      finish();
      fail(st === "denied" ? `Mikrofon izni verilmedi. ${permissionHelp("microphone")}` : ERR["audio-capture"]);
      return;
    }
    if (!alive()) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    s.stream = stream;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      ctx.resume?.().catch(() => {}); // iPhone'da askıda başlayabilir: seviye ölçümü için uyandır
      const an = ctx.createAnalyser();
      an.fftSize = 2048; // ~45 ms'lik pencere: tek bir an değil, hece boyu ölçülür
      // Ölçüm yalnız konuşma bandında (170-4000 Hz): rüzgâr uğultusu, motor ve dalga sesi "konuşma" sayılmasın
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 170;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 4000;
      const src = ctx.createMediaStreamSource(stream);
      src.connect(hp);
      // Ham ses de toplanır: dinlerken parça parça yazıya çevrilsin (liveSegment), kayıt boş gelirse son çeviri bundan
      try {
        const proc = ctx.createScriptProcessor(4096, 1, 1);
        s.pcm = [];
        s.pcmLen = 0;
        s.rate = ctx.sampleRate;
        proc.onaudioprocess = (e) => {
          e.outputBuffer.getChannelData(0).fill(0); // hoparlöre ses gitmez
          if (!alive() || s.status !== "listening") return;
          const d = new Float32Array(e.inputBuffer.getChannelData(0));
          s.pcm.push(d);
          s.pcmLen += d.length;
        };
        src.connect(proc);
        proc.connect(ctx.destination);
        s.proc = proc;
      } catch {}
      hp.connect(lp);
      lp.connect(an);
      s.ctx = ctx;
      s.analyser = an;
      s.buf = new Uint8Array(an.fftSize);
      setMeter(an);
    } catch {}

    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const type = mr.mimeType || mime || "audio/webm";
    const chunks = [];
    s.mr = mr;
    mr.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
    mr.onstop = async () => {
      if (!alive()) return;
      const mode = s.mode || "send";
      releaseAudio();
      const blob = new Blob(chunks, { type });
      // Kendiliğinden açılan dinlemede hiç konuşulmadıysa (ölçer çalışıyor ve ses yok) kayıt gönderilmez:
      // Whisper sessizlikte "İzlediğiniz için teşekkür ederim" gibi cümle uydurur, asistan bunu komut sanır
      if (s.auto && s.meterLive && !s.voiceSeen) {
        finish();
        fail(NO_SPEECH);
        return;
      }
      // iPhone'da kayıt (MediaRecorder) bazen boş ya da bozuk gelir: aynı anda toplanan ham sesten WAV yapılır
      const fromPcm = async () => (s.pcmLen > (s.rate || 16000) * 0.3 ? pcmToWav16k(pcmRange(s, 0, s.pcmLen), s.rate) : null);
      let upload = blob;
      let name = `kayit.${type.includes("mp4") ? "m4a" : "webm"}`;
      if (blob.size < 1500) {
        upload = await fromPcm().catch(() => null);
        name = "kayit.wav";
        if (!alive()) return;
        if (!upload) {
          finish();
          if (s.partial) cb.current.onFinal?.(s.partial, mode);
          else fail("Ses alınamadı, tekrar dene.");
          return;
        }
      }
      try {
        // WAV'a çevir (her sağlayıcı tanır); olmazsa ham sesten, o da olmazsa özgün kaydı gönder
        if (upload === blob) {
          try {
            upload = await toWav16k(blob);
            name = "kayit.wav";
          } catch {
            const w = await fromPcm().catch(() => null);
            if (w) (upload = w), (name = "kayit.wav");
          }
        }
        if (!alive()) return;
        const fd = new FormData();
        fd.append("audio", upload, name);
        if (cb.current.names?.length) fd.append("names", cb.current.names.join(","));
        if (cb.current.terms?.length) fd.append("terms", cb.current.terms.join("|"));
        speechMark("upload");
        let res = await authFetch("/api/transcribe", { method: "POST", body: fd });
        // Servis bir anlık hata verdiyse (kota değil) bir kez daha denenir
        if (!res.ok && res.status >= 500 && alive()) res = await authFetch("/api/transcribe", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!alive()) return;
        if (!res.ok) throw new Error(data.error || "Ses yazıya çevrilemedi, tekrar dene.");
        finish();
        const text = bestText(data.text, s.partial);
        if (text) {
          speechMark("text");
          cb.current.onFinal?.(text, mode);
        } else fail("Ses anlaşılamadı, tekrar dene.");
      } catch (e) {
        if (!alive()) return;
        finish();
        // Son çeviri olmadıysa dinlerken gösterilen yazıyla devam
        if (s.partial) cb.current.onFinal?.(s.partial, mode);
        else fail(e.message);
      }
    };
    mr.start();
    if (s.stopReq) mr.stop(); // parmak izin ekranı sırasında kalktıysa
  };

  const cancelNow = () => {
    const s = R.current;
    if (s.status === "idle") return;
    s.sid += 1; // eski işlemin geri dönüşlerini yok say
    const rec = s.rec;
    s.rec = null;
    try { rec?.abort(); } catch {}
    try { if (s.mr && s.mr.state !== "inactive") s.mr.stop(); } catch {}
    s.mr = null;
    finish();
  };

  const start = useCallback((opts = {}) => {
    const s = R.current;
    if (s.status !== "idle") return;
    s.silent = !!opts.quiet;
    if (!appAllowed("microphone")) {
      fail(offMessage("microphone"));
      return;
    }
    if (!window.isSecureContext) {
      fail("Mikrofon için HTTPS gerekir. Tünel adresini (https://…) kullan.");
      return;
    }
    const kind = pickProvider();
    if (kind === "none") {
      fail("Bu tarayıcıda ses kaydı yok. Yazarak ekleyebilirsin.");
      return;
    }
    s.sid += 1;
    const sid = s.sid;
    Object.assign(s, {
      kind, text: "", base: "", error: null, lastAct: 0, lastSpeech: 0, voiceSeen: false, voiceFrom: 0, analyser: null, emptyEnds: 0, vad: makeVad({ minLvl: VOICE_LVL }),
      meterLive: false, auto: !!opts.auto, stopReq: false, mr: null, rec: null, mode: "send", delivered: false, autoStop: opts.autoStop || (opts.auto ? 15000 : 0), restarts: 0,
      endpoint: opts.endpoint || 0, handsFree: !!opts.handsFree, pcm: null, pcmLen: 0, proc: null, partial: "", segs: [], segPos: 0, segBusy: 0, segFrom: 0,
    });
    setFinalText("");
    setInterim("");
    setLevel(0);
    setRemaining(null);
    setProvider(kind);
    setSt("listening");
    speechMark("listen"); // süre kaydı (assistTiming)
    ticker();
    if (kind === "webspeech") startWebSpeech(sid);
    else startServer(sid);
    navigator.vibrate?.(12);
    window.dispatchEvent(new Event("sa-stop-tts")); // konuşan yanıt susar, mikrofon onu duymasın
  }, []);

  const stop = useCallback((mode = "send") => {
    const s = R.current;
    if (s.status !== "listening") return;
    const m = mode === "edit" ? "edit" : "send";
    if (Date.now() - s.t0 < 600 && !s.text) {
      cancelNow();
      fail("Çok kısa, tekrar dene.");
      return;
    }
    s.mode = m;
    speechMark("voiceEnd", s.lastSpeech || 0);
    speechMark("stop");
    setSt("transcribing");
    if (s.kind === "webspeech") {
      const sid = s.sid;
      try { s.rec?.stop(); } catch {}
      s.finalTimer = setTimeout(() => deliver(sid, m), FINAL_WAIT); // son sonuç gecikirse eldeki metinle devam
    } else if (s.mr && s.mr.state !== "inactive") s.mr.stop();
    else s.stopReq = true;
  }, []);
  stopRef.current = stop;

  const cancel = useCallback(() => cancelNow(), []);
  const setAutoStop = useCallback((ms) => {
    R.current.autoStop = ms;
  }, []);
  // Kullanıcı şu an konuşuyor mu (ses duyuldu ya da söylenen yazıya çevriliyor): yanıt bekletilir, sözü kesilmez
  const talking = useCallback(() => {
    const s = R.current;
    return s.status === "transcribing" || (s.status === "listening" && (!!s.voiceSeen || !!s.text));
  }, []);

  useEffect(() => {
    setProvider(pickProvider());
    return () => cancelNow();
  }, []);

  return { provider, status, finalText, interim, level, elapsed, remaining, start, stop, cancel, setAutoStop, talking };
}
