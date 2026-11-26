"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getDoc } from "firebase/firestore";
import { useAuth } from "@/features/auth/AuthProvider";
import { useHesap } from "@/features/auth/useHesap";
import { Row, Switch } from "@/features/settings/ui";
import { useToast } from "@/components/ui/ToastProvider";
import { hesapRef, izinOku, izinVer, izinYazYerel, kayitBaslat, kayitDurdur, kayitSayfa } from "./kayit";

// Kullanım kaydı (Seyhun 2026-11-26 "İzinle birlikte başlasın", örnek project-files/admin-sayfasi/ornek.html):
// her hesap bir kez kısa bir izin sorusu görür; yalnız "Kabul" diyenin kullanımı kaydedilir. Ayarlar › Kullanım kaydı'ndan değişir.

const kayitli = (p) => p && (p.role === "owner" || p.role === "staff");
const hesapOf = (p) => ({ org: p.orgId, uid: p.uid, ad: p.name || "", tur: p.kind });

// İzin durumu: önce telefondaki önbellek, yoksa hesabın kullanım belgesi (bir kez okunur). null: hiç sorulmadı
function useIzin(profile) {
  const uid = profile?.uid;
  const [izin, setIzin] = useState(() => (uid ? izinOku(uid) : undefined));
  useEffect(() => {
    if (!kayitli(profile)) return;
    if (izinOku(uid) !== undefined) return; // ilk değer önbellekten geldi
    let on = true;
    getDoc(hesapRef(profile.orgId, uid))
      .then((s) => {
        const v = s.exists() ? s.data().izin : undefined;
        if (typeof v === "boolean") izinYazYerel(uid, v);
        on && setIzin(typeof v === "boolean" ? v : null);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const f = (e) => e.detail?.uid === uid && setIzin(e.detail.izin);
    window.addEventListener("kullanim-izin", f);
    return () => window.removeEventListener("kullanim-izin", f);
  }, [uid]);
  return izin;
}
const haber = (uid, izin) => window.dispatchEvent(new CustomEvent("kullanim-izin", { detail: { uid, izin } }));

// Uygulama düzeninde bir kez: izin varsa kaydı yürütür; hiç sorulmadıysa ana sayfada birkaç saniye sonra soruyu gösterir.
export function KullanimKaydi() {
  const { profile } = useAuth();
  const { preview } = useHesap();
  const path = usePathname();
  const izin = useIzin(profile);
  const [soru, setSoru] = useState(false);

  useEffect(() => {
    if (!kayitli(profile) || izin !== true) return;
    kayitBaslat({ ...hesapOf(profile), path: location.pathname });
    return () => kayitDurdur();
  }, [profile?.uid, izin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (izin === true) kayitSayfa(path);
  }, [path, izin]);

  // Soru yalnız ana sayfada, açılıştan 15 sn sonra (açılış ve tanıtım pencereleriyle çakışmasın); "… gibi gör"de sorulmaz
  useEffect(() => {
    if (izin !== null || preview || path !== "/" || !kayitli(profile)) return;
    const t = setTimeout(() => setSoru(true), 15e3);
    return () => clearTimeout(t);
  }, [izin, preview, path, profile]);

  if (!soru || izin !== null) return null;
  const sec = (evet) => {
    setSoru(false);
    haber(profile.uid, evet);
    izinVer(hesapOf(profile), evet).catch(() => {});
  };
  return <IzinSorusu onSec={sec} />;
}

// Alttan pencere: başlık, tek cümle, kaydedilenler, Kabul / Hayır (Seyhun 2026-11-26: kaydedilmeyenler listesi yok)
function IzinSorusu({ onSec }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="kullanim-baslik">
      <div className="w-full max-w-[26rem] rounded-t-[1.5rem] border-t border-[#2c2c31] bg-[#141416] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2.5 text-white sm:rounded-[1.5rem] sm:border">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#3a3a40]" />
        <h2 id="kullanim-baslik" className="sahne-t text-[2rem] [text-wrap:balance]">Velora&apos;yı birlikte geliştirelim</h2>
        <p className="mt-3 text-[0.9375rem] leading-snug text-[#e4e4e7]">
          Uygulamayı hangi sayfada ne kadar kullandığını kaydetmek istiyoruz. Bu kayıtlar yalnız Velora&apos;yı daha iyi yapmak için kullanılır, kimseyle paylaşılmaz.
        </p>
        <div className="mt-4 rounded-2xl border border-[#26262b] bg-[#17171a] px-4 py-3">
          <p className="text-[0.75rem] font-bold tracking-[0.06em] text-[#d4ff3a]">KAYDEDİLEN</p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-[0.875rem] text-[#e4e4e7]">
            <li>Giriş ve çıkış saati</li>
            <li>Açılan sayfalar ve süreleri</li>
            <li>Cihaz ve sürüm</li>
          </ul>
        </div>
        <button type="button" onClick={() => onSec(true)} className="sahne-t mt-4 h-[3.25rem] w-full rounded-2xl bg-[#d4ff3a] text-[1.35rem] text-[#111] shadow-[0_4px_0_#8ea620] transition active:translate-y-[3px] active:shadow-[0_1px_0_#8ea620]">
          Kabul
        </button>
        <button type="button" onClick={() => onSec(false)} className="mt-1 h-11 w-full text-[0.9375rem] font-semibold text-[#a1a1aa]">
          Hayır, teşekkürler
        </button>
        <p className="text-center text-[0.75rem] text-[#71717a]">Sonra Ayarlar › Kullanım kaydı&apos;ndan değiştirebilirsin.</p>
      </div>
    </div>
  );
}

// Ayarlar › Hesap: Kullanım kaydı anahtarı (herkeste)
export function KullanimRow() {
  const { profile } = useAuth();
  const toast = useToast();
  const izin = useIzin(profile);
  const [bekle, setBekle] = useState(false);
  if (!kayitli(profile)) return null;
  const degis = async (v) => {
    setBekle(true);
    haber(profile.uid, v);
    try {
      await izinVer(hesapOf(profile), v);
      toast?.(v ? "Kullanım kaydı açıldı" : "Kullanım kaydı kapandı, kayıtların silindi");
    } catch {
      toast?.("Kaydedilemedi, bağlantını kontrol et");
    } finally {
      setBekle(false);
    }
  };
  return <Row title="Kullanım kaydı" right={<Switch on={izin === true} onChange={degis} label="Kullanım kaydı" disabled={bekle} />} />;
}
