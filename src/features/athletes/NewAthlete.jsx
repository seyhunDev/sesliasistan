"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { createAthlete, message } from "./data";
import { linkMember } from "./memberSync";

const field = "h-11 w-full min-w-0 appearance-none rounded-xl bg-bg px-3.5 text-[0.9375rem] outline-none focus:bg-card focus:ring-1 focus:ring-acc";
const low = (s) => String(s || "").trim().toLocaleLowerCase("tr-TR");

// Yeni sporcu: kulüp listesine (diğer Firebase projesi) yazılır, Kişiler › Sporcular'a da bağlı kişi olarak eklenir.
// Diğer bilgiler sporcunun sayfasındaki Düzenle'den.
export function NewAthlete({ open, onClose, onSaved, names, athletes }) {
  return (
    <Sheet open={open} onClose={onClose} title="Sporcu ekle">
      {open && <Form names={names} athletes={athletes} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function Form({ names, athletes, onClose, onSaved }) {
  const toast = useToast();
  const { members, myUid } = useData();
  const [f, setF] = useState({ studentName: "", studentBirthDate: "", studentGender: "", currentClassId: "", currentCoachId: "", parentName: "", parentPhone: "" });
  const [busy, setBusy] = useState(false);
  const [dupOk, setDupOk] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const name = f.studentName.trim().replace(/\s+/g, " ");
  const dup = name ? athletes.find((a) => low(a.studentName) === low(name)) : null;

  const save = async () => {
    if (!name) return toast("Ad soyad yaz");
    if (dup && !dupOk) return setDupOk(true);
    setBusy(true);
    try {
      const fields = Object.fromEntries(Object.entries({ ...f, studentName: name }).map(([k, v]) => [k, v.trim()]));
      const id = await createAthlete(fields);
      let warn = "";
      try {
        await linkMember(myUid, members, { id, name, birth: fields.studentBirthDate });
      } catch {
        warn = " (Kişiler'e eklenemedi)";
      }
      toast(`${name} eklendi${warn}`);
      onSaved?.(id);
    } catch (e) {
      toast(e?.code === "permission-denied" ? "Kulüp hesabının sporcu ekleme izni yok." : message(e));
    }
    setBusy(false);
  };

  const Sel = ({ k, label, children }) => (
    <label className="block min-w-0">
      <span className="mb-1 block text-[0.75rem] text-mut">{label}</span>
      <select value={f[k]} onChange={set(k)} className={field}>{children}</select>
    </label>
  );

  return (
    <div className="pb-2">
      <label className="block">
        <span className="mb-1 block text-[0.75rem] text-mut">Ad soyad</span>
        <input value={f.studentName} onChange={(e) => (set("studentName")(e), setDupOk(false))} placeholder="Ad soyad" className={field} />
      </label>
      {dup && (
        <p className="mt-1.5 text-[0.8125rem] font-medium text-amber-700">
          Bu adla bir sporcu zaten var{dup.status === "active" ? "" : " (arşivde; sayfasından arşivden çıkarabilirsin)"}.{dupOk ? " Yine de eklemek için Ekle'ye bir kez daha bas." : ""}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block min-w-0">
          <span className="mb-1 block text-[0.75rem] text-mut">Doğum tarihi</span>
          <input type="date" value={f.studentBirthDate} onChange={set("studentBirthDate")} className={field} />
        </label>
        {Sel({ k: "studentGender", label: "Cinsiyet", children: [<option key="" value="">—</option>, <option key="e" value="Erkek">Erkek</option>, <option key="k" value="Kız">Kız</option>] })}
        {Sel({ k: "currentClassId", label: "Yelken sınıfı", children: [<option key="" value="">Atanmamış</option>, ...names.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)] })}
        {Sel({ k: "currentCoachId", label: "Antrenör", children: [<option key="" value="">Atanmamış</option>, ...names.coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)] })}
      </div>
      <div className="mt-3 space-y-2">
        <input value={f.parentName} onChange={set("parentName")} placeholder="Veli ad soyad" aria-label="Veli ad soyad" className={field} />
        <input value={f.parentPhone} onChange={set("parentPhone")} placeholder="Veli telefonu" aria-label="Veli telefonu" inputMode="tel" className={field} />
      </div>
      <p className="mt-2 text-[0.75rem] text-mut">Kulüp listesine ve Kişiler › Sporcular’a eklenir. T.C., okul ve diğer bilgiler sporcunun sayfasında Düzenle’den.</p>
      <div className="sticky bottom-0 -mx-5 mt-4 grid grid-cols-2 gap-2 bg-card px-5 pt-2">
        <button onClick={onClose} className="h-12 rounded-xl bg-bg text-[0.9375rem] font-semibold">Vazgeç</button>
        <button onClick={save} disabled={busy} className="h-12 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white disabled:opacity-50 active:scale-[.98]">
          {busy ? "Ekleniyor…" : "Ekle"}
        </button>
      </div>
    </div>
  );
}
