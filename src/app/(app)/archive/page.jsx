"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { planState } from "@/lib/agenda";
import { assigneesOf } from "@/lib/people";

const KIND = { plan: "Plan", task: "Görev", note: "Not" };
const ICON = { plan: "cal", task: "task", note: "note" };
const fold = (s = "") => s.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").normalize("NFD").replace(/\p{M}/gu, "");
const fmt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function ArchivePage() {
  return (
    <Suspense fallback={null}>
      <Archive />
    </Suspense>
  );
}

// Arşiv: tamamlanan görevler, geçmiş planlar ve arşivlenen notlar tek tabloda. Hiçbir kayıt silinmez;
// yalnızca ana listelerden kalkar. Tür süzgeci, arama, Excel'e (CSV) aktarma; satıra dokun → kayıt açılır.
function Archive() {
  const initial = useSearchParams().get("t") || "all";
  const { plans, tasks, notes, nameOf, toggleTask, updateRecord, myUid } = useData();
  const { profile } = useAuth();
  const { openAdd } = useAdd();
  const now = useNow();
  const [type, setType] = useState(["plan", "task", "note"].includes(initial) ? initial : "all");
  const [q, setQ] = useState("");
  const by = { name: profile?.name ?? "Kullanıcı" };
  const who = (u) => (!u ? "" : u === myUid ? "Sen" : nameOf(u) || "—");
  const people = (r) => assigneesOf(r).map(who).filter(Boolean).join(", ");

  const rows = [
    ...plans
      .filter((p) => planState(p, now) === "past")
      .map((p) => ({ kind: "plan", r: p, date: `${p.endDate || p.date}${p.time ? `T${p.time}` : ""}`, when: `${fmt(p.date)}${p.time ? ` ${p.time}` : ""}`, status: "Geçti", detail: p.place || "" })),
    ...tasks
      .filter((t) => t.done)
      .map((t) => {
        const doers = Object.keys(t.doneBy || {}).map(who).filter(Boolean);
        return { kind: "task", r: t, date: t.doneAt || t.due || t.createdAt || "", when: fmt(t.doneAt || t.due), status: `Yapıldı${doers.length ? ` · ${doers.join(", ")}` : ""}`, detail: t.due ? `Son gün ${fmt(t.due)}` : "" };
      }),
    ...notes
      .filter((n) => n.archived)
      .map((n) => ({ kind: "note", r: n, date: n.archivedAt || n.createdAt || "", when: fmt(n.archivedAt || n.createdAt), status: "Arşivlendi", detail: n.body && n.body !== n.title ? n.body : "" })),
  ]
    .map((x) => ({ ...x, creator: who(x.r.createdByUid), assignees: people(x.r) }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const needle = fold(q.trim());
  const shown = rows.filter((x) => (type === "all" || x.kind === type) && (!needle || fold(`${x.r.title} ${x.detail} ${x.creator} ${x.assignees}`).includes(needle)));
  const count = (k) => rows.filter((x) => x.kind === k).length;

  // Excel'e aktar: Türkçe Excel noktalı virgül ayırıcı ve UTF-8 BOM ister
  function exportCsv() {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""').replace(/\s+/g, " ")}"`;
    const head = ["Tür", "Başlık", "Tarih", "Ekleyen", "Sorumlu", "Durum", "Ayrıntı"];
    const lines = [head, ...shown.map((x) => [KIND[x.kind], x.r.title, x.when, x.creator, x.assignees, x.status, x.detail])].map((l) => l.map(esc).join(";"));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `arsiv-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <main className="mx-auto max-w-[60rem] px-5 pb-[calc(3rem+env(safe-area-inset-bottom))]">
      <PageHeader title="Arşiv" sub={`${rows.length} kayıt · hiçbiri silinmez`}>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!shown.length}
          className="flex h-10 items-center gap-1.5 rounded-full bg-card px-4 text-[0.8125rem] font-semibold text-acc shadow-[0_1px_3px_rgba(38,40,44,.08)] active:scale-95 disabled:opacity-40"
        >
          <Icon name="up" className="size-4 rotate-180" /> Excel’e aktar
        </button>
      </PageHeader>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {[
          ["all", "Tümü", rows.length],
          ["plan", "Planlar", count("plan")],
          ["task", "Görevler", count("task")],
          ["note", "Notlar", count("note")],
        ].map(([k, label, n]) => (
          <button
            key={k}
            type="button"
            onClick={() => setType(k)}
            aria-pressed={type === k}
            className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[0.875rem] font-semibold active:scale-95 ${type === k ? "bg-deep text-white" : "bg-card text-fg ring-1 ring-line"}`}
          >
            {label} <span className={`tabular-nums ${type === k ? "text-white/75" : "text-mut"}`}>{n}</span>
          </button>
        ))}
        <label className="ml-auto flex h-9 min-w-[12rem] flex-1 items-center gap-2 rounded-full bg-card px-3.5 ring-1 ring-line sm:flex-none">
          <Icon name="search" className="size-4 text-mut" />
          <input value={q} onChange={(e) => setQ(e.target.value)} type="search" placeholder="Arşivde ara" className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-mut" />
        </label>
      </div>

      {shown.length ? (
        <div className="mt-4 overflow-x-auto rounded-[1.25rem] bg-card shadow-[0_1px_2px_rgba(38,40,44,.05),0_8px_24px_-16px_rgba(38,40,44,.25)]">
          <table className="w-full min-w-[42rem] border-collapse text-left text-[0.875rem]">
            <thead>
              <tr className="border-b border-line text-[0.6875rem] font-bold uppercase tracking-[.08em] text-mut">
                <th className="px-4 py-3 font-bold">Tür</th>
                <th className="px-3 py-3 font-bold">Başlık</th>
                <th className="px-3 py-3 font-bold">Tarih</th>
                <th className="px-3 py-3 font-bold">Ekleyen</th>
                <th className="px-3 py-3 font-bold">Sorumlu</th>
                <th className="px-3 py-3 font-bold">Durum</th>
                <th className="px-3 py-3 font-bold">
                  <span className="sr-only">İşlem</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((x) => (
                <tr key={`${x.kind}-${x.r.id}`} className="border-b border-line/70 last:border-0 hover:bg-bg/60">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.8125rem] font-semibold text-acc">
                      <Icon name={ICON[x.kind]} className="size-4" /> {KIND[x.kind]}
                    </span>
                  </td>
                  <td className="max-w-[16rem] px-3 py-3">
                    <button type="button" onClick={() => openAdd({ edit: { kind: x.kind, id: x.r.id } })} className="block w-full text-left">
                      <b className="block truncate font-semibold hover:underline">{x.r.title}</b>
                      {x.detail && <small className="block truncate text-[0.75rem] text-mut">{x.detail}</small>}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 tabular-nums text-mut">{x.when}</td>
                  <td className="whitespace-nowrap px-3 py-3">{x.creator || "—"}</td>
                  <td className="px-3 py-3 text-mut">{x.assignees || "—"}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ${x.kind === "task" ? "bg-ok/10 text-ok" : "bg-line/70 text-mut"}`}>{x.status}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    {x.kind === "task" && (
                      <button type="button" onClick={() => toggleTask(x.r.id)} className="text-[0.8125rem] font-semibold text-acc">
                        Yeniden aç
                      </button>
                    )}
                    {x.kind === "note" && (
                      <button type="button" onClick={() => updateRecord("note", x.r.id, { archived: false }, by)} className="text-[0.8125rem] font-semibold text-acc">
                        Arşivden çıkar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-10 flex flex-col items-center text-center">
          <span className="grid size-14 place-items-center rounded-full bg-acc/10 text-acc">
            <Icon name="archive" className="size-7" />
          </span>
          <p className="mt-3 max-w-[18rem] text-[0.9375rem] leading-snug text-mut">
            {q ? `“${q}” bulunamadı.` : "Arşiv boş. Tamamlanan görevler, geçmiş planlar ve arşivlediğin notlar burada toplanır."}
          </p>
        </div>
      )}
      <p className="mt-4 text-center text-[0.75rem] text-mut">Tablo sağa kaydırılabilir. Kayda dokununca ayrıntısı açılır.</p>
    </main>
  );
}
