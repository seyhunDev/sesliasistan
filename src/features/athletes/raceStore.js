"use client";

// Yarışa elle eklenen evrak (kayıt formu, sağlık raporu, dekont…) Firebase Storage'da: orgs/{org}/raceFiles/{id}
// (kural storage.rules: yalnız ana hesap). Yarışta künyesi durur: files [{ id, name, type, size, at, url }] (races.js cleanRaceFiles).
// Telefonda kopya tutulmaz: yüklenen/taşınan dosya yalnız Storage'da durur, açılınca indirilir (tarayıcı önbelleği yeter).
// Önceki sürümün bıraktığı kopyalar ("rf:<id>") dropRaceCopies ile silinir.
// Eskiden bu evrak yalnız telefonda duruyordu ("<yarış>:extra", raceFiles.js); moveLocalExtras onları Storage'a taşır.
import { arrayUnion, doc, getDoc } from "firebase/firestore";
import { updateDoc } from "@/lib/firebase/write";
import { deleteObject, getStorage, ref as sref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { app, db } from "@/lib/firebase/clientApp";
import { dropRaceFile, listRaceFiles, saveRaceFile } from "./raceFiles";

export const RACE_FILE_MAX = 20 * 1024 * 1024;
const store = () => {
  const s = getStorage(app);
  s.maxUploadRetryTime = 60e3; // bağlantı ya da kural sorununda 10 dk takılı kalmasın
  s.maxOperationRetryTime = 30e3;
  return s;
};
const path = (orgId, id) => `orgs/${orgId}/raceFiles/${id}`;
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const cacheKey = (id) => `rf:${id}`;
const typeOf = (f) => f.type || (/\.pdf$/i.test(f.name || "") ? "application/pdf" : /\.(jpe?g)$/i.test(f.name || "") ? "image/jpeg" : /\.png$/i.test(f.name || "") ? "image/png" : "application/octet-stream");

// Dosyayı yükler, künyeyi döndürür. onProg(0..1)
export async function uploadRaceFile(orgId, blob, name, onProg) {
  const id = newId();
  const type = typeOf({ type: blob.type, name });
  const r = sref(store(), path(orgId, id));
  const task = uploadBytesResumable(r, blob, { contentType: type, cacheControl: "private, max-age=31536000" });
  await new Promise((res, rej) => task.on("state_changed", (s) => onProg?.(s.totalBytes ? s.bytesTransferred / s.totalBytes : 0), rej, res));
  const url = await getDownloadURL(r);
  return { id, name: String(name || "evrak").slice(0, 120), type, size: blob.size, at: new Date().toISOString(), url };
}

// Dosyanın kendisi Storage'dan (telefonda saklanmaz). İndirilemezse null (çağıran adresi açar).
export async function loadRaceFile(meta) {
  try {
    const res = await fetch(meta.url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    return new File([blob], meta.name, { type: meta.type });
  } catch (e) {
    console.warn("[raceStore] indirilemedi", e);
    return null;
  }
}

export async function dropRaceStored(orgId, meta) {
  if (!meta?.id) return;
  dropRaceFile(cacheKey(meta.id));
  try {
    await deleteObject(sref(store(), path(orgId, meta.id)));
  } catch (e) {
    if (e?.code !== "storage/object-not-found") console.warn("[raceStore] silinemedi", e);
  }
}

// Bu telefonda kalan eski "eklenen evrak"ı Storage'a taşır ve yarışlarına yazar.
// raceId verilirse yalnız o yarış. Dönüş { moved, left, added: { yarışId: [künye] } } (left: taşınamayan dosya sayısı).
export async function moveLocalExtras(orgId, raceId, onProg) {
  const recs = (await listRaceFiles()).filter((r) => /:extra$/.test(r.id) && r.files?.length && (!raceId || r.id === `${raceId}:extra`));
  const total = recs.reduce((n, r) => n + r.files.length, 0);
  let moved = 0;
  let left = 0;
  const added = {};
  for (const rec of recs) {
    const id = rec.id.replace(/:extra$/, "");
    const ref = doc(db, "orgs", orgId, "races", id);
    const snap = await getDoc(ref).catch(() => null);
    if (!snap?.exists()) {
      left += rec.files.length; // yarış silinmiş ya da başka hesabın: dokunulmaz
      continue;
    }
    const keep = [];
    for (const f of rec.files) {
      try {
        if (!f.blob || f.blob.size > RACE_FILE_MAX) throw new Error("büyük");
        const meta = await uploadRaceFile(orgId, f.blob, f.name, (p) => onProg?.((moved + p) / total));
        const m = { ...meta, at: f.at || meta.at };
        await updateDoc(ref, { files: arrayUnion(m) });
        (added[id] ||= []).push(m);
        moved += 1;
        onProg?.(moved / total);
      } catch (e) {
        console.warn("[raceStore] taşınamadı", f.name, e);
        keep.push(f);
        left += 1;
      }
    }
    if (keep.length) await saveRaceFile({ id: rec.id, files: keep });
    else await dropRaceFile(rec.id);
  }
  await dropRaceCopies().catch(() => {});
  return { moved, left, added };
}

// Firebase'e giden evrakın telefonda kalan kopyalarını siler (önceki sürüm saklıyordu). Silinen sayısı.
export async function dropRaceCopies() {
  const recs = (await listRaceFiles()).filter((r) => String(r.id).startsWith("rf:"));
  for (const r of recs) await dropRaceFile(r.id);
  return recs.length;
}

// Bu telefonda Firebase'e gönderilmemiş evrak sayısı (yarış başına)
export async function localExtraCount(raceId) {
  const recs = (await listRaceFiles()).filter((r) => /:extra$/.test(r.id) && (!raceId || r.id === `${raceId}:extra`));
  return recs.reduce((n, r) => n + (r.files?.length || 0), 0);
}
