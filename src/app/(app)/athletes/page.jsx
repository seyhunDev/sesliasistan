"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { byId, isActive, loadAthletes, useDikili } from "@/features/athletes/data";
import { DikiliLogin, disconnect, useDikiliUser } from "@/features/athletes/Connect";
import { Loading } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/ToastProvider";
import { useData } from "@/features/data/DataProvider";
import { AccessSheet } from "@/features/athletes/AccessSheet";
import { syncAthleteAtt } from "@/features/athletes/mirror";

// Arama ve karşılaştırma için: küçük harf, Türkçe
const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
// Doğum tarihi (ISO) → { day, month, year } (yerel saatle; geçersizse null)
function birthParts(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}

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
  const { birthdays, saveBirthday, members, myUid } = useData();
  const toast = useToast();
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

  return (
    <main className={`mx-auto max-w-[30rem] px-5 ${sel ? "pb-[calc(7rem+env(safe-area-inset-bottom))]" : "pb-[calc(2.5rem+env(safe-area-inset-bottom))]"}`}>
      <PageHeader title="Sporcular" sub={err ? "Kulüp verisi" : data ? `${activeCount} aktif${all.length > activeCount ? ` · ${all.length - activeCount} pasif` : ""}` : "Yükleniyor…"}>
        <Link href="/athletes/attendance" className="flex h-10 items-center gap-1.5 rounded-full bg-acc px-4 text-[0.875rem] font-semibold text-white active:scale-95">
          <Icon name="check" className="size-[1.125rem]" />
          Yoklama
        </Link>
      </PageHeader>

      {/* Arama */}
      <label className={`mt-2 h-11 items-center gap-2 rounded-xl bg-card px-3 shadow-[0_1px_3px_rgba(38,40,44,.05)] ${err ? "hidden" : "flex"}`}>
        <Icon name="search" className="size-[1.125rem] shrink-0 text-mut" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ad, T.C. ya da veli"
          inputMode="search"
          className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut"
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
              className={`h-8 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-medium transition active:scale-95 ${cls === c.id ? "bg-acc text-white" : "bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.05)]"}`}
            >
              {c.name}
            </button>
          ))}
          {all.length > activeCount && (
            <button
              onClick={() => setPassive((v) => !v)}
              className={`h-8 shrink-0 rounded-full border px-3.5 text-[0.8125rem] font-medium transition active:scale-95 ${passive ? "border-fg text-fg" : "border-line text-mut"}`}
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
          <button onClick={reload} className="mt-4 w-full rounded-2xl bg-card px-4 py-4 text-left text-[0.875rem] shadow-[0_1px_3px_rgba(38,40,44,.05)]">
            <b className="block font-semibold text-rec">{err.text}</b>
            <span className="text-mut">Tekrar denemek için dokun</span>
          </button>
        )
      )}
      {!data && !err && <Loading label="Sporcular yükleniyor" />}

      {data && !err && (
        <>
          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-[0.8125rem] text-mut">
              {list.length} sporcu{linked.size ? ` · ${[...linked.values()].filter((m) => m.account !== false).length} uygulamada` : ""}
            </p>
            <button
              type="button"
              onClick={() => setSel((s) => (s ? null : new Set()))}
              className={`h-8 rounded-full px-3.5 text-[0.8125rem] font-semibold active:scale-95 ${sel ? "bg-[#2c5163] text-white" : "bg-card text-acc ring-1 ring-line"}`}
            >
              {sel ? "Seçimi bitir" : "Uygulamaya ekle"}
            </button>
          </div>
          {list.length === 0 ? (
            <p className="mt-6 text-center text-[0.875rem] text-mut">Eşleşen sporcu yok</p>
          ) : (
            <ul className="mt-1.5 divide-y divide-line overflow-hidden rounded-2xl bg-card shadow-[0_1px_3px_rgba(38,40,44,.05)]">
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
                        className="flex w-full items-center gap-3 py-3 pl-4 pr-4 text-left active:bg-bg disabled:opacity-50"
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
                  <Link href={`/athletes/${a.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 pr-2 active:bg-bg">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[0.8125rem] font-semibold ${isActive(a) ? "bg-acc/10 text-acc" : "bg-bg text-mut"}`}>
                      {a.studentName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr-TR")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[0.9375rem] font-semibold ${isActive(a) ? "" : "text-mut"}`}>{a.studentName}</span>
                      <span className="block truncate text-[0.8125rem] text-mut">
                        {[classes[a.currentClassId], coaches[a.currentCoachId], !isActive(a) && "Pasif"].filter(Boolean).join(" · ") || "Sınıf atanmamış"}
                      </span>
                      {inApp && <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-ok/10 px-2 py-px text-[0.6875rem] font-semibold text-ok">Uygulamada</span>}
                    </span>
                    {!canAdd && <Icon name="chev" className="size-4 shrink-0 text-mut" />}
                  </Link>
                  {canAdd && (
                    <button
                      type="button"
                      onClick={() => addBday(a, b)}
                      title="Doğum gününü takvime ekle"
                      aria-label={`${a.studentName} doğum gününü takvime ekle (${b.day}.${String(b.month).padStart(2, "0")})`}
                      className="mr-2 grid size-10 shrink-0 place-items-center rounded-full text-pink-600 transition hover:bg-pink-500/10 active:scale-90"
                    >
                      <Icon name="cake" className="size-5" />
                    </button>
                  )}
                </li>
                );
              })}
            </ul>
          )}
          {sel && (
            <div className="fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-6">
              <div className="mx-auto flex max-w-[26rem] gap-2">
                <button
                  type="button"
                  onClick={() => setSel(new Set(list.filter((a) => isActive(a) && !(linked.get(a.id)?.account !== false && linked.has(a.id))).map((a) => a.id)))}
                  className="h-12 rounded-xl bg-card px-4 text-[0.875rem] font-semibold text-acc ring-1 ring-line"
                >
                  Tümünü seç
                </button>
                <button
                  type="button"
                  disabled={!sel.size}
                  onClick={() => setAccess(all.filter((a) => sel.has(a.id)))}
                  className="h-12 flex-1 rounded-xl bg-[#2c5163] text-[0.9375rem] font-semibold text-white disabled:opacity-40"
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
          {user && (
            <p className="mt-6 text-center text-[0.75rem] text-mut">
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
