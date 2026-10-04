"use client";

// Yarış talimatı (ilan / NoR): PDF ya da fotoğraf yapay zekayla okunur, yarış bilgisi dolar,
// program, son tarihler, ücretler, oteller, iletişim yarışın "notice" alanında durur. Belgenin kendisi PDF olarak
// ayrıca saklanır (noticeFile.js; yarışta noticeFile künyesi).
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
export async function kindOf(file) {
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

// Talimatı yarışa uygular: yeni yarışta (adı boş) bilgiler talimattan gelir; var olan yarışta yalnız boş alanlar dolar.
// force: kullanıcı farkları görüp "Bilgileri güncelle" dediyse yer ve tarihler de talimattan alınır (ad kalır)
export function applyNotice(r, n, force = false) {
  const fresh = !r.name.trim();
  if (force) {
    const keep = r.name;
    return { ...applyNotice({ ...r, name: "" }, n), name: keep || n.name || "" };
  }
  // Yurt içi kayıtlı yarışa yurt dışı talimatı gelince il/ilçe yerine ülke/şehir talimattan alınır
  const flip = n.abroad === true && !r.abroad;
  const take = (k) => (n[k] && (fresh || !String(r[k] || "").trim() || (flip && (k === "city" || k === "district"))) ? n[k] : r[k]);
  const next = {
    ...r,
    // Talimat yurt dışı diyorsa yarış yurt dışı olur (yurt içine kendiliğinden dönmez)
    abroad: !!r.abroad || n.abroad === true,
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

// Yeni okunan talimat kayıtlı bilgiden farklı mı? Yapay zeka aynı talimatı her okuyuşta başka kelimelerle yazabildiği için
// yalnız sağlam bilgiler karşılaştırılır: yarış tarihleri, son tarihler, program günleri, ücret tutarları, sınıflar.
// Dönen: ["Yarış tarihi: 7-11 Ekim → 8-12 Ekim", …]; boşsa aynı.
const dm = (s) => (s ? `${Number(s.slice(8, 10))}.${s.slice(5, 7)}` : "");
const span = (a, b) => (a && b && b !== a ? `${dm(a)}-${dm(b)}` : dm(a));
const setOf = (list) => [...new Set(list.filter(Boolean))].sort();
const same = (a, b) => a.join("|") === b.join("|");
export function noticeDiff(r, n) {
  if (!r || !n) return [];
  const old = r.notice || {};
  const out = [];
  if (n.startDate && r.startDate && (n.startDate !== r.startDate || (n.endDate && r.endDate && n.endDate !== r.endDate)))
    out.push(`Yarış tarihi: ${span(r.startDate, r.endDate)} → ${span(n.startDate, n.endDate || n.startDate)}`);
  const dl = (x) => setOf((x.deadlines || []).map((d) => d.date));
  const [d0, d1] = [dl(old), dl(n)];
  if (!same(d0, d1)) {
    const added = (n.deadlines || []).filter((d) => !d0.includes(d.date)).map((d) => `${dm(d.date)} ${d.title}`);
    const gone = (old.deadlines || []).filter((d) => !d1.includes(d.date)).map((d) => `${dm(d.date)} ${d.title}`);
    if (added.length) out.push(`Yeni son tarih: ${added.slice(0, 3).join(", ")}`);
    if (gone.length) out.push(`Artık yok: ${gone.slice(0, 3).join(", ")}`);
  }
  const days = (x) => setOf((x.schedule || []).map((s) => s.date));
  if (old.schedule?.length && n.schedule?.length && !same(days(old), days(n))) out.push(`Program günleri: ${days(old).map(dm).join(", ")} → ${days(n).map(dm).join(", ")}`);
  const fee = (x) => setOf((x.fees || []).map((f) => String(f.amount || "").replace(/[^\d%€$]/g, "")));
  if (old.fees?.length && n.fees?.length && !same(fee(old), fee(n)))
    out.push(`Ücretler: ${(old.fees || []).map((f) => f.amount).filter(Boolean).join(", ")} → ${(n.fees || []).map((f) => f.amount).filter(Boolean).join(", ")}`);
  const cls = (x) => setOf((x.classes || []).map((c) => String(c).toLocaleUpperCase("tr-TR").replace(/İ/g, "I").replace(/\s+/g, "")));
  if (old.classes?.length && n.classes?.length && !same(cls(old), cls(n))) out.push(`Sınıflar: ${old.classes.join(", ")} → ${n.classes.join(", ")}`);
  return out;
}
