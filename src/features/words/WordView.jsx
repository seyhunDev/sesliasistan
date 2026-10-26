"use client";

import { Icon } from "@/components/ui/Icon";
import { release, silentWav } from "@/features/speech/TtsProvider";
import { authFetch } from "@/lib/authFetch";

// Telefonun İngilizce sesi (sunucu sesi yoksa ya da gelmezse)
function device(text) {
  try {
    const s = window.speechSynthesis;
    if (!s || !text) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.9;
    const v = s.getVoices().find((x) => /^en[-_]US/i.test(x.lang)) || s.getVoices().find((x) => /^en/i.test(x.lang));
    if (v) u.voice = v;
    s.speak(u);
  } catch {
    /* ses yok */
  }
}

// İngilizce satırı okur (Seyhun 2026-10-26: "İngilizce her şeyi duyabiliyor olmamız lazım, tıklayarak"): önce sunucudaki
// Google İngilizce sesi (/api/tts lang "en", GOOGLE_TTS_KEY), aynı satır ikinci kez sorulmaz (bellekte); anahtar yoksa ya da
// 4 sn'de gelmezse telefonun sesi. iPhone'da ses öğesi dokunuş anında sessiz sesle açılır, sonra gelen ses çalabilir.
let el = null;
let server = true;
let job = 0;
const got = new Map();
export function sayEn(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim().slice(0, 400);
  if (!t || typeof window === "undefined") return;
  const id = ++job;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* yok */
  }
  if (!server || typeof Audio === "undefined") return device(t);
  if (!el) {
    el = new Audio();
    const s = silentWav();
    el.src = s;
    el.play().catch(() => {});
  } else el.pause();
  const a = el;
  let url = got.get(t);
  if (!url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    url = authFetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: t, lang: "en", rate: 0.95 }), signal: ctrl.signal })
      .then(async (r) => {
        if (r.status === 501) server = false;
        if (!r.ok) throw new Error(String(r.status));
        return URL.createObjectURL(await r.blob());
      })
      .finally(() => clearTimeout(timer));
    got.set(t, url);
    if (got.size > 80) got.delete(got.keys().next().value);
    url.catch(() => got.delete(t));
  }
  url.then(
    (u) => {
      if (id !== job) return;
      a.onended = () => release(a);
      a.src = u;
      a.play().catch(() => device(t));
    },
    () => id === job && device(t),
  );
}

// Kelime ya da cümle: İngilizcesi (dinle), türü, Türkçesi, örnek cümle ve Türkçesi (dokununca okunur).
// Kelime kartı (WordCard) ve İngilizce sayfası aynı görünümü kullanır; cümlede yazı biraz küçük, alt satıra iner.
export function WordView({ w }) {
  const phrase = w.kind === "phrase" || w.type === "cümle";
  return (
    <>
      <div className="mt-1 flex items-center gap-2">
        <b className={`min-w-0 font-bold leading-tight tracking-tight ${phrase ? "text-[1.1875rem]" : "truncate text-[1.375rem]"}`}>{w.en}</b>
        <button type="button" onClick={() => sayEn(w.en)} aria-label="Dinle" className="grid size-8 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
          <Icon name="volume" className="size-4" />
        </button>
        {!phrase && <span className="ml-auto shrink-0 rounded-md bg-line/70 px-1.5 text-[0.6875rem] font-semibold text-mut">{w.type}</span>}
      </div>
      <p className="mt-0.5 text-[0.9375rem] font-semibold text-acc">{w.tr}</p>
      {w.ex && (
        <button type="button" onClick={() => sayEn(w.ex)} className="mt-2.5 block w-full border-l-2 border-acc/40 pl-3 text-left">
          <span className="block text-[0.9375rem] italic leading-snug">{w.ex}</span>
          <span className="mt-0.5 block text-[0.8125rem] leading-snug text-mut">{w.exTr}</span>
        </button>
      )}
    </>
  );
}
