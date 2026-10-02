"use client";

// Yarış talimatı (ilan / NoR): PDF ya da fotoğraf yapay zekayla okunur, yarış bilgisi dolar,
// program, son tarihler, ücretler, oteller, iletişim yarışın "notice" alanında durur. Belgenin kendisi saklanmaz.
import { authFetch } from "@/lib/authFetch";
import { compressImage } from "@/lib/image";
import { todayStr } from "@/lib/utils/format";
import { cleanNotice, shiftDay } from "./races";

const MAX = 4 * 1024 * 1024;

const toBase64 = (file) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(",")[1]);
    fr.onerror = () => rej(new Error("Dosya okunamadı"));
    fr.readAsDataURL(file);
  });

// Dosya türü uzantıya ya da telefonun bildirdiğine değil içeriğe bakılarak bulunur
// (WhatsApp/Dosyalar'dan gelen talimatlar çoğu zaman uzantısız ve türsüz gelir)
async function kindOf(file) {
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const sig = String.fromCharCode(...head);
  if (sig.startsWith("%PDF")) return "pdf";
  if (file.type.startsWith("image/") || (head[0] === 0xff && head[1] === 0xd8) || sig.startsWith("\x89PNG")) return "image";
  if (sig.startsWith("PK")) return "docx";
  if (file.type.startsWith("text/") || /\.txt$/i.test(file.name)) return "text";
  return "";
}

export async function readNotice(file) {
  const kind = await kindOf(file);
  let body;
  if (kind === "pdf") {
    if (file.size > MAX) throw new Error("PDF 4 MB'tan büyük. Talimatın metnini kopyalayıp “Metin yapıştır” ile ekleyebilirsin.");
    body = { mimeType: "application/pdf", data: await toBase64(file) };
  } else if (kind === "image") {
    const img = await compressImage(file, 2200, 0.8);
    body = { mimeType: img.mimeType, data: img.base64 };
  } else if (kind === "text") {
    body = { text: await file.text() };
  } else if (kind === "docx") {
    throw new Error("Word dosyası okunamıyor. PDF olarak kaydet ya da metni kopyalayıp “Metin yapıştır” ile ekle.");
  } else throw new Error("PDF, fotoğraf ya da metin seç");
  return send(body);
}

// Kopyalanan talimat metni
export function readNoticeText(text) {
  const t = String(text || "").trim();
  if (t.length < 40) throw new Error("Talimat metni çok kısa");
  return send({ text: t.slice(0, 60000) });
}

async function send(body) {
  const res = await authFetch("/api/race-notice", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...body, today: todayStr() }),
  });
  const p = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(p.error || (res.status >= 500 ? "Talimat okunamadı (uzun sürdü). Tekrar dene ya da ilk sayfaların fotoğrafını yükle." : "Talimat okunamadı"));
  return p;
}

// Talimatı yarışa uygular: yeni yarışta (adı boş) bilgiler talimattan gelir; var olan yarışta yalnız boş alanlar dolar
export function applyNotice(r, n) {
  const fresh = !r.name.trim();
  const take = (k) => (n[k] && (fresh || !String(r[k] || "").trim()) ? n[k] : r[k]);
  const next = {
    ...r,
    name: take("name"),
    city: take("city"),
    district: take("district"),
    federation: n.federation && (fresh || !r.federation) ? n.federation : r.federation,
    startDate: take("startDate"),
    endDate: n.endDate && (fresh || !r.endDate) ? n.endDate : r.endDate || n.endDate || r.startDate,
    notice: cleanNotice({ ...n, at: todayStr(), planned: false }),
  };
  // İzin aralığı varsayılanı: yarıştan bir gün önce, bir gün sonra (elle değiştirilmediyse)
  if (next.startDate !== r.startDate && (!r.leaveStart || r.leaveStart === shiftDay(r.startDate, -1))) next.leaveStart = shiftDay(next.startDate, -1);
  if (next.endDate !== r.endDate && (!r.leaveEnd || r.leaveEnd === shiftDay(r.endDate, 1))) next.leaveEnd = shiftDay(next.endDate, 1);
  return next;
}

// Son tarihleri planlara yazar ("D'Azur: Geç kayıt son gün"). Geçmiş tarihler atlanır.
export async function addNoticePlans(saveDrafts, r, by) {
  const today = todayStr();
  const list = (r.notice?.deadlines || []).filter((d) => d.date >= today);
  if (!list.length) return 0;
  const place = [r.district, r.city].filter(Boolean).join(", ");
  const res = await saveDrafts(
    list.map((d) => ({ type: "plan", title: `${r.name.trim()}: ${d.title}`, date: d.date, endDate: "", time: d.time || "", place, cat: "Yarış", assignees: [] })),
    { source: "manual", by },
  );
  return res.error ? 0 : res.plans;
}
