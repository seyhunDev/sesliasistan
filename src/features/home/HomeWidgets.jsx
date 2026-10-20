"use client";

import Link from "next/link";
import { FadeImg } from "@/components/ui/FadeImg";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useChat, toMs } from "@/features/chat/ChatProvider";
import { useData } from "@/features/data/DataProvider";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { statusOf } from "@/lib/fitness/model";
import { attHref, fitHref, homeNotes, linkKey, personHref } from "@/lib/homeTiles";
import { initials, rel, todayStr } from "@/lib/utils/format";

// Ana sayfanın canlı alanları (Seyhun 2026-10-17: "kısa yolların içini doldurup güzel alanlar yapalım"; örnek 7-canli-alanlar-notlar.png).
// Her alan aynı beyaz kart (WIDGET), üstte renkli nokta + ad (WHead); kare alan ızgarada bir sütun, "col-span-2" ile tam genişlik.
// Bilgisi olmayan alan çizilmez. Bellekteki veriden (useData, useChat), ek okuma yok. Kare alanlar (yarış, aidat, fiş, hesap) HomeSummary.jsx'te.
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

// Tam genişlik: Sporcular ve Fitness tek kartta (Seyhun 2026-10-20: "sporcular ve fitness birlikte; bir sporcunun bir şeyi varsa hangi sporcu
// belirtilir, öbürleri yine durur"). Üstte fotoğraflar (en çok 7, fazlası "+N"; dokununca o sporcunun sayfası), altında en yakın fitness günü
// adlarıyla (FitRows), en altta düğmeler: Yoklama (yalnız bugün antrenman varsa, saatiyle; antrenmanın kendisi takvim listesinde), Mesaj
// (Sporcular grubu), Fitness. Düğmeler tek satırda, yazı taşmaz. Başlıkta Tümü › Sporcular. Sporcu yoksa çizilmez. fit: fitDays() (HomeFeed).
export function AthletesWidget({ att, fit }) {
  const { members, plans } = useData();
  const list = (members || []).filter((m) => m && m.name && m.status !== "left" && (m.kind === "athlete" || m.kind === "student")).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  if (!list.length) return null;
  const today = todayStr();
  const sail = plans.filter((p) => p.date === today && p.status !== "cancelled" && (p.cat || p.category) === "Antrenman").sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  const yok = att && sail.length ? attHref(today, today) : null;
  const shown = list.slice(0, 7);
  const btn = "flex h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-xl px-2 text-[0.84375rem] font-semibold";
  return (
    <div className={`${WIDGET} col-span-2 min-h-0`}>
      <WHead tone="sp" title="Sporcular" count={list.length} right={<Link href="/athletes" className="text-acc">Tümü ›</Link>} />
      <span className="mt-2.5 flex items-center">
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
      </span>
      <FitRows fit={fit} head />
      <span className={`mt-3 grid gap-2 ${yok ? "grid-cols-[auto_1fr_1fr]" : "grid-cols-2"}`}>
        {yok && (
          <Link href={yok} className={`${btn} acc-btn`}>
            Yoklama{sail[0].time ? ` · ${sail[0].time}` : ""}
          </Link>
        )}
        <Link href="/messages?c=athletes" className={`${btn} raised bg-card text-acc`}>
          Mesaj
        </Link>
        <Link href="/fitness" className={`${btn} raised bg-card text-acc`}>
          Fitness
        </Link>
      </span>
    </div>
  );
}

// Tam genişlik: Fitness (sporcular kartı görünmeyen hesaplarda; Seyhun: "aynı gün iki, üç, dört sporcu varsa nasıl gösterilecek?")
export function FitWidget({ fit }) {
  const today = todayStr();
  if (!(fit || []).some((f) => f.date >= today)) return null;
  return (
    <div className={`${WIDGET} col-span-2 min-h-0`}>
      <WHead tone="fit" title="Fitness" right={<Link href="/fitness" className="text-acc">Tümü ›</Link>} />
      <FitRows fit={fit} />
    </div>
  );
}

// Fitness satırları: bugün fitness varsa bugünün, yoksa en yakın günün sporcuları alt alta: fotoğraf, üstte ad, altında program · saat, sağda
// durum (Yaptı yeşil, Bekliyor turuncu…). En çok 3 satır, fazlası "+N sporcu"; altta sonraki fitness günü ("Yarın 2 sporcu ›"). Satıra dokununca
// o antrenman açılır. head: üstte ince çizgi ve "Bugün fitness · 2 sporcu" başlığı (sporcular kartında). Fitness yoksa çizilmez
const FST = { done: ["Yaptı", "tone-st"], missed: ["Yapmadı", "tone-gen"], skip: ["Atladı", "tone-gen"] };
function FitRows({ fit, head }) {
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
  const who = (l) => `${l.length} ${l.some((f) => !f.mine) ? "sporcu" : "antrenman"}`;
  const photo = (f) => members.find((m) => m.uid === f.plan?.fit?.for)?.photo || "";
  return (
    <div className={head ? "mt-3 border-t border-line pt-2" : "mt-1.5"}>
      <small className="block text-[0.75rem] uppercase tracking-[.02em] text-mut">
        {name(day)} fitness · {who(rows)}
      </small>
      <ul>
        {rows.slice(0, 3).map((f) => {
          const [t, tone] = FST[statusOf(f.plan || f, today)] || ["Bekliyor", "tone-fit"];
          return (
            <li key={f.id} className="border-t border-line first:border-t-0">
              <button type="button" onClick={() => openAdd({ edit: { kind: "plan", id: f.plan?.id || f.id } })} className="flex w-full items-center gap-2.5 py-2 text-left">
                <Face name={f.mine ? "Sen" : f.name} photo={f.mine ? "" : photo(f)} tone="fit" cls="size-8" />
                <span className="min-w-0 flex-1">
                  <span className="block break-words">{f.mine ? "Sen" : f.name.split(" ")[0]}</span>
                  <small className="block break-words text-[0.84375rem] text-mut">
                    {f.plan?.fit?.name || f.plan?.title || "Antrenman"}
                    {f.plan?.time && <span className="whitespace-nowrap tabular-nums"> · {f.plan.time}</span>}
                  </small>
                </span>
                <span className={`${tone} tone-chip shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.75rem] font-semibold`}>{t}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {(more.length > 0 || later.length > 0) && (
        <span className="flex items-center justify-between gap-3 text-[0.84375rem] text-mut">
          <span className="min-w-0 truncate">{more.length > 0 && `+${more.length} sporcu`}</span>
          {later.length > 0 && (
            <Link href={fitHref(nextDay, later) || "/fitness"} className="shrink-0 whitespace-nowrap">
              {name(nextDay)} {who(later)} ›
            </Link>
          )}
        </span>
      )}
    </div>
  );
}
const dayName = (d, today) => {
  const t = new Date(`${today}T12:00:00`);
  t.setDate(t.getDate() + 1);
  const x = new Date(`${d}T12:00:00`);
  if (x.toDateString() === t.toDateString()) return "Yarın";
  return `${x.toLocaleDateString("tr-TR", { weekday: "short" }).replace(".", "")} ${x.getDate()}`;
};

// Tam genişlik: Notlar (Seyhun: "notlar da önemli"). En çok 3 not (sabitler önce, sonra en yeniler; homeNotes), adı ve altında
// "Sabit / ne zaman · ilk satır". Başlıkta Tümü › ve + (yeni not). Dokununca not açılır. Not yoksa yalnız başlık ve "Not ekle".
export function NotesWidget({ notes }) {
  const { openAdd } = useAdd();
  const { list, total } = homeNotes(notes || [], 3);
  const add = (
    <button type="button" data-press aria-label="Not ekle" onClick={() => openAdd({ type: "note" })} className="grid size-7 place-items-center rounded-full bg-accbg text-acc">
      <Icon name="plus" className="size-4" />
    </button>
  );
  return (
    <div className={`${WIDGET} col-span-2 min-h-0`}>
      <WHead tone="fa" title="Notlar" count={total || ""} right={<>{total > 0 && <Link href="/notes" className="text-acc">Tümü ›</Link>}{add}</>} />
      {list.length ? (
        <ul className="mt-1">
          {list.map((n) => {
            const when = n.createdAt ? rel((n.updatedAt || n.createdAt).slice(0, 10)) : "";
            const first = String(n.body && n.body !== n.title ? n.body : "").split("\n").find((x) => x.trim()) || "";
            const line = [!n.pinned && when, first.trim()].filter(Boolean).join(" · ");
            return (
              <li key={n.id} className="border-t border-line first:border-t-0">
                <button type="button" onClick={() => openAdd({ edit: { kind: "note", id: n.id } })} className="block w-full py-2 text-left">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <b className="min-w-0 truncate font-medium">{n.title || "Not"}</b>
                    {n.pinned && <span className="shrink-0 rounded-full bg-warnbg px-1.5 py-px text-[0.6875rem] font-semibold text-warn">Sabit</span>}
                  </span>
                  {line && <small className="block truncate text-[0.84375rem] text-mut">{line}</small>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <small className="mt-2 block text-[0.875rem] text-mut">Henüz not yok</small>
      )}
    </div>
  );
}

// Yan yana iki kare: Mesajlar (son sohbet: kim, son mesaj; okunmamış sayısı; dokununca o sohbet) ve Toplantı (dokununca kayıt başlar).
// Biri yoksa diğeri tam genişlik. meeting: toplantı düğmesi gösterilsin mi (sporcu tarafında yok).
export function TalkWidgets({ meeting }) {
  const { chats = [], unreadTotal = 0 } = useChat() || {};
  const { openMeeting } = useMeeting();
  const top = chats.filter((c) => c.last && !c.last.deleted).sort((a, b) => (b.unread > 0) - (a.unread > 0) || toMs(b.last?.at) - toMs(a.last?.at))[0];
  const wide = !(top && meeting) ? "col-span-2 min-h-0" : "";
  return (
    <>
      {top && (
        <Link href={`/messages?c=${top.id}`} className={`${WIDGET} ${wide}`}>
          <WHead tone="ve" title="Mesajlar" />
          <span className="mt-2.5 flex min-w-0 items-center gap-2">
            <Face name={top.title} tone="ve" cls="size-9" />
            <span className="min-w-0">
              <b className="block truncate text-[0.875rem] font-semibold">{top.title}</b>
              <small className="block truncate text-[0.8125rem] text-mut">{top.last.text}</small>
            </span>
          </span>
          <span className="mt-auto flex items-center justify-between pt-2 text-[0.8125rem] text-mut">
            {unreadTotal > 0 ? `${unreadTotal} okunmamış` : "Hepsi okundu"}
            {unreadTotal > 0 && <span className="tone-ve tone-bar rounded-full px-2 py-px text-[0.75rem] font-bold text-white dark:text-[#111214]">{unreadTotal}</span>}
          </span>
        </Link>
      )}
      {meeting && (
        <button type="button" onClick={openMeeting} className={`${WIDGET} ${wide}`}>
          <WHead tone="gen" title="Toplantı" />
          <span className="mt-auto flex items-center gap-2.5 pt-2">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-rose-500">
              <span className="size-3 rounded-full bg-white" />
            </span>
            <b className="text-[0.9375rem] font-semibold">Kaydı başlat</b>
          </span>
        </button>
      )}
    </>
  );
}

// En altta kalan sayfalar küçük yuvarlak düğmeler (Planlar, Antrenman, Envanter…): canlı alanı olanlar (hide: href ya da id) çıkarılır.
// groups: homeActions() (homeTiles.js); Toplantı düğmesi onClick ile.
export function PageChips({ groups, hide = [] }) {
  const items = groups.flatMap((g) => g.items).filter((a) => !hide.includes(linkKey(a)));
  if (!items.length) return null;
  const cls = "inline-flex items-center rounded-full bg-card px-3.5 py-2 text-[0.875rem] text-fg";
  return (
    <nav aria-label="Diğer sayfalar" className="flex flex-wrap gap-2">
      {items.map((a) =>
        a.href ? (
          <Link key={linkKey(a)} href={a.href} data-press className={cls}>
            {a.label}
          </Link>
        ) : (
          <button key={linkKey(a)} type="button" data-press onClick={a.onClick} className={cls}>
            {a.label}
          </button>
        ),
      )}
    </nav>
  );
}
