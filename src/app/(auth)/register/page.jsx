"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authErrorMessage, register } from "@/lib/auth";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-mut">Sesli Asistan</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Kayıt ol</h1>
      </div>

      <Field label="Ad soyad" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
      <Field label="E-posta" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Field label="Şifre" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />

      {error && <p className="rounded-xl bg-rec/10 px-3 py-2 text-sm text-rec">{error}</p>}

      <Button type="submit" loading={busy}>Hesap oluştur</Button>

      <p className="pt-2 text-center text-sm text-mut">
        Zaten hesabın var mı? <Link href="/login" className="font-semibold text-acc">Giriş yap</Link>
      </p>
    </form>
  );
}
