"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { arrayRemove, doc, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { loadMovementsRange } from "@/features/dues/duesData";
import { ledgerStart, rebuildLedger } from "@/features/bank/ledgerData";
import { db } from "@/lib/firebase/clientApp";
import { money } from "@/lib/bankSheet";
import { monthName, nameMoves, payeeCsv, payeeMoves, payeeOf, payeeSummary, whoIn } from "@/lib/payee";

const card = "overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";
const thisMonth = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date()).slice(0, 7);
const dayText = (m) => new Date((m.ts || 0) + 3 * 3600e3).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short", timeZone: "UTC" });
const hmOf = (m) => /\d{1,2}:\d{2}/.exec(m.date)?.[0] || "";

// Kişisel hesap (yalnız ana hesap): banka defterinde (günlük mailler + yüklenen Excel) belli bir kişinin aldığı ödemeler,
// ayrı bir hesap gibi: kulüp hesabından ona giden paralar (maaş, huzur hakkı…) ve seçiliyse kendi hesabına gelenler (payee.js).
// Ad ve hesap ayarı users/{uid}.payee; okuma sayfa açılınca bir kez, defterin başından bu aya.
// ?ad=… : Hesaplar'da eklenen başka bir ad (users/{uid}.payeeNames); o adla ilgili gelen ve giden bütün hareketler.
export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <Payments />
    </Suspense>
  );
}

function Payments() {
  const named = (useSearchParams().get("ad") || "").trim();
  const { profile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const owner = profile?.role === "owner";
  const [data, setData] = useState(null); // { movements, sources } | { error }
  const [edit, setEdit] = useState(false);
  const [open, setOpen] = useState(""); // açık ay (boşsa en yeni)
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0); // Yenile'den sonra yeniden okunur
  const ym = thisMonth();

  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  useEffect(() => {
    if (!owner) return;
    let live = true;
    ledgerStart(profile.uid, ym)
      .then((first) => loadMovementsRange(profile.uid, first, ym))
      .then((r) => live && setData(r))
      .catch(() => live && setData({ error: true, movements: [] }));
    return () => {
      live = false;
    };
  }, [owner, profile?.uid, ym, tick]);

  const payee = payeeOf(profile);
  const movements = data?.movements;
  const accounts = useMemo(() => {
    const map = new Map();
    for (const m of movements || []) if (m.account && m.amount > 0 && !map.has(m.account)) map.set(m.account, m.accountLabel || m.account);
    return [...map].map(([key, label]) => ({ key, label }));
  }, [movements]);
  const list = useMemo(() => (named ? nameMoves(movements || [], named) : payeeMoves(movements || [], payee)), [movements, named, payee.name, payee.account]); // eslint-disable-line react-hooks/exhaustive-deps
  const sum = payeeSummary(list, ym);
  if (!owner) return null;

  const save = (next) =>
    updateDoc(doc(db, "users", profile.uid), { payee: next })
      .then(() => (setEdit(false), toast("Kaydedildi")))
      .catch(() => toast("Kaydedilemedi"));
  // Yenile: banka defteri bütün maillerden yeniden kurulur (yeni okunan bilgiler, ör. gönderen adı, eklenir)
  const refresh = async () => {
    setBusy(true);
    try {
      await rebuildLedger(profile.uid);
      setData(null);
      setTick((n) => n + 1);
      toast("Banka hareketleri yenilendi");
    } catch {
      toast("Yenilenemedi, internet bağlantını kontrol et");
    }
    setBusy(false);
  };
  // Eklenen adı kaldır (hareketler silinmez, yalnız Hesaplar'daki satır gider)
  const drop = () =>
    updateDoc(doc(db, "users", profile.uid), { payeeNames: arrayRemove(...(profile.payeeNames || []).filter((n) => n.trim() === named)) })
      .then(() => (toast("İsim kaldırıldı"), router.replace("/mail")))
      .catch(() => toast("Kaldırılamadı"));
  const shown = open || sum.byMonth[0]?.ym || "";
  const title = named || payee.name || "Kişisel hesap";

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title={title} sub={named ? "Bu adla gelen ve giden ödemeler" : "Aldığı ödemeler · banka hesaplarından"} back="/mail">
        <button type="button" disabled={busy} onClick={refresh} aria-label="Yenile" className="grid size-10 place-items-center rounded-full bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-95 disabled:opacity-50">
          <Icon name="repeat" className={`size-5 ${busy ? "animate-spin" : ""}`} />
        </button>
        {named ? (
          <button type="button" onClick={() => setEdit((v) => !v)} aria-label="İsmi kaldır" className="grid size-10 place-items-center rounded-full bg-card text-rec shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-95">
            <Icon name="trash" className="size-5" />
          </button>
        ) : (
          <button type="button" onClick={() => setEdit((v) => !v)} aria-label="Hesap ayarı" className="grid size-10 place-items-center rounded-full bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-95">
            <Icon name="edit" className="size-5" />
          </button>
        )}
      </PageHeader>

      {edit &&
        (named ? (
          <section className={`${card} fade-in mt-2 space-y-3 px-4 py-4`}>
            <p className="text-[0.875rem] leading-snug">“{named}” Hesaplar sayfasından kaldırılsın mı? Banka hareketleri silinmez.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEdit(false)} className="h-11 flex-1 rounded-xl bg-bg text-[0.875rem] font-semibold">
                Vazgeç
              </button>
              <button type="button" onClick={drop} className="h-11 flex-1 rounded-xl bg-rec text-[0.875rem] font-semibold text-white">
                Kaldır
              </button>
            </div>
          </section>
        ) : (
          <Settings payee={payee} accounts={accounts} onSave={save} onClose={() => setEdit(false)} />
        ))}

      {!data ? (
        <Loading />
      ) : (
        <>
          <section className={`${card} mt-2`}>
            {named ? (
              <div className="grid grid-cols-2 bg-acc px-4 py-4 text-white">
                <div className="min-w-0">
                  <p className="text-[0.75rem] font-semibold tracking-[.06em] text-white/75">GELEN</p>
                  <p className="mt-0.5 truncate text-[1.5rem] font-bold leading-tight tabular-nums tracking-tight">{money(sum.in)}</p>
                  <p className="mt-0.5 text-[0.75rem] text-white/75">{list.filter((m) => m.amount > 0).length} ödeme · TL</p>
                </div>
                <div className="min-w-0 border-l border-white/20 pl-4">
                  <p className="text-[0.75rem] font-semibold tracking-[.06em] text-white/75">GİDEN</p>
                  <p className="mt-0.5 truncate text-[1.5rem] font-bold leading-tight tabular-nums tracking-tight">{money(sum.out)}</p>
                  <p className="mt-0.5 text-[0.75rem] text-white/75">{list.filter((m) => m.amount < 0).length} ödeme · TL</p>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-2 bg-acc px-4 py-4 text-white">
              <div className="min-w-0">
                <p className="text-[0.75rem] font-semibold tracking-[.06em] text-white/75">BU AY</p>
                <p className="mt-0.5 truncate text-[1.5rem] font-bold leading-tight tabular-nums tracking-tight">{money(sum.month.total)}</p>
                <p className="mt-0.5 text-[0.75rem] text-white/75">{sum.month.count} ödeme · TL</p>
              </div>
              <div className="min-w-0 border-l border-white/20 pl-4">
                <p className="text-[0.75rem] font-semibold tracking-[.06em] text-white/75">BUGÜNE KADAR</p>
                <p className="mt-0.5 truncate text-[1.5rem] font-bold leading-tight tabular-nums tracking-tight">{money(sum.total)}</p>
                <p className="mt-0.5 text-[0.75rem] text-white/75">{sum.count} ödeme · TL</p>
              </div>
            </div>
            )}
            <p className="px-4 py-2.5 text-[0.75rem] leading-snug text-mut">
              {named ? `Hesap adında ya da açıklamasında “${named}” geçen hareketler. Banka defterinde ${data.sources || 0} hareket var.` : <>{payee.name ? `Hesaplardan “${payee.name}” adına giden paralar (maaş, huzur hakkı…)` : "Seçili hesaba gelen bütün paralar"}
              {payee.account ? ` ve ${accounts.find((a) => a.key === payee.account)?.label || "seçili hesaba"} gelenler` : ""}. Banka defterinde {data.sources || 0} hareket var{data.fromFiles ? ` (${data.fromFiles}'i yüklenen Excel'den)` : ""}. Değiştirmek için sağ üstteki kaleme dokun.</>}
            </p>
          </section>

          {data.error ? (
            <p className={`${card} mt-4 px-4 py-6 text-center text-[0.875rem] text-mut`}>Banka hareketleri okunamadı. İnternet bağlantını kontrol edip sayfayı yeniden aç.</p>
          ) : !list.length ? (
            <p className={`${card} mt-4 px-4 py-6 text-center text-[0.875rem] leading-snug text-mut`}>
              {data.sources ? `Banka hareketlerinde ${named || payee.name ? `${named || payee.name} adına ` : ""}ödeme bulunamadı.` : "Henüz banka hesap özeti yok. Gmail bağlanınca İş Bankası mailleri buraya gelir."}
            </p>
          ) : (
            <section className="mt-5">
              <h2 className="px-1 pb-2 text-[0.8125rem] font-semibold text-mut">Aylar</h2>
              <div className={card}>
                <ul className="divide-y divide-line">
                  {sum.byMonth.map((mo) => (
                    <li key={mo.ym}>
                      <button type="button" onClick={() => setOpen(mo.ym === shown ? "-" : mo.ym)} aria-expanded={mo.ym === shown} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[0.9375rem] font-semibold first-letter:uppercase">{monthName(mo.ym)}</b>
                          <small className="block text-[0.75rem] text-mut">{mo.count} ödeme</small>
                        </span>
                        {named ? (
                          <span className="shrink-0 text-right text-[0.8125rem] font-semibold tabular-nums leading-tight">
                            {mo.in > 0 && <b className="block font-semibold text-ok">+{money(mo.in)}</b>}
                            {mo.out > 0 && <b className="block font-semibold">−{money(mo.out)}</b>}
                          </span>
                        ) : (
                          <b className="shrink-0 text-[0.9375rem] font-semibold tabular-nums text-ok">+{money(mo.total)} TL</b>
                        )}
                        <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${mo.ym === shown ? "rotate-90" : ""}`} />
                      </button>
                      {mo.ym === shown && (
                        <ul className="fade-in border-t border-line bg-bg/40">
                          {mo.list.map((m) => (
                            <li key={m.id || `${m.date}|${m.amount}|${m.desc}`} className="flex items-start gap-3 px-4 py-2.5">
                              <span className="w-[4.5rem] shrink-0 pt-0.5 text-[0.75rem] leading-tight text-mut">
                                {dayText(m)}
                                {hmOf(m) && <span className="block tabular-nums">{hmOf(m)}</span>}
                              </span>
                              <span className="min-w-0 flex-1 break-words text-[0.875rem] leading-snug">
                                <b className="block font-semibold">{m.note || (m.out ? "Hesaptan gönderildi" : whoIn(m) || m.desc)}</b>
                                <span className="block text-[0.8125rem] text-mut">{[m.out || m.amount < 0 ? "Giden" : "Gelen", m.accountLabel, m.out || named ? "" : whoIn(m)].filter(Boolean).join(" · ")}</span>
                              </span>
                              <b className={`shrink-0 text-[0.875rem] font-semibold tabular-nums ${m.amount < 0 ? "" : "text-ok"}`}>{m.amount < 0 ? `−${money(-m.amount)}` : `+${money(m.amount)}`}</b>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <button type="button" onClick={() => download(`${title}-odemeler.csv`, named ? payeeCsv(list, named, "gelen ve giden ödemeler") : payeeCsv(list, payee.name))} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-card text-[0.875rem] font-semibold text-acc shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-[.98]">
                <Icon name="download" className="size-4" /> Excel olarak indir
              </button>
            </section>
          )}
        </>
      )}
    </main>
  );
}

// Ad ve hesap ayarı: hesaplardan bu ada giden paralar; kendi hesabı seçiliyse ona gelenler de
function Settings({ payee, accounts, onSave, onClose }) {
  const [name, setName] = useState(payee.name);
  const [account, setAccount] = useState(payee.account);
  return (
    <section className={`${card} fade-in mt-2 space-y-3 px-4 py-4`}>
      <label className="block">
        <span className="text-[0.8125rem] font-semibold text-mut">Ad (bankada alıcı olarak yazılan)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad Soyad" className="mt-1 h-11 w-full rounded-xl bg-bg px-3.5 text-[1rem] outline-none" />
      </label>
      {accounts.length > 1 && (
        <div>
          <p className="text-[0.8125rem] font-semibold text-mut">Banka hesabı</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[{ key: "", label: "Hepsi" }, ...accounts].map((a) => (
              <button key={a.key} type="button" onClick={() => setAccount(a.key)} aria-pressed={account === a.key} className={`h-8 rounded-full px-3 text-[0.8125rem] font-semibold ${account === a.key ? "bg-fg text-card" : "bg-bg text-fg"}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="text-[0.75rem] leading-snug text-mut">Hesaplardan bu ada giden paralar sayılır. Kendi hesabını seçersen o hesaba gelenler de sayılır; ad boşsa yalnız seçili hesaba gelenler.</p>
      <div className="flex gap-2">
        <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl bg-bg text-[0.875rem] font-semibold">
          Vazgeç
        </button>
        <button type="button" onClick={() => onSave({ name: name.trim(), account })} className="h-11 flex-1 rounded-xl bg-acc text-[0.875rem] font-semibold text-white">
          Kaydet
        </button>
      </div>
    </section>
  );
}

const TR = { ç: "c", ğ: "g", ı: "i", İ: "I", ö: "o", ş: "s", ü: "u", Ç: "C", Ğ: "G", Ö: "O", Ş: "S", Ü: "U" };
function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name.replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => TR[c]).replace(/[^\w.-]+/g, "-") });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
