"use client";

import { useState } from "react";

const input =
  "h-12 w-full rounded-xl border border-transparent bg-bg px-3.5 text-base text-fg outline-none transition placeholder:text-mut/70 focus:border-acc focus:bg-card";

// Etiketli yazı alanı. hint: alanın altında küçük açıklama
export function Field({ label, hint, ...p }) {
  return (
    <label className="block">
      <span className="text-[0.8125rem] font-medium text-mut">{label}</span>
      <input {...p} className={`mt-1.5 ${input}`} />
      {hint && <span className="mt-1 block text-[0.75rem] text-mut">{hint}</span>}
    </label>
  );
}

// Şifre alanı: "Göster / Gizle" düğmeli
export function PasswordField({ label = "Şifre", hint, ...p }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="text-[0.8125rem] font-medium text-mut">{label}</span>
      <span className="relative mt-1.5 block">
        <input {...p} type={show ? "text" : "password"} className={`${input} pr-20`} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Şifreyi gizle" : "Şifreyi göster"}
          className="absolute inset-y-0 right-1.5 my-auto h-9 rounded-lg px-3 text-[0.8125rem] font-medium text-mut transition active:bg-line"
        >
          {show ? "Gizle" : "Göster"}
        </button>
      </span>
      {hint && <span className="mt-1 block text-[0.75rem] text-mut">{hint}</span>}
    </label>
  );
}
