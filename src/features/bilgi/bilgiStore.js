"use client";

import { useEffect, useState } from "react";
import { arrayUnion, collection, deleteField, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, waitForPendingWrites, where } from "firebase/firestore";
import { addDoc, deleteDoc, setDoc, updateDoc } from "@/lib/firebase/write";
import { db } from "@/lib/firebase/clientApp";
import { authFetch } from "@/lib/authFetch";
import { serverNow } from "@/lib/serverClock";
import { LIVE_MS, cleanBilgi, MSG_MAX } from "@/lib/bilgi";

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
  if (LINK[org] === undefined)
    LINK[org] = await getDoc(ref(org, "ekran")).then(
      (s) => s.data()?.link || "",
      () => "",
    );
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

// Ceza ver / kaldır (k: "1" | "2" | "sb" | "fd" | ""): tek yazma, sporcu ekranı ekran belgesinden görür
// keep: Geri al ile geri gelen ceza kendiliğinden kalkmaz (antrenör elle kaldırır)
export const setCeza = (org, dev, k, keep = false) => saveBilgi(org, { ceza: { [dev]: k ? { k, at: Date.now(), ...(keep ? { keep: true } : {}) } : deleteField() } });

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

// Kopyayı ana belgeden baştan yazar (Seyhun 2026-11-17: kanal açık ama sporcu "Kanal açık değil" görüyordu). Kural yayınlanmadan
// açılan kanalda kopya hiç yazılmamıştı; ana belgeye yazma sürdüğü için Yönet açık görünür, link boş kalır. Yönet açılınca ve
// kanal açılınca çağrılır: 2 okuma + 1-2 yazma.
export async function syncLink(org) {
  if (!org) return "";
  const [e, ss] = await Promise.all([getDoc(ref(org, "ekran")), getDoc(ref(org, "ses"))]);
  const { link: key = "", ...cur } = e.data() || {};
  if (!/^[a-z0-9]{12,40}$/.test(key)) return "";
  LINK[org] = key;
  await setDoc(pubRef(key), { ...cur, org, at: Date.now() });
  if (ss.exists()) await setDoc(pubRef(key, "ses", "son"), { ...ss.data(), org }).catch(() => {});
  return key;
}

// Linkle açılan ekran (girişsiz): kopya belgeleri dinler. d: belge (null: link yok/eski), err: okunamadı (izin ya da bağlantı)
// Seyhun 2026-11-17: belge açıkken bazı telefonlarda yine "Kanal açık değil" çıktı. Telefonun yerel Firestore önbelleği bozuksa
// (iPhone IndexedDB, aynı tarayıcıda açık başka Velora sekmesi) dinleyici hata verir; o zaman belge 5 sn'de bir doğrudan
// sunucudan (REST, girişsiz) okunur. Önbellekten gelen "belge yok" sunucu cevabı gelene kadar sayılmaz.
const REST = (key, path = "") =>
  `https://firestore.googleapis.com/v1/projects/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/databases/(default)/documents/bilgiAcik/${key}${path}?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;
function restVal(v) {
  if (!v || typeof v !== "object") return null;
  if ("mapValue" in v) return restMap(v.mapValue.fields);
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(restVal);
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return Date.parse(v.timestampValue);
  return null;
}
const restMap = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, restVal(v)]));
async function restGet(key, path) {
  const r = await fetch(REST(key, path), { cache: "no-store" });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`rest ${r.status}`);
  return restMap((await r.json()).fields);
}

export function usePublic(key) {
  const [v, setV] = useState({ key: "", d: undefined, s: undefined });
  useEffect(() => {
    if (!key) return;
    let poll = 0;
    let off = false;
    let got = false;
    const rest = () => {
      if (poll || off) return;
      const run = () =>
        Promise.all([restGet(key), restGet(key, "/ses/son").catch(() => undefined)]).then(
          ([d, ss]) => !off && setV((o) => ({ ...o, key, d, err: false, ...(ss !== undefined ? { s: ss } : {}) })),
          () => !off && setV((o) => ({ ...o, key, d: o.d || null, err: !o.d })),
        );
      run();
      poll = setInterval(run, 5000);
    };
    let a = () => {};
    let b = () => {};
    try {
      a = onSnapshot(
        pubRef(key),
        { includeMetadataChanges: true },
        (x) => {
          if (!x.exists() && x.metadata.fromCache) return; // önbellekte yok: sunucu cevabını bekle
          got = true;
          if (!poll) setV((o) => ({ ...o, key, d: x.exists() ? x.data() : null, err: false }));
        },
        rest,
      );
      b = onSnapshot(
        pubRef(key, "ses", "son"),
        (x) => !poll && setV((o) => ({ ...o, key, s: x.exists() ? x.data() : null })),
        () => {},
      );
    } catch {
      rest();
    }
    // Sunucudan 8 sn'de cevap gelmezse de doğrudan okunur
    const slow = setTimeout(() => !got && rest(), 8000);
    return () => {
      off = true;
      clearTimeout(slow);
      clearInterval(poll);
      a();
      b();
    };
  }, [key]);
  return v.key === key ? [v.d === undefined ? undefined : v.d && cleanBilgi(v.d), v.s, v.d?.org || "", v.d === null ? (v.err ? "err" : "none") : ""] : [undefined, undefined, "", ""];
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
    localStorage.setItem(
      WHO,
      JSON.stringify({
        sail: String(w.sail || "")
          .trim()
          .slice(0, 12),
        name: String(w.name || "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 30),
      }),
    );
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
// Çıkış (Seyhun 2026-11-25 "çıkış yapınca konumu görünmesin, offline görünsün"): konum alanları boşalır, zaman LIVE_MS kadar geriye
// alınır; Yönet'te hemen kapalı (Offline) sayılır, haritada görünmez. Kural değişmeden (yeni alan yok) yazılır.
export const offPos = (dev, d) =>
  setDoc(doc(db, "bilgiTekne", dev), { ...d, lat: null, lon: null, spd: null, hdg: null, acc: null, t: Date.now() - LIVE_MS - 1000 });

// Hesapla giren sporcunun tekne kimliği (Seyhun 2026-11-25 "isim kendi ismi, yelken numarası varsa göster, yoksa kendi yazsın"):
// isim hesabın adı, yelken no sporcu kaydından (athleteAtt kopyasında sailNo; ana hesap Sporcular'ı açınca eşitlenir). Ayarlar › Tekne
// ekranı'ndan değiştirilen ya da katılırken yazılan değer users/{uid}.bilgiKim'de durur ve önce gelir.
export function useTekneKim(profile) {
  const uid = profile?.uid || "";
  const org = profile?.orgId || "";
  const [att, setAtt] = useState({ uid: "", sail: "" });
  useEffect(() => {
    if (!uid || !org) return;
    let off = false;
    getDoc(doc(db, "orgs", org, "athleteAtt", uid))
      .then((d) => !off && setAtt({ uid, sail: String(d.data()?.sailNo || "").slice(0, 12) }))
      .catch(() => !off && setAtt({ uid, sail: "" }));
    return () => {
      off = true;
    };
  }, [uid, org]);
  if (!uid) return null;
  const k = profile.bilgiKim || {};
  return {
    ready: att.uid === uid,
    sail: String(k.sail || att.sail || "").slice(0, 12),
    name: String(k.name || profile.name || "").slice(0, 30),
  };
}
export const saveTekneKim = (uid, w) =>
  updateDoc(doc(db, "users", uid), {
    bilgiKim: {
      sail: String(w.sail || "").trim().slice(0, 12),
      name: String(w.name || "").replace(/\s+/g, " ").trim().slice(0, 30),
    },
  });

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
  return addDoc(collection(db, "orgs", org, "bilgiLog"), { ...item, at: Date.now(), ch: ctx.ch || "", label: ctx.label || "", state: ctx.state || "", course: ctx.course || "", by: ctx.by || "" }).then(
    (r) => r.id,
    () => "",
  );
}
// Gün kaydı (Seyhun 2026-11-26 "kimin ne yaptığını oradan çıkaracağız… PDF olarak çıktısını alacağım"): Yönet'te yapılan diğer işler de
// aynı günlüğe yazılır. kind: "ceza" { k, to, dev } | "ceza-off" { k, to, dev, auto (5 sn'de kendiliğinden), back (Geri al) } |
// "not" { dur, to, dev } | "video" { tags }. Gönderilenler listesinde görünmez (LOG_KINDS), yalnız gün kaydında.
export const logEv = (org, item, ctx) => (org ? logSent(org, item, ctx) : Promise.resolve(""));
// Bir günün bütün kaydı: günlük (ch == gün) + gün belgesi (başlangıç, bitiş, startlar) + katılan sporcular (iz)
export async function loadGunKaydi(org, id) {
  const [log, k, iz] = await Promise.all([
    getDocs(query(collection(db, "orgs", org, "bilgiLog"), where("ch", "==", id))).then((s) => s.docs.map((d) => ({ ...d.data(), logId: d.id }))),
    getDoc(kanalRef(org, id)).then((s) => (s.exists() ? { id, ...s.data() } : { id })),
    loadIz(org, id).catch(() => []),
  ]);
  const who = new Map();
  for (const d of iz) {
    const key = d.dev || `${d.sail}-${d.name}`;
    if (!who.has(key)) who.set(key, { dev: d.dev || "", sail: d.sail || "", name: d.name || "" });
  }
  return { kanal: k, log: log.sort((a, b) => (a.at || 0) - (b.at || 0)), boats: [...who.values()] };
}
// Gönderim sonucu (Görüldü 3/3, Ulaşmadı…) günlüğe sonradan yazılır
export const markLog = (org, id, patch) => (id ? updateDoc(doc(db, "orgs", org, "bilgiLog", id), patch).catch(() => {}) : Promise.resolve());

// Sunucu onayı ("İletildi"): bekleyen yazmalar sunucuya ulaşınca true; 10 sn'de ulaşmazsa false (internet yok)
const confirmed = () =>
  Promise.race([
    waitForPendingWrites(db).then(
      () => true,
      () => false,
    ),
    new Promise((r) => setTimeout(() => r(false), 10000)),
  ]);

// to: { dev, name } verilirse yalnız o ekran gösterir ("Sana"); yoksa kanaldaki herkes. Dönen: { id, ok, logId }
export async function sendMsg(org, text, ctx, to = null) {
  const t = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MSG_MAX);
  if (!t) return { ok: false };
  const id = newId();
  await saveBilgi(org, { msg: { id, text: t, at: serverNow(), to: to?.dev || "" } });
  const logId = await logSent(org, { kind: "msg", text: t, id, to: to?.name || "", dev: to?.dev || "" }, ctx);
  return { id, ok: await confirmed(), logId };
}

// Mesajlar (Seyhun 2026-11-23 örnek onaylandı): gönderilen yazılı mesaj sporcu ekranında sabitlenir (pin; biri kaldırana kadar durur,
// aynı anda bir tane), gizlenir (ekrandan hemen kalkar; günlükte hid) ya da silinir (günlükten de). r: loadLog satırı (id: mesaj, logId: günlük belgesi).
export const pinMsg = (org, r) => saveBilgi(org, { pin: { id: r.id, text: r.text, at: r.at, to: r.dev || "" } });
export const unpinMsg = (org) => saveBilgi(org, { pin: null });
// Ekrandan kaldır: o mesaj şu an gösteriliyorsa (son mesaj ya da sabit) boşaltılır
export async function offScreen(org, b, mid) {
  const p = {};
  if (b?.msg?.id === mid) p.msg = null;
  if (b?.pin?.id === mid) p.pin = null;
  if (Object.keys(p).length) await saveBilgi(org, p);
}
export const hideMsg = (org, b, r, hid = true) => Promise.all([hid ? offScreen(org, b, r.id) : null, markLog(org, r.logId, { hid })]);
export const delLog = (org, id) => deleteDoc(doc(db, "orgs", org, "bilgiLog", id));

// Sesin yazısı (Seyhun 2026-11-28 "yazıyı şimdilik sadece yönetimde ben göreceğim"): giden bas-konuş sesi gönderildikten sonra bir kez
// yazıya çevrilir (/api/transcribe, yelken sözleri + sporcu adları ipucu); günlükte `yazi`. Sporcuya gitmez.
export async function sesYazi(blob, names = []) {
  const fd = new FormData();
  fd.append("audio", blob, (blob.type || "").includes("webm") ? "ses.webm" : "ses.m4a");
  if (names.length) fd.append("names", names.join(","));
  const res = await authFetch("/api/transcribe", { method: "POST", body: fd, timeout: 20000 });
  const d = await res.json().catch(() => ({}));
  return String(d.text || "").trim();
}
// "Yanlış" bildirimi: ses + çeviri birlikte saklanır (sonra yapay zekâyla düzeltip çeviriyi geliştirmek için). Günlükte ayrı belge
// { kind: "yazi-hata", ref: günlük belgesi, yazi, data (ses), type, dur, to, durum: "yeni" }; ilgili günlük satırına hata: true.
// Gönderilenler ve gün kaydı bu türü göstermez. Kural değişmez (bilgiLog).
export async function yaziHata(org, { logId, yazi, blob, dur, to }, ctx = {}) {
  const data = blob ? await b64(blob) : "";
  await logSent(org, { kind: "yazi-hata", ref: logId || "", yazi: yazi || "", data: data.length < 900000 ? data : "", type: (blob?.type || "audio/mp4").split(";")[0], dur: Math.round(dur || 0), to: to?.name || to || "", durum: "yeni" }, ctx);
  if (logId) await markLog(org, logId, { hata: true });
}

// Kanal aç: aynı link (yalnız ilk kez yeni link) + kanal adı; ekranlar yalnız açık kanala katılarak başlar. Kapat: ekranlar durur.
// Her kanalın kaydı orgs/{org}/bilgiKanal/{id} { name, at (açılış), end (kapanış, açıksa null) } (Seyhun 2026-11-17 "Kanallar":
// eski kanallar listede durur, tekrar açılır, adı değişir, verisiyle silinir). Aynı anda tek kanal açık.
const kanalRef = (org, id) => doc(db, "orgs", org, "bilgiKanal", id);
const kanalName = (name) =>
  String(name || "")
    .trim()
    .slice(0, 30) || "Antrenman";
async function startKanal(org, id, name, prev) {
  if (prev?.open && prev.id && prev.id !== id) await updateDoc(kanalRef(org, prev.id), { end: Date.now() }).catch(() => {});
  // Link her kanalda aynı kalır (Seyhun 2026-11-23 "her açtığım kanal için link kopyalamam gerekiyor"): yalnız hiç link yoksa yenisi açılır.
  // Sporcu ekranı yeni kanalı görünce katılma kartına döner.
  if (!(await linkOf(org))) await newLink(org);
  const at = Date.now();
  await saveBilgi(org, { kanal: { id, name, open: true, at } });
  await syncLink(org);
  return at;
}
// day: "YYYY-AA-GG" (Seyhun 2026-11-25 "kanal hep aynı, o günün verisi o tarihte"): Yönet "Günü başlat" gün başına bir kayıt açar;
// aynı tarih zaten varsa reopenKanal ile o gün sürer
export async function openKanal(org, name, prev = null, day = "") {
  const id = newId();
  const n = kanalName(name);
  const at = await startKanal(org, id, n, prev);
  await setDoc(kanalRef(org, id), { name: n, at, end: null, ...(day ? { day } : {}) });
}
// Eski kanalı tekrar aç (aynı link; izler ve kayıtlar aynı kanalda birikir)
export async function reopenKanal(org, k, prev = null) {
  await startKanal(org, k.id, kanalName(k.name), prev);
  await setDoc(kanalRef(org, k.id), { name: kanalName(k.name), at: k.at || Date.now(), end: null }, { merge: true });
}
export async function closeKanal(org, id = "") {
  await saveBilgi(org, { kanal: { open: false } });
  if (id) await updateDoc(kanalRef(org, id), { end: Date.now() }).catch(() => {});
}
export async function renameKanal(org, id, name, isOpen) {
  const n = kanalName(name);
  await setDoc(kanalRef(org, id), { name: n }, { merge: true });
  if (isOpen) await saveBilgi(org, { kanal: { name: n } });
}
// Açık kanalın kaydı yoksa (bu özellikten önce açılmış) oluşturulur
export const ensureKanal = (org, k) => setDoc(kanalRef(org, k.id), { name: kanalName(k.name), at: k.at || Date.now(), end: k.open ? null : Date.now() }, { merge: true });
// Antrenman (Seyhun 2026-11-23 "antrenmanın bilgi ekranı burası olacak"): Yönet'te (ya da sesle) verilen her start açık kanalın
// kaydına yazılır (starts: start anları); "Antrenman olarak kaydet" bunları sayar. Kanal kapalıysa yazılmaz.
export async function noteStart(org, at = Date.now()) {
  if (!org) return;
  const k = (await getDoc(ref(org, "ekran")).catch(() => null))?.data()?.kanal;
  if (k?.open && k.id) await updateDoc(kanalRef(org, k.id), { starts: arrayUnion(at) }).catch(() => {});
}
// Kanal kaydedilen antrenmana bağlanır (plan: plan id); aynı kanal ikinci kez kaydedilince aynı plan güncellenir
export const markKanalPlan = (org, id, plan) => updateDoc(kanalRef(org, id), { plan }).catch(() => {});
// Günler listesi (Seyhun 2026-11-26 "her girdiğimde yeniden yükleniyor"): son liste bellekte ve telefonda saklı, sayfa açılınca hemen
// gösterilir; sunucudan gelen tazesi arkadan yerine geçer (Günü başlat penceresi zıplamaz)
const KCACHE = new Map();
const kKey = (org) => `sa-kanallar-${org}`;
function kCached(org) {
  if (!org) return null;
  if (KCACHE.has(org)) return KCACHE.get(org);
  try {
    const l = JSON.parse(localStorage.getItem(kKey(org)) || "null");
    if (Array.isArray(l)) return KCACHE.set(org, l).get(org);
  } catch {}
  return null;
}
export function useKanallar(org) {
  const [v, setV] = useState(() => ({ org, list: kCached(org) }));
  useEffect(() => {
    if (!org) return;
    return onSnapshot(
      query(collection(db, "orgs", org, "bilgiKanal"), orderBy("at", "desc"), limit(40)),
      (s) => {
        const l = s.docs.map((d) => ({ id: d.id, ...d.data() }));
        KCACHE.set(org, l);
        try {
          localStorage.setItem(kKey(org), JSON.stringify(l.map(({ id, name, at, end, day, arsiv }) => ({ id, name, at, end, day, arsiv }))));
        } catch {}
        setV({ org, list: l });
      },
      () => setV((o) => (o.org === org && o.list ? o : { org, list: [] })),
    );
  }, [org]);
  if (!org) return null;
  return v.org === org ? v.list : kCached(org);
}
// Arşiv (Seyhun 2026-11-26): kayıt silinmez, Günü başlat listesinden ve Günler'in üstünden kalkar; Günler › Arşiv'de durur
export const arsivKanal = (org, id, on) => updateDoc(kanalRef(org, id), { arsiv: on ? true : deleteField() });
// Kanalı verisiyle sil: izler (bilgiIz), son konumlar (bilgiTekne), gelen sesler (bilgiGelen), mesaj/ses günlüğü (bilgiLog, ch alanı olanlar)
export async function deleteKanal(org, id) {
  const top = (c) =>
    getDocs(query(collection(db, c), where("org", "==", org), where("ch", "==", id))).then(
      (s) => s.docs.map((d) => d.ref),
      () => [],
    );
  const log = getDocs(query(collection(db, "orgs", org, "bilgiLog"), where("ch", "==", id))).then(
    (s) => s.docs.map((d) => d.ref),
    () => [],
  );
  const packed = getDocs(collection(db, "orgs", org, "bilgiKanal", id, "iz")).then(
    (s) => s.docs.map((d) => d.ref),
    () => [],
  );
  const refs = (await Promise.all([top("bilgiIz"), top("bilgiTekne"), top("bilgiGelen"), log, packed])).flat();
  for (let i = 0; i < refs.length; i += 20) await Promise.all(refs.slice(i, i + 20).map((r) => deleteDoc(r).catch(() => {})));
  await deleteDoc(kanalRef(org, id));
  return refs.length;
}

// İz (Seyhun 2026-11-17 "sonra sporcunun ne yaptığını izlemek istiyorum"): ekran 5 sn'de bir nokta toplar, dakikada bir tek belge yazar.
// bilgiIz { org, k, ch, dev, sail, name, uid, t0, pts: [sn, enlem, boylam, hız (kn), …] düz liste (Firestore iç içe dizi almaz) }
export const sendIz = (d) => addDoc(collection(db, "bilgiIz"), d);
// Rotalar (Seyhun 2026-11-25): gün kapandıktan sonra ilk açılışta dakikalık belgeler sporcu başına tek belgeye toplanır
// (orgs/{org}/bilgiKanal/{gün}/iz/{cihaz}); sonraki izlemeler 1.200 yerine sporcu sayısı kadar okur. Gün tekrar açılırsa yeni dakikalık
// belgeler toplananlarla birlikte okunur ve gün kapanınca yine toplanır.
export async function loadIz(org, ch, closed = false) {
  const [raw, packed] = await Promise.all([
    getDocs(query(collection(db, "bilgiIz"), where("org", "==", org), where("ch", "==", ch))),
    getDocs(collection(db, "orgs", org, "bilgiKanal", ch, "iz")).catch(() => null),
  ]);
  const rows = raw.docs.map((d) => d.data());
  const prev = packed ? packed.docs.map((d) => d.data()) : [];
  if (closed && rows.length) packIz(org, ch, [...prev, ...rows], raw.docs).catch(() => {});
  return [...prev, ...rows];
}
async function packIz(org, ch, docs, rawDocs) {
  const by = {};
  for (const d of docs) {
    const id = d.dev || d.uid || `${d.sail}-${d.name}`;
    const x = (by[id] ||= { dev: d.dev || id, sail: d.sail || "", name: d.name || "", uid: d.uid || "", p: new Map() });
    const a = Array.isArray(d.pts) ? d.pts : [];
    for (let i = 0; i + 3 < a.length; i += 4) {
      const t = Math.round((d.t0 || 0) / 1000) + a[i];
      if (Number.isFinite(a[i + 1]) && Number.isFinite(a[i + 2])) x.p.set(t, [a[i + 1], a[i + 2], a[i + 3]]);
    }
  }
  for (const x of Object.values(by)) {
    const ts = [...x.p.keys()].sort((a, b) => a - b);
    if (!ts.length) continue;
    const t0 = ts[0];
    const pts = ts.flatMap((t) => [t - t0, ...x.p.get(t)]);
    await setDoc(doc(db, "orgs", org, "bilgiKanal", ch, "iz", String(x.dev).replace(/\//g, "_").slice(0, 60)), { ch, dev: x.dev, sail: x.sail, name: x.name, uid: x.uid, t0: t0 * 1000, pts });
  }
  for (let i = 0; i < rawDocs.length; i += 20) await Promise.all(rawDocs.slice(i, i + 20).map((d) => deleteDoc(d.ref).catch(() => {})));
}

// Son gönderilenler (yönetimde açılınca bir kez okunur)
// id: mesaj/ses kimliği (kayıtta varsa; yoksa belge kimliği), logId: günlük belgesinin kimliği (silme, gizleme)
const LOG_KINDS = new Set(["msg", "ses", "gelen", undefined, ""]);
export async function loadLog(org, n = 30) {
  const s = await getDocs(query(collection(db, "orgs", org, "bilgiLog"), orderBy("at", "desc"), limit(n + 40)));
  return s.docs
    .map((d) => ({ id: d.id, ...d.data(), logId: d.id }))
    .filter((r) => LOG_KINDS.has(r.kind))
    .slice(0, n);
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
  const d = { id: newId(), at: serverNow(), type: (blob.type || "audio/mp4").split(";")[0], dur: Math.round(dur), data, to: to?.dev || "" };
  mirror(org, d, "ses", "son");
  await setDoc(ref(org, "ses"), d);
  const logId = await logSent(org, { kind: "ses", dur: Math.round(dur), id: d.id, to: to?.name || "" }, ctx);
  return { id: d.id, ok: await confirmed(), logId };
}

// Parça parça bas-konuş (Seyhun 2026-11-25): konuşurken her ~2,5 sn'lik parça aynı ses belgesine yazılır (id konuşmanın kimliği,
// seq sıra, end son parça). Ekran hızlı gelen iki parçayı tek seferde görürse biri kaybolmasın diye belge bir önceki parçayı da taşır
// (prevSeq, prevData). Parça başına 1 yazma (açık link varsa +1); günlüğe konuşma bitince tek kayıt (finishSes).
const LAST_PART = new Map(); // konuşma kimliği → { seq, data }
export async function sendSesPart(org, { id, seq, end, blob, dur, to }) {
  const data = await b64(blob);
  if (!data || data.length > 300000) return false;
  const prev = LAST_PART.get(id);
  const d = { id, at: serverNow(), type: (blob.type || "audio/mp4").split(";")[0], seq, end: !!end, data, to: to?.dev || "" };
  if (end) d.dur = Math.round(dur || 0);
  if (prev && prev.seq === seq - 1) Object.assign(d, { prevSeq: prev.seq, prevData: prev.data });
  if (end) LAST_PART.delete(id);
  else LAST_PART.set(id, { seq, data });
  mirror(org, d, "ses", "son");
  await setDoc(ref(org, "ses"), d);
  return true;
}
export async function finishSes(org, ctx, id, dur, to) {
  const logId = await logSent(org, { kind: "ses", dur: Math.round(dur), id, to: to?.name || "" }, ctx);
  return { id, ok: await confirmed(), logId };
}
// Kaydırıp iptal: çalınmakta olan parçalar ekranda durur (çalınmış olanlar geri alınamaz)
export function cancelSes(org, id) {
  LAST_PART.delete(id);
  const d = { id, at: Date.now(), cancel: true };
  mirror(org, d, "ses", "son");
  return setDoc(ref(org, "ses"), d).catch(() => {});
}

// Sporcudan Yönet'e bas-konuş (Seyhun 2026-11-16): ekran son kaydını bilgiGelen/{cihaz} belgesine yazar (cihaz başına tek belge,
// üstüne; depoda birikmez). Yazma kuralı bilgiTekne ile aynı (işletme hesabı ya da açık link anahtarı k); okuyan yalnız ana hesap.
// who: { org, k, ch, sail, name, uid }
export async function sendGelen(dev, who, blob, dur) {
  const data = await b64(blob);
  if (!dev || !data || data.length > 700000) return { ok: false };
  const d = {
    org: who.org,
    k: who.k || "",
    ch: who.ch || "",
    sail: String(who.sail || "").slice(0, 12),
    name: String(who.name || "").slice(0, 30),
    uid: who.uid || "",
    id: newId(),
    at: serverNow(),
    type: (blob.type || "audio/mp4").split(";")[0],
    dur: Math.round(dur),
    data,
  };
  await setDoc(doc(db, "bilgiGelen", dev), d);
  return { id: d.id, ok: await confirmed() };
}

// Yönet: sporculardan gelen son sesler (belge değişince okunur; açılıştaki eskiler çalınmaz, çalan taraf at'a bakar)
// Dönen: { list, ready (ilk cevap geldi), err (okunamadı: kural yayınlanmamış ya da izin yok) }
export function useGelen(org) {
  const [v, setV] = useState({ org: "", list: [], ready: false, err: false });
  useEffect(() => {
    if (!org) return;
    return onSnapshot(
      query(collection(db, "bilgiGelen"), where("org", "==", org)),
      (s) => setV({ org, list: s.docs.map((d) => ({ dev: d.id, ...d.data() })), ready: true, err: false }),
      () => setV({ org, list: [], ready: true, err: true }),
    );
  }, [org]);
  return v.org === org ? v : { list: [], ready: false, err: false };
}

// Gelen ses Yönet'te çalınınca günlüğe de yazılır (Kayıtlar; ses verisi yazılmaz)
export const logGelen = (org, g, ctx) => logSent(org, { kind: "gelen", dur: g.dur || 0, id: g.id, from: [g.sail, g.name].filter(Boolean).join(" ") }, ctx);

// Hazır kalıplar (Seyhun 2026-11-25 örnek "Yönet hazır kalıplar"): kaydedilmiş bas-konuş sesi. Liste orgs/{org}/bilgi/kaliplar { list: [{ id, name,
// dur, type, at, used, n }] } (Yönet açılınca tek okuma), ses orgs/{org}/bilgi/k-{id} { type, dur, data } ve linkin kopyası bilgiAcik/{anahtar}/ses/k-{id}.
// Gönderince bilgi/ses belgesine yalnız kalıp kimliği yazılır; sporcu ekranı sesi ilk sefer indirip saklar.
export const KALIP_MAX = 60;
const kalipRef = (org) => ref(org, "kaliplar");
export function useKaliplar(org) {
  const [v, setV] = useState({ org: "", list: null });
  useEffect(() => {
    if (!org) return;
    return onSnapshot(
      kalipRef(org),
      (d) => {
        // İlk açılışta hazır yazılı kalıplar bir kez eklenir (Seyhun 2026-11-25); silinenler geri gelmez (seeded)
        if (!d.metadata.fromCache && !d.data()?.seeded) seedKalip(org, Array.isArray(d.data()?.list) ? d.data().list : []).catch(() => {});
        setV({ org, list: Array.isArray(d.data()?.list) ? d.data().list : [] });
      },
      () => setV({ org, list: [] }),
    );
  }, [org]);
  return v.org === org ? v.list : null;
}
// Yazılı kalıp (Seyhun 2026-11-25 "Google seslendirmesini kullanarak"): { id, name, text } (ses yok); gönderilince yazılı mesaj gibi gider,
// sporcunun ekranı asistan sesiyle okur (aynı cümlenin sesi sunucuda saklı). Sesli kalıp: { id, name, dur, type } + k-{id} belgesinde ses.
// Önerilen cümleler (Seyhun 2026-11-25 "Optimist sınıfı yelkencilere verilen komutlar"): antrenör söyleyip kendi sesiyle kalıp yapar
export const KALIP_ONERI = [
  ["Yelken ayarı", ["İskotayı çek", "İskotayı boşalt", "Vangı sık", "Vangı gevşet", "Tüylere bak", "Yelkeni düzelt"]],
  ["Oturuş ve denge", ["Öne otur", "Arkaya otur", "Tekneyi düz tut", "Tekneyi biraz yatır", "Kayışa asıl", "Omuzları dışarı"]],
  ["Dümen ve rota", ["Hedefe bak", "Orsa çık", "Biraz boşla", "Dümeni yumuşak kullan", "Hızını koru"]],
  ["Rüzgâr", ["Rüzgâr dönüyor", "Basınç geliyor, hazırlan", "Sol tarafa geç", "Sağ tarafa geç"]],
  ["Manevra", ["Tramola hazırla", "Kavança hazırla", "Şamandıraya geniş gir, dar çık", "Şamandırayı yakın dön"]],
  ["Start", ["Hatta yaklaş", "Hattın gerisinde kal", "Yerini koru", "Boşluk bırak", "Hızlan, çık"]],
  ["Genel", ["Bana gel", "Kıyıya dönüyoruz", "Arkadaşını bekle", "Su iç", "Aferin, çok iyi", "Aynen böyle devam"]],
];
export const KALIP_HAZIR = ["İskota ayarına bak", "Tüyleri kontrol et", "Hedefi kontrol et", "İskota çek", "İskotayı boşalt", "Daha fazla trapeze çık", "Omuzları uzat"];
const kalipText = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
function seedKalip(org, list) {
  const t = Date.now();
  const have = new Set(list.map((x) => x.text || x.name));
  const add = KALIP_HAZIR.filter((x) => !have.has(x)).map((x, i) => ({ id: `y${(t + i).toString(36)}`, name: x, text: x, at: t, used: t - i, n: 0 }));
  return setDoc(kalipRef(org), { list: [...list, ...add].slice(0, KALIP_MAX), seeded: true }, { merge: true });
}
export async function addYaziKalip(org, list, text) {
  const t = kalipText(text);
  if (!t) throw new Error("empty");
  const item = { id: newId(), name: t, text: t, at: Date.now(), used: Date.now(), n: 0 };
  await setDoc(kalipRef(org), { list: [item, ...(list || [])].slice(0, KALIP_MAX) }, { merge: true });
  return item;
}
const kalipName = (s) =>
  String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30) || "Kalıp";
export async function saveKalip(org, list, { blob, dur, name }) {
  const data = await b64(blob);
  if (!data || data.length > 700000) throw new Error("big");
  const id = newId();
  const type = (blob.type || "audio/mp4").split(";")[0];
  const d = { type, dur: Math.round(dur), data, kalip: id };
  await setDoc(ref(org, `k-${id}`), d);
  mirror(org, d, "ses", `k-${id}`);
  const item = { id, name: kalipName(name), dur: Math.round(dur), type, at: Date.now(), used: Date.now(), n: 0 };
  // Aynı cümlenin yazılı kalıbı varsa yerini kendi sesi alır (önerilen cümleler, 2026-11-25)
  const rest = (list || []).filter((x) => !(x.text && x.text.toLocaleLowerCase("tr") === item.name.toLocaleLowerCase("tr")));
  await setDoc(kalipRef(org), { list: [item, ...rest].slice(0, KALIP_MAX) }, { merge: true });
  return item;
}
// Yazılı kalıpta ad = okunacak cümle
export const renameKalip = (org, list, id, name) =>
  setDoc(kalipRef(org), { list: (list || []).map((x) => (x.id === id ? (x.text ? { ...x, name: kalipText(name), text: kalipText(name) } : { ...x, name: kalipName(name) }) : x)) }, { merge: true });
export async function delKalip(org, list, id) {
  const k = (list || []).find((x) => x.id === id);
  await setDoc(kalipRef(org), { list: (list || []).filter((x) => x.id !== id) }, { merge: true });
  if (!k?.text) await deleteDoc(ref(org, `k-${id}`)).catch(() => {});
}
const MIRRORED = new Set();
export async function sendKalip(org, list, k, ctx, to = null) {
  if (k.text) {
    const r = await sendMsg(org, k.text, ctx, to);
    setDoc(kalipRef(org), { list: (list || []).map((x) => (x.id === k.id ? { ...x, used: Date.now(), n: (x.n || 0) + 1 } : x)) }, { merge: true }).catch(() => {});
    return r;
  }
  // Link sonradan yenilendiyse kopya yoktur: bu oturumda bir kez sesin kopyası tazelenir
  if (!MIRRORED.has(k.id)) {
    MIRRORED.add(k.id);
    getDoc(ref(org, `k-${k.id}`))
      .then((s) => s.exists() && mirror(org, s.data(), "ses", `k-${k.id}`))
      .catch(() => {});
  }
  const d = { id: newId(), at: serverNow(), type: k.type || "audio/mp4", dur: k.dur || 0, kalip: k.id, to: to?.dev || "" };
  mirror(org, d, "ses", "son");
  await setDoc(ref(org, "ses"), d);
  const logId = await logSent(org, { kind: "ses", dur: d.dur, id: d.id, to: to?.name || "", kalip: k.name || "" }, ctx);
  setDoc(kalipRef(org), { list: (list || []).map((x) => (x.id === k.id ? { ...x, used: Date.now(), n: (x.n || 0) + 1 } : x)) }, { merge: true }).catch(() => {});
  return { id: d.id, ok: await confirmed(), logId };
}
// Sporcu ekranı: kalıbın sesi (girişli: işletmenin belgesi, linkle: linkin kopyası); bir kez indirilir
const KSES = new Map();
export function kalipSes(org, pub, id) {
  if (!id) return Promise.resolve(null);
  if (!KSES.has(id)) {
    const r = pub ? pubRef(pub, "ses", `k-${id}`) : org ? ref(org, `k-${id}`) : null;
    // Linkte SDK okuyamazsa (usePublic gibi) REST ile
    const p = r
      ? getDoc(r).then(
          (s) => (s.exists() ? s.data() : null),
          () => (pub ? restGet(pub, `/ses/k-${id}`).catch(() => null) : null),
        )
      : Promise.resolve(null);
    KSES.set(id, p);
    p.then((x) => !x && KSES.delete(id));
  }
  return KSES.get(id);
}

// Sporcuya sesli not (Seyhun 2026-11-25 "o sporcuya özel bir sesli not"): hemen çalınmaz; o sporcuya (cihaz) ve güne saklanır, sporcu ekranında
// "Notlar" altında dinler. Ses orgs/{org}/bilgi/n-{id}, liste bilgi/notlar-{cihaz} { dev, uid, list: [{ id, dur, type, day, at }] } (en çok 20);
// açık link kopyası bilgiAcik/{key}/ses/ altında aynı adlarla. Kural değişmez (bilgi belgeleri).
const NOT_MAX = 20;
export async function sendNot(org, boat, blob, dur, day) {
  const data = await b64(blob);
  if (!boat?.id || !data || data.length > 700000) throw new Error("big");
  const id = newId();
  const type = (blob.type || "audio/mp4").split(";")[0];
  const d = { type, dur: Math.round(dur), data, not: id };
  await setDoc(ref(org, `n-${id}`), d);
  mirror(org, d, "ses", `n-${id}`);
  const lr = ref(org, `notlar-${boat.id}`);
  const cur = await getDoc(lr).then(
    (s) => (Array.isArray(s.data()?.list) ? s.data().list : []),
    () => [],
  );
  const item = { id, dur: Math.round(dur), type, day, at: Date.now() };
  const doc1 = { dev: boat.id, uid: boat.uid || "", list: [item, ...cur].slice(0, NOT_MAX) };
  await setDoc(lr, doc1);
  mirror(org, doc1, "ses", `notlar-${boat.id}`);
  return item;
}
export function useNotlar(org, pub, dev) {
  const [v, setV] = useState({ k: "", list: [] });
  const k = dev && (pub || org) ? `${pub || org}/${dev}` : "";
  useEffect(() => {
    if (!k) return;
    const r = pub ? pubRef(pub, "ses", `notlar-${dev}`) : ref(org, `notlar-${dev}`);
    return onSnapshot(
      r,
      (s) => setV({ k, list: Array.isArray(s.data()?.list) ? s.data().list : [] }),
      () => setV({ k, list: [] }),
    );
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return v.k === k ? v.list : [];
}
const NSES = new Map();
export function notSes(org, pub, id) {
  if (!id) return Promise.resolve(null);
  if (!NSES.has(id)) {
    const r = pub ? pubRef(pub, "ses", `n-${id}`) : org ? ref(org, `n-${id}`) : null;
    const p = r
      ? getDoc(r).then(
          (s) => (s.exists() ? s.data() : null),
          () => (pub ? restGet(pub, `/ses/n-${id}`).catch(() => null) : null),
        )
      : Promise.resolve(null);
    NSES.set(id, p);
    p.then((x) => !x && NSES.delete(id));
  }
  return NSES.get(id);
}
