"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { LoadFail } from "@/components/ui/LoadFail";
import { ListLoading } from "@/components/ui/Loader";
import { Sheet, SheetActions, SheetTone } from "@/components/ui/Sheet";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { liveHead } from "@/features/liveScreen/fonts";
import { BASE_CLUBS, loadClubs } from "@/features/clubs/clubs";
import { VELORA_ADMIN } from "@/lib/sharedRace";
import { SIZES, UCRETSIZ, fiyatOf, ibanGecerli, ibanYazi, limitOf, paketGecerli } from "@/lib/paket";
import { adminListe, adminOdemeKaydet, adminOnay, adminPaketVer, adminRed } from "./paketApi";

// Admin › Paketler (yalnız Velora ana hesabı; Seyhun 2026-11-27 "kim kayıt oldu, kim ödeme yapıp paket aldı, ben onaylayayım"):
// Onay bekleyen havaleler (Onayla → paket bugünden bir ay/yıl açılır), ödeme bekleyen seçimler, bütün kullanıcılar
// (kulübü, sporcu sayısı, paketi; dokununca elle paket), havale bilgisi (IBAN, alıcı; kullanıcının paket ekranında görünür).
const inputCls = "h-11 w-full rounded-xl border border-line bg-[#1f1f22] px-3.5 text-[0.9375rem] text-fg outline-none placeholder:text-mut/70 focus:border-acc";
const tl = (n) => `${n.toLocaleString("tr-TR")} ₺`;
const gun = (iso) => (iso ? new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "");
const Liste = ({ children }) => <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">{children}</div>;
const Baslik = ({ children }) => <p className="px-1 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-mut">{children}</p>;

export function AdminPaketler() {
  const { profile, user } = useAuth();
  const email = String(user?.email || profile?.email || "").toLowerCase();
  if (profile?.role !== "owner" || email !== VELORA_ADMIN) return null;
  return (
    <main className={`sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]`}>
      <SheetTone.Provider value="sahne">
        <Paketler />
      </SheetTone.Provider>
    </main>
  );
}

function Paketler() {
  const toast = useToast();
  const confirm = useConfirm();
  const [v, setV] = useState(null);
  const [hata, setHata] = useState(false);
  const [n, setN] = useState(0);
  const [kulup, setKulup] = useState(() => new Map(BASE_CLUBS.map((c) => [c.id, c.name])));
  const [sec, setSec] = useState(null); // elle paket verilecek kişi
  const [bekle, setBekle] = useState("");

  useEffect(() => {
    let on = true;
    adminListe().then(
      (x) => on && (setV(x), setHata(false)),
      () => on && setHata(true),
    );
    return () => {
      on = false;
    };
  }, [n]);
  useEffect(() => {
    loadClubs().then((l) => setKulup(new Map(l.map((c) => [c.id, c.name]))), () => {});
  }, []);

  const yenile = () => setN((x) => x + 1);
  const is = async (key, f, ok) => {
    setBekle(key);
    try {
      await f();
      toast(ok);
      yenile();
    } catch (e) {
      toast(e.message);
    } finally {
      setBekle("");
    }
  };

  const kisiler = useMemo(() => [...(v?.kisiler || [])].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [v]);
  const odendi = kisiler.filter((k) => k.istek?.durum === "odendi");
  const bekliyor = kisiler.filter((k) => k.istek?.durum === "bekliyor");
  const ust = (
    <section className="pb-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <header className="flex items-center gap-2.5">
        <BackButton href="/settings/admin" />
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="sahne-t truncate text-[2rem]">Paketler</h1>
          <p className="mt-1 truncate text-[0.8125rem] text-mut">{v ? `${kisiler.length} kullanıcı${odendi.length ? ` · ${odendi.length} onay bekliyor` : ""}` : "Kullanıcılar ve ödemeler"}</p>
        </div>
      </header>
    </section>
  );
  if (hata)
    return (
      <>
        {ust}
        <LoadFail onRetry={() => (setHata(false), yenile())} />
      </>
    );
  if (!v)
    return (
      <>
        {ust}
        <ListLoading height="16rem" />
      </>
    );
  return (
    <>
      {ust}
      <div className="space-y-6">
        {!!odendi.length && (
          <div className="space-y-2">
            <Baslik>Onay bekleyen ödemeler</Baslik>
            <Liste>
              {odendi.map((k) => (
                <div key={k.uid} className="space-y-2 px-4 py-3">
                  <div className="flex items-baseline gap-2">
                    <b className="min-w-0 flex-1 truncate text-[0.9375rem]">{k.name || k.email}</b>
                    <span className="shrink-0 text-[0.9375rem] font-bold tabular-nums">{tl(fiyatOf(k.istek.size, k.istek.period))}</span>
                  </div>
                  <p className="text-[0.8125rem] text-mut">
                    {k.istek.size} sporcu · {k.istek.period === "yil" ? "Yıllık" : "Aylık"} · {k.kod || ""} · {gun(k.istek.odendiAt)}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" disabled={!!bekle} onClick={() => confirm({ title: `${k.name || k.email} isteği reddedilsin mi?`, text: "Paket açılmaz, istek silinir.", yes: "Reddet", run: () => is(k.uid, () => adminRed(k.uid), "Reddedildi") })} className="h-10 rounded-xl bg-[#1f1f22] text-[0.875rem] font-semibold text-white">
                      Reddet
                    </button>
                    <button type="button" disabled={!!bekle} onClick={() => is(k.uid, () => adminOnay(k.uid), "Paket açıldı")} className="h-10 rounded-xl bg-acc text-[0.875rem] font-bold text-[#111]">
                      {bekle === k.uid ? "…" : "Onayla"}
                    </button>
                  </div>
                </div>
              ))}
            </Liste>
          </div>
        )}

        {!!bekliyor.length && (
          <div className="space-y-2">
            <Baslik>Ödeme bekleyen seçimler</Baslik>
            <Liste>
              {bekliyor.map((k) => (
                <div key={k.uid} className="flex min-h-[3rem] items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{k.name || k.email}</span>
                  <span className="shrink-0 text-[0.8125rem] text-mut">
                    {k.istek.size} sporcu · {gun(k.istek.at)}
                  </span>
                </div>
              ))}
            </Liste>
          </div>
        )}

        <div className="space-y-2">
          <Baslik>Kullanıcılar</Baslik>
          <Liste>
            {kisiler.map((k) => {
              const limit = limitOf(k.paket, { admin: k.admin });
              const paket = k.admin ? "Sınırsız" : limit === Infinity ? "Sınırsız" : limit === UCRETSIZ ? "Ücretsiz" : `${limit} sporcu${k.paket?.until ? ` · ${gun(k.paket.until)}` : ""}`;
              const dolu = limit !== Infinity && k.count >= limit;
              return (
                <button key={k.uid} type="button" disabled={k.admin} onClick={() => setSec(k)} className="flex min-h-[3.5rem] w-full items-center gap-3 px-4 py-2 text-left active:bg-white/5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium">{k.name || k.email}</span>
                    <span className="block truncate text-[0.8125rem] text-mut">{[k.email, kulup.get(k.clubId) || "Kulüpsüz", gun(k.createdAt)].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className={`block text-[0.9375rem] font-semibold tabular-nums ${dolu ? "text-acc" : ""}`}>{limit === Infinity ? k.count : `${k.count} / ${limit}`}</span>
                    <span className="block text-[0.75rem] text-mut">{paket}</span>
                  </span>
                </button>
              );
            })}
          </Liste>
        </div>

        <Odeme odeme={v.odeme} kaydet={(o) => is("odeme", () => adminOdemeKaydet(o), "Kaydedildi")} bekle={bekle === "odeme"} />
      </div>
      <ElleSheet key={sec?.uid || "-"} k={sec} kapat={() => setSec(null)} ver={(p) => is(sec.uid, () => adminPaketVer(sec.uid, p), "Paket kaydedildi").then(() => setSec(null))} bekle={!!bekle} />
    </>
  );
}

function Odeme({ odeme, kaydet, bekle }) {
  const [iban, setIban] = useState(odeme?.iban ? ibanYazi(odeme.iban) : "");
  const [alici, setAlici] = useState(odeme?.alici || "");
  const ok = !iban || ibanGecerli(iban);
  return (
    <div className="space-y-2">
      <Baslik>Havale bilgisi</Baslik>
      <div className="space-y-3 rounded-[1.25rem] border border-line bg-card p-4">
        <label htmlFor="paket-iban" className="block text-[0.8125rem] font-medium text-mut">
          IBAN
        </label>
        <input id="paket-iban" className={inputCls} value={iban} onChange={(e) => setIban(e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" autoComplete="off" inputMode="text" />
        {!ok && <p className="text-[0.8125rem] text-rec">TR ile başlayan 26 karakter olmalı.</p>}
        <label htmlFor="paket-alici" className="block text-[0.8125rem] font-medium text-mut">
          Alıcı adı
        </label>
        <input id="paket-alici" className={inputCls} value={alici} onChange={(e) => setAlici(e.target.value)} placeholder="Ad soyad ya da şirket" autoComplete="off" />
        <button type="button" disabled={bekle || !ok} onClick={() => kaydet({ iban, alici })} className="h-11 w-full rounded-xl bg-acc text-[0.9375rem] font-bold text-[#111] disabled:opacity-60">
          {bekle ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}

// Elle paket: 3 (ücretsize dön), 10, 15, 20 ya da Sınırsız; aylık/yıllık; bitiş günü (boş: süresiz)
function ElleSheet({ k, kapat, ver, bekle }) {
  const p = k?.paket && paketGecerli(k.paket) ? k.paket : null;
  const [size, setSize] = useState(p ? p.size : UCRETSIZ);
  const [period, setPeriod] = useState(p?.period || "ay");
  const [until, setUntil] = useState(p?.until || "");
  return (
    <Sheet
      open={!!k}
      onClose={kapat}
      title={k ? `${k.name || k.email} · paket` : "Paket"}
      footer={<SheetActions onCancel={kapat} onYes={() => ver({ size, period, until: size === UCRETSIZ ? "" : until })} yes={bekle ? "Kaydediliyor…" : "Kaydet"} disabled={bekle} />}
    >
      <div className="space-y-4 pb-2">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sporcu sayısı">
          {[...SIZES, 0].map((s) => (
            <button key={s} type="button" role="radio" aria-checked={size === s} onClick={() => setSize(s)} className={`h-10 rounded-xl px-4 text-[0.9375rem] font-semibold ${size === s ? "bg-acc text-[#111]" : "bg-[#1f1f22] text-white"}`}>
              {s === 0 ? "Sınırsız" : s === UCRETSIZ ? "3 · Ücretsiz" : s}
            </button>
          ))}
        </div>
        {size !== UCRETSIZ && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["ay", "Aylık"],
                ["yil", "Yıllık"],
              ].map(([x, ad]) => (
                <button key={x} type="button" aria-pressed={period === x} onClick={() => setPeriod(x)} className={`h-10 rounded-xl text-[0.9375rem] font-semibold ${period === x ? "bg-white text-[#111]" : "bg-[#1f1f22] text-white"}`}>
                  {ad}
                </button>
              ))}
            </div>
            <label htmlFor="paket-bitis" className="block text-[0.8125rem] font-medium text-mut">
              Bitiş günü (boşsa süresiz)
            </label>
            <input id="paket-bitis" type="date" className={inputCls} value={until} onChange={(e) => setUntil(e.target.value)} />
          </>
        )}
        {k && <p className="text-[0.8125rem] text-mut">Şu an {k.count} sporcusu var.</p>}
      </div>
    </Sheet>
  );
}
