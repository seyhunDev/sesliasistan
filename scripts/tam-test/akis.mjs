// Asistanın karar akışı (yapay zekasız): söylenen cümle → tek iş mi, görev listesi mi → her iş hangi akışa gider.
// Uygulamanın kendi saf işlevleri kullanılır (lib/assistRoute.js routeOf, lib/taskPlan.js, lib/chain.js, lib/steps.js,
// lib/speech/normalize.js fixVerbs). AssistantSheet.jsx `run()` başındaki görev listesi kararı ve `flowOf` burada aynı sırayla
// yazılıdır (bileşen tarayıcı modülleri yüklediği için Node'da çalışmaz). run() değişirse buradaki `decide` de güncellenir.
import { routeOf } from "@/lib/assistRoute";
import { isEnd } from "@/lib/assistantLocal";
import { messageFirst } from "@/lib/steps";
import { fixVerbs } from "@/lib/speech/normalize";
import { actCount, looksMulti, localPlan, orderPlan, clausesOf, PLAN_MAX } from "@/lib/taskPlan";
import { splitChain } from "@/lib/chain";
import { wantsPost } from "@/features/posts/postModel";
import { wantsRaceText } from "@/features/athletes/raceNav";
import { wantsAttendance } from "@/features/athletes/access";
import { absentNotifyCommand, incomeCommand, athleteCommand, duesCommand, receiptPayCommand, callCommand } from "@/lib/assistMore";
import { invoiceCommand } from "@/lib/invoices";
import { wantsInventory } from "@/features/inventory/invWords";
import { wantsEvent } from "@/features/events/eventWords";
import { wantsLog } from "@/lib/trainingLog";
import { wantsSchedule } from "@/features/schedule/scheduleWords";
import { shopCommand } from "@/features/shop/shopWords";
import { localNavigate } from "@/lib/nav";
import { todayStr } from "@/lib/utils/format";

export { PLAN_MAX };
export const TODAY = todayStr();
// Örnek kulüp: kişiler ve yarışlar (gerçek veri değil)
export const NAMES = ["Ali Kaya", "Ayşe Demir", "Mustafa Yılmaz", "Enes Çelik", "Mehmet Şahin", "Gökhan Arslan", "Zeynep Ak", "Emre Koç", "İlay Toprak"];
export const RACES = [
  { id: "r1", name: "Foça TYF Ligi 1. Ayak", district: "Foça", startDate: "2026-10-26", endDate: "2026-10-31" },
  { id: "r2", name: "Cumhuriyet Kupası", district: "Dikili", startDate: "2026-10-29", endDate: "2026-10-30" },
  { id: "r3", name: "Çeşme Optimist Kupası", district: "Çeşme", startDate: "2026-11-07", endDate: "2026-11-11" },
];
const raceNames = RACES.map((r) => r.name);

// Bağlam: ana hesap (sporcu ve yoklama yetkisi var); o.path ile açık sayfa, o.askedMore ile "Başka isteğin var mı?" sorulmuş
export function ctxOf(o = {}) {
  const path = o.path || "/";
  const cur = /^\/athletes\/races\/([\w-]+)$/.exec(path)?.[1];
  const owner = o.owner !== false;
  return {
    owner, isStaff: !owner, racer: owner, att: owner, athleteSide: false, path, today: TODAY, races: RACES, raceNames, names: NAMES,
    logHere: path === "/training", invPage: path.startsWith("/inventory"), attHere: path === "/athletes/attendance",
    curRace: cur && cur !== "new" ? cur : "", onPost: path.startsWith("/posts/"), shop: true, askedMore: !!o.askedMore,
    plans: [], tasks: [], notes: [], memo: o.memo || {},
  };
}
export const route = (s, o) => routeOf(s, ctxOf(o));

// AssistantSheet `flowOf`: cümle uygulamanın kendi akışlarından birine mi ait (görev listesi kararı için)
export function flowOf(x) {
  if (wantsPost(x)) return "post";
  if (wantsRaceText(x, raceNames)) return "race";
  if (wantsAttendance(x, false)) return "attendance";
  if (absentNotifyCommand(x)) return "absent";
  if (incomeCommand(x, TODAY) || /(aidat\p{L}*|ödemesini) (yaptı|verdi|ödedi)|nakit (verdi|ödedi|getirdi)/iu.test(x)) return "income";
  if (athleteCommand(x) || duesCommand(x)) return "athlete";
  if (invoiceCommand(x)) return "invoice";
  if (wantsInventory(x, false)) return "inventory";
  if (wantsEvent(x)) return "event";
  if (wantsLog(x)) return "log";
  if (wantsSchedule(x, false)) return "schedule";
  if (shopCommand(x)) return "shopping";
  if (receiptPayCommand(x)) return "receipt";
  if (callCommand(x)) return "call";
  if (localNavigate(x, { names: NAMES })) return "nav";
  return null; // uygulamada burada cihazın öğrendiği tahmin de var (testte boş)
}

// Yolun görev listesi türü (rapor ve karşılaştırma için)
export function kindOfRoute(r) {
  if (["race", "raceOpen", "raceHere", "hotel"].includes(r)) return "race";
  if (r === "navigate" || r === "local:navigate") return "nav";
  if (["dues", "athlete", "athleteOpen"].includes(r)) return "athlete";
  if (r === "shopping" || r === "shopping(mark)" || r === "shopClear") return "shopping";
  if (r === "receiptPay") return "receipt";
  if (r === "postEdit") return "post";
  if (["attendance", "income", "post", "invoice", "inventory", "event", "log", "schedule", "call", "absent", "close"].includes(r)) return r;
  return "other"; // ana yapay zeka: plan, görev, not, mesaj, soru
}

// run(): cümle → karar. multi: görev listesi; steps: yapay zekasız listedeki işler ve her birinin gittiği yol.
// Not: uygulamada görev listesini önce yapay zeka (/api/tasks) kurar; burada yapay zekanın ulaşılamadığı durumdaki yerel liste var.
export function decide(raw, o = {}) {
  const s = fixVerbs(String(raw || "").trim());
  const msgFirst = messageFirst(s);
  if (isEnd(s) && !msgFirst) return { s, multi: false, route: "close" };
  if (!msgFirst && !o.askedMore && !o.chained) { // chained: görev listesindeki bir iş (uygulamada yeniden bölünmez)
    const parts = splitChain(s);
    const multi = (parts.length > 1 && parts.some(flowOf)) || looksMulti(s, flowOf) || (actCount(s) > 1 && (flowOf(s) || clausesOf(s).some(flowOf)));
    if (multi) {
      let steps;
      let how;
      if (parts.length > 1) (how = "parçalar"), (steps = parts.map((p) => ({ say: p })));
      else {
        const lp = localPlan(s, flowOf);
        how = lp ? "yerel liste" : "liste yok";
        steps = lp ? orderPlan(lp) : [];
      }
      // Listedeki her iş run() ile kendi yoluna gider (tek iş olarak; yeniden bölünmez)
      steps = steps.map((t) => {
        const r = route(fixVerbs(t.say), o);
        return { say: t.say, kind: t.kind || kindOfRoute(r), route: r };
      });
      return { s, multi: true, how, steps, route: "görev listesi" };
    }
  }
  return { s, multi: false, route: route(s, o) };
}

// Yolun Türkçe adı (rapor)
export const ROUTE_TR = {
  ai: "yapay zeka (plan/görev/not/mesaj/soru)", close: "asistanı kapat", attendance: "yoklama", log: "antrenman günlüğü", race: "yarış", raceOpen: "yarışı aç", raceHere: "açık yarışta iş",
  hotel: "otel ekle", post: "Instagram gönderisi", postEdit: "açık gönderiyi değiştir", income: "nakit ödeme / bağış", dues: "aidat", payee: "gelen ödemeler", invoice: "fatura",
  invoiceTask: "fatura görevi", athlete: "sporcu", athleteOpen: "sporcu kartı", person: "kişi ekle", personDelete: "kişi sil", navigate: "sayfa aç", "local:navigate": "sayfa aç",
  absent: "gelmeyenlere haber", call: "arama", schedule: "ders programı", event: "etkinlik", inventory: "envanter", shopping: "alışveriş", "shopping(mark)": "alışveriş (alındı)",
  shopClear: "alınanları temizle", birthday: "doğum günü", bdayDelete: "doğum günü sil", undo: "son kaydı geri al", receiptCam: "fiş kamerası", receiptPay: "fiş ödendi",
  meeting: "toplantı modu", groupCreate: "grup kur", version: "sürüm sorusu", appUpdate: "güncelle", "görev listesi": "görev listesi (çok iş)",
  other: "yapay zeka", nav: "sayfa aç", receipt: "fiş ödendi",
};
export const tr = (r) => ROUTE_TR[r] || r;
