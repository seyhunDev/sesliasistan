// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { loadInvoices, setPaid as setInvoicePaid } from "@/features/invoices/invoiceData";
import { pickInvoice, amountText } from "@/lib/invoices";
import { loadDebts, updateDebts } from "@/features/debts/debtData";
import { debtAnswer, cleanDebt, tl, DEBT_KINDS, debtsOf, leftOf, payDebt } from "@/lib/debts";
import { athleteNames } from "@/features/athletes/data";
import { matchPerson } from "@/lib/names";
import { todayStr } from "@/lib/utils/format";
import { soon } from "@/lib/soon";
import { loadMovementsRange, loadConv } from "@/features/dues/duesData";
import { payeeOf, payeeAnswer, payeeMoves } from "@/lib/payee";
import { withoutConv } from "@/lib/cashbook";
import { receiptPayCommand, receiptScopeCommand, invoiceTaskCommand, duesCommand, monthYm, cashCommand, incomeCommand } from "@/lib/assistMore";
import { totalTL } from "@/lib/receipts";
import { money } from "@/lib/bankSheet";
import { deleteInvoice, ensureTask } from "@/features/invoices/invoiceData";
import { canSeeAthletes } from "@/features/athletes/access";
import { loadAthletes } from "@/features/athletes/data";
import { saveStart, saveFree, loadDuesRange, loadCash, archiveCash, convertToCash, addIncome, saveCashName, updateIncome } from "@/features/dues/duesData";
import { lastMonths, athleteDuesText, athleteDues, feeOf } from "@/lib/dues";
import { unpaidRoster } from "@/lib/duesRemind";
import { authFetch } from "@/lib/authFetch";
import { setDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { kasaOf, convPick, debtMoves, personalOf, canEditCash } from "@/lib/cashbook";
import { whoIn } from "@/lib/payee";
import { sameNamed } from "@/lib/names";

// ---- Fatura ödendi / ödenmedi (asistandan) ----
// ia: önceki turda "hangi fatura" soruldu; bulunamazsa false döner, cümle başka işlere devam eder
export async function runInvoice(ctx, ic, viaVoice, asked = false) {
  const { done, invAsk, profile, reply, waitFor } = ctx;
  let list;
  try {
    list = await loadInvoices(profile.orgId);
  } catch {
    reply("Faturaları okuyamadım.", { engine: "local" }, viaVoice);
    return true;
  }
  const { pick, list: many } = pickInvoice(ic.t, list, ic.op);
  if (!pick) {
    if (asked && !many.length) return false;
    if (!many.length) {
      reply(ic.op === "paid" ? "Ödenmemiş fatura yok." : "Ödendi işaretli fatura yok.", { engine: "local", nav: "invoices" }, viaVoice);
      return true;
    }
    waitFor("invoice");
    invAsk.current = { op: ic.op, cash: !!ic.cash };
    const names = many.slice(0, 4).map((x) => `${x.seller} ${amountText(x)}`);
    reply(`Hangi fatura? ${names.join(", ")}${many.length > 4 ? " ve diğerleri" : ""}. Firmanın adını söyle.`, { engine: "local", expect: true }, viaVoice);
    return true;
  }
  try {
    await setInvoicePaid(profile.orgId, pick, ic.op === "paid", ic.cash ? "cash" : "hand");
    window.dispatchEvent(new Event("sa-invoices-saved"));
    done(
      ic.op === "paid"
        ? `${ic.cash ? "Nakit ödendi, kasadan düştüm" : "Ödendi olarak işaretledim"}: ${pick.seller}, ${amountText(pick)}.${pick.taskId ? " Görevi de tamamladım." : ""}`
        : `Ödenmedi olarak işaretledim: ${pick.seller}, ${amountText(pick)}.${pick.paidVia === "cash" ? " Kasaya geri ekledim." : ""}`,
      { engine: "local", nav: "invoices" },
      viaVoice,
    );
  } catch {
    reply("Faturayı kaydedemedim, tekrar dene.", { engine: "local" }, viaVoice);
  }
  return true;
}

export async function runDebt(ctx, { dq, dc }, viaVoice) {
  const { askOk, contacts, done, profile, reply, setPhase } = ctx;
  setPhase("thinking");
  let items;
  try {
    items = await loadDebts(profile.orgId, { fresh: true });
  } catch {
    reply("Borçları okuyamadım.", { fail: true, engine: "local" }, viaVoice);
    return;
  }
  if (dq) return reply(debtAnswer(items, dq.who), { engine: "local", nav: "accounts" }, viaVoice);
  const nav = { engine: "local", nav: "accounts" };
  if (dc.op === "add") {
    if (!dc.who) return reply("Kime borç verdin? Adıyla ve tutarıyla söyler misin?", { fail: true, engine: "local" }, viaVoice);
    if (!(dc.amount > 0)) return reply(`${dc.who} için ne kadar? Tutarıyla yeniden söyler misin?`, { fail: true, engine: "local" }, viaVoice);
    // Kişiler, sporcular ve önceki borçlardaki adla yazılır ("Ali" → "Ali Kaya" tek eşleşirse)
    const known = [...new Set([...items.map((d) => d.who), ...contacts.map((c) => c.name), ...athleteNames()].filter(Boolean))];
    const who = matchPerson(dc.who, known) || dc.who;
    const d = cleanDebt({ who, amount: dc.amount, kind: dc.kind, note: dc.note, date: todayStr(), at: new Date().toISOString() });
    try {
      await soon(updateDebts(profile.orgId, (list) => [d, ...list]), 2500, "Borç");
      done(`Ekledim: ${who}, ${tl(d.amount)}, ${DEBT_KINDS[d.kind].toLocaleLowerCase("tr-TR")}. ${d.kind === "club" ? "Kasadan düştüm, Hesaplar › Kulüp'te" : "Hesaplar › Kişisel'de"} görünür.`, nav, viaVoice);
    } catch {
      reply("Borcu kaydedemedim, tekrar dene.", { fail: true, engine: "local" }, viaVoice);
    }
    return;
  }
  const { hit, list } = debtsOf(items, dc.who);
  if (!hit) return reply(dc.who ? `${dc.who} adına açık borç bulamadım.` : "Kimin borcu? Adıyla söyler misin?", { fail: true, ...nav }, viaVoice);
  if (dc.op === "pay") {
    // Tutar yoksa kişinin bütün açık borçları kapanır; tutar varsa en eskisinden düşülür
    let rest = dc.amount > 0 ? dc.amount : Infinity;
    const ids = [...list].sort((a, b) => `${a.date}${a.at}`.localeCompare(`${b.date}${b.at}`)).map((d) => d.id);
    try {
      const next = await updateDebts(profile.orgId, (all) => {
        const pay = new Map();
        for (const id of ids) {
          const d = all.find((x) => x.id === id);
          if (!d || rest <= 0) continue;
          const a = Math.min(leftOf(d), rest);
          rest -= a;
          pay.set(id, a);
        }
        return all.map((d) => (pay.has(d.id) ? payDebt(d, pay.get(d.id), todayStr()) : d));
      });
      const left = next.filter((d) => d.who === hit).reduce((t, d) => t + leftOf(d), 0);
      done(`${hit}: ${dc.amount > 0 ? `${tl(dc.amount)} geri geldi yazdım.` : "borç ödendi yazdım."}${left > 0 ? ` Kalan ${tl(left)}.` : ""}`, nav, viaVoice);
    } catch {
      reply("Ödemeyi kaydedemedim, tekrar dene.", { fail: true, engine: "local" }, viaVoice);
    }
    return;
  }
  // Silme: onayla
  const sum = list.reduce((t, d) => t + leftOf(d), 0);
  askOk(`${hit} adına ${list.length > 1 ? `${list.length} borç` : "borç"} (${tl(sum)}) silinsin mi? Geri alınamaz.`, "Sil", async (v) => {
    try {
      const ids = new Set(list.map((d) => d.id));
      await updateDebts(profile.orgId, (all) => all.filter((d) => !ids.has(d.id)));
      done(`${hit} borcunu sildim.`, nav, v);
    } catch {
      reply("Silemedim, tekrar dene.", { fail: true, engine: "local" }, v);
    }
  }, viaVoice);
}

export async function runPayee(ctx, pq, viaVoice) {
  const { profile, reply, setPhase } = ctx;
  setPhase("thinking");
  try {
    const { movements } = await loadMovementsRange(profile.uid, pq.ym, pq.ym);
    const payee = payeeOf(profile);
    reply(payeeAnswer(payeeMoves(withoutConv(movements, await loadConv(profile.uid)), payee), payee, pq.ym, todayStr().slice(0, 7)), { engine: "local", nav: "payments" }, viaVoice);
  } catch {
    reply("Banka hareketlerini okuyamadım.", { engine: "local" }, viaVoice);
  }
}

export async function receiptPayCmd(ctx, s, viaVoice) {
  const { done, markPaid, members, owner, receipts, reply } = ctx;
  // Fiş ödendi (ana hesap, çalışanın fişi): "F-0012 fişini ödendi yap", "Ali'nin fişlerini ödedim"
  const rp = owner ? receiptPayCommand(s) : null;
  if (rp) {
    const want = rp.paid ? "pending" : "paid";
    let list = receipts.filter((x) => x.payStatus === want);
    if (rp.no) list = receipts.filter((x) => Number(x.no) === rp.no);
    else if (rp.who) {
      const m = matchPerson(rp.who, members);
      const u = m ? members.find((x) => x.name === m)?.uid : "";
      list = u ? list.filter((x) => x.createdByUid === u) : [];
    }
    if (!list.length) {
      reply(rp.no ? `F-${String(rp.no).padStart(4, "0")} numaralı fiş bulamadım.` : rp.paid ? "Ödeme bekleyen fiş görünmüyor." : "Ödendi işaretli fiş bulamadım.", { engine: "local", nav: "receipts" }, viaVoice);
      return true;
    }
    if (!rp.no && !rp.who && list.length > 1) {
      reply(`${list.length} fiş ödeme bekliyor. Fiş numarasıyla ya da kimin fişi olduğunu söyle (ör. “Ali'nin fişlerini ödedim”).`, { engine: "local", nav: "receipts" }, viaVoice);
      return true;
    }
    // Kişisel fiş (Garanti kartı) kulüp kasasına dokunmaz
    await Promise.all(list.map((x) => markPaid(x.id, rp.paid, x.scope === "personal" ? "card" : rp.cash ? "cash" : "eft")));
    const sum = list.reduce((t, x) => t + totalTL(x), 0);
    const kasa = rp.paid ? (rp.cash ? " Kasadan düştüm." : "") : list.some((x) => x.paidVia === "cash") ? " Kasaya geri ekledim." : "";
    done(`${list.length === 1 ? "Fiş" : `${list.length} fiş`} ${rp.paid ? (rp.cash ? "nakit ödendi" : "ödendi") : "ödeme bekliyor"} olarak işaretlendi${sum ? `, toplam ${money(sum).replace(/,00$/, "")} TL` : ""}.${kasa}${rp.paid ? " Ekleyene bildirim gitti." : ""}`, { engine: "local", nav: "receipts" }, viaVoice);
    return true;
  }
}

// Fiş Kişisel ↔ Kulüp (ana hesap): "son Garanti fişini kulübe al", "Migros fişini kişisel yap", "F-0012'yi kulüp fişi yap".
// Garanti fişinde o kartın sonraki harcamaları da bu seçimle gelir (setReceiptScope).
export async function receiptScopeCmd(ctx, s, viaVoice) {
  const { done, owner, receipts, reply, setReceiptScope } = ctx;
  const rs = owner ? receiptScopeCommand(s) : null;
  if (!rs) return undefined;
  const newest = (a, b) => `${b.date}${b.time || ""}${b.createdAt || ""}`.localeCompare(`${a.date}${a.time || ""}${a.createdAt || ""}`);
  const want = (rs.q ? rs.q.split(" ") : []).map((w) => w.slice(0, Math.max(3, w.length - 2)));
  let list = [...receipts].sort(newest);
  if (rs.no) list = list.filter((x) => Number(x.no) === rs.no);
  else if (want.length) list = list.filter((x) => want.every((w) => `${x.merchant} ${x.note || ""}`.toLocaleLowerCase("tr-TR").includes(w)));
  else if (/garanti|kart/u.test(s.toLocaleLowerCase("tr-TR"))) list = list.filter((x) => x.src === "garanti");
  const r = list[0];
  if (!r) {
    reply(rs.no ? `F-${String(rs.no).padStart(4, "0")} numaralı fiş bulamadım.` : "O fişi bulamadım. İşyerinin adıyla ya da fiş numarasıyla söyle.", { engine: "local", nav: "receipts" }, viaVoice);
    return true;
  }
  const label = rs.scope === "personal" ? "Kişisel" : "Kulüp";
  if ((r.scope || "club") === rs.scope) {
    done(`${r.merchant || "Fiş"} zaten ${label}.`, { engine: "local", nav: "receipts" }, viaVoice);
    return true;
  }
  const ok = await setReceiptScope(r.id, rs.scope);
  if (!ok) {
    reply("Fişi kaydedemedim, tekrar dene.", { engine: "local" }, viaVoice);
    return true;
  }
  done(`${r.merchant || "Fiş"} (${money(totalTL(r)).replace(/,00$/, "")} TL) ${label} yapıldı.${r.card ? ` Bu karttan (·${r.card}) sonraki harcamalar da ${label} gelecek.` : ""}`, { engine: "local", nav: "receipts" }, viaVoice);
  return true;
}

export async function invoiceTaskCmd(ctx, s, viaVoice) {
  const { askOk, done, members, owner, profile, reply, tasks, updateRecord } = ctx;
  // Fatura: "Turkcell faturasını Ali'ye ver" (görevliye bildirim gider), "Turkcell faturasını sil" (onayla)
  const it = owner ? invoiceTaskCommand(s) : null;
  if (it) {
    let list;
    try {
      list = await loadInvoices(profile.orgId);
    } catch {
      reply("Faturaları okuyamadım.", { engine: "local" }, viaVoice);
      return true;
    }
    const { pick, list: many } = pickInvoice(it.t, list, it.op === "assign" ? "paid" : "any");
    if (!pick) {
      reply(many.length ? `Hangi fatura? ${many.slice(0, 4).map((x) => x.seller).join(", ")}. Firmanın adıyla söyle.` : "Fatura bulamadım.", { engine: "local", nav: "invoices" }, viaVoice);
      return true;
    }
    if (it.op === "delete") {
      askOk(`${pick.seller} faturası (${amountText(pick)}) dosyası ve görevi ile silinsin mi? Geri alınamaz.`, "Sil", async (v) => {
        try {
          await deleteInvoice(profile.orgId, pick);
          window.dispatchEvent(new Event("sa-invoices-saved"));
          done(`${pick.seller} faturasını sildim.`, { engine: "local", nav: "invoices" }, v);
        } catch {
          reply("Faturayı silemedim.", { engine: "local" }, v);
        }
      }, viaVoice, /^sil\p{L}*[\s.!]*$/iu);
      return true;
    }
    const who = matchPerson(it.who, members.filter((m) => m.account !== false && m.status !== "left"));
    const m = who ? members.find((x) => x.name === who && x.account !== false) : null;
    if (!m) {
      reply(`${it.who} görev verilebilecek kişiler arasında yok.`, { engine: "local" }, viaVoice);
      return true;
    }
    try {
      let inv = pick;
      if (!inv.taskId || !tasks.some((x) => x.id === inv.taskId)) inv = await ensureTask(profile.orgId, inv, { uid: profile.uid, name: profile.name || "" });
      await updateRecord("task", inv.taskId, { assignees: [m.uid] }, { name: profile.name || "" });
      window.dispatchEvent(new Event("sa-invoices-saved"));
      done(`${pick.seller} faturasının ödeme görevi ${m.name} kişisine verildi, bildirim gitti.`, { engine: "local", nav: "invoices" }, viaVoice);
    } catch {
      reply("Görevi veremedim, tekrar dene.", { engine: "local" }, viaVoice);
    }
    return true;
  }
}

export async function duesCmd(ctx, s, viaVoice, pre = null) {
  const { askOk, done, leave, members, owner, park, profile, reply, router, setPhase } = ctx;
  // Aidat: "aidat hatırlatması gönder" (onayla velilere bildirim), "bu ay kim aidat ödemedi"
  const dc = owner && canSeeAthletes(profile?.email) ? pre || duesCommand(s) : null;
  if (dc) {
    setPhase("thinking");
    const ym = todayStr().slice(0, 7);
    const month = new Date(`${ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long" });
    // Başlangıç ayı ve muafiyet: "Ali'nin aidatı kasımdan başlasın", "Ali bu ay aidattan muaf"
    if (dc.op === "start" || dc.op === "free") {
      const { athletes } = await loadAthletes().catch(() => ({ athletes: [] }));
      const hit = matchPerson(dc.name, athletes.map((a) => a.studentName));
      const a = hit ? athletes.find((x) => x.studentName === hit) : null;
      if (!a) return false;
      const at = monthYm(dc.mon, todayStr());
      const label = new Date(`${at}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
      try {
        if (dc.op === "start") await saveStart(profile.orgId, a.id, at);
        else await saveFree(profile.orgId, at, a.id, !dc.undo);
      } catch {
        reply("Aidat kaydını yazamadım.", { engine: "local", fail: true }, viaVoice);
        return true;
      }
      leave(
        dc.op === "start"
          ? `${a.studentName}: aidat ${label} ayından başlıyor, önceki aylar borç sayılmaz.`
          : dc.undo
            ? `${a.studentName}: ${label} aidatı yeniden sayılıyor.`
            : `${a.studentName}: ${label} aidatı sayılmayacak.`,
        viaVoice,
      );
      return true;
    }
    // Tek sporcu: "Ahmet'in aidat durumu ne" → bu ay, son 6 aydaki borç; sporcu sayfası açılır
    if (dc.op === "one") {
      const { athletes } = await loadAthletes().catch(() => ({ athletes: [] }));
      const hit = matchPerson(dc.name, athletes.map((a) => a.studentName));
      const a = hit ? athletes.find((x) => x.studentName === hit) : null;
      if (!a) return false;
      try {
        const yms = lastMonths(ym, 6);
        const { cfg, months } = await loadDuesRange(profile.orgId, yms);
        park();
        router.push(`/athletes/${a.id}`);
        leave(athleteDuesText(a.studentName, athleteDues(a, cfg, months, yms)), viaVoice);
      } catch {
        reply("Aidat kayıtlarını okuyamadım.", { engine: "local" }, viaVoice);
      }
      return true;
    }
    let list;
    try {
      const { cfg, months } = await loadDuesRange(profile.orgId, [ym]);
      list = unpaidRoster(cfg, months[ym], ym);
    } catch {
      reply("Aidat kayıtlarını okuyamadım.", { engine: "local" }, viaVoice);
      return true;
    }
    if (dc.op === "ask" || !list.length) {
      const names = list.map((x) => x.a.studentName);
      reply(
        !list.length ? `${month} aidatını ödemeyen sporcu görünmüyor.` : `${month} aidatını ${names.length} sporcu ödemedi: ${names.slice(0, 10).join(", ")}${names.length > 10 ? " ve diğerleri" : ""}.`,
        { engine: "local", nav: "dues" },
        viaVoice,
      );
      return true;
    }
    const linked = new Map(members.filter((m) => m.athleteId && m.status !== "left").map((m) => [m.athleteId, m.uid]));
    const inApp = list.filter((x) => linked.has(x.a.id));
    if (!inApp.length) {
      reply(`${list.length} sporcu ödemedi ama velileri uygulamada değil. Aidatlar sayfasından WhatsApp ile hatırlatabilirsin.`, { engine: "local", nav: "dues" }, viaVoice);
      return true;
    }
    askOk(`${month} aidatını ödemeyen ${inApp.length} sporcunun velisine uygulamadan hatırlatma gitsin mi?`, "Gönder", async (v) => {
      setPhase("thinking");
      try {
        const res = await authFetch("/api/notify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event: "dues", ym, ids: inApp.map((x) => linked.get(x.a.id)) }) });
        const d = await res.json().catch(() => ({}));
        const at = new Date().toISOString();
        await setDoc(doc(db, "orgs", profile.orgId, "dues", ym), { reminded: Object.fromEntries(inApp.map((x) => [x.a.id, at])) }, { merge: true }).catch(() => {});
        done(d.parents ? `Hatırlatma ${d.parents} veliye gitti.` : "Bu ay hatırlatılmamış, uygulamada bağlı veli kalmadı.", { engine: "local", nav: "dues" }, v);
      } catch {
        reply("Hatırlatma gönderilemedi.", { engine: "local" }, v);
      }
    }, viaVoice, /^gönder\p{L}*[\s.!]*$/iu);
    return true;
  }
}

// Kulüp nakit çıkışının sözlü özeti: "nakit çıkış, Ali, 500 TL (yakıt)" · kişisiz: "nakit çıkış, 200 TL"
const outText = (kc, tl) => `nakit çıkış, ${kc.who ? `${kc.who}, ` : ""}${tl(kc.amount)}${kc.cat !== "Diğer" ? ` (${kc.cat.toLocaleLowerCase("tr-TR")})` : ""}`;

export async function cashCmd(ctx, s, viaVoice) {
  const { done, owner, profile, reply, setPhase } = ctx;
  // Kasa çıkışı, kişisel gelir/gider/borç ve kasa sorusu (Hesaplar): "kulüpten Ali'ye 500 nakit verildi", "kişisel gider 300 market"
  const kc = owner ? cashCommand(s) : null;
  if (kc) {
    setPhase("thinking");
    const tl = (n) => `${money(n).replace(/,00$/, "")} TL`;
    try {
      if (kc.op === "archive") {
        const cd = await loadCash(profile.uid);
        const old = kasaOf(cd.moves, cd.meta).old;
        if (!old.length) {
          reply("Arşivlenecek eski nakit girişi yok.", { engine: "local", nav: "accounts" }, viaVoice);
          return true;
        }
        await soon(archiveCash(profile.uid, old.map((x) => x.key)), 2500, "Kasa");
        done(`${old.length} eski nakit girişini arşivledim. Kasaya sayılmaz, Hesaplar › Kulüp › Arşiv'den geri alınır.`, { engine: "local", nav: "accounts" }, viaVoice);
        return true;
      }
      if (kc.op === "conv") {
        if (!(kc.amount > 0)) {
          reply("Hangi tutarı nakite çevirdin? Tutarıyla söyler misin? (ör. gelen 20 bin lirayı nakite çevirdim)", { fail: true, engine: "local" }, viaVoice);
          return true;
        }
        const ymNow = todayStr().slice(0, 7);
        const ymPrev = new Date(Date.parse(`${ymNow}-15T12:00:00Z`) - 31 * 864e5).toISOString().slice(0, 7);
        const [{ movements }, conv] = await Promise.all([loadMovementsRange(profile.uid, ymPrev, ymNow), loadConv(profile.uid)]);
        const m = convPick(movements, kc.amount, conv);
        if (!m) {
          reply(`Son iki ayın banka hareketlerinde ${tl(kc.amount)} bulamadım. Hesaplar'da harekete dokunup "Nakite çevir" diyebilirsin.`, { fail: true, engine: "local", nav: "accounts" }, viaVoice);
          return true;
        }
        await soon(convertToCash(profile.uid, m), 2500, "Kasa");
        done(`Kulüp kasasına ekledim: ${tl(kc.amount)} nakit (${m.date?.slice(0, 10) || "banka"}${whoIn(m) ? `, ${whoIn(m)}` : ""}). Kişisel hesabında artık sayılmaz.`, { engine: "local", nav: "accounts" }, viaVoice);
        return true;
      }
      if (kc.op === "edit") {
        const r = await loadCash(profile.orgId);
        const key = (x) => String(x || "").toLocaleLowerCase("tr-TR");
        const all = [...r.moves, ...r.personal].filter(canEditCash).sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")));
        const hit = all.filter((x) => (!kc.amount || Math.abs(Math.abs(x.amount) - kc.amount) < 0.01) && (!kc.who || key(x.who).includes(key(kc.who))) && (!kc.cat || x.cat === kc.cat) && (!kc.dir || x.dir === kc.dir));
        const x = hit[0];
        if (!x) {
          reply("Düzeltilecek kaydı bulamadım. Tutarıyla söyler misin? (ör. kasadaki 200 liralık çıkışın türünü yakıt yap)", { fail: true, engine: "local", nav: "accounts" }, viaVoice);
          return true;
        }
        const day = x.ts ? new Date(x.ts).toISOString().slice(0, 10) : todayStr();
        await soon(updateIncome(profile.orgId, x.incomeId, { dir: x.dir, cat: kc.field === "cat" ? kc.value : x.cat, who: kc.field === "who" ? kc.value : x.who, amount: Math.abs(x.amount), date: day, note: x.memo }), 2500, "Kasa");
        const what = `${tl(Math.abs(x.amount))} ${x.book === "personal" ? "kişisel kayıt" : x.dir === "out" ? "nakit çıkış" : "nakit giriş"}${x.who && kc.field !== "who" ? `, ${x.who}` : ""}`;
        done(`Düzelttim: ${what}, ${kc.field === "cat" ? "türü" : "adı"} artık ${kc.value}.`, { engine: "local", nav: "accounts" }, viaVoice);
        return true;
      }
      if (kc.op === "ask") {
        const [r, lent] = await Promise.all([loadCash(profile.orgId), loadDebts(profile.orgId).catch(() => [])]);
        if (kc.book === "club") {
          const k = kasaOf([...r.moves, ...debtMoves(lent)], r.meta);
          reply(`Kasada ${k.total < 0 ? "eksi " : ""}${tl(Math.abs(k.total))} var. Giriş ${tl(k.in)}, çıkış ${tl(k.out)}.`, { engine: "local", nav: "accounts" }, viaVoice);
        } else {
          const b = personalOf(r.personal);
          const owed = lent.filter((d) => d.kind === "personal" && leftOf(d) > 0).reduce((n, d) => n + leftOf(d), 0);
          reply(`${b.debts.length ? `${b.debts.length} borcun var, toplam ${tl(b.debt)}: ${b.debts.slice(0, 3).map((x) => `${x.who || "?"} ${tl(-x.amount)}`).join(", ")}.` : "Ödenmemiş borcun yok."}${owed > 0 ? ` Sana borçlu olanlardan ${tl(owed)} geri gelecek.` : ""}`, { engine: "local", nav: "accounts" }, viaVoice);
        }
        return true;
      }
      const save = async (v) => {
        try {
          await soon(addIncome(profile.orgId, { book: kc.book, dir: kc.dir, cat: kc.cat, who: kc.who, amount: kc.amount, date: todayStr(), note: kc.note }), 2500, "Kasa");
          if (kc.book === "club" && kc.who) saveCashName(profile.orgId, kc.who).catch(() => {}); // sonraki seferde "Kime verildi" seçeneği
          const what = kc.book === "club" ? `${outText(kc, tl)}. Kasadan düştüm.` : kc.dir === "debt" ? `borcun, ${kc.who ? `${kc.who}, ` : ""}${tl(kc.amount)}. Kişisel defterde.` : `kişisel ${kc.dir === "in" ? "gelir" : "gider"}, ${kc.cat}, ${tl(kc.amount)}. Kulüpten ayrı tutulur.`;
          done(`Ekledim: ${what}`, { engine: "local", nav: "accounts" }, v);
        } catch {
          reply("Kaydedemedim, tekrar dene.", { fail: true, engine: "local" }, v);
        }
      };
      // Kulüp kasasından para çıkışı: kaydetmeden önce kısa onay (para işi); kişi söylenmediyse fişsiz çıkış olarak yazılır
      if (kc.book === "club") {
        const extra = [kc.who, kc.cat !== "Diğer" && kc.cat.toLocaleLowerCase("tr-TR")].filter(Boolean).join(", ");
        ctx.askOk(`Kasadan ${tl(kc.amount)} nakit çıkış yazılsın mı?${extra ? ` (${extra})` : ""}`, "Ekle", save, viaVoice, /^(ekle|yaz|kaydet)/i);
        return true;
      }
      await save(viaVoice);
    } catch {
      reply("Kaydedemedim, tekrar dene.", { fail: true, engine: "local" }, viaVoice);
    }
    return true;
  }
}

export async function incomeCmd(ctx, s, viaVoice, pre = null) {
  const { done, owner, profile, reply, setPhase } = ctx;
  // Nakit gelir (Hesaplar): "Ali Kaya'nın ekim aidatı nakit 1500 alındı", "Ahmet'ten 2000 lira bağış geldi"
  const ic = owner ? pre || incomeCommand(s, todayStr()) : null;
  if (ic) {
    setPhase("thinking");
    const date = todayStr();
    try {
      if (ic.cat === "Aidat") {
        const { roster, cfg } = await loadCash(profile.orgId);
        const name = ic.who ? matchPerson(ic.who, roster.map((a) => a.studentName)) : "";
        const a = name ? roster.find((x) => x.studentName === name) : null;
        // Bulunamadı / birden çok aynı ad / tutar yok: kaydedilmedi, iş ✗ (önceden ✓ görünüyordu; denetim B4, B17)
        if (!a) {
          const many = ic.who ? sameNamed(ic.who, roster.map((x) => x.studentName)) : [];
          const msg = many.length ? `${many.length} ${ic.who} var: ${many.join(", ")}. Hangisinin aidatı? Soyadıyla yeniden söyler misin?` : ic.who ? `${ic.who} aidat listesinde yok, kaydetmedim. Adını soyadıyla yeniden söyler misin?` : "Hangi sporcunun aidatı? Adını söyler misin?";
          reply(msg, { fail: true, engine: "local" }, viaVoice);
          return true;
        }
        const amount = ic.amount || feeOf(a, cfg);
        if (!amount) {
          reply(`${a.studentName} ne kadar ödedi? Aidat tutarı ayarlı değil, kaydetmedim. Tutarla yeniden söyler misin?`, { fail: true, engine: "local" }, viaVoice);
          return true;
        }
        await soon(addIncome(profile.orgId, { cat: "Aidat", who: a.studentName, athleteId: a.id, ym: ic.ym, amount, date }), 2500, "Aidat");
        const m = new Date(`${ic.ym}-15T12:00:00`).toLocaleDateString("tr-TR", { month: "long" });
        done(`Ekledim: ${a.studentName}, ${m} aidatı, nakit ${money(amount).replace(/,00$/, "")} TL. Aidatlar'da ödendi görünür.`, { engine: "local", nav: "accounts" }, viaVoice);
        return true;
      }
      await soon(addIncome(profile.orgId, { cat: ic.cat, who: ic.who, amount: ic.amount, date, note: ic.note }), 2500, "Gelir");
      done(`Ekledim: ${ic.cat} geliri${ic.who ? `, ${ic.who}` : ""}, ${money(ic.amount).replace(/,00$/, "")} TL. Hesaplar'da görünür.`, { engine: "local", nav: "accounts" }, viaVoice);
    } catch {
      reply("Geliri kaydedemedim, tekrar dene.", { engine: "local" }, viaVoice);
    }
    return true;
  }
}
