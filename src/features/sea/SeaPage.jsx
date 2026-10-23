"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead, Row, RowList, SkelRow } from "@/components/ui/Row";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/ToastProvider";
import { EMERGENCY, REFRESH, VHF, agoText, groupShips, km, nearestPort, shipLine } from "@/lib/sea";
import { SeaMap } from "./SeaMap";
import { readEvery, saveEvery, useMyPos, useSea } from "./useSea";

// Deniz trafiği (Seyhun 2026-10-23): Dikili çevresindeki gemiler canlı (AIS). Lacivert üstte harita ve üç düğme
// (Teknem · yenileme süresi · Acil), altta bölüm bölüm gemiler: yaklaşan/ayrılan, seyirde, demirde, limanda.
const fmt = (n) => String(Math.round(n * 10) / 10).replace(".", ",");

function Lead({ s }) {
  const k = s.state.key;
  const moving = ["approach", "leave", "underway", "fishing"].includes(k);
  const c = s.state.warn ? "var(--warn)" : moving || k === "ready" ? "var(--acc)" : "var(--mut)";
  return (
    <span className={`grid size-8 shrink-0 place-items-center rounded-full ${moving || k === "ready" ? "bg-accbg" : "bg-bg"}`}>
      {s.guard ? (
        <b className="text-[0.625rem] font-bold text-fg">SG</b>
      ) : moving ? (
        <svg width="14" height="14" viewBox="0 0 24 24" style={{ transform: `rotate(${s.cog ?? 0}deg)` }}><path d="M12 3 L18 20 L12 16 L6 20Z" fill={c} /></svg>
      ) : k === "moored" ? (
        <span className="block size-2.5" style={{ background: c }} />
      ) : (
        <span className="block size-3 rounded-full border-2" style={{ borderColor: c }} />
      )}
    </span>
  );
}

function StateTag({ s }) {
  const k = s.state.key;
  const cls = s.state.warn ? "bg-warnbg text-warn" : ["approach", "leave", "underway", "ready", "fishing"].includes(k) ? "bg-accbg text-acc" : "bg-bg text-mut";
  return <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${cls}`}>{s.state.label}</span>;
}

// Telefonun konumu limana göre: "Limanda", "Dikili 2,1 km"
function myState(me) {
  if (!me) return "Konum yok";
  const p = nearestPort(me);
  if (p.km <= 0.8) return `${p.name} limanı`;
  return me.sog >= 1 ? `${fmt(me.sog)} kn` : `${p.name} ${fmt(p.km)} km`;
}

export function SeaPage() {
  const [every, setEvery] = useState(20);
  useEffect(() => {
    const t = setTimeout(() => setEvery(readEvery()), 0); // telefonda saklanan süre (sunucuda okunamaz)
    return () => clearTimeout(t);
  }, []);
  const { data, fail } = useSea(every);
  const me = useMyPos();
  const [focus, setFocus] = useState(null);
  const [pick, setPick] = useState(null);
  const [sos, setSos] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => !document.hidden && tick((n) => n + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const ships = useMemo(() => data?.ships || [], [data]);
  const groups = useMemo(() => groupShips(ships), [ships]);
  const nextEvery = () => {
    const v = REFRESH[(REFRESH.indexOf(every) + 1) % REFRESH.length];
    setEvery(v);
    saveEvery(v);
  };
  const show = (p) => {
    setFocus({ ...p, t: Date.now() });
    setPick(p.m || null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const sub = data?.at ? `Dikili · ${ships.length} gemi · ${agoText(data.at)}` : "Dikili";

  return (
    <>
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Deniz trafiği">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Deniz trafiği</h1>
            <p className="truncate text-[0.8125rem] text-white/65 tabular-nums">{sub}</p>
          </div>
        </header>
        <div className="mt-4">
          <SeaMap ships={ships} me={me} focus={focus} pick={pick} onPick={setPick} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <button type="button" data-press onClick={() => me && show(me)} className="raised flex h-[3.5rem] min-w-0 flex-col items-center justify-center rounded-2xl px-1">
            <b className="text-[0.9375rem] font-semibold">Teknem</b>
            <small className="w-full truncate text-center text-[0.75rem] text-white/65">{myState(me)}</small>
          </button>
          <button type="button" data-press onClick={nextEvery} aria-label="Yenileme süresi" className="raised flex h-[3.5rem] min-w-0 flex-col items-center justify-center rounded-2xl px-1">
            <b className="text-[0.9375rem] font-semibold tabular-nums">{every} sn</b>
            <small className="text-[0.75rem] text-white/65">Yenileme</small>
          </button>
          <button type="button" data-press onClick={() => setSos(true)} className="raised act-main flex h-[3.5rem] min-w-0 flex-col items-center justify-center rounded-2xl px-1">
            <b className="text-[0.9375rem] font-semibold">Acil</b>
            <small className="text-[0.75rem] font-semibold text-[var(--rec)]">158 · Kanal 16</small>
          </button>
        </div>
      </section>

      <div className="relative -mx-5 -mt-6 min-h-[40vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {data?.error === "nokey" ? (
          <RowList>
            <Row title="Gemi verisi bağlı değil" sub="Netlify'a AISSTREAM_KEY eklenmeli" warn />
          </RowList>
        ) : !data ? (
          <RowList>
            <SkelRow />
            <SkelRow />
            <SkelRow />
          </RowList>
        ) : (
          <>
            {fail && <p className="px-1 text-[0.8125rem] font-semibold text-warn">Bağlantı yok, son bilgi gösteriliyor</p>}
            {!groups.length && (
              <RowList>
                <Row title="Çevrede sinyal veren gemi yok" />
              </RowList>
            )}
            {groups.map((g) => (
              <section key={g.id}>
                <ListHead title={g.title} count={g.ships.length} />
                <RowList>
                  {g.ships.map((s) => (
                    <Row key={s.m} onClick={() => show(s)} chev={false} lead={<Lead s={s} />} title={s.n} sub={shipLine(s)} right={<StateTag s={s} />} warn={!!s.state.warn} label={`${s.n}, ${s.state.label}`} />
                  ))}
                </RowList>
              </section>
            ))}
          </>
        )}
      </div>

      <SosSheet open={sos} onClose={() => setSos(false)} me={me} ships={ships} />
    </>
  );
}

function SosSheet({ open, onClose, me, ships }) {
  const toast = useToast();
  const guard = me ? ships.filter((s) => s.guard).map((s) => ({ ...s, d: km(me, s) })).sort((a, b) => a.d - b.d)[0] : ships.find((s) => s.guard);
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
          {guard && <Row title={guard.n} sub={`Sahil Güvenlik · ${guard.d != null ? `${fmt(guard.d)} km` : shipLine(guard)}`} />}
        </RowList>
      </div>
    </Sheet>
  );
}
