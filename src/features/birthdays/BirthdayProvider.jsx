"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { leftLabel, nextBirthday } from "@/lib/agenda";
import { cap, todayStr } from "@/lib/utils/format";
import { matchPerson } from "@/lib/names";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const Ctx = createContext({ openBirthday: () => {} });
const longDay = (s) => new Date(`${s}T00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });
const box = "h-12 rounded-xl bg-bg px-3 text-base text-fg outline-none focus:bg-card focus:ring-1 focus:ring-acc";
const field = `${box} w-full`;

// Açılır liste (ok ve boşlukları globals.css'teki select kuralı çizer)
function Select({ value, onChange, label, className, children }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} className={`${box} pl-3.5 ${className}`}>
      {children}
    </select>
  );
}

// openBirthday({ edit: id } | { date: "YYYY-MM-DD" } | { prefill: { name, month, day, year } }) her yerden çağrılabilir
export function BirthdayProvider({ children }) {
  const [state, setState] = useState(null); // { id?, name, memberUid, month, day, year, note }
  const openBirthday = useCallback((o = {}) => setState({ key: Date.now(), ...o }), []);
  return (
    <Ctx.Provider value={{ openBirthday }}>
      {children}
      <BirthdaySheet key={state?.key || "none"} seed={state} onClose={() => setState(null)} />
    </Ctx.Provider>
  );
}
export const useBirthday = () => useContext(Ctx);

function BirthdaySheet({ seed, onClose }) {
  const { birthdays, members, isStaff, saveBirthday, removeWithUndo } = useData();
  const toast = useToast();
  const rec = seed?.edit ? birthdays.find((b) => b.id === seed.edit) : null;
  const d0 = seed?.date || todayStr();
  const pf = seed?.prefill; // cümleden gelen: { name, month, day, year }
  const [f, setF] = useState(() =>
    rec
      ? { name: rec.name, memberUid: rec.memberUid || "", month: rec.month, day: rec.day, year: rec.year || "", note: rec.note || "", phone: rec.phone || "" }
      : {
          name: pf?.name || "",
          memberUid: (pf?.name && !isStaff && members.find((m) => m.name === matchPerson(pf.name, members.map((x) => x.name)))?.uid) || "",
          month: pf?.month || +d0.slice(5, 7),
          day: pf?.day || +d0.slice(8, 10),
          year: pf?.year || "",
          note: "",
          phone: "",
        },
  );
  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const people = isStaff ? [] : members;
  const days = new Date(2024, f.month, 0).getDate(); // artık yıl: 29 Şubat seçilebilsin
  const next = nextBirthday({ month: f.month, day: Math.min(f.day, days), year: +f.year || null }, todayStr());
  const today = todayStr();

  function save() {
    const name = cap(f.name.trim());
    if (!name) return toast("Kimin doğum günü? Ad yaz ya da kişi seç");
    const year = String(f.year).trim();
    if (year && (!/^\d{4}$/.test(year) || +year > +today.slice(0, 4))) return toast("Doğum yılı 4 haneli olmalı (ör. 1968) ya da boş kalsın");
    saveBirthday({ ...f, name, day: Math.min(f.day, days), year: year || null }, rec?.id);
    toast(rec ? "Doğum günü güncellendi" : `${name} · doğum günü eklendi`);
    onClose();
  }

  return (
    <Sheet open={!!seed} onClose={onClose} title={rec ? "Doğum günü" : "Doğum günü ekle"}>
      <div className="space-y-4 pb-2">
        {/* Kimin */}
        <div>
          <label className="mb-1.5 block text-[0.8125rem] font-medium text-mut">Kimin?</label>
          {people.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {people.map((m) => {
                const on = f.memberUid === m.uid;
                return (
                  <button
                    key={m.uid}
                    type="button"
                    onClick={() => set(on ? { memberUid: "", name: "" } : { memberUid: m.uid, name: m.name })}
                    className={`rounded-full px-3 py-1.5 text-[0.875rem] font-medium transition active:scale-95 ${on ? "bg-acc text-white" : "bg-bg text-fg"}`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          )}
          <input
            value={f.name}
            onChange={(e) => set({ name: e.target.value, memberUid: "" })}
            placeholder={people.length ? "ya da yaz: Ayşe Teyze" : "Ad, ör. Ayşe Teyze"}
            autoCapitalize="words"
            className={field}
          />
        </div>

        {/* Tarih */}
        <div>
          <label className="mb-1.5 block text-[0.8125rem] font-medium text-mut">Tarih</label>
          <div className="flex gap-2">
            <Select value={Math.min(f.day, days)} onChange={(v) => set({ day: +v })} label="Gün" className="w-[4.75rem] shrink-0">
              {Array.from({ length: days }, (_, i) => (
                <option key={i + 1} value={i + 1}>{i + 1}</option>
              ))}
            </Select>
            <Select value={f.month} onChange={(v) => set({ month: +v })} label="Ay" className="min-w-0 flex-1">
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </Select>
            <input
              value={f.year}
              onChange={(e) => set({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
              inputMode="numeric"
              placeholder="Yıl"
              aria-label="Doğum yılı (isteğe bağlı)"
              className={`${box} w-[4.75rem] shrink-0 text-center`}
            />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[0.8125rem] text-mut">
            <Icon name="cake" className="size-4 text-acc" />
            {longDay(next.date)}
            {next.age ? ` · ${next.age} yaşına giriyor` : ""}
            {next.date === today ? " · bugün!" : ` · ${leftLabel(next.date, today)}`}
          </p>
        </div>

        <input
          value={f.phone}
          onChange={(e) => set({ phone: e.target.value })}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="Telefon (arama ve WhatsApp için)"
          className={field}
        />
        <input value={f.note} onChange={(e) => set({ note: e.target.value })} placeholder="Not (isteğe bağlı): hediye fikri…" className={field} />

        <div className="flex gap-2.5 pt-1">
          {rec && (
            <button
              type="button"
              onClick={() => {
                removeWithUndo("birthday", rec.id);
                onClose();
              }}
              className="h-12 flex-1 rounded-xl border border-line bg-card text-[0.9375rem] font-semibold text-rec active:scale-[.98]"
            >
              Sil
            </button>
          )}
          <button type="button" onClick={save} className="h-12 flex-[1.6] rounded-xl bg-acc text-[0.9375rem] font-semibold text-white active:scale-[.98]">
            Kaydet
          </button>
        </div>
      </div>
    </Sheet>
  );
}
