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
import { initials } from "@/lib/utils/format";

// Günün penceresi (ana sayfada büyük güne dokununca; 2026-10-21 yeni düzen: bölüm başlığı + tek liste, satır = ad + alt bilgi + sağda durum):
// PLANLAR (saat, ad, yer; dokununca plan), YELKEN (antrenman satırı dokununca antrenman sayfası; günlüğü yazılmadıysa sarı alt yazı ve "Günlük yaz";
// altında Yoklama; plan yoksa "Antrenman ekle"), FİTNESS (sporcu, program, durum; dokununca o günkü plan).
const FIT_ST = { done: ["Yaptı", "st"], missed: ["Yapmadı", "gen"], skip: ["Atladı", "gen"] };
export function DayPick({ day, att, today, onClose }) {
  const { saveDrafts } = useData();
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
  return (
    <Sheet navy open={!!day} onClose={onClose} title={title}>
      {day && (
        <div className="flex flex-col gap-5 pb-1">
          {info.other.length > 0 && (
            <section>
              <ListHead title="Planlar" count={info.other.length} />
              <RowList>
                {info.other.map((p) => (
                  <Row key={p.id} onClick={() => edit(p.id)} lead={<span className="w-12 shrink-0 text-[0.875rem] font-semibold tabular-nums text-acc">{p.time || "Gün"}</span>} title={p.title || "Plan"} sub={p.place} />
                ))}
              </RowList>
            </section>
          )}
          {att || info.sail.length ? (
            <section className={day.state === "miss" ? "order-first" : ""}>
              <ListHead title="Yelken" />
              {info.sail.length > 0 && (
                <RowList>
                  {info.sail.map((p) => (
                    <Row
                      key={p.id}
                      onClick={() => go(`/training/day?id=${p.id}`)}
                      title={p.title || "Antrenman"}
                      sub={needsLog(p, today) ? "Antrenman günlüğü yazılmadı" : [p.time || "Tüm gün", p.place].filter(Boolean).join(" · ")}
                      warn={needsLog(p, today)}
                    />
                  ))}
                </RowList>
              )}
              {(noLog || info.attHref || info.add) && (
                <div className="mt-2.5 flex gap-2">
                  {noLog && (
                    <Button variant="secondary" full onClick={() => edit(noLog.id)}>
                      Günlük yaz
                    </Button>
                  )}
                  {info.add ? (
                    <Button full loading={busy} onClick={addPlan}>
                      Antrenman ekle
                    </Button>
                  ) : (
                    info.attHref && (
                      <Button full onClick={() => go(info.attHref)}>
                        Yoklama
                      </Button>
                    )
                  )}
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
