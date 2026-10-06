import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { ackSig, pushReady, sendTo } from "@/lib/server/pushSend";
import { TLk, totalOf } from "@/lib/receipts";
import { payLine } from "@/lib/invoices";
import { addedText, assignedText, cancelledText, changedText, doneText, paidText, receiptNewText, replyText } from "@/lib/notifyText";
import { unseenNotes } from "@/lib/people";
import { GROUPS, GROUP_IDS, kindOf } from "@/lib/kinds";
import { absentPush } from "@/lib/absent";
import { remindPush, unpaidRoster } from "@/lib/duesRemind";

export const runtime = "nodejs";

const COLS = { plan: "plans", task: "tasks", note: "notes" };
const CANCEL_WHY = { wind: "rüzgâr", weather: "hava", other: "" };

// Alıcılara aynı anda gönderir; birinin hatası diğerlerini durdurmaz. Gönderilen cihaz sayısını döndürür.
async function sendAll(list, fn) {
  const res = await Promise.all(list.map((u) => Promise.resolve().then(() => fn(u)).catch((e) => (console.error("[notify]", u, e?.message), 0))));
  return res.reduce((a, n) => a + (Number(n) || 0), 0);
}

// Bildirim gönderir:
//   { receiptId }            -> fiş ödendi: fişi ekleyen kişiye
//   { kind, id } (atama)     -> kayıt sorumlularına "sana atandı" (her kişiye bir kez); gönderim zamanı ack.{uid}.s olarak yazılır
//   { kind, id, event }      -> "reply": kayda not eklendi, "done": kişi tamamladı. Kaydı veren, ana hesap ve diğer kişilere
//                               (ekleyen hariç). Metin istemciden değil kayıttan okunur; yalnızca son 2 dakikadaki not/tamamlama.
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady() || !pushReady()) return NextResponse.json({ ok: false, skipped: "ayar eksik" });
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const me = await profileOf(au.uid);
  const db = adminDb();
  const org = db.collection("orgs").doc(me.orgId);

  // ---- Sohbet mesajı: sohbetin diğer üyelerine (sessize alan ve o an sohbette olan hariç) ----
  if (body?.event === "chat") {
    const cid = String(body.chat || "");
    if (!/^[\w-]{1,120}$/.test(cid)) return NextResponse.json({ error: "Geçersiz sohbet" }, { status: 400 });
    const cref = org.collection("chats").doc(cid);
    const c = (await cref.get()).data();
    if (!c) return NextResponse.json({ error: "Sohbet yok" }, { status: 404 });
    // Sabit gruplar (Ekip, Aile, Sporcular): ana hesap + o gruba giren türdeki hesaplı kişiler; diğerleri: members
    const everyone = GROUP_IDS.includes(cid)
      ? [
          me.orgId,
          ...(await org.collection("members").get()).docs
            .filter((d) => d.data().account !== false && d.data().status !== "left" && GROUPS[cid].has(kindOf(d.data())))
            .map((d) => d.id),
        ]
      : c.members || [];
    if (!everyone.includes(au.uid)) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    const m = (await cref.collection("messages").doc(String(body.mid || "")).get()).data();
    const at = m?.at?.toMillis?.() || 0;
    if (!m || m.by !== au.uid || Date.now() - at > 2 * 60e3) return NextResponse.json({ ok: true, skipped: "mesaj yok" });
    const from = me.name || (au.uid === me.orgId ? "Ana hesap" : "Kişi");
    const title = c.type === "dm" ? from : GROUPS[cid]?.name || c.name || "Grup";
    const text = String(m.text || "").replace(/\s+/g, " ").slice(0, 160);
    // Herkese aynı anda: sırayla gönderilince kalabalık grupta süre doluyor, son kişilere bildirim gitmiyordu
    const sent = await sendAll(
      [...new Set(everyone)].filter((x) => x && x !== au.uid && !c.muted?.[x]),
      async (u) => {
        const v = (await db.collection("users").doc(u).get()).data()?.viewing;
        if (v?.key === `chat-${cid}` && Date.now() - Date.parse(v.at || 0) < 75e3) return 0;
        return sendTo(u, { title, body: c.type === "dm" ? text : `${from}: ${text}`, tag: `chat-${cid}`, url: `/messages?c=${cid}` });
      },
    );
    return NextResponse.json({ ok: true, sent });
  }

  // ---- Yoklama: gelmeyen sporcuların uygulamadaki velilerine (yalnız ana hesap; kayıt yoklama kopyasından okunur) ----
  if (body?.event === "absent") {
    if (me.role !== "owner") return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    const date = String(body.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).filter((x) => /^[\w-]{1,128}$/.test(x)).slice(0, 60);
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
    let sent = 0;
    let parents = 0;
    for (const mid of ids) {
      const ref = org.collection("athleteAtt").doc(mid);
      const r = (await ref.get()).data();
      if (!r || r.att?.[date] !== "absent" || r.absentSent?.[date]) continue; // bir gün için bir kez
      const to = (r.parents || []).filter(Boolean);
      if (!to.length) continue;
      parents += to.length;
      const msg = absentPush(r.name, date, today);
      sent += await sendAll(to, (u) => sendTo(u, { ...msg, tag: `absent-${mid}-${date}`, url: "/my-attendance" }));
      await ref.update({ [`absentSent.${date}`]: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true, sent, parents });
  }

  // ---- Aidat hatırlatması: bu ay ödemeyen sporcuların uygulamadaki velilerine (yalnız ana hesap). Tutar istemciden değil
  //      aidat kayıtlarından (dues/settings + dues/{ay}) okunur; ödemiş sporcuya ve aynı ay ikinci kez gitmez ----
  if (body?.event === "dues") {
    if (me.role !== "owner") return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    const ym = String(body.ym || "");
    if (!/^\d{4}-\d{2}$/.test(ym)) return NextResponse.json({ error: "Geçersiz ay" }, { status: 400 });
    const ids = (Array.isArray(body.ids) ? body.ids : []).map(String).filter((x) => /^[\w-]{1,128}$/.test(x)).slice(0, 80);
    const dues = org.collection("dues");
    const [c, m] = await Promise.all([dues.doc("settings").get(), dues.doc(ym).get()]);
    const owe = new Map(unpaidRoster(c.data() || {}, m.data() || {}).map((x) => [x.a.id, x]));
    let sent = 0;
    let parents = 0;
    for (const mid of ids) {
      const ref = org.collection("athleteAtt").doc(mid);
      const r = (await ref.get()).data();
      const x = r && owe.get(r.athleteId);
      if (!x || r.duesSent?.[ym]) continue;
      const to = (r.parents || []).filter(Boolean);
      if (!to.length) continue;
      parents += to.length;
      const msg = remindPush(x, ym);
      sent += await sendAll(to, (u) => sendTo(u, { ...msg, tag: `dues-${mid}-${ym}`, url: "/" }));
      await ref.update({ [`duesSent.${ym}`]: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true, sent, parents });
  }

  // ---- Silme bildirim göndermez (Seyhun'un kuralı): silinen kayıt ve çalışanın silme isteği için bildirim yok.
  //      Silme isteği ana hesapta "Senin için" listesinde karar olarak görünür. Eski sürüm uygulamalar çağırırsa yok sayılır. ----
  if (body?.event === "deleted" || body?.event === "deleteReq") return NextResponse.json({ ok: true, skipped: "silme bildirimi yok" });

  // ---- Kayıt değişti: kayıttaki diğer kişilere (değiştiren hariç). Metin kayıttan okunur ----
  if (COLS[body?.kind] && body.event === "changed") {
    const kind = body.kind;
    const ref = org.collection(COLS[kind]).doc(String(body.id || ""));
    const r = (await ref.get()).data();
    if (!r) return NextResponse.json({ ok: true, skipped: "kayıt yok" });
    if (me.role !== "owner" && r.createdByUid !== au.uid) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    if (!(r.updatedAt && Date.now() - Date.parse(r.updatedAt) < 2 * 60e3)) return NextResponse.json({ ok: true, skipped: "değişiklik yok" });
    const to = [...new Set([r.createdByUid, me.orgId, ...(r.people || []), ...(r.assignees || [])])].filter((u) => u && u !== au.uid);
    const info = { kind, title: r.title, date: r.date, time: r.time, due: r.due, place: r.place, pay: payLine(r.invoice), from: me.name || "Ana hesap" };
    const msg = kind === "plan" && r.status === "cancelled" ? cancelledText({ ...info, reason: CANCEL_WHY[r.cancelReason] || "" }) : changedText(info);
    const sent = await sendAll(to, (u) => sendTo(u, { ...msg, tag: `${kind}-${ref.id}`, url: `/?open=${kind}:${ref.id}` }));
    return NextResponse.json({ ok: true, sent });
  }

  if (COLS[body?.kind] && (body.event === "reply" || body.event === "done")) {
    const kind = body.kind;
    const ref = org.collection(COLS[kind]).doc(String(body.id || ""));
    const r = (await ref.get()).data();
    if (!r) return NextResponse.json({ error: "Kayıt yok" }, { status: 404 });
    const involved = me.role === "owner" || r.createdByUid === au.uid || (r.people || []).includes(au.uid) || (r.assignees || []).includes(au.uid);
    if (!involved) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    const fresh = (at) => at && Date.now() - Date.parse(at) < 2 * 60e3;
    let msg;
    if (body.event === "reply") {
      const last = (r.replies?.[au.uid] || []).at(-1);
      if (!fresh(last?.at)) return NextResponse.json({ ok: true, skipped: "yeni not yok" });
      msg = replyText({ kind, title: r.title, from: me.name, text: last.text });
      // Rozet hesabı (pushSend unreadCount) eski kayıtlarda da yeni notu bulsun diye son not zamanı
      await ref.update({ replyAt: last.at }).catch(() => {});
    } else {
      if (!fresh(r.doneBy?.[au.uid])) return NextResponse.json({ ok: true, skipped: "tamamlama yok" });
      msg = doneText({ kind, title: r.title, from: me.name });
    }
    const to = [...new Set([r.createdByUid, me.orgId, ...(r.assignees || [])])].filter((u) => u && u !== au.uid);
    const sent = await sendAll(to, async (u) => {
      // Alıcı şu an bu kaydın konuşmasındaysa (uygulama açık, ekranda) telefona bildirim gönderilmez: mesaj zaten önünde
      if (body.event === "reply") {
        const v = (await db.collection("users").doc(u).get()).data()?.viewing;
        if (v?.key === `${kind}-${ref.id}` && Date.now() - Date.parse(v.at || 0) < 75e3) return 0;
      }
      // Not: alıcının henüz görmediği not sayısı başlığa yazılır; aynı etiket telefonda öncekinin yerine geçer (yığılmaz)
      const n = body.event === "reply" ? Math.max(1, unseenNotes(r, u).length) : 1;
      const m = n > 1 ? replyText({ kind, title: r.title, from: me.name, text: (r.replies?.[au.uid] || []).at(-1)?.text, n }) : msg;
      return sendTo(u, { ...m, tag: `${body.event}-${kind}-${ref.id}`, url: `/?open=${kind}:${ref.id}` });
    });
    return NextResponse.json({ ok: true, sent });
  }

  // ---- Atama ----
  if (COLS[body?.kind]) {
    const kind = body.kind;
    const ref = org.collection(COLS[kind]).doc(String(body.id || ""));
    const r = (await ref.get()).data();
    if (!r) return NextResponse.json({ error: "Kayıt yok" }, { status: 404 });
    if (me.role !== "owner" && r.createdByUid !== au.uid) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    const to = (r.assignees || []).filter((u) => u !== au.uid && !r.notified?.[u]);
    // Kişinin (çalışan, sporcu…) az önce eklediği kayıt: ana hesaba "yeni kayıt" bildirimi (bir kez)
    const byMember = au.uid !== me.orgId && r.createdByUid === au.uid && !r.notified?.[me.orgId] && Date.now() - Date.parse(r.createdAt || 0) < 2 * 60e3;
    if (byMember && !to.includes(me.orgId)) to.push(me.orgId);
    if (!to.length) return NextResponse.json({ ok: true, sent: 0 });
    const info = { kind, title: r.title, date: r.date, time: r.time, due: r.due, place: r.place, pay: payLine(r.invoice), from: me.name || "Ana hesap" };
    const msg = assignedText(info);
    const now = new Date().toISOString();
    const patch = {};
    const assignee = (u) => (r.assignees || []).includes(u);
    const sent = await sendAll(to, async (u) => {
      const n = await sendTo(u, {
        ...(byMember && u === me.orgId ? addedText(info) : msg),
        tag: `${kind}-${ref.id}`,
        url: `/?open=${kind}:${ref.id}`,
        ...(assignee(u) && { ack: { o: me.orgId, c: COLS[kind], i: ref.id, u, s: ackSig(me.orgId, COLS[kind], ref.id, u) } }),
      });
      patch[`notified.${u}`] = now; // bir daha gönderilmesin
      if (n && assignee(u)) patch[`ack.${u}.s`] = now; // en az bir cihaza gönderildi ("iletildi" yalnız sorumlular için)
      return n;
    });
    await ref.update(patch);
    return NextResponse.json({ ok: true, sent });
  }

  const id = String(body?.receiptId || "");
  if (!id) return NextResponse.json({ error: "Kayıt belirtilmedi" }, { status: 400 });
  // ---- Çalışan/aile fiş ekledi: ödeme bekliyor (ana hesaba) ----
  if (body.event === "new") {
    const r = (await org.collection("receipts").doc(id).get()).data();
    const fresh = r && Date.now() - Date.parse(r.createdAt || 0) < 2 * 60e3;
    if (!r || r.createdByUid !== au.uid || r.payStatus !== "pending" || !fresh || au.uid === me.orgId) return NextResponse.json({ ok: true, skipped: "bildirim gerekmiyor" });
    const sent = await sendTo(me.orgId, { ...receiptNewText({ merchant: r.merchant, amount: TLk(totalOf(r)), from: me.name }), tag: `pay-${id}`, url: `/receipts/${id}` });
    return NextResponse.json({ ok: true, sent });
  }
  // ---- Fiş ödendi ----
  if (me.role !== "owner") return NextResponse.json({ error: "Yalnızca ana hesap" }, { status: 403 });
  const r = (await org.collection("receipts").doc(id).get()).data();
  if (!r || r.payStatus !== "paid" || !r.createdByUid || r.createdByUid === au.uid) return NextResponse.json({ ok: false, skipped: "bildirim gerekmiyor" });
  const sent = await sendTo(r.createdByUid, { ...paidText({ merchant: r.merchant, amount: TLk(totalOf(r)) }), tag: `paid-${id}`, url: `/receipts/${id}` });
  return NextResponse.json({ ok: true, sent });
}
