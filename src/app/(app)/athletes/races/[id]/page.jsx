"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { loadAthletes, message, updateAthlete, useDikili } from "@/features/athletes/data";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { RaceEditor } from "@/features/athletes/RaceEditor";
import { leftText } from "@/features/athletes/RaceList";
import { rangeText } from "@/features/athletes/raceDocs";
import { addRacePlan, deleteRace, freshRace, loadRaces, saveRace } from "@/features/athletes/races";
import { addNoticePlans } from "@/features/athletes/raceNotice";
import { mailToMe } from "@/features/mail/outbox";
import { todayStr } from "@/lib/utils/format";

// Tek yarış (yeni yarış için /athletes/races/new)
export default function RacePage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed || !profile?.orgId || !user) return null;
  // Kendine mail: yalnız Gmail betiğini kurmuş ana hesapta (betik orgs/{uid}/outbox'tan gönderir)
  const mail = profile.mailSeen && profile.orgId === user.uid ? { ready: profile.mailOutbox } : null;
  return <Race orgId={profile.orgId} uid={user.uid} by={{ name: profile?.name ?? "Kullanıcı" }} mail={mail} />;
}

function Race({ orgId, uid, by, mail }) {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { saveDrafts } = useData();
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const [race, setRace] = useState(null);
  const [missingRace, setMissingRace] = useState(false);
  useEffect(() => {
    loadRaces(orgId).then(
      (list) => {
        if (id === "new") return setRace(freshRace(list.find((r) => r.signer) || list[0], todayStr()));
        const r = list.find((x) => x.id === id);
        if (r) setRace(r);
        else setMissingRace(true);
      },
      () => setMissingRace(true),
    );
  }, [orgId, id]);

  // Yeni yarış ilk kaydında adresi kendi kimliğine döner (geri/yenile doğru yarışı açsın)
  const onSave = useCallback(
    async (r, cur) => {
      const nid = await saveRace(orgId, uid, { ...r, id: cur });
      if (!cur) window.history.replaceState(null, "", `/athletes/races/${nid}`);
      return nid;
    },
    [orgId, uid],
  );
  const onDelete = async (rid) => {
    try {
      await deleteRace(orgId, rid);
      router.push("/athletes/races");
    } catch {
      toast("Silinemedi");
    }
  };
  const onSaveAthlete = async (a, patch) => {
    try {
      await updateAthlete(a.id, a, patch, { classes: [], coaches: [] });
      reload();
    } catch (e) {
      throw new Error(message(e));
    }
  };

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <PageHeader title={race?.name || (id === "new" ? "Yeni yarış" : "Yarış")} sub={race ? rangeText(race.startDate, race.endDate) || leftText(race) : ""} back="/athletes/races" />
      {err?.code === "permission-denied" && <DikiliLogin denied={!!user} onDone={reload} />}
      {missingRace ? (
        <p className="mt-6 text-center text-[0.875rem] text-mut">Yarış bulunamadı.</p>
      ) : !race ? (
        <Loading label="Yarış yükleniyor" />
      ) : (
        <RaceEditor
          start={race}
          athletes={data?.athletes || []}
          athletesErr={err}
          onRetryAthletes={reload}
          onSave={onSave}
          onDelete={onDelete}
          onPlan={(r) => addRacePlan(saveDrafts, r, by)}
          onNoticePlan={(r) => addNoticePlans(saveDrafts, r, by)}
          onSaveAthlete={onSaveAthlete}
          onMail={mail ? async (m) => (await mailToMe(uid, m), mail.ready) : null}
        />
      )}
    </main>
  );
}
