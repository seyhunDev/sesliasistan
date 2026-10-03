"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { isActive, loadAthletes, useDikili } from "@/features/athletes/data";
import { monthLabel, shiftMonth } from "@/features/athletes/attendanceReport";
import { loadDues, loadMovements, saveCfg, saveMonth } from "@/features/dues/duesData";
import { feeOf, incomingOf, matchMovement, monthRows, movKey, payerOf, splitAmount, usedKeys, words } from "@/lib/dues";
import { money } from "@/lib/bankSheet";
import { todayStr } from "@/lib/utils/format";

// Aidatlar (ana hesap + sporcu yetkisi): ay ay kim ödedi. EFT'ler banka hesap özeti maillerinden önerilir
// (gönderen anne/baba, soyadı aynı), onaylanınca sporcuya yazılır ve gönderen adı öğrenilir; nakit elle eklenir.
export default function DuesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = profile?.role === "owner" && canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed) return null;
  return <Dues uid={profile.uid} />;
}

const TL = (n) => `${money(n).replace(/,00$/, "")} TL`;
const STATE = { paid: ["Ödedi", "bg-ok/15 text-ok"], part: ["Eksik", "bg-amber-500/15 text-amber-700"], due: ["Bekliyor", "bg-bg text-mut"] };
const card = "rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";

function Dues({ uid }) {
  const toast = useToast();
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const thisMonth = todayStr().slice(0, 7);
  const [ym, setYm] = useState(thisMonth);
  const [d, setD] = useState(null); // { ym, cfg, month }
  const [mv, setMv] = useState(null); // { ym, movements, mails } | { ym, error }
  const [open, setOpen] = useState(""); // açık sporcu satırı
  const [pick, setPick] = useState(""); // elle sporcu seçilen hareket
  const [q, setQ] = useState("");
  const [feeIn, setFeeIn] = useState("");

  useEffect(() => {
    let live = true;
    loadDues(uid, ym).then(
      (x) => live && setD({ ym, ...x }),
      () => live && setD({ ym, cfg: {}, month: {}, error: true }),
    );
    loadMovements(uid, ym).then(
      (x) => live && setMv({ ym, ...x }),
      () => live && setMv({ ym, movements: [], error: true }),
    );
    return () => {
      live = false;
    };
  }, [uid, ym]);

  const ready = d?.ym === ym;
  const cfg = ready ? d.cfg : {};
  const month = ready ? d.month : {};
  const active = (data?.athletes || []).filter(isActive);
  const table = monthRows(active, month, cfg);
  const incoming = mv?.ym === ym ? incomingOf(mv.movements, ym, usedKeys(month), month.ignored || []) : [];

  async function writeMonth(next, msg) {
    setD((p) => ({ ...p, month: next }));
    try {
      await saveMonth(uid, ym, next);
      if (msg) toast(msg);
    } catch {
      toast("Kaydedilemedi");
    }
  }
  async function writeCfg(next) {
    setD((p) => ({ ...p, cfg: next }));
    await saveCfg(uid, next).catch(() => toast("Ayar kaydedilemedi"));
  }
  const addPay = (paid, a, entry) => ({ ...paid, [a.id]: [...(paid[a.id] || []), { ...entry, at: new Date().toISOString() }] });

  async function confirm(m, picks) {
    let paid = month.paid || {};
    for (const [a, amt] of splitAmount(m.amount, picks, cfg)) paid = addPay(paid, a, { amt, via: "eft", date: m.date, mov: movKey(m), desc: m.desc.slice(0, 120) });
    // Gönderen adını öğren: sonraki ay aynı kişiden gelen EFT kendiliğinden eşleşir
    const payers = { ...(cfg.payers || {}) };
    let learned = false;
    for (const a of picks) {
      const p = payerOf(m.desc, a);
      if (p && !(payers[a.id] || []).includes(p)) {
        payers[a.id] = [...(payers[a.id] || []), p].slice(-4);
        learned = true;
      }
    }
    if (learned) writeCfg({ ...cfg, payers });
    setPick("");
    await writeMonth({ ...month, paid }, `${picks.map((a) => a.studentName).join(", ")}: ${TL(m.amount)} yazıldı`);
  }
  async function confirmAll(list) {
    let paid = month.paid || {};
    const payers = { ...(cfg.payers || {}) };
    for (const { m, r } of list) {
      for (const [a, amt] of splitAmount(m.amount, r.picks, cfg)) paid = addPay(paid, a, { amt, via: "eft", date: m.date, mov: movKey(m), desc: m.desc.slice(0, 120) });
      for (const a of r.picks) {
        const p = payerOf(m.desc, a);
        if (p && !(payers[a.id] || []).includes(p)) payers[a.id] = [...(payers[a.id] || []), p].slice(-4);
      }
    }
    writeCfg({ ...cfg, payers });
    await writeMonth({ ...month, paid }, `${list.length} ödeme yazıldı`);
  }
  const ignore = (m) => writeMonth({ ...month, ignored: [...(month.ignored || []), movKey(m)] }, "Aidat değil olarak işaretlendi");
  const removePay = (a, i) => writeMonth({ ...month, paid: { ...month.paid, [a.id]: (month.paid?.[a.id] || []).filter((_, k) => k !== i) } }, "Ödeme silindi");

  if (err?.code === "permission-denied") return <Shell><DikiliLogin denied={!!user} onDone={reload} /></Shell>;
  if (err)
    return (
      <Shell>
        <button onClick={reload} className={`mt-4 w-full px-4 py-4 text-left text-[0.875rem] ${card}`}>
          <b className="block font-semibold text-rec">{err.text}</b>
          <span className="text-mut">Tekrar denemek için dokun</span>
        </button>
      </Shell>
    );
  if (!data || !ready) return <Shell><Loading label="Aidatlar yükleniyor" /></Shell>;

  const matched = incoming.map((m) => ({ m, r: matchMovement(m, active, cfg) }));
  const sure = matched.filter((x) => x.r.sure && x.r.picks.length);
  const qw = words(q).join(" ");
  const choices = active.filter((a) => !qw || words(a.studentName).join(" ").includes(qw) || words(a.parentName).join(" ").includes(qw));

  return (
    <Shell>
      {/* Ay */}
      <div className={`mt-1 flex items-center gap-2 p-1.5 ${card}`}>
        <button onClick={() => setYm((m) => shiftMonth(m, -1))} aria-label="Önceki ay" className="grid size-10 place-items-center rounded-xl active:bg-bg">
          <Icon name="back" className="size-5" />
        </button>
        <button onClick={() => setYm(thisMonth)} className="min-w-0 flex-1 text-center">
          <b className="block truncate text-[0.9375rem] font-semibold capitalize">{monthLabel(ym)}</b>
          <small className={`text-[0.75rem] ${ym === thisMonth ? "text-acc" : "text-mut"}`}>{ym === thisMonth ? "Bu ay" : "Bu aya dön"}</small>
        </button>
        <button onClick={() => setYm((m) => shiftMonth(m, 1))} disabled={ym >= thisMonth} aria-label="Sonraki ay" className="grid size-10 place-items-center rounded-xl active:bg-bg disabled:opacity-30">
          <Icon name="chev" className="size-5" />
        </button>
      </div>

      {/* Aidat tutarı */}
      {!cfg.fee ? (
        <div className={`mt-3 p-4 ${card}`}>
          <p className="text-[0.9375rem] font-semibold">Aylık aidat ne kadar?</p>
          <p className="mt-1 text-[0.8125rem] text-mut">Kardeş indirimi gibi farkları sporcunun satırından ayrıca girersin.</p>
          <div className="mt-3 flex gap-2">
            <input inputMode="decimal" value={feeIn} onChange={(e) => setFeeIn(e.target.value)} placeholder="ör. 1500" className="h-11 min-w-0 flex-1 rounded-xl bg-bg px-3 text-[0.9375rem] outline-none" />
            <button type="button" onClick={() => Number(feeIn) > 0 && writeCfg({ ...cfg, fee: Number(feeIn) })} className="h-11 rounded-xl bg-acc px-5 font-semibold text-white active:scale-[.98]">Kaydet</button>
          </div>
        </div>
      ) : (
        <div className={`mt-3 grid grid-cols-2 gap-px overflow-hidden text-center ${card}`}>
          <div className="px-3 py-3">
            <b className="block text-[1.25rem] font-semibold tabular-nums">{table.paidCount}/{table.rows.length}</b>
            <small className="text-[0.75rem] text-mut">sporcu ödedi</small>
          </div>
          <div className="px-3 py-3">
            <b className="block text-[1.25rem] font-semibold tabular-nums">{TL(table.paid)}</b>
            <small className="text-[0.75rem] text-mut">/ {TL(table.expected)} · aidat {TL(cfg.fee)}</small>
          </div>
        </div>
      )}

      {/* Bankadan gelenler */}
      <section className="mt-4">
        <div className="flex items-center justify-between px-1">
          <p className="text-[0.8125rem] font-semibold text-mut">BANKADAN GELENLER {incoming.length ? `(${incoming.length})` : ""}</p>
          {sure.length > 1 && (
            <button type="button" onClick={() => confirmAll(sure)} className="text-[0.8125rem] font-semibold text-acc">Eminleri onayla ({sure.length})</button>
          )}
        </div>
        {mv?.ym !== ym ? (
          <p className={`mt-2 px-4 py-3 text-[0.875rem] text-mut ${card}`}>Hesap özetleri okunuyor…</p>
        ) : mv.error ? (
          <p className={`mt-2 px-4 py-3 text-[0.875rem] text-rec ${card}`}>Mailler okunamadı. Gmail bağlantısı kurulu mu? (Ayarlar › Gmail bağlantısı)</p>
        ) : !incoming.length ? (
          <p className={`mt-2 px-4 py-3 text-[0.875rem] text-mut ${card}`}>
            {mv.mails ? "Bu ay eşleştirilecek gelen para yok." : "Bu ay hesap özeti maili gelmemiş. İş Bankası günlük hesap özeti maili gelince EFT'ler burada çıkar."}
          </p>
        ) : (
          <ul className={`mt-2 divide-y divide-line ${card}`}>
            {matched.map(({ m, r }) => {
              const k = movKey(m);
              return (
                <li key={k} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <b className="text-[1rem] font-semibold tabular-nums text-ok">+{TL(m.amount)}</b>
                    <small className="shrink-0 text-[0.75rem] text-mut">{m.date.slice(0, 10)}</small>
                  </div>
                  <p className="mt-0.5 line-clamp-2 break-words text-[0.8125rem] leading-snug text-mut">{m.desc}</p>
                  {r.picks.length > 0 && pick !== k && (
                    <p className="mt-1.5 text-[0.875rem]">
                      <Icon name="arrow" className="mr-1 inline size-3.5 text-acc" />
                      <b className="font-semibold">{r.picks.map((a) => a.studentName).join(" + ")}</b>
                      <span className={`ml-1.5 text-[0.75rem] ${r.sure ? "text-ok" : "text-amber-700"}`}>{r.why}</span>
                    </p>
                  )}
                  {!r.picks.length && r.list.length > 0 && pick !== k && (
                    <p className="mt-1.5 text-[0.8125rem] text-amber-700">Aynı soyadlı: {r.list.slice(0, 4).map((x) => x.a.studentName).join(", ")}</p>
                  )}
                  {pick === k ? (
                    <div className="mt-2">
                      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sporcu ya da veli adı" className="h-10 w-full rounded-xl bg-bg px-3 text-[0.9375rem] outline-none" />
                      <ul className="mt-1 max-h-56 overflow-y-auto">
                        {[...r.list.map((x) => x.a), ...choices.filter((a) => !r.list.some((x) => x.a.id === a.id))].slice(0, 30).map((a) => (
                          <li key={a.id}>
                            <button type="button" onClick={() => confirm(m, [a])} className="flex w-full items-baseline justify-between gap-2 py-2 text-left active:opacity-60">
                              <span className="text-[0.9375rem]">{a.studentName}</span>
                              <small className="truncate text-[0.75rem] text-mut">{a.parentName}</small>
                            </button>
                          </li>
                        ))}
                      </ul>
                      <button type="button" onClick={() => setPick("")} className="mt-1 text-[0.8125rem] font-semibold text-mut">Vazgeç</button>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      {r.picks.length > 0 && (
                        <button type="button" onClick={() => confirm(m, r.picks)} className="h-9 rounded-full bg-acc px-4 text-[0.8125rem] font-semibold text-white active:scale-95">Onayla</button>
                      )}
                      <button type="button" onClick={() => (setPick(k), setQ(""))} className="h-9 rounded-full px-4 text-[0.8125rem] font-semibold ring-1 ring-line active:scale-95">
                        {r.picks.length ? "Başka sporcu" : "Sporcu seç"}
                      </button>
                      <button type="button" onClick={() => ignore(m)} className="h-9 rounded-full px-3 text-[0.8125rem] font-medium text-mut active:scale-95">Aidat değil</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Sporcular */}
      <section className="mt-4">
        <p className="px-1 text-[0.8125rem] font-semibold text-mut">SPORCULAR</p>
        <ul className={`mt-2 divide-y divide-line ${card}`}>
          {table.rows.map((row) => (
            <PayRow
              key={row.a.id}
              row={row}
              cfg={cfg}
              open={open === row.a.id}
              onToggle={() => setOpen((o) => (o === row.a.id ? "" : row.a.id))}
              onCash={(amt) => writeMonth({ ...month, paid: addPay(month.paid || {}, row.a, { amt, via: "cash", date: todayStr() }) }, `${row.a.studentName}: nakit ${TL(amt)} yazıldı`)}
              onRemove={(i) => removePay(row.a, i)}
              onFee={(v) => writeCfg({ ...cfg, fees: { ...(cfg.fees || {}), [row.a.id]: v || null } })}
            />
          ))}
        </ul>
        {cfg.fee > 0 && (
          <button type="button" onClick={() => writeCfg({ ...cfg, fee: 0 })} className="mt-3 w-full text-center text-[0.8125rem] font-semibold text-mut">
            Aidat tutarını değiştir
          </button>
        )}
      </section>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <PageHeader title="Aidatlar" sub="EFT bankadan, nakit elle" back="/athletes" />
      {children}
    </main>
  );
}

function PayRow({ row, cfg, open, onToggle, onCash, onRemove, onFee }) {
  const { a, list, paid, fee, state } = row;
  const [cash, setCash] = useState("");
  const [own, setOwn] = useState(cfg.fees?.[a.id] ? String(cfg.fees[a.id]) : "");
  const [label, tone] = STATE[state];
  return (
    <li>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:opacity-70">
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[0.9375rem] font-medium">{a.studentName}</b>
          <small className="block truncate text-[0.75rem] text-mut">{paid ? `${TL(paid)}${list.some((p) => p.via === "cash") ? " · nakit" : ""}${list.some((p) => p.via === "eft") ? " · EFT" : ""}` : a.parentName || " "}</small>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${tone}`}>{label}</span>
      </button>
      {open && (
        <div className="px-4 pb-3 text-[0.875rem]">
          {list.length > 0 && (
            <ul className="mb-2 divide-y divide-line rounded-xl bg-bg px-3">
              {list.map((p, i) => (
                <li key={i} className="flex items-center gap-2 py-1.5">
                  <span className="min-w-0 flex-1">
                    <b className="font-semibold tabular-nums">{TL(p.amt)}</b> <span className="text-mut">· {p.via === "cash" ? "Nakit" : "EFT"} · {String(p.date || "").slice(0, 10)}</span>
                  </span>
                  <button type="button" onClick={() => onRemove(i)} aria-label="Sil" className="grid size-8 place-items-center rounded-full text-mut active:scale-95">
                    <Icon name="trash" className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <input inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder={`Nakit (${fee || "tutar"})`} className="h-10 min-w-0 flex-1 rounded-xl bg-bg px-3 outline-none" />
            <button
              type="button"
              onClick={() => {
                const v = Number(String(cash || fee).replace(",", "."));
                if (v > 0) (onCash(v), setCash(""));
              }}
              className="h-10 rounded-xl bg-acc px-4 font-semibold text-white active:scale-[.98]"
            >
              Nakit ekle
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-mut">Bu sporcunun aidatı</span>
            <input inputMode="decimal" value={own} onChange={(e) => setOwn(e.target.value)} onBlur={() => Number(own) !== Number(cfg.fees?.[a.id] || 0) && onFee(Number(own) || 0)} placeholder={String(feeOf({ id: "" }, cfg) || "")} className="h-9 w-24 rounded-xl bg-bg px-3 text-right outline-none" />
            <span className="text-mut">TL</span>
          </div>
        </div>
      )}
    </li>
  );
}
