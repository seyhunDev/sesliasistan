// Taslak kayıtların ortak yardımcıları (yeni kayıt penceresi ve yüzen asistan paneli birlikte kullanır).
import { cap } from "@/lib/utils/format";
import { uidsToNames } from "@/lib/names";

let seq = 0;
export const nid = () => `d${Date.now()}_${seq++}`;
export const blank = (type) => ({ _id: nid(), type, title: "", body: "", date: "", endDate: "", time: "", allDay: false, place: "", link: false, cat: "Genel", assignees: [] });
export const isBlank = (d) => !(d.title || "").trim() && !(d.body || "").trim();
// Yapay zekaya gönderilecek sade taslak (askedTime: bu plan için saat zaten soruldu, tekrar sorma)
export const pub = (d, members = []) => ({
  ...(members.length ? { assignTo: uidsToNames(d.assignees, members) } : {}),
  type: d.type, title: d.title || "", body: d.body || "", date: d.date || "", endDate: d.endDate || "", time: d.time || "",
  allDay: !!d.allDay, askedTime: !!d._asked, place: d.place || "", category: d.cat || "Genel", linkToPlan: !!d.link,
});
// Güncel listede kartlar aynı sıra ve türdeyse kimlik ve bayraklarını koru (açık kartlar kapanmasın)
export const carry = (old, next) =>
  next.map((d, i) => {
    const o = old[i] && old[i].type === d.type ? old[i] : null;
    return { ...d, title: cap(d.title || ""), _id: o ? o._id : nid(), _asked: o ? !!o._asked : false, assignees: d.assignees?.length ? d.assignees : o?.assignees || [], _general: !d.assignees?.length && !!o?._general, allDay: !!(d.allDay || o?.allDay) && !d.time };
  });
export const fresh = (x) => ({ ...x, title: cap(x.title || ""), _id: nid(), _asked: false, assignees: x.assignees || [], allDay: !!x.allDay && !x.time });
// Kaydetmeden önce: başlık ve not metni büyük harfle başlasın, boşluklar temizlensin
export const tidy = (d) => ({ ...d, title: cap((d.title || "").trim()), body: cap((d.body || "").trim()), place: cap((d.place || "").trim()) });

// Eksik bilgi: plan günü (zorunlu) ve tek günlük planın saati (cevap gelmezse tüm gün olur)
export const needOf = (d) => (d.type !== "plan" ? "" : !d.date ? "date" : !d.time && !d.endDate && !d.allDay ? "time" : "");
export function firstNeed(list) {
  for (const kind of ["date", "time"]) {
    const idx = list.findIndex((d) => needOf(d) === kind);
    if (idx >= 0) return { idx, kind };
  }
  return null;
}

export const toPatch = (raw) => {
  const d = tidy(raw);
  return d.type === "plan"
    ? {
      title: d.title.trim(),
      date: d.date,
      endDate: d.endDate && d.endDate !== d.date ? d.endDate : "",
      time: d.time || "",
      allDay: !d.time,
      durationMin: d.time ? 60 : null,
      timeSource: d.time ? "user" : "none",
      place: (d.place || "").trim(),
    }
    : d.type === "task"
      ? { title: d.title.trim(), due: d.date || null }
      : { title: (d.title || d.body).trim(), body: (d.body || d.title).trim() };
};

export const check = (d) => {
  if (d.type === "note" ? !(d.title.trim() || d.body.trim()) : !d.title.trim()) return "Başlık gerekli";
  if (d.type === "plan" && !d.date) return "Plan için tarih seç";
  return "";
};
