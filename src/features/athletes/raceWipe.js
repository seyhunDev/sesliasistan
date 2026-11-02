"use client";

// Yarışı her şeyiyle siler (Seyhun 2026-11-01 "yarışı silince o yarışın her şeyini sil; ortak yarışlardan da silebilmeliyim"):
// yarış belgesi, eklenen evrak dosyaları (Storage raceFiles), canlı kayıt + fotoğraf/video + sonuç listeleri + parkur + kayıt listesi
// (raceLiveStore.dropLive), ortak yarış kaydı (sharedRaces.dropShared; yalnız açan kulüp ya da Velora ana hesabı) ve herkese açık
// ekranın işareti canliEkran/{yarış} (/api/canli DELETE; silinen yarışın linki /canli/<id> "kaldırıldı" der). Yarış belgesi
// silinemezse hata fırlar; kalan adımlar tek tek denenir, biri olmazsa diğerleri sürer.
// 2026-11-02 (Seyhun "yarışı sildim, ana sayfada hâlâ butonu duruyor"): yarışın planları da silinir (yarışın kendi planı ve
// "Yarış adı: son tarih" planları, raceLinks.racePlansOf); ana sayfanın yarış özeti hemen tazelenir (races.js deleteRace olayı).
import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/clientApp";
import { racePlansOf } from "./raceLinks";
import { authFetch } from "@/lib/authFetch";
import { deleteRace, loadRace } from "./races";
import { dropLive } from "./raceLiveStore";
import { dropRaceStored } from "./raceStore";
import { dropShared } from "./sharedRaces";

export async function wipeRace(orgId, id) {
  const r = await loadRace(orgId, id).catch(() => null);
  await deleteRace(orgId, id);
  const rest = async () => {
    for (const f of r?.files || []) await dropRaceStored(orgId, f).catch(() => {});
    await dropLive(orgId, id).catch(() => {});
    await dropRacePlans(orgId, r).catch(() => {});
    const u = auth.currentUser;
    if (r?.shared) await dropShared(r.shared, u?.uid || "", u?.email || "").catch(() => {});
    await authFetch("/api/canli", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ race: id }) }).catch(() => {});
  };
  return rest();
}

// Yarışın planları (plan listesi canlı dinlendiği için ana sayfa ve takvim kendiliğinden güncellenir)
async function dropRacePlans(orgId, r) {
  if (!r?.name) return;
  const col = collection(db, "orgs", orgId, "plans");
  const snaps = await Promise.all(["cat", "category"].map((f) => getDocs(query(col, where(f, "==", "Yarış"))).catch(() => null)));
  const all = new Map();
  for (const s of snaps) for (const d of s?.docs || []) all.set(d.id, { id: d.id, ...d.data() });
  const { main, deadlines } = racePlansOf(r, [...all.values()]);
  const ids = [main?.id, ...deadlines.map((p) => p.id)].filter(Boolean);
  if (!ids.length) return;
  const b = writeBatch(db);
  ids.forEach((pid) => b.delete(doc(col, pid)));
  await b.commit();
}
