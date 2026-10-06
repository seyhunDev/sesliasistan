"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArchiveLink, Chips, DelBadge, Empty, Label, card, catStyle } from "@/components/ui/Page";
import { SwipeRow } from "@/components/ui/SwipeRow";
import { Icon } from "@/components/ui/Icon";
import { useAdd } from "@/features/add/AddProvider";
import { useDock } from "@/features/home/TabBar";
import { useMeeting } from "@/features/meeting/MeetingProvider";
import { useAuth } from "@/features/auth/AuthProvider";
import { useData } from "@/features/data/DataProvider";
import { addDate } from "@/lib/ai/digest";
import { rel, todayStr } from "@/lib/utils/format";
import { assigneesOf, unseenNotes, whoText } from "@/lib/people";
import { useWho } from "@/features/data/useWho";
import { isLogNote } from "@/lib/trainingLog";

// Arama için sadeleştirir: büyük/küçük harf, ı/i ve ş, ğ, ç, ö, ü farkını yok sayar ("iskota" = "Iskota")
const fold = (s = "") => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "");

// Notlar: aranan not hemen bulunsun. Üstte arama, altında süzgeçler (Tümü · Sabitlenen · Benim · Bana verilen · kategoriler);
// sabitlenenler kart olarak yan yana, diğerleri zamana göre gruplu; kategori rozeti ve okunmamış mesaj işareti.
export default function NotesPage() {
  const { notes: allNotes, updateRecord, removeWithUndo, myUid, nameOf } = useData();
  const live = allNotes.filter((n) => !n.archived); // arşivlenenler Arşiv sayfasında
  // Antrenman günlüğüne benzeyen notlar listede değil, ayrı kartta (eski sürümler günlüğü ayrıca not olarak da yazıyordu)
  const logNotes = live.filter(isLogNote);
  const notes = live.filter((n) => !isLogNote(n));
  const [showLog, setShowLog] = useState(false);
  const pillOf = useWho();
  const { openMeeting } = useMeeting();
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const [q, setQ] = useState("");
  const [f, setF] = useState("all"); // all | pinned | mine | given | cat:<ad>
  const by = { name: profile?.name ?? "Kullanıcı" };
  const today = todayStr();
  const days = [...Array(7)].map((_, i) => addDate(today, i - 6));
  const given = (n) => n.createdByUid && n.createdByUid !== myUid && assigneesOf(n).includes(myUid);
  const cats = [...new Set(notes.map((n) => n.cat).filter((c) => c && c !== "Genel"))];
  const passF = (n) => (f === "all" ? true : f === "pinned" ? n.pinned : f === "mine" ? n.createdByUid === myUid : f === "given" ? given(n) : n.cat === f.slice(4));
  const chips = [
    ["all", "Tümü", notes.length],
    notes.some((n) => n.pinned) && ["pinned", "Sabitlenen", notes.filter((n) => n.pinned).length],
    ["mine", "Benim", notes.filter((n) => n.createdByUid === myUid).length],
    notes.some(given) && ["given", "Bana verilen", notes.filter(given).length],
    ...cats.map((c) => [`cat:${c}`, c, notes.filter((n) => n.cat === c).length]),
  ].filter(Boolean);

  const needle = fold(q.trim());
  const list = [...notes]
    .filter((n) => passF(n) && (!needle || fold(`${n.title} ${n.body} ${n.cat || ""}`).includes(needle)))
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
              {unseenNotes(n, myUid).length > 0 && <span className="size-2 shrink-0 rounded-full bg-acc" aria-label="Yeni mesaj" />}
              {pill}
            </b>
            {n.body && n.body !== n.title && <small className="mt-0.5 line-clamp-2 block text-[0.8125rem] leading-snug text-mut">{n.body}</small>}
            <small className="mt-1 block text-[0.6875rem] text-mut">
              {n.cat && n.cat !== "Genel" && <span className={`font-semibold ${catStyle(n.cat).chip.split(" ")[1]}`}>{n.cat}{n.createdAt ? " · " : ""}</span>}
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

  useDock({ create: [["users", "Toplantı", "Sesli tutanak", () => openMeeting()]] });

  return (
    <main className="mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Notlar" sub={`${notes.length} not${notes.filter((n) => (n.createdAt || "").slice(0, 10) >= days[0]).length ? ` · bu hafta ${notes.filter((n) => (n.createdAt || "").slice(0, 10) >= days[0]).length} yeni` : ""}`}>
        <ArchiveLink type="note" />
      </PageHeader>

      {notes.length > 0 && (
        <>
          <label className={`${card} mt-2 flex h-12 items-center gap-2 !rounded-full px-4`}>
            <Icon name="search" className="size-5 text-mut" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              placeholder="Notlarda ara: başlık, içerik, kategori"
              enterKeyHint="search"
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-mut"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Aramayı temizle" className="grid size-7 place-items-center rounded-full text-mut active:bg-bg">
                <Icon name="x" className="size-4" />
              </button>
            )}
          </label>
          {chips.length > 2 && <Chips value={f} onChange={setF} options={chips} className="mt-3" />}
        </>
      )}

      {logNotes.length > 0 && (
        <section className={`${card} mt-3 overflow-hidden`}>
          <button onClick={() => setShowLog(!showLog)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-bg">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600">
              <Icon name="note" className="size-[1.125rem]" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[0.9375rem] font-semibold">{logNotes.length} not antrenman günlüğüne benziyor</b>
              <small className="block text-[0.8125rem] leading-snug text-mut">Notlar listesinde gösterilmiyor. Arşive taşıyabilirsin; arşivden geri alınır.</small>
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

      {notes.length === 0 && <Empty icon="note" title="Henüz not yok" sub="Aşağıdan söyle, yaz ya da + ile ekle. Toplantıyı da kaydedebilirsin." />}
      {notes.length > 0 && list.length === 0 && <Empty icon="search" title={q ? `“${q}” için not yok` : "Bu süzgeçte not yok"} />}

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
    </main>
  );
}
