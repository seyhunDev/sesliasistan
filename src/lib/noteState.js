// Notun yaşamı: işi biten not silinmez, "Yapıldı" denir ve Arşiv'e gider (Arşiv'de "Yapıldı" etiketiyle durur,
// "Notlara geri al" ile geri gelir). Yalnız arşivlenen not "Arşivlendi" görünür. Silme ayrıca durur.
// Saf veri: sayfalar ve asistan aynı alanları yazar (done, doneAt, archived, archivedAt).
export const noteDonePatch = (at = new Date().toISOString()) => ({ done: true, doneAt: at, archived: true, archivedAt: at, pinned: false });
export const noteReopenPatch = () => ({ done: false, doneAt: null, archived: false, archivedAt: null });
export const noteStateText = (n) => (n?.done ? "Yapıldı" : n?.archived ? "Arşivlendi" : "Açık");
// Kopyala / paylaş için notun düz metni: başlık, metin başlıktan farklıysa altında
export const noteText = (n) => {
  const t = String(n?.title || "").trim();
  const b = String(n?.body || "").trim();
  return b && b !== t ? (t ? `${t}\n${b}` : b) : t;
};

// Notun rengi (Not ayarları › Renk; Seyhun 2026-10-23): alan `color`, boşsa renksiz. Listede soldaki ince çizgi, ana sayfa kartı da bunu kullanır.
export const NOTE_COLORS = [
  ["", "Renksiz", "var(--line)"],
  ["cyan", "Camgöbeği", "#0ea5c4"],
  ["green", "Yeşil", "#5fae86"],
  ["amber", "Sarı", "#e0a33a"],
  ["red", "Kırmızı", "#d9776e"],
  ["blue", "Mavi", "#7c9cd6"],
];
export const noteColor = (n) => (NOTE_COLORS.find(([k]) => k && k === n?.color) || NOTE_COLORS[0])[2];

// Listede notun tarihi kısa: "Bugün", "Dün", son 7 günde gün adı ("Pzt"), daha eskisi "17 Eki" (yıl farklıysa "17 Eki 2025")
export const noteWhen = (iso, today) => {
  const d = String(iso || "").slice(0, 10);
  if (!d || !today) return "";
  const at = (s) => new Date(`${s}T00:00`);
  const days = Math.round((at(today) - at(d)) / 864e5);
  if (days <= 0) return "Bugün";
  if (days === 1) return "Dün";
  if (days < 7) return at(d).toLocaleDateString("tr-TR", { weekday: "short" });
  return at(d).toLocaleDateString("tr-TR", d.slice(0, 4) === today.slice(0, 4) ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
};
