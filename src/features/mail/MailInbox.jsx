"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/firebase/clientApp";
import { money, ruleFor, sendersOf, statementCsv } from "@/lib/bankSheet";
import { balanceOf, previewOf } from "@/lib/mailBoard";
import { mailFileBytes } from "@/features/mail/mailFiles";
import { dayLabel, todayIn } from "@/lib/notifyText";

const localDate = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date(iso));
const hm = (iso) =>
  new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
const shortDay = (d) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
  });
const PAGE = 40;
const card = "overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";

// Mail ayarları › Gelen mailler (Hesaplar'dan taşındı): gönderene göre süz; dokununca mail açılır
export function MailInbox({ uid, mailFrom, ready }) {
  const [mails, setMails] = useState(null);
  const [max, setMax] = useState(PAGE);
  const [from, setFrom] = useState("");
  useEffect(
    () =>
      onSnapshot(
        query(collection(db, "orgs", uid, "mails"), orderBy("at", "desc"), limit(max)),
        (s) => setMails(s.docs.map((d) => ({ id: d.id, ...d.data() }))),
        () => setMails([]),
      ),
    [uid, max],
  );
  const today = todayIn();
  const list = mails || [];
  const rules = sendersOf(mailFrom);
  const inbox = from ? list.filter((m) => ruleFor(m.from, [{ from }])) : list;
  return (
    <section className="mt-6">
      <h2 className="px-1 pb-2 text-[0.8125rem] font-semibold text-mut">Gelen mailler</h2>
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
            <button type="button" onClick={() => setMax((n) => n + PAGE)} data-press className="btn btn-text btn-sm w-full text-acc">
              Daha eski mailler
            </button>
          )}
        </div>
      ) : (
        <p className={`${card} px-4 py-6 text-center text-[0.875rem] leading-snug text-mut`}>{mails === null ? "Okunuyor…" : !ready ? "Gmail bağlı değil." : from ? "Bu gönderenden mail yok." : "Henüz mail gelmedi."}</p>
      )}
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

// Gelen kutusu satırı: gönderen, saat, konu, tek satır önizleme; dokununca açılır (hesap özeti ya da metin, ekler)
function MailRow({ m, today, head }) {
  const [open, setOpen] = useState(false);
  const sheets = m.sheets || [];
  const who = m.rule || m.fromName || m.from;
  const d = localDate(m.at);
  return (
    <li>
      {head && <p className="bg-bg/60 px-4 py-1.5 text-[0.75rem] font-semibold text-mut">{dayLabel(d, today) || shortDay(d)}</p>}
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} data-press="row" className="flex w-full items-start gap-3 px-4 py-3 text-left">
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
          {(m.rawFiles || m.raw)?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-3">
              {(m.rawFiles || m.raw).map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => mailFileBytes(f).then((b) => download(f.name, b, "application/vnd.ms-excel"), () => (f.url ? window.open(f.url, "_blank") : alert("Ek indirilemedi")))}
                  data-press className="btn btn-secondary btn-sm max-w-full text-mut"
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
            data-press className="btn btn-secondary btn-sm mt-2 w-full text-acc"
          >
            <Icon name="up" className="size-4 rotate-180" /> Excel olarak indir
          </button>
        </div>
      )}
    </div>
  );
}
