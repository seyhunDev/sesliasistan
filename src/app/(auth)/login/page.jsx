"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { authErrorMessage, login, resetPassword } from "@/lib/auth";
import { cleanLogin, validLogin } from "@/lib/kinds";

// Yeni kayıt yalnızca NEXT_PUBLIC_ALLOW_SIGNUP=1 iken açık
const SIGNUP = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "1";

// Yazarken küçük harfe çevir ("I" → "i", Türkçe "ı" değil); boşluk alınmaz
const typed = (v) => v.replace(/I/g, "i").toLocaleLowerCase("tr-TR").replace(/\s/g, "");

function Check() {
  return (
    <span className="pointer-events-none absolute inset-y-0 right-3.5 my-auto grid size-[1.625rem] place-items-center rounded-full bg-ok">
      <svg viewBox="0 0 24 24" className="size-[0.9375rem] fill-none stroke-white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

// İki adım (Seyhun 2026-10-22): önce e-posta ya da kullanıcı adı (doğru yazılınca yeşil, Devam), sonra şifre
export default function LoginPage() {
  const [step, setStep] = useState("id"); // id | pw | sent
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [move, setMove] = useState(""); // adım değişince form yandan kayar: "" (ilk açılış) | fwd | back
  const ok = validLogin(id);
  const isEmail = id.includes("@");

  const go = (s, back = false) => {
    setError("");
    setMove(back ? "back" : "fwd");
    setStep(s);
  };
  // Adım kutusu: her adım yeni çizilir (key), ileri sağdan, geri soldan gelir
  const stepProps = { className: move ? "auth-step" : undefined, "data-back": move === "back" || undefined };

  async function onSubmit(e) {
    e.preventDefault();
    if (step === "id") {
      if (ok) go("pw");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await login(id, password); // başarılıysa (auth) layout ana sayfaya yönlendirir
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  async function forgot() {
    if (!isEmail) {
      setError("Kullanıcı adıyla açılan hesabın şifresini ana hesap yeniler (Kişiler › kişi › Şifreyi değiştir).");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await resetPassword(cleanLogin(id));
      setMove("fwd");
      setStep("sent");
    } catch (err) {
      // Hesabın olup olmadığını belli etme: "kullanıcı yok" da gönderildi sayılır
      if (err?.code === "auth/user-not-found") {
        setMove("fwd");
        setStep("sent");
      }
      else setError(authErrorMessage(err));
    }
    setBusy(false);
  }

  const errorBox = error && (
    <p role="alert" className="mt-3 rounded-xl bg-rec/20 px-3.5 py-2.5 text-[0.875rem] text-white">
      {error}
    </p>
  );

  if (step === "sent") {
    return (
      <div key={step} {...stepProps}>
        <h1 className="text-[1.25rem] font-semibold text-white">E-postanı kontrol et</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-white/70">
          <b className="font-semibold text-white">{cleanLogin(id)}</b> adresine kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderdik. Gelmediyse gereksiz (spam) klasörüne de bak.
        </p>
        <Button className="mt-6" onClick={() => go("pw", true)}>Girişe dön</Button>
      </div>
    );
  }

  if (step === "pw") {
    return (
      <form onSubmit={onSubmit} key={step} {...stepProps}>
        <h1 className="mb-3.5 text-[1.25rem] font-semibold text-white">Şifre</h1>
        {/* Şifre yöneticisi hangi hesap olduğunu bilsin */}
        <input type="text" name="username" autoComplete="username" value={cleanLogin(id)} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
        <div className="ck-glass mb-3 flex h-12 items-center gap-2 rounded-[0.875rem] pl-3.5 pr-1">
          <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{cleanLogin(id)}</span>
          <Button type="button" variant="text" size="sm" onClick={() => { setPassword(""); go("id", true); }}>Değiştir</Button>
        </div>
        <div className="relative">
          <input
            className="auth-in pr-20"
            type={show ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            enterKeyHint="go"
            aria-label="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoFocus
          />
          <Button type="button" variant="text" size="sm" className="absolute inset-y-0 right-1.5 my-auto" onClick={() => setShow((s) => !s)} aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}>
            {show ? "Gizle" : "Göster"}
          </Button>
        </div>
        {errorBox}
        <Button type="submit" loading={busy} aria-busy={busy} disabled={!password} className="mt-3.5 h-[3.375rem]">
          Giriş yap
        </Button>
        <div className="mt-2 text-right">
          <Button type="button" variant="text" size="sm" onClick={forgot} disabled={busy}>Şifremi unuttum</Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} key={step} {...stepProps}>
      <h1 className="mb-3.5 text-[1.25rem] font-semibold text-white">Giriş yap</h1>
      <div className="relative">
        <input
          className={`auth-in ${ok ? "pr-14" : ""}`}
          data-ok={ok ? "" : undefined}
          type="text"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          enterKeyHint="next"
          aria-label="E-posta ya da kullanıcı adı"
          placeholder="E-posta ya da kullanıcı adı"
          value={id}
          onChange={(e) => setId(typed(e.target.value))}
          autoFocus
        />
        {ok && <Check />}
      </div>
      {errorBox}
      <Button type="submit" disabled={!ok} className="mt-3.5 h-[3.375rem]">
        Devam
      </Button>
      {SIGNUP && (
        <p className="mt-5 text-center text-[0.875rem] text-white/60">
          Hesabın yok mu? <Link href="/register" className="font-semibold text-[#67e8f9]">Kayıt ol</Link>
        </p>
      )}
      <p className="mt-3 text-center text-[0.875rem] text-white/60">
        <Link href="/kurye-kayit" className="font-semibold text-[#67e8f9]">Kurye olarak kayıt ol</Link>
      </p>
    </form>
  );
}
