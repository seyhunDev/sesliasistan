"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { deleteField, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";

// Planı ana sayfa listesinde gizle (Seyhun 2026-10-20: "10 gün kala, 20 gün ya da artı eksiyle; tarihi gelince gösterilsin"): planın homeDays
// alanına gün yazılır, gününe o kadar gün kalana dek listede çıkmaz (homeHidden), takvimde hep görünür. Gizliyse "Hep göster" alanı siler.
// all: listenin toplu ayarı (Seyhun: "toplu olarak yalnız 10 gün kalan planları göster"; users.homeDays), plan yerine açılır
export function HideSheet({ plan, all, onClose }) {
  const { profile } = useAuth();
  const { updateRecord } = useData();
  const toast = useToast();
  const [got, setGot] = useState({ id: "", n: 10 });
  if (!plan && !all) return <Sheet open={false} onClose={onClose} title="" />;
  const id = plan?.id || "all";
  const cur = plan ? plan.homeDays : profile?.homeDays;
  const n = got.id === id ? got.n : Number.isFinite(cur) ? cur : 10;
  const set = (v) => setGot({ id, n: Math.max(1, Math.min(365, v)) });
  const by = { name: profile?.name ?? "Kullanıcı" };
  const save = (patch, msg) => {
    if (plan) updateRecord("plan", plan.id, patch, by);
    else updateDoc(doc(db, "users", profile.uid), patch).catch(() => toast("Kaydedilemedi, tekrar dene."));
    toast(msg);
    onClose();
  };
  const pick = "h-11 flex-1 rounded-xl text-[0.9375rem] font-semibold";
  return (
    <Sheet open onClose={onClose} title={plan ? "Listede gizle" : "Sıradaki planlar"}>
      <div className="space-y-3 pb-1">
        {plan && <p className="break-words text-[0.9375rem]">{plan.title}</p>}
        <p className="text-[0.875rem] text-mut">{plan ? "Kaç gün kala görünsün?" : "Listede kaç gün kalan planlar görünsün?"}</p>
        <div className="flex gap-2">
          {[10, 20].map((v) => (
            <button key={v} type="button" data-press onClick={() => set(v)} className={`${pick} ${n === v ? "acc-btn" : "raised bg-card text-acc"}`}>
              {v} gün
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl bg-bg px-2 py-1.5">
          <button type="button" data-press aria-label="Bir gün az" onClick={() => set(n - 1)} className="raised grid size-10 place-items-center rounded-xl bg-card text-[1.25rem] font-semibold text-acc">
            −
          </button>
          <span className="text-[1rem] font-semibold tabular-nums">{n} gün kala</span>
          <button type="button" data-press aria-label="Bir gün fazla" onClick={() => set(n + 1)} className="raised grid size-10 place-items-center rounded-xl bg-card text-acc">
            <Icon name="plus" className="size-4" />
          </button>
        </div>
        <button type="button" data-press onClick={() => save({ homeDays: n }, plan ? `Gizlendi, ${n} gün kala görünecek` : `Yalnız ${n} gün kalanlar görünecek`)} className="acc-btn flex h-12 w-full items-center justify-center rounded-2xl text-[0.9375rem] font-semibold">
          {plan ? "Gizle" : "Kaydet"}
        </button>
        {Number.isFinite(cur) && (
          <button type="button" data-press onClick={() => save({ homeDays: deleteField() }, plan ? "Listede hep görünecek" : "Bütün planlar görünecek")} className="raised flex h-12 w-full items-center justify-center rounded-2xl bg-card text-[0.9375rem] font-semibold text-acc">
            {plan ? "Hep göster" : "Hepsini göster"}
          </button>
        )}
      </div>
    </Sheet>
  );
}
