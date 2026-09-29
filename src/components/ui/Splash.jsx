import { AppLogo } from "@/components/ui/AppLogo";

export function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-4">
        <AppLogo size={48} className="opacity-90" />
        <div className="size-6 animate-spin rounded-full border-2 border-line border-t-acc" />
      </div>
    </div>
  );
}
