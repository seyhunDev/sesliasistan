import { NextResponse } from "next/server";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { ackSig, pushReady, sendTo } from "@/lib/server/pushSend";
import { TLk, totalOf } from "@/lib/receipts";

export const runtime = "nodejs";

const COLS = { plan: "plans", task: "tasks", note: "notes" };
const HEAD = { plan: "Yeni plan", task: "Sana yeni görev", note: "Yeni not" };
const dm = (s) => (s ? new Date(`${s}T00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short", timeZone: "Europe/Istanbul" }) : "");

// Bildirim gönderir:
//   { receiptId }            -> fiş ödendi: fişi ekleyen kişiye
//   { kind, id } (atama)     -> kayıt sorumlularına "sana atandı" (her kişiye bir kez); gönderim zamanı ack.{uid}.s olarak yazılır
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

  // ---- Atama ----
  if (COLS[body?.kind]) {
    const kind = body.kind;
    const ref = org.collection(COLS[kind]).doc(String(body.id || ""));
    const r = (await ref.get()).data();
    if (!r) return NextResponse.json({ error: "Kayıt yok" }, { status: 404 });
    if (me.role !== "owner" && r.createdByUid !== au.uid) return NextResponse.json({ error: "Yetki yok" }, { status: 403 });
    const to = (r.assignees || []).filter((u) => u !== au.uid && !r.notified?.[u]);
    if (!to.length) return NextResponse.json({ ok: true, sent: 0 });
    const from = me.name || "Ana hesap";
    const when = kind === "plan" ? [dm(r.date), r.time].filter(Boolean).join(" ") : kind === "task" && r.due ? `son gün ${dm(r.due)}` : "";
    const now = new Date().toISOString();
    const patch = {};
    let sent = 0;
    for (const u of to) {
      const n = await sendTo(u, {
        title: `${HEAD[kind]}: ${r.title || ""}`.trim(),
        body: [when, `${from} ekledi`].filter(Boolean).join(" · "),
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

  // ---- Fiş ödendi ----
  const id = String(body?.receiptId || "");
  if (!id) return NextResponse.json({ error: "Kayıt belirtilmedi" }, { status: 400 });
  if (me.role !== "owner") return NextResponse.json({ error: "Yalnızca ana hesap" }, { status: 403 });
  const r = (await org.collection("receipts").doc(id).get()).data();
  if (!r || r.payStatus !== "paid" || !r.createdByUid || r.createdByUid === au.uid) return NextResponse.json({ ok: false, skipped: "bildirim gerekmiyor" });
  const sent = await sendTo(r.createdByUid, { title: "Fiş ödendi ✓", body: `${r.merchant || "Fiş"} · ${TLk(totalOf(r))} ödemen yapıldı.`, tag: `paid-${id}`, url: `/receipts/${id}` });
  return NextResponse.json({ ok: true, sent });
}
