"use client";

// Kendi yarışlarından birini seç (Seyhun 2026-11-07 "benim kurduğum yarışla federasyondan aldığımı birleştirelim"):
// siteden alınan yarışı birleştirmek (SiteDocs) ya da siteden yarışı var olan yarışa bağlamak (Siteden ekle) için.
// Siteye bağlı olmayan yarışlar, tarihi yakın olan üstte; near: yakınlığın ölçüldüğü gün (YYYY-AA-GG).
import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Row, RowList, SkelRow } from "@/components/ui/Row";
import { loadRaces } from "./races";
import { todayStr } from "@/lib/utils/format";

const dayMs = (d) => Date.parse(`${d}T12:00:00`) || 0;
const short = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" }) : "Tarih yok");

export function RacePickSheet({ open, onClose, orgId, title = "Yarışını seç", near = "", skip = "", onPick }) {
  const [races, setRaces] = useState(null);
  useEffect(() => {
    if (!open) return;
    let on = true;
    loadRaces(orgId).then(
      (l) => on && setRaces(l),
      () => on && setRaces([]),
    );
    return () => void (on = false);
  }, [open, orgId]);
  const t = dayMs(near || todayStr());
  const list = (races || []).filter((r) => r.id !== skip && !r.site?.act).sort((a, b) => Math.abs(dayMs(a.startDate) - t) - Math.abs(dayMs(b.startDate) - t));
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <RowList>
        {!races && (
          <>
            <SkelRow />
            <SkelRow />
          </>
        )}
        {races && !list.length && <p className="py-3.5 text-[0.9375rem] text-mut">Bağlanacak yarış yok.</p>}
        {list.map((r) => (
          <Row key={r.id} onClick={() => onPick(r)} title={r.name || "Adsız yarış"} sub={[short(r.startDate), r.place].filter(Boolean).join(" · ")} />
        ))}
      </RowList>
    </Sheet>
  );
}
