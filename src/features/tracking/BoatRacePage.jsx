"use client";

// /canli/<yarış>/konum (Seyhun 2026-11-03): tekne animasyonu tam ekran. Örnek yarışta hazır veri seti (public/veri/ornek-start.json);
// gerçek yarışta canlı konum akışı sonra bağlanacak (aynı biçim, lib/boatPlay.js). ?grp=Sarı ile tek grup; üstte grup seçimi.
import { useEffect, useState } from "react";
import Link from "next/link";
import { cleanSet, fullRace, groupsOf } from "@/lib/boatPlay";
import { BoatRace } from "./BoatRace";

export function BoatRacePage({ id, grp0 = "" }) {
  const [set, setSet] = useState(null);
  const [err, setErr] = useState("");
  const [grp, setGrp] = useState(grp0);
  const [run, setRun] = useState(0); // Tekrar: oynatıcı baştan
  useEffect(() => {
    if (id !== "ornek") return;
    let on = true;
    fetch("/veri/ornek-start.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => {
        if (!on) return;
        const s = fullRace(cleanSet(j));
        setSet(s);
        setGrp((g) => g || groupsOf(s)[0] || "");
      })
      .catch(() => on && setErr("Veri yüklenemedi."));
    return () => {
      on = false;
    };
  }, [id]);
  const groups = set ? groupsOf(set) : [];
  return (
    <div className="brp">
      {set ? <BoatRace key={`${grp}/${run}`} set={set} grp={grp} /> : <div className="brp-msg">{id !== "ornek" ? "Bu yarışın canlı konum verisi henüz yok." : err || ""}</div>}
      <div className="brp-top">
        {groups.length > 1
          ? groups.map((g) => (
              <button key={g} type="button" aria-pressed={g === grp} onClick={() => setGrp(g)}>
                {g}
              </button>
            ))
          : null}
        {set ? (
          <button type="button" onClick={() => setRun((n) => n + 1)}>
            Tekrar
          </button>
        ) : null}
        <Link href={`/canli/${id}`}>Yarışa dön</Link>
      </div>
    </div>
  );
}
