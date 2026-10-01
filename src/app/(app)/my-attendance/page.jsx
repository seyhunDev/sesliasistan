"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loading } from "@/components/ui/Loader";
import { useAuth } from "@/features/auth/AuthProvider";
import { useKind } from "@/features/auth/useKind";
import { db } from "@/lib/firebase/clientApp";
import { isAthleteSide } from "@/lib/kinds";

const ST = {
  present: { label: "Geldi", dot: "bg-ok", text: "text-ok" },
  absent: { label: "Gelmedi", dot: "bg-rec", text: "text-rec" },
  excused: { label: "İzinli", dot: "bg-amber-500", text: "text-amber-700" },
};
const MONTH = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
const DAY = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short" });

// Bir sporcunun yoklama kartı: bu ay sayıları, devam oranı, aylara göre günler
function Card({ rec }) {
  const days = Object.entries(rec.att || {}).sort((a, b) => b[0].localeCompare(a[0]));
  const ym = new Date().toISOString().slice(0, 7);
  const count = (list, s) => list.filter(([, v]) => v === s).length;
  const month = days.filter(([d]) => d.startsWith(ym));
  const rate = days.length ? Math.round((count(days, "present") / days.length) * 100) : null;
  const groups = days.reduce((g, [d, v]) => {
    const k = d.slice(0, 7);
    (g[k] = g[k] || []).push([d, v]);
    return g;
  }, {});
  return (
    <section className="rounded-[1.25rem] bg-card p-4 shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]">
      <b className="block text-[1.0625rem] font-semibold">{rec.name}</b>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {["present", "absent", "excused"].map((s) => (
          <div key={s} className="rounded-xl bg-bg px-1 py-2">
            <b className={`block text-[1.25rem] font-semibold tabular-nums ${ST[s].text}`}>{count(month, s)}</b>
            <small className="text-[0.6875rem] text-mut">{ST[s].label}</small>
          </div>
        ))}
        <div className="rounded-xl bg-bg px-1 py-2">
          <b className="block text-[1.25rem] font-semibold tabular-nums">{rate == null ? "—" : `%${rate}`}</b>
          <small className="text-[0.6875rem] text-mut">Devam</small>
        </div>
      </div>
      <p className="mt-1.5 text-[0.75rem] text-mut">Kutular bu ayı, devam oranı tüm kayıtları gösterir.</p>
      {days.length === 0 ? (
        <p className="mt-4 text-[0.875rem] text-mut">Henüz yoklama kaydı yok.</p>
      ) : (
        Object.entries(groups).slice(0, 6).map(([k, list]) => (
          <div key={k} className="mt-4">
            <p className="text-[0.75rem] font-bold uppercase tracking-[.08em] text-mut">{MONTH.format(new Date(`${k}-15T12:00:00`))}</p>
            <ul className="mt-1.5 divide-y divide-line">
              {list.map(([d, v]) => (
                <li key={d} className="flex items-center gap-2.5 py-2 text-[0.9375rem]">
                  <span className={`size-2.5 shrink-0 rounded-full ${ST[v]?.dot || "bg-line"}`} />
                  <span className="flex-1">{DAY.format(new Date(`${d}T12:00:00`))}</span>
                  <span className={`text-[0.875rem] font-semibold ${ST[v]?.text || "text-mut"}`}>{ST[v]?.label || v}</span>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

// Yoklamam: sporcu kendi yoklamasını, veli bağlı olduğu sporcuların yoklamasını görür (salt okunur).
// Yalnızca sporcu, öğrenci ve veli açar; diğerleri (ana hesap, çalışan, aile) ana sayfaya yönlenir.
export default function MyAttendance() {
  const kind = useKind();
  const router = useRouter();
  const allowed = isAthleteSide(kind);
  useEffect(() => {
    if (kind && !allowed) router.replace("/");
  }, [kind, allowed, router]);
  if (!allowed) return null;
  return <Attendance kind={kind} />;
}

function Attendance({ kind }) {
  const { profile } = useAuth();
  const [recs, setRecs] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!profile?.uid || !profile.orgId) return;
    const col = collection(db, "orgs", profile.orgId, "athleteAtt");
    const job =
      kind === "parent"
        ? getDocs(query(col, where("parents", "array-contains", profile.uid))).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() })))
        : getDoc(doc(col, profile.uid)).then((d) => (d.exists() ? [{ id: d.id, ...d.data() }] : []));
    job.then(setRecs).catch((e) => {
      setErr(e.code === "permission-denied" ? "Yoklama bilgisine erişim yok." : "Yoklama yüklenemedi.");
      setRecs([]);
    });
  }, [profile?.uid, profile?.orgId, kind]);

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title={kind === "parent" ? "Yoklama" : "Yoklamam"} sub={kind === "parent" ? "Çocuklarının antrenman devamı" : "Antrenman devamın"} />
      {!recs ? (
        <Loading className="py-10" />
      ) : recs.length ? (
        <div className="mt-2 space-y-4">
          {recs.map((r) => (
            <Card key={r.id} rec={r} />
          ))}
        </div>
      ) : (
        <p className="mt-10 text-center text-[0.9375rem] text-mut">{err || "Henüz yoklama bilgisi yok. Antrenörün yoklama aldıkça burada görünür."}</p>
      )}
    </main>
  );
}
