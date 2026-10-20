"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { devOn, engineName, liveOf, liveText, msText, secText, setDevOn, timingClear, timingList, timingSteps, timingText } from "@/lib/assistTiming";
import { probeCheck, probeSamples, probeText } from "@/lib/aiProbe";
import { askAssistant } from "@/services/assistantService";
import { Btn, Row } from "./ui";

// Ayarlar › Testler › Süre kaydı: son 20 komutun adım adım süreleri (yalnız bu cihazda, lib/assistTiming.js).
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
    <Row title="Süre kaydı" open={open} onClick={toggle}>
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
                          {liveOf(r) && <li className="text-[0.8125rem] text-mut">{liveText(liveOf(r)).replace(/^c/, "C")}</li>}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 flex gap-2">
                <Btn kind="line" small onClick={copy}>
                  Kopyala
                </Btn>
                <Btn kind="danger" small onClick={clear}>
                  Temizle
                </Btn>
              </div>
            </>
          )}
          <DevSwitch />
          <p className="mt-2 text-[0.75rem] leading-snug text-mut">
            Yalnız bu telefonda saklanır. Yavaş bir komutta “Kopyala”ya basıp yeni bir threade yapıştırabilirsin.
          </p>
        </div>
      )}
    </Row>
  );
}

// Asistan sayfasında her cevabın altında süre satırı (geliştirme süresince açık)
function DevSwitch() {
  const [on, setOn] = useState(devOn);
  const flip = () => {
    setDevOn(!on);
    setOn(!on);
  };
  return (
    <label className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-[0.875rem]">
      <span>Asistan sayfasında süreleri göster</span>
      <input type="checkbox" checked={on} onChange={flip} className="size-5 accent-[var(--acc)]" />
    </label>
  );
}

// Testler › Örnekleri dene: yapay zeka işlerinin örnek cümleleri sırayla gönderilir (kayıt yapılmaz), süre ve doğruluk listelenir
export function ProbeRow() {
  const [open, setOpen] = useState(false);
  return (
    <Row title="Örnekleri dene" sub={`${probeSamples().length} cümle`} open={open} onClick={() => setOpen((v) => !v)}>
      {open && <Probe />}
    </Row>
  );
}

function Probe() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const stop = useRef(null);
  const samples = probeSamples();
  const run = async () => {
    if (busy) return stop.current?.abort();
    if (!confirm(`${samples.length} örnek cümle yapay zekaya gönderilecek (kayıt yapılmaz). Kotadan ${samples.length} istek düşer. Başlasın mı?`)) return;
    const ctl = new AbortController();
    stop.current = ctl;
    setBusy(true);
    setRows([]);
    for (const x of samples) {
      if (ctl.signal.aborted) break;
      const t0 = Date.now();
      let first = 0;
      let row;
      try {
        const r = await askAssistant({ text: x.say, onText: () => (first ||= Date.now() - t0) }, ctl.signal);
        row = { ...x, ...probeCheck(x, r), ms: Date.now() - t0, first, model: r.model || r.provider || "" };
      } catch (e) {
        if (ctl.signal.aborted) break;
        row = { ...x, ok: false, err: e.reason || e.message || "hata", ms: Date.now() - t0 };
      }
      setRows((p) => [...p, row]);
    }
    setBusy(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(probeText(rows));
      toast("Sonuçlar kopyalandı");
    } catch {
      toast("Kopyalanamadı");
    }
  };
  const ok = rows.filter((x) => x.ok).length;
  return (
    <div className="px-4 pb-3.5">
      {rows.length > 0 && (
        <>
          <p className="mt-2 text-[0.8125rem] text-mut">
            {ok}/{rows.length} doğru{busy ? ` · ${rows.length}/${samples.length} gönderildi` : ""}
          </p>
          <ul className="mt-1 space-y-1">
            {rows.map((x) => (
              <li key={x.id} className="flex items-baseline gap-2 text-[0.8125rem]">
                <span className={x.ok ? "text-ok" : "text-rec"}>{x.ok ? "✓" : "✗"}</span>
                <span className="min-w-0 flex-1 truncate">{x.say}{!x.ok && <span className="text-mut"> → {x.err || x.got || "?"}</span>}</span>
                <span className="shrink-0 tabular-nums text-mut">{msText(x.ms)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-2.5 flex gap-2">
        <Btn kind={busy ? "line" : "main"} onClick={run}>{busy ? "Durdur" : "Başlat"}</Btn>
        {rows.length > 0 && !busy && <Btn kind="line" onClick={copy}>Kopyala</Btn>}
      </div>
    </div>
  );
}
