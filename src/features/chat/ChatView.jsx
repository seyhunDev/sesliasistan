"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, getDocsFromCache, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { Loader } from "@/components/ui/Loader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { ConvoComposer } from "@/features/assistant/ConvoComposer";
import { sendErrorText, setOpenChat, toMs, useChat } from "./ChatProvider";
import { Avatar, Ticks, dayText, hm, isOnline, sameDay, seenText } from "./bits";
import { ChatInfoSheet } from "./ChatInfoSheet";
import { GROUPS, kindOf } from "@/lib/kinds";
import { inArchive, liveMsgs, shownMsg } from "@/lib/chatArchive";
import { canCall } from "@/lib/call";
import { useCall } from "@/features/call/CallProvider";
import { authFetch } from "@/lib/authFetch";
import { goBack } from "@/lib/navTrail";
import { useAuth } from "@/features/auth/AuthProvider";
import { seeInbox } from "@/features/home/InboxSeen";
import { uploadChatFile } from "./chatUpload";
import { VOICE_MAX_SEC, fileLabel, secText, sizeText, voiceType } from "@/lib/chatFile";

const PAGE = 50;
const EDIT_MS = 15 * 60e3; // kendi mesajını düzenleme süresi (kural da aynı)
const ACT = "flex w-full items-center gap-3 px-4 py-3.5 text-left text-[0.9375rem] font-medium active:bg-card";
const TYPING_MS = 6000;
// Mesajlaşmada yapay zeka şimdilik kapalı (Seyhun, 2026-10-06): yazı kutusunun yanındaki asistan küresi ve hazır yanıt
// önerileri görünmez. Geri açmak için true.
const CHAT_AI = false;
const EMOJI = ["👍", "❤️", "😂", "😮", "🙏", "✅"];
const NAME_TONES = ["text-deep", "text-[#8a4f0c] dark:text-[#f0b46a]", "text-[#2f6446] dark:text-[#8fd0a6]", "text-[#8e3a34] dark:text-[#f29a90]", "text-[#553f86] dark:text-[#b9a6f0]", "text-[#2c6262] dark:text-[#86cccc]"];
// Hazır yanıt önerileri: son mesaj başkasındansa yapay zeka 3 kısa yanıt önerir (mesaj başına bir kez; oturum boyunca saklanır)
const SUGG = new Map();
async function fetchReplies(key, body) {
  if (SUGG.has(key)) return SUGG.get(key);
  SUGG.set(key, []); // aynı mesaj için ikinci istek gitmesin
  try {
    const res = await authFetch("/api/replies", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const list = res.ok ? ((await res.json()).replies || []).slice(0, 3) : [];
    SUGG.set(key, list);
    return list;
  } catch {
    return [];
  }
}

// Son açılan sohbetlerin mesajları bellekte: aynı sohbete dönünce mesajlar beklemeden görünür, yenileri arkadan gelir.
// prefetchChat: listede sohbete parmak değince (ya da okunmamışlar için arka planda) mesajlar önceden okunur.
const MSGS = new Map();
const MAX_CACHED = 30;
const toList = (s) => s.docs.map((d) => ({ ...d.data({ serverTimestamps: "estimate" }), id: d.id, pending: d.metadata.hasPendingWrites })).reverse();
const keep = (cid, list) => {
  MSGS.delete(cid);
  MSGS.set(cid, list);
  if (MSGS.size > MAX_CACHED) MSGS.delete(MSGS.keys().next().value);
};
const lastQ = (cref, n = PAGE) => query(collection(cref, "messages"), orderBy("at", "desc"), limit(n));
const busy = new Set();
// Silinmiş sohbetin mesajları sunucudan okunamaz (kurallar sohbet belgesine bakar); yalnız var olan sohbet için çağrılır.
export async function prefetchChat(cref, cid) {
  if (!cref || MSGS.has(cid) || busy.has(cid)) return;
  busy.add(cid);
  try {
    const c = await getDocsFromCache(lastQ(cref)).catch(() => null);
    if (c && !c.empty && !MSGS.has(cid)) keep(cid, toList(c));
    const s = await getDocs(lastQ(cref));
    keep(cid, toList(s));
  } catch {
    /* çevrimdışı ya da izin yok: sohbet açılınca kendisi okur */
  } finally {
    busy.delete(cid);
  }
}

const toneOf = (uid = "") => NAME_TONES[[...uid].reduce((a, c) => a + c.charCodeAt(0), 0) % NAME_TONES.length];

// Tek sohbet: üstte kişi/grup ve durum (çevrimiçi, yazıyor…), ortada mesajlar, altta sabit yazma alanı.
// Mesaja dokun: tepki (👍 ❤️ …), Yanıtla, Kopyala, Sil (kendi mesajın). Okundu: çift mavi tik.
export function ChatView({ cid }) {
  const router = useRouter();
  const toast = useToast();
  const { chats, allPeople, people, personName, uid, orgId, chatRef, send, markRead, setTyping, react, remove, restore, purge, edit, pin, ready, myKind } = useChat();
  const { setViewing } = useData();
  const { startCall, busy } = useCall() || {};
  const now = useNow(2000);

  // Sohbet: listede yoksa (henüz mesajlaşılmamış birebir sohbet) boş olarak açılır; ilk mesajla oluşur
  const found = chats.find((c) => c.id === cid);
  const dmMembers = cid.startsWith("dm_") ? cid.slice(3).split("_") : null;
  const chat =
    found ||
    (dmMembers && dmMembers.includes(uid)
      ? { id: cid, type: "dm", members: dmMembers, other: dmMembers.find((m) => m !== uid), title: personName(dmMembers.find((m) => m !== uid)), seq: 0, _ghost: true }
      : null);
  const exists = !!chat && !chat._ghost;
  // Sabit grup: ana hesap + türü gruba uyan (ayrılmamış) kişiler
  const members = GROUPS[cid] ? allPeople.filter((p) => !p.left && (p.role === "owner" || GROUPS[cid].has(kindOf(p)))).map((p) => p.uid) : chat?.members || [];
  const others = members.filter((m) => m !== uid);
  const otherP = chat?.type === "dm" ? allPeople.find((p) => p.uid === chat.other) : null;

  const [raw, setRaw] = useState(() => MSGS.get(cid) || null); // null: henüz okunmadı (boş sohbetle karışmasın)
  // Sıfırlamadan sonra Sporcular, Aile, Ekip gruplarında eski mesajlar görünüyordu (lib/chatArchive.js liveMsgs)
  const all = liveMsgs(raw, exists, toMs(chat?.createdAt), toMs);
  const owner = myKind === "owner";
  // Arşivlenen mesajlar sohbette görünmez: ana hesabın arşivi herkes için, diğerlerinin yalnız kendileri için
  const msgs = all.filter((m) => shownMsg(m, uid));
  const archived = all.filter((m) => inArchive(m, uid, owner));
  const [archOpen, setArchOpen] = useState(false);
  const [purgeAsk, setPurgeAsk] = useState("");
  const [cached] = useState(() => MSGS.has(cid)); // bellekten geldiyse belirme animasyonu yok
  const [lim, setLim] = useState(PAGE);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null); // düzenlenen mesaj (yazı kutuda)
  const [attach, setAttach] = useState(false); // ek menüsü (fotoğraf, kamera, dosya, sesli mesaj)
  const [upload, setUpload] = useState(null); // yüklenen ek { label, p }
  const [rec, setRec] = useState(null); // sesli mesaj kaydı { sec }
  const recRef = useRef(null);
  const pickPhoto = useRef(null);
  const pickCam = useRef(null);
  const pickFile = useRef(null);
  const [act, setAct] = useState(null); // dokunulan mesaj (işlem menüsü)
  const [info, setInfo] = useState(false);
  const [newBelow, setNewBelow] = useState(0);
  const box = useRef(null);
  const input = useRef(null);
  const readAt = useRef(null); // açılıştaki "okuduğum son mesaj" numarası
  const [divider, setDivider] = useState(null); // "Okunmamış mesajlar" çizgisinin üstünde durduğu mesaj (açılışta bir kez)

  // Sohbet ekranı sabit bir kutu (mesajlaşma uygulamaları gibi). Yüksekliği görünen alan (visualViewport) kadar:
  // klavye açılınca kutu kısalır, yazma alanı klavyenin üstünde kalır. iPhone sayfayı kaydırmaya kalkarsa hemen başa
  // alınır: kutu hiçbir zaman taşınmaz (taşınırsa Safari'de dokunulan yer ile görünen yer kayar).
  // Yükseklik React'e uğramadan doğrudan yazılır (klavye açılırken her karede yeniden çizim olmasın).
  const shell = useRef(null);
  useLayoutEffect(() => {
    const el = shell.current;
    if (!el) return;
    const v = window.visualViewport;
    const html = document.documentElement;
    const prev = [html.style.overflow, document.body.style.overflow];
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    let raf = 0;
    // Klavyesiz tam yükseklik. Ana ekran uygulamasında iPhone klavye açılınca innerHeight'ı da küçültebiliyor;
    // o zaman "klavye açık mı" yanlış çıkıyor, ev çizgisi payı klavyenin üstünde boşluk olarak kalıyordu.
    let full = Math.max(window.innerHeight, v ? v.height : 0);
    const turn = () => (full = 0);
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = Math.round(v ? v.height : window.innerHeight);
        const a = document.activeElement;
        const typing = !!(a && el.contains(a) && /^(TEXTAREA|INPUT)$/.test(a.tagName));
        if (!typing || !full) full = Math.max(full, window.innerHeight, h);
        el.style.height = `${h}px`;
        // Klavye açıkken ev çizgisi payı gerekmez: yazma alanı klavyeye yapışık
        const kb = full - h > 120 || (typing && h < full - 80);
        el.style.setProperty("--kb-pad", kb ? "0.375rem" : "max(0.5rem, calc(env(safe-area-inset-bottom) - 0.5rem))");
        if (window.scrollY || (v && v.offsetTop)) {
          window.scrollTo(0, 0);
          if (typing) caret(a);
        }
        // Klavye açılırken kutu kısaldıkça imleç eski yerinde kalabiliyor: klavye durunca bir kez daha çizdirilir
        if (typing) settle(a);
      });
    };
    // iPhone kutuyu taşıyınca ya da kısaltınca yazı imlecini eski yerinde (kutunun dışında, mesajların üstünde)
    // bırakıyor; imleç yeniden çizdirilir. Aynı yeri yeniden seçmek iPhone'da imleci yerinden oynatmıyor (sohbete ilk
    // girişte ilk dokunuşta imleç dışarıda kalıyordu): yazı bir an değiştirilip imleç başka yere, sonra geri konur.
    const caret = (a) => {
      if (!a || document.activeElement !== a) return;
      a.style.transform = "translateZ(0)";
      requestAnimationFrame(() => {
        a.style.transform = "";
        const { value, selectionStart: s, selectionEnd: e } = a;
        if (document.activeElement !== a) return;
        try {
          a.value = `${value} `;
          a.setSelectionRange(value.length + 1, value.length + 1);
          a.value = value;
          a.setSelectionRange(s, e);
        } catch {}
      });
    };
    let settleT = 0;
    const settle = (a) => {
      clearTimeout(settleT);
      settleT = setTimeout(() => caret(a), 140);
    };
    const timers = [];
    const onFocus = (e) => {
      fit();
      const a = e.target;
      if (!/^(TEXTAREA|INPUT)$/.test(a?.tagName || "")) return;
      timers.forEach(clearTimeout);
      timers.length = 0;
      for (const ms of [120, 320, 700, 1200]) timers.push(setTimeout(() => caret(a), ms));
    };
    fit();
    v?.addEventListener("resize", fit);
    v?.addEventListener("scroll", fit);
    window.addEventListener("scroll", fit, { passive: true });
    window.addEventListener("orientationchange", turn);
    el.addEventListener("focusin", onFocus);
    el.addEventListener("focusout", fit);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settleT);
      timers.forEach(clearTimeout);
      window.removeEventListener("orientationchange", turn);
      el.removeEventListener("focusin", onFocus);
      el.removeEventListener("focusout", fit);
      v?.removeEventListener("resize", fit);
      v?.removeEventListener("scroll", fit);
      window.removeEventListener("scroll", fit);
      [html.style.overflow, document.body.style.overflow] = prev;
      window.scrollTo(0, 0);
    };
  }, [!!chat]); // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni mesaj hafifçe belirsin: yalnız açılıştan sonra sona eklenen mesajlar (önceki mesajlar yüklenince ya da
  // sohbet açılırken canlandırılmaz). Sınıf boyamadan önce doğrudan eklenir, ekstra çizim olmaz.
  const seen = useRef({ cid: null, ids: new Set(), last: null });
  useLayoutEffect(() => {
    const s = seen.current;
    if (s.cid !== cid) Object.assign(s, { cid, ids: new Set(), last: null });
    if (!msgs.length) return;
    const lastAt = s.last ? msgs.findIndex((m) => m.id === s.last) : -1;
    msgs.forEach((m, i) => {
      if (s.ids.has(m.id)) return;
      s.ids.add(m.id);
      if (s.last && i > lastAt && lastAt >= 0) box.current?.querySelector(`[data-mid="${m.id}"]`)?.classList.add("msg-in");
    });
    s.last = msgs[msgs.length - 1].id;
  }, [msgs, cid]);

  // Mesajlar (son 50; yukarı kaydırıp "Önceki mesajlar" ile daha fazlası)
  useEffect(() => {
    if (!exists || !orgId) return;
    return onSnapshot(
      lastQ(chatRef(cid), lim),
      { includeMetadataChanges: true },
      (s) => {
        const list = toList(s);
        // Önbellekte hiç yoksa sunucuyu bekle (önce boş, sonra dolu görünmesin)
        if (s.empty && s.metadata.fromCache && !MSGS.has(cid)) return;
        keep(cid, list);
        setRaw(list);
        setDivider((v) => (v !== null ? v : list.find((m) => m.by !== uid && (m.n || 0) > (readAt.current ?? Infinity))?.id || ""));
      },
      (e) => console.warn("[chat] mesajlar okunamadı:", e.code),
    );
  }, [exists, orgId, cid, lim, chatRef, uid]);

  // Ekrandayken okundu say; sunucuya "bu sohbetteyim" (bu sohbetin mesajı için telefona bildirim gelmez)
  useEffect(() => {
    if (!exists) return;
    if (readAt.current === null) readAt.current = chat.read?.[uid] || 0;
    if (document.visibilityState === "visible") markRead(chat);
  }, [exists, chat?.seq, markRead]); // eslint-disable-line react-hooks/exhaustive-deps
  // Sohbet açıkken bu sohbetin zildeki bildirimi de görüldü olur (açıkken gelen yeni bildirim de)
  const inboxTop = useAuth().profile?.inbox?.[0]?.at || "";
  useEffect(() => {
    if (cid && exists && document.visibilityState === "visible") seeInbox({ tag: `chat-${cid}` });
  }, [cid, exists, chat?.seq, inboxTop]);
  useEffect(() => {
    const key = `chat-${cid}`;
    const beat = () => {
      setViewing(document.visibilityState === "visible" ? key : null);
      if (document.visibilityState === "visible" && chat) markRead(chat);
    };
    beat();
    const t = setInterval(() => document.visibilityState === "visible" && setViewing(key), 30e3);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", beat);
      setViewing(null);
    };
  }, [cid, setViewing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Kaydırma (mesajlar kendi kutusunda kayar):
  //   açılışta en alt (çizilmeden önce, zıplamaz) · yeni mesaj: alttaysan ya da mesaj senin ise alta kayar, değilse "↓ yeni"
  //   · yukarı yaklaşınca önceki mesajlar kendiliğinden yüklenir, okuduğun yer kaymaz · klavye/yanıt çubuğu açılınca alttaysan altta kalır
  const scroller = useRef(null);
  const composerBox = useRef(null);
  const atBottom = useRef(true);
  const prevH = useRef(0);
  const ends = useRef({ first: null, last: null });
  const older = useRef(false); // önceki mesajlar yükleniyor
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !msgs.length) return;
    const f = msgs[0].id;
    const l = msgs.at(-1).id;
    const was = ends.current;
    ends.current = { first: f, last: l };
    if (!was.last) el.scrollTop = el.scrollHeight;
    else if (l !== was.last) {
      if (atBottom.current || msgs.at(-1).by === uid) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
        setNewBelow(0);
      } else {
        const i = msgs.findIndex((m) => m.id === was.last);
        setNewBelow((n) => n + Math.max(1, i < 0 ? 1 : msgs.length - 1 - i));
      }
    } else if (f !== was.first && prevH.current) el.scrollTop += el.scrollHeight - prevH.current;
    prevH.current = el.scrollHeight;
    older.current = false;
  }, [raw, uid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = scroller.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (atBottom.current) el.scrollTop = el.scrollHeight;
      prevH.current = el.scrollHeight;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [!!chat]); // eslint-disable-line react-hooks/exhaustive-deps
  // "↓ yeni" düğmesi yazma alanının hemen üstünde dursun (yanıt çubuğu açılınca da)
  useEffect(() => {
    const el = composerBox.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => el.parentElement?.style.setProperty("--composer-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, [!!chat]); // eslint-disable-line react-hooks/exhaustive-deps
  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottom.current && newBelow) setNewBelow(0);
    if (el.scrollTop < 240 && all.length >= lim && !older.current) {
      older.current = true;
      prevH.current = el.scrollHeight;
      setLim((n) => n + PAGE);
    }
  };
  const startReply = (m) => {
    setEditing(null);
    setReplyTo(m);
    setTimeout(() => input.current?.focus(), 50);
  };
  const startEdit = (m) => {
    setReplyTo(null);
    setEditing(m);
    setText(m.text);
    setTimeout(() => input.current?.focus(), 50);
  };
  const cancelEdit = () => {
    setEditing(null);
    setText("");
  };
  // Sabitlenen mesaja git (yüklü değilse önceki mesajları açar)
  const goPinned = () => {
    const el = box.current?.querySelector(`[data-mid="${chat?.pinned?.id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.animate?.([{ opacity: 0.4 }, { opacity: 1 }], { duration: 700 });
    } else setLim((n) => n + PAGE);
  };
  const toBottom = () => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
    setNewBelow(0);
  };

  // Ana asistan bu sohbeti bilir: özetler, mesajlardan kayıt çıkarır; alıcı söylenmezse buraya yazar
  const focusTo = GROUPS[cid]?.name || (chat?.type === "dm" ? personName(chat.other) : "");
  const focus = chat && {
    title: chat.title,
    to: focusTo,
    text: [
      `Sohbet: ${chat.title} (${chat.type === "dm" ? "birebir" : "grup"})`,
      `Varsayılan alıcı: ${focusTo || "yok (bu gruba asistan yazamaz; kişiyi ya da grubu sor)"}`,
      "Son mesajlar (eskiden yeniye):",
      ...msgs.slice(-15).filter((m) => !m.deleted && m.text).map((m) => `${m.by === uid ? "Ben" : personName(m.by)}: ${String(m.text).slice(0, 300)}`),
    ].join("\n"),
  };

  // Son mesaj başkasındansa hazır yanıtlar; dokununca kutuya yazılır, istersen düzeltip gönderirsin
  const last = msgs.at(-1);
  // Asistan açık sohbeti ve mesajlarını bilir ("son mesajımı sil")
  useEffect(() => {
    setOpenChat(chat ? { chat, msgs, archived } : null);
  });
  useEffect(() => () => setOpenChat(null), []);
  const suggKey = CHAT_AI && last && last.by !== uid && !last.deleted && last.text && !last.pending ? `${cid}/${last.id}` : "";
  const [sugg, setSugg] = useState({ key: "", list: [] });
  useEffect(() => {
    if (!suggKey) return;
    let live = true;
    const body = {
      messages: msgs.slice(-8).filter((m) => !m.deleted && m.text).map((m) => ({ me: m.by === uid, name: personName(m.by).split(" ")[0], text: m.text })),
      name: personName(uid).split(" ")[0],
      group: GROUPS[cid]?.name || (chat?.type === "dm" ? "" : chat?.name || "grup"),
    };
    fetchReplies(suggKey, body).then((list) => live && setSugg({ key: suggKey, list }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggKey]);
  const replies = sugg.key === suggKey && !text && !editing ? sugg.list : [];

  async function submit() {
    const t = text.trim();
    if (!t || !chat) return;
    if (editing) {
      const m = editing;
      setEditing(null);
      setText("");
      if (!(await edit(chat, m, t))) {
        setText(t);
        setEditing(m);
        toast("Düzenlenemedi (mesajlar 15 dakika içinde düzenlenebilir)");
      }
      return;
    }
    setText("");
    const r = replyTo;
    setReplyTo(null);
    const ok = await send(cid, t, {
      replyTo: r ? { id: r.id, by: r.by, text: r.text || fileLabel(r.file) } : null,
      create: createOf(),
    });
    if (!ok) {
      setText(t);
      toast(sendErrorText());
    }
    input.current?.focus();
  }

  const createOf = () => (chat.type === "dm" ? { type: "dm", members: [...chat.members].sort() } : { type: "team" });

  // Ek gönderme: önce Storage'a yüklenir, sonra mesaj yalnız künyeyle yazılır
  async function sendFile(file, { sec } = {}) {
    if (!file || !chat || !orgId || upload) return;
    const label = fileLabel({ kind: /^image\//.test(file.type) ? "photo" : /^audio\//.test(file.type) ? "voice" : "file", name: file.name, sec });
    setUpload({ label, p: 0 });
    const r = replyTo;
    try {
      const f = await uploadChatFile(orgId, cid, uid, file, { sec, onProgress: (p) => setUpload({ label, p }) });
      setReplyTo(null);
      const ok = await send(cid, "", { file: f, replyTo: r ? { id: r.id, by: r.by, text: r.text || fileLabel(r.file) } : null, create: createOf() });
      if (!ok) toast(sendErrorText());
    } catch (e) {
      toast(e?.message || "Dosya gönderilemedi.");
    } finally {
      setUpload(null);
    }
  }

  function onPick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    setAttach(false);
    if (f) sendFile(f);
  }

  // Sesli mesaj: basınca kayıt başlar, Gönder ile durur ve gider, Vazgeç ile atılır. En çok 5 dakika.
  async function startVoice() {
    setAttach(false);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) return toast("Bu cihazda ses kaydı yapılamıyor.");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      return toast("Mikrofona izin verilmedi.");
    }
    const type = voiceType();
    const mr = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const parts = [];
    const t0 = Date.now();
    const st = { mr, stream, parts, t0, send: false, timer: 0 };
    mr.ondataavailable = (ev) => ev.data?.size && parts.push(ev.data);
    mr.onstop = () => {
      clearInterval(st.timer);
      stream.getTracks().forEach((t) => t.stop());
      recRef.current = null;
      setRec(null);
      const sec = Math.round((Date.now() - t0) / 1000);
      if (!st.send) return;
      if (sec < 1 || !parts.length) return toast("Kayıt çok kısa kaldı.");
      const mime = (mr.mimeType || type || "audio/mp4").split(";")[0];
      sendFile(new File(parts, "sesli-mesaj", { type: mime }), { sec });
    };
    st.timer = setInterval(() => {
      const sec = Math.round((Date.now() - t0) / 1000);
      setRec({ sec });
      if (sec >= VOICE_MAX_SEC) stopVoice(true);
    }, 250);
    recRef.current = st;
    mr.start(1000);
    setRec({ sec: 0 });
  }

  function stopVoice(sendIt) {
    const st = recRef.current;
    if (!st) return;
    st.send = sendIt;
    if (st.mr.state !== "inactive") st.mr.stop();
  }

  useEffect(() => () => stopVoice(false), []);

  const typers = Object.entries(chat?.typing || {})
    .filter(([u, t]) => u !== uid && now.getTime() - toMs(t) < TYPING_MS)
    .map(([u]) => personName(u).split(" ")[0]);
  const sub = typers.length
    ? chat.type === "dm"
      ? "yazıyor…"
      : `${typers.join(", ")} yazıyor…`
    : chat?.type === "dm"
      ? seenText(otherP?.lastSeen)
      : GROUPS[cid]
        ? `${members.length} kişi`
        : members.map((m) => personName(m).split(" ")[0]).join(", ");
  // Okundu / iletildi: herkes okuduysa mavi çift tik, herkese ulaştıysa gri çift tik (okumak iletilmeyi de kapsar)
  const readBy = (o) => chat?.read?.[o] || 0;
  const gotBy = (o) => Math.max(chat?.recv?.[o] || 0, readBy(o));
  const readAll = (m) => others.length > 0 && others.every((o) => readBy(o) >= (m.n || 0));
  const gotAll = (m) => others.length > 0 && others.every((o) => gotBy(o) >= (m.n || 0));
  const lastMine = [...msgs].reverse().find((m) => m.by === uid && !m.deleted);
  const statusLine = (m) => {
    if (!m || m.pending || !m.n) return m?.pending ? "Gönderiliyor…" : "";
    const readers = others.filter((o) => readBy(o) >= m.n);
    if (chat?.type === "dm") return readers.length ? "Okundu" : gotAll(m) ? "İletildi" : "Gönderildi";
    if (readAll(m)) return "Herkes okudu";
    if (readers.length) return `${readers.length} kişi okudu`;
    return gotAll(m) ? "İletildi" : "Gönderildi";
  };
  const firstUnread = divider ? msgs.findIndex((m) => m.id === divider) : -1;

  // Sohbet listesi henüz gelmediyse "bulunamadı" değil, yükleniyor
  if (!chat && !ready)
    return (
      <main className="mx-auto grid min-h-dvh max-w-[30rem] place-items-center">
        <Loader className="text-mut" />
      </main>
    );
  if (!chat)
    return (
      <main className="mx-auto grid min-h-dvh max-w-[30rem] place-items-center px-6 text-center">
        <div>
          <p className="text-[0.9375rem] text-mut">Bu sohbet bulunamadı ya da artık üyesi değilsin.</p>
          <button type="button" onClick={() => router.replace("/messages")} data-press className="btn btn-primary mt-4">
            Mesajlara dön
          </button>
        </div>
      </main>
    );

  return (
    // Sabit kutu: başlık üstte, mesajlar ortada kendi içinde kayar, yazma alanı altta (yükseklik: yukarıdaki fit)
    <main ref={shell} className="fixed inset-x-0 top-0 z-30 flex h-dvh flex-col overscroll-none bg-bg">
      <div className="relative mx-auto flex min-h-0 w-full max-w-[30rem] flex-1 flex-col">
        {/* Üst: geri, fotoğraf + ad (yalnızca yazarken altında "yazıyor…"), ayarlar */}
        <header className="z-10 flex shrink-0 items-center gap-1.5 border-b border-line bg-bg px-1.5 pb-1.5 pt-[calc(0.375rem+env(safe-area-inset-top))]">
          <BackButton onClick={() => goBack(router, "/messages")} className="mx-1" />
          <button type="button" onClick={() => (owner && chat.type === "dm" && otherP && otherP.role !== "owner" ? router.push(`/people/p/${chat.other}`) : setInfo(true))} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
            <Avatar name={chat.title} photo={otherP?.photo} icon={GROUPS[cid]?.icon || (chat.type === "group" ? "chat" : null)} online={isOnline(otherP)} size="size-9" text="text-[0.8125rem]" tone={GROUPS[cid] ? "bg-deep text-white" : undefined} />
            <span className="min-w-0">
              <b className="flex items-center gap-1.5 truncate text-[1rem] font-semibold leading-tight">
                <span className="truncate">{chat.title}</span>
                {chat.mutedByMe && <Icon name="mute" className="size-3.5 shrink-0 text-mut" />}
              </b>
              {sub && <small className={`block truncate text-[0.75rem] leading-tight ${typers.length || sub === "çevrimiçi" ? "font-medium text-acc" : "text-mut"}`}>{sub}</small>}
            </span>
          </button>
          {chat.type === "dm" && otherP && startCall && canCall(myKind, otherP.role === "owner" ? "owner" : kindOf(otherP)) && (
            <button type="button" onClick={() => startCall(chat.other)} disabled={busy} aria-label="Sesli ara" data-press className="btn btn-icon size-10 shrink-0 text-acc">
              <Icon name="phone" className="size-5" />
            </button>
          )}
          <button type="button" onClick={() => setInfo(true)} aria-label="Sohbet ayarları" data-press className="btn btn-icon size-10 shrink-0 text-mut">
            <Icon name="sliders" className="size-5" />
          </button>
        </header>

        {/* Sabitlenen mesaj */}
        {chat.pinned && (
          <div className="flex shrink-0 items-center gap-2 border-b border-line bg-card/80 px-3 py-1.5">
            <button type="button" onClick={goPinned} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <Icon name="pushpin" className="size-4 shrink-0 text-acc" />
              <span className="min-w-0">
                <b className="block text-[0.6875rem] font-semibold text-acc">Sabitlenen mesaj</b>
                <span className="block truncate text-[0.8125rem]">{chat.pinned.text}</span>
              </span>
            </button>
            <button type="button" onClick={() => pin(cid, null)} aria-label="Sabitlemeyi kaldır" data-press className="btn btn-icon btn-sm size-8 shrink-0 text-mut">
              <Icon name="x" className="size-4" />
            </button>
          </div>
        )}

        {/* Mesajlar */}
        {/* Mesajlara dokununca klavye kapanır (yazarken mesajlar tam görünsün) */}
        <div
          ref={scroller}
          onScroll={onScroll}
          onClick={() => document.activeElement === input.current && input.current?.blur()}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
        >
        <div ref={box} className={`relative flex min-h-full flex-col justify-end px-3.5 pb-3 pt-2 ${raw && !cached ? "msgs-in" : ""}`}>
          {all.length >= lim && (
            <div className="flex justify-center py-2" aria-label="Önceki mesajlar yükleniyor">
              <Loader size="sm" className="text-mut" />
            </div>
          )}
          {archived.length > 0 && (
            <div className="flex justify-center pb-1 pt-1">
              <button type="button" onClick={() => setArchOpen(true)} data-press className="btn btn-secondary btn-sm text-mut">
                <Icon name="archive" className="size-3.5" /> Arşivde {archived.length} mesaj
              </button>
            </div>
          )}
          {exists && !raw && <MsgSkeleton />}
          {(!exists || raw) && !msgs.length && (
            // Geniş kutu: iki cümle de dar alanda gereksiz yere alt satıra kaymasın (Seyhun, 2026-10-20)
            <div className="mx-auto mt-10 w-full max-w-[24rem] rounded-2xl bg-card px-3 py-3 text-center text-[0.8125rem] leading-snug text-mut shadow-sm">
              <Icon name="chat" className="mx-auto mb-1.5 size-5 text-acc" />
              <span className="block text-balance">{chat.type === "dm" ? `${chat.title} ile mesajlaşmaya başla.` : GROUPS[cid] ? `${GROUPS[cid].name} grubu: yazdığını gruptaki herkes görür.` : "Grup sohbeti: yazdığını gruptaki herkes görür."}</span>
              <span className="block text-balance">Mesajları yalnızca bu sohbetteki kişiler görebilir.</span>
            </div>
          )}
          {msgs.map((m, i) => {
            const mine = m.by === uid;
            const prev = msgs[i - 1];
            const next = msgs[i + 1];
            const near = (a, b) => a && b && a.by === b.by && sameDay(a.at, b.at) && Math.abs(toMs(b.at) - toMs(a.at)) < 5 * 60e3;
            const head = !near(prev, m) || i === firstUnread;
            const tail = !near(m, next) || i + 1 === firstUnread;
            const reacts = Object.entries(m.reactions || {}).reduce((a, [u, e]) => ({ ...a, [e]: [...(a[e] || []), u] }), {});
            const showName = !mine && chat.type !== "dm" && head;
            const meta = (
              <>
                {m.editedAt && !m.deleted && <span className="mr-0.5 italic">düzenlendi</span>}
                {chat.pinned?.id === m.id && <Icon name="pushpin" className="size-3" />}
                {hm(m.at)}
                {mine && !m.deleted && <Ticks read={readAll(m)} delivered={gotAll(m)} pending={m.pending} />}
              </>
            );
            return (
              <div key={m.id} data-mid={m.id}>
                {(!prev || !sameDay(prev.at, m.at)) && (
                  <p className="my-3 text-center">
                    <span className="text-[0.75rem] font-semibold text-mut">{dayText(m.at)}</span>
                  </p>
                )}
                {i === firstUnread && (
                  <p className="my-3 flex items-center gap-2 text-[0.6875rem] font-semibold text-acc">
                    <span className="h-px flex-1 bg-acc/30" /> Okunmamış mesajlar <span className="h-px flex-1 bg-acc/30" />
                  </p>
                )}
                <div className={`flex items-end gap-2 ${mine ? "justify-end" : ""} ${head ? "mt-3" : "mt-[3px]"}`}>
                  {!mine && chat.type !== "dm" && (
                    <span className={tail ? "" : "invisible"}>
                      <Avatar name={personName(m.by)} photo={allPeople.find((p) => p.uid === m.by)?.photo} size="size-8" text="text-[0.75rem]" />
                    </span>
                  )}
                  <SwipeReply className={`flex min-w-0 max-w-[78%] flex-col ${mine ? "items-end" : "items-start"}`} onReply={() => !m.deleted && startReply(m)}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!m.deleted) setAct(m);
                      }}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !m.deleted && (e.preventDefault(), setAct(m))}
                      className={`relative cursor-pointer select-none [-webkit-touch-callout:none] min-w-[4.5rem] px-3 pb-2 pt-1.5 text-left text-[1rem] leading-[1.35] shadow-[0_1px_1.5px_rgba(38,40,44,.08)] transition active:scale-[.99] ${
                        mine ? `bg-deep text-white rounded-[1.25rem] rounded-br-md ${head ? "" : "rounded-tr-md"}` : `bg-card text-fg rounded-[1.25rem] rounded-bl-md ${head ? "" : "rounded-tl-md"}`
                      }`}
                    >
                      {showName && <span className={`mb-0.5 block text-[0.8125rem] font-semibold ${toneOf(m.by)}`}>{personName(m.by)}</span>}
                      {m.replyTo && !m.deleted && (
                        <span className={`mb-1 block rounded-lg border-l-[3px] px-2 py-1 text-[0.8125rem] ${mine ? "border-white/70 bg-white/15" : "border-acc bg-bg"}`}>
                          <b className="block text-[0.75rem] font-semibold">{m.replyTo.by === uid ? "Sen" : personName(m.replyTo.by)}</b>
                          <span className="line-clamp-2 opacity-90">{m.replyTo.text || "(ek)"}</span>
                        </span>
                      )}
                      {m.deleted ? (
                        <span className="flex items-center gap-1.5 italic opacity-70">
                          <Icon name="x" className="size-3.5" /> Bu mesaj silindi
                        </span>
                      ) : (
                        <>
                          {m.file && <FileBody f={m.file} mine={mine} />}
                          {m.text && <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{linkify(m.text, mine)}</span>}
                        </>
                      )}
{/* Saat sağ altta sabit; metnin son satırında onun kadar görünmez yer ayrılır (sığmazsa alt satıra geçer) */}
                      <span aria-hidden="true" className="invisible ml-2 inline-flex gap-1 text-[0.6875rem]">
                        {meta}
                      </span>
                      <span className={`absolute bottom-[0.3125rem] right-3 flex items-center gap-1 whitespace-nowrap text-[0.6875rem] leading-none tabular-nums ${mine ? "text-white/70" : "text-mut"}`}>
                        {meta}
                      </span>
                    </div>
                    {Object.keys(reacts).length > 0 && (
                      <span className={`-mt-1.5 flex gap-1 ${mine ? "mr-2" : "ml-2"}`}>
                        {Object.entries(reacts).map(([e, us]) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => react(cid, m, e)}
                            title={us.map((u) => personName(u)).join(", ")}
                            className={`flex h-6 items-center gap-0.5 rounded-full px-1.5 text-[0.75rem] shadow-sm ring-1 ${us.includes(uid) ? "bg-acc/10 ring-acc/40" : "bg-card ring-line"}`}
                          >
                            {e}
                            {us.length > 1 && <span className="text-[0.6875rem] font-semibold text-mut">{us.length}</span>}
                          </button>
                        ))}
                      </span>
                    )}
                    {/* Son mesajımın altında durum (iMessage gibi): Gönderildi · İletildi · Okundu */}
                    {m.id === lastMine?.id && i >= msgs.length - 3 && statusLine(m) && (
                      <span className="mr-1 mt-0.5 text-[0.6875rem] font-medium text-mut">{statusLine(m)}</span>
                    )}
                  </SwipeReply>
                </div>
              </div>
            );
          })}
        </div>
        </div>

        {newBelow > 0 && (
          <button type="button" onClick={toBottom} aria-label={`${newBelow} yeni mesaj, en alta git`} className="pop-btn absolute bottom-[calc(var(--composer-h,4rem)+0.75rem)] right-3 z-20 grid size-11 place-items-center rounded-full bg-card text-acc shadow-[0_4px_14px_-4px_rgba(38,40,44,.35)] ring-1 ring-line">
            <Icon name="chev" className="size-5 rotate-90" />
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-acc px-1 text-[0.6875rem] font-bold tabular-nums text-white">{newBelow > 99 ? "99+" : newBelow}</span>
          </button>
        )}

        {/* Yazma alanı (altta sabit) */}
        {/* Alt boşluk: adres çubuğu yokken (ana ekrandan açılan uygulama, çentikli iPhone) ev çizgisi payı kadar; fazlası alanı yukarı iter */}
        <footer ref={composerBox} className="z-10 shrink-0 border-t border-line bg-bg px-2.5 pt-2 pb-[var(--kb-pad,max(0.5rem,calc(env(safe-area-inset-bottom)-0.5rem)))]">
          {editing && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-sm">
              <Icon name="edit" className="size-4 shrink-0 text-acc" />
              <span className="min-w-0 flex-1">
                <b className="block text-[0.75rem] font-semibold text-acc">Mesajı düzenle</b>
                <span className="block truncate text-[0.8125rem] text-mut">{editing.text}</span>
              </span>
              <button type="button" onClick={cancelEdit} aria-label="Düzenlemeyi bırak" data-press className="btn btn-icon btn-sm size-8 text-mut">
                <Icon name="x" className="size-4" />
              </button>
            </div>
          )}
          {replyTo && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-sm">
              <span className="min-w-0 flex-1 border-l-[3px] border-acc pl-2">
                <b className="block text-[0.75rem] font-semibold text-acc">{replyTo.by === uid ? "Kendine yanıt" : `${personName(replyTo.by)} yanıtlanıyor`}</b>
                <span className="block truncate text-[0.8125rem] text-mut">{replyTo.text || fileLabel(replyTo.file)}</span>
              </span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label="Yanıtı kaldır" data-press className="btn btn-icon btn-sm size-8 text-mut">
                <Icon name="x" className="size-4" />
              </button>
            </div>
          )}
          {upload && (
            <div className="mb-2 rounded-xl bg-card px-3 py-2 text-[0.8125rem] shadow-sm">
              <span className="flex justify-between">
                <span className="truncate">{upload.label} gönderiliyor</span>
                <span className="tabular-nums text-mut">%{Math.round(upload.p * 100)}</span>
              </span>
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full bg-acc transition-[width]" style={{ width: `${Math.round(upload.p * 100)}%` }} />
              </span>
            </div>
          )}
          {replies.length > 0 && (
            <div className="fade-in -mx-2.5 mb-1.5 flex gap-1.5 overflow-x-auto px-2.5 py-1 [scrollbar-width:none]" aria-label="Hazır yanıtlar">
              {replies.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setText(r);
                    input.current?.focus();
                  }}
                  data-press className="btn btn-secondary btn-sm shrink-0 text-acc"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
          <ConvoComposer
            value={text}
            setValue={setText}
            onSend={submit}
            inputRef={input}
            focus={focus}
            examples={["Bu sohbeti özetle", "Bundan görev çıkar", "Yarın 9'da iskelede olalım yaz"]}
            sendIcon={editing ? "check" : "up"}
            sendLabel={editing ? "Düzenlemeyi kaydet" : "Gönder"}
            orb={CHAT_AI}
            leading={
              !editing && (
                <button type="button" onClick={() => setAttach(true)} aria-label="Ekle: fotoğraf, dosya, sesli mesaj" data-press className="btn btn-icon shrink-0 text-acc">
                  <Icon name="plus" className="size-6" />
                </button>
              )
            }
            inputProps={{
              autoCapitalize: "sentences",
              autoCorrect: "on",
              spellCheck: true,
              onChange: (e) => {
                setText(e.target.value);
                if (exists) setTyping(cid, !!e.target.value);
              },
              onBlur: () => exists && setTyping(cid, false),
              onKeyDown: (e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                  e.preventDefault();
                  submit();
                }
              },
            }}
          />
        </footer>
      </div>

      {/* Mesaja dokununca: tepki + işlemler */}
      <Sheet open={!!act} onClose={() => setAct(null)} title="Mesaj">
        {act && (
          <div className="pb-2">
            <p className="line-clamp-3 rounded-xl bg-bg px-3 py-2 text-[0.875rem] text-mut">{act.text}</p>
            <div className="mt-3 flex justify-between">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    react(cid, act, e);
                    setAct(null);
                  }}
                  className={`grid size-12 place-items-center rounded-full text-[1.5rem] active:scale-90 ${act.reactions?.[uid] === e ? "bg-acc/15 ring-2 ring-acc/40" : "bg-bg"}`}
                >
                  {e}
                </button>
              ))}
            </div>
            <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl bg-bg">
              <li>
                <button type="button" onClick={() => (startReply(act), setAct(null))} className={ACT}>
                  <Icon name="chat" className="size-5" /> Yanıtla
                </button>
              </li>
              {act.text && <li>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(act.text).then(() => toast("Kopyalandı")).catch(() => {});
                    setAct(null);
                  }}
                  className={ACT}
                >
                  <Icon name="note" className="size-5" /> Kopyala
                </button>
              </li>}
              <li>
                <button type="button" onClick={() => (pin(cid, chat.pinned?.id === act.id ? null : act), setAct(null))} className={ACT}>
                  <Icon name="pushpin" className="size-5" /> {chat.pinned?.id === act.id ? "Sabitlemeyi kaldır" : "Sabitle"}
                </button>
              </li>
              {act.by === uid && act.text && now.getTime() - toMs(act.at) < EDIT_MS && (
                <li>
                  <button type="button" onClick={() => (startEdit(act), setAct(null))} className={ACT}>
                    <Icon name="edit" className="size-5" /> Düzenle
                  </button>
                </li>
              )}
              {!act.pending && (
                <li>
                  <button type="button" onClick={() => (remove(chat, act), setAct(null), toast(owner ? "Mesaj arşive kaldırıldı, kimse görmüyor" : "Mesaj senden kaldırıldı"))} className={`${ACT} text-rec`}>
                    <Icon name="trash" className="size-5" /> {owner ? "Sil (arşive kaldır)" : "Benden kaldır"}
                  </button>
                </li>
              )}
            </ul>
            {/* Mesaj bilgisi (benim mesajım): kim okudu, kime iletildi */}
            {act.by === uid && (
              <div className="mt-3 space-y-1 px-1 text-[0.75rem] text-mut">
                <p>Gönderildi · {hm(act.at)}</p>
                {chat.type === "dm" ? (
                  <p>{readAll(act) ? "Okundu" : gotAll(act) ? "İletildi, henüz okunmadı" : "Henüz iletilmedi"}</p>
                ) : (
                  <>
                    {others.some((o) => readBy(o) >= act.n) && <p>Okudu: {others.filter((o) => readBy(o) >= act.n).map((o) => personName(o).split(" ")[0]).join(", ")}</p>}
                    {others.some((o) => readBy(o) < act.n && gotBy(o) >= act.n) && <p>İletildi: {others.filter((o) => readBy(o) < act.n && gotBy(o) >= act.n).map((o) => personName(o).split(" ")[0]).join(", ")}</p>}
                    {others.some((o) => gotBy(o) < act.n) && <p>Bekliyor: {others.filter((o) => gotBy(o) < act.n).map((o) => personName(o).split(" ")[0]).join(", ")}</p>}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Sheet>

      {/* Arşiv: ana hesap herkesten kaldırdıklarını ve kendi gizlediklerini görür; diğerleri yalnız kendi gizlediklerini */}
      <Sheet open={archOpen && archived.length > 0} onClose={() => (setArchOpen(false), setPurgeAsk(""))} title="Arşivdeki mesajlar">
        <p className="mb-2 px-1 text-[0.8125rem] leading-snug text-mut">
          {owner ? "Arşivdeki mesajları sohbette kimse görmez. Geri alabilir ya da kalıcı silebilirsin." : "Bu mesajları yalnız sen görmüyorsun. Geri alınca sohbette yeniden görünür."}
        </p>
        <ul className="space-y-2">
          {[...archived].reverse().map((m) => {
            const all = owner && m.arch;
            return (
              <li key={m.id} className="rounded-2xl bg-bg px-3 py-2.5">
                <p className="text-[0.75rem] text-mut">
                  {m.by === uid ? "Sen" : personName(m.by)} · {dayText(m.at)} {hm(m.at)}
                  {owner && <span className="ml-1.5 rounded-full bg-card px-1.5 py-0.5 text-[0.6875rem]">{all ? "Herkesten" : "Yalnız senden"}</span>}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-[0.875rem] [overflow-wrap:anywhere]">{m.text || fileLabel(m.file) || "(boş mesaj)"}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => restore(cid, m).then((ok) => toast(ok ? "Mesaj geri geldi" : "Geri alınamadı"))} data-press className="btn btn-secondary btn-sm flex-1 text-acc">
                    Geri al
                  </button>
                  {all && (
                    <button
                      type="button"
                      onClick={() => (purgeAsk === m.id ? (setPurgeAsk(""), purge(cid, m).then((ok) => toast(ok ? "Mesaj kalıcı silindi" : "Silinemedi"))) : setPurgeAsk(m.id))}
                      className={`h-9 flex-1 rounded-xl text-[0.8125rem] font-semibold ${purgeAsk === m.id ? "bg-rec text-white" : "bg-card text-rec ring-1 ring-line"}`}
                    >
                      {purgeAsk === m.id ? "Emin misin? Sil" : "Kalıcı sil"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Sheet>

      {/* Ek: fotoğraf, kamera, dosya, sesli mesaj (Storage; kural storage.rules › chatFiles) */}
      <input ref={pickPhoto} type="file" accept="image/*" hidden onChange={onPick} />
      <input ref={pickCam} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />
      <input ref={pickFile} type="file" hidden onChange={onPick} />
      <Sheet open={attach} onClose={() => setAttach(false)} title="Gönder">
        <div className="grid grid-cols-4 gap-2 pb-3">
          {[
            ["image", "Fotoğraf", () => pickPhoto.current?.click()],
            ["camera", "Kamera", () => pickCam.current?.click()],
            ["paperclip", "Dosya", () => pickFile.current?.click()],
            ["mic", "Sesli mesaj", startVoice],
          ].map(([icon, label, go]) => (
            <button key={label} type="button" onClick={go} className="flex flex-col items-center gap-1.5 rounded-2xl py-2">
              <span className="grid size-14 place-items-center rounded-full bg-acc/10 text-acc">
                <Icon name={icon} className="size-6" />
              </span>
              <span className="text-[0.75rem] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </Sheet>

      {/* Sesli mesaj kaydı */}
      <Sheet open={!!rec} onClose={() => stopVoice(false)} title="Sesli mesaj">
        <div className="flex flex-col items-center gap-4 pb-3">
          <span className="flex items-center gap-2 text-[1.75rem] font-semibold tabular-nums">
            <span className="size-3 animate-pulse rounded-full bg-rose-500" />
            {secText(rec?.sec)}
          </span>
          <div className="grid w-full grid-cols-2 gap-2">
            <button type="button" onClick={() => stopVoice(false)} data-press className="btn btn-secondary">
              Vazgeç
            </button>
            <button type="button" onClick={() => stopVoice(true)} data-press className="btn btn-primary">
              Gönder
            </button>
          </div>
        </div>
      </Sheet>

      <ChatInfoSheet open={info} onClose={() => setInfo(false)} chat={chat} members={members} people={people} exists={exists} />
    </main>
  );
}

// Mesajdaki ek: fotoğraf (dokununca büyük açılır), sesli mesaj (oynatıcı), dosya (ad ve boyut, dokununca açılır)
function FileBody({ f, mine }) {
  const stop = (e) => e.stopPropagation();
  if (f.kind === "photo")
    return (
      <a href={f.url} target="_blank" rel="noreferrer" onClick={stop} className="-mx-1.5 mb-1 mt-0.5 block overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={f.url} alt="Fotoğraf" loading="lazy" className="block max-h-80 w-full max-w-[16rem] bg-line object-cover" style={f.w && f.h ? { aspectRatio: `${f.w} / ${f.h}` } : undefined} />
      </a>
    );
  if (f.kind === "voice")
    return (
      <span className="mb-1 mt-0.5 flex flex-col gap-1" onClick={stop}>
        <audio src={f.url} controls preload="metadata" className="h-10 w-60 max-w-full" />
        {f.sec > 0 && <span className={`text-[0.75rem] ${mine ? "text-white/70" : "text-mut"}`}>Sesli mesaj · {secText(f.sec)}</span>}
      </span>
    );
  return (
    <a href={f.url} target="_blank" rel="noreferrer" onClick={stop} className={`mb-1 mt-0.5 flex items-center gap-2 rounded-xl px-2.5 py-2 ${mine ? "bg-white/15" : "bg-bg"}`}>
      <Icon name="paperclip" className="size-5 shrink-0" />
      <span className="min-w-0">
        <span className="block truncate text-[0.875rem] font-medium">{f.name || "Dosya"}</span>
        <span className={`block text-[0.75rem] ${mine ? "text-white/70" : "text-mut"}`}>{sizeText(f.size)}</span>
      </span>
    </a>
  );
}

// Mesajlar okunurken: gelen/giden balon iskeletleri (boş sohbet kartı yanlışlıkla görünmesin)
function MsgSkeleton() {
  return (
    <div className="soft-in mt-auto space-y-2.5 pt-6" aria-hidden="true">
      {[["w-3/5", 0], ["w-2/5", 0], ["w-1/2", 1], ["w-2/3", 0], ["w-1/3", 1]].map(([w, mine], i) => (
        <div key={i} className={`flex ${mine ? "justify-end" : ""}`}>
          <span className={`block h-9 ${w} animate-pulse rounded-2xl ${mine ? "bg-acc/15" : "bg-card"}`} />
        </div>
      ))}
    </div>
  );
}

// Sağa kaydır → yanıtla (WhatsApp/iMessage gibi). Dikey kaydırma bozulmaz (yalnızca yatay sürükleme yakalanır);
// eşik geçilince ok belirginleşir, bırakınca yanıt başlar. Kaydırma sonrası dokunma (işlem menüsü) açılmaz.
function SwipeReply({ onReply, className, children }) {
  const [dx, setDx] = useState(0);
  const st = useRef(null);
  const swiped = useRef(false);
  const MAX = 72;
  const AT = 52;
  const end = () => {
    const s = st.current;
    st.current = null;
    if (s?.lock === "x") {
      swiped.current = true;
      setTimeout(() => (swiped.current = false), 50);
      if (s.d >= AT) onReply();
    }
    setDx(0);
  };
  return (
    <div
      className={`relative ${className}`}
      style={{ transform: dx ? `translate3d(${dx}px,0,0)` : undefined, transition: dx ? "none" : "transform .22s cubic-bezier(.2,.8,.2,1)", touchAction: "pan-y" }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse") return;
        st.current = { x: e.clientX, y: e.clientY, lock: null, d: 0 };
      }}
      onPointerMove={(e) => {
        const s = st.current;
        if (!s) return;
        const mx = e.clientX - s.x;
        const my = e.clientY - s.y;
        if (s.lock === null && (Math.abs(mx) > 10 || Math.abs(my) > 10)) s.lock = Math.abs(mx) > Math.abs(my) * 1.4 && mx > 0 ? "x" : "y";
        if (s.lock !== "x") return;
        s.d = Math.min(MAX, Math.max(0, mx * 0.7));
        setDx(s.d);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onClickCapture={(e) => {
        if (!swiped.current) return;
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {dx > 0 && (
        <span aria-hidden="true" className="absolute -left-9 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-card text-acc shadow-sm" style={{ opacity: Math.min(1, dx / AT), transform: `translateY(-50%) scale(${dx >= AT ? 1 : 0.8})` }}>
          <Icon name="back" className="size-4 -scale-x-100" />
        </span>
      )}
      {children}
    </div>
  );
}

// Mesajdaki bağlantı, e-posta ve telefon numaraları dokunulabilir (dokununca işlem menüsü açılmaz)
const LINK = /(https?:\/\/[^\s]+|www\.[^\s]+|[\w.+-]+@[\w-]+\.[\w.-]+|(?:\+90|0)?\s?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2})/g;
function linkify(text, mine) {
  const parts = String(text || "").split(LINK);
  if (parts.length === 1) return text;
  const cls = `underline underline-offset-2 ${mine ? "text-white" : "text-acc"}`;
  return parts.map((p, i) => {
    if (i % 2 === 0) return p;
    const href = /@/.test(p) && !/^https?:/.test(p) ? `mailto:${p}` : /^[\s+\d]/.test(p) ? `tel:${p.replace(/\s/g, "")}` : /^www\./.test(p) ? `https://${p}` : p;
    return (
      <a key={i} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" onClick={(e) => e.stopPropagation()} className={cls}>
        {p}
      </a>
    );
  });
}
