"use client";

// Yayında canlı tekne konumları (Seyhun 2026-11-03 "gerçek yarışta video yerine bunu da seçebilmeliyim; gruplara göre otomatik"; sonra
// "bu replay değil, canlı olarak teknelerin konumunu gösteriyor; replay ayrıca yapılacak"): Yayın › Video › Tekneler ekrana alınınca
// canlı ekranın arkasında oynar. Şimdilik start anı (örnek veri, döngüde); sonra start'tan bitişe canlı konum akışı.
// Şimdilik hazır veri seti (public/veri/ornek-start.json); canlı konum akışı gelince aynı oynatıcı o veriyi okur.
// grp: ekrandaki yarışın grubu; veri setinde o grup yoksa ilk grup.
import { useEffect, useMemo, useState } from "react";
import { cleanSet, fullRace, liveGroup, placeSet, realSet } from "@/lib/boatPlay";
import { coursePoints } from "@/lib/courseCard";
import { cleanCourse } from "@/lib/raceCourse";
import { BoatRace } from "./BoatRace";

let cache = null;

// startAt: ekrandaki yarışın start anı (ms); canlı = şimdi − start. ctl: alttaki oynatma şeridi (boatCtl) bu ekranı yönetir
// 2026-11-06: örnek izler start'tan finişe uzatılır (fullRace), kesitler ve dönüşler görünsün; gerçek takip verisi gelince o oynar
// course: yarışın parkuru (Yayın › Parkur); komite ve pin girildiyse şamandıralar gerçek yerinde, tekneler o start hattında
// fleet: renk listesindeki tekneler [{ sail, name, grp }] (lib/boatPlay fleetOf); grubun tekneleri varsa örnek izlerle onlar oynar
export function BoatLive({ grp = "", bare = true, course = null, fleet = null, startAt = null, ctl = false }) {
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
  // parkur her canlı veri gelişinde yeni nesne olur: yalnız içeriği değişince yeniden hesapla (yoksa oynatma şeridi baştan başlar)
  const ckey = course ? JSON.stringify(course) : "";
  const placed = useMemo(() => {
    const course = ckey ? JSON.parse(ckey) : null;
    const base = (grp && fkey && realSet(set, fleet, grp)) || set;
    if (!base) return base;
    let out = base;
    try {
      if (course) out = placeSet(base, coursePoints(cleanCourse(course))?.pts);
    } catch {
      out = base;
    }
    return fullRace(out);
    // fleet yalnız grubun yelken listesi değişince (fkey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set, ckey, grp, fkey]);
  if (!placed) return <div className="br" />;
  const g = liveGroup(placed, grp);
  return <BoatRace key={g} set={placed} grp={g} bare={bare} startAt={startAt} ctl={ctl} />;
}
