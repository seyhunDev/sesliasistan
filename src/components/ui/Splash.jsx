import { Icon } from "./Icon";
import { Loader } from "./Loader";

// Açılış: sade simge yumuşakça belirir, altında tek yükleme animasyonu
export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg">
      <div className="flex flex-col items-center">
        <span className="splash-in grid size-16 place-items-center rounded-[1.375rem] bg-acc text-white shadow-[0_10px_30px_-12px_rgba(62,110,132,.6)]">
          <Icon name="mic" className="size-8" />
        </span>
        <span className="soft-in mt-7">
          <Loader className="text-mut" />
        </span>
      </div>
    </div>
  );
}
