import { auth } from "@/lib/firebase/clientApp";

// Kotası dolan yapay zeka modelleri ve ne zamana kadar bekleyecekleri { model: zaman }.
// Sunucu her yanıtta "x-ai-cool" ile bildirir; telefon saklar ve sonraki isteklerde geri gönderir.
// Böylece dolu modeller hiç denenmez, cevap beklemeden yedek yöntemlere geçilir.
const COOL_KEY = "sa-ai-cool";

function readCool() {
  try {
    const now = Date.now();
    const all = JSON.parse(localStorage.getItem(COOL_KEY) || "{}");
    return Object.fromEntries(Object.entries(all).filter(([, until]) => until > now));
  } catch {
    return {};
  }
}

function saveCool(header) {
  if (!header) return;
  try {
    localStorage.setItem(COOL_KEY, JSON.stringify({ ...readCool(), ...JSON.parse(header) }));
  } catch {}
}

export async function authFetch(url, options = {}) {
    const headers = new Headers(options.headers);

    try {
        const user = auth.currentUser;
        if (user) {
            const token = await user.getIdToken();
            headers.set("Authorization", `Bearer ${token}`);
        }
    } catch {
        // Token alınamazsa header boş gider, sunucu 401 döner
    }

    const cool = readCool();
    if (Object.keys(cool).length) headers.set("x-ai-cool", JSON.stringify(cool));

    const res = await fetch(url, {
        ...options,
        headers,
    });
    saveCool(res.headers.get("x-ai-cool"));
    return res;
}
