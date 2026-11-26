"use client";

import { useEffect, useMemo, useState } from "react";
import { useData } from "@/features/data/DataProvider";
import { loadAthletes, isActive } from "@/features/athletes/data";
import { useTeams } from "@/features/athletes/takimlar";
import { TEAMS, audUids, cleanAud } from "@/lib/kimler";

// "Kimler" seçimi (Seyhun 2026-11-26): Herkes · A takım · B takım, altında sporcuların sınıfları (Optimist, ILCA…).
// Takım ve sınıf birlikte seçilebilir ("A takım · Optimist"). Sporcu listesi kulüp sitesinden (alınamazsa yalnız takım).
export function useKimler() {
  const { members, myUid } = useData();
  const teams = useTeams(myUid);
  const [ath, setAth] = useState({ athletes: [], classes: [] });
  useEffect(() => {
    let on = true;
    loadAthletes()
      .then((r) => on && setAth({ athletes: r.athletes.filter(isActive), classes: r.classes }))
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);
  const classes = useMemo(() => ath.classes.filter((c) => ath.athletes.some((a) => a.currentClassId === c.id)), [ath]);
  return { classes, uidsOf: (aud) => audUids(aud, { members, athletes: ath.athletes, teams }) };
}

export function KimlerPick({ value, onChange, classes }) {
  const v = cleanAud(value) || { team: "", cls: "", clsName: "" };
  const put = (p) => onChange(cleanAud({ ...v, ...p }));
  return (
    <div>
      <div className="tb-k">Kimler</div>
      <div className="tb-chips">
        <button type="button" data-press aria-pressed={!v.team && !v.cls} className="tb-chip" onClick={() => onChange(null)}>
          Herkes
        </button>
        {TEAMS.map((t) => (
          <button key={t} type="button" data-press aria-pressed={v.team === t} className="tb-chip" onClick={() => put({ team: v.team === t ? "" : t })}>
            {t} takım
          </button>
        ))}
        {classes.map((c) => (
          <button key={c.id} type="button" data-press aria-pressed={v.cls === c.id} className="tb-chip" onClick={() => put(v.cls === c.id ? { cls: "", clsName: "" } : { cls: c.id, clsName: c.name })}>
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
