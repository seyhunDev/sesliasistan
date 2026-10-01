import { Icon } from "@/components/ui/Icon";
import { windLevel } from "./weather";

// Rüzgârın estiği yönü gösteren ok (meteoroloji "geldiği yön" verir, ok 180° çevrilir)
export function WindArrow({ deg, className = "size-3" }) {
  return (
    <span className="inline-grid place-items-center" style={{ transform: `rotate(${deg + 180}deg)` }} aria-hidden>
      <Icon name="arrow" className={`${className} [stroke-width:2.75]`} />
    </span>
  );
}

// Tek sütun: üstte etiket, ortada simge + sıcaklık, altta rüzgâr (kn)
export function Col({ label, icon, temp, wind, dir, strong }) {
  const l = windLevel(wind);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-[0.6875rem] ${strong ? "font-semibold text-fg" : "text-mut"}`}>{label}</span>
      <Icon name={icon} className="my-0.5 size-[1.125rem] text-fg/75" />
      <span className="text-[0.8125rem] font-medium tabular-nums">{temp}°</span>
      <span className={`flex items-center gap-0.5 text-[0.6875rem] font-semibold tabular-nums ${l.tone}`}>
        <WindArrow deg={dir} />
        {wind}
      </span>
    </div>
  );
}
