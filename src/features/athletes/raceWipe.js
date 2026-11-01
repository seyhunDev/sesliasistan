"use client";

// Yarışı her şeyiyle siler (Seyhun 2026-11-01 "yarışı silince o yarışın her şeyini sil; ortak yarışlardan da silebilmeliyim"):
// yarış belgesi, eklenen evrak dosyaları (Storage raceFiles), canlı kayıt + fotoğraf/video + sonuç listeleri + parkur + kayıt listesi
// (raceLiveStore.dropLive), ortak yarış kaydı (sharedRaces.dropShared; yalnız açan kulüp ya da Velora ana hesabı) ve herkese açık
// ekranın işareti canliEkran/{yarış} (/api/canli DELETE; silinen yarışın linki /canli/<id> "kaldırıldı" der). Yarış belgesi
// silinemezse hata fırlar; kalan adımlar tek tek denenir, biri olmazsa diğerleri sürer.
import { auth } from "@/lib/firebase/clientApp";
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
    const u = auth.currentUser;
    if (r?.shared) await dropShared(r.shared, u?.uid || "", u?.email || "").catch(() => {});
    await authFetch("/api/canli", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ race: id }) }).catch(() => {});
  };
  return rest();
}
