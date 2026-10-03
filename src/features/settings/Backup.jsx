"use client";

import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { backupName, backupSheets, clean } from "@/lib/backup";
import { todayStr } from "@/lib/utils/format";
import { Row } from "./ui";

// Ayarlar › Yedek indir (yalnız ana hesap). Planlar, görevler, notlar, fişler ve kişiler zaten cihazda (ek okuma yok);
// yarışlar ve etkinlikler bir kez okunur. Sporcu kişisel bilgileri (kulüp projesi) ve fiş görselleri yedeğe girmez.
export function BackupRow() {
  const { profile } = useAuth();
  const data = useData();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");

  async function collect() {
    const org = profile.orgId || profile.uid;
    const read = (c) => getDocs(collection(db, "orgs", org, c)).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []);
    const [races, events] = await Promise.all([read("races"), read("events")]);
    return { plans: data.plans, tasks: data.tasks, notes: data.notes, receipts: data.receipts, birthdays: data.birthdays, lessons: data.lessons, races, events, members: data.allMembers || [] };
  }
  const save = (blob, name) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 1000);
  };

  async function excel() {
    setBusy("xlsx");
    try {
      const all = await collect();
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      for (const [name, rows] of Object.entries(backupSheets(all, data.nameOf))) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
      XLSX.writeFile(wb, backupName(todayStr(), "xlsx"));
      toast("Excel yedeği indirildi");
    } catch {
      toast("Yedek hazırlanamadı");
    }
    setBusy("");
  }
  async function json() {
    setBusy("json");
    try {
      const all = clean(await collect());
      save(new Blob([JSON.stringify({ app: "sesliasistan", at: new Date().toISOString(), ...all }, null, 1)], { type: "application/json" }), backupName(todayStr(), "json"));
      toast("Tam yedek indirildi");
    } catch {
      toast("Yedek hazırlanamadı");
    }
    setBusy("");
  }

  return (
    <Row icon="archive" tone="slate" title="Yedek indir" sub="Planlar, görevler, notlar, fişler, yarışlar, etkinlikler, kişiler" onClick={() => setOpen((v) => !v)} chevron>
      {open && (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!!busy} onClick={excel} className="h-10 rounded-xl bg-acc text-[0.875rem] font-semibold text-white active:scale-[.98] disabled:opacity-50">
              {busy === "xlsx" ? "Hazırlanıyor…" : "Excel"}
            </button>
            <button type="button" disabled={!!busy} onClick={json} className="h-10 rounded-xl bg-bg text-[0.875rem] font-semibold active:scale-[.98] disabled:opacity-50">
              {busy === "json" ? "Hazırlanıyor…" : "Tam yedek (JSON)"}
            </button>
          </div>
          <p className="mt-2 text-[0.75rem] leading-snug text-mut">Ayda bir indirip bilgisayarda ya da iCloud’da sakla. Sporcu kartları kulüp uygulamasında durduğu için yedeğe girmez; fiş fotoğrafları da girmez.</p>
        </div>
      )}
    </Row>
  );
}
