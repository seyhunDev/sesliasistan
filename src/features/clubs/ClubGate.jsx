"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { isAthleteSide, kindOf } from "@/lib/kinds";
import { chosenSport, needsSport } from "@/sports";
import { ClubPick } from "./ClubPick";
import { chooseClub, syncClub } from "./clubs";

// Giriş yapan kişinin kulübünü belgelere yükler; kulübü hiç sorulmamışsa (yeni kayıt ve eski hesaplar, ana hesap dahil)
// yelken seçtiyse bir kez "Kulübün?" sorar (Seyhun 2026-11-27 "kulüp seçmemiş kullanıcıya sorulsun, eksik bilgi kalmasın").
// Sporcu, öğrenci, veli sorulmaz (kulüpleri antrenörlerininki). İlk tanıtım ve "Hangi spor?" bitince çıkar.
export function ClubGate() {
  const { profile } = useAuth();
  const uid = profile?.uid;
  const clubId = profile?.clubId || "";
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (profile) syncClub(profile).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, clubId, profile?.name]);

  const ask =
    !!profile &&
    !done &&
    !profile.clubAsked &&
    !clubId &&
    profile.onboarded !== false &&
    !needsSport(profile) &&
    (chosenSport(profile) || "sailing") === "sailing" &&
    (profile.role === "owner" || (profile.role === "staff" && !isAthleteSide(kindOf(profile))));
  if (!ask) return null;
  return <ClubPick onPick={(id) => chooseClub(uid, id).catch(() => {}).finally(() => setDone(true))} />;
}
