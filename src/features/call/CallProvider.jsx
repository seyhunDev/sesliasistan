"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { useToast } from "@/components/ui/ToastProvider";
import { dmId, toMs, useChat } from "@/features/chat/ChatProvider";
import { micClosed, micOpening } from "@/lib/speech/audioSession";
import { ICE_SERVERS, LOST_MS, RETRY_MS, RING_MS, STATUS, callLog, isOver, micError, pickStats, ringingFresh } from "@/lib/call";
import { CallScreen } from "./CallScreen";
import { endTone, startRing } from "./ring";
import { routeSupported, setRoute } from "./route";

// Uygulama içi sesli arama: gelen aramayı dinler (bana gelen ve çalan kayıt; boşken okuma yok), arama başlatır,
// açar/reddeder/kapatır. Ses WebRTC ile doğrudan; kurulum Firestore'dan (src/lib/call.js'teki veri biçimi).
// Bağlantı koparsa (Wi-Fi ↔ 4G, kısa kesinti) arayan taraf bağlantıyı yeniden kurar (ICE restart: yeni teklif rev ile,
// cevap arev ile kayda yazılır); LOST_MS içinde düzelmezse arama biter. Arama bitince arayan sohbete satır yazar.

const Ctx = createContext(null);
const AUDIO = { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };

// TURN bilgisi (/api/turn): 11 saat bellekte; alınamazsa yalnız STUN (Wi-Fi'de çoğu zaman yeter)
let ice = { at: 0, list: null };
async function iceServers() {
  if (ice.list && Date.now() - ice.at < 11 * 3600e3) return ice.list;
  try {
    const r = await authFetch("/api/turn", { method: "POST", signal: AbortSignal.timeout?.(4000) });
    const j = r.ok ? await r.json() : null;
    if (Array.isArray(j?.iceServers) && j.iceServers.length) {
      ice = { at: Date.now(), list: j.iceServers };
      return ice.list;
    }
  } catch {}
  return ICE_SERVERS;
}

export function CallProvider({ children }) {
  const toast = useToast();
  const { orgId, uid, personName, send } = useChat() || {};
  // call: { id, role: caller|callee, peer, status, conn, startMs (bağlandığı an), muted, speaker, mini, retrying }
  const [call, setCall] = useState(null);
  const s = useRef({}); // pc, stream, unsubs, timer, ring, wake, ice kuyrukları, rev/arev, kayıp zamanlayıcısı
  const audio = useRef(null);
  const callRef = useRef(null);
  // Durum hem ekrana (state) hem dinleyicilere (ref) aynı anda yazılır
  const put = useCallback((next) => {
    callRef.current = next;
    setCall(next);
  }, []);
  const patch = useCallback((p) => callRef.current && put({ ...callRef.current, ...p }), [put]);

  const callsCol = useMemo(() => (orgId ? collection(db, "orgs", orgId, "calls") : null), [orgId]);

  // Arama bitince sohbete satır (yalnız arayan yazar): cevapsızda karşı tarafa bildirim de gider
  const logToChat = useCallback(
    (c, status) => {
      if (!send || !c || c.role !== "caller" || c.logged) return;
      const line = callLog(status, c.startMs ? Date.now() - c.startMs : 0);
      if (!line) return;
      c.logged = true;
      const members = [uid, c.peer].sort();
      send(dmId(uid, c.peer), line.text, { create: { type: "dm", members }, quiet: !line.notify }).catch?.(() => {});
    },
    [send, uid],
  );

  // Her şeyi kapatır (mikrofon, bağlantı, dinleyiciler); ekran kısa süre son durumla kalır
  const cleanup = useCallback(
    (finalStatus) => {
      const x = s.current;
      const had = !!x.stream;
      x.ring?.();
      x.unsubs?.forEach((u) => u());
      clearTimeout(x.timer);
      clearTimeout(x.lost);
      clearTimeout(x.retry);
      x.stream?.getTracks().forEach((t) => t.stop());
      const closePc = () => {
        try {
          x.pc?.close();
        } catch {}
      };
      // Konuşulan aramada bu cihazın veri kullanımı kaydedilir (Ayarlar › Aramalar), sonra bağlantı kapanır
      const cur = callRef.current;
      if (x.pc && cur?.startMs && !cur.done) {
        const sec = Math.round((Date.now() - cur.startMs) / 1000);
        x.pc
          .getStats()
          .then((r) => {
            const st = pickStats(r.values());
            return authFetch("/api/call-stats", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ id: cur.id, ...st, sec }) });
          })
          .catch(() => {})
          .finally(closePc);
      } else closePc();
      x.wake?.release?.().catch(() => {});
      s.current = {};
      if (audio.current) audio.current.srcObject = null;
      if (had) micClosed(); // ses oturumunu bırak (arka plandaki müzik devam edebilsin)
      const c = callRef.current;
      if (finalStatus && c) {
        logToChat(c, finalStatus);
        if (c.status === STATUS.active) endTone();
        const ended = { ...c, status: finalStatus, done: true, mini: false };
        put(ended);
        setTimeout(() => callRef.current === ended && put(null), 1800);
      } else put(null);
    },
    [put, logToChat],
  );

  // Durum değişikliği yazar (kurallar yalnız durum, cevap ve yeniden bağlanma alanlarına izin verir)
  const setStatus = useCallback(
    (id, status, extra = {}) => {
      if (!callsCol || !id) return Promise.resolve();
      const p = { status, ...extra };
      if (isOver(status)) Object.assign(p, { endedAt: serverTimestamp(), endedBy: uid });
      return updateDoc(doc(callsCol, id), p).catch((e) => console.warn("[call] durum yazılamadı:", e.code));
    },
    [callsCol, uid],
  );
  const write = useCallback((id, p) => updateDoc(doc(callsCol, id), p).catch((e) => console.warn("[call] yazılamadı:", e.code)), [callsCol]);

  // Arayan: bağlantıyı yeniden kur (yeni teklif, yeni ağ adresleri)
  const restartIce = useCallback(
    async (id) => {
      const { pc } = s.current;
      if (!pc || pc.signalingState !== "stable" || callRef.current?.role !== "caller") return;
      try {
        const rev = (s.current.rev || 0) + 1;
        s.current.rev = rev;
        const offer = await pc.createOffer({ iceRestart: true });
        await pc.setLocalDescription(offer);
        await write(id, { offer: { type: offer.type, sdp: offer.sdp }, rev });
      } catch (e) {
        console.warn("[call] yeniden bağlanma başlatılamadı:", e);
      }
    },
    [write],
  );

  // Bağlantıyı kurar: mikrofon, eş bağlantısı, ağ adreslerinin alışverişi
  const connect = useCallback(
    async (id, peer) => {
      micOpening();
      const servers = iceServers(); // mikrofon açılırken paralel
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(AUDIO);
      } catch (e) {
        micClosed();
        throw e;
      }
      const pc = new RTCPeerConnection({ iceServers: await servers });
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
        const x = s.current;
        if (st === "connected") {
          clearTimeout(x.lost);
          clearTimeout(x.retry);
          x.lost = x.retry = null;
          const first = !callRef.current?.startMs;
          patch({ conn: st, retrying: false, ...(first ? { startMs: Date.now() } : {}) });
          // İlk bağlantıda ses ahizeden (telefon görüşmesi gibi); hoparlör düğmeyle
          if (first) setRoute(!!callRef.current?.speaker);
          return;
        }
        if (st === "disconnected" || st === "failed") {
          if (!callRef.current?.startMs) {
            // Hiç bağlanamadı (çoğu zaman mobil hat; TURN yok)
            if (st === "failed") {
              setStatus(id, STATUS.failed);
              cleanup(STATUS.failed);
            }
            return;
          }
          patch({ conn: st, retrying: true });
          // Arayan yeniden bağlanmayı başlatır: kopunca kısa bekleyip, çökünce hemen
          if (!x.retry) x.retry = setTimeout(() => ((x.retry = null), restartIce(id)), st === "failed" ? 0 : RETRY_MS);
          if (!x.lost)
            x.lost = setTimeout(() => {
              if (callRef.current?.id !== id || pc.connectionState === "connected") return;
              setStatus(id, STATUS.failed);
              cleanup(STATUS.failed);
            }, LOST_MS);
          return;
        }
        patch({ conn: st });
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
    [callsCol, uid, cleanup, setStatus, patch, restartIce],
  );

  // Arama kaydını izler (karşı taraf açtı, reddetti, kapattı, yeniden bağlanma)
  const watch = useCallback(
    (id) => {
      const un = onSnapshot(doc(callsCol, id), async (d) => {
        const c = d.data();
        if (!c) return;
        const x = s.current;
        const pc = x.pc;
        const role = callRef.current?.role;
        // Arayan: cevap (ilk ya da yeniden bağlanmadaki)
        if (role === "caller" && c.answer && pc && pc.signalingState === "have-local-offer" && (c.arev || 0) === (x.rev || 0)) {
          try {
            await pc.setRemoteDescription(c.answer);
            x.addPending?.();
          } catch (e) {
            console.warn("[call] cevap kurulamadı:", e);
          }
        }
        // Aranan: yeniden bağlanma teklifi
        if (role === "callee" && pc && (c.rev || 0) > (x.rev || 0) && c.offer) {
          x.rev = c.rev;
          try {
            await pc.setRemoteDescription(c.offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await write(id, { answer: { type: answer.type, sdp: answer.sdp }, arev: c.rev });
          } catch (e) {
            console.warn("[call] yeniden bağlanma cevaplanamadı:", e);
          }
        }
        if (c.status === STATUS.active && callRef.current?.status === STATUS.ringing) {
          x.ring?.();
          clearTimeout(x.timer);
          patch({ status: STATUS.active, conn: pc?.connectionState === "connected" ? "connected" : "connecting" });
        }
        if (isOver(c.status) && !callRef.current?.done) cleanup(c.status);
      });
      s.current.unsubs = [...(s.current.unsubs || []), un];
    },
    [callsCol, cleanup, patch, write],
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
      put({ id: ref.id, role: "caller", peer, status: STATUS.ringing, conn: "new", speaker: false });
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
          put({ id: c.id, role: "callee", peer: c.from, status: STATUS.ringing, conn: "new", offer: c.offer, speaker: false });
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
    cleanup(st === STATUS.missed ? STATUS.missed : STATUS.ended);
  }, [setStatus, cleanup, put]);

  const toggleMute = useCallback(() => {
    const t = s.current.stream?.getAudioTracks?.()[0];
    const muted = !callRef.current?.muted;
    if (t) t.enabled = !muted;
    patch({ muted });
  }, [patch]);
  // Hoparlör / ahize (iPhone'da ses oturumu türüyle; destek yoksa düğme görünmez)
  const toggleSpeaker = useCallback(() => {
    const speaker = !callRef.current?.speaker;
    setRoute(speaker);
    patch({ speaker });
  }, [patch]);
  const setMini = useCallback((mini) => patch({ mini }), [patch]);

  // Uygulamaya dönünce: ekran kilidi yeniden alınır, ses yeniden başlatılır (iPhone arka planda durdurabiliyor)
  useEffect(() => {
    const back = async () => {
      if (document.visibilityState !== "visible" || !s.current.pc) return;
      audio.current?.play?.().catch(() => {});
      if (s.current.wake?.released !== false) {
        try {
          s.current.wake = await navigator.wakeLock?.request("screen");
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, []);

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
      {call && (
        <CallScreen
          call={call}
          name={personName?.(call.peer) || "Kişi"}
          canRoute={routeSupported()}
          onAccept={accept}
          onDecline={decline}
          onHangup={hangup}
          onMute={toggleMute}
          onSpeaker={toggleSpeaker}
          onMini={setMini}
        />
      )}
    </Ctx.Provider>
  );
}

export const useCall = () => useContext(Ctx);
