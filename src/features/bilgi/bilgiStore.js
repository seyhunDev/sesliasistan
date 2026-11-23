"use client";

import { useEffect, useState } from "react";
import { arrayUnion, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, waitForPendingWrites, where } from "firebase/firestore";
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
  return addDoc(collection(db, "orgs", org, "bilgiLog"), { ...item, at: Date.now(), ch: ctx.ch || "", label: ctx.label || "", state: ctx.state || "", course: ctx.course || "" }).then(
    (r) => r.id,
    () => "",
  );
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
  await saveBilgi(org, { msg: { id, text: t, at: Date.now(), to: to?.dev || "" } });
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
export async function openKanal(org, name, prev = null) {
  const id = newId();
  const n = kanalName(name);
  const at = await startKanal(org, id, n, prev);
  await setDoc(kanalRef(org, id), { name: n, at, end: null });
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
export function useKanallar(org) {
  const [v, setV] = useState(null);
  useEffect(() => {
    if (!org) return;
    return onSnapshot(
      query(collection(db, "orgs", org, "bilgiKanal"), orderBy("at", "desc"), limit(40)),
      (s) => setV(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setV([]),
    );
  }, [org]);
  return org ? v : null;
}
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
  const refs = (await Promise.all([top("bilgiIz"), top("bilgiTekne"), top("bilgiGelen"), log])).flat();
  for (let i = 0; i < refs.length; i += 20) await Promise.all(refs.slice(i, i + 20).map((r) => deleteDoc(r).catch(() => {})));
  await deleteDoc(kanalRef(org, id));
  return refs.length;
}

// İz (Seyhun 2026-11-17 "sonra sporcunun ne yaptığını izlemek istiyorum"): ekran 5 sn'de bir nokta toplar, dakikada bir tek belge yazar.
// bilgiIz { org, k, ch, dev, sail, name, uid, t0, pts: [sn, enlem, boylam, hız (kn), …] düz liste (Firestore iç içe dizi almaz) }
export const sendIz = (d) => addDoc(collection(db, "bilgiIz"), d);
export async function loadIz(org, ch) {
  const s = await getDocs(query(collection(db, "bilgiIz"), where("org", "==", org), where("ch", "==", ch)));
  return s.docs.map((d) => d.data());
}

// Son gönderilenler (yönetimde açılınca bir kez okunur)
// id: mesaj/ses kimliği (kayıtta varsa; yoksa belge kimliği), logId: günlük belgesinin kimliği (silme, gizleme)
export async function loadLog(org, n = 30) {
  const s = await getDocs(query(collection(db, "orgs", org, "bilgiLog"), orderBy("at", "desc"), limit(n)));
  return s.docs.map((d) => ({ id: d.id, ...d.data(), logId: d.id }));
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
    at: Date.now(),
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
