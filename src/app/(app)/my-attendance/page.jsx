"use client";

import "@/features/home/sporcu.css";
import "@/features/athletes/yoklamaSahne.css";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Loading } from "@/components/ui/Loader";
import { useKind } from "@/features/auth/useKind";
import { monthOf, useMyAttendance } from "@/features/athletes/myAttendance";
import { liveHead } from "@/features/liveScreen/fonts";
import { isAthleteSide } from "@/lib/kinds";
import { todayStr } from "@/lib/utils/format";

const LABEL = { present: "Geldi", absent: "Gelmedi", excused: "İzinli" };
const MONTH = new Intl.DateTimeFormat("tr-TR", { month: "long" });
const MON = new Intl.DateTimeFormat("tr-TR", { month: "short" });
const WDAY = new Intl.DateTimeFormat("tr-TR", { weekday: "long" });
// İlk açılışta son 6 antrenman, "Daha fazla göster" her basışta 10 tane daha (Seyhun 2026-11-25).
// Yoklamanın hepsi tek belgede (athleteAtt/{uid}): okuma tek, sınır yalnız ekrana çizilen satır sayısı.
const FIRST = 6;
const STEP = 10;
const dayOf = (d) => new Date(`${d}T12:00:00`);

// Bir sporcunun yoklaması (Sahne): üstte bu ay (devam %, geldi / gelmedi / izinli, ayın günleri kare kare), altında son antrenmanlar.
// Devam oranında izinli sayılmaz (ana sayfadaki Yoklamam kutusuyla aynı: monthOf).
function Card({ rec }) {
  const [n, setN] = useState(FIRST);
  const days = Object.entries(rec.att || {}).sort((a, b) => b[0].localeCompare(a[0]));
  const ym = todayStr().slice(0, 7);
  const m = monthOf(rec, ym);
  const month = days.filter(([d]) => d.startsWith(ym)).reverse();
  return (
    <div className="ya-two">
      <div className="ya-col">
        <section className="ya-hero">
          <span className="ya-k">{MONTH.format(dayOf(`${ym}-15`))} · devam</span>
          <div className="ya-row">
            <b className="sh-c num ya-big" data-none={m.rate == null ? "" : undefined}>{m.rate == null ? "—" : `%${m.rate}`}</b>
            <div className="ya-st">
              {["present", "absent", "excused"].map((s) => (
                <span key={s} data-s={s}>
                  <b className="ya-c num">{m[s]}</b>
                  <small>{LABEL[s]}</small>
                </span>
              ))}
            </div>
          </div>
          {month.length > 0 && (
            <div className="ya-strip">
              {month.map(([d, v]) => (
                <i key={d} data-s={v} title={`${dayOf(d).getDate()} ${MON.format(dayOf(d))}: ${LABEL[v] || v}`} />
              ))}
            </div>
          )}
        </section>
      </div>
      <div className="ya-col">
        <h2 className="ya-sec m-0">Son antrenmanlar</h2>
        {days.length === 0 ? (
          <p className="ya-none">Henüz yoklama kaydı yok.</p>
        ) : (
          <>
            <ul className="ya-ls">
              {days.slice(0, n).map(([d, v]) => (
                <li key={d}>
                  <span className="ya-dt">
                    <b className="sh-c num">{dayOf(d).getDate()}</b>
                    <small>{MON.format(dayOf(d))}</small>
                  </span>
                  <span className="ya-wd">{WDAY.format(dayOf(d))}</span>
                  <span className="ya-tg" data-s={v}>{LABEL[v] || v}</span>
                </li>
              ))}
            </ul>
            {days.length > n && (
              <button type="button" data-press className="ya-more" onClick={() => setN((x) => x + STEP)}>
                Daha fazla göster
              </button>
            )}
          </>
        )}
      </div>
    </div>
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
  const { recs, err } = useMyAttendance(kind);
  const parent = kind === "parent";
  // Koyu zemin sayfanın altına da (ana sayfadaki gibi body.sh-body)
  useEffect(() => {
    document.body.classList.add("sh-body");
    return () => document.body.classList.remove("sh-body");
  }, []);

  return (
    <main data-theme="dark" className={`sh ya-sh ${liveHead.variable}`}>
      <header className="sh-top">
        <Link href="/" aria-label="Geri" data-press className="sh-rb">
          <Icon name="back" className="size-5" />
        </Link>
        <h1 className="sh-date m-0">{parent ? "Yoklama" : "Yoklamam"}</h1>
        <span className="w-10 shrink-0" />
      </header>
      {!recs ? (
        <Loading className="py-10" />
      ) : recs.length ? (
        <div className="ya-g">
          {recs.map((r) => (
            <div key={r.id} className="ya-col">
              {parent && <h2 className="sh-c ya-kid">{r.name}</h2>}
              <Card rec={r} />
            </div>
          ))}
        </div>
      ) : (
        <p className="ya-none mt-10 text-center">{err || "Henüz yoklama bilgisi yok."}</p>
      )}
    </main>
  );
}
