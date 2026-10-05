"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { db } from "@/lib/firebase/clientApp";
import { money, ruleFor, sendersOf, statementCsv } from "@/lib/bankSheet";
import { accountsOf, balanceOf, movementsOf, previewOf, totalsOf } from "@/lib/mailBoard";
import { sheetsFromRaw, xlsxOf } from "@/lib/mailParse";
import { dayLabel, todayIn } from "@/lib/notifyText";
import { monthOf } from "@/lib/dues";
import { payeeMoves, payeeOf, whoIn } from "@/lib/payee";
import { LedgerCard } from "@/features/bank/LedgerCard";
import { ledgerStart, loadLedger } from "@/features/bank/ledgerData";
import { report } from "@/lib/bankAnalyze";

const localDate = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(iso));
const hm = (iso) =>
  new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
const when = (iso, today) => `${dayLabel(localDate(iso), today)} ${hm(iso)}`;
const shortDay = (d) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
const cash = (n, cur) => `${money(n)}${cur ? ` ${cur}` : ""}`;
const signed = (n, cur) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${cash(Math.abs(n), cur)}`;
const PAGE = 40;
const MOVES = 6; // kapalıyken gösterilen hareket sayısı
const card = "overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";
const title = "px-1 pb-2 text-[0.8125rem] font-semibold text-mut";

// Hesaplar (adres /mail, yalnızca ana hesap), banka uygulaması düzeninde, sade:
//   hesaplar (son bakiye, toplam, kişisel hesabın aldıkları) › özet (bugüne kadar gelen/giden, kim ne kadar ödedi) ›
//   banka defteri (geçmiş dönem Excel'i yükle, yapay zeka inceler; baştan kur) › son hareketler › gelen mailler (kapalı) › durum
// Gmail betiği mailleri doğrudan kişinin kendi verisine yazar (orgs/{uid}/mails); Excel ekleri ham (base64) gelir, bu sayfa
// okuyup tabloyu (sheets) aynı belgeye kaydeder. Sayfa veritabanını canlı dinler; yeni mail kendiliğinden görünür.
export default function MailPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const owner = profile?.role === "owner";
  const [mails, setMails] = useState(null);
  const [max, setMax] = useState(PAGE);
  const [now] = useState(() => Date.now());
  const [acct, setAcct] = useState(""); // hareketleri tek hesaba süz
  const [allMoves, setAllMoves] = useState(false);
  const [from, setFrom] = useState(""); // gelen kutusunu tek gönderene süz
  const [ledger, setLedger] = useState(null); // banka defterinin bütün hareketleri (defterin başından bu aya)
  const [ledgerBusy, setLedgerBusy] = useState(true); // özet okunurken iskelet gösterilir
  const [inboxOpen, setInboxOpen] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (profile && !owner) router.replace("/");
  }, [profile, owner, router]);
  useEffect(() => {
    if (!owner) return;
    return onSnapshot(
      query(collection(db, "orgs", profile.uid, "mails"), orderBy("at", "desc"), limit(max)),
      (s) => setMails(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setMails([]),
    );
  }, [owner, profile?.uid, max]);

  // Banka defteri (bu ay + geçen ay): yeni mail gelince ya da Excel eklenince yeniden okunur
  const newest = mails?.[0]?.id || "";
  const loaded = mails !== null;
  useEffect(() => {
    if (!owner || !loaded) return;
    let live = true;
    const ym = todayIn().slice(0, 7);
    ledgerStart(profile.uid, ym)
      .then((first) => loadLedger(profile.uid, first, ym))
      .then(
        (r) => live && setLedger(r.movements),
        () => live && setLedger(null),
      )
      .finally(() => live && setLedgerBusy(false));
    return () => {
      live = false;
    };
  }, [owner, loaded, profile?.uid, newest, tick]);

  // Excel ekleri henüz okunmamış mailler: tarayıcıda oku, sonucu kaydet (bir kez)
  const pending = (mails || [])
    .filter((m) => m.raw?.length && !m.sheets)
    .map((m) => m.id)
    .join(",");
  useEffect(() => {
    if (!owner || !pending) return;
    let live = true;
    import("xlsx").then((mod) => {
      const XLSX = xlsxOf(mod);
      for (const m of mails.filter((x) => pending.split(",").includes(x.id))) {
        if (!live) return;
        const sheets = sheetsFromRaw(m.raw, XLSX);
        updateDoc(doc(db, "orgs", profile.uid, "mails", m.id), {
          sheets,
        }).catch((e) => console.warn("[mail] tablo kaydedilemedi", e?.code));
      }
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, pending]);
  if (!owner) return null;

  const today = todayIn();
  const list = mails || [];
  const rules = sendersOf(profile.mailFrom); // İş Bankası sabit + eklenenler
  const ready = !!profile.mailSeen; // betik en az bir kez bağlandı
  const seen = profile.mailSeen;
  const live = seen && now - Date.parse(seen) < 20 * 60e3;
  const lastMail =
    list
      .map((m) => m.receivedAt || m.at)
      .sort()
      .at(-1) || "";

  const accounts = accountsOf(list);
  const totals = totalsOf(accounts);
  const moves = ledger || movementsOf(list);
  const picked = accounts.find((a) => a.key === acct);
  const shownMoves = (picked ? moves.filter((x) => x.account === acct) : moves).slice(0, allMoves ? 200 : MOVES);
  const moveTotal = picked ? moves.filter((x) => x.account === acct).length : moves.length;
  // Kişisel hesap (/payments): bu ayın toplamı yalnız yüklü mailler ayın başını kapsıyorsa yazılır (eksik sayı göstermesin)
  const payee = payeeOf(profile);
  const ym = today.slice(0, 7);
  const covered = !!ledger || (list.length > 0 && localDate(list.at(-1).at).slice(0, 7) < ym);
  const payeeMonth = payeeMoves(moves, payee).filter((x) => monthOf(x) === ym);
  const payeeSum = payeeMonth.reduce((n, x) => n + x.amount, 0);
  const payeeAll = payeeMoves(moves, payee);
  const inbox = from ? list.filter((m) => ruleFor(m.from, [{ from }])) : list;
  const rep = ledger?.length ? report(ledger, payee, 1000) : null;

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Hesaplar" sub={live ? "Gmail bağlı · 5 dakikada bir bakılır" : ready ? "Gmail bir süredir bağlanmadı" : "Kurulum gerekli"}>
        <Link href="/mail/setup" aria-label="Mail ayarları" className="grid size-10 place-items-center rounded-full bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-95">
          <Icon name="wrench" className="size-5" />
        </Link>
      </PageHeader>

      {!mails ? (
        <Loading />
      ) : (
        <>
          {/* Hesaplar: toplam bakiye ve her hesabın son bakiyesi */}
          {accounts.length > 0 && (
            <section className="mt-5">
              <h2 className={title}>Hesaplar</h2>
              <div className={card}>
                <div className="bg-acc px-4 py-4 text-white">
                  <p className="text-[0.75rem] font-semibold tracking-[.06em] text-white/75">TOPLAM BAKİYE</p>
                  {totals.map((t, i) => (
                    <p key={t.currency} className={`tabular-nums tracking-tight ${i === 0 ? "mt-0.5 text-[1.75rem] font-bold leading-tight" : "text-[1.0625rem] font-semibold text-white/90"}`}>
                      {money(t.total)} <span className={i === 0 ? "text-[1rem] font-semibold text-white/80" : "text-white/75"}>{t.currency}</span>
                    </p>
                  ))}
                  <p className="mt-1.5 text-[0.75rem] text-white/75">
                    {accounts.length} hesap · son özet{" "}
                    {when(
                      accounts
                        .map((a) => a.at)
                        .sort()
                        .at(-1),
                      today,
                    )}
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {accounts.map((a) => (
                    <li key={a.key}>
                      <button
                        type="button"
                        onClick={() => (setAcct((k) => (k === a.key ? "" : a.key)), setAllMoves(false))}
                        aria-pressed={acct === a.key}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg ${acct === a.key ? "bg-acc/5" : ""}`}
                      >
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-[0.75rem] font-bold text-acc">{a.currency || "₺"}</span>
                        <span className="min-w-0 flex-1">
                          <b className="block truncate text-[0.9375rem] font-semibold">{a.name}</b>
                          <small className="block truncate text-[0.75rem] text-mut">{[a.last4 && `·${a.last4}`, when(a.at, today)].filter(Boolean).join(" · ")}</small>
                        </span>
                        <span className="shrink-0 text-right">
                          <b className="block text-[0.9375rem] font-semibold tabular-nums">{cash(a.balance, a.currency)}</b>
                          {a.change !== null && a.change !== 0 && <small className={`block text-[0.75rem] font-semibold tabular-nums ${a.change > 0 ? "text-ok" : "text-rec"}`}>{signed(a.change, "")}</small>}
                        </span>
                      </button>
                    </li>
                  ))}
                  <li>
                    <Link href="/payments" className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ok/10 text-ok">
                        <Icon name="user" className="size-[1.125rem]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[0.9375rem] font-semibold">{payee.name || "Kişisel hesap"}</b>
                        <small className="block truncate text-[0.75rem] text-mut">
                          {payeeAll.length ? `Aldığı ödemeler · toplam ${money(payeeAll.reduce((n, x) => n + x.amount, 0))} TL` : "Aldığı ödemeler · tarih tarih"}
                        </small>
                      </span>
                      <span className="shrink-0 text-right">
                        {covered && payeeMonth.length > 0 ? (
                          <>
                            <b className="block text-[0.9375rem] font-semibold tabular-nums text-ok">+{cash(payeeSum, "TL")}</b>
                            <small className="block text-[0.75rem] text-mut">bu ay · {payeeMonth.length} ödeme</small>
                          </>
                        ) : (
                          <Icon name="chev" className="size-4 text-mut" />
                        )}
                      </span>
                    </Link>
                  </li>
                </ul>
              </div>
            </section>
          )}

          {ledgerBusy && !ledger ? <SummarySkeleton /> : rep && <Summary rep={rep} />}

          <LedgerCard uid={profile.uid} self={payee.name} payee={payee} onSaved={() => (setLedger(null), setLedgerBusy(true), setTick((n) => n + 1))} />

          {/* Son hareketler: banka defterinden (Excel + günlük mailler), günlere göre */}
          {moves.length > 0 && (
            <section className="mt-5">
              <div className="flex items-center gap-2 px-1 pb-2">
                <h2 className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-mut">{picked ? `Hareketler · ${picked.label}` : "Son hareketler"}</h2>
                {picked && (
                  <button type="button" onClick={() => setAcct("")} className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-card px-2.5 text-[0.75rem] font-semibold text-acc">
                    Tümü <Icon name="x" className="size-3.5" />
                  </button>
                )}
              </div>
              <div className={card}>
                <Moves list={shownMoves} today={today} />
                {moveTotal > MOVES && (
                  <button type="button" onClick={() => setAllMoves((v) => !v)} className="h-11 w-full border-t border-line text-[0.875rem] font-semibold text-acc active:bg-bg">
                    {allMoves ? "Daha az göster" : `Tümünü gör (${moveTotal})`}
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Gelen kutusu: gönderene göre süz; dokununca mail açılır */}
          <section className="mt-5">
            <button type="button" onClick={() => setInboxOpen((v) => !v)} aria-expanded={inboxOpen} className="flex w-full items-center gap-2 px-1 pb-2 text-left">
              <h2 className="min-w-0 flex-1 text-[0.8125rem] font-semibold text-mut">Gelen mailler ({list.length})</h2>
              <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${inboxOpen ? "rotate-90" : ""}`} />
            </button>
            {inboxOpen && (
              <>
                <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
                  <Chip on={!from} onClick={() => setFrom("")} label="Tümü" n={list.length} />
                  {rules.map((r) => (
                    <Chip key={r.from} on={from === r.from} onClick={() => setFrom(r.from)} label={r.name} n={list.filter((m) => ruleFor(m.from, [r])).length} />
                  ))}
                </div>
                {inbox.length ? (
                  <div className={card}>
                    <ul className="divide-y divide-line">
                      {inbox.map((m, i) => (
                        <MailRow key={m.id} m={m} today={today} head={i === 0 || localDate(inbox[i - 1].at) !== localDate(m.at)} />
                      ))}
                    </ul>
                    {list.length >= max && (
                      <button type="button" onClick={() => setMax((n) => n + PAGE)} className="h-11 w-full border-t border-line text-[0.875rem] font-semibold text-acc active:bg-bg">
                        Daha eski mailler
                      </button>
                    )}
                  </div>
                ) : (
                  <p className={`${card} px-4 py-6 text-center text-[0.875rem] leading-snug text-mut`}>
                    {!ready
                      ? "Gmail'ini bağlayınca bankadan gelen hesap özetleri burada görünür."
                      : from
                        ? "Bu gönderenden mail yok."
                        : "Henüz mail gelmedi. Seçtiğin gönderenlerden mail gelince burada görünür ve telefonuna bildirim gelir."}
                  </p>
                )}
              </>
            )}
          </section>

          {/* Durum ve ayarlar */}
          <div className="mt-4 flex items-center gap-3 px-1">
            <p className={`min-w-0 flex-1 text-[0.75rem] leading-snug ${ready && !live ? "text-rec" : "text-mut"}`}>
              {!ready
                ? "Gmail bağlı değil. Kurulumu bir kez yapman yeterli."
                : live
                  ? `Son mail ${lastMail ? when(lastMail, today) : "yok"} · Gmail 5 dakikada bir kendiliğinden kontrol edilir.`
                  : "Gmail bir süredir kontrol edilmedi. Apps Script'te kur'u yeniden çalıştır."}
            </p>
            <Link href="/mail/setup" className="flex h-9 shrink-0 items-center rounded-xl bg-card px-3.5 text-[0.8125rem] font-semibold shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-[.98]">
              {ready ? "Gönderenler" : "Kurulumu yap"}
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

// Özet (banka defterinin başından bugüne): gelen/giden, kişisel hesabın aldığı, kim ne kadar ödedi
function Summary({ rep }) {
  const [all, setAll] = useState(false);
  const day = (d) =>
    d
      ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";
  const list = all ? rep.top : rep.top.slice(0, 5);
  return (
    <section className="mt-5">
      <h2 className={title}>
        Özet · {day(rep.from)} – {day(rep.to)}
      </h2>
      <div className={card}>
        <div className="grid grid-cols-2 gap-2 px-4 pt-3.5">
          <div className="rounded-xl bg-ok/10 px-3 py-2">
            <p className="text-[0.6875rem] font-semibold text-ok">GELEN · {rep.inN}</p>
            <p className="truncate text-[1.0625rem] font-bold tabular-nums text-ok">+{money(rep.inSum)} TL</p>
          </div>
          <div className="rounded-xl bg-rec/10 px-3 py-2">
            <p className="text-[0.6875rem] font-semibold text-rec">GİDEN · {rep.outN}</p>
            <p className="truncate text-[1.0625rem] font-bold tabular-nums text-rec">−{money(-rep.outSum)} TL</p>
          </div>
        </div>
        {rep.got && (
          <Link href="/payments" className="mx-4 mt-2 flex items-center gap-3 rounded-xl bg-bg px-3 py-2.5 active:scale-[.99]">
            <Icon name="user" className="size-[1.125rem] shrink-0 text-acc" />
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[0.875rem] font-semibold">{rep.got.name || "Kişisel hesap"} aldı</b>
              <small className="block text-[0.75rem] text-mut">{rep.got.n} ödeme</small>
            </span>
            <b className="shrink-0 text-[0.9375rem] font-bold tabular-nums">{money(rep.got.sum)} TL</b>
            <Icon name="chev" className="size-4 shrink-0 text-mut" />
          </Link>
        )}
        {rep.top.length > 0 && (
          <>
            <p className="px-4 pt-3 text-[0.75rem] font-semibold text-mut">En çok ödeyenler</p>
            <ol className="px-4 pb-1 pt-1">
              {list.map((w, i) => (
                <li key={w.who} className="flex items-center gap-2 py-1.5 text-[0.875rem]">
                  <span className="w-5 shrink-0 text-right text-[0.75rem] tabular-nums text-mut">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{w.who}</span>
                  <span className="shrink-0 text-[0.75rem] text-mut">{w.n} ödeme</span>
                  <span className="w-24 shrink-0 text-right font-semibold tabular-nums text-ok">{money(w.sum)}</span>
                </li>
              ))}
            </ol>
            {rep.top.length > 5 && (
              <button type="button" onClick={() => setAll((v) => !v)} className="h-10 w-full border-t border-line text-[0.8125rem] font-semibold text-acc active:bg-bg">
                {all ? "Daha az göster" : `Kim ne kadar ödedi · herkes (${rep.top.length})`}
              </button>
            )}
          </>
        )}
        {!rep.top.length && <div className="h-3.5" />}
      </div>
    </section>
  );
}

// Özet okunurken: aynı düzende yanıp sönen iskelet (sayfa bir anda kaymasın)
function SummarySkeleton() {
  const bar = (w, h = "h-3") => <span className={`shimmer block rounded-full ${h} ${w}`} />;
  return (
    <section className="mt-5" aria-busy="true" aria-label="Özet yükleniyor">
      <h2 className={`${title} flex items-center gap-2`}>
        Özet <span className="text-[0.75rem] font-medium">hesaplanıyor…</span>
      </h2>
      <div className={`${card} px-4 py-3.5`}>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((i) => (
            <div key={i} className="space-y-2 rounded-xl bg-bg px-3 py-2.5">
              {bar("w-14", "h-2.5")}
              {bar("w-24", "h-4")}
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-bg px-3 py-3">
          <span className="shimmer size-[1.125rem] shrink-0 rounded-full" />
          <span className="flex-1 space-y-1.5">
            {bar("w-32")}
            {bar("w-16", "h-2.5")}
          </span>
          {bar("w-20", "h-4")}
        </div>
        <div className="mt-3 space-y-3 pb-1">
          {bar("w-24", "h-2.5")}
          {["w-40", "w-32", "w-36"].map((w) => (
            <div key={w} className="flex items-center gap-3">
              {bar("w-4", "h-2.5")}
              <span className="flex-1">{bar(w)}</span>
              {bar("w-16")}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Chip({ on, onClick, label, n }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[0.8125rem] font-semibold active:scale-95 ${on ? "bg-fg text-card" : "bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.05)]"}`}
    >
      {label}
      <span className={`tabular-nums ${on ? "text-card/70" : "text-mut"}`}>{n}</span>
    </button>
  );
}

// Hareket satırları, gün başlıklarıyla (banka uygulamasındaki gibi)
function Moves({ list, today }) {
  const dayOf = (x) => localDate(new Date(x.ts).toISOString());
  return (
    <ul>
      {list.map((x, i) => {
        const d = dayOf(x);
        const head = i === 0 || dayOf(list[i - 1]) !== d;
        const t = /\d{1,2}:\d{2}/.exec(x.date)?.[0] || "";
        return (
          <li key={x.id}>
            {head && <p className="bg-bg/60 px-4 py-1.5 text-[0.75rem] font-semibold text-mut">{dayLabel(d, today) || shortDay(d)}</p>}
            <div className="flex h-14 items-center gap-3 px-4">
              <span className={`grid size-9 shrink-0 place-items-center rounded-full ${x.amount > 0 ? "bg-ok/10 text-ok" : "bg-rec/10 text-rec"}`}>
                <Icon name="up" className={`size-4 ${x.amount > 0 ? "rotate-180" : ""}`} />
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-medium">{whoIn(x) || x.note || x.desc}</b>
                <small className="block truncate text-[0.75rem] text-mut">{[t, whoIn(x) && (x.note || x.desc), x.cat || x.kind].filter(Boolean).join(" · ")}</small>
              </span>
              <span className="shrink-0 text-right">
                <b className={`block text-[0.9375rem] font-semibold tabular-nums ${x.amount > 0 ? "text-ok" : ""}`}>{signed(x.amount, x.currency)}</b>
                {typeof x.balance === "number" && <small className="block text-[0.6875rem] tabular-nums text-mut">{cash(x.balance, "")}</small>}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// Gelen kutusu satırı: gönderen, saat, konu, tek satır önizleme; dokununca açılır (hesap özeti ya da metin, ekler)
function MailRow({ m, today, head }) {
  const [open, setOpen] = useState(false);
  const sheets = m.sheets || [];
  const who = m.rule || m.fromName || m.from;
  const d = localDate(m.at);
  return (
    <li>
      {head && <p className="bg-bg/60 px-4 py-1.5 text-[0.75rem] font-semibold text-mut">{dayLabel(d, today) || shortDay(d)}</p>}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3 text-left active:bg-bg">
        <span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-full ${sheets.length ? "bg-acc/10 text-acc" : "bg-bg text-mut"}`}>
          <Icon name={sheets.length ? "wallet" : "mail"} className="size-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <b className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold">{who}</b>
            <time className="shrink-0 text-[0.75rem] tabular-nums text-mut">{hm(m.at)}</time>
          </span>
          <span className="block truncate text-[0.875rem]">{m.subject || "(Konu yok)"}</span>
          <span className="flex items-center gap-1.5 text-[0.8125rem] text-mut">
            <span className="min-w-0 flex-1 truncate">{previewOf(m, money) || "İçerik yok"}</span>
            {m.files?.length > 0 && <span className="shrink-0 rounded bg-bg px-1.5 text-[0.6875rem] font-semibold">Ek {m.files.length}</span>}
          </span>
        </span>
      </button>
      {open && (
        <div className="fade-in pb-1">
          {sheets.length ? (
            sheets.map((s, i) => <Statement key={i} s={s} m={m} />)
          ) : (
            <p className="mx-4 mb-3 whitespace-pre-wrap rounded-xl bg-bg px-3.5 py-3 text-[0.875rem] leading-snug text-fg/85">{m.text || "İçerik yok"}</p>
          )}
          {m.raw?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
              {m.raw.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() =>
                    download(
                      f.name,
                      Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0)),
                      "application/vnd.ms-excel",
                    )
                  }
                  className="flex h-8 max-w-full items-center gap-1.5 rounded-full bg-bg px-3 text-[0.75rem] font-semibold text-mut active:scale-95"
                >
                  <Icon name="up" className="size-3.5 shrink-0 rotate-180" /> <span className="truncate">{f.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

// Dosya adı: Türkçe harfler sade Latin harfe (bazı tarayıcılar ASCII dışı adı yok sayıp "download" der)
const TR = {
  ç: "c",
  ğ: "g",
  ı: "i",
  İ: "I",
  ö: "o",
  ş: "s",
  ü: "u",
  Ç: "C",
  Ğ: "G",
  Ö: "O",
  Ş: "S",
  Ü: "U",
};
const fileName = (s) => s.replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => TR[c]).replace(/[^\w.-]+/g, "-");

// CSV dosyası indir (Excel açar)
function download(name, text, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: fileName(name),
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Hesap özeti: bakiye, hareket sayısı, giren/çıkan; dokununca hareketler ve hesap bilgileri
function Statement({ s, m }) {
  const [open, setOpen] = useState(false);
  const { sum = {}, columns = [], rows = [], meta = {} } = s;
  const col = (re) => columns.findIndex((c) => re.test(c));
  const c = {
    date: col(/tarih|date/i),
    desc: col(/açıklama|aciklama|description/i),
    amount: col(/tutar|amount/i),
    bal: col(/bakiye|balance/i),
    type: col(/[iİ]şlem tipi|^[iİ]şlem$/i),
  };
  const cur = sum.currency || "";
  return (
    <div className="px-4 pb-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="block w-full rounded-xl bg-bg px-3.5 py-3 text-left active:scale-[.99]" aria-expanded={open}>
        <span className="flex items-center justify-between gap-2 text-[0.75rem] text-mut">
          <span className="truncate">{[sum.product || "Hesap", sum.last4 && `·${sum.last4}`].filter(Boolean).join(" ")}</span>
          <Icon name="chev" className={`size-4 shrink-0 transition ${open ? "rotate-90" : ""}`} />
        </span>
        <b className="mt-0.5 block text-[1.375rem] font-bold tracking-tight">
          {balanceOf(s) === null ? "—" : money(balanceOf(s))} <span className="text-[0.875rem] font-semibold text-mut">{cur}</span>
        </b>
        <span className="mt-1.5 flex flex-wrap gap-1.5 text-[0.75rem] font-semibold">
          <span className="rounded-full bg-card px-2 py-0.5 text-mut">{sum.count ? `${sum.count} hareket` : "Hareket yok"}</span>
          {sum.inSum > 0 && <span className="rounded-full bg-ok/10 px-2 py-0.5 text-ok">+{money(sum.inSum)}</span>}
          {sum.outSum < 0 && <span className="rounded-full bg-rec/10 px-2 py-0.5 text-rec">−{money(-sum.outSum)}</span>}
        </span>
      </button>
      {open && (
        <div className="fade-in mt-2">
          {rows.length > 0 && (
            <ul className="divide-y divide-line">
              {rows.map(({ v }, i) => {
                const amt = typeof v[c.amount] === "number" ? v[c.amount] : null;
                return (
                  <li key={i} className="flex items-start gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <b className="block text-[0.875rem] font-medium leading-snug">{(c.desc >= 0 && v[c.desc]) || (c.type >= 0 && v[c.type]) || "İşlem"}</b>
                      <small className="block text-[0.75rem] text-mut">{[c.date >= 0 && v[c.date], c.type >= 0 && c.desc >= 0 && v[c.type]].filter(Boolean).join(" · ")}</small>
                    </span>
                    <span className="shrink-0 text-right">
                      <b className={`block text-[0.875rem] font-semibold tabular-nums ${amt > 0 ? "text-ok" : amt < 0 ? "text-rec" : ""}`}>
                        {amt === null ? String(v[c.amount] ?? "") : `${amt > 0 ? "+" : "−"}${money(Math.abs(amt))}`}
                      </b>
                      {c.bal >= 0 && <small className="block text-[0.75rem] tabular-nums text-mut">{typeof v[c.bal] === "number" ? money(v[c.bal]) : v[c.bal]}</small>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {Object.keys(meta).length > 0 && (
            <dl className="mt-2 space-y-1 rounded-xl bg-bg px-3.5 py-2.5 text-[0.75rem]">
              {Object.entries(meta).map(([k, val]) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-[42%] shrink-0 text-mut">{k}</dt>
                  <dd className="min-w-0 break-words">{val}</dd>
                </div>
              ))}
            </dl>
          )}
          <button
            type="button"
            onClick={() => download(`${(m.rule || "hesap").replace(/\s+/g, "-")}_${sum.currency || ""}_${localDate(m.at)}.csv`, statementCsv(s, m.subject))}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-bg text-[0.875rem] font-semibold text-acc active:scale-[.98]"
          >
            <Icon name="up" className="size-4 rotate-180" /> Excel olarak indir
          </button>
        </div>
      )}
    </div>
  );
}
