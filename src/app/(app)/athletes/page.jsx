"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { byId, isActive, loadAthletes, useDikili } from "@/features/athletes/data";
import { DikiliLogin, disconnect, useDikiliUser } from "@/features/athletes/Connect";

// Arama ve karşılaştırma için: küçük harf, Türkçe
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");

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
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("");
  const [passive, setPassive] = useState(false);

  const all = data?.athletes || [];
  const classes = byId(data?.classes);
  const coaches = byId(data?.coaches);
  // Yalnızca sporcusu olan sınıflar filtrede görünsün
  const usedClasses = (data?.classes || []).filter((c) => all.some((a) => a.currentClassId === c.id));
  const term = low(q).trim();
  const list = all.filter(
    (a) =>
      (passive || isActive(a)) &&
      (!cls || a.currentClassId === cls) &&
      (!term || low(a.studentName).includes(term) || a.studentTc.includes(term) || low(a.parentName).includes(term)),
  );
  const activeCount = all.filter(isActive).length;

  return (
    <main className="mx-auto max-w-[480px] px-5 pb-[calc(40px+env(safe-area-inset-bottom))]">
      <PageHeader title="Sporcular" sub={err ? "Kulüp verisi" : data ? `${activeCount} aktif${all.length > activeCount ? ` · ${all.length - activeCount} pasif` : ""}` : "Yükleniyor…"}>
        <Link href="/athletes/attendance" className="flex h-10 items-center gap-1.5 rounded-full bg-acc px-4 text-[14px] font-semibold text-white active:scale-95">
          <Icon name="check" className="size-[18px]" />
          Yoklama
        </Link>
      </PageHeader>

      {/* Arama */}
      <label className={`mt-2 h-11 items-center gap-2 rounded-xl bg-card px-3 shadow-[0_1px_3px_rgba(38,40,44,.05)] ${err ? "hidden" : "flex"}`}>
        <Icon name="search" className="size-[18px] shrink-0 text-mut" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ad, T.C. ya da veli"
          inputMode="search"
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-mut"
        />
        {q && (
          <button onClick={() => setQ("")} aria-label="Temizle" className="grid size-7 place-items-center rounded-full text-mut active:bg-bg">
            <Icon name="x" className="size-4" />
          </button>
        )}
      </label>

      {/* Sınıf filtresi + pasifler */}
      {data && !err && (
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {[{ id: "", name: "Tümü" }, ...usedClasses].map((c) => (
            <button
              key={c.id || "all"}
              onClick={() => setCls(c.id)}
              className={`h-8 shrink-0 rounded-full px-3.5 text-[13px] font-medium transition active:scale-95 ${cls === c.id ? "bg-acc text-white" : "bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.05)]"}`}
            >
              {c.name}
            </button>
          ))}
          {all.length > activeCount && (
            <button
              onClick={() => setPassive((v) => !v)}
              className={`h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition active:scale-95 ${passive ? "border-fg text-fg" : "border-line text-mut"}`}
            >
              Pasifler {passive ? "görünür" : "gizli"}
            </button>
          )}
        </div>
      )}

      {err?.code === "permission-denied" ? (
        <DikiliLogin denied={!!user} onDone={reload} />
      ) : (
        err && (
          <button onClick={reload} className="mt-4 w-full rounded-2xl bg-card px-4 py-4 text-left text-[14px] shadow-[0_1px_3px_rgba(38,40,44,.05)]">
            <b className="block font-semibold text-rec">{err.text}</b>
            <span className="text-mut">Tekrar denemek için dokun</span>
          </button>
        )
      )}
      {!data && !err && <p className="mt-10 text-center text-[14px] text-mut">Sporcular yükleniyor…</p>}

      {data && !err && (
        <>
          <p className="mt-3 px-1 text-[13px] text-mut">{list.length} sporcu</p>
          {list.length === 0 ? (
            <p className="mt-6 text-center text-[14px] text-mut">Eşleşen sporcu yok</p>
          ) : (
            <ul className="mt-1.5 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
              {list.map((a) => (
                <li key={a.id}>
                  <Link href={`/athletes/${a.id}`} className="flex items-center gap-3 px-4 py-3 active:bg-bg">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold ${isActive(a) ? "bg-acc/10 text-acc" : "bg-bg text-mut"}`}>
                      {a.studentName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr-TR")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[15px] font-semibold ${isActive(a) ? "" : "text-mut"}`}>{a.studentName}</span>
                      <span className="block truncate text-[13px] text-mut">
                        {[classes[a.currentClassId], coaches[a.currentCoachId], !isActive(a) && "Pasif"].filter(Boolean).join(" · ") || "Sınıf atanmamış"}
                      </span>
                    </span>
                    <Icon name="chev" className="size-4 shrink-0 text-mut" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {user && (
            <p className="mt-6 text-center text-[12px] text-mut">
              Kulüp hesabı: {user.email} ·{" "}
              <button onClick={() => disconnect().then(reload)} className="underline underline-offset-2">
                bağlantıyı kes
              </button>
            </p>
          )}
        </>
      )}
    </main>
  );
}
