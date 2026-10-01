"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { authErrorMessage, register } from "@/lib/auth";

const SIGNUP = process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "1";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Kayıt kapalıyken form yerine bilgi göster
  if (!SIGNUP) {
    return (
      <div>
        <h1 className="text-[1.375rem] font-semibold tracking-tight">Kayıt kapalı</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-mut">Yeni hesaplar yönetici tarafından açılıyor. Erişim için yöneticiyle iletişime geç.</p>
        <Link href="/login" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-acc text-base font-semibold text-white active:scale-[.98]">
          Girişe dön
        </Link>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 6) return setError("Şifre en az 6 karakter olmalı.");
    setBusy(true);
    try {
      await register(name, email, password);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <h1 className="text-[1.375rem] font-semibold tracking-tight">Hesap oluştur</h1>
      <p className="mt-1 text-[0.875rem] text-mut">Birkaç bilgiyle hemen başla.</p>

      <div className="mt-6 space-y-4">
        <Field label="Ad soyad" autoComplete="name" autoCapitalize="words" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <Field label="E-posta" type="email" autoComplete="email" inputMode="email" placeholder="ornek@eposta.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <PasswordField autoComplete="new-password" hint="En az 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-rec/10 px-3.5 py-2.5 text-[0.875rem] text-rec">{error}</p>}

      <Button type="submit" loading={busy} className="mt-5">Hesap oluştur</Button>

      <p className="mt-5 text-center text-[0.875rem] text-mut">
        Zaten hesabın var mı? <Link href="/login" className="font-semibold text-acc">Giriş yap</Link>
      </p>
    </form>
  );
}
