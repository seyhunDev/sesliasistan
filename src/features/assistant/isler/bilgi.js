// Sporcu bilgi ekranı sesle (elle yapılanın aynısı, Bilgi ekranı yönetimi): "bilgi ekranına yaz: …" / "bilgi ekranına söyle: …" mesajı
// ekrana gönderir (ekranda görünür ve sesli okunur); "bilgi ekranını aç", "bilgi ekranını yönet". Yalnız ana hesap.
import { SHOW, bilgiCommand } from "@/lib/bilgi";
import { saveBilgi, sendMsg } from "@/features/bilgi/bilgiStore";

export async function bilgiCmd(ctx, s, viaVoice) {
  const { owner, profile, router, park, leave, showPage, done, reply, setPhase } = ctx;
  if (!owner) return undefined;
  const c = bilgiCommand(s);
  if (!c) return undefined;
  if (c.op === "open" || c.op === "admin") {
    park();
    router.push(c.op === "open" ? "/bilgi" : "/bilgi/yonet");
    leave(c.op === "open" ? "Bilgi ekranını açtım." : "Bilgi ekranı yönetimini açtım.", viaVoice);
    showPage();
    return true;
  }
  // "bilgi ekranında rüzgârı göster / saati gizle": start sonrası ekranda aç kapa (Yönet › Start sonrası ekranda)
  if (c.op === "show") {
    setPhase?.("thinking");
    const name = SHOW.find(([k]) => k === c.key)?.[1] || c.key;
    const ok = await saveBilgi(profile?.orgId, { show: { [c.key]: c.on } }).then(() => true, () => false);
    if (ok) done(`Bilgi ekranında ${name} ${c.on ? "açık" : "kapalı"}.`, { engine: "local" }, viaVoice);
    else reply("Kaydedemedim, tekrar dene.", { fail: true, engine: "local" }, viaVoice);
    return true;
  }
  if (!c.text) {
    reply("Ne yazayım?", { engine: "local" }, viaVoice);
    return true;
  }
  setPhase?.("thinking");
  const ok = await sendMsg(profile?.orgId, c.text).catch(() => false);
  if (ok) done(`Bilgi ekranına gönderdim: ${c.text}`, { engine: "local" }, viaVoice);
  else reply("Gönderemedim, tekrar dene.", { fail: true, engine: "local" }, viaVoice);
  return true;
}
