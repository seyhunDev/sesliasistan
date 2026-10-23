"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WaSheet } from "./WaSheet";
import { FadeImg } from "@/components/ui/FadeImg";
import { Icon } from "@/components/ui/Icon";
import { ListHead, Row, RowList, Tag } from "@/components/ui/Row";
import { useAdd } from "@/features/add/AddProvider";
import { useChat, toMs } from "@/features/chat/ChatProvider";
import { useData } from "@/features/data/DataProvider";
import { statusOf } from "@/lib/fitness/model";
import { clubRaceRow, fitHref, fitWeek, homeNotes, lastTraining, personHref, readSum, saveSum } from "@/lib/homeTiles";
import { loadAthletes } from "@/features/athletes/data";
import { noteWhen } from "@/lib/noteState";
import { initials, todayStr } from "@/lib/utils/format";

// Ana sayfanın canlı alanları: Sporcular, Fitness, Notlar ve Kulüp listesindeki Mesajlar satırı (Kulüp listesi HomeSummary.jsx'te).
// Bilgisi olmayan alan çizilmez. Bellekteki veriden (useData, useChat), ek okuma yok. WIDGET/WHead: eski kart kalıbı (sıradaki yarış kartı).
export const WIDGET = "relative flex min-h-[8.25rem] flex-col overflow-hidden rounded-2xl bg-card px-3.5 py-3 text-left";

// Alan başlığı: plan/kişi türünün renginde nokta (tone: st yeşil, sp mavi, ve lila, fa kahve, fit turuncu), ad, gri sayı; sağda tek eylem
export function WHead({ tone, title, count, right }) {
  return (
    <span className="flex items-center justify-between gap-2 text-[0.8125rem]">
      <span className="flex min-w-0 items-center gap-1.5 font-semibold">
        <span aria-hidden="true" className={`tone-${tone} tone-bar size-2 shrink-0 rounded-full`} />
        <span className="truncate">{title}</span>
        {count != null && count !== "" && <span className="shrink-0 font-normal tabular-nums text-mut">{count}</span>}
      </span>
      {right && <span className="flex shrink-0 items-center gap-3 font-semibold">{right}</span>}
    </span>
  );
}

// Yuvarlak kişi: fotoğraf varsa baş harflerin üstünde yumuşakça belirir (FadeImg), yoksa türünün renginde baş harf
function Face({ name, photo, tone = "sp", cls = "size-10" }) {
  return (
    <span className={`tone-${tone} tone-chip relative grid shrink-0 place-items-center overflow-hidden rounded-full text-[0.75rem] font-semibold ${cls}`}>
      {initials(name)}
      {photo && <FadeImg src={photo} className="size-full rounded-full object-cover" />}
    </span>
  );
}

// 2026-10-21 kokpit tasarımı ("C"): her bölüm aynı kalıpta: üstte gri büyük harfli başlık ve sayı, sağda "Tümü ›" (ListHead), altında beyaz
// listede aynı biçimde satırlar (Row: ad, altında tek kısa bilgi, sağda durum/sayı, ›). Ekleme ve yoklama gibi işler kokpitin altındaki
// adlı düğmelerde (HomeGrid); kartlarda tekrar düğme yok.

// Sporcular (Seyhun 2026-10-20: "sporcuları ayrı, fitness ayrı"): fotoğraflar yan yana (en çok 7, fazlası "+N"; dokununca o sporcunun sayfası),
// altında "Sporculara WhatsApp" satırı (hazır kalıplarla, WaSheet). Sporcu yoksa çizilmez. races: useRaceHome().open (kalıplarda sıradaki yarış)
export function AthletesWidget({ races }) {
  const [wa, setWa] = useState(false);
  const { members } = useData();
  const list = (members || []).filter((m) => m && m.name && m.status !== "left" && (m.kind === "athlete" || m.kind === "student")).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  if (!list.length) return null;
  const shown = list.slice(0, 7);
  return (
    <section aria-label="Sporcular">
      <ListHead title="Sporcular" count={list.length} href="/athletes" />
      <RowList>
        <div className="flex items-center py-3">
          {shown.map((m, i) => (
            <Link key={m.uid} href={personHref(m)} aria-label={m.name} className={`rounded-full ring-[2.5px] ring-card ${i ? "-ml-2.5" : ""}`}>
              <Face name={m.name} photo={m.photo} />
            </Link>
          ))}
          {list.length > shown.length && (
            <Link href="/athletes" className="-ml-2.5 grid size-10 place-items-center rounded-full bg-line text-[0.75rem] font-semibold text-fg2 ring-[2.5px] ring-card">
              +{list.length - shown.length}
            </Link>
          )}
        </div>
        <Row onClick={() => setWa(true)} lead={<Icon name="whatsapp" className="size-5 shrink-0 text-[#1f9d55]" />} title="Sporculara WhatsApp" />
      </RowList>
      <WaSheet open={wa} onClose={() => setWa(false)} races={races} />
    </section>
  );
}

// Fitness (Seyhun 2026-10-20: "fitness ayrı, kendi içinde düzeni"): başlık "Fitness · Bugün" (ya da en yakın gün) ve sporcu sayısı, Tümü › Fitness;
// altında o günün sporcuları: yuvarlak, ad, program · saat, sağda durum (Yaptı yeşil, Bekliyor turuncu…). En çok 3 satır; son satır
// "+N sporcu" ya da sonraki fitness günü ("Yarın 2 sporcu"). Satıra dokununca o antrenman açılır. Fitness yoksa çizilmez. fit: fitDays()
const FST = { done: ["Yaptı", "st"], missed: ["Yapmadı", "gen"], skip: ["Atladı", "gen"] };
export function FitWidget({ fit }) {
  const { members } = useData();
  const { openAdd } = useAdd();
  const today = todayStr();
  const days = [...new Set((fit || []).map((f) => f.date).filter((d) => d >= today))].sort();
  if (!days.length) return null;
  const [day, nextDay] = days;
  const name = (d) => (d === today ? "Bugün" : dayName(d, today));
  const rows = fit.filter((f) => f.date === day).sort((a, b) => (a.plan?.time || "").localeCompare(b.plan?.time || ""));
  const more = rows.slice(3);
  const later = nextDay ? fit.filter((f) => f.date === nextDay) : [];
  const photo = (f) => members.find((m) => m.uid === f.plan?.fit?.for)?.photo || "";
  return (
    <section aria-label="Fitness">
      <ListHead title={`Fitness · ${name(day)}`} count={fitWho(rows)} href="/fitness" />
      <RowList>
        {rows.slice(0, 3).map((f) => {
          const [t, tone] = FST[statusOf(f.plan || f, today)] || ["Bekliyor", "fit"];
          return (
            <Row
              key={f.id}
              onClick={() => openAdd({ edit: { kind: "plan", id: f.plan?.id || f.id } })}
              lead={<Face name={f.mine ? "Sen" : f.name} photo={f.mine ? "" : photo(f)} tone="fit" cls="size-9" />}
              title={f.mine ? "Sen" : f.name.split(" ")[0]}
              sub={[f.plan?.fit?.name || f.plan?.title || "Antrenman", f.plan?.time].filter(Boolean).join(" · ")}
              right={<Tag tone={tone}>{t}</Tag>}
              chev={false}
            />
          );
        })}
        {more.length > 0 && <Row href="/fitness" title={`+${more.length} sporcu`} />}
        {!more.length && later.length > 0 && <Row href={fitHref(nextDay, later) || "/fitness"} title={`${name(nextDay)} ${fitWho(later)}`} />}
      </RowList>
    </section>
  );
}
const fitWho = (l) => `${l.length} ${l.some((f) => !f.mine) ? "sporcu" : "antrenman"}`;
const dayName = (d, today) => {
  const t = new Date(`${today}T12:00:00`);
  t.setDate(t.getDate() + 1);
  const x = new Date(`${d}T12:00:00`);
  if (x.toDateString() === t.toDateString()) return "Yarın";
  return `${x.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "")} ${x.getDate()}`;
};

// Notlar (Seyhun: "notlar da önemli"): en çok 3 not (sabitler önce, sonra en yeniler; homeNotes), adı ve altında "ne zaman · ilk satır",
// sabit notun sağında "Sabit". Dokununca not açılır. Not ekleme kokpitin altındaki "Not" düğmesinde (HomeGrid).
// Yapışkan not kâğıdının rengi, notun rengine göre (NOTE_COLORS anahtarları; renksiz not sarı, .note-card varsayılanı)
const NOTE_PAPER = { cyan: "#bfe7ef", green: "#cfe8d6", amber: "#f6d79a", red: "#f4cdc6", blue: "#cfdcf5" };

export function NotesWidget({ notes }) {
  const { list, total } = homeNotes(notes || [], 8);
  const today = todayStr();
  // Seyhun 2026-10-23 "A · Kayan not kartları": ekranda ikişer yan yana (Seyhun: "2'şerli, genişliği daha fazla"), sağa kayar. Görünüm "B · Yapışkan not"
  // (globals.css .note-card): kâğıt renginde, başlık (2 satır), altında metnin ilk satırları (2 satır), en altta tarih. Renk NOTE_PAPER (notun rengi), sabitlenende raptiye.
  // Dokununca not sayfası (/notes/[id]).
  return (
    <section aria-label="Notlar">
      <ListHead title="Notlar" count={total} href={total > 0 ? "/notes" : null} />
      {list.length ? (
        <div className="-mx-4 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pb-1 pt-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {list.map((n) => {
            const when = noteWhen(n.updatedAt || n.createdAt, today);
            const lines = String(n.body || "").split("\n").map((x) => x.trim()).filter(Boolean);
            const title = n.title || lines.shift() || "Not";
            return (
              <Link
                key={n.id}
                href={`/notes/${n.id}`}
                data-press
                className={`note-card flex h-[8.5rem] w-[calc(50%-0.25rem)] shrink-0 snap-start flex-col p-3 text-left ${n.pinned ? "note-pin" : ""}`}
                style={NOTE_PAPER[n.color] ? { "--p": NOTE_PAPER[n.color] } : undefined}
              >
                <b className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug">{title}</b>
                {lines.length > 0 && <span className="mt-1 line-clamp-2 text-[0.8125rem] leading-snug opacity-70">{lines.join(" ")}</span>}
                {when && <small className="mt-auto truncate pr-5 text-[0.75rem] font-semibold opacity-60">{when}</small>}
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="px-1 py-2 text-[0.9375rem] text-mut">Henüz not yok</p>
      )}
    </section>
  );
}

// Mesajlar satırı (Kulüp listesinde, HomeSummary): son sohbet (okunmamış önce): "kim: son mesaj", sağda okunmamış sayısı; dokununca o sohbet.
// Sohbet yoksa null.
export function useMessagesRow() {
  const { chats = [], unreadTotal = 0 } = useChat() || {};
  const top = chats.filter((c) => c.last && !c.last.deleted).sort((a, b) => (b.unread > 0) - (a.unread > 0) || toMs(b.last?.at) - toMs(a.last?.at))[0];
  if (!top) return null;
  return <Row key="msg" href={`/messages?c=${top.id}`} title="Mesajlar" sub={`${top.title}: ${top.last.text}`} right={unreadTotal > 0 ? <span className="tone-ve tone-bar rounded-full px-2 py-px text-[0.75rem] font-bold text-white dark:text-[#111214]">{unreadTotal}</span> : null} />;
}

// Kulüp listesinin başındaki satırlar (Seyhun 2026-10-21): Yarış (süren ya da sıradaki; dokununca yarışın sayfası), Antrenman (son yoklamalı gün ve
// gelenler; dokununca o günün yoklaması), Fitness (bu haftanın antrenmanları; dokununca Fitness). HomeSummary'ye `lead` olarak verilir.
// Son antrenman kulüp verisindeki yoklamadan (loadAthletes, oturumda 3 dk saklanır); son sonuç bu cihazda tutulur, açılışta hemen görünür.
export function ClubRows({ open, fit }) {
  const { plans } = useData();
  const today = todayStr();
  const race = clubRaceRow(open, today);
  const train = useLastTraining(plans, today);
  const fw = fitWeek(fit, today);
  const who = train && (train.n ? `${train.names.slice(0, 3).join(", ")}${train.n > 3 ? ` +${train.n - 3}` : ""}` : "");
  return (
    <>
      {race && <Row href={`/athletes/races/${race.id}`} title={race.title} sub={race.sub} right={race.right} />}
      {train && <Row href={`/athletes/attendance?gun=${train.date}`} title={`Antrenman · ${train.when}`} sub={who} right={`${train.n} kişi`} />}
      <Row href="/fitness" title="Fitness" sub={fw.n ? `Bu hafta ${fw.done}/${fw.n} yapıldı` : "Bu hafta antrenman yok"} />
    </>
  );
}

function useLastTraining(plans, today) {
  const [t, setT] = useState(() => readSum().train || null);
  useEffect(() => {
    let live = true;
    loadAthletes()
      .then(({ athletes }) => {
        if (!live) return;
        const next = lastTraining(athletes, plans, today);
        saveSum("train", next);
        setT(next);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [plans, today]);
  return t;
}
