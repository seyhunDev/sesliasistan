"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { isActive, loadAthletes, message, updateAthlete, useDikili } from "@/features/athletes/data";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { RaceEditor } from "@/features/athletes/RaceEditor";
import { placeText } from "@/features/athletes/RaceList";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/buttonClass";
import { coachStart } from "@/features/athletes/raceDocs";
import { addRacePlan, deleteRace, freshRace, loadRaces, racesNow, saveRace, saveRaceResults } from "@/features/athletes/races";
import { loadShared, loadSharedList, pullSheets, shareRace } from "@/features/athletes/sharedRaces";
import { fromShared, newSheets, pickable } from "@/lib/sharedRace";
import { stampResults } from "@/lib/raceDay";
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
  return <Race orgId={profile.orgId} uid={user.uid} email={profile.email || user.email} by={{ name: profile?.name ?? "Kullanıcı" }} mail={mail} coach={coach} />;
}

// Listeden yeni açıldıysa (1 dk içinde okunan liste) yarış bellekten gelir: "yükleniyor" yok, yeniden okuma yok
const cachedRace = (orgId, id) => (id === "new" ? null : racesNow(orgId, 60e3)?.find((x) => x.id === id) || null);

function Race({ orgId, uid, email, by, mail, coach }) {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { saveDrafts, plans } = useData();
  const { openAdd } = useAdd();
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const [race, setRace] = useState(() => cachedRace(orgId, id));
  const [missingRace, setMissingRace] = useState(false);
  const [head0, setHead] = useState(null); // başlık: yarış bilgisi değişince güncellenir
  const [menu, setMenu] = useState(false); // sağ üstteki ⋯ (düzenle, talimat, yarışı sil)
  // Ortak yarış (lib/sharedRace.js): bağ { shared, sharedAt } kayıtlarda korunur; ortaktan yenilik gelince düzenleyici yeniden kurulur
  const link = useRef(null);
  const pub = useRef(Promise.resolve());
  const [ver, setVer] = useState(0);
  const [sharedList, setSharedList] = useState([]); // yeni yarışta seçilebilecek ortak yarışlar
  useEffect(() => {
    if (id !== "new") return;
    Promise.all([loadSharedList(todayStr()), loadRaces(orgId)]).then(([l, mine]) => setSharedList(pickable(l, mine, todayStr())), () => {});
  }, [orgId, id]);
  useEffect(() => {
    if (cachedRace(orgId, id)) return;
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

  // Bağlı yarış açılınca ortaktaki yenilik (talimat, tarih, yer) kulübün yarışına işlenir (ekleyen kulübün kendisi hariç)
  const rid = race?.id || "";
  useEffect(() => {
    if (!rid || !race.shared) return;
    let live = true;
    loadShared(race.shared, true).then(async (s) => {
      if (!live || !s || s.by === uid || !(s.at > (race.sharedAt || ""))) return;
      const next = { ...race, ...fromShared(s) };
      link.current = { shared: s.id, sharedAt: s.at };
      await saveRace(orgId, uid, next);
      if (live) (setRace(next), setVer((v) => v + 1));
    }, () => {});
    return () => void (live = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid, orgId, uid]);
  // Ortağa yüklenen sonuç listelerinden kulübün sporcuları bulunur (sporcu listesi gelince)
  const athletes = data?.athletes;
  useEffect(() => {
    if (!rid || !race.shared || !athletes) return;
    let live = true;
    loadShared(race.shared).then(async (s) => {
      const ids = newSheets(s, race);
      if (!live || !ids.length) return;
      const ours = athletes.filter((a) => (race.athleteIds || []).includes(a.id));
      const pool = [...ours, ...athletes.filter((a) => isActive(a) && !ours.includes(a))];
      const got = await pullSheets({ orgId, race, sharedId: s.id, ids, pool });
      if (!got || !live) return;
      got.results = stampResults(race.results, got.results, todayStr());
      await saveRaceResults(orgId, race.id, got.results, got.extra);
      const athleteIds = [...new Set([...(race.athleteIds || []), ...got.extra])];
      setRace((p) => ({ ...p, results: got.results, athleteIds }));
      window.dispatchEvent(new CustomEvent("sa-race-saved", { detail: { ...race, results: got.results, athleteIds } }));
    }, () => {});
    return () => void (live = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid, orgId, athletes]);

  // Yeni yarış ilk kaydında adresi kendi kimliğine döner (geri/yenile doğru yarışı açsın).
  // Kayıttan sonra ortak kısım arkada yayınlanır (sharedRaces.js; yalnız değişince ve yetki varsa yazar).
  const onSave = useCallback(
    async (r, cur) => {
      setHead({ name: r.name, startDate: r.startDate, endDate: r.endDate, district: r.district, city: r.city });
      const l = link.current || (r.shared ? { shared: r.shared, sharedAt: r.sharedAt || "" } : null);
      const data = { ...r, id: cur, shared: l?.shared || "", sharedAt: l?.sharedAt || "" };
      const nid = await saveRace(orgId, uid, data);
      if (!cur) window.history.replaceState(null, "", `/athletes/races/${nid}`);
      // Sırayla: ilk yayın bitmeden ikinci kayıt ikinci bir ortak yarış açmasın
      pub.current = pub.current.then(() =>
        shareRace({ orgId, uid, email, name: by.name, race: { ...data, id: nid }, link: link.current || l }).then(
          (n) => n && (link.current = { shared: n.shared, sharedAt: n.sharedAt }),
          (e) => console.warn("[ortak yarış] yayınlanamadı", e?.code || e),
        ),
      );
      return nid;
    },
    [orgId, uid, email, by.name],
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

  // Lacivert üstün başlığı (RaceEditor üst kısmı onun altına koyar): geri, ad, yer · tarih, ⋯
  const head = (
    <header className="flex items-center gap-2.5">
      <BackButton href="/athletes/races" />
      <div className="min-w-0 flex-1 leading-tight">
        <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">{(head0 || race)?.name || (id === "new" ? "Yeni yarış" : "Yarış")}</h1>
        {race && <p className="truncate text-[0.8125rem] text-white/65">{subText({ ...race, ...head0 })}</p>}
      </div>
      {(race?.id || head0) && (
        <button type="button" onClick={() => setMenu(true)} aria-label="Yarış ayarları" data-press className={buttonClass({ variant: "back" })}>
          <Icon name="more" className="size-5" />
        </button>
      )}
    </header>
  );

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      {!race || missingRace ? (
        <>
          <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]">{head}</section>
          <div className="relative -mx-5 -mt-6 rounded-t-[1.75rem] bg-bg px-5 pt-1">
            {err?.code === "permission-denied" && <DikiliLogin denied={!!user} onDone={reload} />}
            {missingRace ? <p className="mt-6 text-center text-[0.875rem] text-mut">Yarış bulunamadı.</p> : <Loading label="Yarış yükleniyor" />}
          </div>
        </>
      ) : (
        <>
          <RaceEditor
            key={ver}
            head={head}
            sharedList={id === "new" ? sharedList : []}
            alert={err?.code === "permission-denied" && <DikiliLogin denied={!!user} onDone={reload} />}
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
        </>
      )}
    </main>
  );
}

// Başlığın alt satırı (tarih tek yerde; kalan gün lacivertte büyük): "Foça, İzmir · 26–28 Eki"
const shortDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
function subText(r) {
  const a = r.startDate;
  const b = r.endDate && r.endDate !== a ? r.endDate : "";
  const when = !a ? "" : !b ? shortDay(a) : a.slice(0, 7) === b.slice(0, 7) ? `${+a.slice(8)}–${shortDay(b)}` : `${shortDay(a)}–${shortDay(b)}`;
  return [placeText(r), when].filter(Boolean).join(" · ");
}
