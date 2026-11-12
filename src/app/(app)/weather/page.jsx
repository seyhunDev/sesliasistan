"use client";

import { Loading } from "@/components/ui/Loader";
import { BackButton } from "@/components/ui/BackButton";
import { WeatherTop } from "@/features/weather/WeatherTop";
import { useWeather } from "@/features/weather/useWeather";
import { getPlace } from "@/features/weather/weather";

// Hava durumu tam sayfa (ana sayfadaki Hava kutusu açar). 2026-11-12'den beri ana sayfayla aynı lacivert ve aynı Hava kutusu (WeatherTop, WxPanel).
export default function WeatherPage() {
  const { w, err, refresh } = useWeather();
  const place = getPlace();
  if (w?.today) return <WeatherTop key={w.place || place.name} w={w} err={err} refresh={refresh} />;
  return (
    <main className="iph iph-page navy">
      <header className="iph-hd">
        <BackButton href="/" />
        <h1 className="iph-date">
          <b>Hava</b>
          <small>{place.name}</small>
        </h1>
      </header>
      <Loading className="py-8" />
    </main>
  );
}
