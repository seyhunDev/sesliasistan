// Harekete eklenen YouTube videosu: bağlantıdan 11 harfli video kimliği çıkarılır, kayıtta yalnız kimlik durur.
// youtube.com/watch?v=…, youtu.be/…, /shorts/…, /embed/…, /live/…, m.youtube.com; yalnız kimlik de kabul edilir.
const ID = /^[A-Za-z0-9_-]{11}$/;

export function ytId(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  if (ID.test(s)) return s;
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return "";
  }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id = "";
  if (host === "youtu.be") id = u.pathname.split("/")[1] || "";
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = u.searchParams.get("v") || "";
    if (!id) {
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      id = m ? m[1] : "";
    }
  }
  return ID.test(id) ? id : "";
}

// Başlangıç saniyesi (t=1m30s, t=90, start=90)
export function ytStart(text) {
  const m = String(text || "").match(/[?&#](?:t|start)=(?:(\d+)h)?(?:(\d+)m)?(\d+)?s?/);
  if (!m) return 0;
  return (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0);
}

export const ytEmbed = (id, start = 0) => `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1${start ? `&start=${start}` : ""}`;
export const ytWatch = (id, start = 0) => `https://www.youtube.com/watch?v=${id}${start ? `&t=${start}s` : ""}`;
export const ytThumb = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// Kayıttaki alan: { id, start } ya da yok
export function cleanYt(v) {
  if (!v) return null;
  if (typeof v === "string") {
    const id = ytId(v);
    return id ? { id, ...(ytStart(v) ? { start: ytStart(v) } : {}) } : null;
  }
  const id = ytId(v.id);
  if (!id) return null;
  const start = Math.max(0, Math.min(36000, Math.round(Number(v.start) || 0)));
  return start ? { id, start } : { id };
}
