"use client";

import { useAuth } from "@/features/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { PermissionsCard } from "@/features/permissions/PermissionsCard";
import { BrainCard } from "@/features/brain/BrainCard";
import { RemindersCard } from "@/features/reminders/RemindersCard";
import { SpeakToggle } from "@/features/speech/SpeakToggle";
import { useTts } from "@/features/speech/TtsProvider";
import { logout } from "@/lib/auth";

const ROLE_LABEL = { owner: "Ana hesap", staff: "Çalışan" };

export function AccountCard() {
  const { profile, user } = useAuth();
  const tts = useTts();
  if (!profile) return null;
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-base font-semibold">{profile.name}</p>
      <p className="text-sm text-mut">{user?.email} · {ROLE_LABEL[profile.role]}</p>

      {tts.supported && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-bg px-3.5 py-3">
          <div>
            <b className="block text-[15px] font-medium">Sesli yanıt</b>
            <small className="text-[13px] text-mut">Yanıtlar kendiliğinden okunur</small>
          </div>
          <SpeakToggle withLabel />
        </div>
      )}

      <RemindersCard />
      <PermissionsCard />
      <BrainCard />

      <div className="mt-4">
        <Button variant="ghost" onClick={() => logout()}>Çıkış yap</Button>
      </div>
    </div>
  );
}
