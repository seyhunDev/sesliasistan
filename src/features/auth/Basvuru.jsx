"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { ROLLER, adHata, kulupHata, mailHata, telHata, telYaz } from "@/lib/basvuru";

// "Kayıt ol" = başvuru (Seyhun 2026-11-27, kart "Başvuru formu (Katıl ile aynı)"): kayıt kapalıyken giriş ekranındaki Kayıt ol
// tanıtımdaki "Velora'ya katıl" formunun aynısını açar. Aynı kurallar (lib/basvuru), aynı yer (/api/basvuru › Ayarlar › Admin ›
// Başvurular, kaynak "Uygulama"). Hesabı ana hesap Başvurular'dan açar; giriş bilgileri ondan gelir.
const CARD = "rounded-3xl bg-card p-6 text-fg";
const metin = (h) => (h && typeof h === "object" ? h.t : h);

export function Basvuru() {
  const [rol, setRol] = useState(ROLLER[0]);
  const [ad, setAd] = useState("");
  const [tel, setTel] = useState("");
  const [mail, setMail] = useState("");
  const [kulup, setKulup] = useState("");
  const [web, setWeb] = useState(""); // bot tuzağı (görünmez)
  const [hata, setHata] = useState({});
  const [genel, setGenel] = useState("");
  const [busy, setBusy] = useState(false);
  const [bitti, setBitti] = useState(false);

  if (bitti) {
    return (
      <div className={CARD}>
        <span className="grid size-14 place-items-center rounded-full bg-[#d4ff3a]">
          <svg viewBox="0 0 24 24" className="size-7 fill-none stroke-[#0f0f11]" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h1 className="mt-4 text-[1.375rem] font-semibold tracking-tight">Başvurun alındı</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-mut">Hesabın açılınca giriş bilgilerini alacaksın.</p>
        <Link href="/login" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-acc text-base font-semibold text-white active:scale-[.98]">
          Girişe dön
        </Link>
      </div>
    );
  }

  async function gonder(e) {
    e.preventDefault();
    setGenel("");
    const h = { ad: metin(adHata(ad)), tel: telHata(tel), kulup: kulupHata(kulup) };
    const mh = mailHata(mail);
    if (typeof mh === "string") h.mail = mh;
    Object.keys(h).forEach((k) => !h[k] && delete h[k]);
    setHata(h);
    if (Object.keys(h).length) return;
    setBusy(true);
    try {
      const r = await fetch("/api/basvuru", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rol, ad: ad.trim(), tel, mail: mail.trim(), kulup: kulup.trim(), kaynak: "Uygulama", web }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) return setBitti(true);
      if (j.hatalar) setHata(j.hatalar);
      setGenel(j.error || "Başvuru gönderilemedi, biraz sonra yeniden dene.");
    } catch {
      setGenel("İnternet bağlantısı yok. Bağlantını kontrol edip tekrar dene.");
    }
    setBusy(false);
  }

  const mh = mailHata(mail);
  const alt = (k) => hata[k] && <span className="mt-1 block text-[0.8125rem] text-rec">{hata[k]}</span>;

  return (
    <form onSubmit={gonder} className={CARD} noValidate>
      <h1 className="text-[1.375rem] font-semibold tracking-tight">Velora&apos;ya katıl</h1>

      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Kimsin">
        {ROLLER.map((r) => (
          <button
            key={r}
            type="button"
            aria-pressed={rol === r}
            onClick={() => setRol(r)}
            className={`rounded-full border px-3.5 py-1.5 text-[0.875rem] font-semibold transition active:scale-[.97] ${rol === r ? "border-[#d4ff3a] bg-[#d4ff3a] text-[#0f0f11]" : "border-line text-mut"}`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <Field label="Ad soyad" autoComplete="name" autoCapitalize="words" value={ad} onChange={(e) => setAd(e.target.value)} />
          {alt("ad")}
        </div>
        <div>
          <span className="text-[0.8125rem] font-medium text-mut">Cep telefonu</span>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="flex h-12 shrink-0 items-center rounded-xl border border-line px-3 text-[0.9375rem] text-mut">+90</span>
            <input
              className="h-12 min-w-0 flex-1 rounded-xl border border-line bg-card px-3.5 text-[1rem] text-fg outline-none focus:border-acc"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              aria-label="Cep telefonu"
              placeholder="5xx xxx xx xx"
              value={tel}
              onChange={(e) => setTel(telYaz(e.target.value.replace(/\D/g, "").slice(0, 10)))}
            />
          </div>
          {alt("tel")}
        </div>
        <div>
          <Field label="E-posta" type="email" autoComplete="email" inputMode="email" autoCapitalize="none" placeholder="ornek@mail.com" value={mail} onChange={(e) => setMail(e.target.value)} />
          {mh && typeof mh === "object" && (
            <button type="button" onClick={() => setMail(mh.fix)} className="mt-1 block text-left text-[0.8125rem] font-semibold text-acc">
              {mh.t} Düzelt
            </button>
          )}
          {alt("mail")}
        </div>
        <div>
          <Field label="Kulüp ve şehir" placeholder="Örnek: Didim Yelken, Aydın" value={kulup} onChange={(e) => setKulup(e.target.value)} />
          {alt("kulup")}
        </div>
        <input type="text" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" value={web} onChange={(e) => setWeb(e.target.value)} />
      </div>

      {genel && <p role="alert" className="mt-4 rounded-xl bg-rec/10 px-3.5 py-2.5 text-[0.875rem] text-rec">{genel}</p>}

      <Button type="submit" loading={busy} className="mt-5">Başvur</Button>

      <p className="mt-5 text-center text-[0.875rem] text-mut">
        Hesabın var mı? <Link href="/login" className="font-semibold text-acc">Giriş yap</Link>
      </p>
    </form>
  );
}
