// Toplantı sonucu: yapay zeka çıktısını temizler, özet metnini ve mesaj alıcılarını hazırlar (saf; sunucu ve istemci ortak).
// Sonuç: { title, sections [{ heading, points [] }], decisions [], items (plan/görev/not taslakları), messages [{ to, text }], message }
import { matchPerson } from "@/lib/names";
import { toDrafts } from "@/lib/ai/schema";

const str = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const list = (v) => (Array.isArray(v) ? v : []);

// Eski biçim ("- madde" satırları) de başlıksız tek bölüm olur
function sectionsOf(raw) {
  const out = list(raw?.sections)
    .map((s) => ({ heading: str(s?.heading, 80), points: list(s?.points).map((p) => str(p, 300)).filter(Boolean).slice(0, 8) }))
    .filter((s) => s.heading || s.points.length)
    .slice(0, 8);
  if (out.length) return out;
  const points = String(raw?.summary || "").split("\n").map((l) => str(l.replace(/^\s*[-•*]\s*/, ""), 300)).filter(Boolean).slice(0, 8);
  return points.length ? [{ heading: "", points }] : [];
}

// people: çalışan adları (sorumlu için), names: mesaj gönderilebilecek kişi ve grup adları
export function cleanMeeting(raw, { people = [], names = [] } = {}) {
  const messages = list(raw?.messages)
    .map((m) => ({ to: str(m?.to, 60), text: String(m?.text ?? "").trim().slice(0, 1000) }))
    .filter((m) => m.to && m.text)
    .map((m) => ({ ...m, to: (names.length && matchPerson(m.to, names)) || m.to }))
    .slice(0, 8);
  return {
    title: str(raw?.title, 80) || "Toplantı",
    sections: sectionsOf(raw),
    decisions: list(raw?.decisions).map((d) => str(d, 300)).filter(Boolean).slice(0, 20),
    items: toDrafts(raw?.items, people).slice(0, 15), // mesajdan toplu sorumlu tamamlama yok: toplantıda iş başına kişi farklı
    messages,
    message: str(raw?.message, 300),
  };
}

// Yalnız konuşma olduysa (iş, plan, mesaj yok) sonuç ekranı özeti öne alır
export const onlyTalk = (r) => !r?.items?.length && !r?.messages?.length;

// Not olarak kaydedilecek özet: başlıklar ve maddeler, ardından kararlar
export function summaryText(r) {
  const parts = list(r?.sections).map((s) => [s.heading, ...s.points.map((p) => `- ${p}`)].filter(Boolean).join("\n"));
  if (r?.decisions?.length) parts.push(`Kararlar\n${r.decisions.map((d) => `- ${d}`).join("\n")}`);
  return parts.join("\n\n");
}

// Grup sözleri: "ekibe", "aileye", "sporculara", "velilere", "herkese"
const TEAM = /^(ekip|ekib|herkes|grup|aile|sporcu|veli)/i;
export function groupFor(to, mine = []) {
  const s = String(to || "").toLocaleLowerCase("tr-TR").trim();
  if (!TEAM.test(s)) return "";
  const g = /^aile/.test(s) ? "family" : /^(sporcu|veli)/.test(s) ? "athletes" : /^ekib|^ekip/.test(s) ? "team" : mine[0] || "";
  return mine.includes(g) ? g : "";
}

// Alıcı adını sohbete çevirir. contacts: [{ name, uid }], groups: { id: ad } (yalnız üyesi olunanlar)
// Döner: { group } ya da { uid, name } ya da null (bulunamadı)
export function recipientOf(to, contacts = [], groups = {}) {
  const ids = Object.keys(groups);
  const g = groupFor(to, ids) || ids.find((id) => groups[id].toLocaleLowerCase("tr-TR") === String(to || "").toLocaleLowerCase("tr-TR").trim());
  if (g) return { group: g, name: groups[g] };
  const hit = matchPerson(to, contacts.map((c) => c.name));
  const c = hit && contacts.find((x) => x.name === hit);
  return c ? { uid: c.uid, name: c.name } : null;
}

// Süre: 01:05 ya da 1:02:05 (bir saati geçen toplantı)
export function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
