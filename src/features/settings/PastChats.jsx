"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { clearSessions, pastShown, setPastShown } from "@/lib/sessionStore";
import { Fold } from "./Groups";
import { Btn, Switch } from "./ui";

// Ayarlar › Asistan › Geçmiş sohbetler: asistan ekranında eski sohbetleri göster/gizle (hafıza kalır) ve tamamen sil
export function PastChatsRow() {
  const toast = useToast();
  const [shown, setShown] = useState(pastShown);
  const [ask, setAsk] = useState(false);
  const toggle = () => {
    setPastShown(!shown);
    setShown(!shown);
    toast(shown ? "Eski sohbetler gizlendi" : "Eski sohbetler görünür");
  };
  const clear = () => {
    const n = clearSessions();
    setAsk(false);
    toast(n ? `${n} sohbet silindi` : "Silinecek sohbet yok");
  };
  return (
    <Fold title="Geçmiş sohbetler" sub={shown ? "Görünür" : "Gizli"}>
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between gap-3 py-2 text-[0.9375rem]">
          <span>Asistan ekranında göster</span>
          <Switch on={shown} onChange={toggle} label="Asistan ekranında göster" />
        </div>
        {!ask ? (
          <Btn kind="danger" onClick={() => setAsk(true)}>Geçmişi sil</Btn>
        ) : (
          <div className="flex gap-2">
            <Btn kind="line" onClick={() => setAsk(false)}>Vazgeç</Btn>
            <Btn kind="danger" onClick={clear}>Hepsini sil</Btn>
          </div>
        )}
      </div>
    </Fold>
  );
}
