// Sesle toplu antrenman ve veli takvimi (Seyhun 2026-11-26), elle yapılanın (Takvim › + › Toplu antrenman / Veli takvimi) sesle yapılanı:
// "Aralık ve Ocak hafta sonlarına 10:30'da antrenman ekle", "Temmuz hafta içlerine antrenman koy, bayramlar dahil",
// "velilere Aralık–Mart antrenman takvimi hazırla". Toplu iş olduğu için kaydetmez: Takvim sayfasında pencere dolu açılır,
// kaç antrenman ekleneceğini gösterir, kullanıcı "Ekle"ye basar (Geri al orada). Yalnız ana hesap. Kurallar lib/topluAntrenman.js.
import { bulkPlan, bulkSummary } from "@/lib/topluAntrenman";
import { periodTitle } from "@/lib/veliTakvimi";
import { openCalendarSheet } from "@/features/calendar/bulkOpen";
import { todayStr } from "@/lib/utils/format";

const L = { engine: "local" };

export function runBulk(ctx, bc, viaVoice) {
  const { path, plans, reply, router } = ctx;
  const today = todayStr();
  const r = bulkPlan({ ...bc, from: today }, plans || []);
  const s = bulkSummary(r);
  openCalendarSheet("bulk", bc);
  if (path !== "/calendar") router.push("/calendar");
  if (!r.add.length) return reply(`${s.head}. Toplu antrenman penceresini açtım, ayı ya da günleri değiştir.`, L, viaVoice);
  reply(`${s.head}${s.sub ? `, ${s.sub}` : ""}. Pencereyi açtım, kontrol edip Ekle'ye bas.`, L, viaVoice);
}

export function runParents(ctx, pc, viaVoice) {
  const { path, reply, router } = ctx;
  openCalendarSheet("parents", pc.months.length ? pc : null);
  if (path !== "/calendar") router.push("/calendar");
  reply(`Veli takvimini açtım${pc.months.length ? ` (${periodTitle(pc.months)})` : ""}. PDF hazırla'ya basınca Paylaş'tan mail ya da WhatsApp ile gönderebilirsin.`, L, viaVoice);
}
