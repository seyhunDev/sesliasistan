"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { loadAthletes, message, updateAthlete, useDikili } from "@/features/athletes/data";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { RaceEditor } from "@/features/athletes/RaceEditor";
import { leftText, placeText } from "@/features/athletes/RaceList";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/buttonClass";
import { coachStart } from "@/features/athletes/raceDocs";
import { addRacePlan, deleteRace, freshRace, loadRaces, saveRace } from "@/features/athletes/races";
import { addNoticePlans } from "@/features/athletes/raceNotice";
import { dropLive } from "@/features/athletes/raceLiveStore";
import { mailToMe } from "@/features/mail/outbox";
import { db } from "@/lib/firebase/clientApp";
import { doc } from "firebase/firestore";
import { updateDoc } from "@/lib/firebase/write";
import { todayStr } from "@/lib/utils/format";
import { goBack } from "@/lib/navTrail";

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
  // version: betik sürümü (1 yalnız kendine, 2 seçilen adreslere de gönderir); saved: kayıtlı alıcılar
  const mail = profile.mailSeen && profile.orgId === user.uid ? { version: profile.mailOutbox, saved: profile.mailTo } : null;
  // TYF formlarındaki antrenör bilgileri hesabın profilinde (users/{uid}.coach); yoksa ad ve e-posta hesaptan
  const coach = profile.coach || coachStart({ name: profile.name, email: profile.email || user.email });
  return <Race orgId={profile.orgId} uid={user.uid} by={{ name: profile?.name ?? "Kullanıcı" }} mail={mail} coach={coach} />;
}

function Race({ orgId, uid, by, mail, coach }) {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { saveDrafts, plans } = useData();
  const { openAdd } = useAdd();
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const [race, setRace] = useState(null);
  const [missingRace, setMissingRace] = useState(false);
  const [head, setHead] = useState(null); // başlık: yarış bilgisi değişince güncellenir
  const [menu, setMenu] = useState(false); // sağ üstteki ⋯ (düzenle, talimat, yarışı sil)
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
      setHead({ name: r.name, startDate: r.startDate, endDate: r.endDate, district: r.district, city: r.city });
      const nid = await saveRace(orgId, uid, { ...r, id: cur });
      if (!cur) window.history.replaceState(null, "", `/athletes/races/${nid}`);
      return nid;
    },
    [orgId, uid],
  );
  const onCoach = useCallback(
    (c) =>
      updateDoc(doc(db, "users", uid), { coach: c }).then(
        () => true,
        () => (toast("Antrenör bilgisi kaydedilemedi"), false),
      ),
    [uid, toast],
  );
  const onDelete = async (rid) => {
    try {
      await deleteRace(orgId, rid);
      dropLive(orgId, rid); // multimedya: rüzgâr, startlar, fotoğraf/video, genel sıralama
      goBack(router, "/athletes/races");
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
      <PageHeader title={(head || race)?.name || (id === "new" ? "Yeni yarış" : "Yarış")} sub={race ? subText({ ...race, ...head }) : ""} back="/athletes/races">
        {(race?.id || head) && (
          <button type="button" onClick={() => setMenu(true)} aria-label="Yarış ayarları" data-press className={buttonClass({ variant: "back" })}>
            <Icon name="more" className="size-5" />
          </button>
        )}
      </PageHeader>
      {err?.code === "permission-denied" && <DikiliLogin denied={!!user} onDone={reload} />}
      {missingRace ? (
        <p className="mt-6 text-center text-[0.875rem] text-mut">Yarış bulunamadı.</p>
      ) : !race ? (
        <Loading label="Yarış yükleniyor" />
      ) : (
        <RaceEditor
          orgId={orgId}
          start={race}
          athletes={data?.athletes || []}
          classes={data?.classes || []}
          athletesErr={err}
          onRetryAthletes={reload}
          onSave={onSave}
          onDelete={onDelete}
          plans={plans}
          menu={menu}
          onMenu={setMenu}
          onOpenPlan={(pid) => openAdd({ edit: { kind: "plan", id: pid } })}
          onPlan={(r) => addRacePlan(saveDrafts, r, by)}
          onNoticePlan={(r) => addNoticePlans(saveDrafts, r, by)}
          onSaveAthlete={onSaveAthlete}
          onMail={mail ? async (m) => (await mailToMe(uid, m), mail.version >= (m.to.length ? 2 : 1)) : null}
          mailTo={mail?.saved}
          coach={coach}
          onCoach={onCoach}
          onMailTo={(list) => updateDoc(doc(db, "users", uid), { mailTo: list }).catch(() => toast("Adres kaydedilemedi"))}
        />
      )}
    </main>
  );
}

// Başlığın alt satırı (tarih tek yerde): "Foça, İzmir · 26–28 Eki · 6 gün kaldı"
const shortDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
function subText(r) {
  const a = r.startDate;
  const b = r.endDate && r.endDate !== a ? r.endDate : "";
  const when = !a ? "" : !b ? shortDay(a) : a.slice(0, 7) === b.slice(0, 7) ? `${+a.slice(8)}–${shortDay(b)}` : `${shortDay(a)}–${shortDay(b)}`;
  return [placeText(r), when, a && leftText(r)].filter(Boolean).join(" · ");
}
