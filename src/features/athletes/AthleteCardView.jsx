"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { CARD } from "@/features/home/ui";
import { waNumber } from "@/features/home/BirthdayStrip";
import { age, byId, fmtDate, isActive } from "@/features/athletes/data";
import { alertText, alertsOf, expiryOf } from "@/lib/expiry";
import { initialsOf, monthAtt, pctTone, yearAtt } from "@/lib/athleteStats";
import { todayStr } from "@/lib/utils/format";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const STATE = {
  present: { label: "Geldi", tone: "text-ok", bg: "bg-ok" },
  absent: { label: "Gelmedi", tone: "text-rec", bg: "bg-rec" },
  excused: { label: "İzinli", tone: "text-amber-600", bg: "bg-amber-500" },
};
const LOG = { class_change: "Sınıf", coach_change: "Antrenör", status_change: "Durum" };

function Card({ title, icon, children, tone = "" }) {
  return (
    <section className={`mt-3 px-4 py-3.5 ${CARD} ${tone}`}>
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

function RaceHistory({ rows }) {
  if (!rows) return <Loading />;
  if (!rows.length) return <p className="mt-6 text-center text-[0.875rem] text-mut">Henüz katıldığı yarış yok</p>;
  return (
    <ul className={`mt-3 divide-y divide-line overflow-hidden ${CARD}`}>
      {rows.map((x) => (
        <li key={x.id}>
          <Link href={`/athletes/races/${x.id}`} className="flex items-center gap-3 py-3 pl-4 pr-3 active:bg-bg">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-[0.875rem] font-bold tabular-nums ${x.place && x.place <= 3 ? "bg-amber-500/15 text-amber-700" : "bg-acc/10 text-acc"}`}>
              {x.place || <Icon name="flag" className="size-5" />}
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[0.9375rem] font-semibold leading-snug">{x.name}</b>
              <small className="block truncate text-[0.8125rem] leading-snug text-mut">{[x.date && fmtDate(x.date), x.text].filter(Boolean).join(" · ")}</small>
            </span>
            <Icon name="chev" className="size-4 shrink-0 text-mut" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

// Üstteki tek kartın işlem düğmesi: yuvarlak simge + kısa ad (plan/not ekranındaki işlemler gibi)
function Act({ icon, label, href, onClick, tone = "bg-acc/10 text-acc" }) {
  const inner = (
    <>
      <span className={`grid size-11 place-items-center rounded-full ${tone}`}>
        <Icon name={icon} className="size-5" />
      </span>
      <span className="w-full truncate text-center text-[0.75rem] font-medium">{label}</span>
    </>
  );
  const cls = "flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-1 transition active:scale-95";
  return href ? (
    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

const TABS = [
  ["info", "Bilgiler"],
  ["att", "Devam"],
  ["races", "Yarışlar"],
];

// Sporcu kartı (görünüm): üstte tek kart (ad, durum, devam ve yarış sayısı, işlemler), sağlık notu, altında sekmeler:
// Bilgiler / Devam / Yarışlar. Veri ve işlemler dışarıdan gelir (athletes/[id]/page.jsx); bu dosya Firebase'e dokunmaz.
export function AthleteCardView({ a, classes, coaches, history, races, birthdays, onAddBday, onEdit, toast, header }) {
  const [tab, setTab] = useState("info");
  const today = todayStr();
  const cls = byId(classes)[a.currentClassId];
  const coach = byId(coaches)[a.currentCoachId];
  const yrs = age(a.studentBirthDate);
  const tel = (p) => (p ? `tel:${String(p).replace(/[^\d+]/g, "")}` : undefined);
  const wa = waNumber(a.parentPhone);
  const month = monthAtt(a, today.slice(0, 7));
  const year = yearAtt(a, today.slice(0, 4));
  const alerts = alertsOf(a, today);
  const expired = alerts.some((x) => x.state === "expired");
  const bd = a.studentBirthDate ? new Date(a.studentBirthDate) : null;
  const bday = bd && !Number.isNaN(bd.getTime()) ? { day: bd.getDate(), month: bd.getMonth() + 1, year: bd.getFullYear() } : null;
  const hasBday = bday && birthdays.some((x) => x.athleteId === a.id || (x.name?.toLocaleLowerCase("tr-TR") === a.studentName.toLocaleLowerCase("tr-TR") && x.month === bday.month && x.day === bday.day));
  const addBday = () => onAddBday(bday);
  const tabs = TABS.filter(([k]) => k !== "races" || races !== undefined);

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      {header}

      {/* Tek kart: kim, durum, bir bakışta sayılar ve işlemler */}
      <section className={`mt-2 px-4 pb-3 pt-4 ${CARD}`}>
        <div className="flex items-center gap-3.5">
          <span className={`grid size-16 shrink-0 place-items-center rounded-full text-[1.25rem] font-bold ${isActive(a) ? "bg-acc/10 text-acc" : "bg-bg text-mut"}`}>{initialsOf(a.studentName)}</span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[1.25rem] font-semibold leading-tight tracking-tight">{a.studentName}</h2>
            <p className="mt-0.5 text-[0.8125rem] leading-snug text-mut">{[cls || "Sınıf yok", yrs != null && `${yrs} yaş`, coach].filter(Boolean).join(" · ")}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${isActive(a) ? "bg-ok/10 text-ok" : "bg-bg text-mut"}`}>{isActive(a) ? "Aktif" : "Pasif"}</span>
              {alerts.length > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${expired ? "bg-rec/10 text-rec" : "bg-amber-500/12 text-amber-700"}`}>{expired ? "Belge bitti" : "Belge bitiyor"}</span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl bg-bg py-2.5 text-center">
          <button type="button" onClick={() => setTab("att")}>
            <p className={`text-[1.25rem] font-bold tabular-nums ${pctTone(month.pct)}`}>{month.pct == null ? "—" : `%${month.pct}`}</p>
            <p className="text-[0.6875rem] text-mut">Bu ay devam</p>
          </button>
          <button type="button" onClick={() => setTab("att")}>
            <p className={`text-[1.25rem] font-bold tabular-nums ${pctTone(year.pct)}`}>{year.pct == null ? "—" : `%${year.pct}`}</p>
            <p className="text-[0.6875rem] text-mut">{today.slice(0, 4)} devam</p>
          </button>
          <button type="button" onClick={() => races !== undefined && setTab("races")}>
            <p className="text-[1.25rem] font-bold tabular-nums">{races ? races.length : "—"}</p>
            <p className="text-[0.6875rem] text-mut">Yarış</p>
          </button>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1">
          <Act icon="phone" label="Ara" href={tel(a.parentPhone)} onClick={() => toast("Veli telefonu yok")} />
          <Act icon="whatsapp" label="Mesaj" tone="bg-[#1f9d55]/10 text-[#1f9d55]" href={wa ? `https://wa.me/${wa}` : undefined} onClick={() => toast("Veli telefonu yok")} />
          {bday && !hasBday ? (
            <Act icon="cake" label="Doğum g." tone="bg-pink-500/10 text-pink-600" onClick={addBday} />
          ) : (
            <Act icon="alert" label="Acil" tone="bg-rec/10 text-rec" href={tel(a.emergencyContactPhone)} onClick={() => toast("Acil durum telefonu yok")} />
          )}
          <Act icon="edit" label="Düzenle" onClick={onEdit} />
        </div>
      </section>

      {/* Sağlık notu her zaman görünür: acil durumda aranan ilk bilgi */}
      {a.studentHealthNotes && (
        <div className="mt-3 flex gap-3 rounded-2xl bg-rec/10 px-4 py-3">
          <Icon name="alert" className="mt-0.5 size-5 shrink-0 text-rec" />
          <p className="text-[0.875rem] font-medium leading-relaxed text-rec">{a.studentHealthNotes}</p>
        </div>
      )}

      {/* Sekmeler */}
      <div role="tablist" className="mt-4 grid rounded-xl bg-line/60 p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`h-9 rounded-lg text-[0.875rem] font-semibold transition ${tab === k ? "bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.12)]" : "text-mut"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "info" && (
        <>
          <Card title="Kimlik" icon="user">
            <Row label="T.C." value={a.studentTc} mono />
            <Row label="Doğum" value={a.studentBirthDate && `${fmtDate(a.studentBirthDate)}${yrs != null ? ` · ${yrs} yaş` : ""}`} />
            <Row label="Cinsiyet" value={a.studentGender} />
            <Row label="Kan grubu" value={a.studentBloodType} />
            <Row label="Yelken sınıfı" value={cls || "Atanmamış"} />
            <Row label="Antrenör" value={coach || "Atanmamış"} />
          </Card>

          <Card title="Veli ve iletişim" icon="users">
            <Row label="Veli" value={a.parentName || "—"} />
            <Row label="Telefon" value={a.parentPhone} href={tel(a.parentPhone)} mono />
            <Row label="E-posta" value={a.parentEmail} href={a.parentEmail && `mailto:${a.parentEmail}`} />
            <Row label="Adres" value={a.parentAddress} />
            <Row label="Anne" value={[a.motherName, a.motherProfession].filter(Boolean).join(" · ")} />
            <Row label="Baba" value={[a.fatherName, a.fatherProfession].filter(Boolean).join(" · ")} />
            <Row label="Acil durumda" value={a.emergencyContactName} />
            <Row label="Acil telefon" value={a.emergencyContactPhone} href={tel(a.emergencyContactPhone)} mono />
          </Card>

          {/* Lisans vizesi, sağlık raporu, sigorta bitişi */}
          {expiryOf(a, today).some((x) => x.date) && (
            <Card title="Belgeler" icon="clip">
              {expiryOf(a, today)
                .filter((x) => x.date)
                .map((x) => (
                  <div key={x.key} className="flex items-baseline justify-between gap-4 py-1.5">
                    <span className="shrink-0 text-[0.8125rem] text-mut">{x.label}</span>
                    <span className={`min-w-0 text-right text-[0.875rem] tabular-nums ${x.state === "expired" ? "font-semibold text-rec" : x.state === "soon" ? "font-medium text-amber-700" : ""}`}>
                      {x.state === "ok" ? new Date(`${x.date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : alertText(x).replace(`${x.label} `, "")}
                    </span>
                  </div>
                ))}
            </Card>
          )}

          {(a.studentSchoolAndClass || a.otherLicensedSports || a.swimmingSkill || a.seaFear) && (
            <Card title="Eğitim ve spor" icon="book">
              <Row label="Okul / sınıf" value={a.studentSchoolAndClass} />
              <Row label="Diğer lisanslar" value={a.otherLicensedSports} />
              <Row label="Yüzme" value={a.swimmingSkill} />
              <Row label="Deniz korkusu" value={a.seaFear} />
              <Row label="Kayıt" value={a.source === "summer_school" ? "Yaz okulundan" : "Doğrudan kayıt"} />
            </Card>
          )}

          {/* Yarış evrakında kullanılan bilgiler */}
          {(a.licenseNo || a.studentBirthPlace || a.parentTc || a.studentSchoolPlace || a.studentNo || a.tyfNo || a.sailNo) && (
            <Card title="Yarış evrakı" icon="flag">
              <Row label="Lisans no" value={a.licenseNo} mono />
              <Row label="TYF sicil no" value={a.tyfNo} mono />
              <Row label="Yelken no" value={a.sailNo} mono />
              <Row label="Okul (belgede)" value={[a.studentSchool, a.studentSchoolPlace].filter(Boolean).join(" · ")} />
              <Row label="Okul no · sınıf" value={[a.studentNo, a.studentClass].filter(Boolean).join(" · ")} />
              <Row label="Doğum yeri" value={a.studentBirthPlace} />
              <Row label="Sporcu telefonu" value={a.studentPhone} href={tel(a.studentPhone)} mono />
              <Row label="Veli T.C." value={a.parentTc} mono />
              <Row label="Yakınlık" value={a.parentRelation} />
            </Card>
          )}

          <History items={history} />
        </>
      )}
      {tab === "att" && <Attendance a={a} />}
      {tab === "races" && <RaceHistory rows={races} />}
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
