"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { authFetch } from "@/lib/authFetch";
import { Row } from "./ui";

// Ayarlar › Hesap › "Hesapları temizle" (Seyhun 2026-11-25): ana hesap dışındaki tüm Velora giriş hesapları (sporcu, veli,
// çalışan, aile, yarım kalmış eski denemeler). Önce liste gelir, hiçbir şey silinmez; "N hesabı sil" + onaydan sonra silinir.
// Kalır: ana hesap, Yemek'in kurye ve restoran hesapları, Kişiler kayıtları (hesapsız), kulüpteki sporcu kartları.
export function CleanAccountsRow() {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null); // null: yükleniyor
  const [err, setErr] = useState("");
  const confirm = useConfirm();
  const toast = useToast();

  async function load() {
    setOpen(true);
    setList(null);
    setErr("");
    try {
      const res = await authFetch("/api/hesap-temizle");
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Liste alınamadı");
      setList(d.list || []);
    } catch (e) {
      setErr(e.message);
      setList([]);
    }
  }

  const clean = () =>
    confirm({
      title: `${list.length} hesap silinsin mi?`,
      text: "Bu kişiler artık giriş yapamaz. Geri alınamaz.",
      yes: "Sil",
      run: async () => {
        const res = await authFetch("/api/hesap-temizle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ uids: list.map((x) => x.uid) }) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast(d.error || "Silinemedi");
          throw new Error();
        }
        toast(d.failed?.length ? `${d.done} hesap silindi · ${d.failed.length} silinemedi` : `${d.done} hesap silindi`);
        setOpen(false);
      },
    });

  return (
    <>
      <Row title="Hesapları temizle" danger onClick={load} chevron />
      <Sheet open={open} onClose={() => setOpen(false)} title="Hesapları temizle">
        <div className="space-y-3 pb-2">
          {list === null ? (
            <p className="py-6 text-center text-[0.875rem] text-mut">Yükleniyor…</p>
          ) : err ? (
            <p className="py-4 text-center text-[0.875rem] text-rec">{err}</p>
          ) : !list.length ? (
            <p className="py-6 text-center text-[0.9375rem] text-mut">Ana hesap dışında hesap yok.</p>
          ) : (
            <>
              <ul className="rounded-2xl bg-card px-3.5 py-1 text-[0.875rem] ring-1 ring-line">
                {list.map((x) => (
                  <li key={x.uid} className="flex min-h-[2.5rem] items-center justify-between gap-2 border-t border-line first:border-t-0">
                    <span className="min-w-0 truncate">
                      {x.name} <small className="text-mut">· {x.label}</small>
                    </span>
                    <small className="shrink-0 text-mut">{x.login}</small>
                  </li>
                ))}
              </ul>
              <p className="px-1 text-[0.8125rem] text-mut">Kalır: ana hesabın, Yemek kurye ve restoran hesapları, kulüpteki sporcu kartları.</p>
              <button type="button" onClick={clean} data-press className="btn btn-danger h-12 w-full">
                {list.length} hesabı sil
              </button>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
