"use client";

import { useEffect, useState } from "react";
import { loadRaceDay } from "@/features/athletes/raceWeather";
import { useRaceHome } from "@/features/athletes/raceHome";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useMoney } from "@/features/home/TeamMoney";
import { getPlace } from "@/features/weather/weather";
import { awayRace, readSum } from "@/lib/homeTiles";
import { widgetData } from "@/lib/nativeIos";
import { todayStr } from "@/lib/utils/format";
import { widgetWord } from "@/lib/englishWords";
import { widgetDues, widgetMoney, widgetPlans, widgetRace, widgetTrainings } from "@/lib/widgetData";

// iPhone widget'larına veri (yalnız iPhone uygulamasında, IosBridge içinde durur): planlar, antrenman, sayaç, banka, aidat, günün kelimesi
// ve konum (rüzgârı widget kendisi alır). Yarış günü uzaktaki yarışın yeri de (race: büyük rüzgâr orası, ev yeri tek satır).
// Değişince gönderilir, aynı veri iki kez gönderilmez.
export function WidgetFeed({ timer }) {
  const { profile } = useAuth();
  const { plans } = useData();
  const m = useMoney();
  const uid = profile?.uid;
  const ownerId = profile?.orgId;
  const today = todayStr();
  const ym = today.slice(0, 7);
  const p = getPlace();
  const trainings = widgetTrainings(plans, { today });
  const ar = awayRace(useRaceHome().open, today);
  const at = useRaceSpot(ar, today);
  const v = uid
    ? {
        plans: widgetPlans(plans, { uid, ownerId, today }),
        place: p.name,
        lat: p.lat,
        lon: p.lon,
        timer,
        training: trainings[0] || null,
        trainings,
        money: widgetMoney(m.bank),
        dues: profile?.role === "owner" ? widgetDues(readSum().dues, ym) : null,
        word: widgetWord(undefined, today),
        race: widgetRace(ar, at, p),
      }
    : null;
  const key = v ? JSON.stringify(v) : "";
  useEffect(() => {
    if (key) widgetData(JSON.parse(key));
  }, [key]);
  return null;
}

// Yarışın yeri (ana sayfadaki yarış günü havasıyla aynı kayıt: loadRaceDay 1 saat saklar)
function useRaceSpot(r, day) {
  const key = r ? `${r.id}|${day}|${r.spot?.lat ?? ""}` : "";
  const [got, setGot] = useState({ key: "" });
  useEffect(() => {
    if (!key) return;
    let on = true;
    loadRaceDay(r, day).then(
      (d) => on && d.lat != null && setGot({ key, at: { place: d.place, lat: d.lat, lon: d.lon } }),
      () => {},
    );
    return () => {
      on = false;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return key && got.key === key ? got.at : null;
}
