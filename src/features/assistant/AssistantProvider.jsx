"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AssistantSheet } from "./AssistantSheet";

// Sağlayıcının dışında kalan yerler (ör. kayıt ekranı: AddProvider asistandan önce kurulur) olayla açar
const Ctx = createContext({ openAssistant: (o = {}) => window.dispatchEvent(new CustomEvent("sa-open-assistant", { detail: o })), open: false, live: {}, act: { current: {} }, stageOn: false, setStageOn() {}, setSlot() {} });

// openAssistant({ text?, voice?, listen? }) uygulamanın her yerinden çağrılabilir.
// Asistan yüzen bir paneldir: sayfalar arasında açık kalır, sohbet kullanıcı bitirene kadar sürer.
// Panel zaten açıkken çağrılırsa (ör. alttaki "Konuş") sohbet sıfırlanmaz, kaldığı yerden devam eder (cont).
export function AssistantProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(null);
  const openRef = useRef(false);
  // Asistan sahnesi (alttaki geniş alan) için canlı durum: dinliyor mu, duyulan, son cevap… (AssistantSheet yayınlar)
  const [live, setLive] = useState({});
  const act = useRef({}); // sahnenin çağırdığı işler: listen, stop, cancel, expand, close
  const setAct = useCallback((o) => {
    act.current = o;
  }, []);
  const [stageOn, setStageOn] = useState(false); // sahne bu sayfada görünüyor mu (görünüyorsa asistanın küçük paneli çizilmez)
  const [slot, setSlot] = useState(null); // sahnedeki konuşma yuvası: sohbet büyük pencere yerine buraya çizilir
  const openAssistant = useCallback((o = {}) => {
    window.dispatchEvent(new Event("sa-tts-prime")); // asistanı açan dokunuş: sesli yanıt açıksa ses açılsın (iOS)
    window.dispatchEvent(new Event("sa-assistant-open")); // "Şimdi sen dene" yönlendirmesi kapansın
    setSeed({ id: Date.now(), ...o, cont: openRef.current });
    openRef.current = true;
    setOpen(true);
  }, []);
  useEffect(() => {
    const on = (e) => openAssistant(e.detail || {});
    window.addEventListener("sa-open-assistant", on);
    return () => window.removeEventListener("sa-open-assistant", on);
  }, [openAssistant]);
  const close = useCallback(() => {
    openRef.current = false;
    setOpen(false);
  }, []);

  return (
    <Ctx.Provider value={{ openAssistant, open, live, act, stageOn, setStageOn, setSlot }}>
      {children}
      <AssistantSheet open={open} onClose={close} seed={seed} onLive={setLive} onAct={setAct} slot={slot} />
    </Ctx.Provider>
  );
}

export const useAssistant = () => useContext(Ctx);
