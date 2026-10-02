import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { authFetch } from "@/lib/authFetch";
import { db } from "@/lib/firebase/clientApp";
import { fromAi, memberData, parsePerson } from "./assistPerson";

// Kişi ekleme cümlesinden alanlar: önce yapay zeka (/api/person), ulaşılamazsa yerel kurallar.
// Her durumda telefon/e-posta/doğum günü yerelde yeniden kontrol edilir (assistPerson.nextQuestion).
export async function readPerson(text) {
  const local = parsePerson(text);
  try {
    const res = await authFetch("/api/person", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
    const p = await res.json().catch(() => ({}));
    if (res.status === 403) throw Object.assign(new Error(p.error || "Yetki yok"), { denied: true });
    if (!res.ok) return { draft: local, engine: "local" };
    const ai = fromAi(p);
    // Yapay zekanın atladığı ama cümlede açıkça geçen bilgi yerelden tamamlanır
    return { draft: { ...local, ...ai, name: ai.name || local.name }, engine: "ai" };
  } catch (e) {
    if (e.denied) throw e;
    return { draft: local, engine: "local" };
  }
}

// Hesapsız kişi kaydı (Kişiler › Kişi ekle ile aynı): yazma onaylanınca kimliği döner
export async function createPerson(orgId, draft) {
  const ref = await addDoc(collection(db, "orgs", orgId, "members"), memberData(draft));
  await updateDoc(ref, { uid: ref.id });
  return ref.id;
}

// Az önce eklenen (hesabı açılmamış) kişiyi geri alır: kayıt tamamen silinir
export const removePerson = (orgId, uid) => deleteDoc(doc(db, "orgs", orgId, "members", uid));

// Kişiler sayfasında kişi formunu açtırır: { uid, step: "account" } ya da { prefill } (yeni kişi, dolu form)
export const OPEN_KEY = "sa-person-open";
export function askOpen(o) {
  try {
    sessionStorage.setItem(OPEN_KEY, JSON.stringify(o));
  } catch {}
  window.dispatchEvent(new CustomEvent(OPEN_KEY));
}
export function takeOpen() {
  try {
    const o = JSON.parse(sessionStorage.getItem(OPEN_KEY) || "null");
    sessionStorage.removeItem(OPEN_KEY);
    return o;
  } catch {
    return null;
  }
}

// Önerilen şifre (Kişiler › Hesap aç ile aynı biçim)
export const newPassword = () => Array.from(crypto.getRandomValues(new Uint32Array(2)), (n) => n.toString(36)).join("").slice(0, 8);

// Giriş hesabı aç (ana hesap, ayrı onaydan sonra): var olan kişi kaydına; hata metni sunucudan
export async function openAccount({ uid, name, kind, login, password }) {
  const res = await authFetch("/api/staff", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberId: uid, name, kind, login, password }) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Hesap açılamadı.");
  return data;
}
