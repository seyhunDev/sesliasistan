"use client";

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { message, updateAthlete } from "./data";
import { EXPIRY, EXPIRY_KEYS } from "@/lib/expiry";

const BLOOD = ["A Rh+", "A Rh-", "B Rh+", "B Rh-", "AB Rh+", "AB Rh-", "0 Rh+", "0 Rh-"];
const field = "h-11 w-full rounded-xl bg-bg px-3.5 text-[0.9375rem] outline-none focus:bg-card focus:ring-1 focus:ring-acc";

// Yarış evrakı için gereken ek bilgiler (yarış evrakı sayfası da bunu kullanır)
export const DOC_TEXT = [
  ["licenseNo", "Lisans no (35-4403-…)"],
  ["studentSchool", "Okul adı (belgede yazacak)"],
  ["studentSchoolPlace", "Okulun ilçe-ili (DİKİLİ-İZMİR)"],
  ["studentNo", "Okul numarası", "numeric"],
  ["studentClass", "Sınıf / şube (9/B)"],
  ["studentBirthPlace", "Doğum yeri"],
  ["studentPhone", "Sporcu telefonu", "tel"],
  ["fatherName", "Baba adı"],
  ["motherName", "Anne adı"],
  ["parentTc", "Veli T.C. kimlik no", "numeric"],
  ["parentRelation", "Velinin yakınlığı (ANNE / BABA)"],
  ["tyfNo", "TYF sicil no (katılım formu)", "numeric"],
  ["sailNo", "Yelken no (216382)", "numeric"],
];

// Düzenlenebilen alanlar (kulüp uygulamasındaki adlarıyla)
const TEXT = [
  ["Sporcu", [["studentName", "Ad soyad"], ["studentTc", "T.C. kimlik no", "numeric"], ["studentHealthNotes", "Sağlık notu (alerji, astım…)"]]],
  ["Veli ve iletişim", [["parentName", "Veli ad soyad"], ["parentPhone", "Veli telefonu", "tel"], ["parentEmail", "Veli e-postası", "email"], ["parentAddress", "Adres"]]],
  ["Acil durum", [["emergencyContactName", "Aranacak kişi"], ["emergencyContactPhone", "Telefon", "tel"]]],
  ["Eğitim ve spor", [["studentSchoolAndClass", "Okul / sınıf"], ["otherLicensedSports", "Diğer lisanslı sporlar"], ["swimmingSkill", "Yüzme becerisi"], ["seaFear", "Deniz korkusu"]]],
  ["Yarış evrakı", DOC_TEXT],
];
const ALL = ["studentGender", "studentBloodType", "currentClassId", "currentCoachId", "status", "studentBirthDate", ...EXPIRY_KEYS, ...TEXT.flatMap(([, f]) => f.map(([k]) => k))];

const initial = (a) => ({
  ...Object.fromEntries(ALL.map((k) => [k, a[k] ?? ""])),
  status: a.status === "active" ? "active" : "passive",
  studentBirthDate: a.studentBirthDate ? a.studentBirthDate.slice(0, 10) : "",
});

// Tek sporcu düzenleme. Yalnızca değişen alanlar yazılır; sınıf/antrenör/durum değişimi geçmişe işlenir.
export function EditAthlete({ athlete, names, open, onClose, onSaved }) {
  return (
    <Sheet open={open} onClose={onClose} title="Sporcuyu düzenle">
      {open && athlete && <Form key={athlete.id} a={athlete} names={names} onClose={onClose} onSaved={onSaved} />}
    </Sheet>
  );
}

function Form({ a, names, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(() => initial(a));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const start = initial(a);
  const patch = Object.fromEntries(ALL.filter((k) => f[k] !== start[k]).map((k) => [k, typeof f[k] === "string" ? f[k].trim() : f[k]]));

  const save = async () => {
    if (!f.studentName.trim()) return toast("Ad soyad boş olamaz");
    if (f.studentTc && !/^\d{11}$/.test(f.studentTc.trim())) return toast("T.C. kimlik no 11 haneli olmalı");
    if (f.parentTc && !/^\d{11}$/.test(f.parentTc.trim())) return toast("Veli T.C. kimlik no 11 haneli olmalı");
    if (!Object.keys(patch).length) return onClose();
    setBusy(true);
    try {
      await updateAthlete(a.id, a, patch, names);
      toast("Kaydedildi");
      onSaved?.();
    } catch (e) {
      toast(message(e));
    }
    setBusy(false);
  };

  const Sel = ({ k, label, children }) => (
    <label className="block">
      <span className="mb-1 block text-[0.75rem] text-mut">{label}</span>
      <select value={f[k]} onChange={set(k)} className={field}>{children}</select>
    </label>
  );

  return (
    <div className="pb-2">
      <div className="grid grid-cols-2 gap-2">
        {Sel({ k: "currentClassId", label: "Yelken sınıfı", children: [<option key="" value="">Atanmamış</option>, ...names.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)] })}
        {Sel({ k: "currentCoachId", label: "Antrenör", children: [<option key="" value="">Atanmamış</option>, ...names.coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)] })}
        {Sel({ k: "status", label: "Durum", children: [<option key="a" value="active">Aktif</option>, <option key="p" value="passive">Arşivde</option>] })}
        <label className="block">
          <span className="mb-1 block text-[0.75rem] text-mut">Doğum tarihi</span>
          <input type="date" value={f.studentBirthDate} onChange={set("studentBirthDate")} className={field} />
        </label>
        {Sel({ k: "studentGender", label: "Cinsiyet", children: [<option key="" value="">—</option>, <option key="e" value="Erkek">Erkek</option>, <option key="k" value="Kız">Kız</option>] })}
        {Sel({ k: "studentBloodType", label: "Kan grubu", children: [<option key="" value="">—</option>, ...BLOOD.map((b) => <option key={b} value={b}>{b}</option>)] })}
      </div>

      {TEXT.map(([title, fields]) => (
        <fieldset key={title} className="mt-4">
          <legend className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-mut">{title}</legend>
          <div className="space-y-2">
            {fields.map(([k, ph, mode]) => (
              <input
                key={k}
                value={f[k]}
                onChange={set(k)}
                placeholder={ph}
                aria-label={ph}
                inputMode={mode === "numeric" ? "numeric" : mode === "tel" ? "tel" : mode === "email" ? "email" : undefined}
                maxLength={k === "studentTc" || k === "parentTc" ? 11 : 200}
                className={field}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-mut">Belge bitiş tarihleri</legend>
        <div className="grid grid-cols-1 gap-2">
          {EXPIRY.map(([k, label]) => (
            <label key={k} className="block">
              <span className="mb-1 block text-[0.75rem] text-mut">{label}</span>
              <input type="date" value={f[k]} onChange={set(k)} className={field} />
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[0.75rem] text-mut">Bitişe 30 gün kala Sporcular sayfasında ve yarış evrakında uyarı çıkar.</p>
      </fieldset>

      <div className="sticky bottom-0 -mx-5 mt-4 grid grid-cols-2 gap-2 bg-card px-5 pt-2">
        <button onClick={onClose} className="h-12 rounded-xl bg-bg text-[0.9375rem] font-semibold">Vazgeç</button>
        <button onClick={save} disabled={busy} className="h-12 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white disabled:opacity-50 active:scale-[.98]">
          {busy ? "Kaydediliyor…" : Object.keys(patch).length ? "Kaydet" : "Kapat"}
        </button>
      </div>
    </div>
  );
}
