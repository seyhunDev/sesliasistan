"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { loadAthlete, useDikili } from "@/features/athletes/data";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { EditAthlete } from "@/features/athletes/EditAthlete";
import { loadRaces } from "@/features/athletes/races";
import { historyOf } from "@/lib/raceResults";
import { Loading } from "@/components/ui/Loader";
import { useData } from "@/features/data/DataProvider";
import { useToast } from "@/components/ui/ToastProvider";
import { AthleteCardView } from "@/features/athletes/AthleteCardView";

// Tek sporcu (salt okunur). Yalnızca izinli hesap görür.
export default function AthletePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed) return null;
  return <Detail />;
}

// Katıldığı yarışlar ve sırası (yarışlar yalnız ana hesaba açık; diğerlerinde null)
function useRaceHistory(athleteId) {
  const { profile } = useAuth();
  const [rows, setRows] = useState(null);
  const owner = profile?.role === "owner";
  useEffect(() => {
    if (!owner) return;
    let on = true;
    loadRaces(profile.orgId || profile.uid)
      .then((list) => on && setRows(historyOf(list, athleteId)))
      .catch(() => on && setRows([]));
    return () => void (on = false);
  }, [owner, profile?.orgId, profile?.uid, athleteId]);
  return owner ? rows : undefined; // undefined: yarış göremez, null: okunuyor
}

function Detail() {
  const { id } = useParams();
  const load = useCallback(() => loadAthlete(id), [id]);
  const { data, err, reload } = useDikili(`a:${id}`, load);
  const user = useDikiliUser();
  const [edit, setEdit] = useState(false);
  const { birthdays, saveBirthday } = useData();
  const toast = useToast();
  const races = useRaceHistory(id);
  const a = err ? null : data?.athlete;

  if (!a) {
    return (
      <main className="mx-auto max-w-[30rem] px-5">
        <PageHeader title="Sporcu" back="/athletes" />
        {err?.code === "permission-denied" ? (
          <DikiliLogin denied={!!user} onDone={reload} />
        ) : err ? (
          <button onClick={reload} className="mt-4 w-full rounded-2xl bg-card px-4 py-4 text-left text-[0.875rem]">
            <b className="block font-semibold text-rec">{err.text}</b>
            <span className="text-mut">Tekrar denemek için dokun</span>
          </button>
        ) : (
          <Loading />
        )}
      </main>
    );
  }

  return (
    <AthleteCardView
      a={a}
      classes={data.classes}
      coaches={data.coaches}
      history={data.history}
      races={races}
      birthdays={birthdays}
      toast={toast}
      onEdit={() => setEdit(true)}
      onAddBday={(bday) => {
        saveBirthday({ name: a.studentName, ...bday, note: "Sporcu", athleteId: a.id, phone: a.parentPhone || "" });
        toast(`${a.studentName.split(" ")[0]} · doğum günü takvime eklendi`);
      }}
      header={
        <>
          <PageHeader title="Sporcu" back="/athletes">
            <button onClick={() => setEdit(true)} aria-label="Düzenle" className="grid size-10 place-items-center rounded-full bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-90">
              <Icon name="edit" className="size-5" />
            </button>
          </PageHeader>
          <EditAthlete
            athlete={a}
            names={{ classes: data.classes, coaches: data.coaches }}
            open={edit}
            onClose={() => setEdit(false)}
            onSaved={() => {
              setEdit(false);
              reload();
            }}
          />
        </>
      }
    />
  );
}
