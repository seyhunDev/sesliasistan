"use client";

import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { loginMessage, waPhone } from "@/lib/kinds";

// Hesap açılınca / yeni şifre verilince tek ekran (Seyhun 2026-11-25): Adres, Kullanıcı adı, Şifre; her biri Kopyala,
// altta "Hepsini kopyala" ve telefon varsa WhatsApp. Şifre hiçbir yerde saklanmaz, yalnız bu ekranda görünür.
// list (toplu açılış): [{ name, login, role, note, error }] — tek şifre ortak, her sporcunun kullanıcı adı listede.
export function LoginResult({ name, forName = "", login, password, phone, list, onDone }) {
  const toast = useToast();
  const site = typeof location !== "undefined" ? location.origin : "";
  const copy = (v) => navigator.clipboard?.writeText(v).then(() => toast("Kopyalandı"), () => toast("Kopyalanamadı"));
  const text = list
    ? ["Velora giriş bilgileri", site, `Şifre: ${password}`, ...list.filter((d) => d.login && !d.error).map((d) => `${d.name}: ${d.login}`)].join("\n")
    : loginMessage({ name, forName, login, password, site });
  const to = !list && waPhone(phone);
  const line = (label, value) => (
    <div className="flex min-h-[2.75rem] items-center gap-3 border-t border-line py-1.5 first:border-t-0">
      <span className="w-24 shrink-0 text-[0.8125rem] text-mut">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold tabular-nums">{value}</span>
      <button type="button" onClick={() => copy(value)} data-press className="btn btn-text btn-sm shrink-0">
        Kopyala
      </button>
    </div>
  );
  return (
    <div className="space-y-3 pb-2">
      <div className="rounded-2xl bg-card px-3.5 py-1 ring-1 ring-line">
        {line("Adres", site.replace(/^https?:\/\//, ""))}
        {!list && line("Kullanıcı adı", login)}
        {line(list ? "Ortak şifre" : "Şifre", password)}
      </div>
      {list && (
        <ul className="rounded-2xl bg-card px-3.5 py-1 text-[0.875rem] ring-1 ring-line">
          {list.map((d, i) => (
            <li key={i} className="flex min-h-[2.5rem] items-center justify-between gap-2 border-t border-line first:border-t-0">
              <span className="min-w-0 truncate">
                {d.name} <small className="text-mut">· {d.role || "Sporcu"}</small>
              </span>
              {d.error ? (
                <small className="shrink-0 text-rec">{d.error}</small>
              ) : (
                <b className="shrink-0 font-semibold">
                  {d.login}
                  {d.note ? <small className="font-normal text-mut"> ({d.note})</small> : ""}
                </b>
              )}
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => copy(text)} data-press className="btn btn-primary w-full">
        Hepsini kopyala
      </button>
      {to && (
        <a href={`https://wa.me/${to}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25d366] text-[0.9375rem] font-semibold text-white">
          <Icon name="whatsapp" className="size-5" /> WhatsApp’ta gönder
        </a>
      )}
      {onDone && (
        <button type="button" onClick={onDone} data-press className="btn btn-secondary w-full">
          Tamam
        </button>
      )}
    </div>
  );
}
