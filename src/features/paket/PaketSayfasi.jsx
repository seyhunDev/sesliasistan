"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { LoadFail } from "@/components/ui/LoadFail";
import { ListLoading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { liveHead } from "@/features/liveScreen/fonts";
import { DURUM, PAKETLER, UCRETSIZ, fiyatOf, ibanYazi, paketGecerli } from "@/lib/paket";
import { istekIptal, odemeYaptim, paketGetir, paketIste } from "./paketApi";
import { PaketSayac } from "./PaketKart";

// Ayarlar › Paketim (örnek https://claude.ai/artifact/55qoArYjYQCeJpyLvbmgCP, Seyhun 2026-11-27 "Yap"): Aylık / Yıllık, paketler,
// seçince havale bilgisi (IBAN, alıcı, tutar, açıklama kodu) ve "Ödemeyi yaptım". Onay Admin › Paketler'den; onaylanınca paket açılır.
const tl = (n) => `${n.toLocaleString("tr-TR")} ₺`;
const tarihYaz = (g) => (g ? new Date(`${g}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : "");

export function PaketSayfasi() {
  const { profile } = useAuth();
  const toast = useToast();
  const [v, setV] = useState(null);
  const [hata, setHata] = useState(false);
  const [period, setPeriod] = useState("ay");
  const [sec, setSec] = useState(15);
  const [bekle, setBekle] = useState(false);
  const [n, setN] = useState(0);

  useEffect(() => {
    let on = true;
    paketGetir().then(
      (x) => on && (setV(x), setHata(false), x.istek && (setSec(x.istek.size), setPeriod(x.istek.period))),
      () => on && setHata(true),
    );
    return () => {
      on = false;
    };
  }, [n]);

  const is = async (f, ok) => {
    setBekle(true);
    try {
      const r = await f();
      setV((x) => ({ ...x, istek: r.istek ?? null, ...(r.odeme ? { odeme: r.odeme } : {}), ...(r.kod ? { kod: r.kod } : {}) }));
      if (ok) toast(ok);
    } catch (e) {
      toast(e.message);
    } finally {
      setBekle(false);
    }
  };

  if (profile && profile.role !== "owner") return null;
  const limit = v ? (v.limit == null ? Infinity : v.limit) : null;
  const paket = v?.paket && paketGecerli(v.paket) ? v.paket : null;
  const ist = v?.istek;
  return (
    <main className={`sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]`}>
      <section className="pb-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <header className="flex items-center gap-2.5">
          <BackButton href="/settings" />
          <h1 className="sahne-t truncate text-[2rem]">
            Paket <span className="text-acc">seç</span>
          </h1>
        </header>
      </section>
      {hata ? (
        <LoadFail onRetry={() => (setHata(false), setN((x) => x + 1))} />
      ) : !v ? (
        <ListLoading height="20rem" />
      ) : (
        <div className="space-y-4">
          <PaketSayac count={v.count} limit={limit} paket={paket} />
          {limit === Infinity && !paket ? null : ist ? (
            <Havale v={v} ist={ist} bekle={bekle} odedim={() => is(odemeYaptim, "Bildirildi, onay bekliyor")} iptal={() => is(istekIptal, "İstek geri alındı")} />
          ) : (
            <>
              <div className="grid grid-cols-2 rounded-xl bg-[#1f1f22] p-[3px] text-[0.8125rem] font-semibold" role="tablist">
                {[
                  ["ay", "Aylık"],
                  ["yil", "Yıllık · 2 ay bedava"],
                ].map(([k, ad]) => (
                  <button key={k} type="button" role="tab" aria-selected={period === k} onClick={() => setPeriod(k)} className={`rounded-[9px] py-2 ${period === k ? "bg-white text-[#111]" : "text-mut"}`}>
                    {ad}
                  </button>
                ))}
              </div>
              <div className="space-y-2" role="radiogroup" aria-label="Paketler">
                <Secenek n={UCRETSIZ} ad="Ücretsiz" alt={!paket ? "Şu anki paketin" : ""} fiyat="0 ₺" on={false} />
                {PAKETLER.map((p) => (
                  <Secenek
                    key={p.size}
                    n={p.size}
                    ad={`${p.size} sporcu`}
                    alt={paket?.size === p.size ? `Şu anki paketin · ${tarihYaz(paket.until)} bitiyor` : ""}
                    fiyat={tl(fiyatOf(p.size, period))}
                    per={period === "yil" ? "/ yıl" : "/ ay"}
                    on={sec === p.size}
                    onClick={() => setSec(p.size)}
                  />
                ))}
              </div>
              <button type="button" data-press disabled={bekle} onClick={() => is(() => paketIste(sec, period))} className="h-[3.25rem] w-full rounded-2xl bg-acc text-[1rem] font-bold text-[#111] active:scale-[.98] disabled:opacity-60">
                {bekle ? "…" : paket?.size === sec ? "Paketi yenile" : `${sec} sporcuya geç`}
              </button>
            </>
          )}
        </div>
      )}
    </main>
  );
}

function Secenek({ n, ad, alt, fiyat, per, on, onClick }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={!onClick}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left ${on ? "border-acc bg-[rgba(212,255,58,.12)]" : "border-line bg-card"} ${onClick ? "active:scale-[.99]" : ""}`}
    >
      <span className="sahne-t w-10 text-[1.6rem]">{n}</span>
      <span className="min-w-0 flex-1">
        <b className="block text-[0.9375rem] font-semibold">{ad}</b>
        {alt && <small className="block truncate text-[0.8125rem] text-mut">{alt}</small>}
      </span>
      <span className="text-right text-[0.9375rem] font-bold tabular-nums">
        {fiyat}
        {per && <small className="block text-[0.75rem] font-medium text-mut">{per}</small>}
      </span>
    </button>
  );
}

// Havale bilgisi: seçilen paket, tutar, IBAN, alıcı, açıklama kodu; "Ödemeyi yaptım" ya da onay bekleniyor
function Havale({ v, ist, bekle, odedim, iptal }) {
  const toast = useToast();
  const kopya = async (t, ad) => {
    try {
      await navigator.clipboard.writeText(t);
      toast(`${ad} kopyalandı`);
    } catch {
      toast(t);
    }
  };
  const tutar = tl(fiyatOf(ist.size, ist.period));
  const satirlar = [
    ["Paket", `${ist.size} sporcu · ${ist.period === "yil" ? "Yıllık" : "Aylık"}`],
    ["Tutar", tutar, true],
    ["IBAN", v.odeme?.iban ? ibanYazi(v.odeme.iban) : "", true],
    ["Alıcı", v.odeme?.alici || "", true],
    ["Açıklama", v.kod, true],
  ].filter(([, d]) => d);
  return (
    <div className="space-y-3">
      <p className="px-1 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-mut">{ist.durum === "odendi" ? DURUM.odendi : "Havale bilgisi"}</p>
      <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">
        {satirlar.map(([ad, d, k]) => (
          <div key={ad} className="flex min-h-[3rem] items-center gap-3 px-4 py-2">
            <span className="w-20 shrink-0 text-[0.875rem] text-mut">{ad}</span>
            <span className="min-w-0 flex-1 break-words text-[0.9375rem] font-semibold tabular-nums">{d}</span>
            {k && (
              <button type="button" onClick={() => kopya(ad === "IBAN" ? v.odeme.iban : d, ad)} className="shrink-0 text-[0.8125rem] font-semibold text-acc">
                Kopyala
              </button>
            )}
          </div>
        ))}
        {!v.odeme?.iban && <p className="px-4 py-3 text-[0.875rem] text-mut">IBAN henüz eklenmedi. Biraz sonra tekrar bak.</p>}
      </div>
      {ist.durum === "odendi" ? (
        <p className="px-1 text-[0.9375rem] text-mut">Ödemen kontrol edilince paketin açılır.</p>
      ) : (
        <>
          <p className="px-1 text-[0.875rem] text-mut">Açıklamaya {v.kod} yaz.</p>
          <button type="button" data-press disabled={bekle || !v.odeme?.iban} onClick={odedim} className="h-[3.25rem] w-full rounded-2xl bg-acc text-[1rem] font-bold text-[#111] active:scale-[.98] disabled:opacity-60">
            {bekle ? "…" : "Ödemeyi yaptım"}
          </button>
        </>
      )}
      <button type="button" disabled={bekle} onClick={iptal} className="h-11 w-full rounded-2xl bg-[#1f1f22] text-[0.9375rem] font-semibold text-white active:scale-[.98]">
        {ist.durum === "odendi" ? "İsteği geri al" : "Başka paket seç"}
      </button>
    </div>
  );
}
