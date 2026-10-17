// Profil fotoğrafı: Storage yolu ve sunucunun kabul ettiği adres (istemci ve /api/photo ortak).
export const avatarDir = (orgId, uid) => `orgs/${orgId}/avatars/${uid}/`;
export const avatarPath = (orgId, uid, at = Date.now()) => `${avatarDir(orgId, uid)}${at.toString(36)}.jpg`;

// Adres bu işletmenin bu kişiye ait Storage klasöründen mi (başka yerden adres yazılamasın)
export function avatarOk(url, path, orgId, uid, bucket) {
  if (typeof url !== "string" || typeof path !== "string" || url.length > 600) return false;
  if (!path.startsWith(avatarDir(orgId, uid)) || !/^[\w./-]+$/.test(path) || path.includes("..")) return false;
  const base = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?`;
  return !!bucket && url.startsWith(base);
}
