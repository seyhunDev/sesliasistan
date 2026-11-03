"use client";

// Yayında tekne replay'i (Seyhun 2026-11-03 "gerçek yarışta video yerine bunu da seçebilmeliyim; gruplara göre otomatik; sarı grup startı ise
// sarılarınki; döngü olsun, şimdilik replay yazalım"): Yayın › Video › Tekneler ekrana alınınca canlı ekranın arkasında döngüde oynar.
// Şimdilik hazır veri seti (public/veri/ornek-start.json); canlı konum akışı gelince aynı oynatıcı o veriyi okur.
// grp: ekrandaki yarışın grubu; veri setinde o grup yoksa ilk grup.
import { useEffect, useState } from "react";
import { cleanSet, replayGroup } from "@/lib/boatPlay";
import { BoatRace } from "./BoatRace";

let cache = null;

export function BoatReplay({ grp = "", bare = true }) {
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
  const g = replayGroup(set, grp);
  return <BoatRace key={g} set={set} grp={g} bare={bare} />;
}
