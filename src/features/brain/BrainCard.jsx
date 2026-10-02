"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { Switch } from "@/features/settings/ui";
import { LABELS } from "@/lib/brain/model";
import { flush, guess, missedLocal, resetBrain, setBrainOff, stats, subscribe } from "@/lib/brain/store";

const kb = (b) => (b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`);
const labelName = (l) => LABELS[l] || (l.startsWith("nav:") ? `Sayfa: ${l.slice(4)}` : l);

// Ayarlar › Öğrenme: aç/kapat, sıfırla, bu ay yapay zekasız çözülenler, veri boyutu, Firebase okuma/yazma, model denemesi
export function BrainCard({ bare, owner }) {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [q, setQ] = useState("");
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const up = () => setS(stats());
    up();
    return subscribe(up);
  }, []);
  if (!s) return null;
  const g = q.trim() ? guess(q) : null;
  const missed = missedLocal();
  const pct = Math.min(100, Math.round((s.docBytes / s.docLimit) * 100));

  const h = s.hits;
  const total = h.local + h.brain + h.ai;
  const saved = total ? Math.round(((h.local + h.brain) / total) * 100) : 0;

  async function toggle() {
    try {
      await setBrainOff(!s.off);
      toast(s.off ? "Öğrenme açıldı" : "Öğrenme kapatıldı");
    } catch {
      toast("Değiştirilemedi, bağlantını kontrol et");
    }
  }
  async function reset() {
    setBusy(true);
    try {
      const n = await resetBrain();
      toast(`Sıfırlandı · ${n} örnek silindi`);
      setAsk(false);
    } catch {
      toast("Sıfırlanamadı, bağlantını kontrol et");
    } finally {
      setBusy(false);
    }
  }

  async function sync() {
    const ok = await flush(true);
    toast(ok ? "Eşitlendi" : s.pending ? "Eşitlenemedi, sonra tekrar dene" : "Bekleyen veri yok");
  }

  return (
    <div className={bare ? "px-4 pb-4 pl-[3.75rem]" : "mt-4 rounded-xl bg-bg p-3.5"}>
      <div className="flex items-center justify-between gap-3">
        <b className={`text-[0.9375rem] font-medium ${bare ? "text-mut" : ""}`}>{bare ? "Ayrıntılar" : "Öğrenme verisi"}</b>
        <button onClick={sync} className="rounded-full border border-line bg-card px-3 py-1.5 text-[0.8125rem] font-semibold active:scale-95">
          Şimdi eşitle
        </button>
      </div>
      {/* Aç / kapat */}
      <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-card px-2.5 py-2 text-[0.875rem] ring-1 ring-line">
        <span>
          <b className="block font-semibold">Öğrenme {s.off ? "kapalı" : "açık"}</b>
          <span className="text-[0.8125rem] text-mut">{s.off ? "Söylediklerin kaydedilmiyor, öğrenilenler kullanılmıyor." : "Söylediklerinden öğrenir, sık işleri yapay zekasız yapar."}</span>
        </span>
        <Switch on={!s.off} onChange={toggle} label="Öğrenme" />
      </div>

      {/* Bu ay: kaç istek yapay zekasız çözüldü (hız ve tasarruf) */}
      <div className="mt-2 rounded-lg bg-card px-2.5 py-2 text-[0.8125rem] ring-1 ring-line">
        <p className="text-mut">Bu ay asistana söylenenler</p>
        <p className="mt-0.5 font-semibold tabular-nums">
          {total ? `${total} istek · %${saved} yapay zekasız` : "Henüz yok"}
        </p>
        {total > 0 && (
          <p className="mt-0.5 text-mut tabular-nums">
            Kurallarla {h.local} · öğrendikleriyle {h.brain} · yapay zekayla {h.ai}
          </p>
        )}
      </div>

      <dl className="mt-2 grid grid-cols-2 gap-2 text-[0.8125rem]">
        {[
          ["Örnek", s.team ? `${s.count} · ${s.team} ekipten` : s.count],
          ["Bekleyen", s.pending],
          ["Cihazdaki boyut", kb(s.bytes)],
          ["Bu ayki belge", `${kb(s.docBytes)} · %${pct}`],
          ["Bu ay okuma", s.reads],
          ["Bu ay yazma", s.writes],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg bg-card px-2.5 py-2 ring-1 ring-line">
            <dt className="text-mut">{k}</dt>
            <dd className="font-semibold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
      {s.byLabel.length > 0 && (
        <p className="mt-2 text-[0.8125rem] leading-snug text-mut">{s.byLabel.slice(0, 6).map(([l, n]) => `${labelName(l)} ${n}`).join(" · ")}</p>
      )}

      {/* Yerelde kaçan komutlar: yapay zekaya gidip sayfa açan cümleler; kopyalanıp kurallara eklenmek üzere */}
      {missed.length > 0 && (
        <div className="mt-2 rounded-lg bg-card px-2.5 py-2 text-[0.8125rem] ring-1 ring-line">
          <div className="flex items-center justify-between gap-2">
            <p className="text-mut">Yerelde kaçan komutlar · {missed.length}</p>
            <button
              onClick={() =>
                navigator.clipboard
                  ?.writeText(missed.map((m) => `${m.x} → ${m.l.slice(4)}`).join("\n"))
                  .then(() => toast("Kopyalandı"), () => toast("Kopyalanamadı"))
              }
              className="font-semibold text-acc"
            >
              Kopyala
            </button>
          </div>
          <ul className="mt-1 space-y-0.5">
            {missed.slice(0, 5).map((m) => (
              <li key={m.x} className="truncate">“{m.x}” → {labelName(m.l)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Sıfırla */}
      {!ask ? (
        <button onClick={() => setAsk(true)} className="mt-3 w-full rounded-lg border border-line bg-card py-2 text-[0.875rem] font-semibold text-red-600 active:scale-[.98]">
          Öğrenilenleri sıfırla
        </button>
      ) : (
        <div className="mt-3 rounded-lg bg-card p-2.5 text-[0.8125rem] ring-1 ring-red-200">
          <p>{owner ? "Herkesin (ekip dahil) öğrenme verisi silinecek." : "Senin öğrenme verin silinecek."} Kayıtların, mesajların silinmez.</p>
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setAsk(false)} className="rounded-full px-3 py-1.5 font-medium text-mut">
              Vazgeç
            </button>
            <button disabled={busy} onClick={reset} className="rounded-full bg-red-600 px-3 py-1.5 font-semibold text-white disabled:opacity-60">
              {busy ? "Siliniyor…" : "Sıfırla"}
            </button>
          </div>
        </div>
      )}

      {/* Modeli dene */}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Modeli dene · örn. “cuma antrenman koy”"
        className="mt-3 h-10 w-full rounded-lg border border-line bg-card px-3 text-[0.875rem] outline-none focus:border-acc"
      />
      {q.trim() && (
        <div className="mt-2 text-[0.8125rem]">
          {g ? (
            <>
              <p>
                Tahmin: <b>{labelName(g.label)}</b> · güven %{Math.round(g.score * 100)} {g.score < 0.55 && <span className="text-mut">(kullanmak için düşük)</span>}
              </p>
              <ul className="mt-1 space-y-0.5 text-mut">
                {g.near.slice(0, 3).map((n, i) => (
                  <li key={i} className="truncate">%{Math.round(n.sim * 100)} “{n.x}” → {labelName(n.l)}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-mut">{s.count < 5 ? "En az 5 örnek gerekli." : "Benzer örnek yok."}</p>
          )}
        </div>
      )}
    </div>
  );
}
