"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/features/auth/AuthProvider";
import { useTts } from "@/features/speech/TtsProvider";
import { db } from "@/lib/firebase/clientApp";
import { INTRO_V } from "./Onboarding";

export const TRY_SENTENCE = "Yarın saat 10'da antrenman ekle";
const TRY_SPEECH = "Şimdi sen dene. Aşağıdaki beyaz ışığa dokun ve şunu söyle: yarın saat onda antrenman ekle.";

// "Şimdi sen dene": tanıtım bittikten sonra ana sayfada bir kez. Ekran kararır, alttaki asistan düğmesi aydınlık kalır,
// üstünde örnek cümle ve aşağıyı gösteren ok. Düğmeye dokununca (asistan açılınca) kapanır ve bir daha çıkmaz.
// "Sonra" ile de kapanır. Ayarlar › Tanıtımı sıfırla ile yeniden görünür.
export function TryAssistant() {
  const { profile } = useAuth();
  const path = usePathname();
  const tts = useTts();
  const [gone, setGone] = useState(false);
  const [pos, setPos] = useState(null); // asistan küresinin ve sahnenin ekrandaki yeri
  const show = !!profile && profile.onboarded === true && profile.introV >= INTRO_V && !profile.tourDone && !gone && path === "/";

  const done = () => {
    setGone(true);
    if (profile?.uid) updateDoc(doc(db, "users", profile.uid), { tourDone: true }).catch(() => {});
  };
  useEffect(() => {
    if (!show) return;
    const on = () => done();
    window.addEventListener("sa-assistant-open", on);
    const t = setTimeout(() => tts.speak(TRY_SPEECH), 700); // tanıtımdaki dokunuşla ses açıldı; açılmadıysa sessiz geçer
    // Ses ışığını bul (sahne çizilip yerleşince)
    const find = () => {
      const orb = [...document.querySelectorAll("[data-orb]")].find((e) => e.offsetParent);
      const stage = orb?.closest("[data-dome]");
      if (!orb) return;
      const r = orb.getBoundingClientRect();
      setPos({ x: r.left + r.width / 2, y: r.top + r.height / 2, rad: r.width / 2 + 16, top: stage ? stage.getBoundingClientRect().top : r.top });
    };
    const f = setTimeout(find, 350);
    window.addEventListener("resize", find);
    return () => {
      window.removeEventListener("sa-assistant-open", on);
      window.removeEventListener("resize", find);
      clearTimeout(t);
      clearTimeout(f);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);
  if (!show || !pos) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30" role="dialog" aria-label="Asistanı dene">
      {/* Karartma: alttaki küre çevresi açık kalır (dokunuş alttaki düğmeye geçer) */}
      <div className="fade-in absolute inset-0" style={{ background: `radial-gradient(circle at ${pos.x}px ${pos.y}px, transparent ${pos.rad}px, rgba(20,24,28,.72) ${pos.rad + 6}px)` }} />
      <div className="absolute inset-x-0 mx-auto max-w-[30rem] px-5" style={{ bottom: `calc(100% - ${pos.top}px + 12px)` }}>
        <div className="pointer-events-auto fade-in rounded-[1.375rem] bg-card p-4 shadow-[0_18px_40px_-16px_rgba(0,0,0,.6)]">
          <p className="text-[0.75rem] font-bold uppercase tracking-[.08em] text-acc">Şimdi sen dene</p>
          <p className="mt-1 text-[1rem] leading-snug">
            Aşağıdaki yeşil alandaki <b className="font-semibold">beyaz ışığa</b> dokun ve şunu söyle:
          </p>
          <p className="mt-2.5 rounded-2xl bg-acc/10 px-3.5 py-3 text-[1.125rem] font-semibold text-deep">“{TRY_SENTENCE}”</p>
          <p className="mt-2 text-[0.8125rem] leading-snug text-mut">Konuşmak istemezsen ışığı basılı tut, yazarak söyle.</p>
          <div className="mt-3 flex justify-end">
            <button type="button" onClick={done} className="rounded-full px-3 py-1.5 text-[0.875rem] font-medium text-mut active:bg-bg">
              Sonra
            </button>
          </div>
        </div>
      </div>
      <div className="absolute flex -translate-x-1/2 justify-center text-white" style={{ left: pos.x, top: pos.y - pos.rad - 46 }} aria-hidden="true">
        <svg viewBox="0 0 24 24" className="size-10 animate-bounce drop-shadow" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v15M5 12l7 7 7-7" />
        </svg>
      </div>
    </div>
  );
}
