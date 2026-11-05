"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { ListHead, Row, RowList, Tag } from "@/components/ui/Row";
import { useToast } from "@/components/ui/ToastProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { dayInfo, needsLog } from "@/lib/homeTiles";
import { isFit } from "@/lib/fitness/model";
import { isTraining } from "@/lib/trainingLog";
import { planKindOf } from "@/features/athletes/raceLinks";
import { useRaceHome } from "@/features/athletes/raceHome";
import { usePlanOpen } from "@/features/athletes/usePlanOpen";
import { onDay, timeOn } from "@/lib/agenda";
import { Icon } from "@/components/ui/Icon";
import { initials } from "@/lib/utils/format";

// Günün penceresi (ana sayfada büyük güne dokununca; 2026-10-21 yeni düzen: bölüm başlığı + tek liste, satır = ad + alt bilgi + sağda durum):
// PLANLAR (saat, ad, yer; dokununca plan), YELKEN (antrenman satırı dokununca antrenman sayfası; günlüğü yazılmadıysa sarı alt yazı ve "Günlük yaz";
// altında Yoklama; plan yoksa "Antrenman ekle"), FİTNESS (sporcu, program, durum; dokununca o günkü plan).
const FIT_ST = { done: ["Yaptı", "st"], missed: ["Yapmadı", "gen"], skip: ["Atladı", "gen"] };
export function DayPick({ day, att, today, onClose }) {
  const { saveDrafts, plans, updateRecord } = useData();
  const race = useRaceHome();
  const { open, hrefOf } = usePlanOpen();
  const { profile } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { openAdd } = useAdd();
  const [busy, setBusy] = useState(false);
  const info = day ? dayInfo(day, att, today) : { sail: [], fit: [], other: [] };
  const title = day ? new Date(`${day.date}T12:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" }) : "";
  const go = (href) => {
    onClose();
    router.push(href);
  };
  // Yelken planı yok: "Antrenman" planı açılır, gün geldiyse yoklama sayfası açılır
  const addPlan = async () => {
    if (busy || !day) return;
    setBusy(true);
    const r = await saveDrafts([{ type: "plan", title: "Antrenman", cat: "Antrenman", date: day.date, time: "", place: "", assignees: [] }], { source: "manual", by: profile?.uid });
    setBusy(false);
    if (r?.error) return toast("Antrenman eklenemedi.");
    if (info.attHref) go(info.attHref);
    else {
      toast(r?.queued ? "Antrenman eklendi, bağlantı gelince gönderilecek." : "Antrenman eklendi.");
      onClose();
    }
  };
  const edit = (id) => {
    onClose();
    openAdd({ edit: { kind: "plan", id } });
  };
  const noLog = info.sail.find((p) => needsLog(p, today));
  // Planlar: yapılanlar da listede kalır (yeşil ✓, üstü çizili; dokununca geri alınır). Antrenman ve fitness kendi bölümlerinde.
  const others = day
    ? plans
        .filter((p) => onDay(p, day.date) && !isTraining(p) && !isFit(p) && p.status !== "cancelled")
        .map((p) => (timeOn(p, day.date) === (p.time || "") ? p : { ...p, time: "" }))
        .sort((a, b) => (a.time || "99").localeCompare(b.time || "99"))
    : [];
  const isDone = (p) => !!p.done || p.status === "done";
  const toggleDone = (p) => updateRecord("plan", p.id, isDone(p) ? { done: false, ...(p.status === "done" ? { status: "" } : {}) } : { done: true }, profile?.uid);
  const canLog = day && day.date <= today;
  return (
    <Sheet navy open={!!day} onClose={onClose} title={title}>
      {day && (
        <div className="flex flex-col gap-5 pb-1">
          {others.length > 0 && (
            <section>
              <ListHead title="Planlar" count={others.length} />
              <RowList>
                {others.map((p) => {
                  const { kind, race: r } = planKindOf(p, race.open);
                  const done = isDone(p);
                  const tm = <span className="w-12 shrink-0 pt-0.5 text-[0.875rem] font-semibold tabular-nums text-acc">{p.time || "Gün"}</span>;
                  return (
                    <QuickRow
                      key={p.id}
                      lead={kind === "race" ? tm : <Check on={done} label={done ? "Yapılmadı yap" : "Yapıldı"} onClick={() => toggleDone(p)} />}
                      onOpen={() => open(p, onClose)}
                      title={p.title || "Plan"}
                      sub={done ? "Yapıldı" : [kind !== "race" && p.time, p.place].filter(Boolean).join(" · ")}
                      done={done}
                    >
                      {!done && kind !== "plan" && r && !hrefOf(p) && (
                        <Button size="sm" variant={kind === "race" ? "primary" : "secondary"} onClick={() => go(`/athletes/races/${r.id}`)}>
                          Yarış sayfası
                        </Button>
                      )}
                      {!done && kind === "race" && hrefOf(p) && (
                        <Button size="sm" variant="secondary" onClick={() => edit(p.id)}>
                          Plan
                        </Button>
                      )}
                    </QuickRow>
                  );
                })}
              </RowList>
            </section>
          )}
          {att || info.sail.length ? (
            <section className={day.state === "miss" ? "order-first" : ""}>
              <ListHead title="Yelken" />
              {info.sail.length > 0 && (
                <RowList>
                  {info.sail.map((p) => (
                    <QuickRow
                      key={p.id}
                      lead={<span className="w-12 shrink-0 pt-0.5 text-[0.875rem] font-semibold tabular-nums text-acc">{p.time || "Gün"}</span>}
                      onOpen={() => go(`/training/day?id=${p.id}`)}
                      title={p.title || "Antrenman"}
                      sub={needsLog(p, today) ? "Antrenman günlüğü yazılmadı" : p.place}
                      warn={needsLog(p, today)}
                      chev
                    >
                      {info.attHref && (
                        <Button size="sm" onClick={() => go(info.attHref)}>
                          Yoklama
                        </Button>
                      )}
                      {canLog && (
                        <Button size="sm" variant="secondary" onClick={() => edit(p.id)}>
                          Günlük
                        </Button>
                      )}
                    </QuickRow>
                  ))}
                </RowList>
              )}
              {info.add && (
                <div className="mt-2.5 flex gap-2">
                  <Button full loading={busy} onClick={addPlan}>
                    Antrenman ekle
                  </Button>
                </div>
              )}
              {info.add && info.attHref && (
                <Button variant="text" size="sm" full className="mt-1.5" onClick={() => go(info.attHref)}>
                  Plan eklemeden yoklama al
                </Button>
              )}
            </section>
          ) : null}
          {info.fit.length > 0 && (
            <section>
              <ListHead title="Fitness" count={info.fit.length} />
              <RowList>
                {info.fit.map((f) => {
                  const [t, tone] = FIT_ST[f.st] || ["Bekliyor", "fit"];
                  return (
                    <Row
                      key={f.id || f.name}
                      onClick={f.plan?.id ? () => edit(f.plan.id) : undefined}
                      lead={<span className="tone-fit tone-chip grid size-10 shrink-0 place-items-center rounded-full text-[0.75rem] font-semibold">{f.mine ? "Sen" : initials(f.name)}</span>}
                      title={f.mine ? "Senin antrenmanın" : f.name}
                      sub={f.plan?.fit?.name || f.plan?.title || "Antrenman"}
                      right={<Tag tone={tone}>{t}</Tag>}
                    />
                  );
                })}
              </RowList>
            </section>
          )}
        </div>
      )}
    </Sheet>
  );
}

// Hızlı işlemli satır (gün penceresi): solda saat ya da Yapıldı işareti, ortada ad (dokununca açılır) ve alt bilgi, altında adlı küçük düğmeler
function QuickRow({ lead, onOpen, title, sub, warn, done, chev, children }) {
  const kids = [children].flat(2).filter(Boolean);
  return (
    <div className="flex items-start gap-3 border-t border-line py-2.5 first:border-t-0">
      {lead}
      <div className="min-w-0 flex-1">
        <button type="button" data-press="row" onClick={onOpen} className="flex w-full items-center gap-2 text-left">
          <span className="min-w-0 flex-1">
            <b className={`block truncate text-[0.9375rem] font-semibold ${done ? "text-mut line-through" : ""}`}>{title}</b>
            {sub && <small className={`block truncate text-[0.8125rem] ${warn ? "text-warn" : "text-mut"}`}>{sub}</small>}
          </span>
          {chev && <Icon name="chev" className="size-4 shrink-0 text-mut" />}
        </button>
        {kids.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{kids}</div>}
      </div>
    </div>
  );
}

// Yapıldı işareti (Hatırlatıcılar gibi yuvarlak): boşken çerçeve, yapılınca yeşil ✓
function Check({ on, label, onClick }) {
  return (
    <button type="button" aria-label={label} aria-pressed={on} onClick={onClick} data-press className="grid size-12 shrink-0 -my-2.5 -ml-1.5 place-items-center">
      <span className={`grid size-6 place-items-center rounded-full border-2 transition-colors ${on ? "border-ok bg-ok text-white" : "border-mut/70"}`}>
        {on && <Icon name="check" className="size-3.5 [stroke-width:3]" />}
      </span>
    </button>
  );
}
