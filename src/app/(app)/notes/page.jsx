"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArchiveLink, DelBadge, Empty, Label, Seg, card, catStyle } from "@/components/ui/Page";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useDock } from "@/features/home/TabBar";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { rel } from "@/lib/utils/format";
import { assigneesOf, unseenNotes, whoText } from "@/lib/people";
import { useWho } from "@/features/data/useWho";
import { isLogNote } from "@/lib/trainingLog";
import { noteDonePatch, noteReopenPatch } from "@/lib/noteState";
import { useToast } from "@/components/ui/ToastProvider";

// Arama için sadeleştirir: büyük/küçük harf, ı/i ve ş, ğ, ç, ö, ü farkını yok sayar ("iskota" = "Iskota")
const fold = (s = "") => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "");

// Notlar: sade tek liste (Seyhun'un seçtiği "Öneri B", 2026-10-08). Üstte arama ve tek seçici (Tümü · Sabitli · Bana verilen),
// altında SABİTLİ ve SON NOTLAR. Her satırda solda kategori rengi, başlık, altında tarih + ilk satır; sola kaydırınca Yapıldı/Sabitle/Sil.
export default function NotesPage() {
  const { notes: allNotes, updateRecord, removeWithUndo, myUid, nameOf } = useData();
  const live = allNotes.filter((n) => !n.archived); // arşivlenenler Arşiv sayfasında
  // Antrenman günlüğüne benzeyen notlar listede değil, ayrı satırda (eski sürümler günlüğü ayrıca not olarak da yazıyordu)
  const logNotes = live.filter(isLogNote);
  const notes = live.filter((n) => !isLogNote(n));
  const [showLog, setShowLog] = useState(false);
  const pillOf = useWho();
  const { openMeeting } = useMeeting();
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [f, setF] = useState("all"); // all | pinned | given
  const by = { name: profile?.name ?? "Kullanıcı" };
  const given = (n) => n.createdByUid && n.createdByUid !== myUid && assigneesOf(n).includes(myUid);
  const nPinned = notes.filter((n) => n.pinned).length;
  const nGiven = notes.filter(given).length;
  const segs = [["all", "Tümü", notes.length], ["pinned", "Sabitli", nPinned], nGiven > 0 && ["given", "Bana verilen", nGiven]].filter(Boolean);
  const passF = (n) => (f === "pinned" ? n.pinned : f === "given" ? given(n) : true);

  const needle = fold(q.trim());
  const list = [...notes]
    .filter((n) => passF(n) && (!needle || fold(`${n.title} ${n.body} ${n.cat || ""}`).includes(needle)))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const pinned = list.filter((n) => n.pinned);
  const rest = list.filter((n) => !n.pinned);

  // İşi biten not: "Yapıldı" denir, Arşiv'e gider (silinmez); hemen "Geri al" da var
  const markDone = (n) => {
    updateRecord("note", n.id, noteDonePatch(), by);
    navigator.vibrate?.(10);
    toast("Yapıldı, Arşiv'e kaldırıldı", { action: { label: "Geri al", onClick: () => updateRecord("note", n.id, noteReopenPatch(), by) } });
  };
  const acts = (n) => [
    { label: "Yapıldı", icon: "check", tone: "neutral", onAction: () => markDone(n) },
    { label: n.pinned ? "Bırak" : "Sabitle", icon: "star", tone: "neutral", onAction: () => updateRecord("note", n.id, { pinned: !n.pinned }, by) },
    { label: "Sil", icon: "trash", tone: "danger", onAction: () => removeWithUndo("note", n.id) },
  ];
  const open = (n) => openAdd({ edit: { kind: "note", id: n.id } });

  const row = (n) => {
    const pill = pillOf(n);
    const who = pill ? "" : whoText(n, myUid, nameOf);
    const hasCat = n.cat && n.cat !== "Genel";
    const preview = n.body && n.body !== n.title ? n.body.replace(/\s+/g, " ") : hasCat ? n.cat : "";
    return (
      <SwipeRow key={n.id} actions={acts(n)}>
        <button onClick={() => open(n)} className="flex w-full items-stretch gap-3 px-4 py-3 text-left transition active:bg-bg">
          <span className={`w-1 shrink-0 rounded-full ${hasCat ? catStyle(n.cat).bar : "bg-line"}`} aria-hidden />
          <span className="min-w-0 flex-1">
            <b className="flex items-center gap-1.5 text-[0.9375rem] font-semibold">
              <span className="truncate">{n.title}</span>
              <span className="ml-auto flex shrink-0 items-center gap-1.5">
                {pill}
                {unseenNotes(n, myUid).length > 0 && <span className="size-2 rounded-full bg-acc" aria-label="Yeni mesaj" />}
                {n.pinned && <Icon name="star" className="size-3.5 fill-current text-amber-500" />}
              </span>
            </b>
            <small className="mt-0.5 block truncate text-[0.8125rem] text-mut">
              {n.createdAt && <span className="mr-1.5 font-medium text-fg">{rel(n.createdAt.slice(0, 10))}</span>}
              {who && <span className="mr-1.5 text-acc">{who}</span>}
              {preview}
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
  const section = (title, items) =>
    items.length > 0 && (
      <section>
        <Label right={items.length}>{title}</Label>
        <div className={`${card} divide-y divide-line overflow-hidden`}>{items.map(row)}</div>
      </section>
    );

  useDock({ create: [["users", "Toplantı", "Sesli tutanak", () => openMeeting()]] });

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Notlar" sub={notes.length ? `${notes.length} not` : ""}>
        <ArchiveLink type="note" />
        <button onClick={() => openAdd({ type: "note" })} className="flex h-10 items-center gap-1.5 rounded-full bg-acc px-4 text-[0.875rem] font-semibold text-white active:scale-95">
          <Icon name="plus" className="size-4" />
          Yeni not
        </button>
      </PageHeader>

      {notes.length > 0 && (
        <>
          <label className="mt-2 flex h-11 items-center gap-2 rounded-xl bg-line/60 px-3">
            <Icon name="search" className="size-[1.125rem] text-mut" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="Ara"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-mut"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Aramayı temizle" className="grid size-7 place-items-center rounded-full text-mut active:bg-bg">
                <Icon name="x" className="size-4" />
              </button>
            )}
          </label>
          {nPinned + nGiven > 0 && <Seg value={f} onChange={setF} options={segs} className="mt-3" />}
        </>
      )}

      {logNotes.length > 0 && (
        <section className={`${card} mt-3 overflow-hidden`}>
          <button onClick={() => setShowLog(!showLog)} className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[0.8125rem] active:bg-bg">
            <Icon name="note" className="size-4 shrink-0 text-amber-600" />
            <span className="min-w-0 flex-1 truncate text-mut">
              <b className="font-semibold text-fg">{logNotes.length} not</b> antrenman günlüğüne benziyor, listede yok
            </span>
            <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${showLog ? "rotate-90" : ""}`} />
          </button>
          {showLog && (
            <>
              <ul className="divide-y divide-line border-t border-line">
                {logNotes.map((n) => (
                  <li key={n.id} className="flex items-start gap-2 px-4 py-2.5">
                    <button onClick={() => open(n)} className="min-w-0 flex-1 text-left active:opacity-70">
                      <b className="block truncate text-[0.875rem] font-semibold">{n.title}</b>
                      {n.body && n.body !== n.title && <small className="line-clamp-2 block text-[0.75rem] leading-snug text-mut">{n.body}</small>}
                      {n.createdAt && <small className="block text-[0.6875rem] text-mut">{rel(n.createdAt.slice(0, 10))}</small>}
                    </button>
                    <button onClick={() => updateRecord("note", n.id, { keepNote: true }, by)} className="shrink-0 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold text-acc ring-1 ring-line active:bg-bg">
                      Not kalsın
                    </button>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  const at = new Date().toISOString();
                  for (const n of logNotes) updateRecord("note", n.id, { archived: true, archivedAt: at, archivedWhy: "training", pinned: false }, by);
                }}
                className="flex w-full items-center justify-center gap-2 border-t border-line px-4 py-3 text-[0.875rem] font-semibold text-acc active:bg-bg"
              >
                <Icon name="archive" className="size-4" />
                Hepsini arşive taşı
              </button>
            </>
          )}
        </section>
      )}

      {notes.length === 0 && <Empty icon="note" title="Henüz not yok" sub="Yeni not'a dokun ya da asistana söyle. Toplantıyı da kaydedebilirsin." />}
      {notes.length > 0 && list.length === 0 && <Empty icon="search" title={q ? `“${q}” için not yok` : "Burada not yok"} />}

      {section("SABİTLİ", pinned)}
      {section(pinned.length ? "SON NOTLAR" : "NOTLAR", rest)}
    </main>
  );
}
