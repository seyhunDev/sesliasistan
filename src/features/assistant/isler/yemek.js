// Sesle yemek siparişi (Seyhun 2026-10-23; ana hesap): "yemek siparişi ver" → beğendiklerine göre 3 öneri, "ilkini ver" → o;
// "sen seç, sipariş ver" ya da "Pizza Rüzgar'dan karışık söyle" → restoran sayfası sepetle açılır, 3 sn çizgi dolar,
// sipariş kendiliğinden verilir (İptal / Şimdi; CartSheet hemen). Karar ve cümleler src/yemek/voice.js.
import { foodOrderAsk, planVoiceOrder } from "@/yemek/voice";
import { PLACES, herePos, loadFood, openNow, writeCart } from "@/yemek/store";

const RECENT_MS = 3 * 60 * 1000;
let last = { picks: [], at: 0 }; // son sesli öneri: "ilkini ver" ona

export const foodRecent = () => last.picks.length > 0 && Date.now() - last.at < RECENT_MS;

const posSoon = () => Promise.race([herePos(), new Promise((ok) => setTimeout(() => ok(null), 2500))]);

export async function foodOrderCmd(ctx, s, viaVoice, ask = null) {
  const { owner, isStaff, profile, reply, leave, router, showPage } = ctx;
  if (!owner || isStaff || !profile?.orgId) return undefined;
  const a = ask || foodOrderAsk(s, PLACES, foodRecent());
  if (!a) return undefined;
  const [food, pos] = await Promise.all([loadFood(profile.orgId), posSoon()]);
  const plan = planVoiceOrder({
    s, ask: a, places: PLACES, history: food.history, me: food.me, pos, closed: food.settings?.closed,
    last: foodRecent() ? last.picks : [], open: (p) => openNow(p, food.settings),
  });
  if (plan.kind === "suggest") {
    last = { picks: plan.picks, at: Date.now() };
    reply(plan.say, { engine: "local", expect: true }, viaVoice);
    return true;
  }
  last = { picks: [], at: 0 };
  if (plan.kind === "none") {
    reply(plan.say, { engine: "local" }, viaVoice);
    return true;
  }
  writeCart({ placeId: plan.place.id, lines: plan.lines });
  router.push(plan.kind === "order" ? `/yemek/${plan.place.id}?sepet=1&hemen=1&adres=${plan.address.id}` : `/yemek/${plan.place.id}?sepet=1`);
  leave(plan.say, viaVoice);
  showPage();
  return true;
}
