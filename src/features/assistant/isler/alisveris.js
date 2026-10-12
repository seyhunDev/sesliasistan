// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { splitItems, LISTS, addItems, removeItem, toggleItem } from "@/features/shop/shop";
import { getDocs, query, collection, where } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";
import { matchShop } from "@/features/shop/shopWords";
import { listsFor, clearDone } from "@/features/shop/shop";
import { shopClearCommand } from "@/lib/assistMore";

// ---- Alışveriş listesi (asistandan) ----
export async function runShopAdd(ctx, what, list, viaVoice) {
  const { profile, reply, setSteps, stepTo, stepsEnd } = ctx;
  const items = splitItems(what);
  if (!items.length) return reply("Neyi ekleyeyim?", { engine: "local", expect: true }, viaVoice);
  setSteps([]);
  stepTo(`${LISTS[list].name} listesine ekleniyor`);
  try {
    await addItems(profile.orgId, list, profile.uid, items);
    stepsEnd();
    navigator.vibrate?.(8);
    reply(`Ekledim: ${items.join(", ")}.`, { engine: "local", nav: "shopping" }, viaVoice);
  } catch {
    stepsEnd(false);
    reply("Listeye ekleyemedim.", { engine: "local" }, viaVoice);
  }
}

// "ekmek alındı" → işaretle, "listeden sütü sil" → sil. Bir şey yapıldıysa (ya da silme istendiyse) true döner.
export async function runShopMark(ctx, { op, what }, list, viaVoice) {
  const { profile, reply } = ctx;
  let open;
  try {
    const snap = await getDocs(query(collection(db, "orgs", profile.orgId, "shop"), where("list", "==", list)));
    open = snap.docs.map((d) => ({ ...d.data(), id: d.id })).filter((x) => op === "remove" || !x.done);
  } catch {
    if (op !== "remove") return false;
    reply("Listeye ulaşamadım.", { engine: "local" }, viaVoice);
    return true;
  }
  const { hits, missed } = matchShop(what, open);
  if (!hits.length) {
    if (op !== "remove") return false;
    reply(`${LISTS[list].name} listesinde ${what} bulamadım.`, { engine: "local", nav: "shopping" }, viaVoice);
    return true;
  }
  try {
    await Promise.all(hits.map((it) => (op === "remove" ? removeItem(profile.orgId, it) : toggleItem(profile.orgId, it, profile.uid))));
  } catch {
    reply("Listeyi güncelleyemedim.", { engine: "local" }, viaVoice);
    return true;
  }
  navigator.vibrate?.(8);
  const names = hits.map((x) => x.text).join(", ");
  const left = missed.length ? ` ${missed.join(", ")} listede yok.` : "";
  reply(`${op === "remove" ? `Listeden çıkardım: ${names}.` : `Alındı olarak işaretledim: ${names}.`}${left}`, { engine: "local", nav: "shopping" }, viaVoice);
  return true;
}

export async function runShopRead(ctx, list, viaVoice) {
  const { profile, reply } = ctx;
  try {
    const snap = await getDocs(query(collection(db, "orgs", profile.orgId, "shop"), where("list", "==", list)));
    const open = snap.docs.map((d) => d.data()).filter((x) => !x.done).map((x) => x.text);
    reply(open.length ? `${LISTS[list].name} listesinde ${open.length} şey var: ${open.slice(0, 12).join(", ")}${open.length > 12 ? " ve diğerleri" : ""}.` : `${LISTS[list].name} listesi boş.`, { engine: "local", nav: "shopping" }, viaVoice);
  } catch {
    reply("Listeyi okuyamadım.", { engine: "local" }, viaVoice);
  }
}

export async function shopClearCmd(ctx, s, viaVoice) {
  const { done, members, myKind, profile, reply } = ctx;
  // Alışveriş: "alınanları temizle"
  const shopLs = listsFor(myKind, members);
  if (shopLs.length && shopClearCommand(s)) {
    const list = /ekip|kulüp/iu.test(s) && shopLs.includes("team") ? "team" : shopLs[0];
    try {
      const snap = await getDocs(query(collection(db, "orgs", profile.orgId, "shop"), where("list", "==", list)));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const n = items.filter((i) => i.done).length;
      if (n) await clearDone(profile.orgId, items);
      done(n ? `${LISTS[list].name} listesinden alınan ${n} şeyi temizledim.` : `${LISTS[list].name} listesinde alınmış işaretli bir şey yok.`, { engine: "local", nav: "shopping" }, viaVoice);
    } catch {
      reply("Listeyi temizleyemedim.", { engine: "local" }, viaVoice);
    }
    return true;
  }
}
