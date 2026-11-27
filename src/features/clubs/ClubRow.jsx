"use client";

import { useState } from "react";
import { Row } from "@/features/settings/ui";
import { useAuth } from "@/features/auth/AuthProvider";
import { ClubPick } from "./ClubPick";
import { chooseClub, useClub } from "./clubs";

// Ayarlar › Kulübüm: resmi listeden değiştir ya da kulüpsüz (Seyhun 2026-11-27)
export function ClubRow() {
  const { profile } = useAuth();
  const club = useClub();
  const [open, setOpen] = useState(false);
  if (!profile) return null;
  return (
    <>
      <Row title="Kulübüm" sub={club.name || "Kulüpsüz"} onClick={() => setOpen(true)} chevron />
      {open && (
        <ClubPick
          current={profile.clubId}
          onClose={() => setOpen(false)}
          onPick={async (id) => {
            await chooseClub(profile.uid, id).catch(() => {});
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
