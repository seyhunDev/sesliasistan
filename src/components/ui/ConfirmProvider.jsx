"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

// Silme onayı (Seyhun 2026-11-04 "yarış silerken loading göstermek lazım; sil diyorum, biraz bekleniyor, sonra sayfa gidiyor"):
// tarayıcının confirm() kutusu yerine alttan pencere. "Sil"e basınca iş (run) bitene kadar düğmede dönen halka çıkar,
// pencere kapanmaz, düğmeler kilitlenir; iş bitince pencere kapanır.
//   const ask = useConfirm();
//   ask({ title: "Yarış silinsin mi?", text: "…", yes: "Sil", run: async () => { … } })  → true (yapıldı) | false (vazgeçildi)
// run hata fırlatırsa pencere kapanır, sonuç false; hata mesajını run kendisi gösterir.
const Ctx = createContext(null);

export function ConfirmProvider({ children }) {
  const [q, setQ] = useState(null); // { title, text, yes, danger, run, done }
  const [open, setOpen] = useState(false);
  const busy = useRef(false);
  const [working, setWorking] = useState(false);

  const ask = useCallback(
    (o) =>
      new Promise((done) => {
        setQ({ yes: "Sil", danger: true, ...o, done });
        setOpen(true);
      }),
    [],
  );

  const close = (ok) => {
    if (busy.current) return;
    setOpen(false);
    q?.done(ok);
  };
  const yes = async () => {
    busy.current = true;
    setWorking(true);
    let ok = true;
    try {
      await q?.run?.();
    } catch (e) {
      console.warn("[onay] işlem olmadı", e);
      ok = false;
    }
    busy.current = false;
    setWorking(false);
    setOpen(false);
    q?.done(ok);
  };

  return (
    <Ctx.Provider value={ask}>
      {children}
      <Sheet open={open} onClose={() => close(false)} title={q?.title || ""}>
        {q?.text ? <p className="mb-4 text-[0.9375rem] text-fg2">{q.text}</p> : null}
        <div className="grid grid-cols-2 gap-2 pb-2">
          <Button variant="secondary" disabled={working} onClick={() => close(false)}>
            Vazgeç
          </Button>
          <Button variant={q?.danger === false ? "primary" : "danger"} onClick={yes}>
            {q?.yes || "Sil"}
          </Button>
        </div>
      </Sheet>
    </Ctx.Provider>
  );
}

// Sağlayıcı yoksa (giriş sayfaları, canlı ekran) tarayıcının onay kutusuna düşer
export function useConfirm() {
  const ask = useContext(Ctx);
  return (
    ask ||
    (async (o) => {
      if (!window.confirm([o.title, o.text].filter(Boolean).join("\n"))) return false;
      try {
        await o.run?.();
        return true;
      } catch {
        return false;
      }
    })
  );
}
