"use client";

import { useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { Sheet } from "@/components/ui/Sheet";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { dikiliAuth, dikiliDb } from "@/features/athletes/dikili";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { authFetch } from "@/lib/authFetch";
import { COPY_CHUNK, athleteDigest, docDigest, encodeValue } from "@/lib/athleteCopy";
import { Row } from "./ui";

// Ayarlar › Bağlantılar ve yedek › "Sporcuları Velora'ya taşı" (yalnız ana hesap, Seyhun 2026-11-27).
// 1) Kulüpten (dikili-c7cc8) yalnız OKUR: sporcular, her birinin geçmişi, sınıflar, antrenörler. Kulüpte hiçbir şey değişmez, silinmez.
// 2) Sunucuya parça parça yollar; sunucu Velora'ya aynı kimliklerle yazar (/api/sporcu-tasi). Tekrar basılırsa üstüne yazar, çift kayıt olmaz.
// 3) Karşılaştırır: sayılar ve her sporcunun bütün alanları. Veri yalnız bellekte durur, cihaza yazılmaz.
// Uygulama şimdilik sporcuları kulüpten okumaya devam eder; geçiş karşılaştırma tam tuttuktan sonra ayrı adımda.

async function readClub(step) {
  await dikiliAuth().authStateReady();
  const db = dikiliDb();
  step("Kulüpten sporcular okunuyor…");
  const [snap, cls, coa] = await Promise.all([getDocs(collection(db, "athletes")), getDocs(collection(db, "sailing_classes")), getDocs(collection(db, "coaches"))]);
  const athletes = [];
  let i = 0;
  for (const d of snap.docs) {
    step(`Geçmiş kayıtları okunuyor… ${++i}/${snap.size}`);
    const h = await getDocs(collection(db, "athletes", d.id, "history"));
    athletes.push({ id: d.id, data: encodeValue(d.data()), history: h.docs.map((x) => ({ id: x.id, data: encodeValue(x.data()) })) });
  }
  const plain = (s) => s.docs.map((d) => ({ id: d.id, data: encodeValue(d.data()) }));
  return { athletes, classes: plain(cls), coaches: plain(coa) };
}

async function post(body) {
  const res = await authFetch("/api/sporcu-tasi", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Sunucu cevap vermedi.");
  return d;
}

const srcDigests = (club) => ({
  athletes: Object.fromEntries(club.athletes.map((a) => [a.id, athleteDigest(a.data, a.history)])),
  classes: Object.fromEntries(club.classes.map((c) => [c.id, docDigest(c.data)])),
  coaches: Object.fromEntries(club.coaches.map((c) => [c.id, docDigest(c.data)])),
});
const nameMap = (club) => ({
  ...Object.fromEntries(club.athletes.map((a) => [a.id, a.data.studentName || a.id])),
  ...Object.fromEntries([...club.classes, ...club.coaches].map((c) => [c.id, c.data.name || c.id])),
});

function List({ title, items }) {
  return items?.length ? (
    <p className="text-[0.8125rem]">
      <b>{title}:</b> {items.slice(0, 20).join(", ")}
      {items.length > 20 ? ` ve ${items.length - 20} tane daha` : ""}
    </p>
  ) : null;
}

export function MoveAthletesRow() {
  const { profile } = useAuth();
  const club = useDikiliUser();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const [err, setErr] = useState("");
  const [res, setRes] = useState(null);
  if (profile?.role !== "owner" || !canSeeAthletes(profile?.email)) return null;

  async function run(copy) {
    setBusy(true);
    setErr("");
    setRes(null);
    try {
      const data = await readClub(setStep);
      if (copy) {
        for (let i = 0; i < data.athletes.length || i === 0; i += COPY_CHUNK) {
          setStep(`Velora'ya yazılıyor… ${Math.min(i + COPY_CHUNK, data.athletes.length)}/${data.athletes.length}`);
          await post({ op: "write", athletes: data.athletes.slice(i, i + COPY_CHUNK), ...(i === 0 ? { classes: data.classes, coaches: data.coaches } : {}) });
        }
      }
      setStep("Karşılaştırılıyor…");
      const r = await post({ op: "check", src: srcDigests(data), names: nameMap(data) });
      setRes({ ...r, history: data.athletes.reduce((n, a) => n + a.history.length, 0) });
    } catch (e) {
      setErr(e?.code === "permission-denied" ? "Kulüp hesabının sporcuları okuma izni yok." : e?.message || "Taşınamadı.");
    } finally {
      setBusy(false);
      setStep("");
    }
  }

  const c = res?.counts;

  return (
    <>
      <Row title="Sporcuları Velora'ya taşı" onClick={() => setOpen(true)} chevron />
      <Sheet open={open} onClose={() => !busy && setOpen(false)} title="Sporcuları Velora'ya taşı">
        <div className="space-y-3 pb-2">
          {club === null ? (
            <DikiliLogin />
          ) : (
            <>
              <p className="px-1 text-[0.875rem] text-mut">{"Kulüpteki sporcular, geçmişleri, sınıflar ve antrenörler Velora'ya kopyalanır. Kulüpte hiçbir şey silinmez."}</p>
              {busy && <p className="py-3 text-center text-[0.875rem] text-mut">{step || "Başlıyor…"}</p>}
              {err && <p className="py-2 text-center text-[0.875rem] text-rec">{err}</p>}
              {res && (
                <section className="space-y-1.5 rounded-2xl bg-card px-4 py-3 ring-1 ring-line">
                  <b className={`block text-[1rem] ${res.ok ? "text-ok" : "text-rec"}`}>{res.ok ? "Hepsi aynı" : "Fark var"}</b>
                  <p className="text-[0.875rem] tabular-nums">
                    {`Sporcu: kulüpte ${c.athletes[0]}, Velora'da ${c.athletes[1]} · Geçmiş kaydı: ${res.history}`}
                  </p>
                  <p className="text-[0.875rem] tabular-nums">
                    Sınıf: {c.classes[0]} / {c.classes[1]} · Antrenör: {c.coaches[0]} / {c.coaches[1]}
                  </p>
                  <List title="Velora'da yok" items={res.missing} />
                  <List title="Farklı" items={res.changed} />
                  <List title="Yalnız Velora'da" items={res.extra} />
                </section>
              )}
              <button type="button" disabled={busy || club === undefined} onClick={() => run(true)} data-press className="btn btn-primary h-12 w-full">
                {res ? "Yeniden taşı" : "Taşı"}
              </button>
              <button type="button" disabled={busy || club === undefined} onClick={() => run(false)} data-press className="btn btn-secondary h-11 w-full">
                Yalnız karşılaştır
              </button>
            </>
          )}
        </div>
      </Sheet>
    </>
  );
}
