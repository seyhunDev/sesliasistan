"use client";

// Sonuç belgesini yükleme (yarış sayfası › Sporcu › Sonuçlar ve multimedya sayfası › Sonuçlar aynı akışı kullanır):
// yapay zeka listeyi okur, bizim sporcular bulunur, belge saklanır, bütün liste genel sıralama için yarışın raceLive kaydına
// ve yarış ortaksa sharedRaces/{id}/sheets'e yazılır (başka kulüpler sporcularını oradan bulur, sharedRaces.js pullSheets).
// athletes: yarıştaki sporcular (önce bunlar aranır); club: kulübün etkin sporcuları (yarışta olmayan bulunursa yarışa eklenir).
// Dönüş { results, ranked, extra, n, miss }: results yarışın yeni results alanı, extra yarışa eklenecek sporcular.
import { mergeSheet, rankOurs, raceYear, withCats } from "@/lib/resultSheet";
import { keepFiles, rankWith } from "@/lib/sharedRace";
import { readResults } from "./raceResultsRead";
import { noticePdf, saveNoticeFile } from "./noticeFile";
import { loadSheets, saveSheet } from "./raceLiveStore";
import { saveSharedSheet } from "./sharedRaces";

const fileName = (race, n) => `${String(race?.name || "Yarış").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60)} sonuçları${n > 1 ? ` ${n}` : ""}.pdf`;

export async function importResults({ orgId, race, athletes, club = [], file }) {
  const res = race.results || { fleet: "", rows: {} };
  const pool = [...athletes, ...club.filter((a) => !athletes.some((x) => x.id === a.id))];
  const read = await readResults(file, athletes.map((a) => a.studentName));
  const { kind } = read;
  // Yaş kategorileri (ILCA 4 Junior) doğum yılından, yarışın yılına göre
  const fleets = withCats(read.fleets, raceYear(race));
  // Gruplu sınıfta önceki PDF'lerle birlikte sıralanır (Altın PDF'i önce, Gümüş PDF'i sonra: Gümüş'teki sporcunun genel sırası ikisinden)
  const before = race.id ? await loadSheets(orgId, race.id).catch(() => []) : [];
  const ranked = rankWith(before, fleets, pool, raceYear(race));
  const pdf = await noticePdf(file, kind);
  const meta = await saveNoticeFile(orgId, pdf, fileName(race, (res.files?.length || 0) + 1));
  if (race.id) await saveSheet(orgId, race.id, meta.id, fleets).catch((e) => console.warn("[sonuç] genel liste kaydedilemedi", e));
  // Ortak yarışa da (yalnız ekleyen kulüp ve ana hesap yazabilir; diğerlerinde kural reddeder)
  if (race.shared) saveSharedSheet(race.shared, meta, fleets).catch(() => {});
  const extra = Object.keys(ranked).filter((id) => !(race.athleteIds || []).includes(id));
  return {
    results: keepFiles(mergeSheet(res, ranked, meta), res, rankOurs(fleets, pool)),
    ranked,
    extra,
    n: Object.keys(ranked).length,
    miss: athletes.filter((a) => !ranked[a.id] && !res.rows?.[a.id]?.place).length,
  };
}

export const importToast = ({ n, extra, miss }) =>
  n ? `${n} sporcumuz bulundu${extra.length ? `, ${extra.length} sporcu yarışa eklendi` : ""}${miss ? ` · ${miss} sporcu listede yok` : ""}` : "Sonuç kaydedildi ama listede sporcumuz bulunamadı";

