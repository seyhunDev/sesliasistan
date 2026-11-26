"use client";

// Kullanım kaydının telefondaki işleyişi (lib/kullanim.js açıklamasına bak). Yalnız izin veren hesapta başlar.
// Sayfa süresi dakikada bir birikime eklenir; birikim localStorage'da durur (uygulama kapansa da kaybolmaz) ve en geç 5 dakikada
// bir, ayrıca uygulama arka plana geçince tek toplu yazmayla Firestore'a gider. Çevrimdışıyken Firestore kendi kuyruğunda tutar.
import { collection, deleteField, doc, getDocs, increment, serverTimestamp, setDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { buildLine } from "@/lib/buildInfo";
import { KIND_LABEL } from "@/lib/kinds";
import { ESIK_SN, YAZ_ARALIK, cihazOf, eskiGunler, gunOf, oturumYaz, sayfaAdi, sureEkle } from "@/lib/kullanim";

const oku = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v == null ? d : JSON.parse(v);
  } catch {
    return d;
  }
};
const yaz = (k, v) => {
  try {
    if (v === undefined) localStorage.removeItem(k);
    else localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};

// İzin: telefonda önbellek (her açılışta Firestore okunmasın). true | false | undefined (bilinmiyor)
export const izinOku = (uid) => oku(`kullanim-izin:${uid}`, undefined);
export const izinYazYerel = (uid, v) => yaz(`kullanim-izin:${uid}`, v);

export const hesapRef = (org, uid) => doc(db, "orgs", org, "kullanim", uid);
const gunRef = (org, uid, gun) => doc(db, "orgs", org, "kullanim", uid, "gun", gun);

let aktif = null; // { org, uid, ad, tur, sayfa, t0, s0, sonYaz, timer, off }

const birikKey = () => `kullanim-birik:${aktif.uid}`;
function sayfaKapat(now) {
  if (!aktif?.t0) return;
  const sn = (now - aktif.t0) / 1000;
  if (sn >= ESIK_SN) {
    const b = sureEkle(oku(birikKey(), {}), { gun: gunOf(aktif.t0), sayfa: aktif.sayfa, sn });
    yaz(birikKey(), b);
  }
  aktif.t0 = now;
}
function oturumGuncelle(now) {
  if (!aktif?.s0) return;
  yaz(birikKey(), oturumYaz(oku(birikKey(), {}), aktif.s0, now));
}

// Birikimi tek toplu yazmayla gönderir; birikim hemen boşalır (yazma Firestore'un çevrimdışı kuyruğunda bekler)
function gonder() {
  if (!aktif) return;
  const b = oku(birikKey(), {});
  const gunler = Object.keys(b);
  aktif.sonYaz = Date.now();
  if (!gunler.length) return;
  yaz(birikKey(), {});
  const { org, uid } = aktif;
  const batch = writeBatch(db);
  const hesap = {
    uid,
    ad: aktif.ad,
    tur: aktif.tur,
    izin: true,
    son: serverTimestamp(),
    cihaz: cihazOf(navigator.userAgent, { touch: navigator.maxTouchPoints, app: !!window.Capacitor?.isNativePlatform?.() }),
    surum: buildLine().split(" · ").slice(0, 2).join(" · "),
    gunler: {},
  };
  for (const g of gunler) {
    const v = b[g];
    const sayfa = {};
    for (const [k, sn] of Object.entries(v.sayfa || {})) sayfa[k] = increment(sn);
    batch.set(gunRef(org, uid, g), { sn: increment(v.sn || 0), sayfa, oturum: v.oturum || {} }, { merge: true });
    hesap.gunler[g] = increment(v.sn || 0);
  }
  // Günde bir kez: 90 günden eski günler silinir
  const bugun = gunOf();
  if (oku(`kullanim-temiz:${uid}`, "") !== bugun) {
    yaz(`kullanim-temiz:${uid}`, bugun);
    for (const g of eskiGunler(bugun)) {
      batch.delete(gunRef(org, uid, g));
      hesap.gunler[g] = deleteField();
    }
  }
  batch.set(hesapRef(org, uid), hesap, { merge: true });
  batch.commit().catch((e) => console.warn("[kullanım] yazılamadı:", e?.code || e?.message));
}

function gorunur() {
  if (!aktif) return;
  const now = Date.now();
  if (document.visibilityState === "visible") {
    aktif.s0 = now;
    aktif.t0 = now;
  } else {
    sayfaKapat(now);
    oturumGuncelle(now);
    aktif.s0 = 0;
    aktif.t0 = 0;
    gonder();
  }
}

export function kayitBaslat({ org, uid, ad, tur, path }) {
  if (aktif?.uid === uid) return;
  kayitDurdur();
  const now = Date.now();
  const vis = document.visibilityState === "visible";
  aktif = { org, uid, ad, tur: KIND_LABEL[tur] || tur || "", sayfa: sayfaAdi(path), t0: vis ? now : 0, s0: vis ? now : 0, sonYaz: now };
  document.addEventListener("visibilitychange", gorunur);
  window.addEventListener("pagehide", gorunur);
  aktif.timer = setInterval(() => {
    if (!aktif?.t0) return;
    const t = Date.now();
    sayfaKapat(t);
    oturumGuncelle(t);
    if (t - aktif.sonYaz >= YAZ_ARALIK) gonder();
  }, 60e3);
  // İlk yazma kısa süre sonra (son görülme ve cihaz hemen görünsün)
  setTimeout(() => aktif?.uid === uid && (sayfaKapat(Date.now()), oturumGuncelle(Date.now()), gonder()), 20e3);
}

export function kayitSayfa(path) {
  if (!aktif) return;
  const ad = sayfaAdi(path);
  if (ad === aktif.sayfa) return;
  sayfaKapat(Date.now());
  aktif.sayfa = ad;
}

export function kayitDurdur() {
  if (!aktif) return;
  clearInterval(aktif.timer);
  document.removeEventListener("visibilitychange", gorunur);
  window.removeEventListener("pagehide", gorunur);
  aktif = null;
}

// İzin değişti. Kabul: hesap belgesi izin: true. Ret ya da geri alma: kayıt durur, bu hesabın bütün gün kayıtları silinir,
// belgede yalnız ad ve "izin yok" kalır (Admin'de "İzin yok" görünür).
export async function izinVer({ org, uid, ad, tur }, evet) {
  izinYazYerel(uid, evet);
  const ref = hesapRef(org, uid);
  if (evet) {
    await setDoc(ref, { uid, ad, tur: KIND_LABEL[tur] || tur || "", izin: true, izinAt: serverTimestamp() }, { merge: true });
    return;
  }
  kayitDurdur();
  yaz(`kullanim-birik:${uid}`, undefined);
  const gunler = await getDocs(collection(db, "orgs", org, "kullanim", uid, "gun")).catch(() => null);
  const batch = writeBatch(db);
  gunler?.docs.forEach((d) => batch.delete(d.ref));
  batch.set(ref, { uid, ad, tur: KIND_LABEL[tur] || tur || "", izin: false, izinAt: serverTimestamp(), gunler: deleteField(), son: deleteField(), cihaz: deleteField(), surum: deleteField() }, { merge: true });
  await batch.commit();
}
