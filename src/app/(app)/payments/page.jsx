"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { arrayRemove, doc } from "firebase/firestore";
import { updateDoc } from "@/lib/firebase/write";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { Empty } from "@/components/ui/Page";
import { buttonClass } from "@/components/ui/buttonClass";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { convertToCash, loadCashMoves, loadConv, loadMovementsRange } from "@/features/dues/duesData";
import { ledgerStart, rebuildLedger } from "@/features/bank/ledgerData";
import { db } from "@/lib/firebase/clientApp";
import { money } from "@/lib/bankSheet";
import { canConv, withoutConv } from "@/lib/cashbook";
import { monthName, nameMoves, payeeCsv, payeeMoves, payeeOf, payeeSummary, whoIn } from "@/lib/payee";

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
  const [act, setAct] = useState(""); // dokunulan ödeme: "Nakite çevir" düğmesi açılır
  const [tick, setTick] = useState(0); // Yenile'den sonra yeniden okunur
  const ym = thisMonth();

  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  useEffect(() => {
    if (!owner) return;
    let live = true;
    // Eklenen ad sayfasında nakit aidatlar da (Aidatlar'da yazılan) gelir olarak
    // Nakite çevrilen banka hareketleri (Hesaplar › hareket › Nakite çevir) kişisel hesapta sayılmaz
    Promise.all([ledgerStart(profile.uid, ym).then((first) => loadMovementsRange(profile.uid, first, ym)), named ? loadCashMoves(profile.uid).catch(() => []) : [], loadConv(profile.uid)])
      .then(([r, cashList, conv]) => live && setData({ ...r, movements: [...withoutConv(r.movements, conv), ...cashList] }))
      .catch(() => live && setData({ error: true, movements: [] }));
    return () => {
      live = false;
    };
  }, [owner, profile?.uid, ym, tick, named]);

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
  // Bu para maaş/ödeme değil, nakite çevrildi: kulüp kasasına nakit giriş olur, bu listeden çıkar
  const toCash = (m) =>
    convertToCash(profile.uid, m)
      .then(() => (setAct(""), setData((d) => ({ ...d, movements: d.movements.filter((x) => x.id !== m.id) })), toast("Kulüp kasasına nakit olarak eklendi")))
      .catch(() => toast("Kaydedilemedi, internet bağlantını kontrol et"));
  const shown = open || sum.byMonth[0]?.ym || "";
  const title = named || payee.name || "Kişisel hesap";
  const nIn = list.filter((m) => m.amount > 0).length;
  const nOut = list.filter((m) => m.amount < 0).length;
  // Lacivertte iki büyük sayı yan yana
  const big = (label, value, sub, line) => (
    <div className={`min-w-0 ${line ? "border-l border-white/15 pl-3" : ""}`}>
      <small className="block truncate text-[0.8125rem] text-white/65">{label}</small>
      <b className="block truncate text-[1.625rem] font-bold leading-tight tracking-[-.02em] tabular-nums text-white">{value}</b>
      <small className="block truncate text-[0.8125rem] text-white/65">{sub}</small>
    </div>
  );

  // Yeni tasarım (velora-tasarim, 2026-11-03): lacivert üstte ad, Yenile ve ayar düğmeleri, büyük tutarlar, Excel; altta ay ay ödemeler
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label={title}>
        <header className="flex items-center gap-2.5">
          <BackButton href="/mail" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{title}</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{data && !data.error ? `${data.sources || 0} banka hareketi` : named ? "Gelen ve giden" : "Aldığı ödemeler"}</p>
          </div>
          <button type="button" disabled={busy} onClick={refresh} aria-label="Yenile" data-press className={`${buttonClass({ variant: "round" })} size-10`}>
            <Icon name="repeat" className={`size-5 ${busy ? "animate-spin" : ""}`} />
          </button>
          {named ? (
            <button type="button" onClick={() => setEdit((v) => !v)} aria-label="İsmi kaldır" data-press className={`${buttonClass({ variant: "round" })} size-10`}>
              <Icon name="trash" className="size-5" />
            </button>
          ) : (
            <button type="button" onClick={() => setEdit((v) => !v)} aria-label="Hesap ayarı" data-press className={`${buttonClass({ variant: "round" })} size-10`}>
              <Icon name="edit" className="size-5" />
            </button>
          )}
        </header>

        {data && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {named ? (
              <>
                {big("Gelen", money(sum.in), `${nIn} ödeme · ₺`)}
                {big("Giden", money(sum.out), `${nOut} ödeme · ₺`, true)}
              </>
            ) : (
              <>
                {big("Bu ay", money(sum.month.total), `${sum.month.count} ödeme · ₺`)}
                {big("Bugüne kadar", money(sum.total), `${sum.count} ödeme · ₺`, true)}
              </>
            )}
          </div>
        )}

        {data && !data.error && list.length > 0 && (
          <button
            type="button"
            onClick={() => download(`${title}-odemeler.csv`, named ? payeeCsv(list, named, "gelen ve giden ödemeler") : payeeCsv(list, payee.name))}
            data-press
            className="raised mt-4 flex h-10 w-full items-center justify-center rounded-xl border text-[0.9375rem] font-semibold"
          >
            Excel indir
          </button>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {edit &&
          (named ? (
            <section className="fade-in space-y-3 rounded-[1.25rem] border border-line bg-card px-4 py-4">
              <p className="text-[0.875rem] leading-snug">“{named}” Hesaplar sayfasından kaldırılsın mı? Banka hareketleri silinmez.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEdit(false)} data-press className="btn btn-secondary flex-1">
                  Vazgeç
                </button>
                <button type="button" onClick={drop} data-press className="btn btn-danger flex-1">
                  Kaldır
                </button>
              </div>
            </section>
          ) : (
            <Settings payee={payee} accounts={accounts} onSave={save} onClose={() => setEdit(false)} />
          ))}

        {!data ? (
          <Loading />
        ) : data.error ? (
          <Empty icon="wallet" title="Banka hareketleri okunamadı" />
        ) : !list.length ? (
          <Empty icon="wallet" title={data.sources ? `${named || payee.name ? `${named || payee.name} adına ` : ""}ödeme yok` : "Banka hesap özeti yok"} />
        ) : (
          <section>
            <ListHead title="Aylar" count={sum.byMonth.length} />
            <ul className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">
              {sum.byMonth.map((mo) => (
                <li key={mo.ym}>
                  <button type="button" onClick={() => setOpen(mo.ym === shown ? "-" : mo.ym)} aria-expanded={mo.ym === shown} data-press="row" className="flex min-h-[3.5rem] w-full items-center gap-3 px-3.5 py-2.5 text-left">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.9375rem] font-semibold first-letter:uppercase">{monthName(mo.ym)}</b>
                      <small className="block truncate text-[0.8125rem] text-mut">{mo.count} ödeme</small>
                    </span>
                    {named ? (
                      <span className="shrink-0 text-right text-[0.8125rem] font-semibold tabular-nums leading-tight">
                        {mo.in > 0 && <b className="block font-bold text-ok">+{money(mo.in)}</b>}
                        {mo.out > 0 && <b className="block font-bold">−{money(mo.out)}</b>}
                      </span>
                    ) : (
                      <b className="shrink-0 text-[0.9375rem] font-bold tabular-nums text-ok">+{money(mo.total)} ₺</b>
                    )}
                    <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${mo.ym === shown ? "rotate-90" : ""}`} />
                  </button>
                  {mo.ym === shown && (
                    <ul className="fade-in divide-y divide-line border-t border-line bg-bg/40">
                      {mo.list.map((m) => (
                        <li
                          key={m.id || `${m.date}|${m.amount}|${m.desc}`}
                          onClick={!named && canConv(m) ? () => setAct((v) => (v === m.id ? "" : m.id)) : undefined}
                          className={`flex flex-wrap items-center gap-x-3 px-3.5 py-2.5 ${!named && canConv(m) ? "cursor-pointer" : ""}`}
                        >
                          <span className="w-[3.75rem] shrink-0 text-[0.75rem] font-semibold leading-tight text-mut">
                            {dayText(m)}
                            {hmOf(m) && <span className="block font-normal tabular-nums">{hmOf(m)}</span>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <b className="block truncate text-[0.875rem] font-semibold">{m.note || (m.out ? "Hesaptan gönderildi" : whoIn(m) || m.desc)}</b>
                            <small className="block truncate text-[0.8125rem] text-mut">{m.cash ? "Nakit ödendi" : [m.out || m.amount < 0 ? "Giden" : "Gelen", m.accountLabel, m.out || named ? "" : whoIn(m)].filter(Boolean).join(" · ")}</small>
                          </span>
                          <b className={`shrink-0 text-[0.875rem] font-bold tabular-nums ${m.amount < 0 ? "" : "text-ok"}`}>{m.amount < 0 ? `−${money(-m.amount)}` : `+${money(m.amount)}`}</b>
                          {act === m.id && (
                            <button type="button" onClick={(e) => (e.stopPropagation(), toCash(m))} data-press className="btn btn-primary btn-sm fade-in mt-2 w-full">
                              Nakite çevir · kulüp kasasına
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}

// Ad ve hesap ayarı: hesaplardan bu ada giden paralar; kendi hesabı seçiliyse ona gelenler de
function Settings({ payee, accounts, onSave, onClose }) {
  const [name, setName] = useState(payee.name);
  const [account, setAccount] = useState(payee.account);
  return (
    <section className="fade-in space-y-3 rounded-[1.25rem] border border-line bg-card px-4 py-4">
      <label className="block">
        <span className="text-[0.8125rem] font-semibold text-mut">Ad (bankada alıcı olarak yazılan)</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ad Soyad" className="mt-1 h-11 w-full rounded-xl bg-bg px-3.5 text-[1rem] outline-none" />
      </label>
      {accounts.length > 1 && (
        <div>
          <p className="text-[0.8125rem] font-semibold text-mut">Banka hesabı</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[{ key: "", label: "Hepsi" }, ...accounts].map((a) => (
              <button key={a.key} type="button" onClick={() => setAccount(a.key)} aria-pressed={account === a.key} className={`h-8 max-w-full truncate rounded-full px-3 text-[0.8125rem] font-semibold ${account === a.key ? "bg-acc text-white" : "bg-bg text-fg"}`}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onClose} data-press className="btn btn-secondary flex-1">
          Vazgeç
        </button>
        <button type="button" onClick={() => onSave({ name: name.trim(), account })} data-press className="btn btn-primary flex-1">
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
