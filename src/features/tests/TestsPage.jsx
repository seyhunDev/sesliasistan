"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ListHead, Row, RowList } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { DemoDataRow, IntroRow } from "@/features/settings/Groups";
import { TimingRow } from "@/features/settings/Timing";
import { timingList, timingSteps } from "@/lib/assistTiming";
import { buildLine } from "@/lib/buildInfo";
import { FEATURES, RUNNABLE } from "./registry";
import { ghPart, loadGh } from "./ghResult";
import { lastResults, reportList, reportPass, reportSave, reportText, reportTotal, reportWhen } from "./reports";

// Testler (Ayarlar › Diğer › Testler; Seyhun 2026-10-21): testler özellik özellik (registry.js). Telefonda çalışanlar seçilip
// toplu ya da hepsi birden çalıştırılır, her çalıştırma bir rapor bırakır (reports.js, bu cihazda). Üstte GitHub'daki tam testin
// son sonucu (ghResult.js), her özelliğin altında kendi bölümü. Elle yapılan testler (Ses testi, Bildirim testi) kendi sayfasında.
// Asistan: "testleri çalıştır" bu sayfayı ?calistir=hepsi ile açar (lib/assistRoute.js testsAsk).

const tagCls = { ok: "bg-ok/10 text-ok", warn: "bg-warnbg text-warn", mut: "text-mut" };
function Tag({ tone, children }) {
  return <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.75rem] font-semibold tabular-nums ${tagCls[tone]}`}>{children}</span>;
}
// Sonuç rozeti: tek adımlı testte Geçti/Kaldı, çok adımlıda 22/24
function Result({ r }) {
  if (!r) return <Tag tone="mut">—</Tag>;
  const ok = r.pass === r.total && r.total > 0;
  return <Tag tone={ok ? "ok" : "warn"}>{r.total <= 1 ? (ok ? "Geçti" : "Kaldı") : `${r.pass}/${r.total}`}</Tag>;
}

function Check({ on, onChange, label, disabled }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)} className="-my-2 -ml-1 grid size-10 shrink-0 place-items-center disabled:opacity-40">
      <span className={`grid size-[1.375rem] place-items-center rounded-[0.4375rem] transition ${on ? "bg-acc text-white" : "border-2 border-[#d6d3cb]"}`}>{on && <Icon name="check" className="size-3.5 [stroke-width:3]" />}</span>
    </button>
  );
}

// Seçilebilir test satırı: solda kutu, satıra dokununca son raporu
function TestRow({ t, sub, on, onCheck, busy, result, onOpen, disabled }) {
  return (
    <div className="flex min-h-[3.5rem] items-center gap-2 border-t border-line first:border-t-0">
      <Check on={on} onChange={onCheck} label={t.name} disabled={disabled} />
      <button type="button" data-press="row" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-left">
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-semibold">{t.name}</b>
          <small className="block truncate text-[0.8125rem] text-mut">{sub}</small>
        </span>
        {busy ? <Tag tone="mut">Çalışıyor…</Tag> : <Result r={result} />}
      </button>
    </div>
  );
}

// Bir testin satır satır sonucu (rapor penceresinde)
function Lines({ lines }) {
  return (
    <RowList>
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2.5 border-t border-line py-2 text-[0.875rem] first:border-t-0">
          <b className={`w-3.5 shrink-0 ${l.ok ? "text-ok" : "text-rec"}`}>{l.ok ? "✓" : "✗"}</b>
          <span className="min-w-0 flex-1 break-words">
            {l.text}
            {l.sub && <small className="block text-[0.8125rem] text-mut">{l.sub}</small>}
          </span>
        </div>
      ))}
    </RowList>
  );
}

function ReportBody({ r }) {
  return (
    <div className="space-y-4">
      {r.items.map((x) => (
        <section key={x.key}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
            <b className="truncate text-[0.9375rem] font-semibold">{x.name}</b>
            <Result r={x} />
          </div>
          <Lines lines={x.lines.length ? x.lines : [{ ok: false, text: "Durduruldu" }]} />
        </section>
      ))}
    </div>
  );
}

const gTime = (iso) => (iso ? reportWhen(iso) : "");
const avgTiming = () => {
  const t = timingList().map((r) => timingSteps(r).total).filter((x) => x > 0);
  return t.length ? `Ort. ${(t.reduce((a, b) => a + b, 0) / t.length / 1000).toFixed(1).replace(".", ",")} sn` : "";
};

export function TestsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [gh, setGh] = useState(null); // GitHub sonucu | { error }
  const [reports, setReports] = useState([]);
  const [sel, setSel] = useState(() => new Set());
  const [run, setRun] = useState(null); // { now: key, done: Set } çalışırken
  const [sheet, setSheet] = useState(null); // { kind: "report" | "reports" | "test" | "gh" | "timing" | "intro" | "demo", ... }
  const [timing, setTiming] = useState("");
  const stop = useRef(null);

  useEffect(() => {
    loadGh().then(setGh, (e) => setGh({ error: e.message }));
    const t = setTimeout(() => {
      setReports(reportList());
      setTiming(avgTiming());
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const last = lastResults(reports);

  async function start(keys) {
    if (run) return stop.current?.abort();
    const list = RUNNABLE.filter((t) => keys.includes(t.key));
    if (!list.length) return toast("Önce test seç");
    const ai = list.find((t) => t.ai);
    if (ai && !confirm(`${ai.name} yapay zekaya ${ai.sub().split(" ")[0]} istek gönderir (kayıt yapılmaz). Başlasın mı?`)) return;
    const ctl = new AbortController();
    stop.current = ctl;
    const t0 = Date.now();
    const items = [];
    for (const t of list) {
      if (ctl.signal.aborted) break;
      setRun({ now: t.key, done: new Set(items.map((x) => x.key)) });
      let r;
      try {
        r = await t.run({ signal: ctl.signal, uid: profile?.uid });
      } catch (e) {
        r = { lines: [{ ok: false, text: "Test çöktü", sub: e?.message || "" }], pass: 0, total: 1 };
      }
      items.push({ key: t.key, name: t.name, feature: t.feature, ...r });
    }
    setRun(null);
    if (!items.length) return;
    const rep = { at: new Date().toISOString(), ms: Date.now() - t0, items };
    setReports(reportSave(rep));
    setSheet({ kind: "report", r: rep });
  }

  // Asistandan "testleri çalıştır": sayfa ?calistir=hepsi ile açılır
  const auto = useRef(false);
  useEffect(() => {
    if (auto.current || !profile) return;
    if (new URLSearchParams(window.location.search).get("calistir") !== "hepsi") return;
    auto.current = true;
    router.replace("/settings/tests");
    setTimeout(() => start(RUNNABLE.map((t) => t.key)), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  if (!profile) return null;
  if (profile.role !== "owner") return <p className="px-5 pt-20 text-center text-mut">Bu sayfa yalnız ana hesapta</p>;

  const share = async (r) => {
    const text = reportText(r, `Sürüm: ${buildLine()}`);
    try {
      if (navigator.share) await navigator.share({ title: "Test raporu", text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Rapor kopyalandı");
      }
    } catch (e) {
      if (e?.name !== "AbortError") toast("Paylaşılamadı");
    }
  };

  const flip = (key, on) =>
    setSel((p) => {
      const n = new Set(p);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });

  // Açık test penceresi: o testin son raporu
  const tRep = sheet?.kind === "test" ? reports.find((r) => r.items.some((x) => x.key === sheet.key)) : null;
  const tItem = tRep?.items.find((x) => x.key === sheet.key);
  const runOne = () => {
    const key = sheet.key;
    setSheet(null);
    start([key]);
  };
  const ghLeft = gh && !gh.error ? gh.total - gh.pass : 0;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Testler">
        <header className="flex items-center gap-2.5">
          <BackButton href="/settings" />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">Testler</h1>
          <button type="button" onClick={() => setSheet({ kind: "reports" })} data-press className="raised flex h-9 shrink-0 items-center rounded-xl border px-3.5 text-[0.875rem] font-semibold">
            Raporlar
          </button>
        </header>

        <button type="button" onClick={() => gh && !gh.error && setSheet({ kind: "gh" })} className="mt-5 block w-full text-left active:opacity-80">
          <span className="flex items-baseline justify-between gap-3 text-[0.8125rem] font-semibold">
            <span className="truncate text-white/65">GitHub{gh?.when ? ` · ${gTime(gh.when)}` : ""}</span>
            {ghLeft > 0 && <span className="shrink-0 text-[#f3c37a]">{ghLeft} kalan</span>}
          </span>
          {!gh ? (
            <b className="mt-1 block text-[1.25rem] font-bold text-white/60">Okunuyor…</b>
          ) : gh.error ? (
            <b className="mt-1 block truncate text-[1.0625rem] font-semibold text-[#f3c37a]">{gh.error}</b>
          ) : (
            <>
              <b className="mt-0.5 block text-[2.125rem] font-bold tabular-nums leading-tight tracking-[-.02em]">
                {gh.pass}
                <span className="text-[1.375rem] text-white/50"> / {gh.total}</span>
              </b>
              <span className="mt-2 block h-[0.4375rem] overflow-hidden rounded-full bg-white/15" aria-hidden="true">
                <span className="block h-full rounded-full bg-[#67e8f9]" style={{ width: `${Math.round((gh.pass / Math.max(1, gh.total)) * 100)}%` }} />
              </span>
            </>
          )}
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => start(RUNNABLE.map((t) => t.key))} disabled={!!run} data-press className="raised flex h-11 items-center justify-center rounded-xl border text-[0.9375rem] font-semibold disabled:opacity-40">
            Hepsini çalıştır
          </button>
          <button type="button" onClick={() => start([...sel])} disabled={!run && !sel.size} data-press className="raised act-main flex h-11 items-center justify-center rounded-xl border text-[0.9375rem] font-semibold disabled:opacity-40">
            {run ? "Durdur" : `Seçilenler${sel.size ? ` (${sel.size})` : ""}`}
          </button>
        </div>
      </section>

      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {FEATURES.map((f) => (
          <section key={f.id}>
            <ListHead title={f.name} count={f.tests.length} />
            <RowList>
              {f.tests.map((t) => {
                const key = `${f.id}.${t.id}`;
                if (t.run)
                  return (
                    <TestRow
                      key={key}
                      t={t}
                      sub={t.sub()}
                      on={sel.has(key)}
                      onCheck={(on) => flip(key, on)}
                      disabled={!!run}
                      busy={run?.now === key}
                      result={last[key]}
                      onOpen={() => setSheet({ kind: "test", key, t })}
                    />
                  );
                if (t.href) return <Row key={key} href={t.href} title={t.name} sub={t.sub()} />;
                const p = gh && !gh.error ? ghPart(gh, t.gh) : null;
                return (
                  <Row
                    key={key}
                    title={t.name}
                    sub={`GitHub${gh?.when ? ` · ${gTime(gh.when)}` : ""}`}
                    right={p ? <Result r={p} /> : <Tag tone="mut">—</Tag>}
                    chev={false}
                    onClick={p ? () => setSheet({ kind: "gh", t, p }) : undefined}
                  />
                );
              })}
            </RowList>
          </section>
        ))}

        <section>
          <ListHead title="Kayıtlar" count={2} />
          <RowList>
            <Row href="/settings/report" title="Asistan raporu" sub="Bugün, bu cihaz" />
            <Row onClick={() => setSheet({ kind: "timing" })} title="Süre kaydı" sub={timing || "Kayıt yok"} />
          </RowList>
        </section>

        <section>
          <ListHead title="Araçlar" count={2} />
          <RowList>
            <Row onClick={() => setSheet({ kind: "intro" })} title="Tanıtım ve karşılama" />
            <Row onClick={() => setSheet({ kind: "demo" })} title="Örnek veri" />
          </RowList>
        </section>
      </div>

      <Sheet open={sheet?.kind === "report"} onClose={() => setSheet(null)} title={sheet?.r ? `Rapor · ${reportWhen(sheet.r.at)}` : "Rapor"}>
        {sheet?.r && (
          <>
            <p className="mb-4 px-1 text-[0.8125rem] font-semibold text-mut">
              {reportPass(sheet.r)}/{reportTotal(sheet.r)} geçti · {sheet.r.items.length} test · {Math.round(sheet.r.ms / 1000)} sn
            </p>
            <ReportBody r={sheet.r} />
            <div className="mt-5 flex gap-2">
              <Button variant="secondary" full onClick={() => setSheet(null)}>Kapat</Button>
              <Button full onClick={() => share(sheet.r)}>Paylaş</Button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={sheet?.kind === "reports"} onClose={() => setSheet(null)} title="Raporlar">
        {reports.length ? (
          <RowList>
            {reports.map((r) => (
              <Row
                key={r.at}
                onClick={() => setSheet({ kind: "report", r })}
                title={reportWhen(r.at)}
                sub={r.items.map((x) => x.name).join(", ")}
                right={<Result r={{ pass: reportPass(r), total: reportTotal(r) }} />}
              />
            ))}
          </RowList>
        ) : (
          <p className="py-4 text-center text-[0.9375rem] text-mut">Henüz rapor yok</p>
        )}
      </Sheet>

      <Sheet open={sheet?.kind === "test"} onClose={() => setSheet(null)} title={sheet?.t?.name || ""}>
        {sheet?.kind === "test" && (
          <>
            {tItem ? (
              <>
                <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
                  <span className="text-[0.8125rem] font-semibold text-mut">{reportWhen(tRep.at)}</span>
                  <Result r={tItem} />
                </div>
                <Lines lines={tItem.lines} />
              </>
            ) : (
              <p className="py-2 text-center text-[0.9375rem] text-mut">Henüz çalıştırılmadı</p>
            )}
            <div className="mt-5 flex gap-2">
              {tItem && <Button variant="secondary" full onClick={() => share({ ...tRep, items: [tItem] })}>Paylaş</Button>}
              <Button full disabled={!!run} onClick={runOne}>Çalıştır</Button>
            </div>
          </>
        )}
      </Sheet>

      <Sheet open={sheet?.kind === "gh"} onClose={() => setSheet(null)} title={sheet?.t ? `${sheet.t.name} · GitHub` : "GitHub testi"}>
        {sheet?.kind === "gh" && gh && !gh.error && (
          <>
            <p className="mb-3 px-1 text-[0.8125rem] font-semibold text-mut">
              {gTime(gh.when)} · {sheet.p ? `${sheet.p.pass}/${sheet.p.total}` : `${gh.pass}/${gh.total} · ${gh.secs} sn`}
            </p>
            <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-words rounded-[1.25rem] border border-line bg-card px-3.5 py-3 text-[0.75rem] leading-snug">
              {sheet.p ? sheet.p.body : gh.sections.map((s) => `${s.title}: ${s.pass}/${s.total}`).join("\n")}
            </pre>
            {gh.run && (
              <div className="mt-5 flex gap-2">
                <Button variant="secondary" full onClick={() => window.open(gh.run, "_blank", "noopener")}>GitHub&apos;da aç</Button>
              </div>
            )}
          </>
        )}
      </Sheet>

      <Sheet open={sheet?.kind === "timing"} onClose={() => (setSheet(null), setTiming(avgTiming()))} title="Süre kaydı">
        {sheet?.kind === "timing" && <TimingRow bare />}
      </Sheet>
      <Sheet open={sheet?.kind === "intro"} onClose={() => setSheet(null)} title="Tanıtım ve karşılama">
        {sheet?.kind === "intro" && <IntroRow bare />}
      </Sheet>
      <Sheet open={sheet?.kind === "demo"} onClose={() => setSheet(null)} title="Örnek veri">
        {sheet?.kind === "demo" && <DemoDataRow bare />}
      </Sheet>
    </main>
  );
}
