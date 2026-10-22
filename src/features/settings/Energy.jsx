"use client";

import { useState, useSyncExternalStore } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { SERVER, levelOf, resultRows, resultText, snapshot, start, stop, subscribe } from "@/lib/energyMeter";
import { Btn, Row } from "./ui";

// Ayarlar › Enerji kullanımı: "2 dakika ölç" ile uygulamayı normal kullanırken işlemci, sürekli hareket ve internet
// ölçülür (lib/energyMeter.js). Ölçüm başka sayfaya geçince de sürer; sonuç bu cihazda kalır.
export function EnergyRow() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const s = useSyncExternalStore(subscribe, snapshot, () => SERVER);
  const x = s.last;
  const sub = s.running ? `Ölçülüyor · ${s.left} sn` : levelOf(x?.cpu);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(resultText(x));
      toast("Sonuç kopyalandı");
    } catch {
      toast("Kopyalanamadı");
    }
  };
  return (
    <Row title="Enerji kullanımı" sub={sub} open={open} onClick={() => setOpen((v) => !v)}>
      {open && (
        <div className="px-4 pb-3.5">
          {s.running ? (
            <p className="py-1 text-[0.875rem] text-mut">Uygulamayı her zamanki gibi kullan; ölçüm sayfalar arasında sürer. {s.left} sn kaldı.</p>
          ) : x ? (
            <>
              <p className="py-1 text-[0.8125rem] text-mut">
                Son ölçüm · {new Date(x.at).toLocaleString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {x.sec} sn
              </p>
              <ul className="divide-y divide-line">
                {resultRows(x).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-3 py-1.5 text-[0.875rem]">
                    <span>{k}</span>
                    <span className="text-right text-mut">{v}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="py-1 text-[0.875rem] text-mut">Henüz ölçüm yok.</p>
          )}
          <div className="mt-2.5 flex gap-2">
            {s.running ? (
              <Btn kind="line" onClick={stop}>Durdur</Btn>
            ) : (
              <Btn onClick={() => start(120)}>2 dakika ölç</Btn>
            )}
            {x && !s.running && <Btn kind="line" onClick={copy}>Kopyala</Btn>}
          </div>
        </div>
      )}
    </Row>
  );
}
