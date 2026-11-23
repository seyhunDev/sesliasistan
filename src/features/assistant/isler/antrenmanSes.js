// Antrenmanı sesle yönetme (Seyhun 2026-11-23: antrenman sayfası kalktı, antrenmanın ekranı Bilgi › Yönet; elle olanın aynısı):
// "2 dakika başlat" → ekranda 3 · 2 · 1, sonra Yönet'in geri sayımı başlar (sayacın sahibi /bilgi/yonet; açık kanala start yazılır);
// "sayacı bitir" / "yarışı bitir" → sayaç durur; "antrenmanı kaydet" → Yönet açılır ve "Antrenman olarak kaydet?" penceresi gelir
// (onay orada, elle olduğu gibi). Yarış ve sonuç yazma kalktı. Başlat'ta 8 sn Geri al. Cümleler lib/trainVoice.js.
import { trainCommand, raceToday } from "@/lib/trainVoice";
import { leadIn, raceStart, readTimer, writeTimer } from "@/features/training/Countdown";
import { noteStart } from "@/features/bilgi/bilgiStore";
import { mmss } from "@/lib/raceScore";
import { pickPlan } from "@/lib/trainingLog";
import { todayStr } from "@/lib/utils/format";

const OWN = "/bilgi/yonet";
const minText = (sec) => (sec % 60 ? `${mmss(sec)}` : `${sec / 60} dakika`);

export async function trainVoiceCmd(ctx, s, viaVoice) {
  const { owner, racer, races, path = "", reply, done, toast, router, profile } = ctx;
  if (!owner || !racer) return undefined;
  const p = String(path);
  if (!p.startsWith(OWN) && (p.startsWith("/athletes/races/") || raceToday(races?.current || [], todayStr()))) return undefined; // yarış sayfası ya da yarış günü: Yayın
  const tc = trainCommand(s);
  if (!tc) return undefined;
  const t = readTimer();
  const org = profile?.orgId || "";
  const here = () => String(window.location.pathname).startsWith(OWN);

  if (tc.save) {
    router.push(`${OWN}?kaydet=1`);
    done("Yönet'i açtım; kaydetmeyi onayla.", { engine: "local" }, viaVoice);
    return true;
  }

  if (tc.start != null) {
    if (t.end != null) {
      reply("Sayaç zaten çalışıyor. Önce “sayacı bitir” de.", { engine: "local", fail: true }, viaVoice);
      return true;
    }
    const plan = pickPlan(ctx.plans, todayStr());
    const where = plan?.title && plan.title !== "Antrenman" ? plan.title : "Antrenman";
    const sec = tc.start || t.dur || 300;
    const at = leadIn(3000);
    if (!here()) router.push(OWN);
    done(`${minText(sec)}, başlıyor.`, { engine: "local" }, viaVoice);
    setTimeout(() => {
      if (readTimer().end != null) return; // bu arada elle başlatıldı
      const prevT = readTimer();
      writeTimer({ dur: sec, end: null, left: sec, zero: prevT.zero ?? null, own: OWN, where });
      raceStart({ onStart: (end) => noteStart(org, end) }, "start", where, OWN);
      toast?.("Geri sayım başladı", { duration: 8000, action: { label: "Geri al", onClick: () => writeTimer(prevT) } });
    }, Math.max(0, at - Date.now()));
    return true;
  }

  // Bitir: sayaç durur (Yönet'teki Bitir'in aynısı)
  if (t.end == null) {
    reply("Çalışan sayaç yok.", { engine: "local", fail: true }, viaVoice);
    return true;
  }
  const up = t.end <= Date.now();
  writeTimer({ dur: t.dur, end: null, left: null, zero: up ? t.end : (t.zero ?? null), own: "", where: "" });
  done(up ? `Bitti, ${mmss(Math.max(0, Math.floor((Date.now() - t.end) / 1000)))}.` : "Geri sayımı durdurdum.", { engine: "local" }, viaVoice);
  return true;
}
