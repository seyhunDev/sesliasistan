"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ListHead } from "@/components/ui/Row";
import { useAdd } from "@/features/add/AddProvider";
import { canSeeAthletes } from "@/features/athletes/access";
import { useRaceHome } from "@/features/athletes/raceHome";
import { planKindOf } from "@/features/athletes/raceLinks";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { sky } from "@/features/weather/weather";
import { useNow } from "@/hooks/useNow";
import { attHref } from "@/lib/homeTiles";
import { isTraining } from "@/lib/trainingLog";
import { todayStr } from "@/lib/utils/format";

// Seçilen günün saat çizelgesi (Seyhun 2026-11-04 "A · Hava manzarası", örnek yeni-ana-tam): solda saat ve o saatin havası (simge, derece, yağmur mm),
// yanında planın renkli kartı (yarış kırmızı, antrenman yeşil, son tarih turuncu, diğer mavi; yapılan üstü çizili). Bugünse şimdiki an kırmızı çizgi.
// Kartta adlı hızlı iş: antrenmanda Yoklama (yetkiliyse), son tarihte Yapıldı, yarışta Yarış sayfası. Karta dokununca plan açılır.
// rows: seçilen günün saatlik havası (dayHours); veri cihazdaki planlardan (ek okuma yok).
const COLOR = { race: "#c8574f", train: "#4a8a64", deadline: "#e58a2b", plan: "#2563eb" };

export function DayTimeline({ date, rows }) {
  const { plans, updateRecord } = useData();
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const race = useRaceHome();
  const now = useNow();
  const today = todayStr();
  const isToday = date === today;
  const att = canSeeAthletes(profile?.email);
  const list = plans
    .filter((p) => p.date === date && p.status !== "cancelled")
    .sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
  const hm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const d = new Date(`${date}T12:00`);
  const title = isToday ? "Bugün" : `${cap(d.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", ""))} ${d.getDate()} ${d.toLocaleDateString("tr-TR", { month: "long" })}`;
  const isDone = (p) => !!p.done || p.status === "done";
  // Şimdi çizgisi: ilk saatli planın (şimdiden sonraki) önüne
  const nowAt = isToday ? list.findIndex((p) => p.time && p.time > hm) : -1;
  const nowLine = isToday && list.some((p) => p.time) ? (nowAt === -1 ? list.length : nowAt) : -1;

  return (
    <section aria-label="Günün planları">
      <ListHead title={title} count={list.length || null} href="/plans" more="Takvim" />
      <div className="overflow-hidden rounded-[1.125rem] border border-line bg-card px-3">
        {list.length === 0 && <p className="py-3.5 text-[0.875rem] text-mut">Bu gün plan yok</p>}
        {list.map((p, i) => {
          const { kind, race: r } = planKindOf(p, race.open);
          const train = isTraining(p);
          const done = isDone(p);
          const c = COLOR[kind === "race" ? "race" : train ? "train" : kind === "deadline" ? "deadline" : "plan"];
          const h = p.time && rows?.find((x) => x.hh === p.time.slice(0, 2));
          const s = h && sky(h.code, h.day);
          return (
            <div key={p.id}>
              {nowLine === i && <NowLine hm={hm} />}
              <div className={`grid grid-cols-[3.875rem_minmax(0,1fr)] gap-2 py-2 ${i > 0 && nowLine !== i ? "border-t border-line" : ""}`}>
                <span className="pt-0.5 text-[0.75rem] tabular-nums text-mut">
                  {p.time || "Gün"}
                  {h && (
                    <small className="mt-0.5 flex items-center gap-0.5 whitespace-nowrap text-[0.625rem]">
                      <Icon name={s.icon} className="size-3" />
                      {h.t}°{h.mm >= 0.1 ? ` · ${fmtMm(h.mm)} mm` : ""}
                    </small>
                  )}
                </span>
                <div style={{ "--c": c }} className={`min-w-0 rounded-xl border-l-[3px] border-[color:var(--c)] bg-[color-mix(in_srgb,var(--c)_13%,var(--card))] px-2.5 py-1.5 ${done ? "opacity-60" : ""}`}>
                  <button type="button" data-press onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })} className="block w-full min-w-0 text-left">
                    <b className={`block truncate text-[0.84375rem] font-semibold ${done ? "line-through" : ""}`}>{p.title || "Plan"}</b>
                    <small className="block truncate text-[0.71875rem] text-mut">{done ? "Yapıldı" : [p.place, kind === "race" && r ? "Yarış" : ""].filter(Boolean).join(" · ") || (kind === "deadline" ? "Son tarih" : "")}</small>
                  </button>
                  {!done && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5 empty:hidden">
                      {kind !== "plan" && r && (
                        <Link href={`/athletes/races/${r.id}`} data-press className="btn btn-sm btn-secondary !h-7 !px-3 !text-[0.75rem]">Yarış sayfası</Link>
                      )}
                      {train && att && date <= today && (
                        <Link href={attHref(date, today) || "/athletes/attendance"} data-press className="btn btn-sm btn-primary !h-7 !px-3 !text-[0.75rem]">Yoklama</Link>
                      )}
                      {kind === "deadline" && (
                        <button type="button" data-press onClick={() => updateRecord("plan", p.id, { done: true }, profile?.uid)} className="btn btn-sm btn-primary !h-7 !px-3 !text-[0.75rem]">Yapıldı</button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {nowLine === list.length && list.length > 0 && <NowLine hm={hm} />}
      </div>
    </section>
  );
}

function NowLine({ hm }) {
  return (
    <div className="relative mb-1 ml-[3.875rem] mt-[1.125rem] border-t-2 border-[#e5484d]" aria-label="Şimdi">
      <span className="absolute -left-[0.3125rem] -top-[0.3125rem] size-2 rounded-full bg-[#e5484d]" />
      <small className="absolute -top-[1.0625rem] right-0 text-[0.625rem] font-bold text-[#e5484d]">Şimdi {hm}</small>
    </div>
  );
}

const cap = (t) => t.charAt(0).toLocaleUpperCase("tr-TR") + t.slice(1);
const fmtMm = (v) => (v < 10 ? v.toLocaleString("tr-TR", { maximumFractionDigits: 1 }) : String(Math.round(v)));
