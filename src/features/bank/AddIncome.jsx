"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { INCOME_CATS, words } from "@/lib/dues";
import { OUT_CATS, PERSONAL_CATS } from "@/lib/cashbook";
import { money } from "@/lib/bankSheet";
import { todayStr } from "@/lib/utils/format";

const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const monthName = (ym) => `${AY[Number(ym.slice(5)) - 1]} ${ym.slice(0, 4)}`;
// Son 12 ay + gelecek 2 ay, en yeni önce
const monthsAround = (today) => {
  const [y, m] = today.slice(0, 7).split("-").map(Number);
  return Array.from({ length: 15 }, (_, i) => new Date(Date.UTC(y, m - 1 + 2 - i, 15)).toISOString().slice(0, 7));
};
const field = "h-11 w-full min-w-0 rounded-xl bg-bg px-3.5 text-[1rem] outline-none";
const label = "mb-1 block text-[0.8125rem] font-semibold text-mut";

// Yön seçimi: kulüpte Nakit giriş / Nakit çıkış, kişisel defterde Gelir / Gider / Borcum
const DIRS = {
  club: [
    ["in", "Nakit giriş"],
    ["out", "Nakit çıkış"],
  ],
  personal: [
    ["in", "Gelir"],
    ["out", "Gider"],
    ["debt", "Borcum"],
  ],
};
const catsOf = (book, dir) => (book === "personal" ? PERSONAL_CATS[dir] : dir === "out" ? OUT_CATS : INCOME_CATS);
const TITLE = { club: { in: "Nakit giriş", out: "Nakit çıkış" }, personal: { in: "Kişisel gelir", out: "Kişisel gider", debt: "Borcum" } };
const WHO = { club: { in: "Kimden", out: "Kime verildi (isteğe bağlı)" }, personal: { in: "Kimden (isteğe bağlı)", out: "Nereye (isteğe bağlı)", debt: "Kime borçlusun" } };

// Hesaplar › "+": elle nakit giriş/çıkış (kulüp kasası) ya da kişisel gelir/gider/borç. Tür seçilir (Diğer → elle yazılır),
// kişi Kişiler'den (çalışanlar, aile, diğer; sporcular değil) ya da daha önce yazılan adlardan seçilir veya yazılır (yeni ad
// kaydedince seçeneklere eklenir, × ile silinir), tutar, tarih, not. Kulüpte Aidat seçilince sporcu ve ay sorulur; ödeme
// Aidatlar'da o ay ödendi görünür.
// edit: { incomeId, dir, cat, who, amount, day, memo } var olan kaydı düzeltir (aynı form, değerleri dolu)
export function AddIncome({ open, onClose, roster = [], cfg = {}, onSave, book = "club", dir: startDir = "in", options = [], onDropName, edit = null }) {
  const today = todayStr();
  const [dir, setDir] = useState(startDir);
  const [cat, setCat] = useState(catsOf(book, startDir)[0]);
  const [other, setOther] = useState("");
  const [who, setWho] = useState("");
  const [athleteId, setAthleteId] = useState("");
  const [ym, setYm] = useState(today.slice(0, 7));
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  // Her açılışta seçilen yönle (düzenlemede kaydın değerleriyle) başlar (render sırasında, efektsiz)
  const want = open ? `${book}:${startDir}:${edit?.incomeId || ""}` : "";
  const [seen, setSeen] = useState(want);
  if (want !== seen) {
    setSeen(want);
    if (want && edit) {
      const d = edit.dir || startDir;
      const known = catsOf(book, d).includes(edit.cat);
      setDir(d);
      setCat(known ? edit.cat : "Diğer");
      setOther(known ? "" : edit.cat || "");
      setWho(edit.who || "");
      setAmount(String(Math.abs(edit.amount || 0)).replace(".", ","));
      setDate(edit.day || today);
      setNote(edit.memo || "");
    } else if (want) {
      setDir(startDir);
      setCat(catsOf(book, startDir)[0]);
    }
  }
  const pickDir = (d) => (setDir(d), setCat(catsOf(book, d)[0]));
  const [find, setFind] = useState("");
  const [busy, setBusy] = useState(false);

  const isDues = !edit && book === "club" && dir === "in" && cat === "Aidat"; // aidat kaydı Aidatlar'dan düzelir
  const needWho = (book === "club" && dir === "in") || dir === "debt"; // fişsiz kasa çıkışı kişisiz de yazılır
  const opts = who.trim() ? options.filter((o) => words(who).every((w) => words(o.name).some((x) => x.startsWith(w))) && o.name !== who.trim()) : options;
  const people = [...roster].sort((a, b) => String(a.studentName).localeCompare(String(b.studentName), "tr"));
  const shown = find.trim() ? people.filter((a) => words(find).every((w) => words(a.studentName).some((x) => x.startsWith(w)))) : people;
  const fee = (id) => Number(cfg?.fees?.[id]) || Number(cfg?.fee) || 0;
  const amt = Number(String(amount).replace(/\./g, "").replace(",", "."));
  const name = isDues ? roster.find((a) => a.id === athleteId)?.studentName || "" : who.trim();
  const finalCat = cat === "Diğer" ? other.trim() || "Diğer" : cat;
  const ok = amt > 0 && (isDues ? !!athleteId && !!ym : !!name || !needWho) && !busy;

  const pick = (a) => {
    setAthleteId(a.id);
    setWho(a.studentName);
    if (isDues && !amount && fee(a.id)) setAmount(String(fee(a.id)));
  };
  const save = async () => {
    if (!ok) return;
    setBusy(true);
    const r = await onSave({ ...(edit ? { incomeId: edit.incomeId } : {}), book, dir, cat: finalCat, who: name, athleteId: isDues ? athleteId : "", ym: isDues ? ym : "", amount: amt, date, note: note.trim() });
    setBusy(false);
    if (r !== false) {
      setAmount("");
      setNote("");
      setAthleteId("");
      setWho("");
      setFind("");
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={book === "personal" ? "Kişisel defter" : "Kasa (nakit)"}>
      <div className="space-y-4 overflow-y-auto overflow-x-hidden px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div className={`grid gap-1 rounded-xl bg-line/50 p-1 ${DIRS[book].length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {DIRS[book].map(([k, l]) => (
            <button key={k} type="button" onClick={() => pickDir(k)} aria-pressed={dir === k} className={`h-9 rounded-lg text-[0.875rem] font-semibold ${dir === k ? (k === "in" ? "bg-card text-ok shadow-[0_1px_2px_rgba(38,40,44,.08)]" : "bg-card text-rec shadow-[0_1px_2px_rgba(38,40,44,.08)]") : "text-mut"}`}>
              {l}
            </button>
          ))}
        </div>
        {dir !== "debt" && (
        <div>
          <span className={label}>Tür</span>
          <div className="flex flex-wrap gap-1.5">
            {catsOf(book, dir).filter((c) => !edit || c !== "Aidat").map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold ${cat === c ? "bg-acc text-white" : "bg-bg text-fg"}`}>
                {c}
              </button>
            ))}
          </div>
          {cat === "Diğer" && <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Türü yaz (ör. Tekne kiralama)" className={`${field} mt-2`} />}
        </div>
        )}

        {isDues ? (
          <>
            <div>
              <span className={label}>Sporcu</span>
              {roster.length ? (
                <>
                  <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Sporcu ara" className={field} />
                  <ul className="mt-2 max-h-48 divide-y divide-line overflow-y-auto rounded-xl bg-bg">
                    {shown.map((a) => (
                      <li key={a.id}>
                        <button type="button" onClick={() => pick(a)} className="flex h-11 w-full items-center gap-2 px-3.5 text-left text-[0.9375rem]">
                          <span className="min-w-0 flex-1 truncate">{a.studentName}</span>
                          {fee(a.id) > 0 && <span className="shrink-0 text-[0.75rem] tabular-nums text-mut">{money(fee(a.id))} TL</span>}
                          {athleteId === a.id && <Icon name="check" className="size-4 shrink-0 text-acc" />}
                        </button>
                      </li>
                    ))}
                    {!shown.length && <li className="px-3.5 py-3 text-[0.875rem] text-mut">Bulunamadı.</li>}
                  </ul>
                </>
              ) : (
                <p className="rounded-xl bg-bg px-3.5 py-3 text-[0.875rem] leading-snug text-mut">Sporcu listesi yok. Aidatlar sayfasını bir kez açınca sporcular buraya gelir.</p>
              )}
            </div>
            <label className="block">
              <span className={label}>Hangi ayın aidatı</span>
              <select value={ym} onChange={(e) => setYm(e.target.value)} className={`${field} appearance-none`}>
                {monthsAround(today).map((m) => (
                  <option key={m} value={m}>
                    {monthName(m)}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <div>
            <span className={label}>{WHO[book][dir]}</span>
            <input value={who} onChange={(e) => setWho(e.target.value)} placeholder={needWho ? "Ad Soyad" : ""} aria-label={WHO[book][dir]} className={field} />
            {opts.length > 0 && (
              <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                {opts.slice(0, 30).map((o) => (
                  <span key={o.name} className="flex h-8 items-center rounded-full bg-bg text-[0.8125rem] font-semibold">
                    <button type="button" onClick={() => setWho(o.name)} className={`h-8 ${o.saved ? "pl-3 pr-1" : "px-3"}`}>
                      {o.name}
                    </button>
                    {o.saved && onDropName && (
                      <button type="button" onClick={() => onDropName(o.name)} aria-label={`${o.name} seçeneklerden sil`} className="flex size-8 items-center justify-center text-mut">
                        <Icon name="x" className="size-3.5" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="block min-w-0">
            <span className={label}>Tutar (TL)</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0" className={`${field} tabular-nums`} />
          </label>
          <label className="block min-w-0">
            <span className={label}>Tarih</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value || today)} className={`${field} appearance-none`} />
          </label>
        </div>

        <label className="block">
          <span className={label}>Not (isteğe bağlı)</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={isDues ? "" : dir === "out" ? "ör. tekne yakıtı" : dir === "debt" ? "ör. ay sonu ödenecek" : "ör. 4 kişilik grup, 2 ders"} className={field} />
        </label>

        <button type="button" disabled={!ok} onClick={save} className="h-12 w-full rounded-2xl bg-acc text-[0.9375rem] font-semibold text-white disabled:opacity-50">
          {busy ? "Kaydediliyor…" : edit ? "Kaydet" : amt > 0 ? `${money(amt)} TL · ${TITLE[book][dir]} ekle` : "Ekle"}
        </button>
      </div>
    </Sheet>
  );
}
