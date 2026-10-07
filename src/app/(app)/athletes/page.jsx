"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { todayStr } from "@/lib/utils/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { isActive, loadAthletes, useDikili } from "@/features/athletes/data";
import { DikiliLogin, disconnect, useDikiliUser } from "@/features/athletes/Connect";
import { Loading } from "@/components/ui/Loader";
import { useData } from "@/features/data/DataProvider";
import { AccessSheet } from "@/features/athletes/AccessSheet";
import { syncAthleteAtt } from "@/features/athletes/mirror";
import { useRaceHome } from "@/features/athletes/raceHome";
import { AthletesView, MoreMenu } from "@/features/athletes/AthletesView";

// Sporcular (kulübün diğer projesinden, salt okunur). Yalnızca izinli hesap görür.
export default function AthletesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed) return null;
  return <AthleteList />;
}

function AthleteList() {
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const [passive, setPassive] = useState(false);
  const { members, myUid } = useData();
  const race = useRaceHome();
  const [sel, setSel] = useState(null); // toplu seçim: Set(sporcu kimliği) | null
  const [access, setAccess] = useState(null); // hesap açılacak sporcular
  // Uygulamada kişisi olan sporcular (kulüp kimliği → kişi)
  const linked = new Map(members.filter((m) => m.athleteId && m.status !== "left").map((m) => [m.athleteId, m]));
  // Liste yüklenince hesabı olan sporcuların yoklama kopyası güncellenir (kulüp uygulamasından girilenler de gelsin)
  const synced = useRef(null);
  useEffect(() => {
    if (!data || synced.current === data) return;
    synced.current = data;
    for (const a of data.athletes) {
      const m = members.find((x) => x.athleteId === a.id && x.status !== "left" && x.account !== false);
      if (m) syncAthleteAtt(myUid, m.uid, a).catch(() => {});
    }
  }, [data, members, myUid]);
  const toggle = (id) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const all = data?.athletes || [];
  const activeCount = all.filter(isActive).length;
  const inApp = [...linked.values()].filter((m) => m.account !== false).length;
  const ok = data && !err;

  return (
    <main className={`mx-auto max-w-[30rem] px-5 ${sel ? "pb-[calc(7rem+env(safe-area-inset-bottom))]" : "pb-[calc(2.5rem+env(safe-area-inset-bottom))]"}`}>
      <PageHeader
        title={sel ? "Uygulamaya ekle" : "Sporcular"}
        sub={err ? "Kulüp verisi" : !data ? "Yükleniyor…" : sel ? "Hesap açılacak sporcuları seç" : [`${activeCount} aktif`, all.length > activeCount && `${all.length - activeCount} pasif`, inApp && `${inApp} uygulamada`].filter(Boolean).join(" · ")}
      >
        {ok &&
          (sel ? (
            <button type="button" onClick={() => setSel(null)} className="h-10 rounded-full bg-card px-4 text-[0.875rem] font-semibold text-acc shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-95">
              Bitti
            </button>
          ) : (
            <MoreMenu
              items={[
                { icon: "users", label: "Uygulamaya ekle", sub: "Sporculara giriş hesabı aç", onClick: () => setSel(new Set()) },
                all.length > activeCount && { icon: "filter", label: passive ? "Pasifleri gizle" : "Pasifleri göster", sub: `${all.length - activeCount} pasif sporcu`, onClick: () => setPassive((v) => !v) },
                { icon: "repeat", label: "Listeyi yenile", onClick: () => reload() },
                user && { icon: "x", label: "Kulüp bağlantısını kes", sub: user.email, onClick: () => disconnect().then(reload) },
              ]}
            />
          ))}
      </PageHeader>

      {err?.code === "permission-denied" ? (
        <DikiliLogin denied={!!user} onDone={reload} />
      ) : (
        err && (
          <button onClick={reload} className="mt-4 w-full rounded-2xl bg-card px-4 py-4 text-left text-[0.875rem] shadow-[0_1px_3px_rgba(38,40,44,.05)]">
            <b className="block font-semibold text-rec">{err.text}</b>
            <span className="text-mut">Tekrar denemek için dokun</span>
          </button>
        )
      )}
      {!data && !err && <Loading label="Sporcular yükleniyor" />}

      {ok && (
        <>
          <AthletesView all={all} classes={data.classes} coaches={data.coaches} today={todayStr()} race={race.allowed ? race : null} linked={linked} passive={passive} sel={sel} onToggle={toggle} />
          {sel && (
            <div data-pagebar="" className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
              <div className="mx-auto flex max-w-[26rem] gap-2">
                <button
                  type="button"
                  onClick={() => setSel(new Set(all.filter((a) => isActive(a) && !(linked.has(a.id) && linked.get(a.id).account !== false)).map((a) => a.id)))}
                  className="h-12 rounded-xl bg-card px-4 text-[0.875rem] font-semibold text-acc ring-1 ring-line"
                >
                  Tümünü seç
                </button>
                <button
                  type="button"
                  disabled={!sel.size}
                  onClick={() => setAccess(all.filter((a) => sel.has(a.id)))}
                  className="h-12 flex-1 rounded-xl bg-deep text-[0.9375rem] font-semibold text-white disabled:opacity-40"
                >
                  {sel.size ? `${sel.size} sporcuya hesap aç` : "Sporcu seç"}
                </button>
              </div>
            </div>
          )}
          {access && (
            <AccessSheet
              key={access.map((a) => a.id).join(",")}
              open
              athletes={access}
              onClose={(finished) => {
                setAccess(null);
                if (finished) setSel(null);
              }}
            />
          )}
        </>
      )}
    </main>
  );
}
