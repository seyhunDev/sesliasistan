"use client";

// Siteden yarış al (Seyhun 2026-11-03 "önce yarış listesi alalım, ben seçeyim; bulunduğumuz sezon varsayılan"):
// TYF Yelken Ligi sitesindeki sezonlar › ayaklar › sınıflar. Sınıfa dokununca sitedeki belgeleri görünür (açılır);
// "Yarışı al" yarışı yarış ilanından açar (talimat okunur, elle yüklemedeki gibi) ve belgelerini izlemeye alır
// (raceSite.js, /api/race-site). Zaten alınmış sınıf "Alındı" yazar, dokununca yarışı açar.
// Alma arka planda (siteTake.js, Seyhun 2026-11-04): adımlar ve gelen belgeler ilerleme kartında; ekran kapansa da iş biter.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { LoadFail } from "@/components/ui/LoadFail";
import { PdfViewer } from "@/components/ui/PdfViewer";
import { ListHead, Row, RowList, SkelRow, Tag } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { Loader } from "@/components/ui/Loader";
import { loadRaces } from "@/features/athletes/races";
import { loadSiteList, mergeSite, siteFile } from "@/features/athletes/raceSite";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { STEPS, clearTask, startTake, useSiteTasks } from "@/features/athletes/siteTake";
import { RacePickSheet } from "@/features/athletes/RacePickSheet";
import { kindLabel, pickSeason } from "@/lib/siteDocs";
import { todayStr } from "@/lib/utils/format";

export default function SitePage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email) && user?.uid && user.uid === profile?.orgId;
  useEffect(() => {
    if (profile && !allowed) router.replace("/athletes/races");
  }, [profile, allowed, router]);
  if (!allowed) return null;
  return <Site orgId={profile.orgId} uid={user.uid} />;
}

const when = (at) => {
  const d = new Date(`${String(at).slice(0, 10)}T12:00:00`);
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })} ${String(at).slice(11, 16)}`;
};
const ayak = (s) => String(s || "").replace(/AYAK/i, "Ayak");

function Site({ orgId, uid }) {
  const router = useRouter();
  const toast = useToast();
  const [season, setSeason] = useState("");
  const [data, setData] = useState(null);
  const [fail, setFail] = useState(false);
  const [races, setRaces] = useState([]);
  const [open, setOpen] = useState("");
  const [view, setView] = useState(null);
  const [retry, setRetry] = useState(0);
  const [ver, setVer] = useState(0);
  const tasks = useSiteTasks();
  const [link, setLink] = useState(null); // { leg, c, had }: var olan yarışa bağla ya da alınmışı birleştir (Seyhun 2026-11-07)
  // Yarış sayfasından "Siteden bağla" (?into=<yarış>): seçilen sınıf o yarışa bağlanır, alınmışsa onunla birleşir
  const [intoId] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("into") || ""));
  const into = races.find((r) => r.id === intoId && !r.site?.act) || null;
  const ask = useConfirm();

  useEffect(() => {
    loadRaces(orgId).then(setRaces, () => {});
  }, [orgId, ver]);
  useEffect(() => {
    let on = true;
    loadSiteList(season).then(
      (d) => {
        if (!on) return;
        // İlk açılışta bulunduğumuz sezon (sitedeki ilk sekme değilse yeniden istenir)
        const want = season || pickSeason(d.seasons.map((s) => s.name), todayStr());
        if (!season && want !== d.season) return setSeason(want);
        setData(d);
        if (!season) setSeason(d.season);
      },
      () => on && setFail(true),
    );
    return () => void (on = false);
  }, [season, retry]);

  const pick = (name) => {
    if (name === season) return;
    setData(null);
    setFail(false);
    setOpen("");
    setSeason(name);
  };
  const again = () => (setFail(false), setRetry((n) => n + 1));
  const have = (act) => races.find((r) => r.site?.act === act);
  // Alınmış site yarışını kendi yarışınla birleştir (kopya silinir, belgeler senin yarışına)
  const merge = (had, to) =>
    ask({
      title: `"${to.name || "Yarış"}" ile birleştirilsin mi?`,
      text: "Siteden gelen belgeler, sporcu ve renk listeleri, program o yarışa taşınır; oradaki sporcular ve evrak kalır. Siteden açılan kopya silinir.",
      yes: "Birleştir",
      run: async () => {
        try {
          const id = await mergeSite(had.id, to.id);
          toast("Birleştirildi");
          router.replace(`/athletes/races/${id}?sec=site`);
        } catch (e) {
          toast(e.message || "Birleştirilemedi");
          throw e;
        }
      },
    });
  const take = (leg, c, into = null) => {
    const had = have(c.act);
    if (had && into) return merge(had, into);
    if (had) return router.push(`/athletes/races/${had.id}?sec=site`);
    clearTask(c.act);
    startTake({
      orgId, uid, races, season: data.season, leg, c, into,
      // Ekran kapanmış olabilir: bildirimden açılır
      onDone: (id, name) => (setVer((n) => n + 1), toast(`${name || c.cls} alındı`, { action: { label: "Aç", onClick: () => router.push(`/athletes/races/${id}?sec=site`) } })),
      onFail: (m) => toast(m),
    });
  };

  return (
    <main className="split mx-auto max-w-[30rem] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <header className="flex items-center gap-2.5">
          <BackButton href="/athletes/races" />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">{into ? "Siteden bağla" : "Siteden yarış al"}</h1>
        </header>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          {(data?.seasons || (season ? [{ name: season }] : [])).map((s) => (
            <button key={s.name} type="button" data-press onClick={() => pick(s.name)} className={`raised h-9 shrink-0 rounded-xl border px-3.5 text-[0.875rem] font-semibold ${s.name === season ? "act-main" : ""}`}>
              {s.name}
            </button>
          ))}
        </div>
      </section>
      <div className="split-cols relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {fail && <LoadFail onRetry={again} />}
        {!data && !fail && (
          <RowList>
            <SkelRow />
            <SkelRow />
            <SkelRow />
          </RowList>
        )}
        {data && !data.legs.length && <p className="text-center text-[0.875rem] text-mut">Bu sezonda yarış yok.</p>}
        {data?.legs.map((leg) => (
          <section key={leg.n}>
            <ListHead title={ayak(leg.name)} count={leg.classes.length} />
            <RowList>
              {leg.classes.map((c) => {
                const had = have(c.act);
                const k = `${leg.n}-${c.act}`;
                return (
                  <div key={c.act} className="border-t border-line first:border-t-0">
                    <Row onClick={() => setOpen(open === k ? "" : k)} title={c.cls} sub={c.docs.length ? `${c.docs.length} belge · son ${when(c.docs[0].at)}` : "Belge yok"} right={had ? <Tag tone="gen">Alındı</Tag> : null} chev={false} />
                    {open === k && (
                      <div className="pb-3">
                        {c.docs.map((d) => (
                          <button key={`${d.src}-${d.fid}`} type="button" data-press="row" onClick={() => setView(d)} className="block w-full border-t border-line py-2 pl-3 text-left">
                            <b className="block truncate text-[0.875rem] font-semibold">{d.name}</b>
                            <small className="block truncate text-[0.75rem] text-mut">{`${kindLabel(d.kind)} · ${when(d.at)}`}</small>
                          </button>
                        ))}
                        {tasks[c.act] ? (
                          <TakeCard t={tasks[c.act]} onOpen={() => router.push(`/athletes/races/${tasks[c.act].raceId}?sec=site`)} onRetry={() => take(leg, c)} />
                        ) : (
                          <>
                            {into ? (
                              <Button variant="primary" full className="mt-2" onClick={() => take(leg, c, into)}>
                                {had ? `${into.name || "Yarışınla"} birleştir` : `${into.name || "Yarışına"} bağla`}
                              </Button>
                            ) : (
                              <>
                                <Button variant="primary" full className="mt-2" onClick={() => take(leg, c)}>
                                  {had ? "Yarışı aç" : "Yarışı al"}
                                </Button>
                                <Button variant="secondary" full className="mt-2" onClick={() => setLink({ leg, c, had })}>
                                  {had ? "Yarışımla birleştir" : "Var olan yarışıma bağla"}
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </RowList>
          </section>
        ))}
      </div>
      <RacePickSheet open={!!link} onClose={() => setLink(null)} orgId={orgId} title={link?.had ? "Hangi yarışınla birleşsin?" : "Hangi yarışına bağlansın?"} near={link?.had?.startDate || link?.c.docs.at(-1)?.at?.slice(0, 10) || ""} skip={link?.had?.id || ""} onPick={(r) => (take(link.leg, link.c, r), setLink(null))} />
      {view && <PdfViewer title={view.name} load={() => siteFile(view)} onClose={() => setView(null)} />}
    </main>
  );
}

// Alma ilerlemesi: adımlar (geçen ✓, süren dönen, gelecek soluk), belgeler gelirken dolan çubuk; bitince "Yarışı aç"
function TakeCard({ t, onOpen, onRetry }) {
  const pct = t.total ? Math.round(((t.got || 0) / t.total) * 100) : 100;
  return (
    <div className="mt-2 rounded-2xl border border-line bg-bg px-3.5 py-3">
      <ol className="space-y-2">
        {STEPS.map((name, i) => {
          const done = t.step > i || (i === 3 && t.done);
          const now = t.step === i && !t.done && !t.error;
          return (
            <li key={name} className={`flex items-center gap-2.5 text-[0.875rem] font-semibold transition-opacity duration-300 ${done || now ? "" : "opacity-40"}`}>
              <span className="flex size-5 shrink-0 items-center justify-center">
                {now ? <Loader size="sm" /> : done ? <span className="anim-in text-acc">✓</span> : <span className="size-1.5 rounded-full bg-current opacity-50" />}
              </span>
              <span className="min-w-0 flex-1 truncate">{i === 3 && t.total ? `${name.replace(" alınıyor", "")} ${t.got || 0}/${t.total}` : name}</span>
            </li>
          );
        })}
      </ol>
      {t.step >= 3 && t.total > 0 && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-acc transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
        </div>
      )}
      {t.error ? (
        <>
          <p className="mt-3 text-[0.8125rem] font-semibold text-warn">{t.error}</p>
          <Button variant="secondary" full className="mt-2" onClick={onRetry}>
            Tekrar dene
          </Button>
        </>
      ) : t.raceId ? (
        <Button variant="primary" full className="mt-3" onClick={onOpen}>
          Yarışı aç
        </Button>
      ) : null}
    </div>
  );
}
