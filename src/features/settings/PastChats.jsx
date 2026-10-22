"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { clearSessions } from "@/lib/sessionStore";
import { Fold } from "./Groups";
import { Btn } from "./ui";

// Ayarlar › Asistan › Geçmiş sohbetler: yapay zekanın hatırladığı eski sohbetleri tamamen sil. Eski sohbetler asistan
// ekranında artık hiç görünmez (Seyhun 2026-10-22: her açılış temiz), göster/gizle anahtarı kalktı
export function PastChatsRow() {
  const toast = useToast();
  const [ask, setAsk] = useState(false);
  const clear = () => {
    const n = clearSessions();
    setAsk(false);
    toast(n ? `${n} sohbet silindi` : "Silinecek sohbet yok");
  };
  return (
    <Fold title="Geçmiş sohbetler">
      <div className="px-4 pb-3">
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
