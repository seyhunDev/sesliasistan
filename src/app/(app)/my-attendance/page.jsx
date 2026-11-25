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

// Bu ayın halkası: geldi / gelmedi / izinli dilimleri, ortada geldiği gün sayısı (Seyhun 2026-11-25: büyük yüzde yok, motivasyon düşürmesin).
// Kayıt yoksa boş gri halka; hepsi geldi ise tek parça limon halka. Dilimler pathLength=100 ile yüzde olarak çizilir.
function Ring({ m }) {
  const total = m.present + m.absent + m.excused;
  let at = 0;
  const parts = total ? ["present", "absent", "excused"].filter((s) => m[s]).map((s) => {
    const len = (m[s] / total) * 100;
    const p = { s, len, at };
    at += len;
    return p;
  }) : [];
  const gap = parts.length > 1 ? 1.5 : 0;
  return (
    <div className="ya-ring">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="50" pathLength="100" className="ya-ring-bg" />
        {parts.map((p) => (
          <circle key={p.s} cx="60" cy="60" r="50" pathLength="100" data-s={p.s}
            strokeDasharray={`${Math.max(p.len - gap, 0.5)} ${100 - Math.max(p.len - gap, 0.5)}`} strokeDashoffset={-p.at} />
        ))}
      </svg>
      <span className="ya-ring-in">
        <b className="sh-c num">{m.present}</b>
        <small>geldi</small>
      </span>
    </div>
  );
}

// Bir sporcunun yoklaması (Sahne): üstte bu ayın halkası ve geldi / gelmedi / izinli, altında son antrenmanlar.
function Card({ rec }) {
  const [n, setN] = useState(FIRST);
  const days = Object.entries(rec.att || {}).sort((a, b) => b[0].localeCompare(a[0]));
  const ym = todayStr().slice(0, 7);
  const m = monthOf(rec, ym);
  return (
    <div className="ya-two">
      <div className="ya-col">
        <section className="ya-hero">
          <Ring m={m} />
          <div className="ya-leg">
            <span className="ya-k">{MONTH.format(dayOf(`${ym}-15`))}</span>
            {["present", "absent", "excused"].map((s) => (
              <span key={s} className="ya-lr" data-s={s}>
                <i />
                <small>{LABEL[s]}</small>
                <b className="num">{m[s]}</b>
              </span>
            ))}
          </div>
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
