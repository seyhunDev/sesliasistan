import { isAthleteSide } from "./kinds";
import { isTraining } from "./trainingLog";

// Antrenman planları sporculara (Seyhun 2026-11-25 "ben antrenman ekliyorum, sporcu bunu görebilmeli; takvimde de gözükmüyor"):
// sporcu yalnız `people` listesinde olduğu planları okur (firestore.rules mine()). Ana hesabın eklediği bugünkü ve ileriki
// antrenman planlarına (fitness hariç, iptal değil) uygulamada hesabı olan sporcu tarafı kişiler (sporcu, öğrenci, veli; ayrılmamış)
// `people`'a eklenir. Sorumlu (assignees) yapılmaz: sporcu planı salt okunur görür, Takvim ve ana sayfada çıkar.
// Elle, sesle ya da asistanla eklenen her plan aynı yoldan geçer (DataProvider, ana hesap açıkken).
// Dönüş: [{ id, people }] yalnız eksik olanlar.
export function athleteUids(members = []) {
  return [...new Set(members.filter((m) => m?.uid && m.account !== false && isAthleteSide(m.kind) && m.status !== "left").map((m) => m.uid))].sort();
}

export function trainingShares(plans = [], members = [], ownerUid, today) {
  const ath = athleteUids(members);
  if (!ath.length || !ownerUid) return [];
  return plans
    .filter((p) => p?.id && isTraining(p) && !p.fit && p.status !== "cancelled" && (p.endDate || p.date || "") >= today && (!p.createdByUid || p.createdByUid === ownerUid))
    .map((p) => {
      const have = Array.isArray(p.people) ? p.people : [];
      const miss = ath.filter((u) => !have.includes(u));
      return miss.length ? { id: p.id, people: [...new Set([ownerUid, ...have, ...miss])] } : null;
    })
    .filter(Boolean);
}
