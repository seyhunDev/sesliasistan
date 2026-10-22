"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import { EXCEL_UPLOAD } from "@/features/bank/LedgerCard";
import { deleteStatement, loadDuesRange, loadMovementsRange, loadStatements, saveCfg, saveMonth, saveRoster, uploadStatement } from "@/features/dues/duesData";
import { allocate, athleteDues, dropGroup, gridOf, historyOf, incomeOf, lastMonths, movKey, payerOf, paymentsOf, pendingOf, splitAmount, words } from "@/lib/dues";
import { money } from "@/lib/bankSheet";
import { todayStr } from "@/lib/utils/format";
import { saveSum } from "@/lib/homeTiles";
import { rosterOf } from "@/lib/duesAuto";
import { dueDayOf, pastDue, unpaidOf } from "@/lib/duesRemind";
import { DuesRemind } from "@/features/dues/DuesRemind";
import { useData } from "@/features/data/DataProvider";
import { doc } from "firebase/firestore";
import { updateDoc } from "@/lib/firebase/write";
import { CALM } from "@/features/home/ui";
import { db } from "@/lib/firebase/clientApp";

// Aidatlar (ana hesap + sporcu yetkisi). Ay seçimi yok: sporcu sporcu son 12 ayın borcu.
// Gruplar: Borcu var (borca göre) · Borcu yok · Aidat sayılmayanlar. Satıra dokun: 12 aylık şerit, ödeme geçmişi (sil), "Ödeme ekle", sporcuya özel ayar.
// Ödeme (nakit, banka, geçmiş tarihli) en eski borçlu aydan başlayarak aylara dağıtılır (allocate); aylar elle de seçilir.
// Bankadan gelen ve sporcuya yazılmamış paralar "Eşleştir"de; onaylanınca da en eski borçlu aya yazılır.
// Aidat tutarı, hatırlatma ve ay ödemeleri (Excel) ayar düğmesinde; banka Excel'i yükleme kapalı (EXCEL_UPLOAD, LedgerCard.jsx).
export default function DuesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = profile?.role === "owner" && canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed) return null;
  return <Dues uid={profile.uid} duesAt={profile.duesAt} />;
}

const day = (s) => String(s || "").slice(0, 10);
const TL = (n) => `${money(n).replace(/,00$/, "")} ₺`;
const card = CALM;
const shortMonth = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "short" }).replace(".", "");
// "12.09.2026", "2026-09-12…" → "12 Eyl"
function dayShort(v) {
  const s = String(v || "");
  const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/) || s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s.slice(0, 10);
  const [y, mo, d] = m[1].length === 4 ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
  return new Date(`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }).replace(".", "");
}
const VIA = (v) => (v === "cash" ? "Nakit" : "Banka");
const monthsText = (list) => list.map(shortMonth).join(", ");

function Dues({ uid, duesAt }) {
  const toast = useToast();
  const { members } = useData();
  // Ana hesaba "Aidat: N sporcu ödemedi" bildirimi (son günün ertesi, plan-reminders.mjs): varsayılan açık, bir kez yazılır
  const [notifyAt, setNotifyAt] = useState(duesAt ?? "10:00");
  useEffect(() => {
    if (duesAt == null) updateDoc(doc(db, "users", uid), { duesAt: "10:00" }).catch(() => {});
  }, [duesAt, uid]);
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const thisMonth = todayStr().slice(0, 7);
  const [yms] = useState(() => lastMonths(thisMonth, 12));
  const [d, setD] = useState(null); // { cfg, months }
  const [mv, setMv] = useState(null); // { movements } | { error }
  const [tick, setTick] = useState(0);
  const [openId, setOpenId] = useState(""); // açılan satır
  const [payFor, setPayFor] = useState(null); // ödeme eklenen sporcu
  const [monthOpen, setMonthOpen] = useState(""); // ay ödemeleri
  const [matchOpen, setMatchOpen] = useState(false);
  const [warnOpen, setWarnOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [q, setQ] = useState("");
  const [find, setFind] = useState(false);

  // Mail gelince sunucu aidatı kendiliğinden yazabilir: uygulamaya dönünce yeniden okunur (eski kayıtla üstüne yazılmasın)
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
    const roster = rosterOf(data.athletes.filter(isActive), d.cfg);
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
          <span className="block font-semibold text-rec">{err.text}</span>
          <span className="text-mut">Tekrar denemek için dokun</span>
        </button>
      </Shell>
    );
  if (!data || !d) return <Shell><Loading label="Aidatlar yükleniyor" /></Shell>;

  const { cfg, months } = d;
  const active = (data.athletes || []).filter(isActive);
  const pending = mv && !mv.error ? pendingOf(mv.movements, months, active, cfg, yms) : [];
  const rows = active.map((a) => ({ a, info: athleteDues(a, cfg, months, yms), hist: historyOf(a, months, yms) }));
  const qw = words(q).join(" ");
  const found = rows.filter((r) => !qw || words(`${r.a.studentName} ${r.a.parentName}`).join(" ").includes(qw));
  const byName = (x, y) => String(x.a.studentName).localeCompare(String(y.a.studentName), "tr");
  const isBurs = (r) => !!cfg.burs?.[r.a.id];
  const isOff = (r) => isBurs(r) || ["free", "none"].includes(r.info.now.state);
  const oweRows = found.filter((r) => r.info.debt > 0).sort((x, y) => y.info.debt - x.info.debt || byName(x, y));
  const okRows = found.filter((r) => !(r.info.debt > 0) && !isOff(r)).sort(byName);
  const offRows = found.filter((r) => !(r.info.debt > 0) && isOff(r) && !isBurs(r)).sort(byName);
  const bursRows = found.filter((r) => !(r.info.debt > 0) && isBurs(r)).sort(byName);
  const debtAll = rows.reduce((s, r) => s + r.info.debt, 0);
  const owers = rows.filter((r) => r.info.debt > 0).length;
  const owed = unpaidOf(gridOf(active, months, cfg, [thisMonth]).rows.map((r) => r.cells[thisMonth]));
  const remind = cfg.fee > 0 && pastDue(todayStr(), cfg) && owed.length > 0;
  const fees = Object.entries(cfg.fees || {}).filter(([, v]) => v > 0);
  const sub = !cfg.fee ? "Aylık aidat girilmedi" : debtAll > 0 ? `Toplam borç ${TL(debtAll)} · ${owers} sporcu` : "Borç yok";

  // Birden çok ay kaydını tek seferde yazar
  async function writeMonths(next, msg) {
    setD((p) => ({ ...p, months: { ...p.months, ...next } }));
    try {
      await Promise.all(Object.entries(next).map(([ym, m]) => saveMonth(uid, ym, m)));
      if (msg) toast(msg);
    } catch {
      toast("Kaydedilemedi");
    }
  }
  const writeMonth = (ym, next, msg) => writeMonths({ [ym]: next }, msg);
  async function writeCfg(next) {
    setD((p) => ({ ...p, cfg: next }));
    await saveCfg(uid, next).catch(() => toast("Ayar kaydedilemedi"));
  }
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
  // Elle ödeme: parçaları aylara yazar; aynı ödeme grp ile tek satır görünür
  function addPayment(a, { parts, via, date }) {
    const grp = `g${Date.now().toString(36)}`;
    const at = new Date().toISOString();
    const next = {};
    for (const { ym, amt } of parts) {
      const m = next[ym] || months[ym] || {};
      next[ym] = { ...m, paid: { ...(m.paid || {}), [a.id]: [...(m.paid?.[a.id] || []), { amt, via, date, by: "aidat", at, grp }] } };
    }
    const total = parts.reduce((s, p) => s + p.amt, 0);
    writeMonths(next, `${a.studentName}: ${TL(total)} yazıldı (${monthsText(parts.map((p) => p.ym))})`);
  }
  // Banka onayı: ödeme sporcu(lar)a, en eski borçlu aydan başlayarak yazılır; gönderen adı öğrenilir. list: [{ ym, m, picks }]
  async function takeBank(list) {
    const payers = { ...(cfg.payers || {}) };
    let learned = false;
    const cur = { ...months };
    const next = {};
    const put = (ym, doc) => ((cur[ym] = doc), (next[ym] = doc));
    for (const { ym, m, picks } of list) {
      const k = movKey(m);
      const at = new Date().toISOString();
      let landed = false;
      for (const [a, amt] of splitAmount(m.amount, picks, cfg)) {
        for (const part of allocate(amt, a, cfg, cur, yms, null, ym)) {
          const mo = cur[part.ym] || {};
          put(part.ym, { ...mo, paid: { ...(mo.paid || {}), [a.id]: [...(mo.paid?.[a.id] || []), { amt: part.amt, via: "eft", date: m.date, mov: k, desc: String(m.desc).slice(0, 120), at }] } });
          if (part.ym === ym) landed = true;
        }
      }
      if (!landed) {
        const mo = cur[ym] || {};
        put(ym, { ...mo, used: [...new Set([...(mo.used || []), k])] });
      }
      learned = learn(payers, m, picks) || learned;
    }
    if (learned) writeCfg({ ...cfg, payers });
    await writeMonths(next);
    toast(list.length === 1 ? `${list[0].picks.map((a) => a.studentName).join(", ")}: ${TL(list[0].m.amount)} yazıldı` : `${list.length} ödeme yazıldı`);
  }
  // Burslu: hiçbir ay borç sayılmaz, ödeyen/ödemeyen sayısına girmez (aidatı 0 yazmak da burslu yapar)
  const setBurs = (a, yes) => {
    const burs = { ...(cfg.burs || {}) };
    if (yes) burs[a.id] = true;
    else delete burs[a.id];
    writeCfg({ ...cfg, burs, fees: yes ? { ...(cfg.fees || {}), [a.id]: null } : cfg.fees });
    toast(yes ? `${a.studentName} burslu` : `${a.studentName} artık burslu değil`);
  };
  const ignore = (ym, m) => writeMonth(ym, { ...(months[ym] || {}), ignored: [...(months[ym]?.ignored || []), movKey(m)] }, "Aidat değil olarak işaretlendi");

  const right = (info, burs) => {
    if (info.debt > 0) return [`${info.dueMonths.length} ay · ${TL(info.debt)}`, "text-rec"];
    if (burs) return ["Burslu", "text-mut"];
    if (info.now.state === "none") return ["Başlamadı", "text-mut"];
    if (info.now.state === "free") return ["Sayılmıyor", "text-mut"];
    return [cfg.fee || info.fee ? "Borcu yok" : "", "text-ok"];
  };
  const row = (r) => {
    const on = openId === r.a.id;
    const last = r.hist[0];
    const [txt, tone] = right(r.info, isBurs(r));
    return (
      <li key={r.a.id}>
        <button type="button" onClick={() => setOpenId(on ? "" : r.a.id)} data-press="row" className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[0.9375rem] font-medium">{r.a.studentName}</span>
            <span className="block truncate text-[0.8125rem] text-mut">{last ? `Son ödeme ${dayShort(last.date)} · ${VIA(last.via)} · ${TL(last.amt)}` : "Ödeme yok"}</span>
          </span>
          <span className={`shrink-0 text-right text-[0.8125rem] font-semibold tabular-nums ${tone}`}>{txt}</span>
        </button>
        {on && (
          <AthleteView
            key={r.a.id}
            a={r.a}
            info={r.info}
            hist={r.hist}
            cfg={cfg}
            yms={yms}
            onPay={() => setPayFor(r.a)}
            onDrop={(g) => writeMonths(dropGroup(r.a, months, g), "Ödeme silindi")}
            onStart={(ym) => (writeCfg({ ...cfg, start: { ...(cfg.start || {}), [r.a.id]: ym } }), toast(`${r.a.studentName}: aidat ${monthLabel(ym)} ayından başlıyor`))}
            onFree={(ym, yes) => {
              const free = { ...(months[ym]?.free || {}) };
              if (yes) free[r.a.id] = true;
              else delete free[r.a.id];
              writeMonth(ym, { ...(months[ym] || {}), free }, yes ? `${monthLabel(ym)} sayılmayacak` : `${monthLabel(ym)} yeniden sayılıyor`);
            }}
            onFee={(v) => (v === 0 ? setBurs(r.a, true) : (writeCfg({ ...cfg, burs: { ...(cfg.burs || {}), [r.a.id]: null }, fees: { ...(cfg.fees || {}), [r.a.id]: v || null } }), toast("Aidat tutarı kaydedildi")))}
            onBurs={(yes) => setBurs(r.a, yes)}
          />
        )}
      </li>
    );
  };
  const group = (title, list) =>
    list.length > 0 && (
      <section className="mt-4">
        <h2 className="px-1 pb-1.5 text-[0.8125rem] font-semibold text-mut">
          {title} · {list.length}
        </h2>
        <ul className={`divide-y divide-line overflow-hidden ${card}`}>{list.map(row)}</ul>
      </section>
    );
  const alert = (text, onClick) => (
    <button type="button" onClick={onClick} data-press="row" className="mt-1 flex w-full items-center justify-between px-1 py-1.5 text-left text-[0.875rem] font-semibold text-amber-700 dark:text-amber-400">
      <span className="truncate">{text}</span> <span>›</span>
    </button>
  );

  return (
    <Shell sub={sub} onSettings={() => setSetOpen(true)} find={find} onFind={() => (setFind((v) => !v), setQ(""))}>
      {!cfg.fee && alert("Aylık aidat tutarını gir", () => setSetOpen(true))}
      {pending.length > 0 && alert(`${pending.length} banka ödemesi eşleşmeyi bekliyor`, () => setMatchOpen(true))}
      {remind && alert(`Bu ay ${owed.length} sporcu ödemedi · velilere hatırlat`, () => setWarnOpen(true))}
      {mv?.error && <p className="mt-2 px-1 text-[0.8125rem] text-rec">Banka mailleri okunamadı. Gmail bağlantısı kurulu mu?</p>}
      {find && (
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sporcu ya da veli" className="mt-2 h-10 w-full rounded-full border border-line bg-card px-4 text-[0.9375rem] outline-none" />
      )}

      {cfg.fee > 0 && !find && <Income inc={incomeOf(active, months, cfg, yms)} />}
      {group("Borcu var", oweRows)}
      {group("Borcu yok", okRows)}
      {group("Burslu", bursRows)}
      {group("Aidat sayılmayanlar", offRows)}
      {!found.length && <p className="mt-6 text-center text-[0.875rem] text-mut">Sporcu bulunamadı.</p>}

      {/* Ödeme ekle */}
      <Sheet open={!!payFor} onClose={() => setPayFor(null)} title={payFor ? `${payFor.studentName} · ödeme ekle` : ""}>
        {payFor && (
          <div className="overflow-y-auto px-5 pb-2">
            <PayForm key={payFor.id} a={payFor} cfg={cfg} months={months} yms={yms} onSave={(x) => (addPayment(payFor, x), setPayFor(null))} />
          </div>
        )}
      </Sheet>

      {/* Hatırlatma */}
      <Sheet open={warnOpen} onClose={() => setWarnOpen(false)} title="Velilere hatırlat">
        <div className="overflow-y-auto px-5 pb-2">
          {cfg.fee > 0 ? (
            <DuesRemind
              list={owed}
              ym={thisMonth}
              dueDay={dueDayOf(cfg)}
              members={members || []}
              reminded={months[thisMonth]?.reminded}
              onMark={(ids) => {
                const at = new Date().toISOString();
                const m = months[thisMonth] || {};
                writeMonth(thisMonth, { ...m, reminded: { ...(m.reminded || {}), ...Object.fromEntries(ids.map((id) => [id, at])) } });
              }}
            />
          ) : (
            <p className="py-2 text-[0.875rem] text-mut">Önce aylık aidat tutarını gir.</p>
          )}
        </div>
      </Sheet>

      {/* Ay ödemeleri + Excel */}
      <Sheet open={!!monthOpen} onClose={() => setMonthOpen("")} title={monthOpen ? `${monthLabel(monthOpen)} ödemeleri` : ""}>
        {monthOpen && (
          <div className="overflow-y-auto px-5 pb-2">
            <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-2">
              {[...yms].reverse().map((ym) => (
                <button key={ym} type="button" onClick={() => setMonthOpen(ym)} className={`h-9 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-semibold capitalize ${monthOpen === ym ? "bg-acc text-white" : "border border-line bg-card"}`}>
                  {shortMonth(ym)}
                </button>
              ))}
            </div>
            <Payments list={mv && !mv.error ? paymentsOf(mv.movements, months[monthOpen] || {}, active, cfg, monthOpen, months) : null} ym={monthOpen} error={mv?.error} />
          </div>
        )}
      </Sheet>

      {/* Eşleştir */}
      <Sheet open={matchOpen} onClose={() => setMatchOpen(false)} title="Banka ödemelerini eşleştir">
        <div className="overflow-y-auto px-5 pb-2">
          <MatchList pending={pending} athletes={active} onConfirm={takeBank} onIgnore={ignore} />
        </div>
      </Sheet>

      {/* Ayarlar */}
      <Sheet open={setOpen} onClose={() => setSetOpen(false)} title="Aidat ayarları">
        <div className="overflow-y-auto px-5 pb-2">
          <Settings
            cfg={cfg}
            athletes={active}
            fees={fees}
            notifyAt={notifyAt}
            pending={pending.length}
            onFee={(fee) => (writeCfg({ ...cfg, fee }), toast("Aidat tutarı kaydedildi"))}
            onDropFee={(id) => writeCfg({ ...cfg, fees: { ...(cfg.fees || {}), [id]: null } })}
            onDay={(dueDay) => (writeCfg({ ...cfg, dueDay }), toast(`Son ödeme günü ayın ${dueDay}. günü`))}
            onNotify={(v) => {
              setNotifyAt(v);
              updateDoc(doc(db, "users", uid), { duesAt: v }).catch(() => (setNotifyAt(notifyAt), toast("Kaydedilemedi")));
            }}
            onMatch={() => (setSetOpen(false), setMatchOpen(true))}
            onRemind={() => (setSetOpen(false), setWarnOpen(true))}
            onMonth={() => (setSetOpen(false), setMonthOpen(thisMonth))}
          />
          {EXCEL_UPLOAD && <BankFiles uid={uid} onChange={() => setTick((t) => t + 1)} />}
        </div>
      </Sheet>
    </Shell>
  );
}

// Gelir: bu ay beklenen / alınan / kalan; son 12 ayda alınan (dokununca ay ay)
function Income({ inc }) {
  const [open, setOpen] = useState(false);
  const { now } = inc;
  const p = now.expected > 0 ? Math.min(1, now.paid / now.expected) : 0;
  const line = "flex items-center justify-between gap-3";
  return (
    <section className="mt-4">
      <h2 className="px-1 pb-1.5 text-[0.8125rem] font-semibold text-mut">Gelir</h2>
      <div className={`px-4 py-3 text-[0.9375rem] ${card}`}>
        <p className={line}>
          <span className="capitalize">{shortMonth(now.ym)} beklenen</span>
          <b className="font-semibold tabular-nums">{TL(now.expected)}</b>
        </p>
        <p className={`${line} mt-1.5`}>
          <span>Alınan</span>
          <b className="font-semibold tabular-nums text-ok">{TL(now.paid)}</b>
        </p>
        <span className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-line">
          <span className="block h-full rounded-full bg-ok" style={{ width: `${Math.round(p * 100)}%` }} />
        </span>
        <p className={`${line} mt-1.5 text-[0.8125rem] text-mut`}>
          <span>%{Math.round(p * 100)}</span>
          <span>Kalan {TL(Math.max(0, now.expected - now.paid))}</span>
        </p>
        <button type="button" onClick={() => setOpen((x) => !x)} data-press="row" className={`${line} mt-3 w-full border-t border-line pt-2.5 text-left`}>
          <span>Son 12 ayda alınan</span>
          <span className="flex items-center gap-1.5">
            <b className="font-semibold tabular-nums">{TL(inc.total)}</b>
            <span className="text-mut">{open ? "‹" : "›"}</span>
          </span>
        </button>
        {open && (
          <ul className="mt-1.5 divide-y divide-line text-[0.875rem]">
            {inc.list.map((x) => (
              <li key={x.ym} className={`${line} py-1.5`}>
                <span className="capitalize text-fg2">{monthLabel(x.ym)}</span>
                <span className="tabular-nums">
                  <span className="text-mut">{TL(x.expected)} / </span>
                  <b className="font-semibold">{TL(x.paid)}</b>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const CELL = { paid: "bg-ok text-white", part: "bg-amber-500 text-white", due: "border border-rec/60 text-rec", free: "bg-line text-mut", burs: "bg-line text-mut", none: "bg-line/60 text-mut" };
const MARK = { paid: "✓", part: "½", due: "", free: "–", burs: "–", none: "–" };

// Açılan satır: 12 aylık şerit, ödemeler, Ödeme ekle, sporcuya özel ayar
function AthleteView({ a, info, hist, cfg, yms, onPay, onDrop, onStart, onFree, onFee, onBurs }) {
  const now = yms.at(-1);
  const [sel, setSel] = useState(now);
  const [more, setMore] = useState(false);
  const [own, setOwn] = useState(cfg.fees?.[a.id] ? String(cfg.fees[a.id]) : "");
  const c = info.cells.find((x) => x.ym === sel) || info.now;
  const status = { paid: "Ödendi", part: `${TL(c.paid)} ödendi · ${TL(c.rest)} eksik`, due: info.fee ? `Ödenmedi · ${TL(c.rest)}` : "Ödenmedi", free: "Bu ay sayılmıyor", burs: "Burslu, aidat ödemiyor", none: "Aidat henüz başlamadı" }[c.state];
  const btn = "min-h-10 rounded-xl border border-line px-3 py-2 text-[0.8125rem] font-semibold disabled:opacity-50";
  return (
    <div className="border-t border-line px-4 pb-3 pt-3 text-[0.875rem]">
      <div className="grid grid-cols-12 gap-1">
        {info.cells.map((x) => (
          <button key={x.ym} type="button" onClick={() => setSel(x.ym)} aria-label={monthLabel(x.ym)} className="flex flex-col items-center gap-0.5">
            <span className={`grid aspect-square w-full place-items-center rounded-md text-[0.6875rem] font-semibold ${CELL[x.state]} ${x.ym === sel ? "ring-2 ring-acc ring-offset-1 ring-offset-card" : ""}`}>{MARK[x.state]}</span>
            <span className="text-[0.625rem] capitalize text-mut">{shortMonth(x.ym).slice(0, 3)}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-fg2">
        <span className="capitalize">{monthLabel(sel)}</span>: {status}
      </p>

      {hist.length > 0 ? (
        <ul className="mt-2 divide-y divide-line">
          {hist.map((g) => (
            <li key={g.key} className="flex items-start gap-2 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="text-fg2">
                  {dayShort(g.date)} · {VIA(g.via)}
                  {g.by === "auto" ? " · otomatik" : ""} · <span className="capitalize">{monthsText(g.months)}</span>
                </span>
                {g.desc && <small className="mt-0.5 block break-words text-[0.75rem] leading-snug text-mut">{g.desc}</small>}
              </span>
              <span className="font-semibold tabular-nums">{TL(g.amt)}</span>
              <button type="button" onClick={() => window.confirm(`${TL(g.amt)} ödeme silinsin mi?`) && onDrop(g)} aria-label="Sil" data-press className="btn btn-icon btn-sm size-7 shrink-0 text-mut">
                <Icon name="trash" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-mut">Son 12 ayda ödeme yok.</p>
      )}

      <button type="button" onClick={onPay} data-press className="btn btn-primary btn-sm mt-2 w-full">
        Ödeme ekle
      </button>

      <button type="button" onClick={() => setMore((x) => !x)} data-press="row" className="mt-2 flex w-full items-center justify-between py-1 text-left text-[0.8125rem] font-semibold text-mut">
        Ayarlar <span>{more ? "‹" : "›"}</span>
      </button>
      {more && (
        <div className="mt-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="min-w-0 flex-1 text-fg2">Bu sporcunun aidatı</span>
            <input inputMode="decimal" value={own} onChange={(e) => setOwn(e.target.value)} placeholder={String(cfg.fee || "")} className="h-10 w-24 rounded-xl bg-bg px-3 text-right outline-none" />
            <button type="button" onClick={() => onFee(String(own).trim() === "" ? null : Number(String(own).replace(",", ".")) || 0)} data-press className="btn btn-secondary btn-sm">
              Kaydet
            </button>
          </div>
          <button type="button" onClick={() => onBurs(!cfg.burs?.[a.id])} className={`${btn} w-full`}>
            {cfg.burs?.[a.id] ? "Burslu değil" : "Burslu yap"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onFree(sel, c.state !== "free")} disabled={c.state === "none" || c.state === "burs"} className={`${btn} capitalize`}>
              {shortMonth(sel)} {c.state === "free" ? "sayılsın" : "sayılmasın"}
            </button>
            <button type="button" onClick={() => onStart(sel)} disabled={info.start === sel} className={btn}>
              {info.start === sel ? "Aidat bu ay başlıyor" : <>Aidatı <span className="capitalize">{shortMonth(sel)}</span> ayından başlat</>}
            </button>
          </div>
          <Link href={`/athletes/${a.id}`} className="block py-1 text-[0.8125rem] font-semibold text-acc">
            Sporcu sayfası ›
          </Link>
        </div>
      )}
    </div>
  );
}

// Ödeme ekle: tutar, tarih (geçmiş olabilir), Nakit/Banka, hangi aylar (kendiliğinden en eski borçtan; elle değişir)
function PayForm({ a, cfg, months, yms, onSave }) {
  const info = athleteDues(a, cfg, months, yms);
  const [amt, setAmt] = useState(String(info.debt || info.fee || ""));
  const [date, setDate] = useState(todayStr());
  const [via, setVia] = useState("cash");
  const [picked, setPicked] = useState(null);
  const n = Number(String(amt).replace(",", ".")) || 0;
  const dateYm = day(date).slice(0, 7);
  const parts = n > 0 ? allocate(n, a, cfg, months, yms, picked, yms.includes(dateYm) ? dateYm : yms.at(-1)) : [];
  const on = new Set(picked ?? parts.map((p) => p.ym));
  const toggle = (ym) => {
    const next = new Set(on);
    if (next.has(ym)) next.delete(ym);
    else next.add(ym);
    setPicked(next.size ? [...next].sort() : null);
  };
  const seg = (v, label) => (
    <button type="button" onClick={() => setVia(v)} className={`h-10 flex-1 rounded-xl text-[0.875rem] font-semibold ${via === v ? "bg-acc text-white" : "border border-line"}`}>
      {label}
    </button>
  );
  return (
    <div className="space-y-3 text-[0.9375rem]">
      <label className="flex items-center gap-3">
        <span className="w-16 text-mut">Tutar</span>
        <input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl bg-bg px-3 outline-none" />
        <span className="text-mut">₺</span>
      </label>
      <label className="flex items-center gap-3">
        <span className="w-16 text-mut">Tarih</span>
        <input type="date" value={date} min={`${yms[0]}-01`} max={todayStr()} onChange={(e) => setDate(e.target.value || todayStr())} className="h-10 min-w-0 flex-1 appearance-none rounded-xl bg-bg px-3 outline-none" />
      </label>
      <div className="flex gap-2">
        {seg("cash", "Nakit")}
        {seg("eft", "Banka")}
      </div>
      <div>
        <p className="mb-1.5 text-[0.8125rem] font-semibold text-mut">Hangi aylar</p>
        <div className="grid grid-cols-6 gap-1.5">
          {yms.map((ym) => (
            <button key={ym} type="button" onClick={() => toggle(ym)} className={`h-9 rounded-lg text-[0.8125rem] font-semibold capitalize ${on.has(ym) ? "bg-acc text-white" : "border border-line"}`}>
              {shortMonth(ym).slice(0, 3)}
            </button>
          ))}
        </div>
        {parts.length > 0 && (
          <p className="mt-2 text-[0.8125rem] text-fg2">
            {parts.map((p) => (
              <span key={p.ym} className="mr-2 inline-block">
                <span className="capitalize">{shortMonth(p.ym)}</span> {TL(p.amt)}
              </span>
            ))}
          </p>
        )}
      </div>
      <button type="button" disabled={!(n > 0)} onClick={() => onSave({ parts, via, date: day(date) })} data-press className="btn btn-primary w-full">
        Kaydet
      </button>
    </div>
  );
}

function Shell({ children, sub, onSettings, onFind, find }) {
  return (
    <main className="calm mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <PageHeader title="Aidatlar" sub={sub} back="/">
        <span className="flex items-center gap-2">
          {onFind && (
            <button type="button" onClick={onFind} aria-label="Ara" data-press className="btn btn-round size-10">
              <Icon name={find ? "x" : "search"} className="size-5" />
            </button>
          )}
          {onSettings && (
            <button type="button" onClick={onSettings} aria-label="Aidat ayarları" data-press className="btn btn-round size-10">
              <Icon name="sliders" className="size-5" />
            </button>
          )}
        </span>
      </PageHeader>
      {children}
    </main>
  );
}

// Ayarlar: Tutar, Hatırlatma, Banka
function Settings({ cfg, athletes, fees, notifyAt, pending, onFee, onDropFee, onDay, onNotify, onMatch, onRemind, onMonth }) {
  const [v, setV] = useState(cfg.fee ? String(cfg.fee) : "");
  const [showFees, setShowFees] = useState(false);
  const save = () => {
    const n = Number(String(v).replace(",", "."));
    if (n > 0 && n !== cfg.fee) onFee(n);
  };
  const head = (t) => <h3 className="mb-1.5 mt-4 px-1 text-[0.8125rem] font-semibold text-mut first:mt-0">{t}</h3>;
  const line = "flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-[0.9375rem]";
  const name = (id) => athletes.find((a) => a.id === id)?.studentName || "Sporcu";
  return (
    <div>
      {head("Tutar")}
      <div className={`divide-y divide-line ${card}`}>
        <label className={line}>
          <span className="min-w-0 flex-1">Aylık aidat</span>
          <input inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} onBlur={save} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} placeholder="1500" className="h-9 w-24 rounded-xl bg-bg px-3 text-right outline-none" />
          <span className="text-mut">₺</span>
        </label>
        <button type="button" onClick={() => setShowFees((x) => !x)} className={line}>
          <span className="min-w-0 flex-1">Özel tutarlar</span>
          <span className="text-mut">{fees.length ? `${fees.length} sporcu` : "Yok"} ›</span>
        </button>
        {showFees &&
          (fees.length ? (
            fees.map(([id, fee]) => (
              <div key={id} className="flex items-center gap-3 px-4 py-2 text-[0.875rem]">
                <span className="min-w-0 flex-1 truncate">{name(id)}</span>
                <span className="tabular-nums">{TL(fee)}</span>
                <button type="button" onClick={() => onDropFee(id)} aria-label="Kaldır" data-press className="btn btn-icon btn-sm size-8 text-mut">
                  <Icon name="x" className="size-4" />
                </button>
              </div>
            ))
          ) : (
            <p className="px-4 py-2 text-[0.8125rem] text-mut">Sporcunun satırından girilir.</p>
          ))}
      </div>

      {head("Hatırlatma")}
      <div className={`divide-y divide-line ${card}`}>
        <label className={line}>
          <span className="min-w-0 flex-1">Son ödeme günü</span>
          <select value={dueDayOf(cfg)} onChange={(e) => onDay(Number(e.target.value))} className="h-9 rounded-xl bg-bg px-3 outline-none">
            {Array.from({ length: 28 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className={line}>
          <span className="min-w-0 flex-1">Ertesi sabah bana bildir</span>
          <button type="button" role="switch" aria-checked={!!notifyAt} onClick={() => onNotify(notifyAt ? "" : "10:00")} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${notifyAt ? "bg-acc" : "bg-line"}`}>
            <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] ${notifyAt ? "left-[1.375rem]" : "left-0.5"}`} />
          </button>
        </div>
      </div>

      {head("Banka")}
      <div className={`divide-y divide-line ${card}`}>
        <button type="button" onClick={onMatch} className={line}>
          <span className="min-w-0 flex-1">Eşleşmeyi bekleyen</span>
          <span className="text-mut">{pending} ›</span>
        </button>
        <button type="button" onClick={onRemind} className={line}>
          <span className="min-w-0 flex-1">Velilere hatırlat</span>
          <span className="text-mut">›</span>
        </button>
        <button type="button" onClick={onMonth} className={line}>
          <span className="min-w-0 flex-1">Ay ödemeleri · Excel</span>
          <span className="text-mut">›</span>
        </button>
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
        <button type="button" onClick={() => onConfirm(sure.map(({ ym, m, r }) => ({ ym, m, picks: r.picks })))} data-press className="btn btn-primary mb-3 w-full">
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
                        <button type="button" onClick={() => (setPick(""), onConfirm([{ ym, m, picks: [a] }]))} data-press="row" className="flex w-full items-baseline justify-between gap-2 py-2 text-left">
                          <span className="text-[0.9375rem]">{a.studentName}</span>
                          <small className="truncate text-[0.75rem] text-mut">{a.parentName}</small>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" onClick={() => setPick("")} data-press className="btn btn-text btn-sm mt-1 text-mut">Vazgeç</button>
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
                      <button type="button" onClick={() => onConfirm([{ ym, m, picks: r.picks }])} data-press className="btn btn-primary btn-sm">Onayla</button>
                    )}
                    <button type="button" onClick={() => (setPick(k), setQ(""))} data-press className="btn btn-secondary btn-sm">
                      {r.picks.length ? "Başka sporcu" : "Sporcu seç"}
                    </button>
                    <button type="button" onClick={() => onIgnore(ym, m)} data-press className="btn btn-text btn-sm text-mut">Aidat değil</button>
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
        <button type="button" disabled={busy} onClick={() => input.current?.click()} data-press className="btn btn-primary btn-sm shrink-0">
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
                <button type="button" onClick={() => del(f)} aria-label="Sil" data-press className="btn btn-icon btn-sm size-8 text-mut">
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
        <button type="button" onClick={excel} data-press className="btn btn-text btn-sm text-acc">Excel’e aktar</button>
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

