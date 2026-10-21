"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { WeatherDetail } from "@/features/weather/DaySheet";
import { useWeather } from "@/features/weather/useWeather";
import { getPlace } from "@/features/weather/weather";

// Hava durumu tam sayfa (ana sayfadaki hava satırı ve rüzgâr grafiği açar). Alttan açılan pencere yerine sayfa:
// arkada kayan bir şey kalmaz (Seyhun: "hava durumunu tam sayfa mı açsak… arka tarafta gereksiz yere scroll olmasın").
export default function WeatherPage() {
  const { w, refresh } = useWeather();
  const place = getPlace();
  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]">
      <PageHeader title="Hava durumu" sub={place.name} />
      {w?.today ? <WeatherDetail key={w.place || place.name} w={w} refresh={refresh} /> : <Loading className="py-8" />}
    </main>
  );
}
