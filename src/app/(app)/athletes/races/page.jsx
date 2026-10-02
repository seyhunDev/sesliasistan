"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { Sheet } from "@/components/ui/Sheet";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { isActive, loadAthletes, message, updateAthlete, useDikili } from "@/features/athletes/data";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { DOC_TEXT } from "@/features/athletes/EditAthlete";
import { DOCS, buildRaceDocs, loadFonts, missing, rangeText } from "@/features/athletes/raceDocs";
import { STEPS, addRacePlan, deleteRace, doneCount, freshRace, loadRaces, saveRace, shiftDay } from "@/features/athletes/races";
import { useData } from "@/features/data/DataProvider";
import { todayStr } from "@/lib/utils/format";

const field = "h-11 w-full rounded-xl bg-bg px-3.5 text-[0.9375rem] outline-none focus:bg-card focus:ring-1 focus:ring-acc";
const card = "rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]";
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");

// Yarış evrakı: yarış bilgisi + seçilen sporcular → okul izni, EK-2 kafile onayı, seyahat dilekçesi, EK-3/D veli izinleri (PDF)
export default function RacesPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed || !profile?.orgId || !user) return null;
  return <Races orgId={profile.orgId} uid={user.uid} />;
}

function Races({ orgId, uid }) {
  const { data, err, reload } = useDikili("list", loadAthletes);
  const user = useDikiliUser();
  const toast = useToast();
  const [races, setRaces] = useState(null);
  const [edit, setEdit] = useState(null);
  // Asistandan gelince (?id=…) o yarış ilk yüklemede doğrudan açılır
  const opened = useRef(false);
  const refresh = useCallback(
    () =>
      loadRaces(orgId).then(
        (list) => {
          setRaces(list);
          if (opened.current) return;
          opened.current = true;
          const id = new URLSearchParams(window.location.search).get("id");
          const r = id && list.find((x) => x.id === id);
          if (r) setEdit(r);
        },
        (e) => (setRaces([]), toast(e?.message || "Yarışlar alınamadı.")),
      ),
    [orgId, toast],
  );
  useEffect(() => {
    refresh();
  }, [refresh]);

  const fresh = () => freshRace(races?.[0], todayStr());

  if (edit)
    return (
      <Editor
        key={edit.id || "new"}
        start={edit}
        orgId={orgId}
        uid={uid}
        athletes={data?.athletes || []}
        athletesErr={err}
        reloadAthletes={reload}
        onDone={() => {
          setEdit(null);
          refresh();
        }}
      />
    );

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Yarış evrakı" sub="İzin yazıları ve veli izinleri" back="/athletes">
        <button
          onClick={() => setEdit(fresh())}
          disabled={!races}
          className="flex h-10 items-center gap-1.5 rounded-full bg-acc px-4 text-[0.875rem] font-semibold text-white active:scale-95 disabled:opacity-50"
        >
          <Icon name="plus" className="size-[1.125rem]" />
          Yarış
        </button>
      </PageHeader>

      {err?.code === "permission-denied" && <DikiliLogin denied={!!user} onDone={reload} />}
      {!races ? (
        <Loading label="Yarışlar yükleniyor" />
      ) : races.length === 0 ? (
        <div className={`${card} mt-3 px-4 py-6 text-center text-[0.875rem] text-mut`}>
          Henüz yarış yok. <b className="text-fg">Yarış</b> ile ekle, sporcuları seç; okul ve valilik izin yazıları ile veli izin belgeleri hazır olsun.
        </div>
      ) : (
        <ul className={`${card} mt-3 divide-y divide-line overflow-hidden`}>
          {races.map((r) => (
            <li key={r.id}>
              <button onClick={() => setEdit(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10 text-acc">
                  <Icon name="flag" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-semibold">{r.name || "Adsız yarış"}</span>
                  <span className="block truncate text-[0.8125rem] text-mut">
                    {[rangeText(r.startDate, r.endDate), r.district, `${r.athleteIds.length} sporcu`].filter(Boolean).join(" · ")}
                  </span>
                  <span className={`block text-[0.75rem] font-medium ${doneCount(r) === STEPS.length ? "text-ok" : "text-amber-600"}`}>
                    {doneCount(r) === STEPS.length ? "Yapılacaklar tamam" : `Yapılacak: ${STEPS.filter(([k]) => !r.checks?.[k]).map(([, l]) => l.split(" ")[0]).join(", ")}`}
                    {r.note ? " · not var" : ""}
                  </span>
                </span>
                <Icon name="chev" className="size-4 shrink-0 text-mut" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, mode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[0.75rem] text-mut">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={mode} className={field} />
    </label>
  );
}

function Section({ title, children, right }) {
  return (
    <section className="mt-5">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <h2 className="text-[0.75rem] font-semibold uppercase tracking-wide text-mut">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Editor({ start, orgId, uid, athletes, athletesErr, reloadAthletes, onDone }) {
  const toast = useToast();
  const { profile } = useAuth();
  const { saveDrafts } = useData();
  const [r, setR] = useState(start);
  // Belgeyi etkilemeyen alanlar (not, yapılacaklar, plan)
  const put = (k, v) => setR((p) => ({ ...p, [k]: v }));
  const toPlan = async () => {
    if (!r.name.trim() || !r.startDate) return toast("Önce yarış adı ve başlangıç tarihi");
    if (await addRacePlan(saveDrafts, r, { name: profile?.name ?? "Kullanıcı" })) {
      put("planAdded", true);
      toast("Planlara eklendi");
    }
  };
  const [pick, setPick] = useState(false);
  const [fix, setFix] = useState(null); // bilgisi tamamlanacak sporcu
  const [docs, setDocs] = useState(DOCS.map(([k]) => k));
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState(null); // hazırlanan PDF
  const set = (k) => (v) => {
    setFile(null);
    setR((p) => {
      const n = { ...p, [k]: v };
      // İzin aralığı varsayılan olarak yarıştan bir gün önce başlar, bir gün sonra biter
      if (k === "startDate" && (!p.leaveStart || p.leaveStart === shiftDay(p.startDate, -1))) n.leaveStart = shiftDay(v, -1);
      if (k === "endDate" && (!p.leaveEnd || p.leaveEnd === shiftDay(p.endDate, 1))) n.leaveEnd = shiftDay(v, 1);
      return n;
    });
  };
  const byId = new Map(athletes.map((a) => [a.id, a]));
  const chosen = r.athleteIds.map((id) => byId.get(id)).filter(Boolean);
  const lost = r.athleteIds.length - chosen.length;

  // Değişiklikler kendiliğinden kaydedilir (yarış adı yazıldıktan sonra). Kayıtlar sırayla gider, çift kayıt olmaz.
  const id = useRef(start.id || null);
  const queue = useRef(Promise.resolve());
  const save = useCallback(() => {
    const data = r;
    queue.current = queue.current.then(async () => {
      id.current = await saveRace(orgId, uid, { ...data, id: id.current });
    });
    return queue.current;
  }, [r, orgId, uid]);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!r.name.trim()) return;
    const t = setTimeout(() => save().catch(() => toast("Yarış kaydedilemedi")), 800);
    return () => clearTimeout(t);
  }, [r, save, toast]);

  const make = async () => {
    if (!r.name.trim() || !r.city.trim() || !r.district.trim() || !r.startDate) return toast("Yarış adı, il, ilçe ve başlangıç tarihi gerekli");
    if (!r.signer.trim()) return toast("Kulüp yetkilisinin adını yaz");
    if (!chosen.length) return toast("En az bir sporcu seç");
    if (!docs.length) return toast("En az bir belge seç");
    setBusy(true);
    try {
      await save();
      const bytes = await buildRaceDocs({ ...r, endDate: r.endDate || r.startDate }, chosen, await loadFonts(), docs);
      const name = `${r.name.trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "yaris"}-evrak.pdf`;
      setFile(new File([bytes], name, { type: "application/pdf" }));
      if (docs.length === DOCS.length && !r.checks?.docs) put("checks", { ...r.checks, docs: true });
    } catch (e) {
      toast(e?.message || "Belgeler hazırlanamadı");
    }
    setBusy(false);
  };

  const share = async () => {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: file.name });
      } catch {}
      return;
    }
    openPdf(true);
  };
  // Yeni sekmede aç (yazdırmak için) ya da indir
  const openPdf = (download) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    if (download) link.download = file.name;
    else link.target = "_blank";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const close = async () => {
    try {
      if (r.name.trim()) await save();
    } catch (e) {
      toast(e?.message || "Kaydedilemedi");
    }
    onDone();
  };
  const remove = async () => {
    if (!id.current || !confirm(`"${r.name}" silinsin mi? Sporcu kartları etkilenmez.`)) return;
    await queue.current.catch(() => {});
    await deleteRace(orgId, id.current).catch(() => toast("Silinemedi"));
    onDone();
  };

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(9rem+env(safe-area-inset-bottom))]">
      <PageHeader title={r.name || "Yeni yarış"} sub={rangeText(r.startDate, r.endDate) || "Yarış evrakı"} back="/athletes">
        <button onClick={close} className="h-10 rounded-full bg-card px-4 text-[0.875rem] font-semibold text-acc shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-95">
          Bitti
        </button>
      </PageHeader>

      <Section title="Yarış">
        <div className="space-y-2">
          <Input label="Yarış adı" value={r.name} onChange={set("name")} placeholder="D’Azur Optimist Regatta" />
          <div className="grid grid-cols-3 gap-2">
            <Input label="Federasyon" value={r.federation} onChange={set("federation")} placeholder="Yelken" />
            <Input label="İl" value={r.city} onChange={set("city")} placeholder="İzmir" />
            <Input label="İlçe" value={r.district} onChange={set("district")} placeholder="Çeşme" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Başlangıç" type="date" value={r.startDate} onChange={set("startDate")} />
            <Input label="Bitiş" type="date" value={r.endDate} onChange={set("endDate")} />
            <Input label="İzin başlangıcı" type="date" value={r.leaveStart} onChange={set("leaveStart")} />
            <Input label="İzin bitişi" type="date" value={r.leaveEnd} onChange={set("leaveEnd")} />
          </div>
          <Input label="Yazı tarihi" type="date" value={r.letterDate} onChange={set("letterDate")} />
        </div>
      </Section>

      <button
        onClick={toPlan}
        disabled={r.planAdded}
        className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-card text-[0.875rem] font-semibold text-acc ring-1 ring-line active:scale-[.98] disabled:text-ok disabled:ring-0"
      >
        <Icon name={r.planAdded ? "check" : "cal"} className="size-[1.125rem]" />
        {r.planAdded ? "Planlarda var" : "Planlara ekle"}
      </button>

      <Section title={`Yapılacaklar · ${doneCount(r)}/${STEPS.length}`}>
        <ul className={`${card} divide-y divide-line overflow-hidden`}>
          {STEPS.map(([k, label]) => {
            const on = !!r.checks?.[k];
            return (
              <li key={k}>
                <button onClick={() => put("checks", { ...r.checks, [k]: !on })} aria-pressed={on} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                  <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 ${on ? "bg-ok text-white ring-ok" : "ring-line"}`}>
                    {on && <Icon name="check" className="size-4 [stroke-width:3]" />}
                  </span>
                  <span className={`text-[0.9375rem] ${on ? "text-mut line-through" : ""}`}>{label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title="Not">
        <textarea
          value={r.note}
          onChange={(e) => put("note", e.target.value)}
          placeholder="Konaklama, ulaşım, kayıt ücreti…"
          rows={3}
          className="w-full rounded-xl bg-card px-3.5 py-3 text-[0.9375rem] shadow-[0_1px_3px_rgba(38,40,44,.05)] outline-none focus:ring-1 focus:ring-acc"
        />
      </Section>

      <Section title="Kulüp yetkilisi ve seyahat">
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_8rem] gap-2">
            <Input label="Ad soyad (imzalayan)" value={r.signer} onChange={set("signer")} />
            <Input label="Görevi" value={r.signerTitle} onChange={set("signerTitle")} placeholder="Başkan" />
          </div>
          <Input label="Seyahat türü" value={r.travel} onChange={set("travel")} />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Araç plaka / model" value={r.vehicle} onChange={set("vehicle")} />
            <Input label="Şoför / ehliyet" value={r.drivers} onChange={set("drivers")} />
          </div>
        </div>
      </Section>

      <Section
        title={`Sporcular · ${chosen.length}`}
        right={
          <button onClick={() => setPick(true)} disabled={!athletes.length} className="h-8 rounded-full bg-card px-3.5 text-[0.8125rem] font-semibold text-acc ring-1 ring-line active:scale-95 disabled:opacity-50">
            Seç
          </button>
        }
      >
        {athletesErr ? (
          <button onClick={reloadAthletes} className={`${card} w-full px-4 py-3 text-left text-[0.875rem]`}>
            <b className="block font-semibold text-rec">{athletesErr.text}</b>
            <span className="text-mut">Sporcular sayfasından kulüp hesabına bağlan, sonra tekrar dene</span>
          </button>
        ) : !athletes.length ? (
          <Loading label="Sporcular yükleniyor" className="py-6" />
        ) : !chosen.length ? (
          <p className={`${card} px-4 py-4 text-[0.875rem] text-mut`}>Yarışa katılacak sporcuları seç.</p>
        ) : (
          <ul className={`${card} divide-y divide-line overflow-hidden`}>
            {chosen.map((a, i) => {
              const miss = missing(a);
              return (
                <li key={a.id}>
                  <button onClick={() => setFix(a)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
                    <span className="w-5 shrink-0 text-[0.8125rem] font-semibold text-mut tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-semibold">{a.studentName}</span>
                      <span className={`block text-[0.8125rem] ${miss.length ? "text-amber-600" : "text-ok"}`}>
                        {miss.length ? `Eksik: ${miss.join(", ")}` : "Bilgiler tamam"}
                      </span>
                    </span>
                    <Icon name="edit" className="size-4 shrink-0 text-mut" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {lost > 0 && <p className="mt-1.5 px-1 text-[0.75rem] text-mut">{lost} sporcu artık listede yok, belgeye girmez.</p>}
      </Section>

      <Section title="Belgeler">
        <div className="flex flex-wrap gap-2">
          {DOCS.map(([k, label]) => {
            const on = docs.includes(k);
            return (
              <button
                key={k}
                onClick={() => (setFile(null), setDocs((d) => (on ? d.filter((x) => x !== k) : DOCS.map(([x]) => x).filter((x) => x === k || d.includes(x)))))}
                aria-pressed={on}
                className={`h-9 rounded-full px-3.5 text-[0.8125rem] font-medium active:scale-95 ${on ? "bg-acc text-white" : "bg-card text-mut ring-1 ring-line"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 px-1 text-[0.75rem] text-mut">Veli izin belgesi her sporcu için ayrı sayfadır. Eksik bilgiler belgede boş kalır, elle doldurabilirsin.</p>
      </Section>

      {start.id && (
        <button onClick={remove} className="mt-6 w-full text-center text-[0.8125rem] text-rec">
          Yarışı sil
        </button>
      )}

      <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
        <div className="mx-auto flex max-w-[26rem] gap-2">
          {file ? (
            <>
              <button onClick={() => openPdf(false)} className="flex h-12 items-center gap-1.5 rounded-xl bg-card px-4 text-[0.875rem] font-semibold text-acc ring-1 ring-line">
                <Icon name="print" className="size-5" />
                Aç
              </button>
              <button onClick={share} className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl bg-deep text-[0.9375rem] font-semibold text-white">
                <Icon name="up" className="size-5" />
                Paylaş / Yazdır
              </button>
            </>
          ) : (
            <button onClick={make} disabled={busy} className="h-12 flex-1 rounded-xl bg-deep text-[0.9375rem] font-semibold text-white disabled:opacity-50">
              {busy ? "Hazırlanıyor…" : "Belgeleri hazırla (PDF)"}
            </button>
          )}
        </div>
      </div>

      <Pick
        open={pick}
        athletes={athletes}
        value={r.athleteIds}
        onClose={() => setPick(false)}
        onChange={(ids) => set("athleteIds")(ids)}
      />
      <Sheet open={!!fix} onClose={() => setFix(null)} title={fix ? fix.studentName : ""}>
        {fix && (
          <DocFields
            key={fix.id}
            a={fix}
            onClose={() => setFix(null)}
            onSaved={() => {
              setFix(null);
              setFile(null);
              reloadAthletes();
            }}
          />
        )}
      </Sheet>
    </main>
  );
}

// Sporcu seçimi (aktif sporcular; arama)
function Pick({ open, athletes, value, onClose, onChange }) {
  const [q, setQ] = useState("");
  const sel = new Set(value);
  const term = low(q).trim();
  const list = athletes.filter((a) => (isActive(a) || sel.has(a.id)) && (!term || low(a.studentName).includes(term)));
  const toggle = (id) => onChange(sel.has(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <Sheet open={open} onClose={onClose} title={`Sporcu seç · ${value.length}`}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara" inputMode="search" className={field} />
      <ul className="mt-2 divide-y divide-line">
        {list.map((a) => (
          <li key={a.id}>
            <button onClick={() => toggle(a.id)} aria-pressed={sel.has(a.id)} className="flex w-full items-center gap-3 py-2.5 text-left active:bg-bg">
              <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 ${sel.has(a.id) ? "bg-acc text-white ring-acc" : "ring-line"}`}>
                {sel.has(a.id) && <Icon name="check" className="size-4 [stroke-width:3]" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.9375rem]">{a.studentName}</span>
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onClose} className="sticky bottom-0 mt-3 h-12 w-full rounded-xl bg-acc text-[0.9375rem] font-semibold text-white">
        Tamam
      </button>
    </Sheet>
  );
}

// Belgede gereken bilgileri sporcu kartına yazar (bir kez girilir, sonraki yarışlarda hazır gelir)
const BASIC = [
  ["studentTc", "T.C. kimlik no", "numeric"],
  ["parentName", "Veli ad soyad"],
  ["parentPhone", "Veli telefonu", "tel"],
];
function DocFields({ a, onClose, onSaved }) {
  const toast = useToast();
  const fields = [...BASIC.slice(0, 1), ...DOC_TEXT, ...BASIC.slice(1)];
  const startDate = a.studentBirthDate ? a.studentBirthDate.slice(0, 10) : "";
  const [f, setF] = useState(() => ({ ...Object.fromEntries(fields.map(([k]) => [k, a[k] || ""])), studentBirthDate: startDate }));
  const [busy, setBusy] = useState(false);
  const patch = Object.fromEntries(
    Object.keys(f)
      .filter((k) => (k === "studentBirthDate" ? f[k] !== startDate : f[k].trim() !== (a[k] || "")))
      .map((k) => [k, f[k].trim()]),
  );
  const save = async () => {
    for (const k of ["studentTc", "parentTc"]) if (f[k] && !/^\d{11}$/.test(f[k].trim())) return toast("T.C. kimlik no 11 haneli olmalı");
    if (!Object.keys(patch).length) return onClose();
    setBusy(true);
    try {
      await updateAthlete(a.id, a, patch, { classes: [], coaches: [] });
      toast("Kaydedildi");
      onSaved();
    } catch (e) {
      toast(message(e));
      setBusy(false);
    }
  };
  return (
    <div className="pb-2">
      {!a.studentSchool && a.studentSchoolAndClass && (
        <p className="mb-2 text-[0.75rem] text-mut">Okul adı boşsa belgeye “{a.studentSchoolAndClass}” yazılır.</p>
      )}
      <div className="space-y-2">
        {fields.map(([k, label, mode]) => (
          <label key={k} className="block">
            <span className="mb-1 block text-[0.75rem] text-mut">{label}</span>
            <input
              value={f[k]}
              onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))}
              inputMode={mode}
              maxLength={k === "studentTc" || k === "parentTc" ? 11 : 200}
              className={field}
            />
          </label>
        ))}
        <label className="block">
          <span className="mb-1 block text-[0.75rem] text-mut">Doğum tarihi</span>
          <input type="date" value={f.studentBirthDate} onChange={(e) => setF((p) => ({ ...p, studentBirthDate: e.target.value }))} className={field} />
        </label>
      </div>
      <div className="sticky bottom-0 -mx-5 mt-4 grid grid-cols-2 gap-2 bg-card px-5 pt-2">
        <button onClick={onClose} className="h-12 rounded-xl bg-bg text-[0.9375rem] font-semibold">Vazgeç</button>
        <button onClick={save} disabled={busy} className="h-12 rounded-xl bg-acc text-[0.9375rem] font-semibold text-white disabled:opacity-50">
          {busy ? "Kaydediliyor…" : Object.keys(patch).length ? "Kaydet" : "Kapat"}
        </button>
      </div>
    </div>
  );
}
