// Plan ekranındaki işlemler (Ertele, Kopyala, Paylaş) için saf yardımcılar.
const D = (s) => new Date(`${s}T00:00`);
const pad = (n) => String(n).padStart(2, "0");
const shift = (s, n) => {
  const d = D(s);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// "6 Ekim Salı · 10:00" / "6 Ekim Salı – 8 Ekim Perşembe" / "6 Ekim Salı · Tüm gün"
export function planWhen(p) {
  if (!p?.date) return "";
  const long = (s) => D(s).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
  if (p.endDate && p.endDate !== p.date) return `${long(p.date)} – ${long(p.endDate)}`;
  return `${long(p.date)} · ${p.time || "Tüm gün"}`;
}

// Kopyala / paylaş metni: başlık, zaman, yer (iptal edildiyse başta "İPTAL")
export function planText(p) {
  const head = `${p?.status === "cancelled" ? "İPTAL: " : ""}${String(p?.title || "").trim()}`;
  return [head, planWhen(p), p?.place ? `Yer: ${String(p.place).trim()}` : ""].filter(Boolean).join("\n");
}

// Ertele: tarih (ve varsa bitiş) n gün ileri; saat ve süre aynı kalır
export const postponePatch = (p, n = 1) => ({ date: shift(p.date, n), ...(p.endDate ? { endDate: shift(p.endDate, n) } : {}) });


// Plan bitti: yapılan plan silinmez, Planlar listesinden kalkar ve Arşiv'de "Bitti" olarak durur
// ("Planlara geri al" ile döner). Hatırlatma ve "Şu an" kartı biten planı saymaz. Sayfa ve asistan aynı alanları yazar.
export const planDonePatch = (at = new Date().toISOString()) => ({ done: true, doneAt: at });
export const planReopenPatch = () => ({ done: false, doneAt: null });
export const isPlanDone = (p) => !!p?.done;
