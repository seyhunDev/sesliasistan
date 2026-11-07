"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Loading } from "@/components/ui/Loader";
import { LoadFail } from "@/components/ui/LoadFail";
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
import { coachStart } from "@/features/athletes/raceDocs";
import { addRacePlan, freshRace, loadRace, loadRaces, racesNow, saveRace, saveRaceResults } from "@/features/athletes/races";
import { loadShared, loadSharedList, pullSheets, shareRace } from "@/features/athletes/sharedRaces";
import { fromShared, newSheets, pickable } from "@/lib/sharedRace";
import { stampResults } from "@/lib/raceDay";
import { addNoticePlans } from "@/features/athletes/raceNotice";
import { wipeRace } from "@/features/athletes/raceWipe";
import { mailToMe } from "@/features/mail/outbox";
import { db } from "@/lib/firebase/clientApp";
import { doc } from "firebase/firestore";
import { updateDoc } from "@/lib/firebase/write";
import { todayStr } from "@/lib/utils/format";
import { goBack } from "@/lib/navTrail";
import { siteDocBlob } from "@/features/athletes/raceSite";
import { SiteDocs } from "@/features/athletes/SiteDocs";
import { importResults, importToast } from "@/features/athletes/resultsImport";

// Tek yarış (yeni yarış için /athletes/races/new)
export default function RacePage() {
  const { user, profile, isOwner } = useAuth();
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
  const q = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { saveDrafts, plans, updateRecord, isStaff } = useData();
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
  // Önce telefondaki kopya (hemen çizilir), sonra sunucu; sunucudaki farklıysa düzenleyici yeniden kurulur.
  // Sunucuya ulaşılamazsa kopya kalır; kopya da yoksa sonsuz "yükleniyor" yerine "Tekrar dene" (lib/firebase/fastRead.js)
  const [fail, setFail] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (cachedRace(orgId, id)) return;
    let on = true;
    let shown = null;
    const fromCache = (list) => {
      if (!on || id === "new" || shown) return;
      const r = list.find((x) => x.id === id);
      if (r) (shown = r), setRace((p) => p || r);
    };
    loadRaces(orgId, fromCache).then(
      (list) => {
        if (!on) return;
        if (id === "new") return setRace(freshRace(list.find((r) => r.signer) || list[0], todayStr()));
        const r = list.find((x) => x.id === id);
        if (!r) return setMissingRace(true);
        if (shown && JSON.stringify(shown) === JSON.stringify(r)) return;
        setRace(r);
        if (shown) setVer((v) => v + 1);
      },
      () => on && !shown && (id === "new" ? setRace(freshRace(undefined, todayStr())) : setFail(true)),
    );
    return () => void (on = false);
  }, [orgId, id, retry]);

  // Bağlı yarış açılınca ortaktaki yenilik (talimat, tarih, yer) kulübün yarışına işlenir (ekleyen kulübün kendisi hariç)
  const rid = race?.id || "";
  useEffect(() => {
    if (!rid || !race.shared) return;
    let live = true;
    loadShared(race.shared, true).then(async (s) => {
      if (!live || !s || s.by === uid || !(s.at > (race.sharedAt || ""))) return;
      const next = { ...race, ...fromShared(s) };
      link.current = { shared: s.id, sharedAt: s.at };
      await saveRace(orgId, uid, next, race); // yalnız ortaktan gelen alanlar
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

  // Yarış sitesinden gelen sonuç belgesi (SiteDocs, raceSite.js): elle yüklenen sonuç gibi işlenir; dönüş belgenin yeni durumu
  const raceNow = useRef(race);
  useEffect(() => {
    raceNow.current = race;
  }, [race]);
  const onSiteResults = useCallback(
    async (d) => {
      const cur = raceNow.current;
      if (!athletes || !cur?.id) return null;
      const ours = athletes.filter((a) => (cur.athleteIds || []).includes(a.id));
      const club = athletes.filter((a) => isActive(a) && !ours.includes(a));
      const file = new File([await siteDocBlob(cur.id, d)], d.file?.name || `${d.name}.pdf`, { type: "application/pdf" });
      const got = await importResults({ orgId, race: cur, athletes: ours, club, file });
      got.results = stampResults(cur.results, got.results, todayStr());
      await saveRaceResults(orgId, cur.id, got.results, got.extra);
      const athleteIds = [...new Set([...(cur.athleteIds || []), ...got.extra])];
      const next = { ...cur, results: got.results, athleteIds };
      raceNow.current = next;
      setRace(next);
      window.dispatchEvent(new CustomEvent("sa-race-saved", { detail: next }));
      return { state: "used", note: importToast(got), undo: { file: got.results.files?.at(-1)?.id || "" } };
    },
    [athletes, orgId],
  );
  // Sunucu siteden gelen talimatı işledi: yarış yeniden okunur
  const onSiteRefresh = useCallback(async () => {
    const cur = raceNow.current;
    if (!cur?.id) return;
    const fresh = await loadRace(orgId, cur.id).catch(() => null);
    if (!fresh?.notice) return;
    const next = { ...raceNow.current, notice: fresh.notice };
    raceNow.current = next;
    setRace(next);
    window.dispatchEvent(new CustomEvent("sa-race-saved", { detail: next }));
  }, [orgId]);
  // Geri al: sonuç ya da talimat bilgisi (program) öncesine döner
  const onSiteUndo = useCallback((patch) => {
    const next = { ...raceNow.current, ...patch };
    raceNow.current = next;
    setRace(next);
    window.dispatchEvent(new CustomEvent("sa-race-saved", { detail: next }));
  }, []);

  // Yeni yarış ilk kaydında adresi kendi kimliğine döner (geri/yenile doğru yarışı açsın).
  // Kayıttan sonra ortak kısım arkada yayınlanır (sharedRaces.js; yalnız değişince ve yetki varsa yazar).
  const onSave = useCallback(
    async (r, cur, base = null) => {
      setHead({ name: r.name, startDate: r.startDate, endDate: r.endDate, district: r.district, city: r.city });
      const l = link.current || (r.shared ? { shared: r.shared, sharedAt: r.sharedAt || "" } : null);
      const data = { ...r, id: cur, shared: l?.shared || "", sharedAt: l?.sharedAt || "" };
      // base: sayfanın bildiği son kayıt; yalnız değişen alanlar yazılır (başka yerin yazdığı talimat, sonuç, belgeler ezilmez)
      const nid = await saveRace(orgId, uid, data, base && cur ? { ...base, id: cur } : null);
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
      await wipeRace(orgId, rid); // yarışla birlikte evrak, canlı kayıt, ortak yarış ve açık ekran işareti de gider
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

  // Multimedya sayfası kalktı (Seyhun 2026-11-01 "yarışın multimedyasını kaldır, tek Yayın"): yarış günü de bu sayfa kalır, Yayın düğmesi
  // yayın sayfasına gider. ⋯'den bölüm (?sec=) açılınca kalır.
  const [siteNew, setSiteNew] = useState(0); // siteden gelen görülmemiş belgeler (Dokümanlar sekmesinde)
  const [sec] = useState(() => q.get("sec") || ""); // sayfa açılırken bir kez (RaceEditor açınca adresten siler)
  const plain = !!race && !missingRace;
  useEffect(() => {
    if (!plain) return;
    window.dispatchEvent(new CustomEvent("sa-plain", { detail: true }));
    return () => window.dispatchEvent(new CustomEvent("sa-plain", { detail: false }));
  }, [plain]);

  // Başlık (yarış kart, Seyhun 2026-11-07 "diğer sayfalardaki gibi, başlık geri butonun yanında"): Planlar gibi yuvarlak geri, yanında yarışın
  // adı, sağda yuvarlak ⋯ (Yayın, düzenle, siteden bağla, sil); altında tek satır: tarih · yer · kalan gün (yarış sürerken kırmızı nokta)
  const on = !!race && racing({ ...race, ...head0 });
  const head = (
    <header>
      <div className="flex items-center gap-2.5">
        <BackButton href="/athletes/races" />
        <h1 className="min-w-0 flex-1 truncate">{(head0 || race)?.name || (id === "new" ? "Yeni yarış" : "Yarış")}</h1>
        {(race?.id || head0) && (
          <button type="button" onClick={() => setMenu(true)} aria-label="Yarış ayarları" data-press className="btn btn-round">
            <Icon name="more" className="size-6" />
          </button>
        )}
      </div>
      {race && (
        <p className="rz-sub ml-[3.375rem] mt-0.5 flex items-center gap-1.5 text-[0.9375rem]">
          {on && <span className="size-2 shrink-0 rounded-full bg-rec" aria-hidden="true" />}
          <span className="truncate">{subText({ ...race, ...head0 })}</span>
        </p>
      )}
    </header>
  );

  return (
    <main className="rz rzc split split-even mx-auto max-w-[30rem] px-5 pb-[calc(7rem+env(safe-area-inset-bottom))]">
      {!race || missingRace ? (
        <>
          <section className="ck split-top -mx-5 px-5 pb-10 pt-[calc(0.75rem+env(safe-area-inset-top))]">{head}</section>
          <div className="rzc-body bg-bg pb-4">
            {err?.code === "permission-denied" && <DikiliLogin denied={!!user} onDone={reload} />}
            {missingRace ? <p className="mt-6 text-center text-[0.875rem] text-mut">Yarış bulunamadı.</p> : fail && !race ? <LoadFail onRetry={() => (setFail(false), setRetry((n) => n + 1))} /> : <Loading label="Yarış yükleniyor" />}
          </div>
        </>
      ) : (
        <>
          <RaceEditor
            key={ver}
            sec={sec}
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
            onSyncPlan={isStaff ? null : (pid, patch) => updateRecord("plan", pid, patch, by)}
            onSaveAthlete={onSaveAthlete}
            onMail={mail ? async (m) => (await mailToMe(uid, m), mail.version >= (m.to.length ? 2 : 1)) : null}
            mailTo={mail?.saved}
            coach={coach}
            onCoach={onCoach}
            siteNew={siteNew}
            siteDocs={race.id && race.site?.act ? (shown) => <SiteDocs orgId={orgId} race={race} shown={shown} onNew={setSiteNew} ready={!!athletes} onResults={onSiteResults} onUndo={onSiteUndo} onRefresh={onSiteRefresh} /> : null}
            onMailTo={(list) => updateDoc(doc(db, "users", uid), { mailTo: list }).catch(() => toast("Adres kaydedilemedi"))}
          />
        </>
      )}
    </main>
  );
}

// Başlığın alt satırı: "11–12 Kas · Dikili · 5 gün kaldı"; yarış sürerken "Yarışta · 2. gün · Dikili"; bitince "… · Bitti"
const shortDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
const gap = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / 864e5);
// Yarış bugün sürüyor mu (başlangıçtan bitişe)
function racing(r) {
  if (!r.startDate) return false;
  const t = todayStr();
  return t >= r.startDate && t <= (r.endDate || r.startDate);
}

function subText(r) {
  const a = r.startDate;
  const b = r.endDate && r.endDate !== a ? r.endDate : "";
  const when = !a ? "" : !b ? shortDay(a) : a.slice(0, 7) === b.slice(0, 7) ? `${+a.slice(8)}–${shortDay(b)}` : `${shortDay(a)}–${shortDay(b)}`;
  const place = r.district || r.city || placeText(r);
  if (!a) return place;
  const t = todayStr();
  const n = gap(t, a);
  if (racing(r)) return [`Yarışta · ${gap(a, t) + 1}. gün`, place].filter(Boolean).join(" · ");
  const left = n > 1 ? `${n} gün kaldı` : n === 1 ? "Yarın" : "Bitti";
  return [when, place, left].filter(Boolean).join(" · ");
}
