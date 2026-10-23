"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/ui/BackButton";
import { ListHead } from "@/components/ui/Row";
import { DelBadge, Empty } from "@/components/ui/Page";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useDock } from "@/features/home/TabBar";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { todayStr } from "@/lib/utils/format";
import { WordCard } from "@/features/words/WordCard";
import { assigneesOf, lockedFor, whoText } from "@/lib/people";
import { useWho } from "@/features/data/useWho";
import { isLogNote } from "@/lib/trainingLog";
import { NOTE_GONE, noteColor, noteDonePatch, noteReopenPatch, noteWhen } from "@/lib/noteState";
import { useToast } from "@/components/ui/ToastProvider";

// Arama için sadeleştirir: büyük/küçük harf, ı/i ve ş, ğ, ç, ö, ü farkını yok sayar ("iskota" = "Iskota")
const fold = (s = "") => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "");

// Notlar (yeni tasarım, Seyhun 2026-10-23): lacivert üstte ad, "+ Not", arama ve Tümü · Sabitli · Bana verilen; altta Sabitli ve Notlar listeleri.
// Satır: solda notun rengi, başlık, altında ilk satır, sağda kısa tarih. Dokununca not tam sayfa açılır (/notes/[id]); sola kaydırınca Yapıldı/Sabitle/Sil.
export default function NotesPage() {
  const { notes: allNotes, updateRecord, removeWithUndo, myUid, nameOf, isStaff } = useData();
  const router = useRouter();
  // Not sayfasında Tamamla denen not bir an listede kalır ve kayarak çıkar (NOTE_GONE)
  const [gone, setGone] = useState(() => {
    try {
      const id = sessionStorage.getItem(NOTE_GONE);
      sessionStorage.removeItem(NOTE_GONE);
      return id;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (!gone) return;
    const t = setTimeout(() => setGone(null), 700);
    return () => clearTimeout(t);
  }, [gone]);
  const live = allNotes.filter((n) => !n.archived || n.id === gone); // arşivlenenler Arşiv sayfasında
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
  const today = todayStr();
  const given = (n) => n.createdByUid && n.createdByUid !== myUid && assigneesOf(n).includes(myUid);
  const nAll = notes.filter((n) => n.id !== gone).length;
  const nPinned = notes.filter((n) => n.pinned).length;
  const nGiven = notes.filter(given).length;
  const chips = [["all", "Tümü", nAll], nPinned > 0 && ["pinned", "Sabitli", nPinned], nGiven > 0 && ["given", "Bana verilen", nGiven]].filter(Boolean);
  const passF = (n) => (f === "pinned" ? n.pinned : f === "given" ? given(n) : true);

  const needle = fold(q.trim());
  const list = [...notes]
    .filter((n) => passF(n) && (!needle || fold(`${n.title} ${n.body} ${n.cat || ""}`).includes(needle)))
    .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
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
  // Çalışana başkasının verdiği not salt okunur: eski ekranda (tamamladım) açılır
  const open = (n) => (lockedFor(n, myUid, isStaff) ? openAdd({ edit: { kind: "note", id: n.id } }) : router.push(`/notes/${n.id}`));

  const row = (n) => {
    const pill = pillOf(n);
    const who = pill ? "" : whoText(n, myUid, nameOf);
    const preview = [who, n.body && n.body !== n.title ? n.body.replace(/\s+/g, " ") : ""].filter(Boolean).join(" · ");
    const inner = (
        <button onClick={() => open(n)} data-press="row" className="flex min-h-[3.5rem] w-full items-center gap-3 bg-card px-3.5 py-2.5 text-left">
          <span className="w-[3px] self-stretch rounded-full" style={{ background: noteColor(n) }} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <b className={`block truncate text-[0.9375rem] font-semibold ${n.id === gone ? "text-mut line-through" : ""}`}>{n.title || "Başlıksız"}</b>
            {preview && <small className="block truncate text-[0.8125rem] text-mut">{preview}</small>}
            {n.deleteReq && (
              <span className="mt-1 block">
                <DelBadge rec={n} />
              </span>
            )}
          </span>
          {pill}
          <span className="shrink-0 text-[0.8125rem] font-semibold text-mut">{noteWhen(n.updatedAt || n.createdAt, today)}</span>
        </button>
    );
    if (n.id === gone)
      return (
        <div key={n.id} className="note-out pointer-events-none">
          {inner}
        </div>
      );
    return (
      <SwipeRow key={n.id} actions={acts(n)}>
        {inner}
      </SwipeRow>
    );
  };
  const section = (title, items) =>
    items.length > 0 && (
      <section>
        <ListHead title={title} count={items.length} />
        <div className="overflow-hidden rounded-[1.25rem] border border-line bg-card [&>*+*]:border-t [&>*+*]:border-line">{items.map(row)}</div>
      </section>
    );

  useDock({ create: [["users", "Toplantı", "Sesli tutanak", () => openMeeting()]] });
  const pill0 = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.8125rem] font-semibold";

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Notlar">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Notlar</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{nAll ? `${nAll} not` : "Not yok"}</p>
          </div>
          <Link href="/notes/new" data-press className="raised act-main flex h-9 shrink-0 items-center gap-1 rounded-xl border px-3.5 text-[0.875rem] font-semibold">
            <Icon name="plus" className="size-4" />
            Not
          </Link>
        </header>

        {notes.length > 0 && (
          <>
            <label className="ck-glass mt-4 flex h-11 items-center gap-2 rounded-2xl px-3.5">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                type="search"
                placeholder="Ara"
                enterKeyHint="search"
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/50"
              />
              {q && (
                <button onClick={() => setQ("")} aria-label="Aramayı temizle" data-press className="grid size-7 place-items-center rounded-full text-white/70">
                  <Icon name="x" className="size-4" />
                </button>
              )}
            </label>
            {chips.length > 1 && (
              <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
                {chips.map(([k, l, c]) => (
                  <button key={k} type="button" onClick={() => setF(k)} aria-pressed={f === k} data-press className={`${pill0} ${f === k ? "border-white bg-white text-[#11203a]" : "ck-glass text-white"}`}>
                    {l}
                    <span className="ml-1.5 tabular-nums opacity-70">{c}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <div className="relative -mx-5 -mt-6 space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {logNotes.length > 0 && (
          <section className="overflow-hidden rounded-[1.25rem] border border-line bg-card">
            <button onClick={() => setShowLog(!showLog)} data-press="row" className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[0.8125rem]">
              <span className="min-w-0 flex-1 truncate text-mut">
                <b className="font-semibold text-fg">{logNotes.length} not</b> antrenman günlüğüne benziyor
              </span>
              <Icon name="chev" className={`size-4 shrink-0 text-mut transition ${showLog ? "rotate-90" : ""}`} />
            </button>
            {showLog && (
              <>
                <ul className="divide-y divide-line border-t border-line">
                  {logNotes.map((n) => (
                    <li key={n.id} className="flex items-start gap-2 px-3.5 py-2.5">
                      <button onClick={() => open(n)} data-press="row" className="-mx-1 min-w-0 flex-1 rounded-lg px-1 text-left">
                        <b className="block truncate text-[0.875rem] font-semibold">{n.title}</b>
                        {n.body && n.body !== n.title && <small className="line-clamp-2 block text-[0.75rem] leading-snug text-mut">{n.body}</small>}
                        {n.createdAt && <small className="block text-[0.6875rem] text-mut">{noteWhen(n.createdAt, today)}</small>}
                      </button>
                      <button onClick={() => updateRecord("note", n.id, { keepNote: true }, by)} data-press className="btn btn-text btn-sm shrink-0">
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
                  className="w-full border-t border-line px-4 py-3 text-[0.875rem] font-semibold text-acc active:bg-bg"
                >
                  Hepsini arşive taşı
                </button>
              </>
            )}
          </section>
        )}

        {notes.length === 0 && <Empty icon="note" title="Henüz not yok" />}
        {notes.length > 0 && list.length === 0 && <Empty icon="search" title={q ? `“${q}” için not yok` : "Burada not yok"} />}

        {section("Sabitli", pinned)}
        {section("Notlar", rest)}

        <Link href="/archive?t=note" className="block text-center text-[0.875rem] font-semibold text-acc active:opacity-70">
          Arşiv ›
        </Link>

        <WordCard />
      </div>
    </main>
  );
}
