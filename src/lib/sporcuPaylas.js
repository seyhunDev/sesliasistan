import { isAthleteSide } from "./kinds";
import { isTraining } from "./trainingLog";

// Antrenman planları sporculara (Seyhun 2026-11-25 "ben antrenman ekliyorum, sporcu bunu görebilmeli; takvimde de gözükmüyor"):
// sporcu yalnız `people` listesinde olduğu planları okur (firestore.rules mine()). Alandaki (ana hesap, antrenör, çalışan; Seyhun
// 2026-11-25 "her ikisi için de") bugünkü ve ileriki
// antrenman planlarına (fitness hariç, iptal değil) uygulamada hesabı olan sporcu tarafı kişiler (sporcu, öğrenci, veli; ayrılmamış)
// `people`'a eklenir. Sorumlu (assignees) yapılmaz: sporcu planı salt okunur görür, Takvim ve ana sayfada çıkar.
// Elle, sesle ya da asistanla eklenen her plan aynı yoldan geçer (DataProvider, ana hesap açıkken).
// 2026-11-25 kalıcı yol: sporcu tarafı hesap alanın türü "Antrenman" olan planlarını people'da olmasa da okur (firestore.rules, DataProvider
// sideTraining); bu eşitleme yedek olarak kalır (eski uygulama sürümü, kural yayınlanmadıysa).
// Dönüş: [{ id, people, cat? }] yalnız eksik olanlar.
export function athleteUids(members = []) {
  return [...new Set(members.filter((m) => m?.uid && m.account !== false && isAthleteSide(m.kind) && m.status !== "left").map((m) => m.uid))].sort();
}

export function trainingShares(plans = [], members = [], ownerUid, today) {
  const ath = athleteUids(members);
  if (!ath.length || !ownerUid) return [];
  return plans
    // sporcu tarafının kendi eklediği plan paylaşılmaz (yalnız ana hesap, antrenör, çalışan)
    .filter((p) => p?.id && isTraining(p) && !p.fit && p.status !== "cancelled" && (p.endDate || p.date || "") >= today && !ath.includes(p.createdByUid))
    .map((p) => {
      const have = Array.isArray(p.people) ? p.people : [];
      const miss = ath.filter((u) => !have.includes(u));
      // Türü "Antrenman" değilse (adında antrenman geçen Genel plan) türü de düzelir: sporcu kuralla doğrudan okusun (firestore.rules)
      const cat = (p.cat || p.category) !== "Antrenman";
      if (!miss.length && !cat) return null;
      return { id: p.id, people: miss.length ? [...new Set([...(have.length ? have : [p.createdByUid || ownerUid]), ...miss])] : have, ...(cat ? { cat: "Antrenman" } : {}) };
    })
    .filter(Boolean);
}
