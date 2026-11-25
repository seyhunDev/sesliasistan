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
import { dropSheetDoc, loadSheets, saveSheet } from "./raceLiveStore";
import { saveSharedSheet } from "./sharedRaces";
import { loadRace, saveRaceResults } from "./races";
import { isActive } from "./data";
import { stampResults } from "@/lib/raceDay";
import { todayStr } from "@/lib/utils/format";
import { runJob } from "@/lib/jobs";

const fileName = (race, n) => `${String(race?.name || "Yarış").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, 60)} sonuçları${n > 1 ? ` ${n}` : ""}.pdf`;

// Tek ortak "Sonuç ekle" (yarış sayfası Takip › Sonuçlar, Yayın › Belgeler, canlı ekran › Sporcular "+"; Seyhun 2026-11-09 "sonuçları
// gösterdiğimiz her yerde artı"): yarıştaki ve kulübün sporcularıyla okur, yarışa kaydeder. Dönüş { got, race: güncel yarış }
export async function addResults({ orgId, race, athletes, file, replace = "" }) {
  const ours = athletes.filter((a) => (race.athleteIds || []).includes(a.id));
  const club = athletes.filter((a) => isActive(a) && !ours.includes(a));
  const got = await importResults({ orgId, race, athletes: ours, club, file, replace });
  got.results = stampResults(race.results, got.results, todayStr());
  await saveRaceResults(orgId, race.id, got.results, got.extra);
  return { got, race: { ...race, results: got.results, athleteIds: [...new Set([...(race.athleteIds || []), ...got.extra])] } };
}
// replace: sunucunun siteden okuyup yazdığı genel liste (sheets/site-…, raceSiteTake.takeResults); yerine bu belgeninki geçer
// Üstteki iş göstergesinde adım adım görünür (lib/jobs.js; Seyhun 2026-11-13): hangi ekrandan yüklenirse yüklensin
export const importResults = (o) =>
  runJob({ name: `${o.race?.name || "Yarış"} sonuçları`, steps: ["PDF okunuyor", "Sporcularımız bulunuyor", "Kaydediliyor"] }, (step) => readAndSave(o, step), {
    done: (got) => ({ text: importToast(got) }),
    fail: (e) => ({ text: e?.message || "Sonuç okunamadı" }),
  });

async function readAndSave({ orgId, race, athletes, club = [], file, replace = "" }, step = () => {}) {
  // Sonuçlar üç ekrandan (yarış sayfası, Multimedya › Sonuç, Yayın › Belgeler) yazılır: eldeki eski kopya değil, kayıttaki taze hâl üstüne
  // eklenir (biri az önce PDF eklediyse silinmesin; yarış sistemi haritası 2026-11-04)
  const fresh = race.id ? await loadRace(orgId, race.id).catch(() => null) : null;
  const res = fresh?.results || race.results || { fleet: "", rows: {} };
  const pool = [...athletes, ...club.filter((a) => !athletes.some((x) => x.id === a.id))];
  const read = await readResults(file, athletes.map((a) => a.studentName));
  const { kind } = read;
  step(1);
  // Yaş kategorileri (ILCA 4 Junior) doğum yılından, yarışın yılına göre
  const fleets = withCats(read.fleets, raceYear(race));
  // Gruplu sınıfta önceki PDF'lerle birlikte sıralanır (Altın PDF'i önce, Gümüş PDF'i sonra: Gümüş'teki sporcunun genel sırası ikisinden)
  const before = (race.id ? await loadSheets(orgId, race.id).catch(() => []) : []).filter((x) => !replace || x.id !== replace);
  const ranked = rankWith(before, fleets, pool, raceYear(race));
  step(2);
  const pdf = await noticePdf(file, kind);
  const meta = await saveNoticeFile(orgId, pdf, fileName(race, (res.files?.length || 0) + 1));
  if (race.id) await saveSheet(orgId, race.id, meta.id, fleets).then(() => replace && dropSheetDoc(orgId, race.id, replace)).catch((e) => console.warn("[sonuç] genel liste kaydedilemedi", e));
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

