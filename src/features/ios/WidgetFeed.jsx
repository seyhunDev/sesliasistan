"use client";

import { useEffect } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useMoney } from "@/features/home/TeamMoney";
import { getPlace } from "@/features/weather/weather";
import { readSum } from "@/lib/homeTiles";
import { widgetData } from "@/lib/nativeIos";
import { todayStr } from "@/lib/utils/format";
import { widgetWord } from "@/lib/englishWords";
import { widgetDues, widgetMoney, widgetPlans, widgetTrainings } from "@/lib/widgetData";

// iPhone widget'larına veri (yalnız iPhone uygulamasında, IosBridge içinde durur): planlar, antrenman, sayaç, banka, aidat, günün kelimesi
// ve konum (rüzgârı widget kendisi alır). Değişince gönderilir, aynı veri iki kez gönderilmez.
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
      }
    : null;
  const key = v ? JSON.stringify(v) : "";
  useEffect(() => {
    if (key) widgetData(JSON.parse(key));
  }, [key]);
  return null;
}
