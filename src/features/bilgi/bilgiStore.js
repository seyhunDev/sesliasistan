"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, waitForPendingWrites, where } from "firebase/firestore";
import { addDoc, deleteDoc, setDoc, updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { cleanBilgi, MSG_MAX } from "@/lib/bilgi";

// Bilgi ekranı verisi: orgs/{org}/bilgi/ekran (sayaç, parkur, mesaj) ve orgs/{org}/bilgi/ses (son bas-konuş kaydı).
// Ekranlar belgeyi dinler (onSnapshot): okuma yalnız belge değişince olur, kaç sporcu açarsa açsın sürekli sorma yok.
const ref = (org, name) => doc(db, "orgs", org, "bilgi", name);
const LINK = {}; // işletme → herkese açık link anahtarı (aşağıda)
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function useBilgiDoc(org, name) {
  const [v, setV] = useState({ key: "", d: undefined });
  const key = org ? `${org}/${name}` : "";
  useEffect(() => {
    if (!org) return;
    return onSnapshot(
      ref(org, name),
      (s) => {
        if (name === "ekran" && s.exists()) LINK[org] = s.data().link || ""; // başka cihazda yenilenen link
        setV({ key, d: s.exists() ? s.data() : null });
      },
      () => setV({ key, d: null }),
    );
  }, [org, name, key]);
  return v.key === key ? v.d : undefined; // undefined: yükleniyor
}

export function useBilgi(org) {
  const d = useBilgiDoc(org, "ekran");
  return d === undefined ? undefined : cleanBilgi(d || {});
}

// Herkese açık link (Seyhun 2026-11-15 "linki kopyalayıp gönderdiğim kişi ekranı açabilsin"): ekranın kopyası bilgiAcik/{anahtar}
// (girişsiz okunur, tahmin edilemez anahtar; yalnız ana hesap yazar). Ana belgeye yazılan her şey kopyaya da yazılır.
// Anahtar ana belgede link alanında; yenilenince eski kopya silinir, eski link çalışmaz.
const pubRef = (key, ...p) => doc(db, "bilgiAcik", key, ...p);
export async function linkOf(org) {
  if (LINK[org] === undefined) LINK[org] = await getDoc(ref(org, "ekran")).then((s) => s.data()?.link || "", () => "");
  return LINK[org];
}
const mirror = (org, patch, ...p) =>
  linkOf(org)
    .then((key) => key && (p.length ? setDoc(pubRef(key, ...p), { ...patch, org }) : setDoc(pubRef(key), { ...patch, org }, { merge: true })))
    .catch(() => {});
export const linkUrl = (key) => `${typeof location !== "undefined" && /^https?:$/.test(location.protocol) ? location.origin : "https://sesliasistan.netlify.app"}/ekran/${key}`;

export const saveBilgi = (org, patch) => {
  const p = { ...patch, at: Date.now() };
  mirror(org, p);
  return setDoc(ref(org, "ekran"), p, { merge: true });
};

// Yeni link: ekranın ve son sesin kopyası yeni anahtarla açılır, eski kopya silinir
export async function newLink(org) {
  const a = new Uint8Array(15);
  crypto.getRandomValues(a);
  const key = Array.from(a, (x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join("");
  const [e, ss] = await Promise.all([getDoc(ref(org, "ekran")), getDoc(ref(org, "ses"))]);
  const old = e.data()?.link || "";
  const { link: _l, ...cur } = e.data() || {};
  await setDoc(pubRef(key), { ...cur, org, at: Date.now() });
  if (ss.exists()) await setDoc(pubRef(key, "ses", "son"), { ...ss.data(), org }).catch(() => {});
  await setDoc(ref(org, "ekran"), { link: key }, { merge: true });
  LINK[org] = key;
  if (old)
    deleteDoc(pubRef(old, "ses", "son"))
      .catch(() => {})
      .then(() => deleteDoc(pubRef(old)))
      .catch(() => {});
  return key;
}

// Linkle açılan ekran (girişsiz): kopya belgeleri dinler
export function usePublic(key) {
  const [v, setV] = useState({ key: "", d: undefined, s: undefined });
  useEffect(() => {
    if (!key) return;
    const a = onSnapshot(pubRef(key), (x) => setV((o) => ({ ...o, key, d: x.exists() ? x.data() : null })), () => setV((o) => ({ ...o, key, d: null })));
    const b = onSnapshot(pubRef(key, "ses", "son"), (x) => setV((o) => ({ ...o, key, s: x.exists() ? x.data() : null })), () => {});
    return () => (a(), b());
  }, [key]);
  return v.key === key ? [v.d === undefined ? undefined : v.d && cleanBilgi(v.d), v.s, v.d?.org || ""] : [undefined, undefined, ""];
}

// Tekne kimliği ve konumu (Seyhun 2026-11-15): bilgi ekranını açan telefon yelken no + isim yazar (bu cihazda saklı, değiştirene kadar
// o kişi o kişidir). Ekran açıkken konum 5 sn'de bir bilgiTekne/{cihaz} belgesine yazılır (tek belge, üstüne). Sporcu hesaplarından
// ve Takip'ten ayrı; ileride uid alanıyla sporcuya bağlanabilir. Okuma yalnız ana hesap (Yönet › Tekneler).
const WHO = "sa-bilgi-kim";
const DEV = "sa-bilgi-cihaz";
export function readWho() {
  try {
    const w = JSON.parse(localStorage.getItem(WHO) || "null");
    return w && (w.sail || w.name) ? { sail: String(w.sail || "").slice(0, 12), name: String(w.name || "").slice(0, 30) } : null;
  } catch {
    return null;
  }
}
export function saveWho(w) {
  try {
    localStorage.setItem(WHO, JSON.stringify({ sail: String(w.sail || "").trim().slice(0, 12), name: String(w.name || "").replace(/\s+/g, " ").trim().slice(0, 30) }));
  } catch {}
}
export function deviceId() {
  try {
    let d = localStorage.getItem(DEV) || "";
    if (!/^[a-z0-9]{12,24}$/.test(d)) {
      const a = new Uint8Array(12);
      crypto.getRandomValues(a);
      d = Array.from(a, (x) => "abcdefghijkmnpqrstuvwxyz23456789"[x % 32]).join("");
      localStorage.setItem(DEV, d);
    }
    return d;
  } catch {
    return "";
  }
}
export const sendPos = (dev, d) => setDoc(doc(db, "bilgiTekne", dev), d);

// Sesle kişiye gönderme için kanaldakiler bir kez okunur
export async function loadTekneler(org) {
  const s = await getDocs(query(collection(db, "bilgiTekne"), where("org", "==", org)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Yönet › Tekneler: işletmenin teknelerini dinler (yalnız sayfa açıkken); 12 saatten eski konum gösterilmez
export function useTekneler(org) {
  const [v, setV] = useState(null);
  useEffect(() => {
    if (!org) return;
    return onSnapshot(
      query(collection(db, "bilgiTekne"), where("org", "==", org)),
      (s) => setV(s.docs.map((d) => ({ id: d.id, ...d.data() })).filter((b) => Date.now() - (b.t || 0) < 12 * 3600e3)),
      () => setV([]),
    );
  }, [org]);
  return v;
}

// Gönderilen her mesaj ve ses kaydı ayrıca günlüğe yazılır (Seyhun 2026-11-15 "mesajlar kaydedilsin, ne zaman, ne için"):
// orgs/{org}/bilgiLog { kind: "msg" | "ses", text, dur, at, label (start yazısı), state (parkur durumu), course }
function logSent(org, item, ctx = {}) {
  return addDoc(collection(db, "orgs", org, "bilgiLog"), { ...item, at: Date.now(), label: ctx.label || "", state: ctx.state || "", course: ctx.course || "" }).then(
    (r) => r.id,
    () => "",
  );
}
// Gönderim sonucu (Görüldü 3/3, Ulaşmadı…) günlüğe sonradan yazılır
export const markLog = (org, id, patch) => (id ? updateDoc(doc(db, "orgs", org, "bilgiLog", id), patch).catch(() => {}) : Promise.resolve());

// Sunucu onayı ("İletildi"): bekleyen yazmalar sunucuya ulaşınca true; 10 sn'de ulaşmazsa false (internet yok)
const confirmed = () => Promise.race([waitForPendingWrites(db).then(() => true, () => false), new Promise((r) => setTimeout(() => r(false), 10000))]);

// to: { dev, name } verilirse yalnız o ekran gösterir ("Sana"); yoksa kanaldaki herkes. Dönen: { id, ok, logId }
export async function sendMsg(org, text, ctx, to = null) {
  const t = String(text || "").replace(/\s+/g, " ").trim().slice(0, MSG_MAX);
  if (!t) return { ok: false };
  const id = newId();
  await saveBilgi(org, { msg: { id, text: t, at: Date.now(), to: to?.dev || "" } });
  const logId = await logSent(org, { kind: "msg", text: t, id, to: to?.name || "" }, ctx);
  return { id, ok: await confirmed(), logId };
}

// Kanal aç: yeni link (eski link çalışmaz) + kanal adı; ekranlar yalnız açık kanala katılarak başlar. Kapat: ekranlar durur
export async function openKanal(org, name) {
  await newLink(org);
  await saveBilgi(org, { kanal: { id: newId(), name: String(name || "").trim().slice(0, 30) || "Antrenman", open: true, at: Date.now() } });
}
export const closeKanal = (org) => saveBilgi(org, { kanal: { open: false } });

// Son gönderilenler (yönetimde açılınca bir kez okunur)
export async function loadLog(org, n = 30) {
  const s = await getDocs(query(collection(db, "orgs", org, "bilgiLog"), orderBy("at", "desc"), limit(n)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Pusula kaydı: ekran açıkken telefonun yönü ve yatışı saniyede bir alınır, dakikada bir tek belge olarak yazılır
// orgs/{org}/bilgiPusula { uid, name, at (ilk örnek), pts: [[sn, yön, yatış, baş-kıç], …] }
export const savePusula = (org, data) => addDoc(collection(db, "orgs", org, "bilgiPusula"), data);
export async function loadPusula(org, n = 60) {
  const s = await getDocs(query(collection(db, "orgs", org, "bilgiPusula"), orderBy("at", "desc"), limit(n)));
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const b64 = (blob) =>
  new Promise((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.onerror = no;
    r.readAsDataURL(blob);
  });

// Ses kaydı belgeye base64 yazılır (20 sn, ~32 kbit/sn ≈ 100 KB; Storage kuralı gerekmez)
export async function sendSes(org, blob, dur, ctx, to = null) {
  const data = await b64(blob);
  if (!data || data.length > 700000) return { ok: false };
  const d = { id: newId(), at: Date.now(), type: (blob.type || "audio/mp4").split(";")[0], dur: Math.round(dur), data, to: to?.dev || "" };
  mirror(org, d, "ses", "son");
  await setDoc(ref(org, "ses"), d);
  const logId = await logSent(org, { kind: "ses", dur: Math.round(dur), id: d.id, to: to?.name || "" }, ctx);
  return { id: d.id, ok: await confirmed(), logId };
}
