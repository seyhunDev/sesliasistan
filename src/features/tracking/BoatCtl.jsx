"use client";

// Tekne konumu şeridi (Seyhun 2026-11-06, onaylı örnek project-files/tekne-animasyon/gruplu): canlı ekranda tekneler görünürken alt
// çubuğun üstünde. Grup (günün listesinden: Sarı, Mavi… ya da Altın, Gümüş, Bronz), kesitler (Start, +20 sn, +30 sn, şamandıralar,
// Finiş), −10 sn, Durdur/Oynat, Canlı, uzaklaştır/yakınlaştır. Yalnız bu telefonda (boatCtl), yayına gitmez.
import { useEffect, useState } from "react";
import { groupColor } from "@/lib/roundScore";
import { boatCtl, useBoatCtl } from "./boatStore";

export function BoatCtl({ groups = [], grp = "", onGrp }) {
  const s = useBoatCtl();
  // etkin kesit için şimdiki an (yarım saniyede bir)
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);
  const cur = boatCtl.at(s);
  const cuts = s.info.cuts || [];
  const on = s.live ? -1 : cuts.reduce((k, c, i) => (cur >= c.t - 500 ? i : k), -1);
  return (
    <div className="sc-mv sc-bc">
      {groups.length > 1 ? (
        <div className="row gs">
          {groups.map((x) => (
            <button key={x.grp || "t"} type="button" className={x.grp === grp ? "on" : ""} aria-pressed={x.grp === grp} onClick={() => onGrp?.(x.grp)}>
              {x.grp ? <i style={{ background: groupColor(x.grp) || "#ffd23f" }} aria-hidden="true" /> : null}
              {x.name}
            </button>
          ))}
        </div>
      ) : null}
      {cuts.length ? (
        <div className="row cs">
          {cuts.map((c, i) => (
            <button key={c.n} type="button" className={i === on ? "on" : ""} onClick={() => boatCtl.seek(c.t, { focus: c.focus, zk: 1 })}>
              {c.n}
            </button>
          ))}
        </div>
      ) : null}
      <div className="row">
        <button type="button" onClick={() => boatCtl.back(10000)}>−10 sn</button>
        <button type="button" className="pp" onClick={() => boatCtl.toggle()} aria-label={!s.live && !s.playing ? "Oynat" : "Durdur"}>
          {!s.live && !s.playing ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /></svg>}
        </button>
        <button type="button" className={`go${s.live ? " on" : ""}`} aria-pressed={s.live} onClick={() => boatCtl.goLive()}>
          Canlı
        </button>
        <button type="button" onClick={() => boatCtl.zoom(1 / 1.4)} aria-label="Uzaklaştır">−</button>
        <button type="button" onClick={() => boatCtl.zoom(1.4)} aria-label="Yakınlaştır">+</button>
      </div>
    </div>
  );
}
