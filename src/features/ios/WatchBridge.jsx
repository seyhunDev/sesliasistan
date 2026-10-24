"use client";

import { useEffect, useRef } from "react";
import { useAssistant } from "@/features/assistant/AssistantProvider";
import { useData } from "@/features/data/DataProvider";
import { readTimer, useTimer, writeTimer } from "@/features/training/Countdown";
import { onWatch, watchOk, watchReply, watchState, watchTake } from "@/lib/nativeIos";
import { todayStr } from "@/lib/utils/format";
import { watchTimerAct, watchTimerView, watchTraining } from "@/lib/watchTimer";
import { widgetTrainings } from "@/lib/widgetData";

// Apple Watch ile telefondaki uygulama arasında (IosBridge içinde, yalnız iPhone uygulamasında):
// - "sor": saatte söylenen, telefondaki asistana yazılmış gibi gider; asistanın son cevabı saate döner (iş 3 sn sonra kendiliğinden kaydolur,
//   silme ve para yine onay sorar: cevap soruysa saat "Cevapla" ile devam eder)
// - "sayac": tek sayaç (training/Countdown.jsx) saatten başlatılır, durdurulur, ±1 dk, bitirilir; durumu saate gönderilir
export function WatchBridge() {
  const { openAssistant, live, act } = useAssistant();
  const { plans } = useData();
  const t = useTimer();
  const today = todayStr();
  const tr = watchTraining(widgetTrainings(plans, { today }), today);

  const liveRef = useRef(live);
  const trRef = useRef(tr);
  const ctx = useRef({ openAssistant, act, asked: false });
  useEffect(() => {
    liveRef.current = live;
    trRef.current = tr;
    ctx.current = { ...ctx.current, openAssistant, act };
  });

  // Saatte görünen sayaç: değişince (ve uygulama açılınca) gönderilir
  const key = JSON.stringify(watchTimerView(t, { label: tr.label }));
  useEffect(() => {
    if (watchOk()) watchState(JSON.parse(key));
  }, [key]);

  useEffect(() => {
    if (!watchOk()) return;
    const sayac = (m) => {
      const cur = readTimer();
      const n = watchTimerAct(cur, m.is, { sn: Number(m.sn) || 0, own: trRef.current.own, where: trRef.current.where });
      if (!n) return watchReply(m.id, { ok: false, metin: cur.rid && cur.end != null ? "Bu sayaç yarışa bağlı, telefondan yönet." : "Sayaç bunu yapamıyor." });
      writeTimer(n);
      watchReply(m.id, { ok: true });
    };
    // Asistan: önceki saat cevabı soru değilse yeni konuşma açılır (Kaydedildi o işe ait olsun)
    const sor = async (m) => {
      const c = ctx.current;
      if (!c.asked && liveRef.current.open) {
        c.act.current?.close?.();
        await wait(500);
      }
      const before = liveRef.current.lastReply || "";
      c.openAssistant({ text: String(m.metin || "").slice(0, 500) });
      const t0 = Date.now();
      let busy = false;
      let last = "";
      let since = 0;
      while (Date.now() - t0 < 35000) {
        await wait(300);
        const l = liveRef.current;
        if (l.busy) {
          busy = true;
          since = 0;
          continue;
        }
        const r = l.lastReply || "";
        if (!r || (r === before && !busy)) continue;
        if (r !== last) (last = r), (since = Date.now());
        if (l.saved || Date.now() - since > 3500) break;
      }
      const soru = /\?\s*$/.test(last);
      ctx.current.asked = soru;
      watchReply(m.id, last ? { metin: last, kaydedildi: !!liveRef.current.saved, soru } : { metin: "Telefondan cevap gelmedi. Velora'yı telefonda açıp yeniden dene.", hata: true });
    };
    const go = (m) => {
      if (!m?.id) return;
      if (m.tur === "sayac") sayac(m);
      else if (m.tur === "sor") sor(m);
    };
    watchTake().then((list) => list.forEach(go));
    return onWatch(go);
  }, []);

  return null;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
