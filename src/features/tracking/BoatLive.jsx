"use client";

// Yayında canlı tekne konumları (Seyhun 2026-11-03 "gerçek yarışta video yerine bunu da seçebilmeliyim; gruplara göre otomatik"; sonra
// "bu replay değil, canlı olarak teknelerin konumunu gösteriyor; replay ayrıca yapılacak"): Yayın › Video › Tekneler ekrana alınınca
// canlı ekranın arkasında oynar. Şimdilik start anı (örnek veri, döngüde); sonra start'tan bitişe canlı konum akışı.
// Şimdilik hazır veri seti (public/veri/ornek-start.json); canlı konum akışı gelince aynı oynatıcı o veriyi okur.
// grp: ekrandaki yarışın grubu; veri setinde o grup yoksa ilk grup.
import { useEffect, useState } from "react";
import { cleanSet, liveGroup } from "@/lib/boatPlay";
import { BoatRace } from "./BoatRace";

let cache = null;

export function BoatLive({ grp = "", bare = true }) {
  const [set, setSet] = useState(cache);
  useEffect(() => {
    if (cache) return;
    let on = true;
    fetch("/veri/ornek-start.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j) return;
        cache = cleanSet(j);
        if (on) setSet(cache);
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, []);
  if (!set) return <div className="br" />;
  const g = liveGroup(set, grp);
  return <BoatRace key={g} set={set} grp={g} bare={bare} />;
}
