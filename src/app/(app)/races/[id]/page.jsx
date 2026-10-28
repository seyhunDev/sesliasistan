"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { SharedRaceView } from "@/features/raceCal/SharedRaceView";

// Ortak yarış: herkes görür; Yarışlar sayfası açık olan kulüp ana hesabında "Kulübüme ekle"
export default function SharedRacePage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const club = user && profile?.orgId === user.uid && canSeeAthletes(profile?.email) ? { orgId: profile.orgId, uid: user.uid } : null;
  return <SharedRaceView id={id} club={club} />;
}
