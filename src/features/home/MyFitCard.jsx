"use client";

import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { useAdd } from "@/features/add/AddProvider";
import { athleteNext } from "@/lib/fitness/model";
import { todayStr } from "@/lib/utils/format";
import { ListHead, Row, RowList } from "@/components/ui/Row";

const DAY = new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "numeric", month: "short" });

// Sporcunun ana sayfası: antrenörün hazırladığı bugünkü antrenman (sağda Başla), yoksa sıradaki. Dokununca antrenman açılır (adım adım başlat);
// başlıktaki Tümü Fitness sayfasını açar. Ortak liste parçalarıyla (Row), lacivert alt alanda kendiliğinden koyu (Seyhun 2026-10-25).
// Antrenman yoksa çizilmez. Veri cihazdaki planlardan (ek okuma yok).
export function MyFitCard() {
  const { profile } = useAuth();
  const { plans } = useData();
  const { openAdd } = useAdd();
  const n = athleteNext(plans, profile?.uid, todayStr());
  if (!n) return null;
  const p = n.plan;
  const n2 = (p.fit?.items || []).length;
  const when = n.today ? `Bugün${p.time ? ` · ${p.time}` : ""}` : `${DAY.format(new Date(`${p.date}T12:00:00`))}${p.time ? ` · ${p.time}` : ""}`;
  return (
    <section aria-label="Antrenman">
      <ListHead title="Fitness" href="/fitness" />
      <RowList>
        <Row
          onClick={() => openAdd({ edit: { kind: "plan", id: p.id } })}
          lead={
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/15 text-acc">
              <Icon name="dumbbell" className="size-5" />
            </span>
          }
          title={p.fit?.name || p.title}
          sub={[when, n2 ? `${n2} hareket` : ""].filter(Boolean).join(" · ")}
          right={n.today ? <span className="food-btn">Başla</span> : null}
          chev={!n.today}
        />
      </RowList>
    </section>
  );
}
