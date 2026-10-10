"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { athleteNames } from "@/features/athletes/data";
import { useSpeech } from "@/hooks/useSpeech";
import { authFetch } from "@/lib/authFetch";
import { isIOS, isStandalone, webSpeechAvailable } from "@/lib/speech/detect";
import { toWav16k } from "@/lib/speech/wav";

// Ses testi: telefonda konuşmayı yazıya çeviren üç yolu yan yana dener (Ayarlar › Diğer ayarlar › Ses testi).
// A şimdiki yol (kayıt + sunucu, canlı parçalar), B Gemini Live (WebSocket akışı), C telefonun kendi tanıması
// (+ isteğe bağlı aynı anda kayıt ve tek seferde Gemini düzeltmesi). Hiçbir şey kaydedilmez, sonuç kopyalanır.

const sec = (ms) => (ms == null ? "–" : `${(ms / 1000).toFixed(1)} sn`);

function Card({ title, sub, on, onStart, onStop, first, text, extra, err, note }) {
  return (
    <section className="mt-4 rounded-2xl bg-card px-4 py-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <div className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <b className="block text-[1rem] font-semibold">{title}</b>
          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-mut">{sub}</span>
        </span>
        <button type="button" onClick={on ? onStop : onStart} className={`shrink-0 rounded-full px-4 py-2 text-[0.875rem] font-semibold text-white ${on ? "bg-rec" : "bg-acc"}`}>
          {on ? "Durdur" : "Başlat"}
        </button>
      </div>
      <p className="mt-3 min-h-[3rem] rounded-xl bg-bg px-3 py-2 text-[0.9375rem] leading-snug">{text || <span className="text-mut">{on ? "Konuş…" : "Henüz yazı yok"}</span>}</p>
      {extra}
      <p className="mt-2 text-[0.8125rem] text-mut">İlk yazı: {sec(first)}{note ? ` · ${note}` : ""}</p>
      {err && <p className="mt-1 text-[0.8125rem] text-rec">{err}</p>}
    </section>
  );
}

// A: uygulamanın şimdiki yolu (useSpeech; iPhone'da kayıt + canlı parçalar sunucuda)
function Current({ report }) {
  const t = useRef({ t0: 0, first: null });
  const [first, setFirst] = useState(null);
  const [last, setLast] = useState("");
  const end = (text, err) => {
    if (t.current.ended) return;
    t.current.ended = true;
    setFirst(t.current.first);
    setLast(text);
    report("A", { first: t.current.first, text, err, note: sp.provider });
  };
  const sp = useSpeech({ names: athleteNames(), noLevel: true, onFinal: (x) => end(x, ""), onFail: (e) => end("", String(e?.message || e || "hata")), onMiss: () => end("", "metin gelmedi") });
  const text = `${sp.finalText || ""} ${sp.interim || ""}`.trim();
  useEffect(() => {
    if (text && t.current.first == null && t.current.t0) t.current.first = Date.now() - t.current.t0;
  }, [text]);
  const on = sp.status !== "idle";
  return (
    <Card
      title="A · Şimdiki yöntem"
      sub="Kayıt + sunucu (iPhone'da canlı parçalar Gemini/Whisper ile)."
      on={on}
      onStart={() => {
        t.current = { t0: Date.now(), first: null };
        setFirst(null);
        setLast("");
        sp.start();
      }}
      onStop={() => sp.stop()}
      first={first}
      text={text || last}
      note={`${sp.provider} · ${sp.status}`}
    />
  );
}

// 16 kHz tek kanal 16 bit PCM (Gemini Live'ın istediği biçim), base64
function pcm16(input, rate) {
  const ratio = rate / 16000;
  const n = Math.floor(input.length / ratio);
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}
function b64(int16) {
  const bytes = new Uint8Array(int16.buffer);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const wsText = async (d) => (typeof d === "string" ? d : d instanceof Blob ? d.text() : new TextDecoder().decode(d));

const LIVE_URL = "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained";

// Bir modelle bağlantı kurar; kurulum tamamlanınca açık soketi döndürür, olmazsa hata fırlatır
function openLive(token, model, onMsg) {
  return new Promise((ok, fail) => {
    const ws = new WebSocket(`${LIVE_URL}?access_token=${encodeURIComponent(token)}`);
    let ready = false;
    const timer = setTimeout(() => {
      ws.close();
      fail(new Error(`${model}: 8 sn içinde hazır olmadı`));
    }, 8000);
    ws.onopen = () => {
      const audio = /native-audio/.test(model);
      ws.send(
        JSON.stringify({
          setup: {
            model: `models/${model}`,
            generationConfig: { responseModalities: [audio ? "AUDIO" : "TEXT"] },
            inputAudioTranscription: {},
            systemInstruction: { parts: [{ text: "Sadece dinle. Hiçbir zaman cevap verme." }] },
          },
        }),
      );
    };
    ws.onmessage = async (e) => {
      let m;
      try {
        m = JSON.parse(await wsText(e.data));
      } catch {
        return;
      }
      if (m.setupComplete && !ready) {
        ready = true;
        clearTimeout(timer);
        ok(ws);
        return;
      }
      onMsg(m);
    };
    ws.onclose = (e) => {
      clearTimeout(timer);
      if (!ready) fail(new Error(`${model}: kapandı ${e.code} ${e.reason || ""}`.trim()));
    };
  });
}

// B: Gemini Live, ses parça parça akar, yazı geldikçe görünür (Claude uygulaması gibi)
function Live({ report }) {
  const s = useRef({});
  const [on, setOn] = useState(false);
  const [text, setText] = useState("");
  const [first, setFirst] = useState(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  function finish(why) {
    const x = s.current;
    if (x.closed) return;
    x.closed = true;
    try {
      x.proc?.disconnect();
      x.src?.disconnect();
    } catch {}
    x.stream?.getTracks().forEach((t) => t.stop());
    x.ctx?.close().catch(() => {});
    try {
      x.ws?.close();
    } catch {}
    setOn(false);
    if (why) setErr(why);
    report("B", { first: x.first ?? null, text: x.text || "", note: x.model || "", err: why || x.err || "" });
  }

  async function start() {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC(); // dokunuşun içinde: iPhone sesi ancak böyle açar
    ctx.resume().catch(() => {});
    const x = { ctx, t0: Date.now(), text: "", closed: false };
    s.current = x;
    setOn(true);
    setText("");
    setFirst(null);
    setErr("");
    setNote("anahtar alınıyor…");
    try {
      const streamP = navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      const res = await authFetch("/api/live-token", { method: "POST", timeout: 10000 });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.token) throw new Error(j.error ? `${j.error}${j.detail ? ` · ${j.detail}` : ""}` : `Anahtar alınamadı (${res.status})`);
      x.stream = await streamP;
      if (x.closed) return x.stream.getTracks().forEach((t) => t.stop());
      const onMsg = (m) => {
        const t = m.serverContent?.inputTranscription?.text;
        if (t) {
          if (x.first == null) {
            x.first = Date.now() - x.t0;
            setFirst(x.first);
          }
          x.text += t;
          setText(x.text);
        }
        if (m.error) x.err = JSON.stringify(m.error).slice(0, 200);
      };
      const tried = [];
      for (const model of j.models || []) {
        setNote(`${model} bağlanıyor…`);
        try {
          x.ws = await openLive(j.token, model, onMsg);
          x.model = model;
          break;
        } catch (e) {
          tried.push(e.message);
        }
        if (x.closed) return;
      }
      if (!x.ws) throw new Error(tried.join(" | ") || "Model yok");
      x.ws.onclose = (e) => !x.closed && finish(`Bağlantı kapandı ${e.code} ${e.reason || ""}`.trim());
      setNote(`${x.model} · dinliyor`);
      x.src = ctx.createMediaStreamSource(x.stream);
      x.proc = ctx.createScriptProcessor(4096, 1, 1);
      x.proc.onaudioprocess = (e) => {
        if (x.ws?.readyState !== 1) return;
        const pcm = pcm16(e.inputBuffer.getChannelData(0), ctx.sampleRate);
        x.ws.send(JSON.stringify({ realtimeInput: { audio: { data: b64(pcm), mimeType: "audio/pcm;rate=16000" } } }));
      };
      x.src.connect(x.proc);
      x.proc.connect(ctx.destination);
    } catch (e) {
      finish(e.message || String(e));
    }
  }

  function stop() {
    const x = s.current;
    try {
      if (x.ws?.readyState === 1) x.ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    } catch {}
    try {
      x.proc?.disconnect();
    } catch {}
    setNote(`${x.model || ""} · son yazı bekleniyor`);
    setTimeout(() => finish(""), 1500);
  }

  return <Card title="B · Gemini Live (akış)" sub="Ses durmadan Google'a akar, söylenen kelime kelime gelir." on={on} onStart={start} onStop={stop} first={first} text={text} err={err} note={note} />;
}

// C: telefonun kendi tanıması (Safari); istenirse aynı anda kayıt + bitince tek seferde Gemini düzeltmesi
function Native({ report }) {
  const s = useRef({});
  const [on, setOn] = useState(false);
  const [rec, setRec] = useState(true);
  const [text, setText] = useState("");
  const [fixed, setFixed] = useState(null);
  const [first, setFirst] = useState(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  async function fix(x) {
    if (!x.chunks?.length) return x.done({ fixed: "" });
    setNote("Gemini düzeltiyor…");
    const t = Date.now();
    try {
      const wav = await toWav16k(new Blob(x.chunks, { type: x.mime || "audio/mp4" }));
      const fd = new FormData();
      fd.append("audio", wav, "ses.wav");
      fd.append("names", athleteNames().join(","));
      const res = await authFetch("/api/transcribe", { method: "POST", body: fd, timeout: 20000 });
      const j = await res.json().catch(() => ({}));
      const f = { text: j.text || "", ms: Date.now() - t, by: j.provider || j.error || res.status };
      setFixed(f);
      setNote("");
      x.done({ fixed: `${f.text} (${sec(f.ms)}, ${f.by})` });
    } catch (e) {
      setNote("");
      setErr(`Düzeltme: ${e.message}`);
      x.done({ fixed: `hata: ${e.message}` });
    }
  }

  function start() {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    setText("");
    setFixed(null);
    setFirst(null);
    setErr("");
    setNote("");
    if (!R) return setErr("Bu tarayıcıda telefonun kendi tanıması yok.");
    const x = { t0: Date.now(), final: "", chunks: [], first: null };
    s.current = x;
    x.done = (more) => report("C", { first: x.first, text: (x.final + (x.interim || "")).trim(), err: x.err || "", note: rec ? "aynı anda kayıt" : "kayıtsız", ...more });
    const r = new R();
    r.lang = "tr-TR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) x.final += `${t} `;
        else interim += t;
      }
      x.interim = interim;
      if (x.first == null) {
        x.first = Date.now() - x.t0;
        setFirst(x.first);
      }
      setText((x.final + interim).trim());
    };
    r.onerror = (e) => {
      x.err = `Tanıma hatası: ${e.error}${e.message ? ` ${e.message}` : ""}`;
      setErr(x.err);
    };
    r.onend = () => {
      x.recEnded = true;
      if (x.stopping) return;
      // iPhone kendiliğinden bitirdiyse: kayıt da durur
      stop();
    };
    x.r = r;
    try {
      r.start(); // dokunuşun içinde başlamalı
    } catch (e) {
      return setErr(`Başlatılamadı: ${e.message}`);
    }
    setOn(true);
    if (rec)
      navigator.mediaDevices
        .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
        .then((stream) => {
          x.stream = stream;
          if (x.stopping) return stream.getTracks().forEach((t) => t.stop());
          const mr = new MediaRecorder(stream);
          x.mime = mr.mimeType;
          mr.ondataavailable = (e) => e.data?.size && x.chunks.push(e.data);
          mr.onstop = () => {
            stream.getTracks().forEach((t) => t.stop());
            fix(x);
          };
          mr.start(1000);
          x.mr = mr;
        })
        .catch((e) => setErr(`Kayıt açılmadı: ${e.message}`));
  }

  function stop() {
    const x = s.current;
    if (x.stopping) return;
    x.stopping = true;
    setOn(false);
    try {
      if (!x.recEnded) x.r?.stop();
    } catch {}
    if (x.mr && x.mr.state !== "inactive") x.mr.stop();
    else {
      x.stream?.getTracks().forEach((t) => t.stop());
      x.done({});
    }
  }

  return (
    <Card
      title="C · Telefonun kendi tanıması"
      sub="iPhone'un yazıya çevirmesi anında görünür; bitince kayıt tek seferde Gemini'ye gider, düzeltilmiş hali altta."
      on={on}
      onStart={start}
      onStop={stop}
      first={first}
      text={text}
      err={err}
      note={note}
      extra={
        <>
          <label className="mt-2 flex items-center gap-2 text-[0.8125rem]">
            <input type="checkbox" checked={rec} disabled={on} onChange={(e) => setRec(e.target.checked)} />
            Aynı anda kaydet, bitince Gemini düzeltsin
          </label>
          {fixed && (
            <p className="mt-2 rounded-xl bg-bg px-3 py-2 text-[0.9375rem] leading-snug">
              <span className="block text-[0.75rem] text-mut">
                Gemini düzeltti · {sec(fixed.ms)} · {fixed.by}
              </span>
              {fixed.text || <span className="text-mut">boş</span>}
            </p>
          )}
        </>
      }
    />
  );
}

export default function VoiceTestPage() {
  const [res, setRes] = useState({});
  const [copied, setCopied] = useState(false);
  const report = (k, v) => setRes((r) => ({ ...r, [k]: v }));
  const env = typeof window === "undefined" ? "" : `${isIOS() ? "iPhone" : "diğer"} · ${isStandalone() ? "ana ekran uygulaması" : "tarayıcı"} · kendi tanıma ${webSpeechAvailable() ? "var" : "yok"}`;

  function copy() {
    const line = (k, name) => {
      const r = res[k];
      if (!r) return `${name}: denenmedi`;
      return [`${name}: ilk yazı ${sec(r.first)}${r.note ? ` · ${r.note}` : ""}`, `  yazı: ${r.text || "(boş)"}`, r.fixed != null && `  Gemini düzeltti: ${r.fixed || "(boş)"}`, r.err && `  hata: ${r.err}`].filter(Boolean).join("\n");
    };
    const t = [`Ses testi · ${new Date().toLocaleString("tr-TR")}`, env, navigator.userAgent, line("A", "A şimdiki"), line("B", "B Gemini Live"), line("C", "C kendi tanıma")].join("\n");
    navigator.clipboard?.writeText(t).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {},
    );
  }

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Ses testi" />
      <p className="text-[0.875rem] leading-snug text-mut">Her yöntemde aynı cümleyi söyle (içinde bir sporcu adı olsun), sonra Durdur. En altta sonuçları kopyalayıp bana gönder.</p>
      <p className="mt-1 text-[0.75rem] text-mut">{env}</p>
      <Current report={report} />
      <Live report={report} />
      <Native report={report} />
      <button type="button" onClick={copy} className="mt-5 w-full rounded-2xl bg-acc py-3 text-[1rem] font-semibold text-white">
        {copied ? "Kopyalandı" : "Sonuçları kopyala"}
      </button>
    </main>
  );
}
