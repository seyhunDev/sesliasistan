// Sporcu bilgi ekranı sesle (elle yapılanın aynısı, Bilgi ekranı yönetimi): "bilgi ekranına yaz: …" / "bilgi ekranına söyle: …" mesajı
// ekrana gönderir (ekranda görünür ve sesli okunur); "bilgi ekranını aç", "bilgi ekranını yönet". Yalnız ana hesap.
import { LIVE_MS, SHOW, bilgiCommand } from "@/lib/bilgi";
import { closeKanal, linkOf, linkUrl, loadTekneler, newLink, openKanal, saveBilgi, sendMsg } from "@/features/bilgi/bilgiStore";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/clientApp";

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
  // "bilgi parkuru rüzgâr 220" / "… trapez" / "… hakem botu burada" (Yönet › Parkur; şamandıralar kendiliğinden yerleşir)
  if (c.op === "parkur" || c.op === "parkurHere") {
    setPhase?.("thinking");
    let patch = c.patch;
    if (c.op === "parkurHere") {
      const q = await new Promise((ok) => (navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => ok({ lat: +p.coords.latitude.toFixed(6), lon: +p.coords.longitude.toFixed(6) }), () => ok(null), { enableHighAccuracy: true, timeout: 15000 }) : ok(null)));
      if (!q) return (reply("Konumu alamadım, konum iznini kontrol et.", { fail: true, engine: "local" }, viaVoice), true);
      patch = { komite: q };
    }
    const ok = await saveBilgi(profile?.orgId, { parkur: patch }).then(
      () => true,
      () => false,
    );
    if (!ok) return (reply("Kaydedemedim, tekrar dene.", { fail: true, engine: "local" }, viaVoice), true);
    done(patch.komite ? "Hakem botunu buraya koydum." : patch.wind != null ? `Parkur rüzgârı ${patch.wind}°.` : patch.type ? "Parkur tipini değiştirdim." : `1 numara ${patch.orsa} m.`, { engine: "local" }, viaVoice);
    return true;
  }
  // "bilgi kanalı aç: Antrenman" / "bilgi kanalını kapat" (Yönet › Kanal)
  if (c.op === "kanal" || c.op === "kanalKapat") {
    setPhase?.("thinking");
    const ok = await (c.op === "kanal" ? openKanal(profile?.orgId, c.name) : closeKanal(profile?.orgId)).then(
      () => true,
      () => false,
    );
    if (!ok) return (reply("Yapamadım, tekrar dene.", { fail: true, engine: "local" }, viaVoice), true);
    if (c.op === "kanalKapat") return (done("Bilgi kanalını kapattım.", { engine: "local" }, viaVoice), true);
    const url = linkUrl(await linkOf(profile?.orgId));
    await navigator.clipboard?.writeText(url).catch(() => {});
    done(`${c.name} kanalını açtım, linki kopyaladım: ${url}`, { engine: "local" }, viaVoice);
    return true;
  }
  // "bilgi ekranı linkini ver": herkese açık link (yoksa açılır) panoya kopyalanır ve söylenir (Yönet › Herkese açık link)
  if (c.op === "link") {
    setPhase?.("thinking");
    const org = profile?.orgId;
    const key = await linkOf(org).then((k) => k || newLink(org)).catch(() => "");
    if (!key) return (reply("Link açamadım, tekrar dene.", { fail: true, engine: "local" }, viaVoice), true);
    const url = linkUrl(key);
    await navigator.clipboard?.writeText(url).catch(() => {});
    done(`Bilgi ekranı linkini kopyaladım: ${url}`, { engine: "local" }, viaVoice);
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
  const org = profile?.orgId;
  // "bilgi ekranında Mustafa'ya yaz: …": açık kanaldaki kişiler arasında adı ya da yelken no ile bulunur
  let to = null;
  if (c.to) {
    const k = (await getDoc(doc(db, "orgs", org, "bilgi", "ekran")).catch(() => null))?.data()?.kanal;
    const now = Date.now();
    const live = k?.open ? (await loadTekneler(org).catch(() => [])).filter((b) => b.ch === k.id && now - (b.t || 0) < LIVE_MS) : [];
    const low = (x) => String(x || "").toLocaleLowerCase("tr").trim();
    const hit = live.find((b) => low(b.name) === low(c.to) || low(b.sail) === low(c.to)) || live.find((b) => low(b.name).startsWith(low(c.to)));
    if (!hit) return (reply(`${c.to} kanalda görünmüyor.`, { engine: "local" }, viaVoice), true);
    to = { dev: hit.id, name: [hit.sail, hit.name].filter(Boolean).join(" ") };
  }
  const r = await sendMsg(org, c.text, undefined, to).catch(() => ({ ok: false }));
  if (r.ok) done(`${to ? `${to.name} için` : "Bilgi ekranına"} gönderdim: ${c.text}`, { engine: "local" }, viaVoice);
  else reply("Gönderemedim, tekrar dene.", { fail: true, engine: "local" }, viaVoice);
  return true;
}
