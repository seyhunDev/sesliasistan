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
      <span className={`text-[11px] ${strong ? "font-semibold text-fg" : "text-mut"}`}>{label}</span>
      <Icon name={icon} className="my-0.5 size-[18px] text-fg/75" />
      <span className="text-[13px] font-medium tabular-nums">{temp}°</span>
      <span className={`flex items-center gap-0.5 text-[11px] font-semibold tabular-nums ${l.tone}`}>
        <WindArrow deg={dir} />
        {wind}
      </span>
    </div>
  );
}
