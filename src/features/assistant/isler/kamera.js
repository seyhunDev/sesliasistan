// Halka açık canlı kameralar: "kameraları aç", "Ayvalık kameralarını göster", "Midilli'deki kameralar".
// Kameralar sayfası söylenen yerle açılır (/cams?yer=…); yer yoksa son seçilen ya da telefonun konumu. Kural lib/cams.js.
import { camsPath } from "@/lib/cams";
import { PAGES } from "@/lib/nav";

export function runCams(ctx, cq, viaVoice) {
  const { canOpen, leave, reply, router, showPage } = ctx;
  if (!canOpen("cams")) return reply(`${PAGES.cams.label} sayfası senin hesabında açık değil.`, { engine: "local" }, viaVoice);
  navigator.vibrate?.(8);
  router.push(camsPath(cq.place));
  leave(cq.place ? `${cq.place} kameralarını açtım.` : "Kameraları açtım.", viaVoice);
  showPage();
}
