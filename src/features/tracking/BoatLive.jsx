"use client";

// Yayında canlı tekne konumları (Seyhun 2026-11-03 "gerçek yarışta video yerine bunu da seçebilmeliyim; gruplara göre otomatik"; sonra
// "bu replay değil, canlı olarak teknelerin konumunu gösteriyor; replay ayrıca yapılacak"): Yayın › Video › Tekneler ekrana alınınca
// canlı ekranın arkasında oynar. Şimdilik start anı (örnek veri, döngüde); sonra start'tan bitişe canlı konum akışı.
// Şimdilik hazır veri seti (public/veri/ornek-start.json); canlı konum akışı gelince aynı oynatıcı o veriyi okur.
// grp: ekrandaki yarışın grubu; veri setinde o grup yoksa ilk grup.
import { useEffect, useMemo, useState } from "react";
import { cleanSet, liveGroup, placeSet } from "@/lib/boatPlay";
import { coursePoints } from "@/lib/courseCard";
import { cleanCourse } from "@/lib/raceCourse";
import { BoatRace } from "./BoatRace";

let cache = null;

// zoom: Yayın › Video görünümü (screen.zoom 0–100); verilmezse eski start görünümü
// course: yarışın parkuru (Yayın › Parkur); komite ve pin girildiyse şamandıralar gerçek yerinde, tekneler o start hattında
export function BoatLive({ grp = "", bare = true, tag, zoom = null, course = null }) {
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
  const placed = useMemo(() => {
    if (!set || !course) return set;
    try {
      return placeSet(set, coursePoints(cleanCourse(course))?.pts);
    } catch {
      return set;
    }
  }, [set, course]);
  if (!placed) return <div className="br" />;
  const g = liveGroup(placed, grp);
  return <BoatRace key={g} set={placed} grp={g} bare={bare} tag={tag} zoom={zoom} />;
}
