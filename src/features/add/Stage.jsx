"use client";

import { Icon } from "@/components/ui/Icon";

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Act({ label, onClick, big, children }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="group flex w-16 flex-col items-center gap-1.5">
      <span
        className={`grid place-items-center rounded-full transition duration-200 group-active:scale-90 ${
          big ? "size-[4.25rem] bg-acc text-white shadow-[0_10px_28px_-10px_rgba(62,110,132,.7)]" : "size-12 bg-card text-fg ring-1 ring-line"
        }`}
      >
        {children}
      </span>
      <span className={`text-[0.75rem] font-medium ${big ? "text-fg" : "text-mut"}`}>{label}</span>
    </button>
  );
}

// Canlı ses dalgası: çubuklar ses seviyesine göre uzayıp kısalır; sessizken hafifçe nefes alır
const BARS = [0.45, 0.75, 1, 0.8, 0.55, 0.9, 0.6];
function Wave({ level = 0 }) {
  const l = Math.min(1, level * 2.2);
  return (
    <div className="flex h-20 items-center justify-center gap-[0.4375rem]" aria-hidden="true">
      {BARS.map((m, i) => (
        <span
          key={i}
          className="wave-bar w-[0.4375rem] rounded-full bg-acc transition-[height] duration-100 ease-out"
          style={{ height: `${10 + l * m * 62}px`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

// Sessizlik geri sayımı (ince çizgi)
function Silence({ remaining, total, spoke }) {
  const pct = Math.max(0, Math.min(100, (remaining / total) * 100));
  return (
    <div className="fade-in mt-5 w-full max-w-[15rem]">
      <div className="h-[0.1875rem] overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-acc/60 transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-[0.75rem] text-mut">
        {remaining} sn sessizlikte {spoke ? "gönderilecek" : "kapanacak"}
      </p>
    </div>
  );
}

// Uygulamanın tek dinleme görünümü (asistan, yeni kayıt, ders programı, yoklama):
// canlı dalga + süre + canlı yazı + İptal / Bitti / Düzenle. onStopEdit verilmezse "Düzenle" gösterilmez.
export function ListeningStage({ sp, total, prompt, hint, onCancel, onStopEdit, onSend }) {
  const has = !!(sp.finalText || sp.interim);
  return (
    <div className="fade-in flex min-h-full flex-col items-center py-2 text-center">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        {/* Asistanın son yanıtı/sorusu: mikrofon kendiliğinden açıldığında neye cevap verdiğin görünsün */}
        {prompt && (
          <div className="fade-in mb-5 flex w-full items-start gap-2.5 text-left">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-acc text-white">
              <Icon name="spark" className="size-4" />
            </span>
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md bg-card px-4 py-3 shadow-[0_1px_3px_rgba(38,40,44,.06)] ring-1 ring-line">
              <p className="text-[0.75rem] font-semibold text-acc">{prompt.includes("?") ? "Asistan soruyor" : "Asistan"}</p>
              <p className="mt-0.5 max-h-40 overflow-y-auto whitespace-pre-wrap text-[1.0625rem] leading-snug">{prompt}</p>
            </div>
          </div>
        )}
        <p className="flex items-center gap-2 text-[0.8125rem] font-medium text-mut">
          <span className="rec-dot" /> Dinliyorum <span className="tabular-nums">{fmt(sp.elapsed)}</span>
        </p>
        <Wave level={sp.level} />

        <div className="mt-2 max-h-52 w-full overflow-y-auto px-2 text-[1.3125rem] font-medium leading-snug tracking-tight">
          {has ? (
            <>
              {sp.finalText}
              <span className="text-mut">{sp.interim}</span>
            </>
          ) : (
            <span className="text-[1rem] font-normal text-mut">
              {hint || (sp.provider === "webspeech" ? "Konuş, söylediklerin burada yazılacak" : "Konuş, bitince yazıya çevrilecek")}
            </span>
          )}
        </div>

        {sp.remaining != null && <Silence remaining={sp.remaining} total={total} spoke={has} />}
      </div>

      <div className="mt-6 flex w-full items-end justify-center gap-10 pb-1">
        <Act label="İptal" onClick={onCancel}><Icon name="x" className="size-5" /></Act>
        <Act label="Bitti" onClick={onSend} big><Icon name="check" className="size-8 [stroke-width:2.4]" /></Act>
        {onStopEdit ? (
          <Act label="Düzenle" onClick={onStopEdit}><Icon name="edit" className="size-5" /></Act>
        ) : (
          <span className="w-16" />
        )}
      </div>
    </div>
  );
}

// Tam ekran dinleme (kendi sayfası olan yerler için: ders programı, yoklama)
export function ListeningOverlay({ sp, hint, total = 6, onCancel, onSend }) {
  if (sp.status !== "listening") return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]" role="dialog" aria-modal="true" aria-label="Dinleniyor" data-voice="">
      <div className="mx-auto flex w-full max-w-[27.5rem] flex-1 flex-col">
        <ListeningStage sp={sp} total={total} hint={hint} onCancel={onCancel} onSend={onSend} />
      </div>
    </div>
  );
}

// İşleme sahnesi: adım adım ilerleme. step: transcribing | thinking | preparing
// İşleme sahnesi: dönen ışık halkalı büyük simge (adıma göre değişir) + simgeli adım şeridi (Ses → Yazı → Anlama → Kartlar)
const STEPS_VOICE = [
  ["mic", "Ses"],
  ["edit", "Yazı"],
  ["spark", "Anlama"],
  ["checks", "Kartlar"],
];
const STEPS_TEXT = STEPS_VOICE.slice(1);
const COPY = {
  transcribing: ["Yazıya çeviriyorum", "Söylediklerini metne döküyorum"],
  thinking: ["Anlıyorum", "Ne istediğini yapay zeka çözümlüyor"],
  preparing: ["Hazırlıyorum", "Kayıt kartlarını oluşturuyorum"],
};

export function ProcessingStage({ step, voice, heard, secs, onCancel }) {
  const steps = voice ? STEPS_VOICE : STEPS_TEXT;
  const active = { transcribing: 1, thinking: voice ? 2 : 1, preparing: steps.length - 1 }[step] ?? 1;
  const [title, sub] = COPY[step] || COPY.thinking;
  const icon = steps[active]?.[0] || "spark";
  const pct = (active / (steps.length - 1)) * 100;

  return (
    <div className="fade-in flex min-h-full flex-col items-center py-2 text-center">
      <div className="flex w-full flex-1 flex-col items-center justify-center">
        {/* Büyük simge + dönen ışık halkası */}
        <div className="relative grid size-32 place-items-center" aria-hidden="true">
          <span className="halo absolute inset-0 rounded-full" />
          <span className="absolute inset-3 rounded-full bg-acc/10" />
          <span key={icon} className="anim-in relative grid size-20 place-items-center rounded-[1.625rem] bg-acc text-white shadow-[0_12px_30px_-12px_rgba(62,110,132,.8)]">
            <Icon name={icon} className="size-9" />
          </span>
        </div>

        <p className="mt-5 flex items-baseline gap-1 text-[1.3125rem] font-semibold tracking-tight">
          {title}
          <span className="typing" aria-hidden="true"><i /><i /><i /></span>
        </p>
        <p className="mt-1 text-[0.875rem] text-mut">{sub}</p>
        {step === "thinking" && secs >= 3 && (
          <p className="mt-1 text-[0.75rem] tabular-nums text-mut">
            {secs} sn{secs >= 8 ? " · biraz uzun sürüyor, yoğunluk olabilir" : ""}
          </p>
        )}

        {/* Adım şeridi */}
        <div className="relative mt-7 w-full max-w-[18.75rem]">
          <div className="absolute inset-x-5 top-5 h-[0.1875rem] rounded-full bg-line" />
          <div className="absolute left-5 top-5 h-[0.1875rem] rounded-full bg-acc transition-[width] duration-500 ease-out" style={{ width: `calc((100% - 2.5rem) * ${pct / 100})` }} />
          <ol className="relative flex justify-between">
            {steps.map(([ic, label], i) => {
              const st = i < active ? "done" : i === active ? "active" : "idle";
              return (
                <li key={label} className="flex w-10 flex-col items-center gap-1.5">
                  <span
                    className={`relative grid size-10 place-items-center rounded-full transition duration-300 ${
                      st === "done" ? "bg-acc text-white" : st === "active" ? "bg-card text-acc ring-2 ring-acc" : "bg-card text-mut ring-1 ring-line"
                    }`}
                  >
                    {st === "active" && <span className="animate-ripple absolute inset-0 rounded-full border-2 border-acc" />}
                    <Icon name={st === "done" ? "check" : ic} className={`size-[1.125rem] ${st === "done" ? "[stroke-width:2.6]" : ""}`} />
                  </span>
                  <span className={`text-[0.6875rem] font-medium ${st === "idle" ? "text-mut" : "text-fg"}`}>{label}</span>
                </li>
              );
            })}
          </ol>
        </div>

        {heard && (
          <p className="mt-7 line-clamp-3 w-full rounded-2xl bg-card px-4 py-3 text-left text-[0.9375rem] leading-snug text-mut ring-1 ring-line">
            <span className="text-fg">“{heard}”</span>
          </p>
        )}
      </div>

      {step !== "preparing" && (
        <button type="button" onClick={onCancel} className="mt-6 h-11 rounded-xl px-5 text-[0.9375rem] font-semibold text-mut transition active:scale-95 active:text-fg">
          Vazgeç
        </button>
      )}
    </div>
  );
}
