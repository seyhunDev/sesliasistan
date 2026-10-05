"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { isActive, loadAthletes, useDikili } from "@/features/athletes/data";
import { monthLabel } from "@/features/athletes/attendanceReport";
import { deleteStatement, loadDuesRange, loadMovementsRange, loadStatements, saveCfg, saveMonth, saveRoster, uploadStatement } from "@/features/dues/duesData";
import { feeOf, gridOf, lastMonths, movKey, payerOf, paymentsOf, pendingOf, splitAmount, words } from "@/lib/dues";
import { money } from "@/lib/bankSheet";
import { todayStr } from "@/lib/utils/format";
import { saveSum } from "@/lib/homeTiles";
import { rosterOf } from "@/lib/duesAuto";

// Aidatlar (ana hesap + sporcu yetkisi). Tek bakışta tablo: sporcular × son 6 ay (✓ ödedi, ½ eksik, boş bekliyor).
// Hücreye dokun: o ayın ödemeleri (tarih, açıklama), nakit ekle. Ay başlığına dokun: ayın ödemeler listesi + Excel.
// Bankadan gelen ve henüz sporcuya yazılmamış paralar ayrı ekranda ("Eşleştir"): öneri → Onayla / Başka sporcu / Aidat değil.
// Aidat tutarı ve banka Excel'i yükleme Ayarlar'da (dişli).
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
const card = "rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";
const shortMonth = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "short" }).replace(".", "");
const day = (s) => String(s || "").slice(0, 10);

function Dues({ uid }) {
  const toast = useToast();
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const thisMonth = todayStr().slice(0, 7);
  const [yms] = useState(() => lastMonths(thisMonth, 6));
  const [d, setD] = useState(null); // { cfg, months }
  const [mv, setMv] = useState(null); // { movements } | { error }
  const [tick, setTick] = useState(0);
  const [cell, setCell] = useState(null); // { id, ym } açık hücre
  const [monthOpen, setMonthOpen] = useState(""); // ay listesi
  const [matchOpen, setMatchOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [q, setQ] = useState("");
  const [onlyDue, setOnlyDue] = useState(false);

  // Mail gelince sunucu aidatı kendiliğinden yazabilir: uygulamaya dönünce tablo yeniden okunur (eski kayıtla üstüne yazılmasın)
  const [fresh, setFresh] = useState(0);
  useEffect(() => {
    const on = () => document.visibilityState === "visible" && setFresh((n) => n + 1);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  useEffect(() => {
    let live = true;
    loadDuesRange(uid, yms).then(
      (x) => live && setD(x),
      () => live && setD({ cfg: {}, months: {}, error: true }),
    );
    return () => {
      live = false;
    };
  }, [uid, yms, fresh]);
  useEffect(() => {
    let live = true;
    loadMovementsRange(uid, yms[0], yms.at(-1)).then(
      (x) => live && setMv(x),
      () => live && setMv({ movements: [], error: true }),
    );
    return () => {
      live = false;
    };
  }, [uid, yms, tick]);

  // Sunucunun eşleştirme listesi (yalnız adlar): sporcular değişince yazılır
  useEffect(() => {
    if (!data?.athletes || !d || d.error) return;
    const roster = rosterOf(data.athletes.filter(isActive));
    if (roster.length && JSON.stringify(roster) !== JSON.stringify(d.cfg.roster || [])) {
      saveRoster(uid, roster).then(() => setD((p) => ({ ...p, cfg: { ...p.cfg, roster } })), () => {});
    }
  }, [data, d, uid]);

  // Ana sayfadaki Aidatlar kartı için bu ayın özeti bu cihazda saklanır (ek okuma yok)
  useEffect(() => {
    if (!data || !d || d.error || !mv) return;
    const active = (data.athletes || []).filter(isActive);
    const t = gridOf(active, d.months, d.cfg, yms).totals[thisMonth];
    const pending = mv.error ? 0 : pendingOf(mv.movements, d.months, active, d.cfg, yms).length;
    saveSum("dues", { ym: thisMonth, paidCount: t.paidCount, count: t.count, pending });
  }, [data, d, mv, yms, thisMonth]);

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
  if (!data || !d) return <Shell><Loading label="Aidatlar yükleniyor" /></Shell>;

  const { cfg, months } = d;
  const active = (data.athletes || []).filter(isActive);
  const grid = gridOf(active, months, cfg, yms);
  const pending = mv && !mv.error ? pendingOf(mv.movements, months, active, cfg, yms) : [];
  const now = grid.totals[thisMonth];
  const qw = words(q).join(" ");
  const rows = grid.rows.filter((r) => (!qw || words(`${r.a.studentName} ${r.a.parentName}`).join(" ").includes(qw)) && (!onlyDue || r.cells[thisMonth].state !== "paid"));

  async function writeMonth(ym, next, msg) {
    setD((p) => ({ ...p, months: { ...p.months, [ym]: next } }));
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
  const learn = (payers, m, picks) => {
    let changed = false;
    for (const a of picks) {
      const p = payerOf(m.desc, a);
      if (p && !(payers[a.id] || []).includes(p)) {
        payers[a.id] = [...(payers[a.id] || []), p].slice(-4);
        changed = true;
      }
    }
    return changed;
  };
  // Onay: ödemeyi sporcu(lar)a yaz, gönderen adını öğren. list: [{ ym, m, picks }]
  async function confirm(list) {
    const payers = { ...(cfg.payers || {}) };
    let learned = false;
    const byMonth = {};
    for (const { ym, m, picks } of list) {
      let paid = (byMonth[ym] || months[ym] || {}).paid || {};
      for (const [a, amt] of splitAmount(m.amount, picks, cfg)) paid = addPay(paid, a, { amt, via: "eft", date: m.date, mov: movKey(m), desc: String(m.desc).slice(0, 120) });
      byMonth[ym] = { ...(byMonth[ym] || months[ym] || {}), paid };
      learned = learn(payers, m, picks) || learned;
    }
    if (learned) writeCfg({ ...cfg, payers });
    for (const [ym, next] of Object.entries(byMonth)) await writeMonth(ym, next);
    toast(list.length === 1 ? `${list[0].picks.map((a) => a.studentName).join(", ")}: ${TL(list[0].m.amount)} yazıldı` : `${list.length} ödeme yazıldı`);
  }
  const ignore = (ym, m) => writeMonth(ym, { ...(months[ym] || {}), ignored: [...(months[ym]?.ignored || []), movKey(m)] }, "Aidat değil olarak işaretlendi");

  const open = cell && grid.rows.find((r) => r.a.id === cell.id);
  return (
    <Shell onSettings={() => setSetOpen(true)}>
      {!cfg.fee && (
        <button type="button" onClick={() => setSetOpen(true)} className={`mt-2 w-full px-4 py-3 text-left ${card}`}>
          <b className="block text-[0.9375rem] font-semibold">Önce aylık aidat tutarını gir</b>
          <span className="text-[0.8125rem] text-mut">Ödedi / eksik buna göre hesaplanır. Dokun.</span>
        </button>
      )}

      {/* Bu ay + eşleşme bekleyenler */}
      <div className={`mt-2 flex items-center gap-3 px-4 py-3 ${card}`}>
        <span className="min-w-0 flex-1">
          <b className="block text-[1.0625rem] font-semibold">
            {monthLabel(thisMonth)}: {now.paidCount}/{now.count} ödedi
          </b>
          <small className="text-[0.8125rem] text-mut">
            {TL(now.paid)}
            {now.expected ? ` / ${TL(now.expected)}` : ""}
          </small>
        </span>
      </div>
      {mv?.error ? (
        <p className={`mt-2 px-4 py-3 text-[0.8125rem] text-rec ${card}`}>Banka mailleri okunamadı. Gmail bağlantısı kurulu mu?</p>
      ) : (
        pending.length > 0 && (
          <button type="button" onClick={() => setMatchOpen(true)} className="mt-2 flex w-full items-center gap-3 rounded-2xl bg-amber-500/12 px-4 py-3 text-left active:scale-[.99]">
            <Icon name="wallet" className="size-5 shrink-0 text-amber-700" />
            <span className="min-w-0 flex-1">
              <b className="block text-[0.9375rem] font-semibold">{pending.length} banka ödemesi eşleşmeyi bekliyor</b>
              <small className="text-[0.8125rem] text-mut">{pending.filter((x) => x.r.sure).length} tanesi emin · dokun, onayla</small>
            </span>
            <Icon name="chev" className="size-4 text-mut" />
          </button>
        )
      )}

      {/* Arama + süzgeç */}
      <div className="mt-3 flex gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-card px-3.5 shadow-[0_1px_3px_rgba(38,40,44,.05)]">
          <Icon name="search" className="size-4 text-mut" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sporcu ya da veli ara" className="h-10 w-full bg-transparent text-[0.9375rem] outline-none" />
        </label>
        <button type="button" onClick={() => setOnlyDue((v) => !v)} className={`h-10 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-semibold active:scale-95 ${onlyDue ? "bg-acc text-white" : "bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]"}`}>
          Bu ay ödemeyenler
        </button>
      </div>

      {/* Tablo: sporcu × ay */}
      <div className={`mt-3 overflow-hidden ${card}`}>
        <div className="flex items-center border-b border-line px-3 py-2 text-[0.75rem] font-semibold text-mut">
          <span className="min-w-0 flex-1">Sporcu</span>
          {yms.map((ym) => (
            <button key={ym} type="button" onClick={() => setMonthOpen(ym)} className={`w-10 shrink-0 text-center capitalize active:opacity-60 ${ym === thisMonth ? "text-acc" : ""}`}>
              {shortMonth(ym)}
            </button>
          ))}
        </div>
        <ul className="divide-y divide-line">
          {rows.map(({ a, cells }) => (
            <li key={a.id} className="flex items-center px-3 py-1.5">
              <span className="min-w-0 flex-1 truncate pr-2 text-[0.875rem]">{a.studentName}</span>
              {yms.map((ym) => {
                const c = cells[ym];
                return (
                  <button key={ym} type="button" onClick={() => setCell({ id: a.id, ym })} aria-label={`${a.studentName} ${monthLabel(ym)}`} className="grid h-9 w-10 shrink-0 place-items-center active:scale-90">
                    {c.state === "paid" ? (
                      <span className="grid size-6 place-items-center rounded-full bg-ok text-white"><Icon name="check" className="size-3.5" /></span>
                    ) : c.state === "part" ? (
                      <span className="grid size-6 place-items-center rounded-full bg-amber-500/20 text-[0.625rem] font-bold text-amber-700">½</span>
                    ) : (
                      <span className={`size-2 rounded-full ${ym === thisMonth ? "bg-rec/50" : "bg-line"}`} />
                    )}
                  </button>
                );
              })}
            </li>
          ))}
          {!rows.length && <li className="px-4 py-4 text-[0.875rem] text-mut">Sporcu bulunamadı.</li>}
        </ul>
        <div className="flex items-center border-t border-line px-3 py-2 text-[0.6875rem] font-semibold text-mut">
          <span className="min-w-0 flex-1">Ödeyen</span>
          {yms.map((ym) => (
            <span key={ym} className="w-10 shrink-0 text-center tabular-nums">{grid.totals[ym].paidCount}</span>
          ))}
        </div>
      </div>
      <p className="mt-2 px-1 text-[0.75rem] text-mut">Kutuya dokun: o ayın ödemeleri ve nakit ekle. Ay adına dokun: ayın tüm ödemeleri.</p>

      {/* Hücre: sporcunun o ayı */}
      <Sheet open={!!open} onClose={() => setCell(null)} title={open ? `${open.a.studentName} · ${monthLabel(cell.ym)}` : ""}>
        {open && (
          <CellView
            key={`${cell.id}-${cell.ym}`}
            c={open.cells[cell.ym]}
            cfg={cfg}
            onCash={(amt) => writeMonth(cell.ym, { ...(months[cell.ym] || {}), paid: addPay(months[cell.ym]?.paid || {}, open.a, { amt, via: "cash", date: todayStr() }) }, `Nakit ${TL(amt)} yazıldı`)}
            onRemove={(i) => writeMonth(cell.ym, { ...months[cell.ym], paid: { ...months[cell.ym].paid, [open.a.id]: (months[cell.ym].paid?.[open.a.id] || []).filter((_, k) => k !== i) } }, "Ödeme silindi")}
            onFee={(v) => writeCfg({ ...cfg, fees: { ...(cfg.fees || {}), [open.a.id]: v || null } })}
          />
        )}
      </Sheet>

      {/* Ay: tüm ödemeler */}
      <Sheet open={!!monthOpen} onClose={() => setMonthOpen("")} title={monthOpen ? `${monthLabel(monthOpen)} ödemeleri` : ""}>
        {monthOpen && <div className="overflow-y-auto px-5 pb-2"><Payments list={mv && !mv.error ? paymentsOf(mv.movements, months[monthOpen] || {}, active, cfg, monthOpen) : null} ym={monthOpen} error={mv?.error} /></div>}
      </Sheet>

      {/* Eşleştir */}
      <Sheet open={matchOpen} onClose={() => setMatchOpen(false)} title="Banka ödemelerini eşleştir">
        <div className="overflow-y-auto px-5 pb-2">
          <MatchList pending={pending} athletes={active} onConfirm={confirm} onIgnore={ignore} />
        </div>
      </Sheet>

      {/* Ayarlar */}
      <Sheet open={setOpen} onClose={() => setSetOpen(false)} title="Aidat ayarları">
        <div className="overflow-y-auto px-5 pb-2">
          <FeeBox cfg={cfg} onSave={(fee) => (writeCfg({ ...cfg, fee }), toast("Aidat tutarı kaydedildi"))} />
          <BankFiles uid={uid} onChange={() => setTick((t) => t + 1)} />
        </div>
      </Sheet>
    </Shell>
  );
}

function Shell({ children, onSettings }) {
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <PageHeader title="Aidatlar" sub="Son 6 ay" back="/athletes">
        {onSettings && (
          <button type="button" onClick={onSettings} aria-label="Aidat ayarları" className="grid size-10 place-items-center rounded-full bg-card shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-90">
            <Icon name="sliders" className="size-5" />
          </button>
        )}
      </PageHeader>
      {children}
    </main>
  );
}

function FeeBox({ cfg, onSave }) {
  const [v, setV] = useState(cfg.fee ? String(cfg.fee) : "");
  return (
    <div className={`p-4 ${card} !bg-bg shadow-none`}>
      <p className="text-[0.9375rem] font-semibold">Aylık aidat</p>
      <p className="mt-0.5 text-[0.8125rem] text-mut">Kardeş indirimi gibi farklar sporcunun kutusundan girilir.</p>
      <div className="mt-2 flex gap-2">
        <input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} placeholder="ör. 1500" className="h-11 min-w-0 flex-1 rounded-xl bg-card px-3 text-[0.9375rem] outline-none" />
        <button type="button" onClick={() => Number(v) > 0 && onSave(Number(String(v).replace(",", ".")))} className="h-11 rounded-xl bg-acc px-5 font-semibold text-white active:scale-[.98]">Kaydet</button>
      </div>
    </div>
  );
}

// Sporcunun bir ayı: ödemeler (tarih, tutar, EFT/nakit, banka açıklaması), sil, nakit ekle, sporcuya özel aidat
function CellView({ c, cfg, onCash, onRemove, onFee }) {
  const [cash, setCash] = useState("");
  const [own, setOwn] = useState(cfg.fees?.[c.a.id] ? String(cfg.fees[c.a.id]) : "");
  const label = { paid: "Ödedi", part: "Eksik ödedi", due: "Ödeme yok" }[c.state];
  return (
    <div className="overflow-y-auto px-5 pb-2 text-[0.875rem]">
      <p className="text-mut">
        <b className={c.state === "paid" ? "text-ok" : c.state === "part" ? "text-amber-700" : "text-fg"}>{label}</b>
        {` · ${TL(c.paid)}${c.fee ? ` / ${TL(c.fee)}` : ""}`}
        {c.a.parentName ? ` · Veli: ${c.a.parentName}` : ""}
      </p>
      {c.list.length > 0 && (
        <ul className="mt-3 divide-y divide-line rounded-xl bg-bg px-3">
          {c.list.map((p, i) => (
            <li key={i} className="flex items-start gap-2 py-2">
              <span className="min-w-0 flex-1">
                <b className="font-semibold tabular-nums">{TL(p.amt)}</b>
                <span className="text-mut"> · {p.via === "cash" ? "Nakit" : p.by === "auto" ? "EFT · otomatik" : "EFT"} · {day(p.date)}</span>
                {p.desc && <small className="mt-0.5 block break-words text-[0.75rem] leading-snug text-mut">{p.desc}</small>}
              </span>
              <button type="button" onClick={() => onRemove(i)} aria-label="Sil" className="grid size-8 shrink-0 place-items-center rounded-full text-mut active:scale-95">
                <Icon name="trash" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex gap-2">
        <input inputMode="decimal" value={cash} onChange={(e) => setCash(e.target.value)} placeholder={`Nakit (${c.fee || "tutar"})`} className="h-11 min-w-0 flex-1 rounded-xl bg-bg px-3 outline-none" />
        <button
          type="button"
          onClick={() => {
            const v = Number(String(cash || c.fee).replace(",", "."));
            if (v > 0) (onCash(v), setCash(""));
          }}
          className="h-11 rounded-xl bg-acc px-4 font-semibold text-white active:scale-[.98]"
        >
          Nakit ekle
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-mut">Bu sporcunun aidatı</span>
        <input inputMode="decimal" value={own} onChange={(e) => setOwn(e.target.value)} onBlur={() => Number(own) !== Number(cfg.fees?.[c.a.id] || 0) && onFee(Number(own) || 0)} placeholder={String(feeOf({ id: "" }, cfg) || "")} className="h-9 w-24 rounded-xl bg-bg px-3 text-right outline-none" />
        <span className="text-mut">TL</span>
      </div>
    </div>
  );
}

// Eşleşme bekleyen banka ödemeleri: ay ay; öneri → Onayla, Başka sporcu, Aidat değil
function MatchList({ pending, athletes, onConfirm, onIgnore }) {
  const [pick, setPick] = useState("");
  const [q, setQ] = useState("");
  if (!pending.length) return <p className="py-4 text-center text-[0.875rem] text-mut">Eşleşme bekleyen ödeme kalmadı.</p>;
  const sure = pending.filter((x) => x.r.sure && x.r.picks.length);
  const qw = words(q).join(" ");
  const choices = athletes.filter((a) => !qw || words(`${a.studentName} ${a.parentName}`).join(" ").includes(qw));
  return (
    <div>
      {sure.length > 1 && (
        <button type="button" onClick={() => onConfirm(sure.map(({ ym, m, r }) => ({ ym, m, picks: r.picks })))} className="mb-3 h-11 w-full rounded-xl bg-acc font-semibold text-white active:scale-[.98]">
          Eminleri onayla ({sure.length})
        </button>
      )}
      <ul className="divide-y divide-line">
        {pending.map(({ ym, m, r }, i) => {
          const k = movKey(m);
          const head = i === 0 || pending[i - 1].ym !== ym;
          return (
            <li key={k} className="py-3">
              {head && <p className="mb-2 text-[0.75rem] font-semibold capitalize text-mut">{monthLabel(ym)}</p>}
              <div className="flex items-baseline justify-between gap-2">
                <b className="text-[1rem] font-semibold tabular-nums text-ok">+{TL(m.amount)}</b>
                <small className="shrink-0 text-[0.75rem] text-mut">{day(m.date)}</small>
              </div>
              <p className="mt-0.5 break-words text-[0.8125rem] leading-snug text-mut">{m.desc}</p>
              {pick === k ? (
                <div className="mt-2">
                  <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sporcu ya da veli adı" className="h-10 w-full rounded-xl bg-bg px-3 text-[0.9375rem] outline-none" />
                  <ul className="mt-1 max-h-56 overflow-y-auto">
                    {[...r.list.map((x) => x.a), ...choices.filter((a) => !r.list.some((x) => x.a.id === a.id))].slice(0, 30).map((a) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => (setPick(""), onConfirm([{ ym, m, picks: [a] }]))} className="flex w-full items-baseline justify-between gap-2 py-2 text-left active:opacity-60">
                          <span className="text-[0.9375rem]">{a.studentName}</span>
                          <small className="truncate text-[0.75rem] text-mut">{a.parentName}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => setPick("")} className="mt-1 text-[0.8125rem] font-semibold text-mut">Vazgeç</button>
                </div>
              ) : (
                <>
                  {r.picks.length > 0 ? (
                    <p className="mt-1.5 text-[0.875rem]">
                      <b className="font-semibold">{r.picks.map((a) => a.studentName).join(" + ")}</b>
                      <span className={`ml-1.5 text-[0.75rem] ${r.sure ? "text-ok" : "text-amber-700"}`}>{r.why}</span>
                    </p>
                  ) : r.list.length > 0 ? (
                    <p className="mt-1.5 text-[0.8125rem] text-amber-700">Aynı soyadlı: {r.list.slice(0, 4).map((x) => x.a.studentName).join(", ")}</p>
                  ) : null}
                  <div className="mt-2 flex gap-2">
                    {r.picks.length > 0 && (
                      <button type="button" onClick={() => onConfirm([{ ym, m, picks: r.picks }])} className="h-9 rounded-full bg-acc px-4 text-[0.8125rem] font-semibold text-white active:scale-95">Onayla</button>
                    )}
                    <button type="button" onClick={() => (setPick(k), setQ(""))} className="h-9 rounded-full px-4 text-[0.8125rem] font-semibold ring-1 ring-line active:scale-95">
                      {r.picks.length ? "Başka sporcu" : "Sporcu seç"}
                    </button>
                    <button type="button" onClick={() => onIgnore(ym, m)} className="h-9 rounded-full px-3 text-[0.8125rem] font-medium text-mut active:scale-95">Aidat değil</button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Banka Excel'i yükle: bankadan indirilen hesap hareketleri (ör. son 3 ay). Gelen paralar saklanır, geçmiş aylarda da görünür.
function BankFiles({ uid, onChange }) {
  const toast = useToast();
  const input = useRef(null);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(null);
  const [busy, setBusy] = useState(false);
  const refresh = () => loadStatements(uid).then(setList, () => setList([]));
  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      const r = await uploadStatement(uid, f);
      toast(`${r.added} yeni hareket eklendi (${r.from.split("-").reverse().join(".")} – ${r.to.split("-").reverse().join(".")})`);
      onChange();
      if (open) refresh();
    } catch (x) {
      toast(x?.message || "Dosya okunamadı");
    }
    setBusy(false);
  }
  async function del(f) {
    if (!confirm(`${f.name} silinsin mi? Onayladığın ödemeler kalır.`)) return;
    await deleteStatement(uid, f).catch(() => toast("Silinemedi"));
    refresh();
    onChange();
  }
  const day = (s) => String(s || "").split("-").reverse().join(".");
  return (
    <div className={`mt-3 ${card} !bg-bg shadow-none`}>
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Icon name="download" className="size-5 shrink-0 text-mut" />
        <button type="button" onClick={() => (setOpen((o) => !o), !open && !list && refresh())} className="min-w-0 flex-1 text-left">
          <b className="block text-[0.9375rem] font-medium">Banka Excel’i</b>
          <small className="block text-[0.75rem] text-mut">Geçmiş aylar için bankadan indirdiğin hesap hareketleri</small>
        </button>
        <input ref={input} type="file" accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" className="hidden" onChange={pick} />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="h-9 shrink-0 rounded-full bg-acc px-4 text-[0.8125rem] font-semibold text-white active:scale-95 disabled:opacity-50">
          {busy ? "Okunuyor…" : "Yükle"}
        </button>
      </div>
      {open && (
        <ul className="divide-y divide-line border-t border-line px-4">
          {!list ? (
            <li className="py-2 text-[0.8125rem] text-mut">Yükleniyor…</li>
          ) : !list.length ? (
            <li className="py-2 text-[0.8125rem] text-mut">Henüz dosya yüklenmedi.</li>
          ) : (
            list.map((f) => (
              <li key={f.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[0.875rem] font-medium">{f.name}</b>
                  <small className="text-[0.75rem] text-mut">{day(f.from)} – {day(f.to)} · {f.total ? `${f.total} hareket` : `${f.count} gelen para`}</small>
                </span>
                <button type="button" onClick={() => del(f)} aria-label="Sil" className="grid size-8 place-items-center rounded-full text-mut active:scale-95">
                  <Icon name="trash" className="size-4" />
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// Ödemeler: ayın bankadan gelen (sporcuyla eşleşen) ve nakit ödemeleri; tarih, tutar, sporcu, açıklama. Excel'e aktarılır.
const PAY_STATE = { ok: ["Onaylı", "text-ok"], guess: ["Öneri", "text-amber-700"], cash: ["Nakit", "text-acc"] };
function Payments({ list, ym, error }) {
  const toast = useToast();
  if (error) return <p className={`mt-3 px-4 py-3 text-[0.875rem] text-rec ${card}`}>Mailler okunamadı. Gmail bağlantısı kurulu mu?</p>;
  if (!list) return <p className={`mt-3 px-4 py-3 text-[0.875rem] text-mut ${card}`}>Hesap özetleri okunuyor…</p>;
  if (!list.length) return <p className={`mt-3 px-4 py-3 text-[0.875rem] text-mut ${card}`}>Bu ay sporculardan gelen ödeme yok.</p>;
  const total = list.reduce((s, p) => s + p.amount, 0);
  async function excel() {
    try {
      const XLSX = await import("xlsx");
      const rows = [["Tarih", "Tutar (TL)", "Sporcu", "Durum", "Açıklama"], ...list.map((p) => [p.date, p.amount, p.names.join(", "), PAY_STATE[p.state][0], p.desc])];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Ödemeler");
      XLSX.writeFile(wb, `aidat-odemeleri-${ym}.xlsx`);
    } catch {
      toast("Excel dosyası hazırlanamadı");
    }
  }
  return (
    <section className="mt-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-[0.8125rem] font-semibold text-mut">{list.length} ÖDEME · {TL(total)}</p>
        <button type="button" onClick={excel} className="text-[0.8125rem] font-semibold text-acc">Excel’e aktar</button>
      </div>
      <ul className={`mt-2 divide-y divide-line ${card}`}>
        {list.map((p) => (
          <li key={p.key} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-2">
              <b className="min-w-0 truncate text-[0.9375rem] font-semibold">{p.names.join(" + ")}</b>
              <b className="shrink-0 tabular-nums text-ok">+{TL(p.amount)}</b>
            </div>
            <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[0.75rem]">
              <span className="text-mut">{String(p.date).slice(0, 16)}</span>
              <span className={`font-semibold ${PAY_STATE[p.state][1]}`}>{PAY_STATE[p.state][0]}{p.state === "guess" ? ` · ${p.why}` : ""}</span>
            </div>
            {p.state !== "cash" && <p className="mt-1 break-words text-[0.8125rem] leading-snug text-mut">{p.desc}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-2 px-1 text-[0.75rem] text-mut">“Öneri” olanları Sporcular sekmesindeki Bankadan gelenler bölümünden onayla.</p>
    </section>
  );
}

