"use client";

import { Icon } from "@/components/ui/Icon";
import { useTts } from "./TtsProvider";

// Sesli yanıt açma/kapama düğmesi. withLabel: yanına Açık/Kapalı yazar.
export function SpeakToggle({ withLabel }) {
  const t = useTts();
  if (!t.supported) return null;
  return (
    <button
      type="button"
      onClick={t.toggle}
      aria-pressed={t.enabled}
      aria-label={t.enabled ? "Sesli yanıtı kapat" : "Sesli yanıtı aç"}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition active:scale-95 ${
        t.enabled ? "bg-acc text-white" : "bg-bg text-mut"
      }`}
    >
      <Icon name={t.enabled ? "volume" : "mute"} className="size-[18px]" />
      {withLabel && (t.enabled ? "Açık" : "Kapalı")}
    </button>
  );
}
