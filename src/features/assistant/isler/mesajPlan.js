// Mesajdaki dosyadan plan sesle (Seyhun 2026-11-12, elle olanla aynı iş: features/chat/ChatPlan.jsx):
// "son dosyayı planlara ekle", "Ali'nin attığı programı plana ekle", "mesajdaki belgeyi takvime ekle".
// Kullanıcı açıkça istediği için sormadan eklenir; kartlarda planlar görünür ("son kaydı geri al" ile silinir).
// Dosya: açık sohbette, yoksa en son konuşulan 6 sohbetin son 25 mesajında (söylenen kişinin) en yeni PDF/fotoğraf.
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { openChat, toMs } from "@/features/chat/ChatProvider";
import { addPlans, planStateOf, readPlans } from "@/features/chat/ChatPlan";
import { planFile, planSummary } from "@/lib/chatPlan";
import { matchPerson } from "@/lib/names";

async function findFile(ctx, uidWho) {
  const ok = (m) => planFile(m.file) && !m.deleted && !m.pending && (!uidWho || m.by === uidWho);
  const oc = openChat();
  const here = oc && [...oc.msgs].reverse().find(ok);
  if (here) return { m: here, cid: oc.chat.id };
  const { chats = [], chatRef } = ctx;
  if (!chatRef) return null;
  const list = chats
    .filter((c) => c.seq && !c._ghost && c.id !== oc?.chat?.id)
    .sort((a, b) => toMs(b.last?.at) - toMs(a.last?.at))
    .slice(0, 6);
  for (const c of list) {
    const s = await getDocs(query(collection(chatRef(c.id), "messages"), orderBy("at", "desc"), limit(25))).catch(() => null);
    const d = s?.docs.map((x) => ({ id: x.id, ...x.data() })).find(ok);
    if (d) return { m: d, cid: c.id };
  }
  return null;
}

export async function runMsgPlan(ctx, cp, viaVoice) {
  const { contacts = [], myKind, reply, saveDrafts, profile } = ctx;
  const say = (t, o = {}) => reply(t, { engine: "local", ...o }, viaVoice);
  if (myKind !== "owner" && myKind !== "staff") return say("Mesajlardaki dosyalardan plan eklemek senin hesabında açık değil.");
  let uidWho = "";
  let label = "";
  if (cp.who) {
    const name = matchPerson(cp.who, contacts.map((c) => c.name));
    const c = name && contacts.find((x) => x.name === name);
    if (!c) return say(`${cp.who} adında birini mesajlarda bulamadım.`);
    uidWho = c.p.uid;
    label = c.name.split(" ")[0];
  }
  const hit = await findFile(ctx, uidWho);
  if (!hit) return say(label ? `${label}'den gelen bir PDF ya da fotoğraf bulamadım.` : "Mesajlarda son günlerde gelen bir PDF ya da fotoğraf bulamadım.");
  const s = await readPlans(hit.m);
  if (!s) return say("Dosyayı okuyamadım, biraz sonra tekrar dene.");
  if (!s.items?.length) return say(`${hit.m.file.name || "Dosyada"} tarihli bir şey bulamadım, plan eklemedim.`);
  const n = await addPlans({ saveDrafts, items: s.items, ref: `${hit.cid}/${hit.m.id}`, mid: hit.m.id, by: profile?.uid });
  if (n < 0) return say("Planları ekleyemedim, tekrar dene.");
  const ids = planStateOf(hit.m.id)?.ids || [];
  say(`${n} plan ekledim: ${planSummary(s.items)}.`, { show: ids.map((id) => ({ kind: "plan", id })) });
}
