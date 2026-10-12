"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { money } from "@/lib/bankSheet";

const card = "overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";
const title = "px-1 pb-2 text-[0.8125rem] font-semibold text-mut";
const shortDate = (x) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})/.exec(x.date || "");
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" }) : "";
};
const SHOW = 5;

// Hesaplar › Kulüp: Kasa (nakit). Sayılan girişler − çıkışlar; altta son nakitler ve kasa başlamadan önceki girişler
// ("Nakit girdi olarak ekle"). Ayrıntı: src/lib/cashbook.js.
export function KasaCard({ kasa, onAdd, onOpen, onInclude }) {
  const [oldOpen, setOldOpen] = useState(false);
  const [all, setAll] = useState(false);
  const list = all ? kasa.counted : kasa.counted.slice(0, SHOW);
  return (
    <section className="mt-6">
      <h2 className={title}>Kasa · nakit</h2>
      <div className={card}>
        <div className="px-4 pb-3 pt-3.5">
          <p className={`text-[1.75rem] font-bold leading-tight tabular-nums tracking-tight ${kasa.total < 0 ? "text-rec" : ""}`}>
            {kasa.total < 0 ? "−" : ""}
            {money(Math.abs(kasa.total))} <span className="text-[1rem] font-semibold text-mut">TL</span>
          </p>
          <p className="mt-0.5 text-[0.75rem] tabular-nums text-mut">
            Giriş <span className="font-semibold text-ok">+{money(kasa.in)}</span> · Çıkış <span className="font-semibold text-rec">−{money(kasa.out)}</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => onAdd("in")} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ok/10 text-[0.875rem] font-semibold text-ok">
              <Icon name="plus" className="size-4" /> Nakit giriş
            </button>
            <button type="button" onClick={() => onAdd("out")} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-rec/10 text-[0.875rem] font-semibold text-rec">
              <Icon name="up" className="size-4" /> Nakit çıkış
            </button>
          </div>
        </div>
        {list.length > 0 && (
          <ul className="divide-y divide-line border-t border-line">
            {list.map((x) => (
              <Row key={x.id} x={x} onClick={() => onOpen(x)} />
            ))}
          </ul>
        )}
        {kasa.counted.length > SHOW && (
          <button type="button" onClick={() => setAll((v) => !v)} className="h-10 w-full border-t border-line text-[0.8125rem] font-semibold text-acc">
            {all ? "Daha az göster" : `Tüm kasa hareketleri (${kasa.counted.length})`}
          </button>
        )}
        {!kasa.counted.length && <p className="border-t border-line px-4 py-3 text-[0.8125rem] leading-snug text-mut">Bundan sonra girilen nakitler kasaya sayılır.</p>}
        {kasa.old.length > 0 && (
          <div className="border-t border-line">
            <button type="button" onClick={() => setOldOpen((v) => !v)} aria-expanded={oldOpen} className="flex h-11 w-full items-center gap-2 px-4 text-left text-[0.8125rem] font-semibold text-mut">
              <span className="min-w-0 flex-1">Önceki nakit girişleri ({kasa.old.length}) · kasaya sayılmadı</span>
              <Icon name="chev" className={`size-4 shrink-0 transition ${oldOpen ? "rotate-90" : ""}`} />
            </button>
            {oldOpen && (
              <ul className="divide-y divide-line border-t border-line">
                {kasa.old.map((x) => (
                  <li key={x.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[0.875rem] font-medium">{x.who || x.note}</b>
                      <small className="block truncate text-[0.75rem] text-mut">{[shortDate(x), x.who && x.note].filter(Boolean).join(" · ")}</small>
                    </span>
                    <span className="shrink-0 text-right">
                      <b className="block text-[0.875rem] font-semibold tabular-nums text-ok">+{money(x.amount)}</b>
                      <button type="button" onClick={() => onInclude(x, true)} className="mt-0.5 rounded-full bg-acc/10 px-2 py-0.5 text-[0.6875rem] font-semibold text-acc">
                        Nakit girdi olarak ekle
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// Hesaplar › Kişisel: kulüpten ayrı gelir, gider ve borçlar; bankadan aldığın ödemeler ayrı satırda (/payments)
export function PersonalBook({ book, payee, onAdd, onOpen }) {
  const [all, setAll] = useState(false);
  const rest = book.moves.filter((x) => !(x.dir === "debt" && !x.paid)); // ödenmemiş borçlar yukarıda ayrı
  const list = all ? rest : rest.slice(0, 20);
  return (
    <>
      <section className="mt-4">
        <div className={card}>
          <div className="bg-fg px-4 pb-4 pt-3.5 text-card">
            <p className="text-[0.75rem] font-semibold tracking-[.06em] text-card/70">KİŞİSEL · GELİR − GİDER</p>
            <p className="mt-0.5 text-[1.875rem] font-bold leading-tight tabular-nums tracking-tight">
              {book.net < 0 ? "−" : ""}
              {money(Math.abs(book.net))} <span className="text-[1rem] font-semibold text-card/75">TL</span>
            </p>
            <p className="mt-1 text-[0.75rem] tabular-nums text-card/75">
              Gelir +{money(book.in)} · Gider −{money(book.out)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 px-4 py-3">
            {[
              ["in", "Gelir", "plus", "bg-ok/10 text-ok"],
              ["out", "Gider", "up", "bg-rec/10 text-rec"],
              ["debt", "Borcum", "wallet", "bg-amber-500/15 text-amber-700"],
            ].map(([d, l, ic, cls]) => (
              <button key={d} type="button" onClick={() => onAdd(d)} className={`flex h-10 items-center justify-center gap-1.5 rounded-xl text-[0.875rem] font-semibold ${cls}`}>
                <Icon name={ic} className="size-4" /> {l}
              </button>
            ))}
          </div>
        </div>
      </section>

      {book.debts.length > 0 && (
        <section className="mt-6">
          <h2 className={title}>Borçlarım · −{money(book.debt)} TL</h2>
          <ul className={`${card} divide-y divide-line`}>
            {book.debts.map((x) => (
              <Row key={x.id} x={x} onClick={() => onOpen(x)} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className={title}>Bankadan aldıkların</h2>
        <div className={card}>
          <Link href="/payments" className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ok/10 text-ok">
              <Icon name="wallet" className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[0.9375rem] font-semibold">{payee.name || "Kişisel hesap"}</b>
              <small className="block truncate text-[0.75rem] text-mut">{payee.n} ödeme · bankadan, kasaya girmez</small>
            </span>
            {payee.sum > 0 && <b className="shrink-0 text-[0.9375rem] font-semibold tabular-nums text-ok">+{money(payee.sum)}</b>}
            <Icon name="chev" className="size-4 shrink-0 text-mut" />
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <h2 className={title}>Kişisel hareketler</h2>
        {rest.length ? (
          <div className={card}>
            <ul className="divide-y divide-line">
              {list.map((x) => (
                <Row key={x.id} x={x} onClick={() => onOpen(x)} />
              ))}
            </ul>
            {rest.length > list.length && (
              <button type="button" onClick={() => setAll(true)} className="h-10 w-full border-t border-line text-[0.8125rem] font-semibold text-acc">
                Tümünü göster ({rest.length})
              </button>
            )}
          </div>
        ) : (
          <p className={`${card} px-4 py-5 text-center text-[0.875rem] leading-snug text-mut`}>Kendi gelirin, giderin ve borçların burada, kulüpten ayrı durur.</p>
        )}
      </section>
    </>
  );
}

// Nakit / kişisel hareket satırı
function Row({ x, onClick }) {
  const debt = x.dir === "debt";
  const tone = debt ? (x.paid ? "bg-bg text-mut" : "bg-amber-500/15 text-amber-700") : x.amount > 0 ? "bg-ok/10 text-ok" : "bg-rec/10 text-rec";
  return (
    <li>
      <button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
        <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[0.9375rem] font-bold ${tone}`}>{debt ? <Icon name="wallet" className="size-4" /> : <Icon name="up" className={`size-4 ${x.amount > 0 ? "rotate-180" : ""}`} />}</span>
        <span className="min-w-0 flex-1">
          <b className={`block truncate text-[0.9375rem] font-medium ${x.paid ? "text-mut line-through" : ""}`}>{x.who || x.note}</b>
          <small className="block truncate text-[0.75rem] text-mut">{[shortDate(x), x.who && x.note, debt && (x.paid ? "Ödendi" : "Ödenmedi")].filter(Boolean).join(" · ")}</small>
        </span>
        <b className={`shrink-0 text-[0.9375rem] font-semibold tabular-nums ${x.paid ? "text-mut" : x.amount > 0 ? "text-ok" : debt ? "text-amber-700" : "text-rec"}`}>
          {x.amount > 0 ? "+" : "−"}
          {money(Math.abs(x.amount))}
        </b>
      </button>
    </li>
  );
}
