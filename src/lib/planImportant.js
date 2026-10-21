// Önemli plan (Seyhun 2026-10-21: "son tarihler önemli olarak gösterilmeli, ben önemli dersem o da"): planın important alanı
// (elle ya da sesle işaretlenir) ya da adında son tarih geçmesi ("Online kayıt son günü", "Kayıt ücreti son ödeme", "Son başvuru").
// Ana sayfa, Planlar ve Takvim satırları açık mor zemin ve "Önemli" etiketiyle gösterir.
const DEADLINE = /\bson\s+(gün|günü|tarih|tarihi|ödeme|başvuru|kayıt)\b/iu;
export const isDeadline = (p) => DEADLINE.test(String(p?.title || "").toLocaleLowerCase("tr-TR"));
export const isImportant = (p) => !!p && (p.important === true || isDeadline(p));
