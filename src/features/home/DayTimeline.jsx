"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ListHead } from "@/components/ui/Row";
import { useAdd } from "@/features/add/AddProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { useRaceHome } from "@/features/athletes/raceHome";
import { planKindOf } from "@/features/athletes/raceLinks";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { onDay, timeOn } from "@/lib/agenda";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { sky } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { attHref } from "@/lib/homeTiles";
import { isTraining } from "@/lib/trainingLog";
import { todayStr } from "@/lib/utils/format";

// Seçilen günün saat çizelgesi (Seyhun 2026-11-04 "A · Hava manzarası", örnek yeni-ana-tam): solda saat ve o saatin havası (simge, derece, yağmur mm),
// yanında ince renkli çizgi + ad + tür/yer (yarış kırmızı, antrenman yeşil, son tarih turuncu, diğer mavi; yapılan soluk, üstü çizili). Bugünse şimdiki an kırmızı çizgi.
// Kartta adlı hızlı iş: antrenmanda Yoklama (yetkiliyse), son tarihte Yapıldı, yarışta Yarış sayfası. Karta dokununca plan açılır.
// rows: seçilen günün saatlik havası (dayHours); veri cihazdaki planlardan (ek okuma yok).
// Tür rengi yalnız soldaki ince çizgide ve alt satırdaki tür adında (zemin renksiz; Seyhun 2026-11-04 "rengi çok kötü").
const COLOR = { race: "#e5736b", train: "#4fb37f", deadline: "#e8a04f", plan: "#6f9cf0" };
const LABEL = { race: "Yarış", train: "Antrenman", deadline: "Son tarih", plan: "Plan" };

export function DayTimeline({ date, rows }) {
  const { plans, updateRecord } = useData();
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const race = useRaceHome();
  const { open, hrefOf } = usePlanOpen();
  const now = useNow();
  const today = todayStr();
  const isToday = date === today;
  const att = canSeeAthletes(profile?.email);
  // Çok günlü plan (yarış) her gününde görünür; saati yalnız ilk gününde (sonraki günlerde tüm gün)
  const list = plans
    .filter((p) => onDay(p, date) && p.status !== "cancelled")
    .map((p) => (timeOn(p, date) === (p.time || "") ? p : { ...p, time: "" }))
    .sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const d = new Date(`${date}T12:00`);
  const title = isToday ? "Bugün" : `${cap(d.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""))} ${d.getDate()} ${d.toLocaleDateString("tr-TR", { month: "long" })}`;
  const isDone = (p) => !!p.done || p.status === "done";
  // Şimdi çizgisi: ilk saatli planın (şimdiden sonraki) önüne
  const nowAt = isToday ? list.findIndex((p) => p.time && p.time > hm) : -1;
  const nowLine = isToday && list.some((p) => p.time) ? (nowAt === -1 ? list.length : nowAt) : -1;

  // Saatsiz (tüm gün) planlar üstte; saat sütunu yalnız saatli plan varsa açılır (Seyhun 2026-11-04: boş "Gün" sütunu ve renkli zemin kötü)
  const timed = list.some((p) => p.time);
  return (
    <section aria-label="Günün planları">
      <ListHead title={title} href="/plans" more="Takvim" />
      <div className="overflow-hidden rounded-[1.125rem] border border-line bg-card">
        {list.length === 0 && <p className="px-3.5 py-3.5 text-[0.875rem] text-mut">Bu gün plan yok</p>}
        {list.map((p, i) => {
          const { kind, race: r } = planKindOf(p, race.open);
          const train = isTraining(p);
          const done = isDone(p);
          const k = kind === "race" ? "race" : train ? "train" : kind === "deadline" ? "deadline" : "plan";
          const h = p.time && rows?.find((x) => x.hh === p.time.slice(0, 2));
          const s = h && sky(h.code, h.day);
          const sub = done ? "Yapıldı" : [p.place].filter(Boolean).join(" · ");
          const btns = !done && (
            <>
              {kind === "race" && hrefOf(p) && (
                <button type="button" data-press onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} className="btn btn-sm btn-secondary !h-8 !px-3.5 !text-[0.8125rem]">Plan</button>
              )}
              {kind !== "plan" && r && !hrefOf(p) && (
                <Link href={`/athletes/races/${r.id}`} data-press className="btn btn-sm btn-secondary !h-8 !px-3.5 !text-[0.8125rem]">Yarış sayfası</Link>
              )}
              {train && att && date <= today && (
                <Link href={attHref(date, today) || "/athletes/attendance"} data-press className="btn btn-sm btn-primary !h-8 !px-3.5 !text-[0.8125rem]">Yoklama</Link>
              )}
              {kind === "deadline" && (
                <button type="button" data-press onClick={() => updateRecord("plan", p.id, { done: true }, profile?.uid)} className="btn btn-sm btn-primary !h-8 !px-3.5 !text-[0.8125rem]">Yapıldı</button>
              )}
            </>
          );
          return (
            <div key={p.id}>
              {nowLine === i && <NowLine hm={hm} timed={timed} />}
              <div className={`flex gap-3 px-3.5 py-3 ${i > 0 && nowLine !== i ? "border-t border-line" : ""} ${done ? "opacity-55" : ""}`}>
                {timed && (
                  <span className="w-11 shrink-0 pt-px text-[0.875rem] font-semibold tabular-nums">
                    {p.time || <small className="text-[0.75rem] font-medium text-mut">Tüm gün</small>}
                    {h && (
                      <small className="mt-0.5 flex items-center gap-0.5 whitespace-nowrap text-[0.6875rem] font-normal text-mut">
                        <Icon name={s.icon} className="size-3" />
                        {h.t}°{h.mm >= 0.1 ? ` ${fmtMm(h.mm)}mm` : ""}
                      </small>
                    )}
                  </span>
                )}
                <span aria-hidden="true" className="w-[3px] shrink-0 self-stretch rounded-full" style={{ background: COLOR[k] }} />
                <div className="min-w-0 flex-1">
                  <button type="button" data-press onClick={() => open(p)} className="block w-full min-w-0 text-left">
                    <b className={`block truncate text-[0.9375rem] font-semibold ${done ? "line-through" : ""}`}>{p.title || "Plan"}</b>
                    <small className="mt-0.5 block truncate text-[0.8125rem] text-mut">
                      <span className="font-semibold" style={{ color: COLOR[k] }}>{LABEL[k]}</span>
                      {sub ? ` · ${sub}` : ""}
                    </small>
                  </button>
                  {btns && <div className="mt-2 flex flex-wrap gap-1.5 empty:hidden">{btns}</div>}
                </div>
              </div>
            </div>
          );
        })}
        {nowLine === list.length && list.length > 0 && <NowLine hm={hm} timed={timed} />}
      </div>
    </section>
  );
}

function NowLine({ hm, timed }) {
  return (
    <div className={`relative mx-3.5 mb-1 mt-[1.125rem] border-t-2 border-[#e5484d] ${timed ? "ml-[4.125rem]" : ""}`} aria-label="Şimdi">
      <span className="absolute -left-[0.3125rem] -top-[0.3125rem] size-2 rounded-full bg-[#e5484d]" />
      <small className="absolute -top-[1.0625rem] right-0 text-[0.625rem] font-bold text-[#e5484d]">Şimdi {hm}</small>
    </div>
  );
}

const cap = (t) => t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1);
const fmtMm = (v) => (v < 10 ? v.toLocaleString("tr-TR", { maximumFractionDigits: 1 }) : String(Math.round(v)));
