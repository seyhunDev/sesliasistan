"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { ExpiryCard } from "@/features/athletes/ExpiryCard";
import { alertsOf } from "@/lib/expiry";
import { todayStr } from "@/lib/utils/format";
import { BackButton } from "@/components/ui/BackButton";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { byId, isActive, loadAthletes, useDikili } from "@/features/athletes/data";
import { DikiliLogin, disconnect, useDikiliUser } from "@/features/athletes/Connect";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { AccessSheet } from "@/features/athletes/AccessSheet";
import { syncAthleteAtt } from "@/features/athletes/mirror";
import { NewAthlete } from "@/features/athletes/NewAthlete";

// Arama ve karşılaştırma için: küçük harf, Türkçe
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
// Doğum tarihi (ISO) → { day, month, year } (yerel saatle; geçersizse null)
function birthParts(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}

// Sporcular (kulübün diğer projesinden; yeni tasarım 2026-10-21: lacivert üstte ekle, Yoklama/Yarışlar, arama ve sınıflar; altta belge uyarısı ve liste). Ekleme burada, arşiv ve silme sporcunun sayfasında. Yalnızca izinli hesap görür.
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
  const { birthdays, saveBirthday, members, myUid } = useData();
  const toast = useToast();
  const [sel, setSel] = useState(null); // toplu seçim: Set(sporcu kimliği) | null
  const [access, setAccess] = useState(null); // hesap açılacak sporcular
  const [adding, setAdding] = useState(false);
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
  // Doğum günü zaten takvimde mi (sporcudan eklenmiş ya da aynı ad ve gün)
  const hasBday = (a, b) =>
    birthdays.some((x) => x.athleteId === a.id || (low(x.name) === low(a.studentName) && x.month === b.month && x.day === b.day));
  const addBday = (a, b) => {
    saveBirthday({ name: a.studentName, ...b, note: "Sporcu", athleteId: a.id, phone: a.parentPhone || "" });
    toast(`${a.studentName.split(" ")[0]} · doğum günü takvime eklendi`);
  };

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

  const sub = err ? "Kulüp verisi" : data ? `${activeCount} aktif${linked.size ? ` · ${[...linked.values()].filter((m) => m.account !== false).length} uygulamada` : ""}` : "Yükleniyor…";
  const pill0 = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.8125rem] font-semibold";

  return (
    <main className={`mx-auto max-w-[30rem] px-5 ${sel ? "pb-[calc(7rem+env(safe-area-inset-bottom))]" : "pb-[calc(2.5rem+env(safe-area-inset-bottom))]"}`}>
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Sporcular">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Sporcular</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{sub}</p>
          </div>
          {data && !err && (
            <button type="button" onClick={() => setAdding(true)} data-press className="raised act-main flex h-9 shrink-0 items-center gap-1 rounded-xl border px-3.5 text-[0.875rem] font-semibold">
              <Icon name="plus" className="size-4" />
              Sporcu
            </button>
          )}
        </header>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href="/athletes/attendance" data-press className="raised flex h-10 items-center justify-center rounded-xl border text-[0.9375rem] font-semibold">
            Yoklama
          </Link>
          <Link href="/athletes/races" data-press className="raised flex h-10 items-center justify-center rounded-xl border text-[0.9375rem] font-semibold">
            Yarışlar
          </Link>
        </div>

        {/* Arama */}
        <label className={`ck-glass mt-3.5 h-11 items-center gap-2 rounded-xl px-3 ${err ? "hidden" : "flex"}`}>
          <Icon name="search" className="size-[1.125rem] shrink-0 text-white/55" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ad, T.C. ya da veli"
            inputMode="search"
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-white outline-none placeholder:text-white/55"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Temizle" data-press className="grid size-7 place-items-center rounded-full text-white/70">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </label>

        {/* Sınıf filtresi */}
        {data && !err && usedClasses.length > 1 && (
          <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
            {[{ id: "", name: "Tümü" }, ...usedClasses].map((c) => (
              <button key={c.id || "all"} type="button" onClick={() => setCls(c.id)} aria-pressed={cls === c.id} data-press className={`${pill0} ${cls === c.id ? "border-white bg-white text-[#11203a]" : "ck-glass text-white"}`}>
                {c.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
      {err?.code === "permission-denied" ? (
        <DikiliLogin denied={!!user} onDone={reload} />
      ) : (
        err && (
          <button onClick={reload} className="w-full rounded-[1.25rem] border border-line bg-card px-4 py-4 text-left text-[0.875rem]">
            <b className="block font-semibold text-rec">{err.text}</b>
            <span className="text-mut">Tekrar denemek için dokun</span>
          </button>
        )
      )}
      {!data && !err && <Loading label="Sporcular yükleniyor" />}

      {data && !err && (
        <>
          <ExpiryCard athletes={all.filter(isActive)} />
          <section>
          <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
            <h2 className="text-[0.8125rem] font-bold tracking-[.04em] text-mut">
              SPORCU <span className="ml-0.5 font-semibold tabular-nums">{list.length}</span>
            </h2>
            <button type="button" onClick={() => setSel((s) => (s ? null : new Set()))} className="text-[0.8125rem] font-semibold text-acc">
              {sel ? "Seçimi bitir" : "Uygulamaya ekle"}
            </button>
          </div>
          {list.length === 0 ? (
            <p className="mt-4 text-center text-[0.875rem] text-mut">Eşleşen sporcu yok</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-[1.25rem] border border-line bg-card">
              {list.map((a) => {
                const b = birthParts(a.studentBirthDate);
                const canAdd = b && !hasBday(a, b);
                const m = linked.get(a.id);
                const inApp = m && m.account !== false;
                if (sel)
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        disabled={inApp}
                        onClick={() => toggle(a.id)}
                        aria-pressed={sel.has(a.id)}
                        data-press="row" className="flex w-full items-center gap-3 py-3 pl-4 pr-4 text-left disabled:opacity-50"
                      >
                        <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 ${sel.has(a.id) ? "bg-acc ring-acc text-white" : "ring-line"}`}>
                          {sel.has(a.id) && <Icon name="check" className="size-4 [stroke-width:3]" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.9375rem] font-semibold">{a.studentName}</span>
                          <span className="block truncate text-[0.8125rem] text-mut">{inApp ? `Uygulamada · ${m.loginName || ""}` : a.parentName ? `Veli: ${a.parentName}` : "Veli bilgisi yok"}</span>
                        </span>
                      </button>
                    </li>
                  );
                return (
                <li key={a.id} className="flex items-center">
                  <Link href={`/athletes/${a.id}`} data-press="row" className="flex min-h-[3.75rem] min-w-0 flex-1 items-center gap-3 py-2.5 pl-3.5 pr-3">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold ${isActive(a) ? "bg-accbg text-acc" : "bg-bg text-mut"}`}>
                      {a.studentName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr-TR")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className={`block truncate text-[0.9375rem] font-semibold ${isActive(a) ? "" : "text-mut"}`}>{a.studentName}</b>
                      <small className="block truncate text-[0.8125rem] text-mut">
                        {[classes[a.currentClassId], coaches[a.currentCoachId], !isActive(a) && "Arşivde"].filter(Boolean).join(" · ") || "Sınıf atanmamış"}
                      </small>
                    </span>
                    {isActive(a) && alertsOf(a, todayStr()).some((x) => x.state === "expired") ? (
                      <span className="shrink-0 rounded-full bg-warnbg px-2 py-0.5 text-[0.75rem] font-semibold text-warn">Belge bitti</span>
                    ) : (
                      inApp && <span className="shrink-0 rounded-full bg-accbg px-2 py-0.5 text-[0.75rem] font-semibold text-acc">Uygulamada</span>
                    )}
                  </Link>
                  {canAdd && (
                    <button
                      type="button"
                      onClick={() => addBday(a, b)}
                      title="Doğum gününü takvime ekle"
                      aria-label={`${a.studentName} doğum gününü takvime ekle (${b.day}.${String(b.month).padStart(2, "0")})`}
                      className="-ml-1 mr-2 grid size-10 shrink-0 place-items-center rounded-full text-pink-600 transition hover:bg-pink-500/10 active:scale-90"
                    >
                      <Icon name="cake" className="size-5" />
                    </button>
                  )}
                </li>
                );
              })}
            </ul>
          )}
          {all.length > activeCount && (
            <button type="button" onClick={() => setPassive((v) => !v)} aria-pressed={passive} className="mt-3 block w-full text-center text-[0.875rem] font-semibold text-acc">
              {passive ? "Arşivi gizle" : `Arşiv (${all.length - activeCount})`}
            </button>
          )}
          </section>
          {sel && (
            <div data-pagebar="" className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
              <div className="mx-auto flex max-w-[26rem] gap-2">
                <button
                  type="button"
                  onClick={() => setSel(new Set(list.filter((a) => isActive(a) && !(linked.get(a.id)?.account !== false && linked.has(a.id))).map((a) => a.id)))}
                  data-press className="btn btn-secondary text-acc"
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
          <NewAthlete
            open={adding}
            onClose={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              reload();
            }}
            names={{ classes: data.classes || [], coaches: data.coaches || [] }}
            athletes={all}
          />
          {user && (
            <p className="text-center text-[0.75rem] text-mut">
              Kulüp hesabı: {user.email} ·{" "}
              <button onClick={() => disconnect().then(reload)} className="underline underline-offset-2">
                bağlantıyı kes
              </button>
            </p>
          )}
        </>
      )}
      </div>
    </main>
  );
}
