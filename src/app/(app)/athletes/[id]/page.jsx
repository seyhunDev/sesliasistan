"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { age, byId, fmtDate, isActive, loadAthlete, useDikili } from "@/features/athletes/data";
import { DikiliLogin, useDikiliUser } from "@/features/athletes/Connect";
import { EditAthlete } from "@/features/athletes/EditAthlete";
import { alertText, expiryOf } from "@/lib/expiry";
import { todayStr } from "@/lib/utils/format";
import { loadRaces } from "@/features/athletes/races";
import { historyOf } from "@/lib/raceResults";
import { Loading } from "@/components/ui/Loader";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const STATE = {
  present: { label: "Geldi", tone: "text-ok", bg: "bg-ok" },
  absent: { label: "Gelmedi", tone: "text-rec", bg: "bg-rec" },
  excused: { label: "İzinli", tone: "text-amber-600", bg: "bg-amber-500" },
};
const LOG = { class_change: "Sınıf", coach_change: "Antrenör", status_change: "Durum" };

// Tek sporcu (salt okunur). Yalnızca izinli hesap görür.
export default function AthletePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = canSeeAthletes(profile?.email);
  useEffect(() => {
    if (profile && !allowed) router.replace("/");
  }, [profile, allowed, router]);
  if (!allowed) return null;
  return <Detail />;
}

function Card({ title, icon, children, tone = "" }) {
  return (
    <section className={`mt-3 rounded-2xl px-4 py-3.5 shadow-[0_1px_3px_rgba(38,40,44,.05)] ${tone || "bg-card"}`}>
      {title && (
        <h2 className="mb-2 flex items-center gap-1.5 text-[0.75rem] font-semibold uppercase tracking-wide text-mut">
          {icon && <Icon name={icon} className="size-4" />}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

// Etiket solda, değer sağda; değer yoksa satır gösterilmez
function Row({ label, value, href, mono }) {
  if (!value) return null;
  const v = <span className={`min-w-0 text-right text-[0.875rem] ${mono ? "tabular-nums" : ""} ${href ? "font-medium text-acc" : ""}`}>{value}</span>;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[0.8125rem] text-mut">{label}</span>
      {href ? <a href={href} className="min-w-0 break-words text-right">{v}</a> : v}
    </div>
  );
}

// Katıldığı yarışlar ve sırası (yarışlar yalnız ana hesaba açık; diğerlerinde kart görünmez)
function RaceHistory({ athleteId }) {
  const { profile } = useAuth();
  const [rows, setRows] = useState(null);
  const owner = profile?.role === "owner";
  useEffect(() => {
    if (!owner) return;
    let on = true;
    loadRaces(profile.orgId || profile.uid)
      .then((list) => on && setRows(historyOf(list, athleteId)))
      .catch(() => on && setRows([]));
    return () => void (on = false);
  }, [owner, profile?.orgId, profile?.uid, athleteId]);
  if (!owner || !rows?.length) return null;
  return (
    <Card title="Yarışlar" icon="flag">
      {rows.map((x) => (
        <Link key={x.id} href={`/athletes/races/${x.id}`} className="flex items-baseline justify-between gap-4 py-1.5 active:opacity-60">
          <span className="min-w-0 truncate text-[0.875rem]">
            {x.name} <small className="text-mut">{x.date ? fmtDate(x.date) : ""}</small>
          </span>
          <span className={`shrink-0 text-[0.875rem] tabular-nums ${x.place && x.place <= 3 ? "font-semibold text-acc" : "text-mut"}`}>{x.text || "—"}</span>
        </Link>
      ))}
    </Card>
  );
}

function Detail() {
  const { id } = useParams();
  const load = useCallback(() => loadAthlete(id), [id]);
  const { data, err, reload } = useDikili(`a:${id}`, load);
  const user = useDikiliUser();
  const [edit, setEdit] = useState(false);
  const a = err ? null : data?.athlete;

  if (!a) {
    return (
      <main className="mx-auto max-w-[30rem] px-5">
        <PageHeader title="Sporcu" back="/athletes" />
        {err?.code === "permission-denied" ? (
          <DikiliLogin denied={!!user} onDone={reload} />
        ) : err ? (
          <button onClick={reload} className="mt-4 w-full rounded-2xl bg-card px-4 py-4 text-left text-[0.875rem]">
            <b className="block font-semibold text-rec">{err.text}</b>
            <span className="text-mut">Tekrar denemek için dokun</span>
          </button>
        ) : (
          <Loading />
        )}
      </main>
    );
  }

  const cls = byId(data.classes)[a.currentClassId];
  const coach = byId(data.coaches)[a.currentCoachId];
  const yrs = age(a.studentBirthDate);
  const tel = (p) => (p ? `tel:${String(p).replace(/[^\d+]/g, "")}` : undefined);

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title={a.studentName} sub={[isActive(a) ? "Aktif" : "Pasif", cls, coach].filter(Boolean).join(" · ")} back="/athletes">
        <button onClick={() => setEdit(true)} aria-label="Düzenle" className="grid size-10 place-items-center rounded-full bg-card text-acc shadow-[0_1px_3px_rgba(38,40,44,.05)] active:scale-90">
          <Icon name="edit" className="size-5" />
        </button>
      </PageHeader>
      <EditAthlete
        athlete={a}
        names={{ classes: data.classes, coaches: data.coaches }}
        open={edit}
        onClose={() => setEdit(false)}
        onSaved={() => {
          setEdit(false);
          reload();
        }}
      />

      {/* Kimlik */}
      <Card>
        <Row label="T.C." value={a.studentTc} mono />
        <Row label="Doğum" value={a.studentBirthDate && `${fmtDate(a.studentBirthDate)}${yrs != null ? ` · ${yrs} yaş` : ""}`} />
        <Row label="Cinsiyet" value={a.studentGender} />
        <Row label="Kan grubu" value={a.studentBloodType} />
        <Row label="Yelken sınıfı" value={cls || "Atanmamış"} />
        <Row label="Antrenör" value={coach || "Atanmamış"} />
      </Card>

      {/* Sağlık */}
      <Card title="Sağlık" icon="alert" tone={a.studentHealthNotes ? "bg-rec/10" : ""}>
        <p className={`text-[0.875rem] leading-relaxed ${a.studentHealthNotes ? "font-medium text-rec" : "text-mut"}`}>
          {a.studentHealthNotes || "Belirtilen sağlık notu yok"}
        </p>
      </Card>

      {/* Acil durum */}
      {(a.emergencyContactName || a.emergencyContactPhone) && (
        <Card title="Acil durumda" icon="bell">
          <Row label="Aranacak kişi" value={a.emergencyContactName} />
          <Row label="Telefon" value={a.emergencyContactPhone} href={tel(a.emergencyContactPhone)} mono />
        </Card>
      )}

      {/* Veli */}
      <Card title="Veli ve iletişim" icon="users">
        <Row label="Veli" value={a.parentName || "—"} />
        <Row label="Telefon" value={a.parentPhone} href={tel(a.parentPhone)} mono />
        <Row label="E-posta" value={a.parentEmail} href={a.parentEmail && `mailto:${a.parentEmail}`} />
        <Row label="Adres" value={a.parentAddress} />
        <Row label="Anne" value={[a.motherName, a.motherProfession].filter(Boolean).join(" · ")} />
        <Row label="Baba" value={[a.fatherName, a.fatherProfession].filter(Boolean).join(" · ")} />
      </Card>

      {/* Eğitim ve spor */}
      {(a.studentSchoolAndClass || a.otherLicensedSports || a.swimmingSkill || a.seaFear) && (
        <Card title="Eğitim ve spor" icon="book">
          <Row label="Okul / sınıf" value={a.studentSchoolAndClass} />
          <Row label="Diğer lisanslar" value={a.otherLicensedSports} />
          <Row label="Yüzme" value={a.swimmingSkill} />
          <Row label="Deniz korkusu" value={a.seaFear} />
          <Row label="Kayıt" value={a.source === "summer_school" ? "Yaz okulundan" : "Doğrudan kayıt"} />
        </Card>
      )}

      {/* Lisans vizesi, sağlık raporu, sigorta bitişi */}
      {expiryOf(a, todayStr()).some((x) => x.date) && (
        <Card title="Belgeler" icon="clip">
          {expiryOf(a, todayStr()).filter((x) => x.date).map((x) => (
            <div key={x.key} className="flex items-baseline justify-between gap-4 py-1.5">
              <span className="shrink-0 text-[0.8125rem] text-mut">{x.label}</span>
              <span className={`min-w-0 text-right text-[0.875rem] tabular-nums ${x.state === "expired" ? "font-semibold text-rec" : x.state === "soon" ? "font-medium text-amber-700" : ""}`}>
                {x.state === "ok" ? new Date(`${x.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : alertText(x).replace(`${x.label} `, "")}
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* Yarış evrakında kullanılan bilgiler */}
      {(a.licenseNo || a.studentBirthPlace || a.parentTc || a.studentSchoolPlace || a.studentNo) && (
        <Card title="Yarış evrakı" icon="flag">
          <Row label="Lisans no" value={a.licenseNo} mono />
          <Row label="Okul (belgede)" value={[a.studentSchool, a.studentSchoolPlace].filter(Boolean).join(" · ")} />
          <Row label="Okul no · sınıf" value={[a.studentNo, a.studentClass].filter(Boolean).join(" · ")} />
          <Row label="Doğum yeri" value={a.studentBirthPlace} />
          <Row label="Sporcu telefonu" value={a.studentPhone} href={tel(a.studentPhone)} mono />
          <Row label="Veli T.C." value={a.parentTc} mono />
          <Row label="Yakınlık" value={a.parentRelation} />
        </Card>
      )}

      <RaceHistory athleteId={a.id} />
      <Attendance a={a} />
      <History items={data.history} />
    </main>
  );
}

// Devam: attendance_YYYY = { "MM-DD": "present" | "absent" | "excused" }
function Attendance({ a }) {
  const years = Object.keys(a)
    .filter((k) => /^attendance_\d{4}$/.test(k))
    .map((k) => +k.slice(11))
    .sort((x, y) => y - x);
  const nowY = new Date().getFullYear();
  const [year, setYear] = useState(years.includes(nowY) ? nowY : years[0] || nowY);
  const [month, setMonth] = useState(null); // null = yıl özeti
  const att = a[`attendance_${year}`] || {};
  const count = (entries) => {
    const c = { present: 0, absent: 0, excused: 0 };
    entries.forEach(([, v]) => c[v] != null && c[v]++);
    return c;
  };
  const all = Object.entries(att);
  const byMonth = MONTHS.map((_, i) => all.filter(([k]) => k.startsWith(String(i + 1).padStart(2, "0"))));
  const shown = month == null ? all : byMonth[month];
  const c = count(shown);
  const total = c.present + c.absent + c.excused;
  const pct = total ? Math.round((c.present / total) * 100) : 0;

  return (
    <Card title="Devam" icon="check">
      {!years.length ? (
        <p className="text-[0.875rem] text-mut">Devam kaydı yok</p>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <select value={year} onChange={(e) => { setYear(+e.target.value); setMonth(null); }} className="h-9 rounded-lg bg-bg px-3 text-[0.875rem] font-medium">
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={month ?? ""} onChange={(e) => setMonth(e.target.value === "" ? null : +e.target.value)} className="h-9 min-w-0 flex-1 rounded-lg bg-bg px-3 text-[0.875rem] font-medium">
              <option value="">Tüm yıl</option>
              {MONTHS.map((m, i) => <option key={m} value={i} disabled={!byMonth[i].length}>{m}</option>)}
            </select>
            <span className={`ml-auto text-[1.125rem] font-semibold tabular-nums ${pct >= 70 ? "text-ok" : pct >= 40 ? "text-amber-600" : "text-mut"}`}>
              {total ? `%${pct}` : "—"}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 divide-x divide-line rounded-xl bg-bg py-2.5 text-center">
            {Object.entries(STATE).map(([k, s]) => (
              <div key={k}>
                <p className={`text-[1.25rem] font-semibold tabular-nums ${s.tone}`}>{c[k]}</p>
                <p className="text-[0.6875rem] text-mut">{s.label}</p>
              </div>
            ))}
          </div>

          {month == null ? (
            // Yıl: ay ay çubuk; aya dokununca o ayın günleri
            <div className="mt-3 space-y-1.5">
              {byMonth.map((e, i) => {
                const m = count(e);
                const t = m.present + m.absent + m.excused;
                return (
                  <button key={MONTHS[i]} disabled={!t} onClick={() => setMonth(i)} className="flex w-full items-center gap-3 py-0.5 text-left disabled:opacity-40">
                    <span className="w-8 shrink-0 text-[0.75rem] text-mut">{MONTHS[i].slice(0, 3)}</span>
                    <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-bg">
                      {t > 0 && Object.keys(STATE).map((k) => m[k] > 0 && <span key={k} className={STATE[k].bg} style={{ width: `${(m[k] / t) * 100}%` }} />)}
                    </span>
                    <span className="w-9 shrink-0 text-right text-[0.75rem] tabular-nums text-mut">{t ? `%${Math.round((m.present / t) * 100)}` : ""}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {[...shown].sort((x, y) => x[0].localeCompare(y[0])).map(([k, v]) => {
                const [m, d] = k.split("-");
                const day = new Date(year, +m - 1, +d).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" });
                return (
                  <li key={k} className="flex items-center justify-between py-2 text-[0.875rem]">
                    <span>{day}</span>
                    <span className={`font-medium ${STATE[v]?.tone || "text-mut"}`}>{STATE[v]?.label || v}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}

function History({ items }) {
  if (!items?.length) return null;
  return (
    <Card title="Geçmiş" icon="clock">
      <ol className="relative space-y-3 pl-4 before:absolute before:inset-y-1 before:left-[0.1875rem] before:w-px before:bg-line">
        {items.map((h) => (
          <li key={h.id} className="relative">
            <span className="absolute -left-4 top-1.5 size-[0.4375rem] rounded-full bg-acc" />
            <p className="text-[0.75rem] text-mut">
              {fmtDate(h.date, { day: "numeric", month: "short", year: "numeric" })} · {LOG[h.type] || "Kayıt"}
            </p>
            <p className="text-[0.875rem] leading-snug">{h.note || [h.from, h.to].filter(Boolean).join(" → ")}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
