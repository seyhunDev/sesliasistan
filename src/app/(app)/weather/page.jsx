"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { WeatherTop } from "@/features/weather/WeatherTop";
import { useWeather } from "@/features/weather/useWeather";
import { getPlace } from "@/features/weather/weather";

// Hava durumu tam sayfa (ana sayfadaki hava satırı ve rüzgâr grafiği açar). Alttan açılan pencere yerine sayfa:
// arkada kayan bir şey kalmaz (Seyhun: "hava durumunu tam sayfa mı açsak… arka tarafta gereksiz yere scroll olmasın").
// 2026-10-21'den beri ana sayfayla aynı lacivert kokpit (WeatherTop).
export default function WeatherPage() {
  const { w, refresh } = useWeather();
  const place = getPlace();
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      {w?.today ? (
        <WeatherTop key={w.place || place.name} w={w} refresh={refresh} />
      ) : (
        <>
          <PageHeader title="Hava durumu" sub={place.name} />
          <Loading className="py-8" />
        </>
      )}
    </main>
  );
}
