"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { authErrorMessage, login, resetPassword } from "@/lib/auth";

// Yeni kayıt yalnızca NEXT_PUBLIC_ALLOW_SIGNUP=1 iken açık
const SIGNUP = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "1";

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // login | reset | sent
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const go = (m) => {
    setError("");
    setMode(m);
  };

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "reset") {
        await resetPassword(email);
        setMode("sent");
      } else {
        await login(email, password); // başarılıysa (auth) layout ana sayfaya yönlendirir
        return;
      }
    } catch (err) {
      // Hesabın olup olmadığını belli etme: sıfırlamada "kullanıcı yok" da gönderildi sayılır
      if (mode === "reset" && err?.code === "auth/user-not-found") setMode("sent");
      else setError(authErrorMessage(err));
    }
    setBusy(false);
  }

  if (mode === "sent") {
    return (
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">E-postanı kontrol et</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-mut">
          <b className="font-medium text-fg">{email}</b> adresine kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderdik. Gelmediyse gereksiz (spam) klasörüne de bak.
        </p>
        <Button className="mt-6" onClick={() => go("login")}>Girişe dön</Button>
      </div>
    );
  }

  const reset = mode === "reset";
  return (
    <form onSubmit={onSubmit}>
      <h1 className="text-[22px] font-semibold tracking-tight">{reset ? "Şifreni sıfırla" : "Giriş yap"}</h1>
      <p className="mt-1 text-[14px] text-mut">{reset ? "E-postanı yaz, sıfırlama bağlantısı gönderelim." : "Hesabınla devam et."}</p>

      <div className="mt-6 space-y-4">
        <Field label="E-posta" type="email" autoComplete="email" inputMode="email" placeholder="ornek@eposta.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        {!reset && <PasswordField autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
      </div>

      {!reset && (
        <div className="mt-2 text-right">
          <button type="button" onClick={() => go("reset")} className="text-[13px] font-medium text-acc active:opacity-60">
            Şifremi unuttum
          </button>
        </div>
      )}

      {error && <p role="alert" className="mt-4 rounded-xl bg-rec/10 px-3.5 py-2.5 text-[14px] text-rec">{error}</p>}

      <Button type="submit" loading={busy} className="mt-5">
        {reset ? "Bağlantı gönder" : "Giriş yap"}
      </Button>

      {reset ? (
        <button type="button" onClick={() => go("login")} className="mt-4 block w-full text-center text-[14px] font-medium text-mut active:opacity-60">
          Girişe dön
        </button>
      ) : (
        SIGNUP && (
          <p className="mt-5 text-center text-[14px] text-mut">
            Hesabın yok mu? <Link href="/register" className="font-semibold text-acc">Kayıt ol</Link>
          </p>
        )
      )}
    </form>
  );
}
