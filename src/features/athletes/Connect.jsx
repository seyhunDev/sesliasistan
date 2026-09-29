"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useAuth } from "@/features/auth/AuthProvider";
import { dikiliAuth } from "./dikili";
import { forget } from "./data";

// Sporcu projesinde (dikili) açık oturum; null = giriş yok, undefined = henüz bilinmiyor
export function useDikiliUser() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(dikiliAuth(), (u) => setUser(u)), []);
  return user;
}

export async function disconnect() {
  forget();
  await signOut(dikiliAuth());
}

const authError = (code) =>
  ({
    "auth/invalid-credential": "E-posta ya da şifre yanlış.",
    "auth/wrong-password": "E-posta ya da şifre yanlış.",
    "auth/user-not-found": "Bu e-postayla kulüp hesabı yok.",
    "auth/invalid-email": "Geçerli bir e-posta yaz.",
    "auth/too-many-requests": "Çok fazla deneme yapıldı. Biraz sonra tekrar dene.",
    "auth/network-request-failed": "Bağlantı yok. İnternetini kontrol et.",
  })[code] || "Giriş yapılamadı.";

// Kulüp uygulamasının hesabıyla bir kez giriş (oturum bu cihazda kalır)
export function DikiliLogin({ onDone, denied }) {
  const { profile } = useAuth();
  const user = useDikiliUser();
  const [email, setEmail] = useState(profile?.email || "");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await signInWithEmailAndPassword(dikiliAuth(), email.trim(), pass);
      forget();
      onDone?.();
    } catch (x) {
      setMsg(authError(x.code));
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    if (!email.trim()) return setMsg("Önce e-postanı yaz.");
    try {
      await sendPasswordResetEmail(dikiliAuth(), email.trim());
      setMsg("Şifre yenileme bağlantısı e-postana gönderildi.");
    } catch (x) {
      setMsg(authError(x.code));
    }
  };

  // Giriş var ama kurallar izin vermiyor
  if (denied && user) {
    return (
      <section className="mt-4 rounded-2xl bg-card px-4 py-4 text-[14px] shadow-[0_1px_3px_rgba(38,40,44,.05)]">
        <b className="block font-semibold text-rec">Bu hesabın sporcuları görme izni yok.</b>
        <p className="mt-1 text-mut">{user.email} ile bağlısın. Kulüp uygulamasında yönetici olan hesapla bağlan.</p>
        <button onClick={() => disconnect()} className="mt-3 h-10 w-full rounded-xl bg-bg font-semibold active:scale-[.98]">
          Başka hesapla bağlan
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl bg-card px-4 py-4 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
      <b className="block text-[16px] font-semibold">Kulüp hesabına bağlan</b>
      <p className="mt-1 text-[13px] leading-snug text-mut">
        Sporcular Dikili kulüp uygulamasında duruyor. O uygulamada kullandığın e-posta ve şifreyle bir kez bağlan; bu cihazda hatırlanır.
      </p>
      <input
        type="email"
        autoComplete="username"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-posta"
        className="mt-3 h-11 w-full rounded-xl bg-bg px-3.5 text-[15px] outline-none"
      />
      <input
        type="password"
        autoComplete="current-password"
        value={pass}
        onChange={(e) => setPass(e.target.value)}
        placeholder="Şifre"
        className="mt-2 h-11 w-full rounded-xl bg-bg px-3.5 text-[15px] outline-none"
      />
      {msg && <p className={`mt-2 text-[13px] ${msg.includes("gönderildi") ? "text-ok" : "text-rec"}`}>{msg}</p>}
      <button type="submit" disabled={busy || !email || !pass} className="mt-3 h-11 w-full rounded-xl bg-acc text-[15px] font-semibold text-white disabled:opacity-50 active:scale-[.98]">
        {busy ? "Bağlanıyor…" : "Bağlan"}
      </button>
      <button type="button" onClick={reset} className="mt-2 w-full py-1 text-[13px] text-mut">
        Şifremi unuttum
      </button>
    </form>
  );
}
