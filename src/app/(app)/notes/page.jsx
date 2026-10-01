"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArchiveLink, DelBadge, Empty, Hero, HeroLabel, Label, card } from "@/components/ui/Page";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { AddBar } from "@/features/add/AddBar";
import { BarButton } from "@/components/ui/VoiceTextBar";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { addDate } from "@/lib/ai/digest";
import { weekdayShort } from "@/lib/agenda";
import { rel, todayStr } from "@/lib/utils/format";
import { whoText } from "@/lib/people";
import { useWho } from "@/features/data/useWho";

// Arama için sadeleştirir: büyük/küçük harf, ı/i ve ş, ğ, ç, ö, ü farkını yok sayar ("iskota" = "Iskota")
const fold = (s = "") => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "");

// Notlar: üstte son 7 günün not çubukları, arama; sabitlenenler kart olarak yan yana, diğerleri zamana göre gruplu.
export default function NotesPage() {
  const { notes: allNotes, updateRecord, removeWithUndo, myUid, nameOf } = useData();
  const notes = allNotes.filter((n) => !n.archived); // arşivlenenler Arşiv sayfasında
  const pillOf = useWho();
  const { openMeeting } = useMeeting();
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const [q, setQ] = useState("");
  const by = { name: profile?.name ?? "Kullanıcı" };
  const today = todayStr();
  const days = [...Array(7)].map((_, i) => addDate(today, i - 6));
  const perDay = days.map((d) => notes.filter((n) => (n.createdAt || "").slice(0, 10) === d).length);
  const max = Math.max(1, ...perDay);
  const weekNew = perDay.reduce((a, b) => a + b, 0);

  const needle = fold(q.trim());
  const list = [...notes]
    .filter((n) => !needle || fold(`${n.title} ${n.body}`).includes(needle))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const pinned = list.filter((n) => n.pinned);
  const rest = list.filter((n) => !n.pinned);
  const bucket = (n) => {
    const d = (n.createdAt || "").slice(0, 10);
    return d === today ? "BUGÜN" : d === addDate(today, -1) ? "DÜN" : d >= days[0] ? "BU HAFTA" : "DAHA ÖNCE";
  };
  const groups = ["BUGÜN", "DÜN", "BU HAFTA", "DAHA ÖNCE"].map((k) => [k, rest.filter((n) => bucket(n) === k)]).filter(([, v]) => v.length);

  const acts = (n) => [
    { label: n.pinned ? "Bırak" : "Sabitle", icon: "star", tone: "neutral", onAction: () => updateRecord("note", n.id, { pinned: !n.pinned }, by) },
    { label: "Arşivle", icon: "archive", tone: "neutral", onAction: () => updateRecord("note", n.id, { archived: true, archivedAt: new Date().toISOString(), pinned: false }, by) },
    { label: "Sil", icon: "trash", tone: "danger", onAction: () => removeWithUndo("note", n.id) },
  ];
  const open = (n) => openAdd({ edit: { kind: "note", id: n.id } });

  const row = (n) => {
    const pill = pillOf(n, "ml-auto");
    const who = pill ? "" : whoText(n, myUid, nameOf);
    return (
      <SwipeRow key={n.id} actions={acts(n)}>
        <button onClick={() => open(n)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition active:bg-bg">
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-acc/10 text-acc">
            <Icon name="note" className="size-[1.125rem]" />
          </span>
          <span className="min-w-0 flex-1">
            <b className="flex items-center gap-1.5 text-[0.9375rem] font-semibold">
              <span className="truncate">{n.title}</span>
              {pill}
            </b>
            {n.body && n.body !== n.title && <small className="mt-0.5 line-clamp-2 block text-[0.8125rem] leading-snug text-mut">{n.body}</small>}
            <small className="mt-1 block text-[0.6875rem] text-mut">
              {n.createdAt && rel(n.createdAt.slice(0, 10))}
              {who && <span className="text-acc"> · {who}</span>}
            </small>
            {n.deleteReq && (
              <span className="mt-1 block">
                <DelBadge rec={n} />
              </span>
            )}
          </span>
        </button>
      </SwipeRow>
    );
  };

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Notlar" sub={`${notes.length} not`}>
        <ArchiveLink type="note" />
      </PageHeader>

      <Hero className="mt-2">
        <div className="flex items-end gap-4">
          <span className="min-w-0 flex-1">
            <HeroLabel>SON 7 GÜN</HeroLabel>
            <b className="mt-1.5 block text-[2.25rem] font-semibold leading-none tracking-tight tabular-nums">{weekNew}</b>
            <small className="mt-1 block text-[0.75rem] text-white/75">yeni not · {notes.filter((n) => n.pinned).length} sabit</small>
          </span>
          <span className="flex h-16 items-end gap-1.5" aria-hidden="true">
            {perDay.map((v, i) => (
              <span key={days[i]} className="flex w-5 flex-col items-center gap-1">
                <i className={`w-full rounded-md ${i === 6 ? "bg-white" : "bg-white/35"}`} style={{ height: `${Math.max(4, (v / max) * 40)}px` }} />
                <small className="text-[0.5625rem] text-white/60">{weekdayShort(days[i]).slice(0, 2)}</small>
              </span>
            ))}
          </span>
        </div>
      </Hero>

      {notes.length > 0 && (
        <label className={`${card} mt-4 flex h-11 items-center gap-2 !rounded-full px-4`}>
          <Icon name="search" className="size-[1.125rem] text-mut" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="Notlarda ara"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="Aramayı temizle" className="grid size-7 place-items-center rounded-full text-mut active:bg-bg">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </label>
      )}

      {notes.length === 0 && <Empty icon="note" title="Henüz not yok" sub="Aşağıdan söyle, yaz ya da + ile ekle. Toplantıyı da kaydedebilirsin." />}
      {notes.length > 0 && list.length === 0 && <Empty icon="search" title={`“${q}” için not yok`} />}

      {pinned.length > 0 && (
        <section>
          <Label right={pinned.length}>SABİTLENENLER</Label>
          <div className="grid grid-cols-2 gap-2.5">
            {pinned.map((n) => (
              <div key={n.id} className={`${card} relative flex min-h-[7.5rem] flex-col`}>
                <button onClick={() => open(n)} className="flex flex-1 flex-col p-3.5 pr-10 text-left active:opacity-70">
                  <b className="line-clamp-2 text-[0.875rem] font-semibold leading-snug">{n.title}</b>
                  {n.body && n.body !== n.title && <small className="mt-1 line-clamp-3 text-[0.75rem] leading-snug text-mut">{n.body}</small>}
                  <small className="mt-auto pt-2 text-[0.6875rem] text-mut">{n.createdAt && rel(n.createdAt.slice(0, 10))}</small>
                </button>
                <button
                  type="button"
                  onClick={() => updateRecord("note", n.id, { pinned: false }, by)}
                  aria-label="Sabitlemeyi kaldır"
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-full text-amber-500 active:bg-bg"
                >
                  <Icon name="star" className="size-4 fill-current" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {groups.map(([k, items]) => (
        <section key={k}>
          <Label right={items.length}>{k}</Label>
          <div className={`${card} divide-y divide-line overflow-hidden`}>{items.map(row)}</div>
        </section>
      ))}

      {notes.length > 0 && <p className="mt-8 text-center text-[0.75rem] text-mut">İpucu: sabitlemek, arşivlemek ya da silmek için notu sola kaydır.</p>}
      <AddBar type="note" extra={<BarButton icon="users" label="Toplantı kaydet" onClick={() => openMeeting()} />} />
    </main>
  );
}
