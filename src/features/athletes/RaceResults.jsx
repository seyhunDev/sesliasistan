"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Label, card } from "@/components/ui/Page";
import { useToast } from "@/components/ui/ToastProvider";
import { mergeSheet, dropSheet, rankOurs, resultLine } from "@/lib/resultSheet";
import { readResults } from "./raceResultsRead";
import { dropNoticeFile, loadNoticeFile, noticePdf, saveNoticeFile } from "./noticeFile";

const box = "h-10 w-16 rounded-lg bg-bg px-2 text-center text-[0.9375rem] tabular-nums outline-none focus:ring-1 focus:ring-acc";
const fileName = (race, n) => `${String(race?.name || "Yarış").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60)} sonuçları${n > 1 ? ` ${n}` : ""}.pdf`;

// Yarış başlayınca Sporcular sekmesinde: sonuç PDF'i yüklenir, yapay zeka listeyi okur, bizim sporcular bulunur;
// her sporcuya kategori (Optimist Senior/Junior/Bambino, ILCA 4…) sırası ve kızlar sırası yazılır.
// Belge yarışta saklanır (her cihazdan açılır). Belge yoksa sıra elle de yazılır (tekne sayısı + sıra).
// Sporcu kartında yarış geçmişi, asistan ("Ali'nin sonuçları") ve Instagram sonuç gönderisi buradan beslenir.
// athletes: yarıştaki sporcular; club: kulübün bütün etkin sporcuları (yarışta seçili olmayan bulunursa yarışa eklenir)
export function RaceResults({ orgId, race, athletes, club = [], onChange, onAddAthletes, onOpen, onPost }) {
  const toast = useToast();
  const res = race.results || { fleet: "", rows: {} };
  const files = res.files || [];
  const pickRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const put = (id, k, v) => onChange({ ...res, rows: { ...res.rows, [id]: { ...(res.rows?.[id] || {}), [k]: v } } });

  // Yarıştaki sporcular önce aranır, sonra kulübün diğer sporcuları
  const upload = async (f) => {
    if (!f || busy) return;
    setBusy(true);
    try {
      const pool = [...athletes, ...club.filter((a) => !athletes.some((x) => x.id === a.id))];
      const { kind, fleets } = await readResults(f, athletes.map((a) => a.studentName));
      const ranked = rankOurs(fleets, pool);
      const pdf = await noticePdf(f, kind);
      const meta = await saveNoticeFile(orgId, pdf, fileName(race, files.length + 1));
      onChange(mergeSheet(res, ranked, meta));
      const extra = Object.keys(ranked).filter((id) => !race.athleteIds.includes(id));
      if (extra.length) onAddAthletes(extra);
      const n = Object.keys(ranked).length;
      const miss = athletes.filter((a) => !ranked[a.id] && !res.rows?.[a.id]?.place).length;
      toast(n ? `${n} sporcumuz bulundu${extra.length ? `, ${extra.length} sporcu yarışa eklendi` : ""}${miss ? ` · ${miss} sporcu listede yok` : ""}` : "Sonuç kaydedildi ama listede sporcumuz bulunamadı");
    } catch (e) {
      toast(e?.message || "Sonuçlar okunamadı");
    }
    setBusy(false);
  };
  const open = async (meta) => {
    try {
      onOpen(await loadNoticeFile(orgId, meta));
    } catch (e) {
      toast(e?.message || "Belge açılamadı");
    }
  };
  const drop = (meta) => {
    if (!confirm("Bu sonuç belgesi ve ondan okunan sıralar silinsin mi?")) return;
    onChange(dropSheet(res, meta.id));
    dropNoticeFile(orgId, meta);
  };

  const sorted = [...athletes].sort((a, b) => (res.rows?.[a.id]?.place || 999) - (res.rows?.[b.id]?.place || 999));
  return (
    <>
      <Label right={files.length ? `${files.length} belge` : ""}>SONUÇLAR</Label>
      <section className={`${card} overflow-hidden`}>
        {files.map((m) => (
          <div key={m.id} className="flex items-center gap-1 border-b border-line pl-4 pr-1.5">
            <button type="button" onClick={() => open(m)} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rec/10 text-[0.625rem] font-bold text-rec">PDF</span>
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[0.9375rem] font-semibold">{m.name}</b>
                <span className="block truncate text-[0.8125rem] text-mut">Sonuç belgesi · her cihazdan açılır</span>
              </span>
            </button>
            <button type="button" onClick={() => drop(m)} aria-label={`${m.name} sil`} className="grid size-10 shrink-0 place-items-center text-mut">
              <Icon name="x" className="size-4" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => pickRef.current?.click()} disabled={busy} className="flex w-full items-center gap-3 px-4 py-3 text-left text-acc disabled:opacity-60">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-acc/10">
            {busy ? <span className="size-5 animate-spin rounded-full border-2 border-acc/25 border-t-acc" /> : <Icon name="plus" className="size-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] font-semibold">{busy ? "Sonuçlar okunuyor…" : files.length ? "Başka sonuç ekle" : "Sonuç PDF'i yükle"}</b>
            <span className="block text-[0.8125rem] text-mut">{busy ? "Yarım dakika kadar sürebilir" : "Sporcularımızı bulur, genel, Junior ve kızlar sırasını yazar"}</span>
          </span>
        </button>
        <input ref={pickRef} type="file" accept="application/pdf,image/*,.pdf" className="hidden" onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} />

        {sorted.length > 0 && (
          <ul className="divide-y divide-line border-t border-line">
            {sorted.map((a) => {
              const x = res.rows?.[a.id];
              const line = x?.cls ? resultLine(x) : "";
              const top = x?.place && x.place <= 3;
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[0.875rem] font-bold tabular-nums ${top ? "bg-amber-400/20 text-amber-700 dark:text-amber-300" : x?.place ? "bg-acc/10 text-acc" : "bg-bg text-mut"}`}>
                    {x?.place ? `${x.place}.` : "–"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[0.9375rem] font-semibold">{a.studentName}</b>
                    <span className="block truncate text-[0.8125rem] text-mut">{line || (files.length && !x?.place ? "Sonuç listesinde bulunamadı" : x?.note || "")}</span>
                  </span>
                  {!x?.cls && <input inputMode="numeric" value={x?.place || ""} onChange={(e) => put(a.id, "place", e.target.value.replace(/\D/g, ""))} placeholder="sıra" aria-label={`${a.studentName} sıra`} className={box} />}
                </li>
              );
            })}
          </ul>
        )}
        {!files.length && sorted.length > 0 && (
          <label className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-[0.8125rem] text-mut">
            <span className="flex-1">Belge yoksa sırayı elle yaz · tekne sayısı</span>
            <input inputMode="numeric" value={res.fleet || ""} onChange={(e) => onChange({ ...res, fleet: e.target.value.replace(/\D/g, "") })} className={box} aria-label="Tekne sayısı" />
          </label>
        )}
        {onPost && sorted.some((a) => res.rows?.[a.id]?.place) && (
          <button type="button" onClick={onPost} className="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white">
              <Icon name="instagram" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[0.9375rem] font-semibold">Instagram görseli hazırla</b>
              <span className="block truncate text-[0.8125rem] text-mut">Sonuçlarla gönderi açılır, yazılar hazır gelir</span>
            </span>
            <Icon name="chev" className="size-5 shrink-0 text-mut" />
          </button>
        )}
      </section>
      <p className="mt-2 px-1 text-[0.75rem] text-mut">Önce genel sıra; Junior ve Bambino ayrıca kendi içinde, kızlar da kendi içinde sıralanır. Kızlar sırası için sporcu kartındaki cinsiyet kullanılır. Sonuçlar sporcu kartında da görünür.</p>
    </>
  );
}
