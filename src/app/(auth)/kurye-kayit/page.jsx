"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Field, PasswordField } from "@/components/ui/Field";
import { authErrorMessage, login } from "@/lib/auth";
import { cleanLogin, validUsername } from "@/lib/kinds";

// Velora Yemek kurye kaydı (Seyhun 2026-10-23): ad, telefon, kullanıcı adı, şifre. Hesap sunucuda açılır (/api/kurye),
// sonra giriş yapılır; kurye uygulamada yalnız kurye ekranını görür. Ana hesap Yönetim › Kuryeler'de kaydı açınca açık.
const CARD = "rounded-3xl bg-card p-6 text-fg";

export default function CourierSignupPage() {
  const [open, setOpen] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/kurye").then((r) => r.json()).then((j) => setOpen(!!j.open)).catch(() => setOpen(false));
  }, []);

  if (open === null) return null;
  if (!open) {
    return (
      <div className={CARD}>
        <h1 className="text-[1.375rem] font-semibold tracking-tight">Kurye kaydı kapalı</h1>
        <Link href="/login" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-acc text-base font-semibold text-white active:scale-[.98]">
          Girişe dön
        </Link>
      </div>
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const login_ = cleanLogin(user);
    if (!validUsername(login_)) return setError("Kullanıcı adı en az 3 karakter olmalı (harf, rakam, nokta).");
    if (password.length < 6) return setError("Şifre en az 6 karakter olmalı.");
    setBusy(true);
    try {
      const res = await fetch("/api/kurye", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "register", name, phone, login: login_, password }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Hesap açılamadı.");
      await login(login_, password);
    } catch (err) {
      setError(err?.code ? authErrorMessage(err) : err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={CARD}>
      <h1 className="text-[1.375rem] font-semibold tracking-tight">Kurye kaydı</h1>
      <div className="mt-6 space-y-4">
        <Field label="Ad soyad" autoComplete="name" autoCapitalize="words" value={name} onChange={(e) => setName(e.target.value)} required autoFocus maxLength={30} />
        <Field label="Telefon" type="tel" autoComplete="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
        <Field label="Kullanıcı adı" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={user} onChange={(e) => setUser(e.target.value)} required maxLength={30} />
        <PasswordField autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-rec/10 px-3.5 py-2.5 text-[0.875rem] text-rec">{error}</p>}
      <Button type="submit" loading={busy} disabled={!name.trim()} className="mt-5">Kayıt ol</Button>
      <p className="mt-5 text-center text-[0.875rem] text-mut">
        Hesabın var mı? <Link href="/login" className="font-semibold text-acc">Giriş yap</Link>
      </p>
    </form>
  );
}
