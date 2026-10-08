"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useToast } from "@/components/ui/ToastProvider";
import { toMs, useChat } from "@/features/chat/ChatProvider";
import { ICE_SERVERS, RING_MS, STATUS, isOver, micError, ringingFresh } from "@/lib/call";
import { CallScreen } from "./CallScreen";
import { startRing } from "./ring";

// Uygulama içi sesli arama: gelen aramayı dinler (bana gelen ve çalan kayıt; boşken okuma yok), arama başlatır,
// açar/reddeder/kapatır. Ses WebRTC ile doğrudan; kurulum Firestore'dan (src/lib/call.js'teki veri biçimi).

const Ctx = createContext(null);
const AUDIO = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };

export function CallProvider({ children }) {
  const toast = useToast();
  const { orgId, uid, personName } = useChat() || {};
  // call: { id, role: caller|callee, peer, status, conn, startMs (bağlandığı an), muted }
  const [call, setCall] = useState(null);
  const s = useRef({}); // pc, stream, unsubs, timer, ring, wake, pendingIce
  const audio = useRef(null);
  const callRef = useRef(null);
  // Durum hem ekrana (state) hem dinleyicilere (ref) aynı anda yazılır
  const put = useCallback((next) => {
    callRef.current = next;
    setCall(next);
  }, []);
  const patch = useCallback((p) => callRef.current && put({ ...callRef.current, ...p }), [put]);

  const callsCol = useMemo(() => (orgId ? collection(db, "orgs", orgId, "calls") : null), [orgId]);

  // Her şeyi kapatır (mikrofon, bağlantı, dinleyiciler); ekran kısa süre son durumla kalır
  const cleanup = useCallback((finalStatus) => {
    const x = s.current;
    x.ring?.();
    x.unsubs?.forEach((u) => u());
    clearTimeout(x.timer);
    x.stream?.getTracks().forEach((t) => t.stop());
    try {
      x.pc?.close();
    } catch {}
    x.wake?.release?.().catch(() => {});
    s.current = {};
    if (audio.current) audio.current.srcObject = null;
    if (finalStatus && callRef.current) {
      const ended = { ...callRef.current, status: finalStatus, done: true };
      put(ended);
      setTimeout(() => callRef.current === ended && put(null), 1800);
    } else put(null);
  }, [put]);

  // Durum değişikliği yazar (kurallar yalnız durum ve cevap alanlarına izin verir)
  const setStatus = useCallback(
    (id, status, extra = {}) => {
      if (!callsCol || !id) return Promise.resolve();
      const p = { status, ...extra };
      if (isOver(status)) Object.assign(p, { endedAt: serverTimestamp(), endedBy: uid });
      return updateDoc(doc(callsCol, id), p).catch((e) => console.warn("[call] durum yazılamadı:", e.code));
    },
    [callsCol, uid],
  );

  // Bağlantıyı kurar: mikrofon, eş bağlantısı, ağ adreslerinin alışverişi
  const connect = useCallback(
    async (id, peer) => {
      const stream = await navigator.mediaDevices.getUserMedia(AUDIO);
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      Object.assign(s.current, { stream, pc, pendingIce: [], ownIce: [], docReady: false });
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      pc.ontrack = (e) => {
        const el = audio.current;
        if (!el) return;
        el.srcObject = e.streams[0] || new MediaStream([e.track]);
        el.play?.().catch(() => {});
      };
      const candsCol = collection(callsCol, id, "cands");
      const sendIce = (c) => addDoc(candsCol, { by: uid, c }).catch((e) => console.warn("[call] aday yazılamadı:", e.code));
      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const c = e.candidate.toJSON();
        if (s.current.docReady) sendIce(c);
        else s.current.ownIce?.push(c);
      };
      s.current.flushIce = () => {
        s.current.docReady = true;
        (s.current.ownIce || []).splice(0).forEach(sendIce);
      };
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        if (st === "connected" && !callRef.current?.startMs) patch({ conn: st, startMs: Date.now() });
        else patch({ conn: st });
        if (st === "failed") {
          setStatus(id, STATUS.failed);
          cleanup(STATUS.failed);
        }
      };
      // Karşı tarafın ağ adresleri
      const un = onSnapshot(query(candsCol, where("by", "==", peer)), (snap) => {
        for (const ch of snap.docChanges()) {
          if (ch.type !== "added") continue;
          const c = ch.doc.data().c;
          if (pc.remoteDescription) pc.addIceCandidate(c).catch(() => {});
          else s.current.pendingIce?.push(c);
        }
      });
      s.current.unsubs = [...(s.current.unsubs || []), un];
      s.current.addPending = () => (s.current.pendingIce || []).splice(0).forEach((c) => pc.addIceCandidate(c).catch(() => {}));
      try {
        s.current.wake = await navigator.wakeLock?.request("screen"); // arama sürerken ekran kapanmasın
      } catch {}
      return pc;
    },
    [callsCol, uid, cleanup, setStatus, patch],
  );

  // Arama kaydını izler (karşı taraf açtı, reddetti, kapattı)
  const watch = useCallback(
    (id) => {
      const un = onSnapshot(doc(callsCol, id), async (d) => {
        const c = d.data();
        if (!c) return;
        const pc = s.current.pc;
        if (c.answer && pc && !pc.currentRemoteDescription && callRef.current?.role === "caller") {
          try {
            await pc.setRemoteDescription(c.answer);
            s.current.addPending?.();
          } catch (e) {
            console.warn("[call] cevap kurulamadı:", e);
          }
        }
        if (c.status === STATUS.active && callRef.current?.status === STATUS.ringing) {
          s.current.ring?.();
          clearTimeout(s.current.timer);
          patch({ status: STATUS.active, conn: pc?.connectionState === "connected" ? "connected" : "connecting" });
        }
        if (isOver(c.status) && !callRef.current?.done) cleanup(c.status);
      });
      s.current.unsubs = [...(s.current.unsubs || []), un];
    },
    [callsCol, cleanup, patch],
  );

  // Ara
  const startCall = useCallback(
    async (peer) => {
      if (!callsCol || !peer || callRef.current) return;
      if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
        toast?.("Bu cihaz uygulama içi aramayı desteklemiyor.");
        return;
      }
      const ref = doc(callsCol);
      put({ id: ref.id, role: "caller", peer, status: STATUS.ringing, conn: "new" });
      // Kurulum sürerken "Bitir"e basıldıysa yarım kalanı kapat (karşı taraf boşuna çalmasın)
      const alive = () => callRef.current?.id === ref.id && !callRef.current.done;
      try {
        const pc = await connect(ref.id, peer);
        if (!alive()) return cleanup();
        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        await setDoc(ref, { from: uid, to: peer, kind: "audio", status: STATUS.ringing, at: serverTimestamp(), offer: { type: offer.type, sdp: offer.sdp } });
        if (!alive()) {
          setStatus(ref.id, STATUS.missed);
          return cleanup();
        }
        s.current.flushIce();
        watch(ref.id);
        s.current.ring = startRing("back");
        s.current.timer = setTimeout(() => {
          if (callRef.current?.status !== STATUS.ringing) return;
          setStatus(ref.id, STATUS.missed);
          cleanup(STATUS.missed);
        }, RING_MS);
      } catch (e) {
        if (!alive()) return cleanup();
        console.warn("[call] başlatılamadı:", e);
        const mic = e?.name && /NotAllowed|NotFound|NotReadable|Security/.test(e.name);
        toast?.(mic ? micError(e) : e?.code === "permission-denied" ? "Arama izni yok. Ana hesap Firestore kurallarını yayınlamalı." : "Arama başlatılamadı.");
        cleanup();
      }
    },
    [callsCol, uid, connect, watch, setStatus, cleanup, toast, put],
  );

  // Gelen aramalar: bana gelen ve çalan kayıt (yalnız uygulama açıkken)
  useEffect(() => {
    if (!callsCol || !uid) return;
    const un = onSnapshot(
      query(callsCol, where("to", "==", uid), where("status", "==", STATUS.ringing)),
      (snap) => {
        const now = Date.now();
        const list = snap.docs
          .map((d) => {
            const c = d.data({ serverTimestamps: "estimate" });
            return { ...c, id: d.id, atMs: toMs(c.at) };
          })
          .filter((c) => ringingFresh(c, now))
          .sort((a, b) => b.atMs - a.atMs);
        const cur = callRef.current;
        for (const c of list) {
          if (cur?.id === c.id) continue;
          if (cur) {
            setStatus(c.id, STATUS.declined); // başka aramadayken gelen: meşgul
            continue;
          }
          put({ id: c.id, role: "callee", peer: c.from, status: STATUS.ringing, conn: "new", offer: c.offer });
          s.current.ring = startRing("in");
          watch(c.id);
          s.current.timer = setTimeout(() => {
            if (callRef.current?.id === c.id && callRef.current.status === STATUS.ringing) cleanup(STATUS.missed);
          }, RING_MS + 5e3);
          break;
        }
      },
      (e) => console.warn("[call] gelen aramalar okunamadı:", e.code),
    );
    return () => un();
  }, [callsCol, uid, watch, setStatus, cleanup, put]);

  // Aç
  const accept = useCallback(async () => {
    const c = callRef.current;
    if (!c || c.role !== "callee" || c.status !== STATUS.ringing) return;
    s.current.ring?.();
    clearTimeout(s.current.timer);
    patch({ status: STATUS.active, conn: "connecting" });
    try {
      const pc = await connect(c.id, c.peer);
      await pc.setRemoteDescription(c.offer);
      s.current.addPending?.();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await setStatus(c.id, STATUS.active, { answer: { type: answer.type, sdp: answer.sdp }, answeredAt: serverTimestamp() });
      s.current.flushIce();
    } catch (e) {
      console.warn("[call] açılamadı:", e);
      toast?.(e?.name ? micError(e) : "Arama açılamadı.");
      setStatus(c.id, STATUS.failed);
      cleanup(STATUS.failed);
    }
  }, [connect, setStatus, cleanup, toast, patch]);

  // Reddet / kapat
  const decline = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    setStatus(c.id, STATUS.declined);
    cleanup(STATUS.declined);
  }, [setStatus, cleanup]);
  const hangup = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    if (c.done) return put(null);
    const st = c.status === STATUS.ringing && c.role === "caller" ? STATUS.missed : STATUS.ended;
    setStatus(c.id, st);
    cleanup(STATUS.ended);
  }, [setStatus, cleanup, put]);

  const toggleMute = useCallback(() => {
    const t = s.current.stream?.getAudioTracks?.()[0];
    const muted = !callRef.current?.muted;
    if (t) t.enabled = !muted;
    patch({ muted });
  }, [patch]);

  // Uygulama kapanırken süren aramayı bitir (en iyi çaba)
  useEffect(() => {
    const bye = () => {
      const c = callRef.current;
      if (c && !c.done) setStatus(c.id, c.status === STATUS.ringing && c.role === "callee" ? STATUS.declined : STATUS.ended);
    };
    window.addEventListener("pagehide", bye);
    return () => window.removeEventListener("pagehide", bye);
  }, [setStatus]);

  const value = { call, startCall, busy: !!call };
  return (
    <Ctx.Provider value={value}>
      {children}
      <audio ref={audio} autoPlay playsInline className="hidden" />
      {call && <CallScreen call={call} name={personName?.(call.peer) || "Kişi"} onAccept={accept} onDecline={decline} onHangup={hangup} onMute={toggleMute} />}
    </Ctx.Provider>
  );
}

export const useCall = () => useContext(Ctx);
