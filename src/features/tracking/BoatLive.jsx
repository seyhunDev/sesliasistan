"use client";

// Yayında canlı tekne konumları (Seyhun 2026-11-03 "gerçek yarışta video yerine bunu da seçebilmeliyim; gruplara göre otomatik"; sonra
// "bu replay değil, canlı olarak teknelerin konumunu gösteriyor; replay ayrıca yapılacak"): Yayın › Video › Tekneler ekrana alınınca
// canlı ekranın arkasında oynar. Şimdilik start anı (örnek veri, döngüde); sonra start'tan bitişe canlı konum akışı.
// Şimdilik hazır veri seti (public/veri/ornek-start.json); canlı konum akışı gelince aynı oynatıcı o veriyi okur.
// grp: ekrandaki yarışın grubu; veri setinde o grup yoksa ilk grup.
import { useEffect, useMemo, useState } from "react";
import { cleanSet, liveGroup, placeSet, realSet } from "@/lib/boatPlay";
import { coursePoints } from "@/lib/courseCard";
import { cleanCourse } from "@/lib/raceCourse";
import { BoatRace } from "./BoatRace";

let cache = null;

// zoom: Yayın › Video görünümü (screen.zoom 0–100); verilmezse eski start görünümü
// course: yarışın parkuru (Yayın › Parkur); komite ve pin girildiyse şamandıralar gerçek yerinde, tekneler o start hattında
// fleet: renk listesindeki tekneler [{ sail, name, grp }] (lib/boatPlay fleetOf); grubun tekneleri varsa örnek izlerle onlar oynar
export function BoatLive({ grp = "", bare = true, tag, zoom = null, course = null, fleet = null }) {
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
  const fkey = (fleet || []).filter((b) => b.grp === grp).map((b) => b.sail).join(",");
  const placed = useMemo(() => {
    const base = (grp && fkey && realSet(set, fleet, grp)) || set;
    if (!base || !course) return base;
    try {
      return placeSet(base, coursePoints(cleanCourse(course))?.pts);
    } catch {
      return base;
    }
    // fleet yalnız grubun yelken listesi değişince (fkey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, course, grp, fkey]);
  if (!placed) return <div className="br" />;
  const g = liveGroup(placed, grp);
  return <BoatRace key={g} set={placed} grp={g} bare={bare} tag={tag} zoom={zoom} />;
}
