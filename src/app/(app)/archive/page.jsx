"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { BackButton } from "@/components/ui/BackButton";
import { Empty } from "@/components/ui/Page";
import { ListHead, RowList } from "@/components/ui/Row";
import { useAuth } from "@/features/auth/AuthProvider";
import { useAdd } from "@/features/add/AddProvider";
import { useData } from "@/features/data/DataProvider";
import { useNow } from "@/hooks/useNow";
import { planState } from "@/lib/agenda";
import { assigneesOf } from "@/lib/people";
import { noteReopenPatch, noteStateText } from "@/lib/noteState";
import { planReopenPatch } from "@/lib/planActions";

const KIND = { plan: "Plan", task: "Görev", note: "Not" };
const MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
// Kaydın günü (yerel saat): "2026-11-03" ya da tam zaman; okunamazsa null
const dayOf = (v) => {
  const s = String(v || "");
  if (!s) return null;
  const d = new Date(s.length <= 10 ? `${s}T12:00:00` : s);
  return isNaN(d) ? null : d;
};
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

// Arşiv: tamamlanan görevler, biten ("Bitti") ve geçmiş planlar ve arşivlenen notlar tek listede. Hiçbir kayıt silinmez;
// yalnızca ana listelerden kalkar. Tür süzgeci, arama, Excel'e (CSV) aktarma; satıra dokun → kayıt açılır.
// Yeni tasarım (2026-11-03): lacivert üstte ad, Excel, arama ve tür çipleri; altta aylara göre satırlar (eski geniş tablo yerine)
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
      .filter((p) => p.done || planState(p, now) === "past")
      .map((p) => ({ kind: "plan", r: p, date: p.done && p.doneAt ? p.doneAt : `${p.endDate || p.date}${p.time ? `T${p.time}` : ""}`, when: `${fmt(p.date)}${p.time ? ` ${p.time}` : ""}`, status: p.done ? "Bitti" : "Geçti", detail: p.place || "" })),
    ...tasks
      .filter((t) => t.done)
      .map((t) => {
        const doers = Object.keys(t.doneBy || {}).map(who).filter(Boolean);
        return { kind: "task", r: t, date: t.doneAt || t.due || t.createdAt || "", when: fmt(t.doneAt || t.due), status: `Yapıldı${doers.length ? ` · ${doers.join(", ")}` : ""}`, detail: t.due ? `Son gün ${fmt(t.due)}` : "" };
      }),
    ...notes
      .filter((n) => n.archived)
      .map((n) => ({ kind: "note", r: n, date: n.doneAt || n.archivedAt || n.createdAt || "", when: fmt(n.doneAt || n.archivedAt || n.createdAt), status: noteStateText(n), detail: n.body && n.body !== n.title ? n.body : "" })),
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

  // Aylara göre bölümler (en yeni üstte); satır: başlık, altında tür · gün · kişiler · ayrıntı, sağda durum ve geri alma
  const ymOf = (x) => {
    const d = dayOf(x.date);
    return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "";
  };
  const months = [...new Set(shown.map(ymOf))];
  const short = (x) => {
    const d = dayOf(x.date);
    return d ? `${d.getDate()} ${MON[d.getMonth()]}` : "";
  };
  const monthName = (ym) => (ym ? new Date(`${ym}-01T12:00:00`).toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) : "Tarihsiz");
  // Geri alma: görev yeniden açılır, biten plan Planlar'a, not Notlar'a döner (geçmiş planda yok)
  const back = (x) =>
    x.kind === "task" ? ["Yeniden aç", () => toggleTask(x.r.id)] : x.kind === "plan" && x.r.done ? ["Planlara geri al", () => updateRecord("plan", x.r.id, planReopenPatch(), by)] : x.kind === "note" ? ["Notlara geri al", () => updateRecord("note", x.r.id, noteReopenPatch(), by)] : null;
  const row = (x) => {
    const b = back(x);
    const done = x.kind === "task" || x.r.done;
    const status = x.status.split(" · ")[0];
    const doers = x.status.split(" · ").slice(1).join(" · ");
    const sub = [KIND[x.kind], short(x), doers || x.assignees, x.creator && `Ekleyen ${x.creator}`, x.detail].filter(Boolean).join(" · ");
    return (
      <div key={`${x.kind}-${x.r.id}`} className="flex min-h-[3.5rem] items-center gap-2 border-t border-line py-2.5 first:border-t-0">
        <button type="button" onClick={() => openAdd({ edit: { kind: x.kind, id: x.r.id } })} data-press="row" className="min-w-0 flex-1 text-left">
          <b className="block truncate text-[0.9375rem] font-semibold">{x.r.title || "Başlıksız"}</b>
          <small className="block truncate text-[0.8125rem] text-mut">{sub}</small>
        </button>
        <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.75rem] font-semibold ${done ? "bg-ok/10 text-ok" : "bg-line text-mut"}`}>{status}</span>
        {b && (
          <button type="button" onClick={b[1]} aria-label={b[0]} data-press className="btn btn-text btn-sm shrink-0">
            Geri al
          </button>
        )}
      </div>
    );
  };
  const pill0 = "flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.8125rem] font-semibold";

  return (
    <main className="split mx-auto max-w-[30rem] px-5 pb-[calc(7.5rem+env(safe-area-inset-bottom))]">
      <section className="ck -mx-5 px-5 pb-9 pt-[calc(0.75rem+env(safe-area-inset-top))]" aria-label="Arşiv">
        <header className="flex items-center gap-2.5">
          <BackButton href="/" />
          <div className="min-w-0 flex-1 leading-tight">
            <h1 className="truncate text-[1.375rem] font-bold tracking-[-.02em]">Arşiv</h1>
            <p className="truncate text-[0.8125rem] text-white/65">{rows.length ? `${rows.length} kayıt` : "Kayıt yok"}</p>
          </div>
          <button type="button" onClick={exportCsv} disabled={!shown.length} data-press className="btn btn-secondary btn-sm shrink-0">
            Excel
          </button>
        </header>

        <label className="ck-glass mt-4 flex h-11 items-center gap-2 rounded-2xl px-3.5">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="Arşivde ara"
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/50"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Aramayı temizle" data-press className="grid size-7 place-items-center rounded-full text-white/70">
              <Icon name="x" className="size-4" />
            </button>
          )}
        </label>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
          {[
            ["all", "Tümü", rows.length],
            ["plan", "Planlar", count("plan")],
            ["task", "Görevler", count("task")],
            ["note", "Notlar", count("note")],
          ].map(([k, label, n]) => (
            <button key={k} type="button" onClick={() => setType(k)} aria-pressed={type === k} data-press className={`${pill0} ${type === k ? "border-white bg-white text-deep" : "ck-glass text-white"}`}>
              {label}
              <span className="ml-1.5 tabular-nums opacity-70">{n}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="split-main relative -mx-5 -mt-6 min-h-[50vh] space-y-6 rounded-t-[1.75rem] bg-bg px-5 pt-5">
        {shown.length ? (
          months.map((m) => {
            const items = shown.filter((x) => ymOf(x) === m);
            return (
              <section key={m || "none"}>
                <ListHead title={monthName(m)} count={items.length} />
                <RowList>{items.map(row)}</RowList>
              </section>
            );
          })
        ) : (
          <Empty icon="archive" title={q ? `“${q}” bulunamadı` : "Arşiv boş"} />
        )}
      </div>
    </main>
  );
}
