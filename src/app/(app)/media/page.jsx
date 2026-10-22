"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { Seg } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { loadRaces } from "@/features/athletes/races";
import { loadAllMedia } from "@/features/athletes/raceLiveStore";
import { MediaViewer } from "@/features/raceMedia/MediaViewer";
import { Thumb } from "@/features/raceMedia/Thumb";
import { listKept } from "@/features/raceMedia/pendingStore";
import { countText, librarySections } from "@/lib/mediaLibrary";

// Medya (Seyhun 2026-10-22: "ayrı bir medya sayfamız olmalı; antrenmanlar ayrı, yarışlar ayrı, bütün fotoğraf ve videolar"; örnek
// yaris-tasarim/medya/medya-sayfasi.png): üstte Antrenman / Yarış, her antrenman ve yarış bir bölüm (ilk 4 kare, fazlası "+N"),
// "Tümü ›" o sayfanın Medya sekmesi. Kareye dokununca izleme (İndir: iPhone paylaşım ekranı); düzeltme ve silme kendi sayfasında.
// Telefonda 7 gün tutulan aslı varsa izleme ve İndir onu kullanır (pendingStore "kept").
export default function MediaPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed || !profile?.orgId) return null;
  return <Library orgId={profile.orgId} />;
}

function Library({ orgId }) {
  const { plans } = useData();
  const toast = useToast();
  const [docs, setDocs] = useState(null);
  const [races, setRaces] = useState([]);
  const [error, setError] = useState("");
  const [kept, setKept] = useState({});
  const [tab, setTab] = useState("ant");
  const [open, setOpen] = useState(null); // { sec, id }
  const [busy, setBusy] = useState("");
  useEffect(() => {
    loadAllMedia(orgId).then(setDocs, (e) => (setDocs([]), setError(e?.message || "Medya alınamadı.")));
    loadRaces(orgId).then(setRaces, () => {});
    listKept()
      .then((l) => setKept(Object.fromEntries(l.map((k) => [k.id, URL.createObjectURL(k.blob)]))))
      .catch(() => {});
  }, [orgId]);
  const secs = useMemo(() => librarySections(docs || [], { plans, races }), [docs, plans, races]);
  const list = secs[tab];
  const all = [...secs.ant, ...secs.race].flatMap((s) => s.items);
  const n = (k) => secs[k].reduce((a, s) => a + s.items.length, 0);
  const sec = open && list.find((s) => s.key === open.sec);
  const local = (m) => (kept[m.id] ? { ...m, local: kept[m.id] } : m);

  // İndir: telefondaki aslı, yoksa buluttaki (MediaTab ile aynı yol); büyük dosyada iPhone ikinci dokunuşu ister
  const ready = useRef(null);
  const file = async (m, title) => {
    if (ready.current?.id === m.id) return ready.current.f;
    setBusy("Hazırlanıyor");
    const blob = await (await fetch(m.local || m.url)).blob();
    setBusy("");
    const type = blob.type || m.type || (m.kind === "video" ? "video/mp4" : "image/jpeg");
    const ext = m.kind !== "video" ? "jpg" : type.includes("webm") ? "webm" : type.includes("quicktime") ? "mov" : "mp4";
    const f = new File([blob], `${title} ${new Date(m.at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }).replace(":", ".")}.${ext}`, { type });
    ready.current = { id: m.id, f };
    return f;
  };
  const give = async (m) => {
    try {
      const f = await file(m, sec?.title || "Medya");
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f] });
      else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        a.click();
      }
      ready.current = null;
    } catch (e) {
      setBusy("");
      if (e?.name === "NotAllowedError" && ready.current?.id === m.id) toast("Hazır, yeniden dokun");
      else if (e?.name !== "AbortError") toast("Olmadı");
    }
  };

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(var(--dome-h,var(--stage-h,6rem))+2rem)]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Medya">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Medya</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{docs ? countText(all) || "Henüz kayıt yok" : "Yükleniyor…"}</p>
          </div>
        </header>
      </section>
      <div className="relative -mx-5 -mt-6 min-h-[50vh] rounded-t-[1.75rem] bg-bg px-5 pt-4">
        <Seg value={tab} onChange={setTab} options={[["ant", "Antrenman", n("ant")], ["race", "Yarış", n("race")]]} />
        {error && <p className="mt-4 text-center text-[0.875rem] text-rec">{error}</p>}
        {!docs && <Loading label="Medya yükleniyor" />}
        {docs && !list.length && (
          <div className="fade-in px-6 pt-14 text-center">
            <div className="mx-auto mb-4 grid size-[4.75rem] place-items-center rounded-3xl bg-acc/10 text-acc">
              <Icon name="image" className="size-9" />
            </div>
            <b className="block text-[1.1875rem] font-semibold">{tab === "ant" ? "Antrenman kaydı yok" : "Yarış kaydı yok"}</b>
          </div>
        )}
        {list.map((s) => {
          const shown = s.items.slice(0, 4);
          const more = s.items.length - shown.length;
          return (
            <section key={s.key}>
              <div className="mb-1.5 mt-4 flex items-center justify-between gap-3 px-1">
                <div className="min-w-0 leading-tight">
                  <b className="block truncate text-[1.0625rem] font-semibold">{s.title}</b>
                  <small className="block truncate text-[0.8125rem] text-mut">{s.sub}</small>
                </div>
                <Link href={s.href} className="shrink-0 text-[0.875rem] font-semibold text-acc active:opacity-60">
                  Tümü ›
                </Link>
              </div>
              <div className="-mx-5 grid grid-cols-4 gap-0.5">
                {shown.map((m, i) => (
                  <button key={m.id} type="button" onClick={() => setOpen({ sec: s.key, id: m.id })} className="relative aspect-square overflow-hidden bg-line active:opacity-80">
                    <Thumb kind={m.kind} url={m.url} thumb={m.thumb} dur={m.dur} local={kept[m.id] || ""} />
                    {i === 3 && more > 0 && <span className="absolute inset-0 grid place-items-center bg-black/45 text-[1.25rem] font-semibold text-white">+{more}</span>}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <MediaViewer
        items={(sec?.items || []).map(local)}
        id={sec ? open.id : ""}
        onPick={(id) => setOpen((o) => ({ ...o, id }))}
        onClose={() => setOpen(null)}
        label={() => sec?.title || ""}
        onSave={give /* iPhone paylaşım ekranı: Videoyu Kaydet ya da WhatsApp vb. */}
        busy={busy}
      />
    </main>
  );
}
