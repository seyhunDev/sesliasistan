"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  collection,
  deleteField,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { GROUPS, GROUP_IDS, canTalk, inGroup, kindOf } from "@/lib/kinds";

// Mesajlaşma: kişi kişiye (dm_<uid1>_<uid2>), gruplar ve türe göre sabit gruplar: Ekip (team), Aile (family), Sporcular (athletes).
// Kim kiminle yazışır ve hangi sabit gruptadır: lib/kinds.js (kurallar da aynı).
// Veri: orgs/{işletme}/chats/{id} { type, members, name, createdBy, seq, last{text,by,at}, read{uid:n}, recv{uid:n}, typing{uid:zaman}, muted{uid:true} }
//       orgs/{işletme}/chats/{id}/messages/{mid} { by, text, at, n, replyTo{id,by,text}, reactions{uid:emoji}, deleted, editedAt }
//       chats/{id}.pinned { id, text, by }: sabitlenen mesaj
//       orgs/{işletme}/directory/{uid} { name, role, lastSeen } — sohbet listesindeki adlar ve "çevrimiçi"
// Kurallar (firestore.rules): sohbeti yalnızca üyeleri okur; kimse (ana hesap dahil) başkasının konuşmasını göremez.

const Ctx = createContext(null);
const SEEN_MS = 2 * 60e3;
export const toMs = (v) => (!v ? 0 : typeof v === "number" ? v : typeof v.toMillis === "function" ? v.toMillis() : Date.parse(v) || 0);
export const dmId = (a, b) => `dm_${[a, b].sort().join("_")}`;
export const unreadOf = (c, uid) => Math.max(0, (c?.seq || 0) - (c?.read?.[uid] || 0));

// Son gönderim hatasının nedeni (ekranda "bağlantı" yerine gerçek sebep yazılsın)
let lastErr = "";
export function sendErrorText() {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "İnternet bağlantısı yok; bağlanınca tekrar dene.";
  if (lastErr === "permission-denied") return "Bu sohbete yazma iznin görünmüyor. Ana hesap Firestore kurallarını yayınlamalı (firebase deploy --only firestore:rules).";
  if (lastErr === "unavailable" || lastErr === "deadline-exceeded") return "Sunucuya ulaşılamadı; biraz sonra tekrar dene.";
  return `Mesaj gönderilemedi${lastErr ? ` (${lastErr})` : ""}.`;
}
export function ChatProvider({ children }) {
  const { profile } = useAuth();
  const { myUid: uid, setExtraBadge, members } = useData();
  const orgId = profile?.orgId || "";
  const [list, setList] = useState([]);
  const [fixed, setFixed] = useState({}); // sabit grup belgeleri: { team: {...}, family: {...} }
  const [people, setPeople] = useState([]);
  const [denied, setDenied] = useState(false); // kurallar yayınlanmamış (mesajlaşma okunamıyor)
  const [ready, setReady] = useState(false); // sohbet listesi ilk kez geldi (öncesinde "sohbet yok" gösterilmez)
  const chatsCol = useMemo(() => (orgId ? collection(db, "orgs", orgId, "chats") : null), [orgId]);
  const myKind = !orgId ? "" : orgId === uid ? "owner" : kindOf(profile);
  const myGroups = useMemo(() => GROUP_IDS.filter((g) => myKind && inGroup(g, myKind)).join(","), [myKind]);

  // Sohbetlerim (üyesi olduklarım) + Ekip sohbeti
  useEffect(() => {
    if (!chatsCol || !uid) return;
    const a = onSnapshot(
      query(chatsCol, where("members", "array-contains", uid)),
      (s) => {
        setList(s.docs.map((d) => ({ ...d.data({ serverTimestamps: "estimate" }), id: d.id })));
        setReady(true);
      },
      (e) => {
        setReady(true);
        console.warn("[chat] liste okunamadı:", e.code);
        if (e.code === "permission-denied") setDenied(true);
      },
    );
    const subs = (myGroups ? myGroups.split(",") : []).map((g) =>
      onSnapshot(
        doc(chatsCol, g),
        (d) => setFixed((f) => ({ ...f, [g]: d.exists() ? { ...d.data({ serverTimestamps: "estimate" }), id: g } : null })),
        (e) => console.warn(`[chat] ${g} okunamadı:`, e.code),
      ),
    );
    return () => {
      a();
      subs.forEach((u) => u());
    };
  }, [chatsCol, uid, myGroups]);

  // Rehber (adlar, son görülme) ve kendi satırım: uygulama açıkken birkaç dakikada bir "son görülme"
  useEffect(() => {
    if (!orgId || !uid) return;
    const un = onSnapshot(
      collection(db, "orgs", orgId, "directory"),
      (s) => setPeople(s.docs.map((d) => ({ ...d.data({ serverTimestamps: "estimate" }), uid: d.id }))),
      (e) => {
        setPeople([]);
        if (e.code === "permission-denied") setDenied(true);
      },
    );
    let last = 0;
    const ping = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 60e3) return;
      last = Date.now();
      setDoc(doc(db, "orgs", orgId, "directory", uid), { name: profile?.name || "Kişi", role: orgId === uid ? "owner" : "staff", ...(orgId === uid ? {} : { kind: kindOf(profile) }), lastSeen: serverTimestamp() }, { merge: true }).catch(
        (e) => console.warn("[chat] rehber yazılamadı:", e.code),
      );
    };
    ping();
    const t = setInterval(ping, SEEN_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      un();
      clearInterval(t);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [orgId, uid, profile]);

  // Rehberi sunucudan tamamla (oturum başına bir kez): herkes herkesi görsün, uygulamayı hiç açmamış olsa da
  useEffect(() => {
    if (!orgId || !uid) return;
    authFetch("/api/directory", { method: "POST" }).catch(() => {});
  }, [orgId, uid]);

  // Ana hesap: rehberde henüz olmayan çalışanları ekler (uygulamayı hiç açmamış kişiler de sohbet listesinde görünsün)
  useEffect(() => {
    if (!orgId || orgId !== uid || !members?.length) return;
    for (const m of members)
      if (m.account !== false && m.status !== "left" && !people.some((p) => p.uid === m.uid))
        setDoc(doc(db, "orgs", orgId, "directory", m.uid), { name: m.name || "Kişi", role: "staff", kind: kindOf(m) }, { merge: true }).catch(() => {});
  }, [orgId, uid, members, people]);

  // Yazışabildiğim kişiler (ayrılanlar hariç): türlere göre (ana hesap herkesle)
  const kindOfP = useCallback((p) => (p.role === "owner" ? "owner" : kindOf(p)), []);
  const others = useMemo(() => people.filter((p) => p.uid !== uid && !p.left && myKind && canTalk(myKind, kindOfP(p))).sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : (a.name || "").localeCompare(b.name || "", "tr"))), [people, uid, myKind, kindOfP]);
  const personName = useCallback((id) => (id === uid ? "Sen" : people.find((p) => p.uid === id)?.name || "Kişi"), [people, uid]);

  // Sabit gruplarım: kişi için türüne uyanlar; ana hesap için içinde en az bir kişi olanlar (boş "Aile" görünmesin)
  const groupIds = useMemo(() => {
    const ids = myGroups ? myGroups.split(",") : [];
    if (myKind !== "owner") return ids;
    return ids.filter((g) => fixed[g]?.last || people.some((p) => !p.left && p.role !== "owner" && GROUPS[g].has(kindOf(p))));
  }, [myGroups, myKind, fixed, people]);
  // Sohbet listesi: sabit gruplar her zaman var (belge henüz yoksa boş olarak); başlık ve karşı taraf hesaplanır
  const chats = useMemo(() => {
    const all = [...groupIds.map((g) => fixed[g] || { id: g, type: "team", seq: 0, _ghost: true }), ...list.filter((c) => !GROUP_IDS.includes(c.id))];
    return all.map((c) => {
      const other = c.type === "dm" ? (c.members || []).find((m) => m !== uid) : null;
      const title = GROUPS[c.id] ? GROUPS[c.id].name : c.type === "dm" ? personName(other) : c.name || "Grup";
      return { ...c, other, title, unread: unreadOf(c, uid), mutedByMe: !!c.muted?.[uid] };
    });
  }, [groupIds, fixed, list, uid, personName]);

  const unreadTotal = chats.reduce((n, c) => n + (c.unread && !c.mutedByMe ? 1 : 0), 0);
  useEffect(() => setExtraBadge?.(unreadTotal), [unreadTotal, setExtraBadge]);

  // ---- İşlemler ----
  const chatRef = useCallback((cid) => doc(chatsCol, cid), [chatsCol]);

  // İletildi: başkasının yeni mesajı bu cihaza ulaşınca sohbete recv.<ben> = seq yazılır (gönderende iki gri tik).
  // Okundu (read) iletildiyi de kapsar; aynı sayı için ikinci kez yazılmaz.
  const recvSent = useRef({});
  useEffect(() => {
    if (!uid || !chatsCol) return;
    for (const c of chats) {
      const seq = c.seq || 0;
      if (!seq || c._ghost || c.last?.by === uid) continue;
      if (Math.max(c.recv?.[uid] || 0, c.read?.[uid] || 0) >= seq || (recvSent.current[c.id] || 0) >= seq) continue;
      recvSent.current[c.id] = seq;
      updateDoc(chatRef(c.id), { [`recv.${uid}`]: seq }).catch(() => {});
    }
  }, [chats, uid, chatsCol, chatRef]);

  // Mesaj gönder: sohbet yoksa (ilk mesaj) oluşturulur; mesaj numarası (n) sayaçtan alınır, gönderen kendi mesajını okumuş sayılır
  const send = useCallback(
    async (cid, text, { replyTo, create } = {}) => {
      const t = String(text || "").trim().slice(0, 4000);
      if (!t || !chatsCol) return false;
      const cref = chatRef(cid);
      const mref = doc(collection(cref, "messages"));
      try {
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(cref);
          const n = (snap.exists() ? snap.data().seq || 0 : 0) + 1;
          const last = { text: t.slice(0, 140), by: uid, at: serverTimestamp() };
          if (!snap.exists()) tx.set(cref, { ...(create || { type: "team" }), seq: n, last, read: { [uid]: n }, createdAt: serverTimestamp() });
          else tx.update(cref, { seq: n, last, [`read.${uid}`]: n, [`typing.${uid}`]: deleteField() });
          tx.set(mref, { by: uid, text: t, at: serverTimestamp(), n, ...(replyTo ? { replyTo: { id: replyTo.id, by: replyTo.by, text: String(replyTo.text || "").slice(0, 120) } } : {}) });
        });
        authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "chat", chat: cid, mid: mref.id }) }).catch(() => {});
        return true;
      } catch (e) {
        lastErr = e.code || e.message || "";
        console.warn("[chat] gönderilemedi:", lastErr);
        return false;
      }
    },
    [chatsCol, chatRef, uid],
  );

  const markRead = useCallback(
    (c) => {
      if (!c?.id || !c.seq || (c.read?.[uid] || 0) >= c.seq) return;
      updateDoc(chatRef(c.id), { [`read.${uid}`]: c.seq }).catch(() => {});
    },
    [chatRef, uid],
  );

  const lastTyping = useRef(0);
  const setTyping = useCallback(
    (cid, on) => {
      if (!cid) return;
      if (on && Date.now() - lastTyping.current < 4000) return;
      lastTyping.current = on ? Date.now() : 0;
      updateDoc(chatRef(cid), { [`typing.${uid}`]: on ? serverTimestamp() : deleteField() }).catch(() => {});
    },
    [chatRef, uid],
  );

  const react = useCallback(
    (cid, m, emoji) =>
      updateDoc(doc(chatRef(cid), "messages", m.id), { [`reactions.${uid}`]: m.reactions?.[uid] === emoji ? deleteField() : emoji }).catch(() => {}),
    [chatRef, uid],
  );
  // Düzenle (kendi mesajı, 15 dk içinde); son mesajsa listedeki özet de güncellenir
  const edit = useCallback(
    async (c, m, text) => {
      const t = String(text || "").trim().slice(0, 4000);
      if (!t || t === m.text) return true;
      try {
        await updateDoc(doc(chatRef(c.id), "messages", m.id), { text: t, editedAt: serverTimestamp() });
        if (m.n === c.seq) updateDoc(chatRef(c.id), { "last.text": t.slice(0, 140) }).catch(() => {});
        if (c.pinned?.id === m.id) updateDoc(chatRef(c.id), { "pinned.text": t.slice(0, 140) }).catch(() => {});
        return true;
      } catch {
        return false;
      }
    },
    [chatRef],
  );
  // Sabitle / kaldır (sohbetin tepesinde görünür)
  const pin = useCallback(
    (cid, m) => updateDoc(chatRef(cid), { pinned: m ? { id: m.id, text: String(m.text || "").slice(0, 140), by: m.by } : deleteField() }).catch(() => {}),
    [chatRef],
  );
  const remove = useCallback((cid, m) => updateDoc(doc(chatRef(cid), "messages", m.id), { deleted: true, text: "" }).catch(() => {}), [chatRef]);
  const mute = useCallback((c, on) => updateDoc(chatRef(c.id), { [`muted.${uid}`]: on ? true : deleteField() }).catch(() => {}), [chatRef, uid]);

  const createGroup = useCallback(
    async (name, memberUids) => {
      const ref = doc(chatsCol);
      await setDoc(ref, {
        type: "group",
        name: String(name).trim().slice(0, 60),
        members: [...new Set([uid, ...memberUids])],
        createdBy: uid,
        seq: 0,
        createdAt: serverTimestamp(),
      });
      return ref.id;
    },
    [chatsCol, uid],
  );
  const updateGroup = useCallback((cid, patch) => updateDoc(chatRef(cid), patch), [chatRef]);
  const leaveGroup = useCallback((c) => updateDoc(chatRef(c.id), { members: (c.members || []).filter((m) => m !== uid) }), [chatRef, uid]);

  const value = {
    orgId,
    uid,
    chats,
    denied,
    ready,
    myKind,
    groupIds,
    people: others,
    allPeople: people,
    personName,
    unreadTotal,
    chatRef,
    send,
    markRead,
    setTyping,
    react,
    remove,
    edit,
    pin,
    mute,
    createGroup,
    updateGroup,
    leaveGroup,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useChat = () => useContext(Ctx);
