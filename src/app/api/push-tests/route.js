import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireUser, unauthorized } from "@/lib/server/auth";
import { adminDb, adminReady } from "@/lib/server/admin";
import { ackSig } from "@/lib/server/pushSend";
import { TEST_COL, sendTest } from "@/lib/server/pushTestSend";
import { newTest, oldTests, pendingAt } from "@/lib/pushTest";

export const runtime = "nodejs";

// Bildirim testi (Ayarlar › Testler › Bildirim testi). POST { kind }: deneme kaydı açar. 30 sn denemelerini
// push-test-background bekleyip gönderir; o çalışmazsa ya da hatırlatma denemesinde 5 dakikalık zamanlayıcı gönderir.
// DELETE: deneme kayıtlarını ve zildeki deneme bildirimlerini siler. Kayıtlar yalnız kişinin kendi belgesinde (users/{uid}.pushTests).
export async function POST(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu anahtarı tanımlı değil" }, { status: 503 });
  let kind = "";
  let tz;
  let run = "";
  try {
    const b = await request.json();
    kind = String(b?.kind || "");
    run = typeof b?.run === "string" && /^t[a-z0-9]{1,16}$/.test(b.run) ? b.run : "";
    tz = typeof b?.tz === "string" && /^[\w/+-]{1,40}$/.test(b.tz) ? b.tz : undefined;
  } catch {}
  // Uygulama açıkken zamanı geçen deneme hâlâ gitmediyse sayfa ister, hemen gönderilir (yol: "uygulama")
  if (run) {
    const t = (await adminDb().collection("users").doc(au.uid).get()).data()?.pushTests?.[run];
    if (!t || t.sent || t.kind === "remind" || Date.parse(t.due) > Date.now() + 2000) return NextResponse.json({ ok: true, sent: 0 });
    return NextResponse.json({ ok: true, sent: await sendTest(adminDb(), au.uid, run, "uygulama") });
  }
  const id = `t${Date.now().toString(36)}`;
  const t = newTest(kind, { id, tz });
  if (!t) return NextResponse.json({ error: "Bilinmeyen deneme" }, { status: 400 });
  const ref = adminDb().collection("users").doc(au.uid);
  const u = (await ref.get()).data() || {};
  const tests = u.pushTests || {};
  const old = oldTests(tests);
  const inbox = old.length ? dropTests(u.inbox, old) : null;
  const keep = Object.fromEntries(Object.entries(tests).filter(([k]) => !old.includes(k)));
  await ref.update({
    ...Object.fromEntries(old.map((k) => [`pushTests.${k}`, FieldValue.delete()])),
    ...(inbox && { inbox }),
    [`pushTests.${id}`]: t,
    pushTestAt: pendingAt({ ...keep, [id]: t }),
  });
  // Hatırlatma denemesi gerçek zamanlayıcıyla gider; diğerleri 30 sn bekleyen işlevle. Adres isteğin geldiği site
  // (NETLIFY/URL ortam değişkenleri işlev çalışırken tanımlı olmayabiliyor; önceki sürümde bu yüzden hiç çağrılmıyordu).
  const origin = request.url ? new URL(request.url).origin : "";
  if (kind !== "remind" && origin.startsWith("https://")) {
    await Promise.race([
      fetch(`${origin}/.netlify/functions/push-test-background`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ u: au.uid, i: id, s: ackSig(au.uid, `${TEST_COL}-run`, id, au.uid) }),
      }).catch(() => {}),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  }
  return NextResponse.json({ ok: true, id });
}

// Zildeki deneme bildirimleri (etiket test-…): ids verilirse yalnız onlar. Değişen yoksa null (yazılmaz).
function dropTests(list, ids) {
  if (!Array.isArray(list)) return null;
  const out = list.filter((x) => !(String(x?.tag || "").startsWith("test-") && (!ids || ids.includes(String(x.tag).slice(5)))));
  return out.length === list.length ? null : out;
}

export async function DELETE(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu anahtarı tanımlı değil" }, { status: 503 });
  const ref = adminDb().collection("users").doc(au.uid);
  const inbox = dropTests((await ref.get()).data()?.inbox);
  await ref.update({ pushTests: FieldValue.delete(), pushTestAt: FieldValue.delete(), ...(inbox && { inbox }) });
  return NextResponse.json({ ok: true });
}

// Zamanlayıcının (plan-reminders, 5 dakikada bir) son çalışması: sayfada "çalışıyor mu" görünsün diye
export async function GET(request) {
  const au = await requireUser(request);
  if (!au.ok) return unauthorized(au);
  if (!adminReady()) return NextResponse.json({ error: "Sunucu anahtarı tanımlı değil" }, { status: 503 });
  const d = (await adminDb().collection("system").doc("scheduler").get()).data() || {};
  return NextResponse.json({ start: d.start || "", end: d.end || "", line: d.line || "" });
}
