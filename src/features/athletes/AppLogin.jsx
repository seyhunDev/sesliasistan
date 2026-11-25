"use client";

import { useState } from "react";
import { ListHead, RowList } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { authFetch } from "@/lib/authFetch";
import { shownLogin } from "@/lib/kinds";
import { AccessSheet } from "./AccessSheet";

const randomPw = () => Math.random().toString(36).slice(2, 6) + Math.floor(1000 + Math.random() * 9000);

// Sporcu detayında "Uygulama": giriş adresi, kullanıcı adı, şifre; her biri tek dokunuşla kopyalanır. Yalnız ana hesap görür.
// Şifre hiçbir yerde saklanmaz (proje kuralı): hesap bu ekrandan açılınca ya da "Yeni şifre" ile verilince bu açılışta görünür.
export function AppLogin({ athlete }) {
  const { members, isStaff } = useData();
  const toast = useToast();
  const [pw, setPw] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (isStaff) return null;
  const m = members.find((x) => x.athleteId === athlete.id && x.account !== false && x.status !== "left");
  const site = typeof location !== "undefined" ? location.origin : "";
  const login = m ? shownLogin(m.loginName || m.email) : "";

  const copy = (v) => navigator.clipboard?.writeText(v).then(() => toast("Kopyalandı"), () => toast("Kopyalanamadı"));
  async function fresh() {
    setBusy(true);
    const next = randomPw();
    try {
      const res = await authFetch("/api/staff", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ uid: m.uid, password: next }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Şifre verilemedi");
      setPw(next);
    } catch (e) {
      toast(e.message);
    }
    setBusy(false);
  }

  const line = (label, value, extra) => (
    <div className="flex min-h-[2.75rem] items-center gap-3 border-t border-line py-1.5 first:border-t-0">
      <span className="w-20 shrink-0 text-[0.8125rem] text-mut">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold tabular-nums">{value}</span>
      {extra}
      {value && (
        <button type="button" onClick={() => copy(value)} data-press className="btn btn-text btn-sm shrink-0">
          Kopyala
        </button>
      )}
    </div>
  );

  return (
    <section>
      <ListHead title="Uygulama" />
      <RowList className="py-1">
        {!m ? (
          <div className="flex min-h-[2.75rem] items-center justify-between gap-3 py-1.5">
            <span className="text-[0.9375rem] text-mut">Hesap yok</span>
            <button type="button" onClick={() => setOpen(true)} data-press className="btn btn-primary btn-sm shrink-0">
              Hesap aç
            </button>
          </div>
        ) : (
          <>
            {line("Adres", site)}
            {line("Kullanıcı adı", login)}
            {line(
              "Şifre",
              pw,
              !pw && (
                <button type="button" disabled={busy} onClick={fresh} data-press className="btn btn-secondary btn-sm shrink-0">
                  {busy ? "…" : "Yeni şifre"}
                </button>
              ),
            )}
          </>
        )}
      </RowList>
      {open && (
        <AccessSheet
          open
          athletes={[athlete]}
          onClose={(finished, password) => {
            setOpen(false);
            if (finished && password) setPw(password);
          }}
        />
      )}
    </section>
  );
}
