// Sorumlular: kaydın atandığı çalışanlar. Boş liste = genel (belirli bir sorumlu yok).
// Eski kayıtlarda assignees alanı yoksa people listesinden (ekleyen dışındakiler) çıkarılır.
export const assigneesOf = (rec) =>
  Array.isArray(rec?.assignees) ? rec.assignees : (rec?.people || []).filter((u) => u !== rec?.createdByUid);

// Kaydı görebilecekler: ekleyen her zaman + sorumlular
export const peopleFor = (creator, assignees = []) => [...new Set([creator, ...assignees].filter(Boolean))];

// Kaydın kiminle ilgili olduğunu kısa yazar: "Ali ekledi", "→ Ali, Veli" ya da ikisi birden
export function whoText(rec, myUid, nameOf) {
  if (!rec || !myUid) return "";
  const c = rec.createdByUid;
  const parts = [];
  if (c && c !== myUid) parts.push(`${nameOf(c) || "Başkası"} ekledi`);
  const to = assigneesOf(rec).filter((u) => u !== myUid && u !== c);
  if (to.length) parts.push(`→ ${to.map((u) => nameOf(u) || "Kişi").join(", ")}`);
  return parts.join(" · ");
}

// İşi yapacaklar: sorumlular + (çalışan eklediyse) ekleyen; bakan kişi hariç. Ana sayfada "görevli" olarak gösterilir.
export const doersOf = (rec, myUid) => [...new Set([...assigneesOf(rec), rec?.createdByUid])].filter((u) => u && u !== myUid);

// ---- Atanan kişinin sınırları ----
// Çalışan, başkasının (ana hesabın) eklediği kaydı değiştiremez/silemez: yalnızca kendisi için "tamamladım" der ve not ekler.
// rec.doneBy = { [uid]: zaman }, rec.replies = { [uid]: [{ at, text }] }
export const lockedFor = (rec, uid, isStaff) => !!(isStaff && rec?.createdByUid && rec.createdByUid !== uid);
export const doneAtBy = (rec, uid) => rec?.doneBy?.[uid] || null;
// Tüm notlar (eskiden yeniye): [{ uid, at, text }]
export const repliesOf = (rec) =>
  Object.entries(rec?.replies || {})
    .flatMap(([uid, list]) => (Array.isArray(list) ? list : []).map((r) => ({ uid, at: r.at, text: r.text })))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));

// ---- İletildi / görüldü / tamamladı ----
// rec.ack = { [uid]: { s: gönderildi (bildirim), d: iletildi (telefona ulaştı / uygulamada göründü), r: görüldü (açtı) } }
export function ackState(rec, uid) {
  const a = rec?.ack?.[uid] || {};
  if (rec?.doneBy?.[uid]) return { key: "done", label: "Tamamladı", at: rec.doneBy[uid] };
  if (a.r) return { key: "read", label: "Görüldü", at: a.r };
  if (a.d) return { key: "delivered", label: "İletildi", at: a.d };
  if (a.s) return { key: "sent", label: "Gönderildi", at: a.s };
  return { key: "pending", label: "Henüz iletilmedi", at: null };
}
// Sorumluların en geride olanına göre tek durum (hepsi gördüyse "Görüldü", hepsi bitirdiyse "Tamamladı")
const RANK = { pending: 0, sent: 1, delivered: 2, read: 3, done: 4 };
export function ackSummary(rec) {
  const list = assigneesOf(rec).filter((u) => u !== rec?.createdByUid);
  if (!list.length) return null;
  return list.map((u) => ackState(rec, u)).sort((a, b) => RANK[a.key] - RANK[b.key])[0];
}
// Bu kişi için yeni mi: başkası eklemiş, bu kişi henüz açmamış, son 14 günde eklenmiş
export function isNewFor(rec, uid) {
  if (!rec || !uid || !rec.createdByUid || rec.createdByUid === uid) return false;
  if (rec.ack?.[uid]?.r) return false;
  const t = Date.parse(rec.createdAt || "");
  return !t || Date.now() - t < 14 * 864e5;
}
