"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { money } from "@/lib/bankSheet";
import { handoff, report } from "@/lib/bankAnalyze";
import { deleteStatement, loadStatements, readStatement, saveStatement } from "@/features/dues/duesData";
import { analyzeMoves, firstMailDay } from "@/features/bank/analyzeData";

const card = "overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";
const day = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "");
const tl = (n) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${money(Math.abs(n))} TL`;
const ROWS = 25;

// Banka defteri (Mailler sayfası): geçmiş dönem Excel'den bir kez, sonrası günlük maillerden.
// Excel yükle → telefonda okunur → yapay zeka inceler (tür, gönderen/alıcı adı, açıklama) → özet → "Deftere ekle".
// Günlük mail akışına dokunmaz; aynı hareket iki kaynakta da varsa bir kez durur (bankLedger.js).
export function LedgerCard({ uid, self, onSaved }) {
  const toast = useToast();
  const input = useRef(null);
  const [files, setFiles] = useState(null);
  const [mailDay, setMailDay] = useState("");
  const [step, setStep] = useState(""); // "" | okunuyor | inceleniyor | kaydediliyor
  const [prog, setProg] = useState("");
  const [res, setRes] = useState(null); // { read, moves, rep, failed, error }
  const [all, setAll] = useState(false);

  const refresh = () => loadStatements(uid).then(setFiles, () => setFiles([]));
  useEffect(() => {
    refresh();
    firstMailDay(uid).then(setMailDay, () => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setRes(null);
    setAll(false);
    try {
      setStep("okunuyor");
      const read = await readStatement(f);
      setStep("inceleniyor");
      setProg("");
      const a = await analyzeMoves(read.all, read.holder || self, (k, n) => n > 1 && setProg(`${k}/${n}`));
      setRes({ read, moves: a.moves, rep: report(a.moves), failed: a.failed, parts: a.parts, error: a.error });
    } catch (x) {
      toast(x?.message || "Dosya okunamadı");
    }
    setStep("");
  }

  async function save() {
    setStep("kaydediliyor");
    try {
      const r = await saveStatement(uid, { ...res.read, all: res.moves }, { ai: res.failed < res.parts });
      const old = res.moves.length - r.added;
      toast(`${r.added} hareket deftere eklendi${old > 0 ? ` (${old} tanesi zaten vardı)` : ""}`);
      setRes(null);
      refresh();
      onSaved?.();
    } catch (x) {
      toast(x?.message || "Kaydedilemedi");
    }
    setStep("");
  }

  async function del(f) {
    if (!confirm(`${f.name} silinsin mi? Bu dosyanın getirdiği hareketler defterden çıkar; maillerden gelenler kalır.`)) return;
    await deleteStatement(uid, f).catch(() => toast("Silinemedi"));
    refresh();
    onSaved?.();
  }

  const last = files?.[0];
  const rep = res?.rep;
  return (
    <section className="mt-5">
      <h2 className="px-1 pb-2 text-[0.8125rem] font-semibold text-mut">Banka defteri</h2>
      <div className={card}>
        <div className="px-4 py-3.5">
          <p className="text-[0.875rem] leading-snug">
            {last ? (
              <>
                Geçmiş dönem Excel’den: <b className="font-semibold">{day(last.from)} – {day(last.to)}</b>. Sonrası günlük maillerden ekleniyor.
              </>
            ) : (
              "Geçmiş dönemi eklemek için bankadan indirdiğin hesap özeti Excel’ini yükle. Yapay zeka inceler, sen onaylayınca deftere eklenir. Sonrası günlük maillerden gelir."
            )}
          </p>
          {mailDay && <p className="mt-1 text-[0.75rem] text-mut">Günlük mailler {day(mailDay)} gününden beri kayıtlı.</p>}
          <input ref={input} type="file" accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="hidden" onChange={pick} />
          <button
            type="button"
            disabled={!!step}
            onClick={() => input.current?.click()}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-60"
          >
            <Icon name={step ? "load" : "download"} className={`size-[1.125rem] ${step ? "animate-spin" : "rotate-180"}`} />
            {step === "okunuyor" ? "Excel okunuyor…" : step === "inceleniyor" ? `Yapay zeka inceliyor… ${prog}` : step === "kaydediliyor" ? "Deftere ekleniyor…" : "Banka Excel’i yükle"}
          </button>
        </div>

        {rep && (
          <div className="fade-in border-t border-line px-4 py-3.5">
            <p className="text-[0.75rem] font-semibold tracking-[.06em] text-mut">İNCELEME · {res.read.name}</p>
            <p className="mt-1 text-[1rem] font-semibold">
              {day(rep.from)} – {day(rep.to)} · {rep.count} hareket
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-ok/10 px-3 py-2">
                <p className="text-[0.6875rem] font-semibold text-ok">GELEN · {rep.inN}</p>
                <p className="text-[1rem] font-bold tabular-nums text-ok">{tl(rep.inSum)}</p>
              </div>
              <div className="rounded-xl bg-rec/10 px-3 py-2">
                <p className="text-[0.6875rem] font-semibold text-rec">GİDEN · {rep.outN}</p>
                <p className="text-[1rem] font-bold tabular-nums text-rec">{tl(rep.outSum)}</p>
              </div>
            </div>

            <ul className="mt-3 space-y-1 text-[0.8125rem]">
              {rep.cats.map((c) => (
                <li key={c.cat} className="flex gap-2">
                  <span className="min-w-0 flex-1 truncate">{c.cat}</span>
                  <span className="shrink-0 text-mut">{c.n}</span>
                  <span className="w-28 shrink-0 text-right tabular-nums">{tl(c.sum)}</span>
                </li>
              ))}
            </ul>

            {rep.top.length > 0 && (
              <>
                <p className="mt-3 text-[0.75rem] font-semibold text-mut">En çok gönderenler</p>
                <ul className="mt-1 space-y-1 text-[0.8125rem]">
                  {rep.top.map((w) => (
                    <li key={w.who} className="flex gap-2">
                      <span className="min-w-0 flex-1 truncate">{w.who}</span>
                      <span className="shrink-0 text-mut">{w.n}</span>
                      <span className="w-28 shrink-0 text-right tabular-nums text-ok">{tl(w.sum)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div className="mt-3 space-y-1 text-[0.75rem] leading-snug text-mut">
              {rep.noWho > 0 && <p>{rep.noWho} gelen paranın gönderen adı açıklamada bulunamadı.</p>}
              {res.failed > 0 && <p className="text-rec">Yapay zeka {res.failed === res.parts ? "yanıt vermedi" : "bir kısmına yanıt vermedi"} ({res.error}); türler yerel kurala göre yazıldı.</p>}
              <p>{handoff(rep.to, mailDay)}</p>
            </div>

            <ul className="mt-3 divide-y divide-line rounded-xl bg-bg px-3">
              {(all ? res.moves : res.moves.slice(0, ROWS)).map((m, i) => (
                <li key={i} className="flex items-start gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.8125rem] font-semibold">{m.who || m.note || m.desc}</b>
                    <small className="block truncate text-[0.75rem] text-mut">{[m.date.slice(0, 10), m.cat, m.who && m.note].filter(Boolean).join(" · ")}</small>
                  </span>
                  <b className={`shrink-0 text-[0.8125rem] font-semibold tabular-nums ${m.amount > 0 ? "text-ok" : ""}`}>{tl(m.amount)}</b>
                </li>
              ))}
            </ul>
            {res.moves.length > ROWS && (
              <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 h-9 w-full text-[0.8125rem] font-semibold text-acc">
                {all ? "Daha az göster" : `Bütün hareketler (${res.moves.length})`}
              </button>
            )}

            <div className="mt-3 flex gap-2">
              <button type="button" disabled={!!step} onClick={() => setRes(null)} className="h-11 flex-1 rounded-xl bg-bg text-[0.9375rem] font-semibold active:scale-[.98]">
                Vazgeç
              </button>
              <button type="button" disabled={!!step} onClick={save} className="h-11 flex-[2] rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98] disabled:opacity-60">
                Deftere ekle
              </button>
            </div>
          </div>
        )}

        {files?.length > 0 && (
          <ul className="divide-y divide-line border-t border-line px-4">
            {files.map((f) => (
              <li key={f.id} className="flex items-center gap-2 py-2">
                <Icon name="clip" className="size-4 shrink-0 text-mut" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.8125rem] font-medium">{f.name}</b>
                  <small className="text-[0.75rem] text-mut">
                    {day(f.from)} – {day(f.to)} · {f.total || f.count} hareket{f.ai ? " · yapay zeka inceledi" : ""}
                  </small>
                </span>
                <button type="button" onClick={() => del(f)} aria-label="Sil" className="grid size-8 place-items-center rounded-full text-mut active:scale-95">
                  <Icon name="trash" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
