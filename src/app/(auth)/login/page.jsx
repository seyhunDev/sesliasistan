"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authErrorMessage, login } from "@/lib/auth";

const DEMO = { email: "ana@example.com", password: "Demo1234!" };

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password); // başarılıysa (auth) layout ana sayfaya yönlendirir
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-mut">Sesli Asistan</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Giriş yap</h1>
      </div>

      <Field label="E-posta" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Field label="Şifre" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />

      {error && <p className="rounded-xl bg-rec/10 px-3 py-2 text-sm text-rec">{error}</p>}

      <Button type="submit" loading={busy}>Giriş yap</Button>

      <button
        type="button"
        onClick={() => { setEmail(DEMO.email); setPassword(DEMO.password); }}
        className="w-full text-sm font-medium text-acc"
      >
        Demo bilgilerini doldur
      </button>

      <p className="pt-2 text-center text-sm text-mut">
        Hesabın yok mu? <Link href="/register" className="font-semibold text-acc">Kayıt ol</Link>
      </p>
    </form>
  );
}
