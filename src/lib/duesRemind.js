// Aidat hatırlatması (saf fonksiyonlar, test edilir). Son ödeme günü (varsayılan ayın 10'u) geçince bu ay aidatı
// ödenmemiş ya da eksik ödenmiş sporcuların velilerine: uygulamada hesabı olan veliye bildirim, diğerlerine hazır
// WhatsApp metni. Gönderme her zaman ana hesabın dokunuşuyla (Aidatlar › "N sporcu ödemedi · velilere hatırlat").
// Ana hesaba ayın 11'inde (son gün + 1) bir kez "Aidat: N sporcu ödemedi" bildirimi gider (plan-reminders.mjs).
// Kayıt: dues/settings.dueDay (son gün), dues/{YYYY-MM}.reminded { sporcuId: ISO } (kim hatırlatıldı, cihazlar arası),
// athleteAtt/{kişi}.duesSent { YYYY-MM: ISO } (uygulamadaki veliye bir ayda bir bildirim), users/{uid}.duesAt (ana hesap bildirimi saati).
import { feeOf } from "./dues.js";
import { money } from "./bankSheet.js";

export const DUE_DAY = 10;
const TL = (n) => `${money(n).replace(/,00$/, "")} TL`;
const first = (name) => String(name || "").trim().split(/\s+/)[0] || "";

export const dueDayOf = (cfg = {}) => {
  const n = Math.round(Number(cfg.dueDay));
  return n >= 1 && n <= 28 ? n : DUE_DAY;
};
// Son gün geçti mi (bugün YYYY-MM-DD)
export const pastDue = (today, cfg) => Number(String(today).slice(8, 10)) > dueDayOf(cfg);

const monthName = (ym) => new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long" });
const cap = (s) => s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);

// Bu ay ödemeyenler: monthRows satırlarından (aidatı tanımlı, ödenmemiş ya da eksik) → [{ a, fee, paid, rest, state }]
export const unpaidOf = (rows) =>
  rows.filter((r) => r.fee > 0 && r.state !== "paid").map((r) => ({ a: r.a, fee: r.fee, paid: r.paid, rest: Math.round((r.fee - r.paid) * 100) / 100, state: r.state }));

// Sunucu için (dues/settings.roster yalnız adlar): roster + ay kaydı → aynı biçim
export function unpaidRoster(cfg = {}, month = {}) {
  return (cfg.roster || [])
    .map((a) => {
      const fee = feeOf(a, cfg);
      const paid = (month.paid?.[a.id] || []).reduce((s, p) => s + (Number(p.amt) || 0), 0);
      return { a, fee, paid, rest: Math.round((fee - paid) * 100) / 100, state: paid <= 0 ? "due" : "part" };
    })
    .filter((x) => x.fee > 0 && x.paid < x.fee);
}

const owed = (x, ym) => (x.state === "part" ? `${monthName(ym)} aidatının ${TL(x.rest)}'si` : `${monthName(ym)} aidatı (${TL(x.fee)})`);

// WhatsApp metni (gönderen ana hesap; veli telefonuyla wa.me)
export function remindText(x, ym, club = "Dikili Yelken Spor Kulübü") {
  return `Merhaba, ${first(x.a.studentName)} için ${owed(x, ym)} henüz hesabımıza ulaşmadı. Ödediyseniz bu mesajı dikkate almayın. Teşekkürler.${club ? ` ${club}` : ""}`;
}
// Uygulamadaki veliye bildirim
export const remindPush = (x, ym) => ({ title: `Aidat hatırlatması: ${first(x.a.studentName)}`, body: `${cap(owed(x, ym))} henüz görünmüyor. Ödediyseniz dikkate almayın.` });

// Ana hesaba: "Aidat: 3 sporcu ödemedi" / "Ekim aidatı · Deniz, Ege, Ada · velilere hatırlatmak için dokun"
export function ownerText(list, ym) {
  if (!list.length) return null;
  const names = list.map((x) => x.a.studentName).filter(Boolean);
  const shown = names.slice(0, 4).join(", ") + (names.length > 4 ? ` +${names.length - 4}` : "");
  return { title: `Aidat: ${list.length} sporcu ödemedi`, body: `${cap(monthName(ym))} aidatı · ${shown} · velilere hatırlatmak için dokun` };
}
