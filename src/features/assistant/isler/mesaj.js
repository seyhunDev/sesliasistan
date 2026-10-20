// Asistanın işleri: AssistantSheet.jsx'ten taşındı (ctx: bileşenin durumu ve yardımcıları).
import { matchGroup } from "@/lib/ai/messageRules";
import { GROUPS } from "@/lib/kinds";
import { matchPerson } from "@/lib/names";
import { dmId, sendErrorText } from "@/features/chat/ChatProvider";
import { sameTo } from "@/lib/convoContext";
import { waGroupFor } from "@/lib/waGroups";
import { attSummary } from "@/features/athletes/assistAttendance";
import { buildPatch } from "@/lib/assistantLocal";
import { TEAM_WORD, groupOf, waTo } from "./ortak";
import { groupCreateCommand } from "@/lib/assistMore";

// Alıcıyı sohbete çevirir: "Ekip" → ekip sohbeti; kişi → birebir sohbet (ilk mesajda oluşturulur)
export function resolveTo(ctx, to) {
  const { contacts, focusRef, groupIds, myGroups, myUid, waPeople } = ctx;
  const f = focusRef.current;
  const t = String(to || f?.to || "").trim();
  if (!t) return null;
  // Kurulan grup ("Yelken Ekibi grubuna"): sabit grup kelimeleriyle başlasa da önce adıyla aranır
  const cg = matchGroup(t, myGroups);
  if (cg) return { cid: cg.id, label: cg.name, team: true, icon: "users" };
  if (TEAM_WORD.test(t)) {
    const g = groupOf(t, groupIds);
    return g ? { cid: g, label: GROUPS[g].name, team: true, icon: GROUPS[g].icon, create: { type: "team" } } : null;
  }
  const everyone = [...contacts, ...waPeople];
  const name = everyone.find((c) => c.name === t)?.name || matchPerson(t, everyone);
  const c = contacts.find((x) => x.name === name);
  // Uygulamada hesabı yok ama kişilerde telefonu var: kartta WhatsApp'la gönderilir
  const w = !c && waPeople.find((x) => x.name === name);
  if (w) return { wa: w.wa, label: w.name };
  if (!c || !myUid) return null;
  return { cid: dmId(myUid, c.p.uid), label: c.name, create: { type: "dm", members: [myUid, c.p.uid].sort() } };
}

// wa: istekte WhatsApp geçti. "also" ("sporculara ve WhatsApp grubuna da"): kart "Gönder + WhatsApp";
// "only" ("WhatsApp sporcular grubuna gönder"): yalnız WhatsApp grubu açılır, uygulamadaki gruba gitmez
export function prepareSend(ctx, to, text, msg, engine, viaVoice, lead = "", wa = "") {
  const { members, msgDraft, profile, queue, reply, resolveTo } = ctx;
  // Aynı alıcıya düzeltilen taslak önceki WhatsApp seçimini korur ("şunu da ekle" cümlesinde WhatsApp geçmez)
  const prev = msgDraft.current;
  if (!wa && prev?.wa && (sameTo(to, prev.to) || sameTo(to, prev.label))) wa = prev.wa;
  let dest = resolveTo(to);
  // Yalnız Ayarlar › WhatsApp gruplarında olan grup ("WhatsApp veliler grubuna yaz")
  if (!dest && wa === "only") {
    const g = (profile?.waGroups || []).find((x) => waGroupFor(String(to || ""), [x]));
    if (g) dest = { label: g.name, team: true, icon: "users" };
  }
  const waOnly = wa === "only" && !!dest?.team;
  const alsoWa = wa === "also";
  if (dest) msgDraft.current = { to: String(to || ""), label: dest.label, text, wa: waOnly ? "only" : alsoWa ? "also" : "", state: "pending", age: 0 };
  if (!dest) {
    const who = String(to || "").trim();
    queue.current = []; // alıcı yoksa sıralı işler de durur (kullanıcı yeniden söyler)
    // Kişilerde var ama uygulamada hesabı da telefonu da yok: neden gönderilemediği söylenir
    const known = who && matchPerson(who, members.filter((m) => m.name).map((m) => m.name));
    if (known) return reply(`${lead}${known} uygulamada değil ve kişilerde telefonu yok; mesaj gönderemiyorum. Kişiler'den telefonunu eklersen WhatsApp'la gönderebilirim.`, { engine }, viaVoice);
    return reply(`${lead}${who ? `${who} adında birini bulamadım. ` : ""}Kime göndereyim? Bir kişinin, grubun adını ya da "ekip" de.`, { engine, expect: true }, viaVoice);
  }
  // Mesaj sesle onaylanır (Seyhun 2026-10-20, 3 sn çizgi yerine): metin okunur, mikrofon bir kez açılır, "gönder / evet"
  // denince gider, "hayır" denince vazgeçilir, değişiklik söylenirse taslak düzelir. Cümle her zaman aynı kalıptadır
  // (yapay zekanın "yapıyorum, onayını bekliyorum" gibi kendi cümlesi kullanılmaz)
  const to2 = dest.team ? `${dest.label} grubu` : dest.label;
  const ask = { engine, expect: true, listen: true };
  if (waOnly) return reply(`${lead}${dest.label} WhatsApp grubu için mesaj: “${text}” WhatsApp'ta açayım mı?`, { ...ask, pending: { send: { ...dest, text, waOnly: true } } }, viaVoice);
  reply(`${lead}${to2} için mesaj${dest.wa ? " (WhatsApp'la)" : ""}: “${text}” Göndereyim mi?`, { ...ask, pending: { send: { ...dest, text, ...(alsoWa && dest.team ? { alsoWa: true } : {}) } } }, viaVoice);
}

// waOpened: kartta "Gönder + WhatsApp"a dokunuldu, WhatsApp paylaşımı zaten açıldı
export async function confirmPending(ctx, fromText = false, waOpened = false) {
  const { by, cards, chatDelete, chatPurge, chatRemove, chatSend, owner, convo, deleteRecord, deleteSeries, done, find, msgDraft, nextStep, reply, restAfterAtt, saveAtt, sentOk, setCards, setSteps, setTurns, stepTo, stepsEnd, toast, updateRecord } = ctx;
  const pend = cards.pending;
  if (!pend) return;
  if (!fromText) setTurns((p) => [...p, { role: "user", text: pend.send ? "Gönder" : "Onayla", chip: true }]);
  if (pend.send && msgDraft.current) msgDraft.current = { ...msgDraft.current, text: pend.send.text, state: pend.send.waOnly || pend.send.wa ? "wa" : "sent" };
  // Sohbetteki mesajı silme ("son mesajımı sil")
  if (pend.msgDel) {
    setCards((c) => ({ ...c, pending: null, awaiting: false }));
    const ok = await chatRemove?.(pend.msgDel.chat, pend.msgDel.m);
    toast(ok ? "Mesaj arşive kaldırıldı" : "Mesaj kaldırılamadı");
    if (nextStep(fromText && convo.current, ok ? "Kaldırdım. " : "Mesajı kaldıramadım. ")) return;
    return (ok ? done : reply)(ok ? (owner ? "Arşive kaldırdım, sohbette kimse görmüyor. Sohbetin üstündeki Arşiv'den geri alabilirsin." : "Senden kaldırdım. Sohbetin üstündeki Arşiv'den geri alabilirsin.") : "Mesajı kaldıramadım; tekrar dene.", { engine: "local" }, fromText && convo.current);
  }
  // Sohbeti herkes için kalıcı silme (yalnız ana hesap; sunucuda)
  if (pend.chatDel) {
    setCards((c) => ({ ...c, pending: null, awaiting: false }));
    const ok = await chatDelete?.(pend.chatDel.cid);
    toast(ok ? "Sohbet herkes için silindi" : "Sohbet silinemedi");
    if (nextStep(fromText && convo.current, ok ? "Sohbeti sildim. " : "Sohbeti silemedim. ")) return;
    return (ok ? done : reply)(ok ? `${pend.chatDel.label} sohbetini herkes için sildim.` : "Sohbeti silemedim; tekrar dene.", { engine: "local" }, fromText && convo.current);
  }
  // Arşivdeki mesajı kalıcı silme (yalnız ana hesap)
  if (pend.msgPurge) {
    setCards((c) => ({ ...c, pending: null, awaiting: false }));
    const ok = await chatPurge?.(pend.msgPurge.chat.id, pend.msgPurge.m);
    toast(ok ? "Mesaj kalıcı silindi" : "Mesaj silinemedi");
    if (nextStep(fromText && convo.current, ok ? "Kalıcı sildim. " : "Mesajı silemedim. ")) return;
    return (ok ? done : reply)(ok ? "Kalıcı sildim." : "Mesajı silemedim; tekrar dene.", { engine: "local" }, fromText && convo.current);
  }
  if (pend.att) {
    setCards((c) => ({ ...c, pending: null, awaiting: false }));
    setSteps([]);
    try {
      await saveAtt(pend.att, fromText && convo.current);
      if (pend.rest) restAfterAtt(pend.rest, fromText && convo.current, `Yoklama kaydedildi (${attSummary(pend.att)}).`);
    } catch (e) {
      stepsEnd(false);
      reply(e.message || "Kaydedemedim.", { fail: true, engine: "local" });
    }
    return;
  }
  if (pend.send?.waOnly) {
    // Yalnız WhatsApp grubu: kartta dokunulunca grup zaten açıldı; sesle onaylanınca WhatsApp kendiliğinden açılamaz (iPhone dokunuş ister), düğme verilir
    const { text: body, label } = pend.send;
    setCards((c) => ({ ...c, pending: null, awaiting: false }));
    if (!waOpened) return reply(`Hazır. WhatsApp'ı açmak için aşağıdaki düğmeye dokun, listeden ${label} grubunu seç; mesaj hazır gelir.`, { engine: "local", share: body }, fromText && convo.current);
    if (nextStep(fromText && convo.current, "WhatsApp'ta açtım. ")) return;
    return done(`WhatsApp'ı açtım; listeden ${label} grubunu seç, mesaj hazır gelir.`, { engine: "local" }, fromText && convo.current);
  }
  if (pend.send) {
    const { cid, text: body, create, label, team, wa } = pend.send;
    if (!body.trim()) return reply("Mesaj boş; ne yazayım?", { engine: "local", expect: true }, fromText && convo.current);
    // Uygulamada olmayan kişi: WhatsApp mesajı hazır açılır, gönder düğmesine kişi kendisi basar
    if (wa) {
      const opened = !!window.open(waTo(wa, body), "_blank");
      if (!opened) return reply("WhatsApp'ı açamadım; karttaki WhatsApp düğmesine dokun.", { engine: "local" }, fromText && convo.current);
      setCards((c) => ({ ...c, pending: null, awaiting: false }));
      if (nextStep(fromText && convo.current, "WhatsApp'ta açtım. ")) return;
      return done(`WhatsApp'ta ${label} için açtım; orada gönder'e dokun.`, { engine: "local" }, fromText && convo.current);
    }
    setCards((c) => ({ ...c, pending: null, awaiting: false }));
    setSteps([]);
    stepTo(`Mesaj ${team ? `${label} grubuna` : label} gönderiliyor`);
    const ok = await chatSend?.(cid, body, { create });
    if (ok) sentOk.current = true;
    stepsEnd(!!ok);
    toast(ok ? "Mesaj gönderildi" : "Mesaj gönderilemedi");
    navigator.vibrate?.([10, 40, 10]);
    // Grup mesajı WhatsApp grubuna da istendiyse (sesle onaylanınca WhatsApp kendiliğinden açılamaz): "WhatsApp'ta da paylaş" düğmesi
    const waLeft = ok && team && pend.send.alsoWa && !waOpened;
    if (!waLeft && nextStep(fromText && convo.current, ok ? `Gönderdim${team ? `, ${label} grubu gördü` : ""}. ` : "Mesajı gönderemedim. ")) return;
    if (waLeft) return reply(`Gönderdim, ${label} grubu gördü. WhatsApp grubuna da göndermek için aşağıdaki düğmeye dokun, listeden grubu seç; mesaj hazır gelir.`, { engine: "local", chat: cid, share: body }, fromText && convo.current);
    return (ok ? done : reply)(ok ? `Gönderdim${team ? `, ${label} grubu gördü${waOpened ? "; WhatsApp'ta listeden grubu seç, mesaj hazır" : ""}` : `, ${label} görecek`}.` : `Mesajı gönderemedim. ${sendErrorText()}`, { engine: "local", chat: ok ? cid : "", share: ok && team ? body : "" }, fromText && convo.current);
  }
  let n = 0;
  for (const a of pend.actions) {
    const rec = find(a.kind, a.id);
    if (!rec) continue;
    if (a.op === "delete" || a.op === "approve_delete") {
      deleteRecord(a.kind, a.id);
      n++;
    } else if (a.op === "delete_series" && rec.seriesId) {
      n += (await deleteSeries(rec.seriesId, rec.date).catch(() => 0)) || 1;
    } else if (a.op === "update") {
      const patch = buildPatch(a.kind, a.patch, rec);
      if (Object.keys(patch).length) {
        updateRecord(a.kind, a.id, patch, by);
        n++;
      }
    }
  }
  const del = pend.actions.every((a) => /^(delete|delete_series|approve_delete)$/.test(a.op));
  toast(n ? (del ? "Silindi" : "Yapıldı") : "Kayıt bulunamadı");
  navigator.vibrate?.([10, 40, 10]);
  setCards((c) => ({ ...c, pending: null, awaiting: false }));
  if (nextStep(fromText && convo.current, n ? (del ? "Sildim. " : "Yaptım. ") : "O kayıtları bulamadım. ")) return;
  (n ? done : reply)(n ? (del ? "Sildim." : "Tamamdır, yaptım.") : "O kayıtları bulamadım.", { engine: "local" }, fromText && convo.current);
}

export function cancelPending(ctx, fromText = false) {
  const { cards, convo, done, msgDraft, nextStep, queue, reply, restAfterAtt, setTurns } = ctx;
  if (!fromText) setTurns((p) => [...p, { role: "user", text: "Vazgeç", chip: true }]);
  if (cards.pending?.send && msgDraft.current) msgDraft.current = { ...msgDraft.current, state: "dropped" };
  // Yoklama onayından vazgeçildi: cümledeki diğer işler yine yapılır
  if (cards.pending?.att && cards.pending.rest) {
    reply("Tamam, yoklamayı kaydetmedim.", { engine: "local" }, fromText && convo.current);
    return void restAfterAtt(cards.pending.rest, fromText && convo.current, "Yoklama kaydedilmedi.");
  }
  if ((cards.pending?.send || cards.pending?.actions) && nextStep(fromText && convo.current, cards.pending?.send ? "Tamam, göndermedim. " : "Tamam, silmedim. ")) return;
  queue.current = [];
  done(cards.pending?.send ? "Tamam, göndermedim." : cards.pending?.msgDel || cards.pending?.msgPurge || cards.pending?.chatDel ? "Tamam, silmedim." : cards.pending?.actions?.every((a) => /^(delete|delete_series|approve_delete)$/.test(a.op)) ? "Tamam, silmedim." : "Tamam, vazgeçtim.", { engine: "local" }, fromText && convo.current);
}

export async function groupCreateCmd(ctx, s, viaVoice) {
  const { contacts, createGroup, leave, myUid, park, reply, router } = ctx;
  // Mesaj grubu kurma: "Ali, Ayşe ve Mehmet ile Yelken Ekibi adında grup kur"
  const gc = createGroup ? groupCreateCommand(s) : null;
  if (gc) {
    const words = gc.t.replace(/['’]\p{L}*/gu, " ");
    const picked = contacts.filter((c) => c.p.uid !== myUid && c.name.split(" ")[0].length > 1 && new RegExp(`(^|\\s)${c.name.split(" ")[0].toLocaleLowerCase("tr-TR")}(\\s|$|,)`, "u").test(words));
    if (!gc.name || !picked.length) {
      reply(!gc.name ? "Grubun adı ne olsun? Örnek: “Ali ve Ayşe ile Yelken Ekibi adında grup kur”." : "Gruba kimleri ekleyeyim? Adlarını söyle.", { engine: "local" }, viaVoice);
      return true;
    }
    try {
      const id = await createGroup(gc.name, picked.map((c) => c.p.uid));
      park();
      router.push(`/messages?c=${encodeURIComponent(id)}`);
      leave(`${gc.name} grubunu kurdum: ${picked.map((c) => c.name).join(", ")}.`, viaVoice);
    } catch {
      reply("Grubu kuramadım.", { engine: "local" }, viaVoice);
    }
    return true;
  }
}
