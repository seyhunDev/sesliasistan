"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { OWNERS, STATES, UNITS, ageText, hasSailNo, isBoat, isPart, itemLabel, kitOf } from "./invModel";

export const input =
  "h-11 w-full min-w-0 max-w-full rounded-xl border border-transparent bg-bg px-3 text-base text-fg outline-none transition placeholder:text-mut/70 focus:border-acc focus:bg-card";
// iPhone tarih kutusu kendi genişliğini dayatıp formu yana taşırıyordu
const dateFix = "appearance-none [&::-webkit-date-and-time-value]:text-left";
const lab = "block text-[0.75rem] font-medium text-mut";

function F({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className={lab}>{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

// Ürün formu: her alan düzenlenebilir (numara ve eklenme tarihi dahil).
// Takım parçasında (salma, dümen, direk, bumba, yelken) bağlı olduğu tekne; teknede takımı (aç, eksikleri oluştur).
export function ItemForm({ start, cats, inv, onSave, onDelete, onOpen, onKit }) {
  const [x, setX] = useState(start);
  const set = (k) => (e) => setX((v) => ({ ...v, [k]: e.target.value }));
  const step = (d) => setX((v) => ({ ...v, qty: Math.max(0, (Number(v.qty) || 0) + d) }));
  const catList = cats.includes(x.cat) ? cats : [...cats, x.cat];
  const boats = (inv?.items || []).filter((y) => isBoat(y) && y.id !== x.id);
  const kit = x.id && isBoat(x) && inv ? kitOf(inv, x) : null;

  return (
    <form
      className="w-full min-w-0 space-y-3 overflow-x-hidden pb-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (x.name.trim()) onSave(x);
      }}
    >
      <div className="flex gap-2">
        <F label="No" className="w-24 shrink-0">
          <input value={x.no} onChange={set("no")} maxLength={20} className={`${input} tabular-nums`} />
        </F>
        <F label="Ürün" className="min-w-0 flex-1">
          <input value={x.name} onChange={set("name")} maxLength={80} placeholder="ör. Optimist teknesi" className={input} autoFocus={!start.id} />
        </F>
      </div>
      <div className="flex gap-2">
        <F label="Kategori" className="min-w-0 flex-1">
          <select value={x.cat} onChange={set("cat")} className={input}>
            {catList.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </F>
        <F label="Durum" className="min-w-0 flex-1">
          <select value={x.state} onChange={set("state")} className={input}>
            {STATES.map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </F>
      </div>
      <div>
        <span className={lab}>Sahibi</span>
        <div className="mt-1 flex gap-2">
          {OWNERS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setX((v) => ({ ...v, owner: k }))} aria-pressed={x.owner === k} className={`h-11 flex-1 rounded-xl text-[0.875rem] font-semibold ${x.owner === k ? "bg-deep text-white" : "bg-bg text-fg"}`}>
              {l}
            </button>
          ))}
        </div>
        {x.owner === "private" && <input value={x.ownerName} onChange={set("ownerName")} maxLength={60} placeholder="Sahibinin adı (ör. sporcu ya da velisi)" className={`mt-2 ${input}`} />}
      </div>
      {(isPart(x) || x.parent) && (
        <F label="Bağlı olduğu tekne (takımı)">
          <select value={x.parent} onChange={set("parent")} className={input}>
            <option value="">Teknede değil (boşta)</option>
            {boats.map((b) => (
              <option key={b.id} value={b.id}>
                {itemLabel(b)}
                {b.sailNo ? ` · ${b.sailNo}` : ""}
              </option>
            ))}
          </select>
        </F>
      )}
      {kit && (
        <div className="rounded-xl bg-bg p-3">
          <span className={lab}>Takımı (ayrıca kendi kategorisinde de sayılır)</span>
          {kit.parts.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {kit.parts.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => onOpen?.(p)} className="h-8 rounded-full bg-card px-3 text-[0.8125rem] font-medium ring-1 ring-line active:scale-95">
                    {p.cat} · {p.no}
                    {p.damage ? " ⚠" : ""}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {kit.missing.length > 0 ? (
            <button type="button" onClick={() => onKit?.(x.id)} className="mt-2 h-9 w-full rounded-lg bg-card text-[0.8125rem] font-semibold text-acc ring-1 ring-line active:scale-[.98]">
              Eksik takımı ekle: {kit.missing.join(", ")}
            </button>
          ) : (
            <p className="mt-1.5 text-[0.8125rem] font-semibold text-ok">Tam takım</p>
          )}
        </div>
      )}
      <div className="flex items-end gap-2">
        <F label="Adet" className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <button type="button" onClick={() => step(-1)} className="grid size-11 shrink-0 place-items-center rounded-xl bg-bg text-[1.25rem] font-semibold active:scale-95" aria-label="Azalt">
              −
            </button>
            <input value={x.qty} onChange={set("qty")} inputMode="numeric" className={`${input} text-center tabular-nums`} />
            <button type="button" onClick={() => step(1)} className="grid size-11 shrink-0 place-items-center rounded-xl bg-bg text-[1.25rem] font-semibold active:scale-95" aria-label="Artır">
              +
            </button>
          </span>
        </F>
        <F label="Birim" className="w-28 shrink-0">
          <select value={x.unit} onChange={set("unit")} className={input}>
            {(UNITS.includes(x.unit) ? UNITS : [...UNITS, x.unit]).map((u) => (
              <option key={u}>{u}</option>
            ))}
          </select>
        </F>
      </div>
      <div className="flex gap-2">
        <F label={`Alım yılı${x.year ? ` · ${ageText(Number(x.year))}` : ""}`} className="min-w-0 flex-1">
          <input value={x.year || ""} onChange={set("year")} inputMode="numeric" maxLength={4} placeholder="ör. 2021" className={`${input} tabular-nums`} />
        </F>
        {(hasSailNo(x.cat) || x.sailNo) && (
          <F label="Yelken no" className="min-w-0 flex-1">
            <input value={x.sailNo} onChange={set("sailNo")} maxLength={20} placeholder="ör. TUR 1204" className={input} />
          </F>
        )}
      </div>
      <F label="Hasar / kusur">
        <input value={x.damage} onChange={set("damage")} maxLength={120} placeholder="ör. yelkende yırtık, baş tarafta çatlak" className={input} />
      </F>
      <div className="flex gap-2">
        <F label="Eklenme tarihi" className="min-w-0 flex-1">
          <input type="date" value={x.addedAt} onChange={set("addedAt")} className={`${input} ${dateFix}`} />
        </F>
        <F label="Son kontrol / bakım" className="min-w-0 flex-1">
          <input type="date" value={x.checkAt} onChange={set("checkAt")} className={`${input} ${dateFix}`} />
        </F>
      </div>
      <div className="flex gap-2">
        <F label="Marka / model" className="min-w-0 flex-1">
          <input value={x.brand} onChange={set("brand")} maxLength={60} className={input} />
        </F>
        <F label="Seri no" className="min-w-0 flex-1">
          <input value={x.serial} onChange={set("serial")} maxLength={40} className={input} />
        </F>
      </div>
      <div className="flex gap-2">
        <F label="Yer" className="min-w-0 flex-1">
          <input value={x.place} onChange={set("place")} maxLength={60} placeholder="Depo, hangar…" className={input} />
        </F>
        <F label="Kimde (zimmet)" className="min-w-0 flex-1">
          <input value={x.assignee} onChange={set("assignee")} maxLength={60} className={input} />
        </F>
      </div>
      <F label="Alış fiyatı (₺, birim)">
        <input value={x.price || ""} onChange={set("price")} inputMode="decimal" className={`${input} tabular-nums`} />
      </F>
      <F label="Not">
        <textarea value={x.note} onChange={set("note")} maxLength={600} rows={2} className={`${input} h-auto py-2`} />
      </F>
      <Button type="submit" disabled={!x.name.trim()}>
        Kaydet
      </Button>
      {onDelete && (
        <button type="button" onClick={onDelete} className="h-11 w-full rounded-xl text-[0.875rem] font-semibold text-rec active:bg-bg">
          Envanterden sil
        </button>
      )}
    </form>
  );
}
