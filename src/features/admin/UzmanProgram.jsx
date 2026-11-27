"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { BackButton } from "@/components/ui/BackButton";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListHead } from "@/components/ui/Row";
import { LoadFail } from "@/components/ui/LoadFail";
import { ListLoading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { liveHead } from "@/features/liveScreen/fonts";
import { NewProgram } from "@/features/fitness/NewProgram";
import { ProgramEditor } from "@/features/fitness/ProgramEditor";
import { activeOf, adoptProgram, askFitness, dropFrom, loadPrograms, notifyProgram, saveProgram, syncPlans } from "@/features/fitness/fitnessData";
import { importFile, importText } from "@/features/fitness/fitImport";
import { TEMPLATES, fromTemplate } from "@/lib/fitness/templates";
import { DOW_LONG, cleanItem, cleanProgram, dowOf } from "@/lib/fitness/model";
import { istekHafta } from "@/lib/fitness/uzmanIstek";
import { paylasilanPlanlar, sporAd } from "@/lib/uzman";
import { todayStr } from "@/lib/utils/format";
import "@/features/fitness/fitSahne.css";

// Uzmanın "Program hazırla" sayfası (Seyhun 2026-11-27, örnek project-files/admin-sayfasi/uzman-program.html): ayrı sayfa,
// Fitness'taki aynı yollar (yapay zeka, hazır program, kendim hazırla, PDF; ortak NewProgram + ProgramEditor), "Uzmanla çalış"
// yok. Sporcunun hedefi ve dolu günleri (paylaştığı planlar) üstte görünür ve yapay zekaya gider. Kaydedilen programda
// hazırlayan uzman (by) yazılır; antrenmanlar sporcunun takvimine Fitness'taki gibi eklenir.

const fixStart = (p) => ({ ...p, start: p.start && (p.id || p.start >= todayStr()) ? p.start : todayStr() });
const Bilgi = ({ ad, children }) => (
  <div className="flex min-h-[2.75rem] items-center justify-between gap-3 px-4 py-2 text-[0.9375rem]">
    <span className="shrink-0 text-mut">{ad}</span>
    <span className="min-w-0 truncate text-right">{children || "–"}</span>
  </div>
);

// Paylaşılan planlardan haftanın dolu günleri: "Salı (Yelken antrenmanı), Cumartesi (Yarış)"
function doluGunler(list) {
  const m = new Map();
  for (const p of list) {
    const d = dowOf(p.date);
    if (!m.has(d)) m.set(d, new Set());
    m.get(d).add(String(p.title || "Plan").slice(0, 30));
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([d, t]) => `${DOW_LONG[d]} (${[...t].slice(0, 2).join(", ")})`);
}

export function UzmanProgram({ id, istekId }) {
  const { profile } = useAuth();
  const org = profile?.orgId;
  const router = useRouter();
  const toast = useToast();
  const { plans, fitOthers = [], members = [] } = useData();
  const [veri, setVeri] = useState(null);
  const [hata, setHata] = useState(false);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const geriHref = `/settings/admin/uzman/${id}`;

  useEffect(() => {
    if (!org) return;
    let on = true;
    Promise.all([getDoc(doc(db, "orgs", org, "uzmanlar", id)), getDoc(doc(db, "orgs", org, "uzmanIstekleri", istekId)), loadPrograms(org).catch(() => [])])
      .then(([u, i, p]) => on && setVeri({ uzman: u.exists() ? { id: u.id, ...u.data() } : null, istek: i.exists() ? { id: i.id, ...i.data() } : null, progs: p }))
      .catch(() => on && setHata(true));
    return () => {
      on = false;
    };
  }, [org, id, istekId]);

  const i = veri?.istek;
  const u = veri?.uzman;
  const bugun = todayStr();
  const dolu = useMemo(() => (i ? doluGunler(paylasilanPlanlar(plans, i.sporcuUid, i.paylas, bugun)) : []), [i, plans, bugun]);
  const m = members.find((x) => x.uid === i?.sporcuUid);
  const athletes = i?.sporcuUid ? [{ uid: i.sporcuUid, name: i.sporcuAd || m?.name || "Sporcu", birth: m?.birth || "", athleteId: m?.athleteId || "" }] : [];
  const ek = i ? [i.hedef && `Sporcunun kendi hedefi: ${i.hedef}.`, dolu.length && `Sporcunun dolu günleri: ${dolu.join(", ")}. Bu günlere ağır antrenman koyma.`].filter(Boolean).join(" ") : "";
  const kim = (f, pre, t) => ({ for: pre.for, forName: pre.forName, forAge: f?.age || t?.forAge || 0, sport: f?.sport || t?.sport || "", forSex: f?.sex || t?.forSex || "" });
  const ac = (prog, o = {}) => setEdit({ prog: { ...prog, by: { id: u.id, ad: u.ad } }, fresh: true, k: Date.now(), ...o });

  async function ask(text, f, pre) {
    setBusy("ask");
    setErr("");
    try {
      const r = await askFitness({ text, profile: f, want: "program" });
      if (!r.program) throw new Error(r.message || "Program hazırlanamadı");
      const days = r.program.days.map((d) => ({ ...d, time: d.time || pre.time, min: d.min || pre.min }));
      ac(fixStart({ ...r.program, goal: r.program.goal || f.goal, level: r.program.level || f.level, place: r.program.place || f.place, ...kim(f, pre), days, weeks: pre.weeks, start: pre.start, note: r.program.note || r.message }), { simple: true });
    } catch (e) {
      setErr(e.message || "Program hazırlanamadı, tekrar dene.");
    } finally {
      setBusy("");
    }
  }
  async function importProg({ file, text, ask: extra }, f, pre) {
    setBusy("import");
    setErr("");
    try {
      const opt = { ask: extra, age: f.age || 0, sport: f.sport || "" };
      const r = file ? await importFile(file, opt) : await importText(text, opt);
      if (!r.program?.days?.length) throw new Error(r.message || "Programda antrenman bulunamadı");
      ac(fixStart({ ...cleanProgram(r.program), ...kim(f, pre), start: pre.start }));
      if (r.message) toast?.(r.message);
    } catch (e) {
      setErr(e.message || "Program okunamadı, tekrar dene.");
    } finally {
      setBusy("");
    }
  }
  function template(tid, f, pre) {
    // Hazır programlar iki kaynaktan (koddaki TEMPLATES + Velora'nın yayınladıkları; NewProgram seçileni pre.tpl ile verir)
    const list = pre.tpl ? [pre.tpl] : TEMPLATES;
    const t = list.find((x) => x.id === tid);
    const p = fromTemplate(tid, pre.start, pre.times, list);
    if (!t || !p) return;
    ac(fixStart({ ...p, ...kim(f, pre, t), title: `${pre.forName} · ${t.title}` }));
  }
  function blank(pre, f) {
    const days = pre.days.map((dow) => ({ dow, time: pre.time, min: pre.min, name: "Antrenman", items: [cleanItem({ ex: "warmup", min: 5 }), cleanItem({ ex: "stretch", min: 5 })] }));
    ac({ ...cleanProgram({ title: `${pre.forName} · fitness`, goal: f?.goal, level: f?.level, place: f?.place, weeks: pre.weeks, start: pre.start, days }), ...kim(f, pre) });
  }
  // Kayıt: Fitness'taki gibi (hareketler kütüphaneye, eski programın sonraki antrenmanları kalkar, takvime eklenir, sporcuya bildirim)
  async function save(p, withPlans) {
    setBusy(withPlans ? "plans" : "save");
    try {
      p = await adoptProgram(org, p).catch(() => p);
      if (!p.id && withPlans) {
        const old = activeOf((veri.progs || []).filter((x) => (x.for || "") === (p.for || "")));
        if (old) await dropFrom(org, old.id, fitOthers, p.start).catch(() => 0);
      }
      const saved = await saveProgram(org, profile.uid, { ...p, by: { id: u.id, ad: u.ad }, active: true });
      const r = withPlans ? await syncPlans(org, profile.uid, saved, fitOthers, { name: profile.name }) : null;
      if (saved.for && (withPlans || saved.plansAt)) notifyProgram(saved.id);
      toast?.(r ? `Kaydedildi · ${saved.forName} için ${r.added} antrenman` : "Program kaydedildi");
      router.push(geriHref);
    } catch (e) {
      toast?.(e.message || "Kaydedilemedi");
    } finally {
      setBusy("");
    }
  }

  if (profile?.role !== "owner") return null;
  if (edit) {
    return (
      <main className={`fs ${liveHead.variable} mx-auto min-h-dvh max-w-[30rem] px-5 pb-[calc(var(--stage-h,6rem)+2rem)]`}>
        <PageHeader title={`${edit.prog.forName} için program`} back={geriHref} />
        <ProgramEditor key={edit.k} prog={edit.prog} fresh={edit.fresh} simple={edit.simple} busy={busy} onSave={save} onCancel={() => setEdit(null)} />
      </main>
    );
  }
  return (
    <main className={`sahne-pg ${liveHead.variable} wide mx-auto max-w-[30rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]`}>
      <section className="pb-5 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <header className="flex items-center gap-2.5">
          <BackButton href={geriHref} />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="sahne-t truncate text-[2rem]">Program hazırla</h1>
            <p className="mt-1 truncate text-[0.8125rem] text-mut">{i ? [`${i.sporcuAd || "Sporcu"} için`, u?.ad].filter(Boolean).join(" · ") : " "}</p>
          </div>
        </header>
      </section>
      {hata ? (
        <LoadFail onRetry={() => location.reload()} />
      ) : !veri ? (
        <ListLoading height="20rem" />
      ) : !i || !u ? (
        <p className="rounded-[1.25rem] border border-line bg-card px-4 py-6 text-center text-mut">Bulunamadı.</p>
      ) : !i.sporcuUid || i.ornek ? (
        <p className="rounded-[1.25rem] border border-line bg-card px-4 py-6 text-center text-mut">Örnek sporcuya program hazırlanamaz.</p>
      ) : (
        <div className="space-y-5">
          <section>
            <ListHead title="Sporcunun bilgileri" />
            <div className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">
              <Bilgi ad="Hedef">{i.hedef}</Bilgi>
              <Bilgi ad="Dolu günleri">{i.paylas?.acik ? dolu.map((x) => x.split(" (")[0]).join(", ") || "Yok" : "Paylaşmadı"}</Bilgi>
              <Bilgi ad="Sporcu">{[i.yas && `${i.yas} yaş`, i.spor && sporAd(i.spor === "sailing" ? "yelken" : i.spor), i.sure && `${i.sure} ay`].filter(Boolean).join(" · ")}</Bilgi>
            </div>
          </section>
          <section>
            <ListHead title="Nasıl hazırlansın?" />
            <NewProgram
              inline
              open
              onClose={() => router.push(geriHref)}
              uzmanAd={u.ad}
              ek={ek}
              hafta={istekHafta(i.sure)}
              forUid={i.sporcuUid}
              athletes={athletes}
              profile={{}}
              onAsk={ask}
              onBlank={blank}
              onImport={importProg}
              onTemplate={template}
              busy={busy === "ask" || busy === "import"}
              error={err}
            />
          </section>
        </div>
      )}
    </main>
  );
}
