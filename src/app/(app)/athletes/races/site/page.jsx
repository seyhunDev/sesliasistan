"use client";

// Siteden yarış al (Seyhun 2026-11-03 "önce yarış listesi alalım, ben seçeyim; bulunduğumuz sezon varsayılan"):
// TYF Yelken Ligi sitesindeki sezonlar › ayaklar › sınıflar. Sınıfa dokununca sitedeki belgeleri görünür (açılır);
// "Yarışı al" yarışı yarış ilanından açar (talimat okunur, elle yüklemedeki gibi) ve belgelerini izlemeye alır
// (raceSite.js, /api/race-site). Zaten alınmış sınıf "Alındı" yazar, dokununca yarışı açar.
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
import { freshRace, loadRaces, saveRace } from "@/features/athletes/races";
import { applyNotice, readNotice } from "@/features/athletes/raceNotice";
import { noticeName, saveNoticeFile } from "@/features/athletes/noticeFile";
import { followSite, loadSiteList, siteFile } from "@/features/athletes/raceSite";
import { noticeDoc } from "@/lib/siteBoard";
import { kindLabel, pickSeason } from "@/lib/siteDocs";
import { sameRace } from "@/lib/sharedRace";
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
  const [busy, setBusy] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    loadRaces(orgId).then(setRaces, () => {});
  }, [orgId]);
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
  const take = async (leg, c) => {
    const had = have(c.act);
    if (had) return router.push(`/athletes/races/${had.id}?sec=site`);
    setBusy(c.act);
    try {
      const site = { act: c.act, cls: c.cls, season: data.season, n: leg.n, legNo: leg.legNo };
      const today = todayStr();
      let r = { ...freshRace(races.find((x) => x.signer) || races[0], today), name: `${data.season} ${ayak(leg.name)} ${c.cls}` };
      const ilan = noticeDoc(c);
      if (ilan) {
        const file = await siteFile(ilan);
        const n = await readNotice(file);
        r = applyNotice({ ...r, name: "" }, n);
        if (!r.name) r.name = `${ayak(leg.name)} ${c.cls}`;
        r.noticeFile = await saveNoticeFile(orgId, file, noticeName(r)).catch(() => null);
      }
      // Aynı yarış elle açılmışsa ona bağlanır
      const same = races.find((x) => !x.site && sameRace(x, r));
      const id = await saveRace(orgId, uid, same ? { ...same, site } : { ...r, site });
      const got = await followSite(id, site);
      toast(got.error || "Yarış alındı, belgeler alınıyor");
      router.push(`/athletes/races/${id}?sec=site`);
    } catch (e) {
      toast(e?.message || "Yarış alınamadı");
      setBusy("");
    }
  };

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <header className="flex items-center gap-2.5">
          <BackButton href="/athletes/races" />
          <h1 className="min-w-0 flex-1 truncate text-[1.375rem] font-bold tracking-[-.02em]">Siteden yarış al</h1>
        </header>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          {(data?.seasons || (season ? [{ name: season }] : [])).map((s) => (
            <button key={s.name} type="button" data-press onClick={() => pick(s.name)} className={`raised h-9 shrink-0 rounded-xl border px-3.5 text-[0.875rem] font-semibold ${s.name === season ? "act-main" : ""}`}>
              {s.name}
            </button>
          ))}
        </div>
      </section>
      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
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
                        <Button variant="primary" full className="mt-2" loading={busy === c.act} disabled={!!busy && busy !== c.act} onClick={() => take(leg, c)}>
                          {had ? "Yarışı aç" : "Yarışı al"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </RowList>
          </section>
        ))}
      </div>
      {view && <PdfViewer title={view.name} load={() => siteFile(view)} onClose={() => setView(null)} />}
    </main>
  );
}
