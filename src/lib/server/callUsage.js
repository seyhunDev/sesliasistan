// Sesli arama kullanımı (Ayarlar › Aramalar, yalnız ana hesap okur; yalnız sunucu yazar).
// Arama bitince iki taraf da kendi ölçtüğünü gönderir (/api/call-stats): arama kaydına stats.<uid> = { sent, recv, relay, sec }
// ve ay sayacına usage/calls_{org}_{YYYY-MM} = { month, org, calls, sec, bytes, relayBytes, warn80, warn100 }.
// TURN (Cloudflare) yalnız relayBytes'ı tüketir; ücretsiz kota (TURN_LIMIT_GB, varsayılan 1.000 GB) %80'e ve sınıra
// gelince ana hesaba bildirim gider; sınır dolunca /api/turn TURN vermez (ücret çıkmasın, arama Wi-Fi'de yine çalışır).
import { FieldValue } from "firebase-admin/firestore";
import { adminDb, adminReady, profileOf } from "@/lib/server/admin";
import { sendTo } from "@/lib/server/pushSend";
import { monthIn } from "@/lib/server/aiUsage";
import { TURN_LIMIT_GB, mbText, quotaStep } from "@/lib/call";

export const turnLimit = () => (Number(process.env.TURN_LIMIT_GB) || TURN_LIMIT_GB) * 1e9;
const usageRef = (org, month = monthIn()) => adminDb().collection("usage").doc(`calls_${org}_${month}`);
const n = (v, max) => (Number.isFinite(+v) ? Math.min(Math.max(0, Math.round(+v)), max) : 0);

// Kişinin kulübü (profil okunur)
export async function orgOfUser(uid) {
  if (!adminReady()) return uid;
  return (await profileOf(uid)).orgId || uid;
}

// Bu ay TURN kotası dolmadı mı (/api/turn)
export async function turnAllowed(org) {
  if (!adminReady()) return true;
  const d = (await usageRef(org).get()).data() || {};
  return (d.relayBytes || 0) < turnLimit();
}

// Bir tarafın ölçümünü yazar. Aynı kişi aynı aramayı ikinci kez gönderirse sayılmaz.
export async function recordCall(uid, body) {
  const org = await orgOfUser(uid);
  const id = String(body?.id || "");
  if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return { error: "Geçersiz arama" };
  const db = adminDb();
  const callRef = db.collection("orgs").doc(org).collection("calls").doc(id);
  // turn: bu telefon TURN bilgisi alabildi mi; types: bulduğu ağ adresi türleri (host, srflx, relay); ok: bağlandı mı
  const types = [].concat(body?.types || []).filter((t) => ["host", "srflx", "prflx", "relay"].includes(t));
  const st = { sent: n(body.sent, 5e9), recv: n(body.recv, 5e9), relay: !!body.relay, sec: n(body.sec, 86400), turn: !!body.turn, types, ok: body.ok !== false };
  const bytes = st.sent + st.recv;
  const relayBytes = st.relay ? bytes : 0;
  const res = await db.runTransaction(async (tx) => {
    const call = await tx.get(callRef);
    const c = call.data();
    if (!c || (c.from !== uid && c.to !== uid)) return { error: "Arama bulunamadı" };
    if (c.stats?.[uid]) return { dup: true };
    const uref = usageRef(org);
    const u = (await tx.get(uref)).data() || {};
    const before = u.relayBytes || 0;
    const step = quotaStep(before, before + relayBytes, turnLimit());
    tx.set(callRef, { stats: { [uid]: { ...st, at: new Date().toISOString() } } }, { merge: true });
    tx.set(
      uref,
      {
        month: monthIn(),
        org,
        // Arama sayısı ve süre bir kez (arayanın ölçümüyle, yalnız bağlanan arama); bayt iki tarafın toplamı
        ...(c.from === uid && st.ok ? { calls: FieldValue.increment(1), sec: FieldValue.increment(st.sec) } : {}),
        bytes: FieldValue.increment(bytes),
        relayBytes: FieldValue.increment(relayBytes),
        ...(step && !u[`warn${step}`] ? { [`warn${step}`]: true } : {}),
      },
      { merge: true },
    );
    return { step: step && !u[`warn${step}`] ? step : null, used: before + relayBytes };
  });
  if (res.step) {
    const limit = turnLimit();
    const title = res.step === 100 ? "Arama kotası doldu" : "Arama kotası %80'e geldi";
    const body =
      res.step === 100
        ? `Bu ay TURN ${mbText(res.used)} / ${mbText(limit)}. Ay sonuna kadar aramalar yalnız doğrudan bağlanabilen ağlarda (Wi-Fi) çalışır.`
        : `Bu ay TURN ${mbText(res.used)} / ${mbText(limit)}. Ayarlar › Aramalar'dan bakabilirsin.`;
    await sendTo(org, { title, body, tag: `calls-quota-${res.step}`, url: "/settings" }).catch((e) => console.warn("[calls] bildirim:", e.message));
  }
  return res;
}

// Ana hesap: bu ay ve geçen ayın sayacı + son 60 arama
export async function callsOverview(org) {
  const db = adminDb();
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const iso = (t) => (t?.toDate ? t.toDate().toISOString() : null);
  const [a, b, list] = await Promise.all([
    usageRef(org, monthIn(now)).get(),
    usageRef(org, monthIn(prev)).get(),
    db.collection("orgs").doc(org).collection("calls").orderBy("at", "desc").limit(60).get(),
  ]);
  const calls = list.docs.map((d) => {
    const c = d.data();
    return { id: d.id, from: c.from, to: c.to, status: c.status, at: iso(c.at), answeredAt: iso(c.answeredAt), endedAt: iso(c.endedAt), stats: c.stats || {} };
  });
  return { month: a.data() || { month: monthIn(now) }, prev: b.data() || { month: monthIn(prev) }, limit: turnLimit(), calls };
}
