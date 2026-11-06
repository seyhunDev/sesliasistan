import crypto from "node:crypto";

// YouTube Google izni: kapsamlar, dönüş adresi ve imzalı durum (api/youtube, api/youtube/callback)
export const YT_SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"];
export const ytRedirect = (request) => `${new URL(request.url).origin}/api/youtube/callback`;

// İzin dönüşünde kimin bağlandığı: imzalı, 15 dakikalık durum (uid · bitiş)
export function signState(uid, secret, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ u: uid, e: now + 15 * 60e3 })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
export function readState(state, secret, now = Date.now()) {
  const [body, sig] = String(state || "").split(".");
  if (!body || !sig) return "";
  const want = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return "";
  try {
    const d = JSON.parse(Buffer.from(body, "base64url").toString());
    return d.e > now && typeof d.u === "string" ? d.u : "";
  } catch {
    return "";
  }
}

