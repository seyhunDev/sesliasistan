// "İletildi" onayı için imza: bildirimi alan telefon, oturum olmadan yalnızca kendi onayını yazabilsin.
// Göreli içe aktarmasız: Netlify işlevleri (push-test-background) de kullanır.
import crypto from "node:crypto";

const secret = () => process.env.ACK_SECRET || process.env.VAPID_PRIVATE_KEY || "";
export const ackSig = (o, c, i, u) => crypto.createHmac("sha256", secret()).update(`${o}|${c}|${i}|${u}`).digest("base64url").slice(0, 24);
export const ackOk = (a) => {
  if (!secret() || !a?.s) return false;
  const want = Buffer.from(ackSig(a.o, a.c, a.i, a.u));
  const got = Buffer.from(String(a.s));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
};
