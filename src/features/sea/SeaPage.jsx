"use client";

import { useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { Row, RowList } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { EMERGENCY, VHF, nearestPort } from "@/lib/sea";
import { VesselMap } from "./VesselMap";
import { useMyPos } from "./useSea";

// Deniz trafiği (Seyhun 2026-10-23): ekranın tamamı VesselFinder'ın canlı gemi haritası ("direkt tam ekran yapalım,
// büyüt olmasın"). Üstte lacivert ince şerit (geri, başlık), altta haritanın üstünde iki büyük düğme: Teknem (haritayı
// telefonun konumunda açar) · Acil (158, 112, Kanal 16, konumumu kopyala). aisstream listesi Dikili'de sinyal vermediği
// için sayfadan kalktı; sesli cevaplar hâlâ /api/sea'den.
const fmt = (n) => String(Math.round(n * 10) / 10).replace(".", ",");

// Telefonun konumu limana göre: "Dikili limanı", "Dikili 2,1 km", "4,5 kn"
function myState(me) {
  if (!me) return "Konum yok";
  const p = nearestPort(me);
  if (p.km <= 0.8) return `${p.name} limanı`;
  return me.sog >= 1 ? `${fmt(me.sog)} kn` : `${p.name} ${fmt(p.km)} km`;
}

export function SeaPage() {
  const me = useMyPos();
  const [center, setCenter] = useState(null);
  const [sos, setSos] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-0 flex flex-col">
        <header className="ck flex shrink-0 items-center gap-2.5 px-5 pb-2.5 pt-[calc(0.5rem+env(safe-area-inset-top))]">
          <BackButton href="/" />
          <h1 className="min-w-0 flex-1 truncate text-[1.25rem] font-bold tracking-[-.02em]">Deniz trafiği</h1>
        </header>
        <div className="min-h-0 flex-1">
          <VesselMap center={center || undefined} zoom={center ? 13 : 10} />
        </div>
      </div>
      <div data-pagebar="" className="fixed inset-x-0 bottom-0 z-40 px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="ck mx-auto grid max-w-[30rem] grid-cols-2 gap-2 rounded-[1.375rem] p-2 shadow-lg">
          <button type="button" data-press onClick={() => me && setCenter({ lat: +me.lat.toFixed(4), lon: +me.lon.toFixed(4) })} className="raised flex h-[3.75rem] min-w-0 flex-col items-center justify-center rounded-2xl px-2">
            <b className="text-[1rem] font-semibold">Teknem</b>
            <small className="w-full truncate text-center text-[0.75rem] text-white/65">{myState(me)}</small>
          </button>
          <button type="button" data-press onClick={() => setSos(true)} className="raised act-main flex h-[3.75rem] min-w-0 flex-col items-center justify-center rounded-2xl px-2">
            <b className="text-[1rem] font-semibold">Acil</b>
            <small className="text-[0.75rem] font-semibold text-[var(--rec)]">158 · Kanal 16</small>
          </button>
        </div>
      </div>

      <SosSheet open={sos} onClose={() => setSos(false)} me={me} />
    </>
  );
}

function SosSheet({ open, onClose, me }) {
  const toast = useToast();
  const where = me ? `${me.lat.toFixed(4)} K, ${me.lon.toFixed(4)} D` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(where);
      toast?.("Konum kopyalandı");
    } catch {}
  };
  return (
    <Sheet open={open} onClose={onClose} title="Acil durum">
      <div className="space-y-5 px-5">
        <RowList>
          {EMERGENCY.map((e) => (
            <Row key={e.tel} href={`tel:${e.tel}`} title={e.label} right={e.tel} />
          ))}
          <Row title="Telsiz" right={VHF.replace("VHF ", "")} />
        </RowList>
        <RowList>
          <Row title="Konumum" sub={where || "Konum izni yok"} onClick={where ? copy : undefined} right={where ? "Kopyala" : null} chev={false} />
        </RowList>
      </div>
    </Sheet>
  );
}
