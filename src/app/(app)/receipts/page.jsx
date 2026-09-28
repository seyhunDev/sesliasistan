"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Tile } from "@/components/dashboard/Row";
import { useData } from "@/features/data/DataProvider";
import { useReceipt } from "@/features/receipts/ReceiptProvider";
import { CAT, CATS, DOC, PAYS, TLk, catOf, parseTL, totalOf } from "@/lib/receipts";
import { fdate, monthLabel, todayStr } from "@/lib/utils/format";

const inp = "h-11 w-full min-w-0 rounded-xl border border-line bg-card px-3 text-base text-fg outline-none transition focus:border-acc";
const shiftMonth = (m, n) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export default function ReceiptsPage() {
  const { receipts, loading } = useData();
  const { openReceipt } = useReceipt();
  const [month, setMonth] = useState(() => todayStr().slice(0, 7)); // "" = tüm zamanlar
  const [q, setQ] = useState("");
  const [cats, setCats] = useState([]);
  const [pay, setPay] = useState("");
  const [by, setBy] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [review, setReview] = useState(false);
  const [open, setOpen] = useState(false);

  const users = useMemo(() => [...new Set(receipts.map((r) => r.createdBy?.name).filter(Boolean))], [receipts]);
  const active = [pay, by, min, max, review].filter(Boolean).length;

  const list = useMemo(() => {
    const lo = parseTL(min);
    const hi = parseTL(max);
    const s = q.trim().toLocaleLowerCase("tr-TR");
    return receipts
      .filter((r) => {
        const t = totalOf(r);
        if (month && !(r.date || "").startsWith(month)) return false;
        if (cats.length && !cats.includes(r.cat)) return false;
        if (pay && r.pay !== pay) return false;
        if (by && r.createdBy?.name !== by) return false;
        if (review && r.status !== "review") return false;
        if (!Number.isNaN(lo) && t < lo) return false;
        if (!Number.isNaN(hi) && t > hi) return false;
        if (s && !`${r.merchant} ${r.docNo || ""} ${r.taxId || ""} ${r.note || ""} ${(r.items || []).map((i) => i.n).join(" ")}`.toLocaleLowerCase("tr-TR").includes(s)) return false;
        return true;
      })
      .sort((a, b) => `${b.date}${b.time || ""}`.localeCompare(`${a.date}${a.time || ""}`));
  }, [receipts, month, q, cats, pay, by, min, max, review]);

  const total = list.reduce((a, r) => a + totalOf(r), 0);
  const vat = list.reduce((a, r) => a + (r.totals?.vat || 0), 0);
  const byCat = {};
  list.forEach((r) => (byCat[r.cat] = (byCat[r.cat] || 0) + totalOf(r)));
  const catRank = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const pending = receipts.filter((r) => r.status === "review").length;

  const groups = {};
  list.forEach((r) => (groups[r.date] = [...(groups[r.date] || []), r]));
  const days = Object.keys(groups).sort().reverse();

  const toggleCat = (c) => setCats((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
  const clear = () => {
    setPay("");
    setBy("");
    setMin("");
    setMax("");
    setReview(false);
  };

  // Filtrelenmiş listeyi yazdırılabilir sayfada açar
  function print() {
    const title = `Fiş listesi · ${month ? monthLabel(month) : "Tüm zamanlar"}`;
    const f = [cats.length && `Kategori: ${cats.join(", ")}`, pay && `Ödeme: ${pay}`, by && `Ekleyen: ${by}`, q && `Arama: ${q}`, review && "Yalnızca kontrol bekleyenler"].filter(Boolean).join(" · ");
    const rows = [...list]
      .reverse()
      .map((r) => `<tr><td>${esc((r.date || "").split("-").reverse().join("."))}</td><td>${esc(r.merchant)}</td><td>${esc(r.taxId)}</td><td>${esc(r.docNo)}</td><td>${esc(DOC[r.docType] || "")}</td><td>${esc(r.cat)}</td><td>${esc(r.pay)}</td><td>${esc(r.createdBy?.name)}</td><td class="n">${TLk(r.totals?.vat)}</td><td class="n">${TLk(totalOf(r))}</td></tr>`)
      .join("");
    const cat = catRank.map(([c, v]) => `<tr><td>${esc(c)}</td><td class="n">${TLk(v)}</td></tr>`).join("");
    const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      body{font:12px -apple-system,Arial,sans-serif;color:#111;margin:24px}h1{font-size:18px;margin:0 0 4px}p{color:#555;margin:0 0 12px}
      table{width:100%;border-collapse:collapse;margin-bottom:18px}th,td{border-bottom:1px solid #ddd;padding:6px 4px;text-align:left}th{border-bottom:2px solid #111}
      .n{text-align:right;white-space:nowrap}tfoot td{font-weight:700;border-top:2px solid #111}
    </style></head><body><h1>${esc(title)}</h1><p>${esc(f || "Filtre yok")} · ${list.length} belge</p>
    <table><thead><tr><th>Tarih</th><th>İşletme</th><th>VKN</th><th>Belge no</th><th>Tür</th><th>Kategori</th><th>Ödeme</th><th>Ekleyen</th><th class="n">KDV</th><th class="n">Tutar</th></tr></thead>
    <tbody>${rows}</tbody><tfoot><tr><td colspan="8">Toplam</td><td class="n">${TLk(vat)}</td><td class="n">${TLk(total)}</td></tr></tfoot></table>
    <table style="width:auto;min-width:280px"><thead><tr><th>Kategori</th><th class="n">Tutar</th></tr></thead><tbody>${cat}</tbody></table>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return alert("Yazdırma penceresi açılamadı. Açılır pencere engelini kaldır.");
    w.document.write(html);
    w.document.close();
  }

  return (
    <main className="mx-auto max-w-[480px] px-5 pb-32 pt-3">
      {/* Başlık */}
      <div className="flex items-center justify-between py-1.5">
        <h1 className="text-[28px] font-bold tracking-tight">Fişler</h1>
        <div className="flex gap-2">
          <button onClick={print} disabled={!list.length} aria-label="Yazdır" className="grid size-9 place-items-center rounded-xl border border-line bg-card text-fg transition active:scale-95 disabled:opacity-40">
            <Icon name="print" className="size-[18px]" />
          </button>
          <button onClick={() => openReceipt()} aria-label="Fiş ekle" className="grid size-9 place-items-center rounded-xl bg-acc text-white transition active:scale-95">
            <Icon name="plus" className="size-5" />
          </button>
        </div>
      </div>

      {/* Ay seçici */}
      <div className="mt-2 flex items-center justify-between rounded-2xl border border-line bg-card p-1">
        <button onClick={() => setMonth((m) => shiftMonth(m || todayStr().slice(0, 7), -1))} aria-label="Önceki ay" className="grid size-10 place-items-center rounded-xl active:bg-bg">
          <Icon name="back" className="size-5" />
        </button>
        <button onClick={() => setMonth((m) => (m ? "" : todayStr().slice(0, 7)))} className="text-[15px] font-semibold capitalize">
          {month ? monthLabel(month) : "Tüm zamanlar"}
        </button>
        <button onClick={() => setMonth((m) => shiftMonth(m || todayStr().slice(0, 7), 1))} aria-label="Sonraki ay" className="grid size-10 place-items-center rounded-xl active:bg-bg">
          <Icon name="chev" className="size-5" />
        </button>
      </div>

      {/* Özet */}
      <div className="mt-3 rounded-2xl bg-acc p-4 text-white">
        <div className="text-[30px] font-bold leading-tight tracking-tight tabular-nums">{TLk(total)}</div>
        <p className="text-[13px] opacity-80">
          {list.length} belge · KDV {TLk(vat)}
        </p>
        {total > 0 && (
          <>
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/20">
              {catRank.map(([c, v]) => (
                <span key={c} style={{ width: `${(v / total) * 100}%`, background: catOf(c).color }} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] opacity-90">
              {catRank.slice(0, 3).map(([c, v]) => (
                <span key={c} className="flex items-center gap-1">
                  <i className="size-2 rounded-full" style={{ background: catOf(c).color }} /> {c} {TLk(v)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {pending > 0 && !review && (
        <button onClick={() => setReview(true)} className="mt-3 flex w-full items-center gap-2.5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-left text-amber-900 active:scale-[.98]">
          <Icon name="alert" className="size-5" />
          <span className="flex-1 text-[14.5px] font-semibold">{pending} fiş kontrol bekliyor</span>
          <Icon name="chev" className="size-4" />
        </button>
      )}

      {/* Arama + filtre */}
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-mut" />
          <input className={`${inp} pl-10`} type="search" placeholder="Ara" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Filtreler"
          className={`relative grid size-11 shrink-0 place-items-center rounded-xl border transition active:scale-95 ${open || active ? "border-acc bg-acc/10 text-acc" : "border-line bg-card"}`}
        >
          <Icon name="filter" className="size-5" />
          {active > 0 && <span className="absolute -right-1 -top-1 grid size-[18px] place-items-center rounded-full bg-acc text-[11px] font-bold text-white">{active}</span>}
        </button>
      </div>

      {open && (
        <div className="fade-in mt-2 space-y-2 rounded-2xl border border-line bg-card p-3">
          <div className="flex rounded-xl bg-bg p-[3px]">
            {["", ...PAYS].map((p) => (
              <button key={p || "all"} onClick={() => setPay(p)} className={`flex-1 rounded-[10px] py-2 text-sm font-semibold transition ${pay === p ? "bg-card shadow-sm" : "text-mut"}`}>
                {p || "Tümü"}
              </button>
            ))}
          </div>
          {users.length > 1 && (
            <select className={inp} value={by} onChange={(e) => setBy(e.target.value)} aria-label="Ekleyen">
              <option value="">Herkes</option>
              {users.map((u) => <option key={u}>{u}</option>)}
            </select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <input className={inp} inputMode="decimal" placeholder="En az ₺" value={min} onChange={(e) => setMin(e.target.value)} />
            <input className={inp} inputMode="decimal" placeholder="En çok ₺" value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
          <label className="flex items-center justify-between px-1 py-1 text-[15px]">
            Yalnızca kontrol bekleyenler
            <input type="checkbox" className="size-5 accent-[var(--acc)]" checked={review} onChange={(e) => setReview(e.target.checked)} />
          </label>
          {active > 0 && (
            <button onClick={clear} className="h-10 w-full text-sm font-semibold text-acc">
              Filtreleri temizle
            </button>
          )}
        </div>
      )}

      {/* Kategoriler */}
      <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {CATS.map((c) => {
          const on = cats.includes(c);
          return (
            <button key={c} onClick={() => toggleCat(c)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition active:scale-95 ${on ? "border-acc bg-acc text-white" : "border-line bg-card"}`}>
              <Icon name={CAT[c].icon} className="size-4" /> {c}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      {loading ? (
        <p className="py-14 text-center text-sm text-mut">Yükleniyor…</p>
      ) : days.length === 0 ? (
        <div className="py-14 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-card text-mut ring-1 ring-line">
            <Icon name="receipt" className="size-7" />
          </span>
          <p className="mt-3 text-[15px] text-mut">{receipts.length ? "Bu filtrede fiş yok" : "Henüz fiş yok"}</p>
          <button onClick={() => openReceipt()} className="mt-4 h-11 rounded-xl bg-acc px-5 text-[15px] font-semibold text-white active:scale-95">
            Fiş ekle
          </button>
        </div>
      ) : (
        days.map((d) => (
          <section key={d}>
            <h3 className="mb-2 mt-5 px-1 text-[13px] font-medium text-mut">{fdate(d)}</h3>
            <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
              {groups[d].map((r) => (
                <Link key={r.id} href={`/receipts/${r.id}`} className="flex items-center gap-3 px-4 py-3 transition active:bg-bg">
                  <Tile icon={catOf(r.cat).icon} />
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[15px] font-medium">{r.merchant || "İsimsiz"}</b>
                    <small className="block truncate text-[13px] text-mut">
                      {[r.time, r.cat, r.pay].filter(Boolean).join(" · ")}
                    </small>
                  </span>
                  {r.status === "review" && <span className="size-2 shrink-0 rounded-full bg-amber-500" aria-label="Kontrol bekliyor" />}
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">{TLk(totalOf(r))}</span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </main>
  );
}
