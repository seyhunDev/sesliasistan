import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { ackSig, pushReady, sendTo as sendPush } from "@/lib/server/pushSend";
import { TLk, totalOf } from "@/lib/receipts";
import { payLine } from "@/lib/invoices";
import { addedText, assignedText, cancelledText, changedText, doneText, paidText, receiptNewText } from "@/lib/notifyText";
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
//   { kind, id, event }      -> "done": kişi tamamladı ("reply" artık yok sayılır). Kaydı veren, ana hesap ve diğer kişilere
//                               (ekleyen hariç). Metin istemciden değil kayıttan okunur; yalnızca son 2 dakikadaki tamamlama.
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ ok: false, skipped: "ayar eksik" });
  let body = {};
  try {
    body = await request.json();
  } catch {}
  const me = await profileOf(au.uid);

  // ---- Bugünün yoklaması alındı: ana hesabın kaydına yazılır (attLast). Yoklama hatırlatması buna bakar (lib/attRemind.js).
  //      Çalışan da yoklama alabildiği için sunucu yazar; kulüp sitesinden girilen yoklama sporcular okununca bildirilir ----
  if (body?.event === "attTaken") {
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
    if (body.date !== today) return NextResponse.json({ ok: true, skipped: "bugün değil" });
    await adminDb().collection("users").doc(me.orgId).set({ attLast: today }, { merge: true });
    return NextResponse.json({ ok: true });
  }
  if (!pushReady()) return NextResponse.json({ ok: false, skipped: "ayar eksik" });
  // Gönderenin kendi cihazlarına hiç gitmez (aynı telefon başka bir hesapta da kayıtlı olabilir)
  const mine = new Set(me.devices);
  const sendTo = (u, payload) => sendPush(u, payload, mine);
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
    const owe = new Map(unpaidRoster(c.data() || {}, m.data() || {}, ym).map((x) => [x.a.id, x]));
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
      sent += await sendAll(to, (u) => sendTo(u, { ...msg, tag: `dues-${mid}-${ym}`, url: "/?bildirim=1" }));
      await ref.update({ [`duesSent.${ym}`]: new Date().toISOString() });
    }
    return NextResponse.json({ ok: true, sent, parents });
  }

  // ---- Fitness: ana hesabın sporcuya hazırladığı program (fitPrograms/{id}.for). Sporcuya tek bildirim, bir kez (notifiedAt) ----
  if (body?.event === "fitProgram") {
    if (me.role !== "owner") return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    const ref = org.collection("fitPrograms").doc(String(body.id || "").slice(0, 128) || "-");
    const p = (await ref.get()).data();
    if (!p?.for || p.notifiedAt) return NextResponse.json({ ok: true, skipped: p ? "gönderildi" : "program yok" });
    const sent = await sendTo(p.for, { title: "Yeni fitness programın hazır", body: String(p.title || "Antrenman programı").slice(0, 80), tag: `fit-${ref.id}`, url: "/fitness" });
    await ref.update({ notifiedAt: new Date().toISOString() });
    return NextResponse.json({ ok: true, sent });
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

  // Kayıtlarda mesajlaşma kalktı (2026-10-13): eski uygulamadan gelen "reply" bildirimi gönderilmez
  if (COLS[body?.kind] && body.event === "reply") return NextResponse.json({ ok: true, skipped: "kayıtta mesaj yok" });
  if (COLS[body?.kind] && body.event === "done") {
    const kind = body.kind;
    const ref = org.collection(COLS[kind]).doc(String(body.id || ""));
    const r = (await ref.get()).data();
    if (!r) return NextResponse.json({ error: "Kayıt yok" }, { status: 404 });
    const involved = me.role === "owner" || r.createdByUid === au.uid || (r.people || []).includes(au.uid) || (r.assignees || []).includes(au.uid);
    if (!involved) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    const fresh = (at) => at && Date.now() - Date.parse(at) < 2 * 60e3;
    if (!fresh(r.doneBy?.[au.uid])) return NextResponse.json({ ok: true, skipped: "tamamlama yok" });
    const msg = doneText({ kind, title: r.title, from: me.name });
    const to = [...new Set([r.createdByUid, me.orgId, ...(r.assignees || [])])].filter((u) => u && u !== au.uid);
    const sent = await sendAll(to, (u) => sendTo(u, { ...msg, tag: `done-${kind}-${ref.id}`, url: `/?open=${kind}:${ref.id}` }));
    return NextResponse.json({ ok: true, sent });
  }

  // ---- Atama ----
  if (COLS[body?.kind]) {
    const kind = body.kind;
    const ref = org.collection(COLS[kind]).doc(String(body.id || ""));
    const r = (await ref.get()).data();
    if (!r) return NextResponse.json({ error: "Kayıt yok" }, { status: 404 });
    if (me.role !== "owner" && r.createdByUid !== au.uid) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    // retry ("Yeniden gönder"): telefonuna henüz gitmemiş sorumlulara yeniden dener
    const to = (r.assignees || []).filter((u) => u !== au.uid && (body.retry ? !r.ack?.[u]?.s || r.ack?.[u]?.x : !r.notified?.[u]));
    // Kişinin (çalışan, sporcu…) az önce eklediği kayıt: ana hesaba "yeni kayıt" bildirimi (bir kez)
    const byMember = au.uid !== me.orgId && r.createdByUid === au.uid && !r.notified?.[me.orgId] && Date.now() - Date.parse(r.createdAt || 0) < 2 * 60e3;
    if (byMember && !to.includes(me.orgId)) to.push(me.orgId);
    if (!to.length) return NextResponse.json({ ok: true, sent: 0 });
    const info = { kind, title: r.title, date: r.date, time: r.time, due: r.due, place: r.place, pay: payLine(r.invoice), from: me.name || "Ana hesap" };
    const msg = assignedText(info);
    const now = new Date().toISOString();
    const patch = {};
    const assignee = (u) => (r.assignees || []).includes(u);
    const fail = []; // telefonuna gitmeyen sorumlular: ana hesaba hemen söylenir
    const sent = await sendAll(to, async (u) => {
      const out = {};
      const n = await sendPush(
        u,
        {
          ...(byMember && u === me.orgId ? addedText(info) : msg),
          tag: `${kind}-${ref.id}`,
          url: `/?open=${kind}:${ref.id}`,
          ...(assignee(u) && { ack: { o: me.orgId, c: COLS[kind], i: ref.id, u, s: ackSig(me.orgId, COLS[kind], ref.id, u) } }),
        },
        mine,
        out,
      );
      // Gitmediyse işaretlenmez: kayıt sonra kaydedilince (ya da "Yeniden gönder") tekrar denenir. Neden ekranda yazar.
      if (n) patch[`notified.${u}`] = now;
      if (assignee(u)) {
        if (n) {
          patch[`ack.${u}.s`] = now; // en az bir cihaza gönderildi ("iletildi" yalnız sorumlular için)
          if (r.ack?.[u]?.x) patch[`ack.${u}.x`] = FieldValue.delete();
        } else {
          patch[`ack.${u}.x`] = { why: out.why || "device", ...(out.msg ? { msg: String(out.msg).slice(0, 160) } : {}), at: now };
          fail.push({ u, why: out.why || "device", ...(out.msg ? { msg: out.msg } : {}) });
        }
      }
      return n;
    });
    if (Object.keys(patch).length) await ref.update(patch);
    return NextResponse.json({ ok: true, sent, fail });
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
