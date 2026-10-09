"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { INCOME_CATS, words } from "@/lib/dues";
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

// Hesaplar › "+": elle nakit gelir. Tür seçilir (Aidat, Bağış, eğitimler, Diğer → elle yazılır), kişi sporculardan seçilir ya
// da yazılır, tutar, tarih, not. Aidat seçilince sporcu ve ay sorulur; ödeme Aidatlar'da o ay ödendi olarak görünür.
export function AddIncome({ open, onClose, roster = [], cfg = {}, onSave }) {
  const today = todayStr();
  const [cat, setCat] = useState("Aidat");
  const [other, setOther] = useState("");
  const [who, setWho] = useState("");
  const [athleteId, setAthleteId] = useState("");
  const [ym, setYm] = useState(today.slice(0, 7));
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [find, setFind] = useState("");
  const [busy, setBusy] = useState(false);

  const isDues = cat === "Aidat";
  const people = [...roster].sort((a, b) => String(a.studentName).localeCompare(String(b.studentName), "tr"));
  const shown = find.trim() ? people.filter((a) => words(find).every((w) => words(a.studentName).some((x) => x.startsWith(w)))) : people;
  const fee = (id) => Number(cfg?.fees?.[id]) || Number(cfg?.fee) || 0;
  const amt = Number(String(amount).replace(/\./g, "").replace(",", "."));
  const name = isDues ? roster.find((a) => a.id === athleteId)?.studentName || "" : who.trim();
  const finalCat = cat === "Diğer" ? other.trim() || "Diğer" : cat;
  const ok = amt > 0 && (isDues ? !!athleteId && !!ym : !!name) && !busy;

  const pick = (a) => {
    setAthleteId(a.id);
    setWho(a.studentName);
    if (isDues && !amount && fee(a.id)) setAmount(String(fee(a.id)));
  };
  const save = async () => {
    if (!ok) return;
    setBusy(true);
    const r = await onSave({ cat: finalCat, who: name, athleteId: isDues ? athleteId : "", ym: isDues ? ym : "", amount: amt, date, note: note.trim() });
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
    <Sheet open={open} onClose={onClose} title="Nakit gelir ekle">
      <div className="space-y-4 overflow-y-auto overflow-x-hidden px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <div>
          <span className={label}>Tür</span>
          <div className="flex flex-wrap gap-1.5">
            {INCOME_CATS.map((c) => (
              <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`h-9 rounded-full px-3.5 text-[0.8125rem] font-semibold ${cat === c ? "bg-acc text-white" : "bg-bg text-fg"}`}>
                {c}
              </button>
            ))}
          </div>
          {cat === "Diğer" && <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="Türü yaz (ör. Tekne kiralama)" className={`${field} mt-2`} />}
        </div>

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
          <label className="block">
            <span className={label}>Kimden</span>
            <input value={who} onChange={(e) => setWho(e.target.value)} list="income-people" placeholder="Ad Soyad" className={field} />
            <datalist id="income-people">
              {people.map((a) => (
                <option key={a.id} value={a.studentName} />
              ))}
            </datalist>
          </label>
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
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={isDues ? "" : "ör. 4 kişilik grup, 2 ders"} className={field} />
        </label>

        <button type="button" disabled={!ok} onClick={save} className="h-12 w-full rounded-2xl bg-acc text-[0.9375rem] font-semibold text-white disabled:opacity-50">
          {busy ? "Kaydediliyor…" : amt > 0 ? `${money(amt)} TL nakit gelir ekle` : "Ekle"}
        </button>
      </div>
    </Sheet>
  );
}
