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

// Kırpma ekranı: fotoğraf çerçeveyi (kare, frame px) tam dolduracak ve ortalanacak boyut; z büyütme (1 = tam dolu)
export function coverBox(w, h, frame, z = 1) {
  const s = (frame / Math.min(w, h)) * z;
  const bw = w * s;
  const bh = h * s;
  return { w: bw, h: bh, left: (frame - bw) / 2, top: (frame - bh) / 2 };
}
// Kaydırma sınırı: çerçevede boşluk kalmasın
export function clampPan(p, box, frame) {
  const mx = Math.max(0, (box.w - frame) / 2);
  const my = Math.max(0, (box.h - frame) / 2);
  return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
}
