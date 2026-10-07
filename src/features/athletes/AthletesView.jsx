"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { CARD, SectionHead } from "@/features/home/ui";
import { alertText, alertsOf, expiryList } from "@/lib/expiry";
import { clubPct, dayAtt, groupByClass, initialsOf, monthAtt, monthBirthdays, pctTone } from "@/lib/athleteStats";

const low = (s) => String(s || "").toLocaleLowerCase("tr-TR");
const MONTH = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long" });
const yearsOf = (iso, today) => {
  if (!iso) return null;
  const b = new Date(iso);
  if (Number.isNaN(b.getTime())) return null;
  const [y, m, d] = today.split("-").map(Number);
  return y - b.getFullYear() - (m < b.getMonth() + 1 || (m === b.getMonth() + 1 && d < b.getDate()) ? 1 : 0);
};

// Kulüp kartının tek satırı (ana sayfadaki KULÜP satırlarıyla aynı düzen): simge, ad + tek satır açıklama, sağda değer
function Row({ href, onClick, icon, label, sub, big, warn, tone, action, open }) {
  const inner = (
    <>
      <span className={`grid size-[2.375rem] shrink-0 place-items-center rounded-xl ${warn ? "bg-amber-500/12 text-amber-700" : "bg-acc/10 text-acc"}`}>
        <Icon name={icon} className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[0.9375rem] font-semibold leading-snug">{label}</b>
        <small className={`block truncate text-[0.8125rem] leading-snug ${warn ? "font-semibold text-amber-700" : "text-mut"}`}>{sub}</small>
      </span>
      {action ? (
        <span className="shrink-0 rounded-full bg-acc px-3.5 py-2 text-[0.8125rem] font-semibold text-white">{action}</span>
      ) : (
        <>
          {big != null && <b className={`shrink-0 text-right text-[1rem] font-bold tabular-nums tracking-tight ${tone || ""}`}>{big}</b>}
          <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${open ? "rotate-90" : ""}`} />
        </>
      )}
    </>
  );
  const cls = "flex w-full items-center gap-3 py-3 pl-4 pr-3 text-left transition active:bg-bg";
  return <li>{href ? <Link href={href} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>}</li>;
}

// Sporcular sayfası (görünüm): üstte KULÜP kartı (yoklama, aylık devam, sıradaki yarış, biten belgeler, doğum günleri),
// altında arama + sınıf çipleri, liste sınıflara göre gruplu; satırda yaş · antrenör ve bu ayın devamı.
// Veri ve işlemler dışarıdan gelir (page.jsx); bu dosya Firebase'e dokunmaz.
export function AthletesView({ all, classes, coaches, today, race, linked, passive, sel, onToggle }) {
  const [q, setQ] = useState("");
  const [cls, setCls] = useState("");
  const [docs, setDocs] = useState(false);
  const active = all.filter((a) => a.status === "active");
  const ym = today.slice(0, 7);
  const day = dayAtt(active, today);
  const pct = clubPct(active, ym);
  const expiry = expiryList(active, today);
  const gone = expiry.filter((r) => r.items.some((x) => x.state === "expired")).length;
  const bdays = monthBirthdays(active, today);
  const coach = Object.fromEntries((coaches || []).map((c) => [c.id, c.name]));

  const usedClasses = (classes || []).filter((c) => all.some((a) => a.currentClassId === c.id && (passive || a.status === "active")));
  const term = low(q).trim();
  const list = all.filter(
    (a) =>
      (passive || a.status === "active") &&
      (!cls || a.currentClassId === cls) &&
      (!term || low(a.studentName).includes(term) || a.studentTc.includes(term) || low(a.parentName).includes(term)),
  );
  const groups = cls || term ? [{ id: cls || "q", name: term ? "ARAMA" : usedClasses.find((c) => c.id === cls)?.name || "", items: list }] : groupByClass(list, classes);

  return (
    <>
      {/* KULÜP: bir bakışta durum, her satır tek iş */}
      {!sel && (
        <section className="mt-2" aria-label="Kulüp">
          <ul className={`divide-y divide-line overflow-hidden ${CARD}`}>
            <Row
              href="/athletes/attendance"
              icon="check"
              label="Bugünkü yoklama"
              sub={day.taken ? [`${day.present} geldi`, day.absent && `${day.absent} gelmedi`, day.excused && `${day.excused} izinli`].filter(Boolean).join(" · ") : `${active.length} sporcu · henüz alınmadı`}
              action={day.taken ? null : "Yoklama al"}
              big={day.taken ? `${day.present}/${active.length}` : null}
            />
            <Row href="/athletes/attendance/report" icon="chart" label={`${MONTH(ym)[0].toLocaleUpperCase("tr-TR")}${MONTH(ym).slice(1)} devamı`} sub={pct == null ? "Bu ay yoklama yok" : "Gelenlerin oranı · rapor"} big={pct == null ? "—" : `%${pct}`} tone={pctTone(pct)} />
            {race && (
              <Row
                href="/athletes/races"
                icon="flag"
                label="Yarışlar"
                sub={race.next ? `${race.next.name} · ${race.next.when}${race.next.left ? ` · ${race.next.left} iş eksik` : ""}` : race.on && !race.loading ? "Yaklaşan yarış yok" : "Yarışlar ve evrak"}
                big={race.up || null}
                warn={!!race.next?.left}
              />
            )}
            {expiry.length > 0 && (
              <Row onClick={() => setDocs((o) => !o)} icon="alert" warn label="Belgeler" sub={gone ? `${gone} sporcunun belgesi bitti` : "Yakında bitiyor"} big={expiry.length} tone="text-amber-700" open={docs} />
            )}
            {docs && (
              <li className="bg-amber-500/5">
                <ul className="divide-y divide-line/70 px-4">
                  {expiry.map(({ a, items }) => (
                    <li key={a.id}>
                      <Link href={`/athletes/${a.id}`} className="block py-2 pl-[3.125rem] active:opacity-60">
                        <b className="block text-[0.875rem] font-semibold">{a.studentName}</b>
                        {items.map((x) => (
                          <small key={x.key} className={`block text-[0.75rem] ${x.state === "expired" ? "font-medium text-rec" : "text-amber-800"}`}>{alertText(x)}</small>
                        ))}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            )}
            {bdays.length > 0 && (
              <li className="flex items-center gap-3 py-3 pl-4 pr-3">
                <span className="grid size-[2.375rem] shrink-0 place-items-center rounded-xl bg-pink-500/10 text-pink-600">
                  <Icon name="cake" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-[0.9375rem] font-semibold leading-snug">Bu ay doğum günü</b>
                  <small className="block truncate text-[0.8125rem] leading-snug text-mut">
                    {bdays.map((b) => `${b.a.studentName.split(" ")[0]} ${b.day}`).join(" · ")}
                  </small>
                </span>
              </li>
            )}
          </ul>
        </section>
      )}

      {/* Arama + sınıflar */}
      <div className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] z-[5] -mx-5 mt-5 bg-bg/90 px-5 pb-2 pt-1 backdrop-blur">
        <label className={`flex h-11 items-center gap-2 rounded-xl px-3 ${CARD}`}>
          <Icon name="search" className="size-[1.125rem] shrink-0 text-mut" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Sporcu, T.C. ya da veli ara" inputMode="search" className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut" />
          {q && (
            <button onClick={() => setQ("")} aria-label="Temizle" className="grid size-7 place-items-center rounded-full text-mut active:bg-bg">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </label>
        {usedClasses.length > 1 && (
          <div className="-mx-5 mt-2 flex gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
            {[{ id: "", name: "Tümü" }, ...usedClasses].map((c) => {
              const n = all.filter((a) => (passive || a.status === "active") && (!c.id || a.currentClassId === c.id)).length;
              return (
                <button
                  key={c.id || "all"}
                  onClick={() => setCls(c.id)}
                  className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-semibold transition active:scale-95 ${cls === c.id ? "bg-deep text-white" : "bg-card text-fg ring-1 ring-line"}`}
                >
                  {c.name}
                  <span className={`tabular-nums ${cls === c.id ? "text-white/70" : "text-mut"}`}>{n}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <p className="mt-8 text-center text-[0.875rem] text-mut">Eşleşen sporcu yok</p>
      ) : (
        <div className="mt-3 space-y-5">
          {groups.map((g) => (
            <section key={g.id || "none"}>
              <SectionHead title={g.name.toLocaleUpperCase("tr-TR")} count={g.items.length} />
              <ul className={`divide-y divide-line overflow-hidden ${CARD}`}>
                {g.items.map((a) => (
                  <AthleteRow key={a.id} a={a} coach={coach[a.currentCoachId]} today={today} ym={ym} inApp={!!linked?.has(a.id) && linked.get(a.id).account !== false} sel={sel} onToggle={onToggle} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

// Sporcu satırı: baş harfler (uygulamadaysa yeşil nokta), ad, yaş · antrenör, sağda bu ayın devamı; belge bittiyse kırmızı etiket.
// Seçim kipinde (hesap açma) solda işaret dairesi.
export function AthleteRow({ a, coach, today, ym, inApp, sel, onToggle }) {
  const on = a.status === "active";
  const yrs = yearsOf(a.studentBirthDate, today);
  const m = monthAtt(a, ym);
  const expired = on && alertsOf(a, today).some((x) => x.state === "expired");
  const sub = [yrs != null && `${yrs} yaş`, coach, !on && "Pasif"].filter(Boolean).join(" · ") || "Antrenör atanmamış";
  const avatar = (
    <span className={`relative grid size-10 shrink-0 place-items-center rounded-full text-[0.8125rem] font-bold ${on ? "bg-acc/10 text-acc" : "bg-bg text-mut"}`}>
      {initialsOf(a.studentName)}
      {inApp && <span title="Uygulamada" className="absolute -bottom-0.5 -right-0.5 size-3.5 rounded-full bg-ok ring-2 ring-card" />}
    </span>
  );
  const text = (
    <span className="min-w-0 flex-1">
      <span className={`block truncate text-[0.9375rem] font-semibold leading-snug ${on ? "" : "text-mut"}`}>{a.studentName}</span>
      <span className="block truncate text-[0.8125rem] leading-snug text-mut">{sub}</span>
    </span>
  );
  if (sel)
    return (
      <li>
        <button type="button" disabled={inApp} onClick={() => onToggle(a.id)} aria-pressed={sel.has(a.id)} className="flex w-full items-center gap-3 py-2.5 pl-4 pr-4 text-left active:bg-bg disabled:opacity-45">
          <span className={`grid size-6 shrink-0 place-items-center rounded-full ring-2 ${sel.has(a.id) ? "bg-acc text-white ring-acc" : "ring-line"}`}>
            {sel.has(a.id) && <Icon name="check" className="size-4 [stroke-width:3]" />}
          </span>
          {avatar}
          {text}
          {inApp && <span className="shrink-0 text-[0.75rem] font-semibold text-ok">Uygulamada</span>}
        </button>
      </li>
    );
  return (
    <li>
      <Link href={`/athletes/${a.id}`} className="flex items-center gap-3 py-2.5 pl-4 pr-3 active:bg-bg">
        {avatar}
        {text}
        {expired && <span className="shrink-0 rounded-full bg-rec/10 px-2 py-0.5 text-[0.6875rem] font-bold text-rec">Belge</span>}
        {on && (
          <span className="w-11 shrink-0 text-right leading-tight">
            <b className={`block text-[0.9375rem] font-bold tabular-nums ${pctTone(m.pct)}`}>{m.pct == null ? "—" : `%${m.pct}`}</b>
            <small className="block text-[0.625rem] text-mut">{m.total ? `${m.present}/${m.present + m.absent}` : "devam"}</small>
          </span>
        )}
        <Icon name="chev" className="size-4 shrink-0 text-mut" />
      </Link>
    </li>
  );
}

// Başlıktaki ⋯ menüsü: seyrek işler (uygulamaya ekle, pasifler, kulüp bağlantısı)
export function MoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Diğer" aria-expanded={open} className="grid size-10 place-items-center rounded-full bg-card text-fg shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-90">
        <Icon name="more" className="size-5" />
      </button>
      {open && (
        <div className={`absolute right-0 top-12 z-30 w-60 overflow-hidden py-1 ${CARD}`}>
          {items.filter(Boolean).map((it) => (
            <button
              key={it.label}
              type="button"
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-[0.9375rem] active:bg-bg"
            >
              <Icon name={it.icon} className="size-5 shrink-0 text-acc" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{it.label}</span>
                {it.sub && <small className="block truncate text-[0.75rem] text-mut">{it.sub}</small>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
