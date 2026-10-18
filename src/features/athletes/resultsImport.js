"use client";

// Sonuç belgesini yükleme (yarış sayfası › Sporcu › Sonuçlar ve multimedya sayfası › Sonuçlar aynı akışı kullanır):
// yapay zeka listeyi okur, bizim sporcular bulunur, belge saklanır, bütün liste genel sıralama için yarışın raceLive kaydına yazılır.
// athletes: yarıştaki sporcular (önce bunlar aranır); club: kulübün etkin sporcuları (yarışta olmayan bulunursa yarışa eklenir).
// Dönüş { results, ranked, extra, n, miss }: results yarışın yeni results alanı, extra yarışa eklenecek sporcular.
import { mergeSheet, rankOurs } from "@/lib/resultSheet";
import { readResults } from "./raceResultsRead";
import { noticePdf, saveNoticeFile } from "./noticeFile";
import { saveSheet } from "./raceLiveStore";

const fileName = (race, n) => `${String(race?.name || "Yarış").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60)} sonuçları${n > 1 ? ` ${n}` : ""}.pdf`;

export async function importResults({ orgId, race, athletes, club = [], file }) {
  const res = race.results || { fleet: "", rows: {} };
  const pool = [...athletes, ...club.filter((a) => !athletes.some((x) => x.id === a.id))];
  const { kind, fleets } = await readResults(file, athletes.map((a) => a.studentName));
  const ranked = rankOurs(fleets, pool);
  const pdf = await noticePdf(file, kind);
  const meta = await saveNoticeFile(orgId, pdf, fileName(race, (res.files?.length || 0) + 1));
  if (race.id) await saveSheet(orgId, race.id, meta.id, fleets).catch((e) => console.warn("[sonuç] genel liste kaydedilemedi", e));
  const extra = Object.keys(ranked).filter((id) => !(race.athleteIds || []).includes(id));
  return {
    results: mergeSheet(res, ranked, meta),
    ranked,
    extra,
    n: Object.keys(ranked).length,
    miss: athletes.filter((a) => !ranked[a.id] && !res.rows?.[a.id]?.place).length,
  };
}

export const importToast = ({ n, extra, miss }) =>
  n ? `${n} sporcumuz bulundu${extra.length ? `, ${extra.length} sporcu yarışa eklendi` : ""}${miss ? ` · ${miss} sporcu listede yok` : ""}` : "Sonuç kaydedildi ama listede sporcumuz bulunamadı";
