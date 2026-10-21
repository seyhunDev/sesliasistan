"use client";

import Link from "next/link";
import { useState } from "react";
import { WaSheet } from "./WaSheet";
import { FadeImg } from "@/components/ui/FadeImg";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useChat, toMs } from "@/features/chat/ChatProvider";
import { useData } from "@/features/data/DataProvider";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { statusOf } from "@/lib/fitness/model";
import { fitHref, homeNotes, linkKey, personHref } from "@/lib/homeTiles";
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

// Kartların ortak dili (Seyhun 2026-10-20: "bir tasarım dilimiz olmalı; butonların yeri"): başlıkta solda nokta + ad + sayı, sağda yalnız
// "Tümü ›" (o sayfa); kartın işleri en altta aynı boyda düğmeler (Actions: h-10, yuvarlak köşe, adı açık: "Not ekle", "Sporculara mesaj").
// Ana iş (Yoklama) dolu mor, diğerleri kenarlıklı. Her kart yalnız kendi işini yapar.
const BTN = "flex h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-xl px-2 text-[0.84375rem] font-semibold";
const Actions = ({ children }) => <span className="mt-3 flex gap-2 [&>*]:flex-1">{children}</span>;
function Act({ href, onClick, main, ok, children }) {
  const cls = `${BTN} ${main ? "acc-btn" : `raised bg-card ${ok ? "text-[var(--ok)]" : "text-acc"}`}`;
  return href ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" data-press onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
const More = ({ href }) => (
  <Link href={href} className="text-acc">
    Tümü ›
  </Link>
);

// Tam genişlik: Sporcular (Seyhun 2026-10-20: "sporcuları ayrı, fitness ayrı; yoklamanın fitness'la, mesajın tek sporcuyla ne alakası var").
// Fotoğraflar yan yana (en çok 7, fazlası "+N"; dokununca o sporcunun sayfası). Altta WhatsApp (hazır kalıplarla, WaSheet);
// Yoklama ve Sporculara mesaj 2026-10-21'den beri kokpitin altındaki iş düğmelerinde (HomeGrid).
// Sporcu yoksa çizilmez. races: useRaceHome().open (kalıplarda sıradaki yarış)
export function AthletesWidget({ races }) {
  const [wa, setWa] = useState(false);
  const { members } = useData();
  const list = (members || []).filter((m) => m && m.name && m.status !== "left" && (m.kind === "athlete" || m.kind === "student")).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  if (!list.length) return null;
  const shown = list.slice(0, 7);
  return (
    <div className={`${WIDGET} col-span-2 min-h-0`}>
      <WHead tone="sp" title="Sporcular" count={list.length} right={<More href="/athletes" />} />
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
      {/* Yoklama ve Sporculara mesaj kokpitin altındaki düğmelerde (HomeGrid); burada yalnız WhatsApp (hazır kalıplarla) */}
      <Actions>
        <Act onClick={() => setWa(true)}>
          <Icon name="whatsapp" className="mr-1.5 size-4 shrink-0 text-[#1f9d55]" />
          WhatsApp
        </Act>
      </Actions>
      <WaSheet open={wa} onClose={() => setWa(false)} races={races} />
    </div>
  );
}

// Tam genişlik: Fitness, kendi kartı (Seyhun 2026-10-20: "fitness ayrı, kendi içinde düzeni, bilgilendirmesi olmalı"). Başlık "Fitness · Bugün"
// (ya da en yakın gün) ve sporcu sayısı, sağda Tümü › Fitness; altında o günün sporcuları (FitRows). Fitness yoksa çizilmez. fit: fitDays()
export function FitWidget({ fit }) {
  const today = todayStr();
  const days = [...new Set((fit || []).map((f) => f.date).filter((d) => d >= today))].sort();
  if (!days.length) return null;
  const rows = fit.filter((f) => f.date === days[0]);
  return (
    <div className={`${WIDGET} col-span-2 min-h-0`}>
      <WHead tone="fit" title={`Fitness · ${days[0] === today ? "Bugün" : dayName(days[0], today)}`} count={fitWho(rows)} right={<More href="/fitness" />} />
      <FitRows fit={fit} day={days[0]} nextDay={days[1]} />
    </div>
  );
}
const fitWho = (l) => `${l.length} ${l.some((f) => !f.mine) ? "sporcu" : "antrenman"}`;

// Fitness satırları: o günün sporcuları alt alta: fotoğraf, üstte ad, altında program · saat, sağda durum (Yaptı yeşil, Bekliyor turuncu…).
// En çok 3 satır, fazlası "+N sporcu"; altta sonraki fitness günü ("Yarın 2 sporcu ›"). Satıra dokununca o antrenman açılır
const FST = { done: ["Yaptı", "tone-st"], missed: ["Yapmadı", "tone-gen"], skip: ["Atladı", "tone-gen"] };
function FitRows({ fit, day, nextDay }) {
  const { members } = useData();
  const { openAdd } = useAdd();
  const today = todayStr();
  const name = (d) => (d === today ? "Bugün" : dayName(d, today));
  const rows = fit.filter((f) => f.date === day).sort((a, b) => (a.plan?.time || "").localeCompare(b.plan?.time || ""));
  const more = rows.slice(3);
  const later = nextDay ? fit.filter((f) => f.date === nextDay) : [];
  const photo = (f) => members.find((m) => m.uid === f.plan?.fit?.for)?.photo || "";
  return (
    <div className="mt-1.5">
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
              {name(nextDay)} {fitWho(later)} ›
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
// "Sabit / ne zaman · ilk satır". Başlıkta Tümü ›. Dokununca not açılır. Not ekleme kokpitin altındaki "Not" düğmesinde (HomeGrid; aynı iş iki yerde yok).
export function NotesWidget({ notes }) {
  const { openAdd } = useAdd();
  const { list, total } = homeNotes(notes || [], 3);
  return (
    <div className={`${WIDGET} col-span-2 min-h-0`}>
      <WHead tone="fa" title="Notlar" count={total || ""} right={total > 0 && <More href="/notes" />} />
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
