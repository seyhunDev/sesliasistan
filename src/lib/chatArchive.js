// Mesaj arşivi (Mesajlar). Silinen mesaj kalıcı silinmez, arşive gider:
// - Ana hesap arşivlerse herkesten kalkar (arch: true); yalnız ana hesap arşivden geri alır ya da kalıcı siler.
// - Diğer kişi arşivlerse yalnız kendisinden kalkar (hide.<uid>: true); kendi arşivinden geri alır.
// - Eski sürümde "silinen" mesajlar (deleted: true) sohbette artık görünmez.

// Sohbette görünür mü
export const shownMsg = (m, uid) => !!m && !m.arch && !m.deleted && !m.hide?.[uid];

// Bu kişinin arşivinde mi (ana hesap herkesten arşivlenenleri de görür)
export const inArchive = (m, uid, owner) => !!m && !m.deleted && (!!m.hide?.[uid] || (owner && !!m.arch));

// Arşivleme yaması: ana hesap herkesten, diğerleri yalnız kendisinden
export const archiveScope = (owner) => (owner ? "all" : "me");

// Son mesaj arşivlenince listedeki özet: geriye doğru ilk görünen mesaj (uid: herkese göre bakılır, kişisel gizleme sayılmaz)
export function prevShown(list, m) {
  const i = list.findIndex((x) => x.id === m.id);
  const before = (i < 0 ? list : list.slice(0, i)).filter((x) => x.id !== m.id && !x.arch && !x.deleted && (x.text || x.file));
  return before.at(-1) || null;
}

// Sohbet ekranında gösterilecek mesaj listesi. Sohbet belgesi yoksa (hiç yazılmamış ya da ana hesap silip sıfırladı) mesaj
// yoktur: bellekteki ve telefondaki eski kopya gösterilmez. Silinip yeniden açılan sohbette belgeden önce yazılmış (önbellekte
// kalmış) mesajlar da atlanır. born: sohbet belgesinin createdAt'i (ms; yoksa 0), atMs: mesaj zamanını ms'ye çeviren işlev.
export function liveMsgs(raw, exists, born, atMs) {
  if (!exists) return [];
  return (raw || []).filter((m) => !born || !m.at || atMs(m.at) >= born - 60e3);
}
