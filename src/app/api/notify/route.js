import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { ackSig, pushReady, sendTo } from "@/lib/server/pushSend";
import { TLk, totalOf } from "@/lib/receipts";
import { assignedText, changedText, deleteReqText, deletedText, doneText, paidText, receiptNewText, replyText } from "@/lib/notifyText";
import { unseenNotes } from "@/lib/people";
import { GROUPS, GROUP_IDS, kindOf } from "@/lib/kinds";

export const runtime = "nodejs";

const COLS = { plan: "plans", task: "tasks", note: "notes" };

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
    let sent = 0;
    for (const u of [...new Set(everyone)].filter((x) => x && x !== au.uid)) {
      if (c.muted?.[u]) continue;
      const v = (await db.collection("users").doc(u).get()).data()?.viewing;
      if (v?.key === `chat-${cid}` && Date.now() - Date.parse(v.at || 0) < 75e3) continue;
      sent += await sendTo(u, { title, body: c.type === "dm" ? text : `${from}: ${text}`, tag: `chat-${cid}`, url: `/messages?c=${cid}` });
    }
    return NextResponse.json({ ok: true, sent });
  }

  // ---- Not eklendi / tamamlandı ----
  // ---- Silme isteği (çalışan kendi kaydı için): yalnızca ana hesaba ----
  const DEL_COLS = { ...COLS, receipt: "receipts", birthday: "birthdays", lesson: "lessons" };
  if (DEL_COLS[body?.kind] && body.event === "deleteReq") {
    const ref = org.collection(DEL_COLS[body.kind]).doc(String(body.id || ""));
    const r = (await ref.get()).data();
    if (!r) return NextResponse.json({ error: "Kayıt yok" }, { status: 404 });
    const req = r.deleteReq;
    if (!req || req.by !== au.uid || r.createdByUid !== au.uid || Date.now() - Date.parse(req.at || 0) > 2 * 60e3) return NextResponse.json({ ok: true, skipped: "istek yok" });
    const title = r.title || r.merchant || r.name || "";
    const sent = await sendTo(me.orgId, { ...deleteReqText({ kind: body.kind, title, from: me.name }), tag: `delreq-${body.kind}-${ref.id}`, url: "/" });
    return NextResponse.json({ ok: true, sent });
  }

  // ---- Kayıt değişti / silindi: kayıttaki diğer kişilere (değiştiren hariç). Metin kayıttan okunur ----
  if (COLS[body?.kind] && (body.event === "changed" || body.event === "deleted")) {
    const kind = body.kind;
    const ref = org.collection(COLS[kind]).doc(String(body.id || ""));
    const r = (await ref.get()).data();
    if (!r) return NextResponse.json({ ok: true, skipped: "kayıt yok" });
    if (me.role !== "owner" && r.createdByUid !== au.uid) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    if (body.event === "changed" && !(r.updatedAt && Date.now() - Date.parse(r.updatedAt) < 2 * 60e3)) return NextResponse.json({ ok: true, skipped: "değişiklik yok" });
    const to = [...new Set([r.createdByUid, me.orgId, ...(r.people || []), ...(r.assignees || [])])].filter((u) => u && u !== au.uid);
    const info = { kind, title: r.title, date: r.date, time: r.time, due: r.due, place: r.place, from: me.name || "Ana hesap" };
    const msg = body.event === "changed" ? changedText(info) : deletedText(info);
    let sent = 0;
    for (const u of to) sent += await sendTo(u, { ...msg, tag: `${kind}-${ref.id}`, url: body.event === "changed" ? `/?open=${kind}:${ref.id}` : "/" });
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
    } else {
      if (!fresh(r.doneBy?.[au.uid])) return NextResponse.json({ ok: true, skipped: "tamamlama yok" });
      msg = doneText({ kind, title: r.title, from: me.name });
    }
    const to = [...new Set([r.createdByUid, me.orgId, ...(r.assignees || [])])].filter((u) => u && u !== au.uid);
    let sent = 0;
    for (const u of to) {
      // Alıcı şu an bu kaydın konuşmasındaysa (uygulama açık, ekranda) telefona bildirim gönderilmez: mesaj zaten önünde
      if (body.event === "reply") {
        const v = (await db.collection("users").doc(u).get()).data()?.viewing;
        if (v?.key === `${kind}-${ref.id}` && Date.now() - Date.parse(v.at || 0) < 75e3) continue;
      }
      // Not: alıcının henüz görmediği not sayısı başlığa yazılır; aynı etiket telefonda öncekinin yerine geçer (yığılmaz)
      const n = body.event === "reply" ? Math.max(1, unseenNotes(r, u).length) : 1;
      const m = n > 1 ? replyText({ kind, title: r.title, from: me.name, text: (r.replies?.[au.uid] || []).at(-1)?.text, n }) : msg;
      sent += await sendTo(u, { ...m, tag: `${body.event}-${kind}-${ref.id}`, url: `/?open=${kind}:${ref.id}` });
    }
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
    if (!to.length) return NextResponse.json({ ok: true, sent: 0 });
    const msg = assignedText({ kind, title: r.title, date: r.date, time: r.time, due: r.due, place: r.place, from: me.name || "Ana hesap" });
    const now = new Date().toISOString();
    const patch = {};
    let sent = 0;
    for (const u of to) {
      const n = await sendTo(u, {
        ...msg,
        tag: `${kind}-${ref.id}`,
        url: `/?open=${kind}:${ref.id}`,
        ack: { o: me.orgId, c: COLS[kind], i: ref.id, u, s: ackSig(me.orgId, COLS[kind], ref.id, u) },
      });
      patch[`notified.${u}`] = now; // bir daha gönderilmesin
      if (n) patch[`ack.${u}.s`] = now; // en az bir cihaza gönderildi
      sent += n;
    }
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
