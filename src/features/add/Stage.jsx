"use client";

import { Icon } from "@/components/ui/Icon";

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Ortadaki büyük animasyonlu daire. mode: listening | busy | done
function Orb({ mode, level = 0, icon }) {
  const rgb = mode === "listening" ? "239,68,68" : mode === "done" ? "16,185,129" : "79,70,229";
  const scale = mode === "listening" ? 1 + Math.min(1, level) * 0.3 : 1; // ses seviyesiyle nefes alır
  return (
    <div className="relative grid size-44 place-items-center" aria-hidden="true">
      {mode === "listening" &&
        [0, 0.8].map((d) => (
          <span key={d} className="animate-ripple absolute inset-8 rounded-full border-2" style={{ borderColor: `rgb(${rgb})`, animationDelay: `${d}s` }} />
        ))}
      {mode === "busy" && (
        <>
          <span className="orbit absolute inset-3 rounded-full border-[3px] border-transparent" style={{ borderTopColor: `rgb(${rgb})`, borderRightColor: `rgba(${rgb},.3)` }} />
          <span className="orbit-rev absolute inset-6 rounded-full border-2 border-transparent" style={{ borderBottomColor: `rgba(${rgb},.55)` }} />
        </>
      )}
      {mode === "done" && <span className="burst absolute inset-8 rounded-full" style={{ background: `rgba(${rgb},.3)` }} />}
      <span
        className={`relative grid size-24 place-items-center rounded-full text-white transition-[transform] duration-150 ease-out ${mode === "busy" ? "softpulse" : ""}`}
        style={{ background: `rgb(${rgb})`, transform: `scale(${scale})` }}
      >
        <Icon name={icon} className={`size-10 ${mode === "done" ? "pop-btn [stroke-width:2.6]" : ""}`} />
      </span>
    </div>
  );
}

function Act({ label, onClick, big, children }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-1.5">
      <span
        className={`grid place-items-center rounded-full transition duration-200 group-active:scale-90 ${
          big ? "size-16 bg-fg text-bg" : "size-12 bg-card text-fg ring-1 ring-line"
        }`}
      >
        {children}
      </span>
      <span className="text-xs font-medium text-mut">{label}</span>
    </button>
  );
}

// Sessizlik geri sayımı
function Silence({ remaining, total, spoke }) {
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  return (
    <div className="fade-in mt-5 w-full max-w-[280px]">
      <div className="h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-mut/60 transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[13px] text-mut">
        Konuşmazsan {remaining} sn sonra {spoke ? "gönderilecek" : "kapanacak"}
      </p>
    </div>
  );
}

// Dinleme sahnesi: canlı yazı + geri sayım + İptal / Durdur / Gönder
export function ListeningStage({ sp, total, prompt, onCancel, onStopEdit, onSend }) {
  const has = !!(sp.finalText || sp.interim);
  return (
    <div className="fade-in flex min-h-full flex-col items-center py-2 text-center">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        {prompt && (
          <div className="mb-2 w-full rounded-2xl bg-card px-4 py-3 text-left ring-1 ring-line">
            <p className="text-xs font-semibold text-acc">Asistan soruyor</p>
            <p className="mt-0.5 text-[16px] leading-snug">{prompt}</p>
          </div>
        )}
        <Orb mode="listening" level={sp.level} icon="mic" />
        <p className="mt-1 flex items-center gap-2 text-[17px] font-semibold">
          <span className="rec-dot" /> Dinliyorum <span className="font-normal tabular-nums text-mut">{fmt(sp.elapsed)}</span>
        </p>

        <div className="mt-4 max-h-48 w-full overflow-y-auto px-1 text-[20px] leading-snug">
          {has ? (
            <>
              {sp.finalText}
              <span className="text-mut">{sp.interim}</span>
            </>
          ) : (
            <span className="text-[16px] text-mut">{sp.provider === "webspeech" ? "Konuş, yazı burada görünecek…" : "Kayıt sürüyor, bitince yazıya çevrilecek."}</span>
          )}
        </div>

        {sp.remaining != null && <Silence remaining={sp.remaining} total={total} spoke={has} />}
      </div>

      <div className="mt-6 flex w-full items-end justify-center gap-8">
        <Act label="İptal" onClick={onCancel}><Icon name="x" className="size-5" /></Act>
        <Act label="Durdur" onClick={onStopEdit}><Icon name="stop" className="size-4" /></Act>
        <Act label="Gönder" onClick={onSend} big><Icon name="up" className="size-7 [stroke-width:2.2]" /></Act>
      </div>
    </div>
  );
}

// İşleme sahnesi: adım adım ilerleme. step: transcribing | thinking | preparing
export function ProcessingStage({ step, voice, heard, secs, onCancel }) {
  const labels = voice
    ? ["Ses alındı", "Yazıya çevrildi", "Yapay zeka anlıyor", "Kartlar hazırlanıyor"]
    : ["Metin alındı", "Yapay zeka anlıyor", "Kartlar hazırlanıyor"];
  const active = { transcribing: 1, thinking: voice ? 2 : 1, preparing: labels.length - 1 }[step] ?? 1;
  const title = { transcribing: "Yazıya çevriliyor…", thinking: "Yapay zeka düşünüyor…", preparing: "Kartlar hazırlanıyor…" }[step];

  return (
    <div className="fade-in flex min-h-full flex-col items-center py-2 text-center">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <Orb mode={step === "preparing" ? "done" : "busy"} icon={step === "preparing" ? "check" : "spark"} />
        <p className="mt-1 text-[19px] font-semibold tracking-tight">{title}</p>
        {step === "thinking" && (
          <p className="mt-1 text-[13px] tabular-nums text-mut">
            {secs} sn{secs >= 8 ? " · biraz uzun sürüyor, yoğunluk olabilir" : ""}
          </p>
        )}

        {heard && <p className="mt-5 line-clamp-3 w-full rounded-2xl bg-card px-4 py-3 text-left text-[15px] leading-snug ring-1 ring-line">“{heard}”</p>}

        <ul className="mt-5 w-full max-w-[300px] text-left">
          {labels.map((l, i) => {
            const state = i < active ? "done" : i === active ? "active" : "idle";
            return (
              <li key={l} className="step-in flex items-center gap-3 py-1.5 text-[15px]" style={{ animationDelay: `${i * 70}ms` }}>
                {state === "done" ? (
                  <span className="pop-btn grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                    <Icon name="check" className="size-3 [stroke-width:3]" />
                  </span>
                ) : state === "active" ? (
                  <Icon name="load" className="size-5 shrink-0 animate-spin text-acc" />
                ) : (
                  <span className="size-5 shrink-0 rounded-full border-2 border-line" />
                )}
                <span className={state === "idle" ? "text-mut" : state === "active" ? "font-medium" : ""}>{l}</span>
              </li>
            );
          })}
        </ul>
      </div>

      {step !== "preparing" && (
        <button type="button" onClick={onCancel} className="mt-6 h-11 rounded-xl px-5 text-[15px] font-semibold text-mut transition active:scale-95 active:text-fg">
          Vazgeç
        </button>
      )}
    </div>
  );
}
