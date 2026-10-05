"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { engineName, msText, secText, timingClear, timingList, timingSteps, timingText } from "@/lib/assistTiming";
import { Row } from "./ui";

// Ayarlar › Asistan süre kaydı: son 20 komutun adım adım süreleri (yalnız bu cihazda, lib/assistTiming.js).
// Toplam: sustuğun (yazıda gönderdiğin) andan cevabın okunmaya başlamasına kadar; "Konuşman" toplama girmez.
export function TimingRow() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [shown, setShown] = useState(0); // açık komut (ilk açılışta en yenisi)
  const toggle = () => {
    if (!open) {
      setList(timingList());
      setShown(0);
    }
    setOpen((v) => !v);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(timingText(list));
      toast("Süreler kopyalandı");
    } catch {
      toast("Kopyalanamadı");
    }
  };
  const clear = () => {
    if (!confirm("Süre kaydı silinsin mi?")) return;
    timingClear();
    setList([]);
  };
  const totals = list.map((r) => timingSteps(r).total).filter((t) => t > 0);
  const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;

  return (
    <Row icon="clock" tone="violet" title="Asistan süre kaydı" sub="Son 20 komutta her adımın süresi" onClick={toggle} chevron>
      {open && (
        <div className="px-4 pb-3">
          {!list.length ? (
            <p className="py-2 text-[0.875rem] text-mut">Henüz kayıt yok. Asistana bir şey söyle ya da yaz, sonra buraya bak.</p>
          ) : (
            <>
              <p className="py-1 text-[0.8125rem] text-mut">
                {list.length} komut · ortalama <b className="text-fg">{secText(avg)}</b> (sustuğun andan cevaba)
              </p>
              <ul className="divide-y divide-line">
                {list.map((r, i) => {
                  const { steps, total } = timingSteps(r);
                  const max = Math.max(1, ...steps.filter((s) => !s.user).map((s) => s.ms));
                  const on = shown === i;
                  return (
                    <li key={r.at + i} className="py-2">
                      <button type="button" onClick={() => setShown(on ? -1 : i)} className="flex w-full items-center gap-3 text-left">
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[0.9375rem] font-medium">“{r.text}”</b>
                          <span className="block truncate text-[0.75rem] text-mut">
                            {new Date(r.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} · {r.voice ? "sesli" : "yazılı"}
                            {r.engine ? ` · ${engineName(r.engine)}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-[0.9375rem] font-semibold tabular-nums">{secText(total)}</span>
                      </button>
                      {on && (
                        <ul className="mt-2 space-y-1.5">
                          {steps.map((s, k) => (
                            <li key={s.name + k} className={s.user ? "text-mut" : ""}>
                              <span className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
                                <span className="truncate">{s.label}{s.user ? " (toplama girmez)" : ""}</span>
                                <span className="shrink-0 tabular-nums">{msText(s.ms)}</span>
                              </span>
                              {!s.user && (
                                <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-line">
                                  <span className="block h-full rounded-full bg-violet-500" style={{ width: `${Math.max(2, (s.ms / max) * 100)}%` }} />
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={copy} className="rounded-lg bg-acc/10 px-3 py-1.5 text-[0.8125rem] font-semibold text-acc">
                  Kopyala
                </button>
                <button type="button" onClick={clear} className="rounded-lg bg-rec/10 px-3 py-1.5 text-[0.8125rem] font-semibold text-rec">
                  Temizle
                </button>
              </div>
            </>
          )}
          <p className="mt-2 text-[0.75rem] leading-snug text-mut">
            Yalnız bu telefonda saklanır. Yavaş bir komutta “Kopyala”ya basıp yeni bir threade yapıştırabilirsin.
          </p>
        </div>
      )}
    </Row>
  );
}
