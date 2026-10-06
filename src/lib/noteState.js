// Notun yaşamı: işi biten not silinmez, "Yapıldı" denir ve Arşiv'e gider (Arşiv'de "Yapıldı" etiketiyle durur,
// "Notlara geri al" ile geri gelir). Yalnız arşivlenen not "Arşivlendi" görünür. Silme ayrıca durur.
// Saf veri: sayfalar ve asistan aynı alanları yazar (done, doneAt, archived, archivedAt).
export const noteDonePatch = (at = new Date().toISOString()) => ({ done: true, doneAt: at, archived: true, archivedAt: at, pinned: false });
export const noteReopenPatch = () => ({ done: false, doneAt: null, archived: false, archivedAt: null });
export const noteStateText = (n) => (n?.done ? "Yapıldı" : n?.archived ? "Arşivlendi" : "Açık");
