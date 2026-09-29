"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { aliasesOf, generate, missing } from "./names";

// Ses adları: yapay zekanın hazırladığı söylenişleri gör, düzelt, yeniden oluştur
export function NamesSheet({ open, onClose, idx, save, athletes, classes }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ses adları">
      {open && <Body idx={idx} save={save} athletes={athletes} classes={classes} onClose={onClose} />}
    </Sheet>
  );
}

function Body({ idx, save, athletes, classes, onClose }) {
  const toast = useToast();
  const [draft, setDraft] = useState(() => Object.fromEntries(athletes.map((a) => [a.id, aliasesOf(idx, a.id).join(", ")])));
  const [busy, setBusy] = useState("");
  const lack = missing(idx, athletes).length;

  const regen = async (all) => {
    setBusy("gen");
    try {
      const next = await generate(idx, athletes, classes, all ? null : missing(idx, athletes));
      await save(next);
      setDraft(Object.fromEntries(athletes.map((a) => [a.id, aliasesOf(next, a.id).join(", ")])));
      toast("Ses adları hazır");
    } catch (e) {
      toast(e.message);
    }
    setBusy("");
  };

  const store = async () => {
    setBusy("save");
    const list = { ...(idx.list || {}) };
    athletes.forEach((a) => {
      const now = draft[a.id].split(",").map((s) => s.trim().toLocaleLowerCase("tr-TR")).filter(Boolean);
      const before = aliasesOf(idx, a.id);
      if (now.join("|") !== before.join("|")) list[a.id] = { n: a.studentName, a: now, m: true };
    });
    try {
      await save({ list, notes: idx.notes });
      toast("Kaydedildi");
      onClose();
    } catch {
      toast("Kaydedilemedi");
    }
    setBusy("");
  };

  return (
    <div className="pb-2">
      <p className="-mt-1 text-[13px] leading-snug text-mut">
        Sesli yoklamada adlar bu listeye göre eşleşir. Yapay zeka her sporcu için söylenişleri ve ses tanımanın olası yanlış yazımlarını çıkarır; karışabilecek adları ayırır. İstediğini elle düzelt (virgülle).
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => regen(false)} disabled={!!busy || !lack} className="h-10 rounded-xl bg-acc text-[14px] font-semibold text-white disabled:opacity-40">
          {busy === "gen" ? "Hazırlanıyor…" : lack ? `Eksikleri hazırla (${lack})` : "Hepsi hazır"}
        </button>
        <button onClick={() => regen(true)} disabled={!!busy} className="h-10 rounded-xl bg-bg text-[14px] font-semibold disabled:opacity-40">
          Baştan oluştur
        </button>
      </div>

      {idx.notes?.length > 0 && (
        <div className="mt-3 rounded-2xl bg-amber-500/10 px-4 py-3 text-[13px] leading-snug text-amber-800">
          <b className="mb-1 flex items-center gap-1.5 font-semibold"><Icon name="alert" className="size-4" /> Karışabilecek adlar</b>
          {idx.notes.map((n) => <p key={n}>{n}</p>)}
        </div>
      )}

      <ul className="mt-3 divide-y divide-line">
        {athletes.map((a) => (
          <li key={a.id} className="py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <b className="truncate text-[14px] font-semibold">{a.studentName}</b>
              {idx.list?.[a.id]?.m && <small className="shrink-0 text-[11px] text-acc">elle</small>}
            </div>
            <input
              value={draft[a.id]}
              onChange={(e) => setDraft((d) => ({ ...d, [a.id]: e.target.value }))}
              placeholder="henüz yok"
              aria-label={`${a.studentName} söylenişleri`}
              className="mt-1 h-10 w-full rounded-lg bg-bg px-3 text-[14px] outline-none focus:bg-card focus:ring-1 focus:ring-acc"
            />
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 -mx-5 grid grid-cols-2 gap-2 bg-card px-5 pt-2">
        <button onClick={onClose} className="h-12 rounded-xl bg-bg text-[15px] font-semibold">Kapat</button>
        <button onClick={store} disabled={!!busy} className="h-12 rounded-xl bg-acc text-[15px] font-semibold text-white disabled:opacity-50">
          {busy === "save" ? "Kaydediliyor…" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
