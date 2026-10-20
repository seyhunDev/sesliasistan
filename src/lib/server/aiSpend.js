// Yapay zeka harcaması (lib/aiPrice.js): her Gemini yanıtının token sayısı isteğe bağlı kayda eklenir ve kulübün aylık
// kullanım belgesine (usage/ai_{org}_{ay}) dolar olarak yazılır: usd (ay), usdDay.{gün}, usdKind.{iş}.
// İstek kapsamı (AsyncLocalStorage) withAiCool'da açılır; kim olduğu countAi ile öğrenilir (o gelmeden gelen yanıtlar
// bekletilir). Akışlı yanıt (asistan) bittiğinde de aynı kapsamdadır. Yazma beklenmez, hata kullanıcıyı etkilemez.
import { AsyncLocalStorage } from "node:async_hooks";
import { costUsd, parsePrices } from "@/lib/aiPrice";

const ctx = new AsyncLocalStorage();
export const spendRun = (fn) => ctx.run({ who: null, kind: "", wait: [] }, fn);

let writer = null; // (au, kind, usd) => void (aiUsage.js kurar; döngüsel içe aktarma olmasın)
export const spendWriter = (fn) => (writer = fn);

export function spendWho(au, kind) {
  const s = ctx.getStore();
  if (!s || s.who) return;
  s.who = au;
  s.kind = kind;
  for (const usd of s.wait.splice(0)) writer?.(au, kind, usd);
}

export function spendAdd(model, usage) {
  const s = ctx.getStore();
  if (!s || !usage) return;
  const usd = costUsd(model, usage, parsePrices(process.env.GEMINI_PRICES));
  if (!(usd > 0)) return;
  if (s.who) writer?.(s.who, s.kind, usd);
  else s.wait.push(usd);
}

// Kapsam dışı (süreyle ücretlenen ses tanıma): doğrudan yazılır
export const spendDirect = (au, kind, usd) => usd > 0 && writer?.(au, kind, usd);
