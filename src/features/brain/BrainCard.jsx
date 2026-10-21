"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { Switch } from "@/features/settings/ui";
import { LABELS } from "@/lib/brain/model";
import { patternReport, resetPatternMeter } from "@/lib/brain/patternMeter";
import { dropPattern, flush, guess, missedLocal, patternRows, resetBrain, setBrainOff, stats, subscribe } from "@/lib/brain/store";
import { READY } from "@/lib/brain/aiPatterns";
import { Button } from "@/components/ui/Button";
import { reportText } from "@/lib/brain/score";
import { quickOn, setQuick } from "@/lib/quickMode";
import { resetScore, scoreReport, subscribeScore } from "@/lib/brain/scoreStore";

const kb = (b) => (b < 1024 ? `${b} B` : `${(b / 1024).toFixed(1)} KB`);
const labelName = (l) => LABELS[l] || (l.startsWith("nav:") ? `Sayfa: ${l.slice(4)}` : l);

// Ayarlar › Öğrenme: aç/kapat, sıfırla, bu ay yapay zekasız çözülenler, veri boyutu, Firebase okuma/yazma, model denemesi
export function BrainCard({ bare, owner }) {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [q, setQ] = useState("");
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [r, setR] = useState(null);
  const [quick, setQuickState] = useState(quickOn); // kart ilk çizimde boş (s yok), sunucu/tarayıcı farkı olmaz
  useEffect(() => {
    const up = () => setS(stats());
    up();
    return subscribe(up);
  }, []);
  useEffect(() => {
    const up = () => setR(scoreReport());
    up();
    return subscribeScore(up);
  }, []);
  if (!s) return null;
  const g = q.trim() ? guess(q) : null;
  const missed = missedLocal();
  const pr = patternReport();
  const pats = patternRows();
  const readyN = pats.filter((x) => x.ready).length;
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
  // Hazır cevaplar: kapalıyken her istek yapay zekaya gider (öğrenme yine sürer)
  function toggleQuick() {
    setQuick(!quick);
    setQuickState(!quick);
    toast(quick ? "Hazır cevaplar kapatıldı" : "Hazır cevaplar açıldı");
  }
  async function reset() {
    setBusy(true);
    try {
      const n = await resetBrain();
      resetPatternMeter();
      await resetScore();
      toast(`Sıfırlandı · ${n} örnek silindi`);
      setAsk(false);
    } catch {
      toast("Sıfırlanamadı, bağlantını kontrol et");
    } finally {
      setBusy(false);
    }
  }

  async function dropPat(k) {
    try {
      await dropPattern(k);
      toast("Kalıp silindi");
    } catch {
      toast("Bu cihazdan silindi, eşitlenemedi");
    }
  }

  async function sync() {
    const ok = await flush(true);
    toast(ok ? "Eşitlendi" : s.pending ? "Eşitlenemedi, sonra tekrar dene" : "Bekleyen veri yok");
  }

  return (
    <div className={bare ? "px-4 pb-4" : "mt-4 rounded-xl bg-bg p-3.5"}>
      <div className="flex items-center justify-between gap-3">
        <b className={`text-[0.9375rem] font-medium ${bare ? "text-mut" : ""}`}>{bare ? "Ayrıntılar" : "Öğrenme verisi"}</b>
        <button onClick={sync} data-press className="btn btn-secondary btn-sm">
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
      {/* Hazır cevaplar: telefonda yapay zekasız cevap (varsayılan kapalı) */}
      <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-card px-2.5 py-2 text-[0.875rem] ring-1 ring-line">
        <span>
          <b className="block font-semibold">Hazır cevaplar {quick ? "açık" : "kapalı"}</b>
          <span className="text-[0.8125rem] text-mut">{quick ? "Kısa komutlar ve özet soruları telefonda cevaplanır." : "Her istek yapay zekaya gider."}</span>
        </span>
        <Switch on={quick} onChange={toggleQuick} label="Hazır cevaplar" />
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

      {/* Asistan puanı: işler ne kadar doğru bitti (kullanıcı düzeltti mi, yeniden söyledi mi, geri döndü mü) */}
      {r && (
        <div className="mt-2 rounded-lg bg-card px-2.5 py-2 text-[0.8125rem] ring-1 ring-line">
          <div className="flex items-center justify-between gap-2">
            <p className="text-mut">Asistan puanı · bu hafta</p>
            {r.week.n + r.weeks[1].n > 0 && (
              <button
                onClick={() => navigator.clipboard?.writeText(reportText(r)).then(() => toast("Kopyalandı"), () => toast("Kopyalanamadı"))}
                className="font-semibold text-acc"
              >
                Kopyala
              </button>
            )}
          </div>
          <p className="mt-0.5 font-semibold tabular-nums">
            {r.week.n ? `${r.week.n} komut · %${r.week.ok} doğru · puan ${r.week.p}` : "Bu hafta komut yok"}
          </p>
          <p className="mt-0.5 text-mut tabular-nums">
            {r.weeks
              .slice(1)
              .map((w) => `${w.w.slice(5)} ${w.n ? `%${w.ok}` : "–"}`)
              .join(" · ")}
          </p>
          {r.worst.length > 0 && (
            <>
              <p className="mt-1.5 text-mut">En çok hata</p>
              <ul className="mt-0.5 space-y-0.5">
                {r.worst.slice(0, 5).map((x) => (
                  <li key={x.x} className="flex justify-between gap-2">
                    <span className="truncate">“{x.x}”</span>
                    <span className="shrink-0 text-mut tabular-nums">{x.b}/{x.n}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

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

      {/* Hızlı kalıp ölçümü: yapay zekaya giden isteklerde telefon aynı sonucu bulur muydu (iş türü başına) */}
      {pr.n > 0 && (
        <div className="mt-2 rounded-lg bg-card px-2.5 py-2 text-[0.8125rem] ring-1 ring-line">
          <div className="flex items-center justify-between gap-2">
            <p className="text-mut">Hızlı kalıp ölçümü · {pr.full}/{pr.n}</p>
            <button
              onClick={() =>
                navigator.clipboard
                  ?.writeText([...pr.rows.map((r) => `${labelName(r.label)}: ${r.full}/${r.n}${r.ready ? " hazır" : ""}`), "", ...pr.last.map((x) => `${x.ok ? "✓" : "✗"} “${x.x}” → ${labelName(x.l)}${x.g && x.g !== x.l ? ` (telefon: ${labelName(x.g)})` : ""}`)].join("\n"))
                  .then(() => toast("Kopyalandı"), () => toast("Kopyalanamadı"))
              }
              className="font-semibold text-acc"
            >
              Kopyala
            </button>
          </div>
          <ul className="mt-1 space-y-0.5">
            {pr.rows.slice(0, 6).map((r) => (
              <li key={r.label} className="flex justify-between gap-2">
                <span className="truncate">{labelName(r.label)}</span>
                <span className="shrink-0 tabular-nums">
                  {r.full}/{r.n}
                  {r.ready ? " · hazır" : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Öğrenilen kalıplar: yapay zekanın her cevapla verdiği öğrenme kaydı (aiPatterns.js). Hazır olanlar yalnız
          Hazır cevaplar açıkken yapay zekasız yapılır */}
      {pats.length > 0 && (
        <div className="mt-2 rounded-lg bg-card px-2.5 py-2 text-[0.8125rem] ring-1 ring-line">
          <div className="flex items-center justify-between gap-2">
            <p className="text-mut">
              Öğrenilen kalıplar · {pats.length} · {readyN} hazır
            </p>
            <button
              onClick={() =>
                navigator.clipboard
                  ?.writeText(pats.map((x) => `${x.ready ? "hazır " : ""}${x.ok}/${x.n} ${x.p} · ${x.k || labelName(x.l)} · “${x.x}”`).join("\n"))
                  .then(() => toast("Kopyalandı"), () => toast("Kopyalanamadı"))
              }
              className="font-semibold text-acc"
            >
              Kopyala
            </button>
          </div>
          <ul className="mt-1 divide-y divide-line">
            {pats.slice(0, 12).map((x) => (
              <li key={x.key} className="flex items-center justify-between gap-2 py-1">
                <span className="min-w-0">
                  <span className="block truncate">{x.p}</span>
                  <span className="block truncate text-mut tabular-nums">
                    {x.ok}/{x.n} doğru{x.ready ? " · hazır" : x.n < READY.n ? ` · ${READY.n - x.n} kez daha` : ""}
                  </span>
                </span>
                <Button variant="text" size="sm" onClick={() => dropPat(x.key)} className="shrink-0 text-mut">
                  Sil
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sıfırla */}
      {!ask ? (
        <button onClick={() => setAsk(true)} data-press className="btn btn-danger btn-sm mt-3 w-full">
          Öğrenilenleri sıfırla
        </button>
      ) : (
        <div className="mt-3 rounded-lg bg-card p-2.5 text-[0.8125rem] ring-1 ring-red-200">
          <p>{owner ? "Herkesin (ekip dahil) öğrenme verisi silinecek." : "Senin öğrenme verin silinecek."} Kayıtların, mesajların silinmez.</p>
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setAsk(false)} data-press className="btn btn-text btn-sm text-mut">
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
