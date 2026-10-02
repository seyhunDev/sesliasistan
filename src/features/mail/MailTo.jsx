"use client";

// Mail gönderilecek kişiler: "Kendime" (betiğin Gmail adresi) + kayıtlı adresler (users/{uid}.mailTo).
// Yeni adres eklenince kaydedilir, sonraki maillerde listede hazır durur.
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { cleanTo, isEmail } from "./outbox";

const Check = ({ on }) => (
  <span className={`grid size-6 shrink-0 place-items-center rounded-full ${on ? "bg-acc text-white" : "ring-1 ring-line"}`}>{on && <Icon name="check" className="size-4" />}</span>
);

export function MailTo({ open, onClose, saved, onSaved, onSend }) {
  const [self, setSelf] = useState(true);
  const [picked, setPicked] = useState([]);
  const [add, setAdd] = useState("");
  const list = cleanTo(saved);
  const toggle = (a) => setPicked((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  const addOne = () => {
    const a = add.trim().toLowerCase();
    if (!isEmail(a)) return;
    if (!list.includes(a)) onSaved(cleanTo([...list, a]));
    setPicked((p) => (p.includes(a) ? p : [...p, a]));
    setAdd("");
  };
  const remove = (a) => {
    onSaved(list.filter((x) => x !== a));
    setPicked((p) => p.filter((x) => x !== a));
  };
  const to = picked;
  const none = !self && !to.length;

  return (
    <Sheet open={open} onClose={onClose} title="Kime gönderilsin?">
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-bg">
        <li>
          <button type="button" onClick={() => setSelf(!self)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <Check on={self} />
            <span className="min-w-0 flex-1">
              <b className="block text-[0.9375rem] font-semibold">Kendime</b>
              <span className="block text-[0.8125rem] text-mut">Gmail betiğinin çalıştığı adres</span>
            </span>
          </button>
        </li>
        {list.map((a) => (
          <li key={a} className="flex items-center">
            <button type="button" onClick={() => toggle(a)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left">
              <Check on={picked.includes(a)} />
              <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{a}</span>
            </button>
            <button type="button" onClick={() => remove(a)} aria-label={`${a} adresini sil`} className="grid size-11 shrink-0 place-items-center text-mut">
              <Icon name="x" className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <input
          value={add}
          onChange={(e) => setAdd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addOne()}
          placeholder="Adres ekle (ör. okul@meb.k12.tr)"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          className="h-11 min-w-0 flex-1 rounded-xl bg-bg px-3.5 text-[0.9375rem] outline-none placeholder:text-mut/70"
        />
        <button type="button" onClick={addOne} disabled={!isEmail(add.trim())} className="h-11 rounded-xl bg-card px-4 text-[0.875rem] font-semibold text-acc ring-1 ring-line disabled:opacity-40">
          Ekle
        </button>
      </div>
      <button
        type="button"
        disabled={none}
        onClick={() => onSend({ self, to })}
        className="sticky bottom-0 mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white disabled:opacity-50"
      >
        <Icon name="mail" className="size-5" />
        {none ? "Alıcı seç" : `Gönder · ${(self ? 1 : 0) + to.length} kişi`}
      </button>
    </Sheet>
  );
}
