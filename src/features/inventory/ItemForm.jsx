"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Loader } from "@/components/ui/Loader";
import { FILE_LABELS, prepFile, sizeText } from "./invFiles";
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
// Belgeler ve fotoğraflar: kaydedilmiş olanlar açılır/silinir; yeni seçilenler (pend) Kaydet'te yüklenir.
// onRead(dosya, form): yapay zeka fotoğrafı/belgeyi okur, boş alanları doldurur. onFile(meta): kayıtlı dosyayı açar.
export function ItemForm({ start, cats, inv, onSave, onDelete, onOpen, onKit, onRead, onFile }) {
  const [x, setX] = useState(start);
  const [pend, setPend] = useState([]);
  const [busy, setBusy] = useState(""); // "read" | ""
  const [msg, setMsg] = useState("");
  const pick = useRef(null);
  const readNext = useRef(false); // seçilen dosya hemen okunsun mu ("Fotoğraf ya da belgeden doldur")

  const read = async (f) => {
    if (!onRead) return;
    setBusy("read");
    setMsg("");
    try {
      const r = await onRead(f, x);
      if (r?.fields) {
        setX((v) => {
          const out = { ...v };
          for (const [k, val] of Object.entries(r.fields)) {
            if (val == null || val === "") continue;
            if (k === "note") out.note = v.note && !v.note.includes(val) ? `${v.note}\n${val}` : v.note || val;
            else if (!v[k] || v[k] === "good" || (k === "cat" && !v.id) || (k === "name" && !v.id) || (k === "qty" && !v.id)) out[k] = val;
          }
          return out;
        });
      }
      if (r?.label) setPend((l) => l.map((p) => (p.tmp === f.tmp ? { ...p, label: r.label } : p)));
      setMsg(r?.message || (r?.fields ? "Bilgileri doldurdum, kontrol edip kaydet." : "Okuyamadım; bilgileri elle yaz."));
    } catch (e) {
      setMsg(e?.message || "Okunamadı");
    } finally {
      setBusy("");
    }
  };
  const add = async (e) => {
    const list = [...(e.target.files || [])];
    e.target.value = "";
    const now = readNext.current;
    readNext.current = false;
    for (const file of list.slice(0, 5)) {
      try {
        const f = { ...(await prepFile(file)), tmp: Math.random().toString(36).slice(2) };
        setPend((l) => [...l, f]);
        if (now) await read(f);
      } catch (err) {
        setMsg(err?.message || "Dosya eklenemedi");
      }
    }
  };
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
        if (x.name.trim()) onSave(x, pend);
      }}
    >
      <input ref={pick} type="file" accept="image/*,application/pdf" multiple hidden onChange={add} />
      {!start.id && onRead && (
        <button
          type="button"
          disabled={!!busy}
          onClick={() => ((readNext.current = true), pick.current?.click())}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-acc/10 text-[0.9375rem] font-semibold text-acc active:scale-[.98] disabled:opacity-60"
        >
          {busy === "read" ? <Loader size="sm" className="text-current" /> : <Icon name="camera" className="size-5" />}
          {busy === "read" ? "Okunuyor…" : "Fotoğraf ya da belgeden doldur"}
        </button>
      )}
      {!start.id && msg && <p className="text-[0.8125rem] text-mut">{msg}</p>}
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
      <div>
        <span className={lab}>Belgeler ve fotoğraflar (kütük belgesi, ruhsat, fatura…)</span>
        {(x.files?.length > 0 || pend.length > 0) && (
          <ul className="mt-1 divide-y divide-line/70 rounded-xl bg-bg">
            {(x.files || []).map((f) => (
              <FileRow
                key={f.id}
                f={f}
                onOpen={() => onFile?.(f)}
                onLabel={(label) => setX((v) => ({ ...v, files: v.files.map((y) => (y.id === f.id ? { ...y, label } : y)) }))}
                onDrop={() => window.confirm(`“${f.label || f.name}” silinsin mi? (Kaydet'e basınca silinir)`) && setX((v) => ({ ...v, files: v.files.filter((y) => y.id !== f.id) }))}
              />
            ))}
            {pend.map((f) => (
              <FileRow
                key={f.tmp}
                f={{ ...f, size: f.blob.size }}
                pending
                onRead={onRead && !busy ? () => read(f) : null}
                onLabel={(label) => setPend((l) => l.map((y) => (y.tmp === f.tmp ? { ...y, label } : y)))}
                onDrop={() => setPend((l) => l.filter((y) => y.tmp !== f.tmp))}
              />
            ))}
          </ul>
        )}
        {start.id && msg && <p className="mt-1 text-[0.8125rem] text-mut">{msg}</p>}
        <button type="button" onClick={() => pick.current?.click()} className="mt-1.5 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-bg text-[0.875rem] font-semibold text-acc active:scale-[.98]">
          <Icon name="paperclip" className="size-4" />
          Fotoğraf ya da belge ekle
        </button>
      </div>
      <Button type="submit" disabled={!x.name.trim() || busy === "read"}>
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

// Belge satırı: tür (seçilir), ad ve boyut; aç, oku (yapay zeka), sil
function FileRow({ f, pending, onOpen, onRead, onLabel, onDrop }) {
  const labels = FILE_LABELS.includes(f.label) || !f.label ? FILE_LABELS : [f.label, ...FILE_LABELS];
  return (
    <li className="flex items-center gap-2 py-1.5 pl-2.5 pr-1">
      <Icon name={f.type === "application/pdf" ? "clip" : "image"} className="size-4 shrink-0 text-mut" />
      <span className="min-w-0 flex-1">
        <select value={f.label || ""} onChange={(e) => onLabel(e.target.value)} className="max-w-full bg-transparent text-[0.875rem] font-medium outline-none">
          {!f.label && <option value="">Tür seç</option>}
          {labels.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <small className="block truncate text-[0.6875rem] text-mut">
          {f.name} · {sizeText(f.size)}
          {pending ? " · Kaydet'te yüklenir" : ""}
        </small>
      </span>
      {onRead && (
        <button type="button" onClick={onRead} className="h-8 shrink-0 rounded-lg px-2 text-[0.75rem] font-semibold text-acc active:bg-card">
          Bilgileri oku
        </button>
      )}
      {onOpen && (
        <button type="button" onClick={onOpen} className="h-8 shrink-0 rounded-lg px-2 text-[0.75rem] font-semibold text-acc active:bg-card">
          Aç
        </button>
      )}
      <button type="button" onClick={onDrop} aria-label="Sil" className="grid size-8 shrink-0 place-items-center rounded-lg text-mut active:bg-card">
        <Icon name="x" className="size-4" />
      </button>
    </li>
  );
}
